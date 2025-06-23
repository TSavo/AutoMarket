"""
Base ModelHandler Abstract Class

Defines the interface for pluggable model handlers in the HuggingFace service.
Each handler is responsible for loading and generating with specific model families.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import asyncio

class ModelHandler(ABC):
    """Abstract base class for model handlers"""
    
    @abstractmethod
    def can_handle(self, model_id: str, model_type: str) -> bool:
        """
        Check if this handler can process the given model
        
        Args:
            model_id: The HuggingFace model identifier
            model_type: The detected model type ("text-to-image" or "text-to-audio")
            
        Returns:
            True if this handler can handle the model, False otherwise
        """
        pass
    
    @abstractmethod
    async def load_pipeline(self, model_id: str, device: str, config: Dict[str, Any]) -> Any:
        """
        Load the model pipeline
        
        Args:
            model_id: The HuggingFace model identifier
            device: The device to load the model on (cuda:0, cpu, etc.)
            config: Model-specific configuration dictionary
            
        Returns:
            The loaded pipeline or model object
        """
        pass
    
    @abstractmethod
    async def generate(self, pipeline: Any, prompt: str, **kwargs) -> Any:
        """
        Generate content using the pipeline
        
        Args:
            pipeline: The loaded pipeline from load_pipeline()
            prompt: The input prompt
            **kwargs: Additional generation parameters
            
        Returns:
            Generated content (image, audio, etc.)
        """
        pass
    
    @abstractmethod
    def get_supported_parameters(self) -> List[str]:
        """
        Get list of supported generation parameters for this handler
        
        Returns:
            List of parameter names that this handler supports
        """
        pass
    
    @abstractmethod
    def get_handler_info(self) -> Dict[str, Any]:
        """
        Get information about this handler
        
        Returns:
            Dictionary with handler metadata (name, description, supported_models, etc.)
        """
        pass
    
    def filter_parameters(self, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Filter kwargs to only include supported parameters
        
        Args:
            kwargs: Input parameters dictionary
            
        Returns:
            Filtered dictionary with only supported parameters
        """
        supported = set(self.get_supported_parameters())
        return {k: v for k, v in kwargs.items() if k in supported}
    
    async def _run_in_executor(self, func, *args):
        """Helper method to run blocking operations in thread pool"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, func, *args)
