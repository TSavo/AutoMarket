"""
Model Information Data Class

Contains metadata about loaded models.
"""

from dataclasses import dataclass
from typing import Optional, Union, Any

@dataclass
class ModelInfo:
    """Information about a loaded model"""
    
    model_id: str
    model_type: str  # "text-to-image" or "text-to-audio"
    pipeline: Optional[Union[Any]]  # The loaded pipeline or model
    handler_name: str  # Name of the handler that loaded this model
    load_time: float
    last_used: float
    memory_usage: int
    device: str
    precision: str
    
    def to_dict(self) -> dict:
        """Convert to dictionary (excluding pipeline object)"""
        return {
            "model_id": self.model_id,
            "model_type": self.model_type,
            "handler_name": self.handler_name,
            "load_time": self.load_time,
            "last_used": self.last_used,
            "memory_usage": self.memory_usage,
            "device": self.device,
            "precision": self.precision
        }
