"""
ESPnet VITS Handler

Handles ESPnet VITS models using the ESPnet library instead of transformers.
Provides proper integration with ESPnet TTS models.
"""

from typing import Any, Dict, List, Optional
import logging
import io
import tempfile
import os
import base64
import torch
import torchaudio
import numpy as np

from handlers.base_handler import ModelHandler

logger = logging.getLogger(__name__)

class ESPnetVITSHandler(ModelHandler):
    """Handler for ESPnet VITS models using ESPnet library"""
    
    def __init__(self):
        super().__init__()
        self._model = None
        self._processor = None
        self._sample_rate = 22050
    
    def can_handle(self, model_id: str, model_type: str) -> bool:
        """Check if this is an ESPnet VITS model"""
        return (
            model_type == "text-to-audio" and
            ("espnet" in model_id.lower() and "vits" in model_id.lower())
        )
    
    async def load_pipeline(self, model_id: str, device: str, config: Dict[str, Any]) -> Any:
        """Load ESPnet VITS pipeline using ESPnet library"""
        def _load():
            try:
                logger.info(f"Loading ESPnet VITS model: {model_id}")
                
                # Try to import ESPnet
                try:
                    from espnet2.bin.tts_inference import Text2Speech
                    from espnet_model_zoo.downloader import ModelDownloader
                except ImportError as e:
                    raise ImportError(
                        f"ESPnet is required for {model_id}. "
                        f"Install with: pip install espnet espnet_model_zoo. "
                        f"Error: {e}"
                    )
                
                # Download and load model using ESPnet model zoo
                d = ModelDownloader()
                
                # Map HuggingFace model IDs to ESPnet tags
                model_mapping = {
                    "espnet/kan-bayashi_ljspeech_vits": "kan-bayashi/ljspeech_vits",
                    "espnet/kan-bayashi_libritts_vits": "kan-bayashi/libritts_vits",
                }
                
                espnet_tag = model_mapping.get(model_id)
                if not espnet_tag:
                    # Try to extract the tag from the model ID
                    if "/" in model_id and model_id.startswith("espnet/"):
                        espnet_tag = model_id.replace("espnet/", "").replace("_", "/", 1)
                    else:
                        raise ValueError(f"Unknown ESPnet model: {model_id}")
                
                logger.info(f"Using ESPnet tag: {espnet_tag}")
                
                # Download model files
                info = d.download_and_unpack(espnet_tag)
                
                # Create Text2Speech instance
                text2speech = Text2Speech(
                    train_config=info["train_config"],
                    model_file=info["model_file"],
                    device=device,
                    # Speed up inference
                    threshold=0.5,
                    minlenratio=0.0,
                    maxlenratio=10.0,
                    use_att_constraint=False,
                    backward_window=1,
                    forward_window=3,
                )
                
                # Store sample rate from config
                if hasattr(text2speech, 'fs'):
                    self._sample_rate = text2speech.fs
                elif hasattr(text2speech, 'sample_rate'):
                    self._sample_rate = text2speech.sample_rate
                else:
                    self._sample_rate = 22050  # Default fallback
                
                logger.info(f"ESPnet VITS model {model_id} loaded successfully")
                logger.info(f"Sample rate: {self._sample_rate}")
                
                return text2speech
                
            except Exception as e:
                logger.error(f"Failed to load ESPnet model {model_id}: {e}")
                raise
        
        return await self._run_in_executor(_load)
    
    async def generate(self, pipeline: Any, prompt: str, **kwargs) -> Any:
        """Generate speech using ESPnet VITS"""
        def _generate():
            try:
                logger.info(f"Generating audio for text: {prompt[:50]}...")
                
                # Generate audio
                with torch.no_grad():
                    wav = pipeline(prompt)["wav"]
                
                # Convert to numpy array
                if isinstance(wav, torch.Tensor):
                    wav = wav.cpu().numpy()
                
                # Ensure proper shape and data type
                if wav.ndim > 1:
                    wav = wav.squeeze()
                
                # Normalize audio to [-1, 1] range
                wav = wav / np.max(np.abs(wav))
                
                # Convert to 16-bit PCM
                wav_int16 = (wav * 32767).astype(np.int16)
                
                # Create temporary WAV file
                with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
                    # Save using torchaudio
                    wav_tensor = torch.from_numpy(wav).unsqueeze(0)
                    torchaudio.save(tmp_file.name, wav_tensor, self._sample_rate)
                    
                    # Read the file back as bytes
                    with open(tmp_file.name, 'rb') as f:
                        audio_bytes = f.read()
                    
                    # Clean up
                    os.unlink(tmp_file.name)
                
                # Return as base64 for API response
                audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                
                logger.info(f"Generated audio: {len(audio_bytes)} bytes")
                
                return {
                    "audio_base64": audio_base64,
                    "sample_rate": self._sample_rate,
                    "format": "wav",
                    "duration": len(wav) / self._sample_rate
                }
                
            except Exception as e:
                logger.error(f"ESPnet generation failed: {e}")
                raise
        
        return await self._run_in_executor(_generate)
    
    def get_supported_parameters(self) -> List[str]:
        """Get supported parameters for ESPnet VITS"""
        return [
            "speed",
            "noise_scale", 
            "noise_scale_w",
            "alpha"
        ]
    
    def get_handler_info(self) -> Dict[str, Any]:
        """Get handler information"""
        return {
            "name": "ESPnetVITSHandler",
            "description": "ESPnet VITS models using ESPnet library",
            "model_type": "text-to-audio",
            "supported_models": [
                "espnet/kan-bayashi_ljspeech_vits",
                "espnet/kan-bayashi_libritts_vits",
                "espnet/*vits*"
            ],
            "capabilities": [
                "text-to-speech",
                "multi-speaker",
                "high-quality-synthesis"
            ],
            "limitations": [
                "Requires ESPnet library installation",
                "Large model download on first use",
                "May require specific Python environment"
            ],
            "status": "working",
            "device_management": True,
            "priority": 100  # High priority to catch these before generic handler
        }
