"""
Stable Diffusion XL Handler

Handles Stable Diffusion XL models with their specific requirements.
"""

from typing import Any, Dict, List
import logging
from PIL import Image

from handlers.base_handler import ModelHandler

logger = logging.getLogger(__name__)

class StableDiffusionXLHandler(ModelHandler):
    """Handler for Stable Diffusion XL models"""
    
    def can_handle(self, model_id: str, model_type: str) -> bool:
        """Check if this is a Stable Diffusion XL model"""
        if model_type != "text-to-image":
            return False
        
        xl_indicators = [
            'stable-diffusion-xl', 'sdxl', 'stabilityai/stable-diffusion-xl'
        ]
        
        return any(indicator in model_id.lower() for indicator in xl_indicators)
    
    async def load_pipeline(self, model_id: str, device: str, config: Dict[str, Any]) -> Any:
        """Load Stable Diffusion XL pipeline"""
        def _load():
            try:
                from diffusers import StableDiffusionXLPipeline
            except ImportError:
                raise ImportError("Stable Diffusion XL requires diffusers. Run: pip install diffusers")
            
            logger.info(f"Loading Stable Diffusion XL pipeline for {model_id}")
            
            pipeline = StableDiffusionXLPipeline.from_pretrained(
                model_id,
                **config
            ).to(device)
            
            return pipeline
        
        return await self._run_in_executor(_load)
    
    async def generate(self, pipeline: Any, prompt: str, **kwargs) -> Image.Image:
        """Generate image using Stable Diffusion XL"""
        def _generate():
            # Filter parameters to only supported ones
            supported_params = self.filter_parameters(kwargs)
            
            # Set defaults for SDXL
            generation_params = {
                "prompt": prompt,
                "height": 1024,  # SDXL default
                "width": 1024,   # SDXL default
                "num_inference_steps": 30,  # SDXL typically needs more steps
                "guidance_scale": 5.0,      # SDXL works better with lower guidance
                **supported_params
            }
            
            # Remove None values
            generation_params = {k: v for k, v in generation_params.items() if v is not None}
            
            logger.debug(f"SDXL generation params: {list(generation_params.keys())}")
            
            result = pipeline(**generation_params)
            return result.images[0]
        
        return await self._run_in_executor(_generate)
    
    def get_supported_parameters(self) -> List[str]:
        """Get supported parameters for Stable Diffusion XL"""
        return [
            'negative_prompt', 'height', 'width', 'num_inference_steps',
            'denoising_end', 'guidance_scale', 'num_images_per_prompt',
            'eta', 'generator', 'latents', 'prompt_embeds', 'negative_prompt_embeds',
            'pooled_prompt_embeds', 'negative_pooled_prompt_embeds',
            'output_type', 'return_dict', 'callback', 'callback_steps',
            'cross_attention_kwargs', 'guidance_rescale', 'original_size',
            'crops_coords_top_left', 'target_size'
        ]
    
    def get_handler_info(self) -> Dict[str, Any]:
        """Get handler information"""
        return {
            "name": "StableDiffusionXLHandler",
            "description": "Stable Diffusion XL high-resolution text-to-image models",
            "model_type": "text-to-image",
            "supported_models": [
                "stabilityai/stable-diffusion-xl-base-1.0",
                "stabilityai/stable-diffusion-xl-refiner-1.0"
            ],
            "capabilities": [
                "text-to-image", "high-resolution", "dual-text-encoders",
                "negative-prompts", "guidance-scale", "conditioning"
            ],
            "default_resolution": "1024x1024",
            "device_management": True
        }
