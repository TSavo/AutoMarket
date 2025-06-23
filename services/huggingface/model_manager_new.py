"""
Refactored Model Manager with Pluggable Handler Architecture

Clean, modular ModelManager that delegates model-specific logic to handlers.
"""

import asyncio
import logging
import time
import gc
import numpy as np
from typing import Dict, Any, Optional, List
import torch
import psutil

from huggingface_hub import model_info, HfApi
import config
from .model_info import ModelInfo
from .handlers import (
    ModelHandlerRegistry,
    SpeechT5Handler, MusicGenHandler, GenericAudioHandler,
    StableDiffusionHandler, StableDiffusionXLHandler, GenericDiffusionHandler
)

logger = logging.getLogger(__name__)

class ModelManager:
    """Clean, modular model manager with pluggable handlers"""
    
    def __init__(self):
        self.loaded_models: Dict[str, ModelInfo] = {}
        self.loading_locks: Dict[str, asyncio.Lock] = {}
        self.hf_api = HfApi()
        
        # Initialize handler registry
        self.handler_registry = ModelHandlerRegistry()
        self._register_handlers()
    
    def _register_handlers(self):
        """Register all model handlers in priority order"""
        # Audio handlers (specific -> generic)
        self.handler_registry.register(SpeechT5Handler())
        self.handler_registry.register(MusicGenHandler())
        self.handler_registry.register(GenericAudioHandler())  # fallback
        
        # Image handlers (specific -> generic)
        self.handler_registry.register(StableDiffusionHandler())
        self.handler_registry.register(StableDiffusionXLHandler())
        self.handler_registry.register(GenericDiffusionHandler())  # fallback
        
        logger.info(f"Registered {len(self.handler_registry.handlers)} model handlers")
    
    def detect_model_type(self, model_id: str) -> str:
        """Detect if a model is text-to-image or text-to-audio based on model ID patterns"""
        model_id_lower = model_id.lower()
        
        # Text-to-Audio indicators
        audio_indicators = [
            'tts', 'speecht5', 'mms-tts', 'vits', 'xtts', 'musicgen', 'bark',
            'text-to-speech', 'speech', 'audio', 'voice', 'sound', 'wav2vec',
            'whisper', 'fastspeech', 'tacotron'
        ]
        
        # Check for audio indicators
        if any(indicator in model_id_lower for indicator in audio_indicators):
            return "text-to-audio"
        
        # Default to text-to-image for diffusion models and unknown types
        return "text-to-image"
        
    async def load_model(
        self, 
        model_id: str, 
        model_type: Optional[str] = None,
        force: bool = False,
        precision: str = config.DEFAULT_PRECISION,
        device: str = config.DEVICE
    ) -> Dict[str, Any]:
        """Load a model dynamically from HuggingFace Hub using appropriate handler"""
        
        resolved_id = config.resolve_model_id(model_id)
        
        # Detect model type if not provided
        if model_type is None:
            model_type = self.detect_model_type(resolved_id)
        
        logger.info(f"Loading {model_type} model: {resolved_id}")
        
        # Check if already loaded
        if resolved_id in self.loaded_models and not force:
            model_info = self.loaded_models[resolved_id]
            model_info.last_used = time.time()
            logger.info(f"Model {resolved_id} already loaded")
            return {
                "success": True,
                "modelId": resolved_id,
                "modelType": model_type,
                "loadTime": 0,
                "memoryUsage": model_info.memory_usage,
                "cached": True
            }
        
        # Ensure we have a lock for this model
        if resolved_id not in self.loading_locks:
            self.loading_locks[resolved_id] = asyncio.Lock()
        
        async with self.loading_locks[resolved_id]:
            # Double-check after acquiring lock
            if resolved_id in self.loaded_models and not force:
                model_info = self.loaded_models[resolved_id]
                model_info.last_used = time.time()
                return {
                    "success": True,
                    "modelId": resolved_id,
                    "loadTime": 0,
                    "memoryUsage": model_info.memory_usage,
                    "cached": True
                }
            
            try:
                # Check memory and unload models if needed
                await self._manage_memory()
                
                # Validate model exists on HuggingFace Hub
                await self._validate_model(resolved_id)
                
                # Find appropriate handler
                handler = self.handler_registry.get_handler(resolved_id, model_type)
                if not handler:
                    raise ValueError(f"No handler found for model: {resolved_id} (type: {model_type})")
                
                start_time = time.time()
                
                # Get model-specific configuration
                model_config = config.get_model_config(resolved_id)
                
                # Load pipeline using handler
                logger.info(f"Using handler: {handler.get_handler_info()['name']}")
                pipeline = await handler.load_pipeline(resolved_id, device, model_config)
                
                # Apply model optimizations (only for image models)
                if model_type == "text-to-image":
                    pipeline = await self._apply_optimizations(pipeline, model_type)
                
                load_time = time.time() - start_time
                memory_usage = self._get_model_memory_usage()
                
                # Store model info
                self.loaded_models[resolved_id] = ModelInfo(
                    model_id=resolved_id,
                    model_type=model_type,
                    pipeline=pipeline,
                    handler_name=handler.get_handler_info()['name'],
                    load_time=load_time,
                    last_used=time.time(),
                    memory_usage=memory_usage,
                    device=device,
                    precision=precision
                )
                
                logger.info(f"Successfully loaded {model_type} model {resolved_id} in {load_time:.2f}s")
                
                return {
                    "success": True,
                    "modelId": resolved_id,
                    "modelType": model_type,
                    "loadTime": int(load_time * 1000),  # Convert to milliseconds
                    "memoryUsage": memory_usage
                }
                
            except Exception as e:
                logger.error(f"Failed to load model {resolved_id}: {str(e)}")
                return {
                    "success": False,
                    "modelId": resolved_id,
                    "modelType": model_type,
                    "loadTime": 0,
                    "memoryUsage": 0,
                    "error": str(e)
                }
    
    async def _apply_optimizations(self, pipeline: Any, model_type: str) -> Any:
        """Apply optimizations to image models"""
        if model_type != "text-to-image":
            return pipeline
        
        # Enable memory efficient attention if available
        if (config.ENABLE_MEMORY_EFFICIENT_ATTENTION and 
            hasattr(pipeline, 'unet') and 
            hasattr(pipeline.unet, 'set_use_memory_efficient_attention_xformers')):
            try:
                pipeline.unet.set_use_memory_efficient_attention_xformers(True)
                logger.info("Enabled memory efficient attention")
            except Exception as e:
                logger.warning(f"Could not enable memory efficient attention: {e}")
        
        # Enable CPU offload if configured
        if config.ENABLE_CPU_OFFLOAD and hasattr(pipeline, 'enable_sequential_cpu_offload'):
            pipeline.enable_sequential_cpu_offload()
            logger.info("Enabled CPU offload")
        
        return pipeline
    
    async def generate_image(
        self,
        model_id: str,
        prompt: str,
        negative_prompt: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate an image using appropriate handler"""
        resolved_id = config.resolve_model_id(model_id)
        
        if resolved_id not in self.loaded_models:
            raise ValueError(f"Model {resolved_id} not loaded")
        
        model_info = self.loaded_models[resolved_id]
        model_info.last_used = time.time()
        
        # Get handler for this model
        handler = self.handler_registry.get_handler(resolved_id, "text-to-image")
        if not handler:
            raise ValueError(f"No handler found for image model: {resolved_id}")
        
        try:
            logger.info(f"Generating image with {resolved_id}: {prompt[:50]}...")
            
            start_time = time.time()
            
            # Use handler to generate
            image = await handler.generate(
                model_info.pipeline, 
                prompt, 
                negative_prompt=negative_prompt,
                **kwargs
            )
            
            generation_time = time.time() - start_time
            
            logger.info(f"Image generated in {generation_time:.2f}s")
            
            return {
                "image": image,
                "generation_time": generation_time,
                "parameters": {"prompt": prompt, "negative_prompt": negative_prompt, **kwargs}
            }
        except Exception as e:
            logger.error(f"Image generation failed: {str(e)}")
            raise
    
    async def generate_audio(
        self,
        model_id: str,
        prompt: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate audio using appropriate handler"""
        resolved_id = config.resolve_model_id(model_id)
        
        if resolved_id not in self.loaded_models:
            raise ValueError(f"Model {resolved_id} not loaded")
        
        model_info = self.loaded_models[resolved_id]
        
        if model_info.model_type != "text-to-audio":
            raise ValueError(f"Model {resolved_id} is not a text-to-audio model")
        
        model_info.last_used = time.time()
        
        # Get handler for this model
        handler = self.handler_registry.get_handler(resolved_id, "text-to-audio")
        if not handler:
            raise ValueError(f"No handler found for audio model: {resolved_id}")
        
        try:
            logger.info(f"Generating audio with {resolved_id}: {prompt[:50]}...")
            start_time = time.time()
            
            # Use handler to generate
            audio = await handler.generate(model_info.pipeline, prompt, **kwargs)
            
            generation_time = time.time() - start_time
            
            # Calculate audio duration (assuming sample rate from kwargs or default)
            sample_rate = kwargs.get("sample_rate", 22050)
            duration = len(audio) / sample_rate if isinstance(audio, np.ndarray) else 0
            
            logger.info(f"Audio generated in {generation_time:.2f}s, duration: {duration:.2f}s")
            
            return {
                "audio": audio,
                "generation_time": generation_time,
                "duration": duration,
                "sample_rate": sample_rate,
                "parameters": kwargs
            }
        except Exception as e:
            logger.error(f"Audio generation failed: {str(e)}")
            raise
    
    async def _validate_model(self, model_id: str):
        """Validate that the model exists and is compatible"""
        try:
            # Run in thread pool
            loop = asyncio.get_event_loop()
            info = await loop.run_in_executor(None, lambda: model_info(model_id))
            
            # Determine expected model type
            model_type = self.detect_model_type(model_id)
            
            # Validate based on model type
            if model_type == "text-to-image":
                # Check if it's a diffusers model
                if 'diffusers' not in info.tags:
                    raise ValueError(f"Model {model_id} is not a diffusers model")
            elif model_type == "text-to-audio":
                # For audio models, check for common audio-related tags
                audio_tags = ['text-to-speech', 'audio', 'tts', 'music', 'speech-synthesis']
                if not any(tag in info.tags for tag in audio_tags) and not any(keyword in model_id.lower() for keyword in ['tts', 'speecht5', 'musicgen', 'bark', 'xtts']):
                    # Don't fail for now - many audio models don't have proper tags
                    logger.warning(f"Model {model_id} might not be an audio model, but proceeding...")
                
        except Exception as e:
            raise ValueError(f"Model validation failed for {model_id}: {str(e)}")
    
    async def _manage_memory(self):
        """Manage memory by unloading old models if needed"""
        if len(self.loaded_models) >= config.MAX_LOADED_MODELS:
            # Find the least recently used model
            oldest_model = min(
                self.loaded_models.values(),
                key=lambda x: x.last_used
            )
            
            logger.info(f"Unloading least recently used model: {oldest_model.model_id}")
            await self.unload_model(oldest_model.model_id)
    
    def _get_model_memory_usage(self) -> int:
        """Get current memory usage in MB"""
        if torch.cuda.is_available():
            return int(torch.cuda.memory_allocated() / 1024 / 1024)
        else:
            process = psutil.Process()
            return int(process.memory_info().rss / 1024 / 1024)
    
    async def unload_model(self, model_id: str) -> Dict[str, Any]:
        """Unload a specific model"""
        resolved_id = config.resolve_model_id(model_id)
        
        if resolved_id not in self.loaded_models:
            return {"success": False, "message": f"Model {resolved_id} not loaded"}
        
        try:
            model_info = self.loaded_models[resolved_id]
            
            # Move to CPU and delete
            if model_info.pipeline:
                # Only move to CPU if the pipeline has the .to() method (diffusion models)
                if hasattr(model_info.pipeline, 'to'):
                    model_info.pipeline.to("cpu")
                del model_info.pipeline
            
            del self.loaded_models[resolved_id]
            
            # Force garbage collection
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            logger.info(f"Unloaded model: {resolved_id}")
            
            return {"success": True, "message": f"Model {resolved_id} unloaded"}
            
        except Exception as e:
            logger.error(f"Failed to unload model {resolved_id}: {str(e)}")
            return {"success": False, "message": str(e)}
    
    def get_model_info(self, model_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a loaded model"""
        resolved_id = config.resolve_model_id(model_id)
        
        if resolved_id not in self.loaded_models:
            return None
        
        model_info = self.loaded_models[resolved_id]
        capabilities = ["text-to-image"] if model_info.model_type == "text-to-image" else ["text-to-audio", "text-to-speech"]
        
        # Get model config and make it JSON serializable
        model_config = config.get_model_config(resolved_id)
        serializable_config = {}
        for key, value in model_config.items():
            if hasattr(value, '__name__'):  # Handle torch.dtype objects
                serializable_config[key] = str(value)
            else:
                serializable_config[key] = value
        
        return {
            "modelId": resolved_id,
            "modelType": model_info.model_type,
            "handlerName": model_info.handler_name,
            "loaded": True,
            "loadTime": model_info.load_time,
            "lastUsed": model_info.last_used,
            "memoryUsage": model_info.memory_usage,
            "device": model_info.device,
            "precision": model_info.precision,
            "capabilities": capabilities,
            "parameters": serializable_config
        }
    
    def list_loaded_models(self) -> List[Dict[str, Any]]:
        """List all loaded models"""
        return [
            self.get_model_info(model_id) 
            for model_id in self.loaded_models.keys()
        ]
    
    def list_handlers(self) -> List[Dict[str, Any]]:
        """List all registered handlers"""
        return self.handler_registry.list_handlers()
    
    def get_memory_info(self) -> Dict[str, Any]:
        """Get current memory usage information"""
        if torch.cuda.is_available():
            gpu_memory = torch.cuda.get_device_properties(0).total_memory
            gpu_allocated = torch.cuda.memory_allocated()
            gpu_cached = torch.cuda.memory_reserved()
            
            return {
                "gpu": {
                    "available": True,
                    "name": torch.cuda.get_device_name(0),
                    "total": int(gpu_memory / 1024 / 1024),  # MB
                    "allocated": int(gpu_allocated / 1024 / 1024),  # MB
                    "cached": int(gpu_cached / 1024 / 1024)  # MB
                }
            }
        else:
            process = psutil.Process()
            memory_info = process.memory_info()
            
            return {
                "cpu": {
                    "rss": int(memory_info.rss / 1024 / 1024),  # MB
                    "vms": int(memory_info.vms / 1024 / 1024)   # MB
                }
            }
