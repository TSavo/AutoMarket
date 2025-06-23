"""
ESPnet VITS Handler

Handles ESPnet VITS models. These models have known compatibility issues
with the current transformers library and require special handling.
"""

from typing import Any, Dict, List
import logging

from handlers.base_handler import ModelHandler

logger = logging.getLogger(__name__)

class ESPnetVITSHandler(ModelHandler):
    """Handler for ESPnet VITS models"""
    
    def can_handle(self, model_id: str, model_type: str) -> bool:
        """Check if this is an ESPnet VITS model"""
        return (
            model_type == "text-to-audio" and
            ("espnet" in model_id.lower() and "vits" in model_id.lower())
        )
    
    async def load_pipeline(self, model_id: str, device: str, config: Dict[str, Any]) -> Any:
        """Load ESPnet VITS pipeline (with known limitations)"""
        def _load():
            logger.warning(f"ESPnet VITS model {model_id} has known compatibility issues")
            
            # These models are known to be incompatible with current transformers
            raise ValueError(
                f"ESPnet VITS model {model_id} is not compatible with the current transformers library. "
                f"Issues: Missing required model files (pytorch_model.bin, model.safetensors), "
                f"incompatible VitsConfig with AutoModelForTextToSpectrogram, "
                f"and unsupported 'audio-generation' pipeline task. "
                f"This is a model format incompatibility, not a code issue."
            )
        
        return await self._run_in_executor(_load)
    
    async def generate(self, pipeline: Any, prompt: str, **kwargs) -> Any:
        """Generate speech using ESPnet VITS (not implemented due to compatibility issues)"""
        raise NotImplementedError("ESPnet VITS models are not supported due to transformers compatibility issues")
    
    def get_supported_parameters(self) -> List[str]:
        """Get supported parameters for ESPnet VITS"""
        return []  # No parameters supported due to compatibility issues
    
    def get_handler_info(self) -> Dict[str, Any]:
        """Get handler information"""
        return {
            "name": "ESPnetVITSHandler",
            "description": "ESPnet VITS models - NOT SUPPORTED due to transformers compatibility issues",
            "model_type": "text-to-audio",
            "supported_models": [
                "espnet/kan-bayashi_ljspeech_vits",
                "espnet/*vits*"
            ],
            "capabilities": [],
            "limitations": [
                "Missing required model files",
                "Incompatible VitsConfig",
                "Unsupported pipeline task",
                "Requires ESPnet library instead of transformers"
            ],
            "status": "incompatible",
            "device_management": False,
            "priority": 100  # High priority to catch these before generic handler
        }
