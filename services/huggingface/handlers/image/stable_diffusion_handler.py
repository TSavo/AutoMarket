"""
Stable Diffusion Handler

Handles Stable Diffusion v1.x and v2.x models.
"""

from typing import Any, Dict, List
import logging
from PIL import Image

from handlers.base_handler import ModelHandler

logger = logging.getLogger(__name__)

class StableDiffusionHandler(ModelHandler):
    """Handler for Stable Diffusion v1.x and v2.x models"""
    
    def can_handle(self, model_id: str, model_type: str) -> bool:
        """Check if this is a Stable Diffusion v1/v2 model"""
        if model_type != "text-to-image":
            return False
        
        # SD 1.x and 2.x indicators
        sd_indicators = [
            'stable-diffusion-v1', 'runwayml/stable-diffusion',
            'CompVis/stable-diffusion', 'stabilityai/stable-diffusion-2',
            'stable-diffusion-2'
        ]
        
        # Exclude SDXL models (they have their own handler)
        xl_indicators = ['xl', 'sdxl', 'stable-diffusion-xl']
        
        return (any(indicator in model_id.lower() for indicator in sd_indicators) and
                not any(xl_indicator in model_id.lower() for xl_indicator in xl_indicators))
    
    async def load_pipeline(self, model_id: str, device: str, config: Dict[str, Any]) -> Any:
        """Load Stable Diffusion pipeline"""
        def _load():
            try:
                from diffusers import StableDiffusionPipeline
            except ImportError:
                raise ImportError("Stable Diffusion requires diffusers. Run: pip install diffusers")
            
            logger.info(f"Loading Stable Diffusion pipeline for {model_id}")
            
            pipeline = StableDiffusionPipeline.from_pretrained(
                model_id,
                **config
            ).to(device)
            
            return pipeline
        
        return await self._run_in_executor(_load)
    
    async def generate(self, pipeline: Any, prompt: str, **kwargs) -> Image.Image:
        """Generate image using Stable Diffusion"""
        def _generate():
            # Filter parameters to only supported ones
            supported_params = self.filter_parameters(kwargs)
            
            # Set defaults for SD
            generation_params = {
                "prompt": prompt,
                "height": 512,  # SD default
                "width": 512,   # SD default
                "num_inference_steps": 20,
                "guidance_scale": 7.5,
                **supported_params
            }
            
            # Remove None values
            generation_params = {k: v for k, v in generation_params.items() if v is not None}
            
            logger.debug(f"SD generation params: {list(generation_params.keys())}")
            
            result = pipeline(**generation_params)
            return result.images[0]
        
        return await self._run_in_executor(_generate)
    
    def get_supported_parameters(self) -> List[str]:
        """Get supported parameters for Stable Diffusion"""
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
            "name": "StableDiffusionHandler",
            "description": "Stable Diffusion v1.x and v2.x text-to-image models",
            "model_type": "text-to-image",
            "supported_models": [
                "runwayml/stable-diffusion-v1-5",
                "CompVis/stable-diffusion-v1-4",
                "stabilityai/stable-diffusion-2-1",
                "stabilityai/stable-diffusion-2"
            ],
            "capabilities": ["text-to-image", "negative-prompts", "guidance-scale"],
            "default_resolution": "512x512",
            "device_management": True
        }
