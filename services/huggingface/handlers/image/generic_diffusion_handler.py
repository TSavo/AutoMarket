"""
Generic Diffusion Handler

Fallback handler for any diffusion model using DiffusionPipeline.from_pretrained().
"""

from typing import Any, Dict, List
import logging
from PIL import Image

from handlers.base_handler import ModelHandler

logger = logging.getLogger(__name__)

class GenericDiffusionHandler(ModelHandler):
    """Generic fallback handler for diffusion models"""
    
    def can_handle(self, model_id: str, model_type: str) -> bool:
        """This is a fallback handler for any text-to-image model"""
        return model_type == "text-to-image"
    
    async def load_pipeline(self, model_id: str, device: str, config: Dict[str, Any]) -> Any:
        """Load generic diffusion pipeline"""
        def _load():
            try:
                from diffusers import DiffusionPipeline
            except ImportError:
                raise ImportError("Generic diffusion handler requires diffusers. Run: pip install diffusers")
            
            logger.info(f"Loading generic diffusion pipeline for {model_id}")
            
            pipeline = DiffusionPipeline.from_pretrained(
                model_id,
                **config
            ).to(device)
            
            return pipeline
        
        return await self._run_in_executor(_load)
    
    async def generate(self, pipeline: Any, prompt: str, **kwargs) -> Image.Image:
        """Generate image using generic diffusion pipeline"""
        def _generate():
            # Filter parameters to only supported ones
            supported_params = self.filter_parameters(kwargs)
            
            # Basic generation parameters
            generation_params = {
                "prompt": prompt,
                **supported_params
            }
            
            # Remove None values
            generation_params = {k: v for k, v in generation_params.items() if v is not None}
            
            logger.debug(f"Generic diffusion generation params: {list(generation_params.keys())}")
            
            result = pipeline(**generation_params)
            
            # Handle different result formats
            if hasattr(result, 'images') and result.images:
                return result.images[0]
            elif isinstance(result, list) and result:
                return result[0]
            else:
                return result
        
        return await self._run_in_executor(_generate)
    
    def get_supported_parameters(self) -> List[str]:
        """Get supported parameters for generic diffusion models"""
        return [
            'negative_prompt', 'height', 'width', 'num_inference_steps',
            'guidance_scale', 'num_images_per_prompt', 'eta', 'generator',
            'latents', 'prompt_embeds', 'negative_prompt_embeds',
            'output_type', 'return_dict', 'callback', 'callback_steps',
            'cross_attention_kwargs'
        ]
    
    def get_handler_info(self) -> Dict[str, Any]:
        """Get handler information"""
        return {
            "name": "GenericDiffusionHandler",
            "description": "Fallback handler for generic diffusion models",
            "model_type": "text-to-image",
            "supported_models": ["*"],  # Fallback for any image model
            "capabilities": ["text-to-image", "generic"],
            "device_management": True,
            "priority": 1000  # Low priority (fallback)
        }
