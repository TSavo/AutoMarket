"""
Facebook MMS-TTS Handler

Handles Facebook MMS (Massively Multilingual Speech) TTS models.
These models have specific parameter requirements and don't support
all the generic TTS parameters.
"""

from typing import Any, Dict, List
import logging
import numpy as np

from handlers.base_handler import ModelHandler

logger = logging.getLogger(__name__)

class FacebookMMSTTSHandler(ModelHandler):
    """Handler for Facebook MMS-TTS models"""
    
    def can_handle(self, model_id: str, model_type: str) -> bool:
        """Check if this is a Facebook MMS-TTS model"""
        return (
            model_type == "text-to-audio" and
            "facebook/mms-tts" in model_id.lower()
        )
    
    async def load_pipeline(self, model_id: str, device: str, config: Dict[str, Any]) -> Any:
        """Load Facebook MMS-TTS pipeline"""
        def _load():
            try:
                from transformers import pipeline as transformers_pipeline
            except ImportError:
                raise ImportError("Facebook MMS-TTS requires transformers. Run: pip install transformers")
            
            logger.info(f"Loading Facebook MMS-TTS pipeline for {model_id}")
            
            # MMS-TTS models work best with text-to-speech pipeline
            try:
                return transformers_pipeline("text-to-speech", model=model_id, device=device)
            except Exception as e:
                logger.error(f"Failed to load MMS-TTS model {model_id}: {str(e)}")
                # These models are known to have compatibility issues
                raise ValueError(f"Facebook MMS-TTS model {model_id} is not compatible with current transformers version. "
                               f"Error: {str(e)}")
        
        return await self._run_in_executor(_load)
    
    async def generate(self, pipeline: Any, prompt: str, **kwargs) -> Any:
        """Generate speech using Facebook MMS-TTS"""
        def _generate():
            # MMS-TTS models don't support voice, speed, pitch, volume parameters
            # They are also very sensitive to parameter names and types
            
            logger.info(f"Original parameters for MMS-TTS: {list(kwargs.keys())}")
            
            # For Facebook MMS-TTS, use absolutely minimal parameters
            # These models are extremely sensitive and reject most parameters
            try:
                # Try with no parameters first (safest approach)
                logger.info("Attempting MMS-TTS generation with no parameters")
                result = pipeline(prompt)
                logger.info("MMS-TTS generation successful with no parameters")
                logger.info(f"Result type: {type(result)}")
                logger.info(f"Result keys (if dict): {result.keys() if isinstance(result, dict) else 'N/A'}")
                logger.info(f"Result attributes (if object): {dir(result) if hasattr(result, '__dict__') else 'N/A'}")
            except Exception as e:
                logger.warning(f"MMS-TTS failed with no parameters: {str(e)}")
                # If that fails, the model is probably not compatible
                raise ValueError(
                    f"Facebook MMS-TTS model {kwargs.get('model_id', 'unknown')} has parameter incompatibility issues. "
                    f"This model requires specific transformers library versions and parameter handling. "
                    f"Original error: {str(e)}"
                )
              # Handle different result formats and extract sampling rate
            audio_data = None
            sampling_rate = None
            
            if isinstance(result, dict):
                logger.info("Result is a dictionary")
                
                # Extract sampling rate information if available
                if "sampling_rate" in result:
                    sampling_rate = result["sampling_rate"]
                    logger.info(f"Found 'sampling_rate' key: {sampling_rate}")
                elif "sample_rate" in result:
                    sampling_rate = result["sample_rate"]
                    logger.info(f"Found 'sample_rate' key: {sampling_rate}")
                
                # Extract audio data
                if "audio" in result:
                    audio_data = result["audio"]
                    logger.info(f"Found 'audio' key, type: {type(audio_data)}")
                elif "generated_audio" in result:
                    audio_data = result["generated_audio"]
                    logger.info(f"Found 'generated_audio' key, type: {type(audio_data)}")
                else:
                    logger.warning(f"Dictionary result but no 'audio' or 'generated_audio' key found. Keys: {list(result.keys())}")
                    audio_data = result
            elif hasattr(result, 'audio'):
                audio_data = result.audio
                logger.info(f"Found result.audio attribute, type: {type(audio_data)}")
                
                # Check for sampling rate attribute
                if hasattr(result, 'sampling_rate'):
                    sampling_rate = result.sampling_rate
                    logger.info(f"Found result.sampling_rate attribute: {sampling_rate}")
                elif hasattr(result, 'sample_rate'):
                    sampling_rate = result.sample_rate
                    logger.info(f"Found result.sample_rate attribute: {sampling_rate}")
            else:
                logger.info(f"Using result directly, type: {type(result)}")
                audio_data = result
              # Additional processing for MMS-TTS specific formats
            if audio_data is not None:
                if isinstance(audio_data, np.ndarray):
                    logger.info(f"Audio data is numpy array with shape: {audio_data.shape}")
                    if len(audio_data.shape) == 2 and audio_data.shape[0] == 1:
                        # Remove batch dimension if present
                        audio_data = audio_data.squeeze(0)
                        logger.info(f"Squeezed audio data to shape: {audio_data.shape}")
                elif hasattr(audio_data, 'numpy'):
                    # Convert torch tensor to numpy if needed
                    audio_data = audio_data.numpy()
                    logger.info(f"Converted tensor to numpy, shape: {audio_data.shape}")
                    if len(audio_data.shape) == 2 and audio_data.shape[0] == 1:
                        audio_data = audio_data.squeeze(0)
                        logger.info(f"Squeezed tensor audio data to shape: {audio_data.shape}")
            
            # Return audio data with sampling rate if available
            if sampling_rate is not None:
                logger.info(f"Returning audio with sampling rate: {sampling_rate}")
                return {
                    'audio': audio_data,
                    'sampling_rate': sampling_rate
                }
            else:
                logger.info("No sampling rate found, returning audio data only")
                return audio_data
        
        return await self._run_in_executor(_generate)
    
    def get_supported_parameters(self) -> List[str]:
        """Get supported parameters for Facebook MMS-TTS"""
        return [
            'max_new_tokens'
            # Note: MMS-TTS does NOT support voice, speed, pitch, volume, sample_rate
        ]
    
    def get_handler_info(self) -> Dict[str, Any]:
        """Get handler information"""
        return {
            "name": "FacebookMMSTTSHandler",
            "description": "Facebook MMS (Massively Multilingual Speech) TTS models - limited parameter support",
            "model_type": "text-to-audio",
            "supported_models": [
                "facebook/mms-tts-eng",
                "facebook/mms-tts-spa", 
                "facebook/mms-tts-fra",
                "facebook/mms-tts-*"
            ],
            "capabilities": ["text-to-speech", "multilingual"],
            "limitations": ["no voice control", "no speed/pitch/volume control", "no sample rate control"],
            "device_management": False
        }
