"""
SpeechT5 Handler

Handles Microsoft SpeechT5 TTS models with proper device management.
"""

import torch
import numpy as np
from typing import Any, Dict, List
import logging

from handlers.base_handler import ModelHandler

logger = logging.getLogger(__name__)

class SpeechT5Handler(ModelHandler):
    """Handler for Microsoft SpeechT5 TTS models"""
    
    def can_handle(self, model_id: str, model_type: str) -> bool:
        """Check if this is a SpeechT5 model"""
        return (
            model_type == "text-to-audio" and
            "speecht5" in model_id.lower()
        )
    
    async def load_pipeline(self, model_id: str, device: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Load SpeechT5 model components"""
        def _load():
            try:
                from transformers import SpeechT5Processor, SpeechT5ForTextToSpeech, SpeechT5HifiGan
            except ImportError:
                raise ImportError("SpeechT5 requires transformers. Run: pip install transformers")
            
            logger.info(f"Loading SpeechT5 components for {model_id}")
            
            # Load processor (no device needed)
            processor = SpeechT5Processor.from_pretrained(model_id)
            
            # Load model and move to device
            model = SpeechT5ForTextToSpeech.from_pretrained(model_id).to(device)
            
            # Load vocoder and move to device
            vocoder = SpeechT5HifiGan.from_pretrained("microsoft/speecht5_hifigan").to(device)
            
            return {
                "processor": processor,
                "model": model,
                "vocoder": vocoder,
                "type": "speecht5"
            }
        
        return await self._run_in_executor(_load)
    
    async def generate(self, pipeline: Dict[str, Any], prompt: str, **kwargs) -> np.ndarray:
        """Generate speech using SpeechT5"""
        def _generate():
            processor = pipeline["processor"]
            model = pipeline["model"]
            vocoder = pipeline["vocoder"]
            
            # Process input text
            inputs = processor(text=prompt, return_tensors="pt")
            
            # Load speaker embeddings
            speaker_embeddings = self._get_speaker_embeddings()
            
            # Ensure all tensors are on the same device
            device = model.device
            inputs = {k: v.to(device) for k, v in inputs.items()}
            speaker_embeddings = speaker_embeddings.to(device)
            
            # Ensure vocoder is also on the same device
            if hasattr(vocoder, 'to'):
                vocoder = vocoder.to(device)
            
            # Generate speech
            speech = model.generate_speech(
                inputs["input_ids"], 
                speaker_embeddings=speaker_embeddings, 
                vocoder=vocoder
            )
            
            return speech.cpu().numpy()
        
        return await self._run_in_executor(_generate)
    
    def _get_speaker_embeddings(self) -> torch.Tensor:
        """Get speaker embeddings for TTS"""
        try:
            # Try to load speaker embeddings from the dataset
            from datasets import load_dataset
            embeddings_dataset = load_dataset("Matthijs/cmu-arctic-xvectors", split="validation")
            speaker_embeddings = torch.tensor(embeddings_dataset[7306]["xvector"]).unsqueeze(0)
        except Exception:
            # Fallback: create random speaker embeddings with the correct shape (512 dimensions)
            logger.warning("Could not load speaker embeddings dataset, using random embeddings")
            speaker_embeddings = torch.randn((1, 512))
        
        return speaker_embeddings
    
    def get_supported_parameters(self) -> List[str]:
        """Get supported parameters for SpeechT5"""
        return [
            'speed', 'pitch', 'volume', 'voice', 'language',
            'sample_rate', 'format'
        ]
    
    def get_handler_info(self) -> Dict[str, Any]:
        """Get handler information"""
        return {
            "name": "SpeechT5Handler",
            "description": "Microsoft SpeechT5 Text-to-Speech models with speaker embeddings",
            "model_type": "text-to-audio",
            "supported_models": ["microsoft/speecht5_tts"],
            "capabilities": ["text-to-speech", "multi-speaker"],
            "device_management": True
        }
