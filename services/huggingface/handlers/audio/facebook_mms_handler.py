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
            # Only use basic parameters
            basic_params = {}
            
            # Only include parameters that MMS-TTS actually supports
            supported_keys = ['max_new_tokens', 'sample_rate']
            for key in supported_keys:
                if key in kwargs:
                    basic_params[key] = kwargs[key]
            
            logger.info(f"Generating MMS-TTS audio with filtered params: {list(basic_params.keys())}")
            
            result = pipeline(prompt, **basic_params)
            
            # Handle different result formats
            if isinstance(result, dict):
                if "audio" in result:
                    return result["audio"]
                elif "generated_audio" in result:
                    return result["generated_audio"]
            elif hasattr(result, 'audio'):
                return result.audio
            
            return result
        
        return await self._run_in_executor(_generate)
    
    def get_supported_parameters(self) -> List[str]:
        """Get supported parameters for Facebook MMS-TTS"""
        return [
            'max_new_tokens', 'sample_rate'
            # Note: MMS-TTS does NOT support voice, speed, pitch, volume
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
            "limitations": ["no voice control", "no speed/pitch/volume control"],
            "device_management": False
        }
