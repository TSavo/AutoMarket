"""
ModelHandler Registry

Manages registration and selection of model handlers.
"""

from typing import List, Optional, Dict, Any
import logging
from handlers.base_handler import ModelHandler

logger = logging.getLogger(__name__)

class ModelHandlerRegistry:
    """Registry for managing model handlers"""
    
    def __init__(self):
        self.handlers: List[ModelHandler] = []
        self._handler_cache: Dict[str, Optional[ModelHandler]] = {}
    
    def register(self, handler: ModelHandler) -> None:
        """
        Register a new model handler
        
        Args:
            handler: The handler instance to register
        """
        if not isinstance(handler, ModelHandler):
            raise TypeError(f"Handler must be instance of ModelHandler, got {type(handler)}")
        
        self.handlers.append(handler)
        handler_info = handler.get_handler_info()
        logger.info(f"Registered handler: {handler_info['name']} - {handler_info['description']}")
        
        # Clear cache when new handler is registered
        self._handler_cache.clear()
    
    def get_handler(self, model_id: str, model_type: str) -> Optional[ModelHandler]:
        """
        Get the appropriate handler for a model
        
        Args:
            model_id: The HuggingFace model identifier
            model_type: The detected model type
            
        Returns:
            The first handler that can handle the model, or None if no handler found
        """
        cache_key = f"{model_id}:{model_type}"
        
        # Check cache first
        if cache_key in self._handler_cache:
            return self._handler_cache[cache_key]
        
        # Find handler
        for handler in self.handlers:
            if handler.can_handle(model_id, model_type):
                self._handler_cache[cache_key] = handler
                logger.debug(f"Found handler {handler.get_handler_info()['name']} for {model_id}")
                return handler
        
        # No handler found
        self._handler_cache[cache_key] = None
        logger.warning(f"No handler found for model: {model_id} (type: {model_type})")
        return None
    
    def list_handlers(self) -> List[Dict[str, Any]]:
        """
        List all registered handlers with their info
        
        Returns:
            List of handler information dictionaries
        """
        return [handler.get_handler_info() for handler in self.handlers]
    
    def get_handlers_for_type(self, model_type: str) -> List[ModelHandler]:
        """
        Get all handlers that support a specific model type
        
        Args:
            model_type: The model type to filter by
            
        Returns:
            List of handlers that support the model type
        """
        # We can't filter by model_type alone since handlers decide based on model_id too
        # This method would need specific implementation or we could add a supports_type method
        return [handler for handler in self.handlers 
                if hasattr(handler, 'supports_type') and handler.supports_type(model_type)]
    
    def clear_cache(self) -> None:
        """Clear the handler selection cache"""
        self._handler_cache.clear()
        logger.debug("Handler cache cleared")
    
    def unregister(self, handler: ModelHandler) -> bool:
        """
        Unregister a handler
        
        Args:
            handler: The handler to unregister
            
        Returns:
            True if handler was found and removed, False otherwise
        """
        if handler in self.handlers:
            self.handlers.remove(handler)
            self._handler_cache.clear()
            handler_info = handler.get_handler_info()
            logger.info(f"Unregistered handler: {handler_info['name']}")
            return True
        return False
