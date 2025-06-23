"""
MusicGen Handler

Handles Facebook MusicGen models with proper device management.
"""

import torch
import numpy as np
from typing import Any, Dict, List
import logging

from handlers.base_handler import ModelHandler

logger = logging.getLogger(__name__)

class MusicGenHandler(ModelHandler):
    """Handler for Facebook MusicGen music generation models"""
    
    def can_handle(self, model_id: str, model_type: str) -> bool:
        """Check if this is a MusicGen model"""
        return (
            model_type == "text-to-audio" and
            "musicgen" in model_id.lower()
        )
    
    async def load_pipeline(self, model_id: str, device: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Load MusicGen model components"""
        def _load():
            try:
                from transformers.models.musicgen import MusicgenForConditionalGeneration, MusicgenProcessor
            except ImportError:
                raise ImportError("MusicGen requires transformers. Run: pip install transformers")
            
            logger.info(f"Loading MusicGen components for {model_id}")
            
            # Load processor (no device needed)
            processor = MusicgenProcessor.from_pretrained(model_id)
            
            # Load model and move to device
            model = MusicgenForConditionalGeneration.from_pretrained(model_id).to(device)
            
            return {
                "processor": processor,
                "model": model,
                "type": "musicgen"
            }
        
        return await self._run_in_executor(_load)
    
    async def generate(self, pipeline: Dict[str, Any], prompt: str, **kwargs) -> np.ndarray:
        """Generate music using MusicGen"""
        def _generate():
            processor = pipeline["processor"]
            model = pipeline["model"]
            
            # Process input text
            inputs = processor(
                text=[prompt],
                padding=True,
                return_tensors="pt",
            )
            
            # Ensure all tensors are on the same device as the model
            device = model.device
            inputs = {k: v.to(device) for k, v in inputs.items() if hasattr(v, 'to')}
            
            # Generate audio with configurable parameters
            max_new_tokens = kwargs.get('max_new_tokens', 256)
            
            logger.debug(f"Generating music with max_new_tokens={max_new_tokens}")
            audio_values = model.generate(**inputs, max_new_tokens=max_new_tokens)
            
            return audio_values[0, 0].cpu().numpy()
        
        return await self._run_in_executor(_generate)
    
    def get_supported_parameters(self) -> List[str]:
        """Get supported parameters for MusicGen"""
        return [
            'max_new_tokens', 'guidance_scale', 'num_inference_steps',
            'sample_rate', 'format', 'duration'
        ]
    
    def get_handler_info(self) -> Dict[str, Any]:
        """Get handler information"""
        return {
            "name": "MusicGenHandler",
            "description": "Facebook MusicGen music generation models",
            "model_type": "text-to-audio",
            "supported_models": [
                "facebook/musicgen-small",
                "facebook/musicgen-medium", 
                "facebook/musicgen-large"
            ],
            "capabilities": ["text-to-music", "conditional-generation"],
            "device_management": True
        }
