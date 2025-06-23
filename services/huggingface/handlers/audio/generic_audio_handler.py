"""
Generic Audio Handler

Fallback handler for generic transformers audio pipelines.
"""

from typing import Any, Dict, List
import logging

from handlers.base_handler import ModelHandler

logger = logging.getLogger(__name__)

class GenericAudioHandler(ModelHandler):
    """Generic fallback handler for transformers audio pipelines"""
    
    def can_handle(self, model_id: str, model_type: str) -> bool:
        """This is a fallback handler, so it can handle any audio model"""
        return model_type == "text-to-audio"
    
    async def load_pipeline(self, model_id: str, device: str, config: Dict[str, Any]) -> Any:
        """Load generic audio pipeline"""
        def _load():
            try:
                from transformers import pipeline as transformers_pipeline
            except ImportError:
                raise ImportError("Generic audio handler requires transformers. Run: pip install transformers")
            
            logger.info(f"Loading generic audio pipeline for {model_id}")
            
            # Try different pipeline types in order of preference
            pipeline_types = ["text-to-speech", "text-to-audio", "automatic-speech-recognition"]
            
            last_error = None
            for pipeline_type in pipeline_types:
                try:
                    logger.debug(f"Trying pipeline type: {pipeline_type}")
                    return transformers_pipeline(pipeline_type, model=model_id, device=device)
                except Exception as e:
                    last_error = e
                    logger.debug(f"Pipeline type {pipeline_type} failed: {str(e)}")
                    continue
            
            # If all pipeline types failed, raise the last error
            raise ValueError(f"Could not load {model_id} with any supported pipeline type. Last error: {last_error}")
        
        return await self._run_in_executor(_load)
    
    async def generate(self, pipeline: Any, prompt: str, **kwargs) -> Any:
        """Generate audio using generic pipeline"""
        def _generate():
            # Filter parameters to only supported ones
            supported_params = self.filter_parameters(kwargs)
            
            logger.debug(f"Generating with filtered params: {list(supported_params.keys())}")
            
            result = pipeline(prompt, **supported_params)
            
            # Handle different result formats
            if isinstance(result, dict):
                if "audio" in result:
                    return result["audio"]
                elif "generated_audio" in result:
                    return result["generated_audio"]
            elif hasattr(result, 'audio'):
                return result.audio
            elif hasattr(result, 'generated_audio'):
                return result.generated_audio
            
            # Return as-is if we can't extract audio
            return result
        
        return await self._run_in_executor(_generate)
    
    def get_supported_parameters(self) -> List[str]:
        """Get supported parameters for generic audio pipelines"""
        return [
            'sample_rate', 'duration', 'max_new_tokens', 
            'num_inference_steps', 'guidance_scale',
            'temperature', 'top_k', 'top_p'
        ]
    
    def get_handler_info(self) -> Dict[str, Any]:
        """Get handler information"""
        return {
            "name": "GenericAudioHandler",
            "description": "Fallback handler for generic transformers audio pipelines",
            "model_type": "text-to-audio",
            "supported_models": ["*"],  # Fallback for any audio model
            "capabilities": ["text-to-speech", "text-to-audio", "generic"],
            "device_management": False,
            "priority": 1000  # Low priority (fallback)
        }
