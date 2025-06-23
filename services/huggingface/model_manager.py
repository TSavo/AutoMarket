"""
Dynamic Model Manager for HuggingFace Multimodal Models

Handles loading, caching, and memory management of:
- Text-to-Image models (diffusers)
- Text-to-Audio models (TTS, music generation, etc.)
"""

import asyncio
import logging
import time
import gc
import numpy as np
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass
import torch
import psutil

# Image generation imports
from diffusers import (
    StableDiffusionPipeline,
    StableDiffusionXLPipeline,
    DiffusionPipeline,
    DPMSolverMultistepScheduler,
    EulerDiscreteScheduler,
    DDIMScheduler
)

# Audio generation imports
try:
    from transformers import (
        SpeechT5Processor, SpeechT5ForTextToSpeech, SpeechT5HifiGan,
        pipeline as transformers_pipeline
    )
    from transformers.models.musicgen import MusicgenForConditionalGeneration, MusicgenProcessor
    AUDIO_IMPORTS_AVAILABLE = True
except ImportError:
    logger.warning("Audio generation libraries not available. Only text-to-image will work.")
    AUDIO_IMPORTS_AVAILABLE = False

from huggingface_hub import model_info, HfApi
import config

logger = logging.getLogger(__name__)

@dataclass
class ModelInfo:
    model_id: str
    model_type: str  # "text-to-image" or "text-to-audio"
    pipeline: Optional[Union[DiffusionPipeline, Any]]  # DiffusionPipeline or audio model
    load_time: float
    last_used: float
    memory_usage: int
    device: str
    precision: str

class ModelManager:
    """Manages dynamic loading and caching of HuggingFace multimodal models"""
    
    def __init__(self):
        self.loaded_models: Dict[str, ModelInfo] = {}
        self.loading_locks: Dict[str, asyncio.Lock] = {}
        self.hf_api = HfApi()
        
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
        """Load a model dynamically from HuggingFace Hub"""
        
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
                
                start_time = time.time()
                
                # Get model-specific configuration
                model_config = config.get_model_config(resolved_id)
                
                # Load the pipeline based on model type                logger.info(f"Downloading and loading {model_type} pipeline for {resolved_id}")
                pipeline = await self._load_pipeline(resolved_id, model_config, device, model_type)
                
                # Enable memory efficient attention if available (only for image models)
                if model_type == "text-to-image" and config.ENABLE_MEMORY_EFFICIENT_ATTENTION and hasattr(pipeline, 'unet') and hasattr(pipeline.unet, 'set_use_memory_efficient_attention_xformers'):
                    try:
                        pipeline.unet.set_use_memory_efficient_attention_xformers(True)
                        logger.info("Enabled memory efficient attention")
                    except Exception as e:
                        logger.warning(f"Could not enable memory efficient attention: {e}")
                
                # Enable CPU offload if configured (only for image models)
                if model_type == "text-to-image" and config.ENABLE_CPU_OFFLOAD and hasattr(pipeline, 'enable_sequential_cpu_offload'):
                    pipeline.enable_sequential_cpu_offload()
                    logger.info("Enabled CPU offload")
                
                load_time = time.time() - start_time
                memory_usage = self._get_model_memory_usage()
                
                # Store model info
                self.loaded_models[resolved_id] = ModelInfo(
                    model_id=resolved_id,
                    model_type=model_type,
                    pipeline=pipeline,
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
                    "loadTime": 0,  # Add missing field
                    "memoryUsage": 0,  # Add missing field
                    "error": str(e)
                }
    
    async def _load_pipeline(self, model_id: str, config_dict: Dict[str, Any], device: str, model_type: str) -> Union[DiffusionPipeline, Any]:
        """Load the appropriate pipeline based on model type"""
        
        # Run in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        
        def _load():
            if model_type == "text-to-image":
                return DiffusionPipeline.from_pretrained(
                    model_id,
                    **config_dict
                ).to(device)
            elif model_type == "text-to-audio":
                if not AUDIO_IMPORTS_AVAILABLE:
                    raise ImportError("Audio generation libraries not installed. Run: pip install transformers soundfile librosa")
                  # Handle different audio model types
                if "speecht5" in model_id.lower():
                    # SpeechT5 TTS model
                    processor = SpeechT5Processor.from_pretrained(model_id)
                    model = SpeechT5ForTextToSpeech.from_pretrained(model_id).to(device)
                    vocoder = SpeechT5HifiGan.from_pretrained("microsoft/speecht5_hifigan").to(device)
                    return {"processor": processor, "model": model, "vocoder": vocoder, "type": "speecht5"}
                
                elif "musicgen" in model_id.lower():
                    # MusicGen model
                    processor = MusicgenProcessor.from_pretrained(model_id)
                    model = MusicgenForConditionalGeneration.from_pretrained(model_id).to(device)
                    return {"processor": processor, "model": model, "type": "musicgen"}
                
                else:
                    # Generic audio pipeline - try different pipeline types
                    try:
                        # First try text-to-speech (most common for TTS models)
                        return transformers_pipeline("text-to-speech", model=model_id, device=device)
                    except Exception as e1:
                        try:
                            # Try text-to-audio (newer task type)
                            return transformers_pipeline("text-to-audio", model=model_id, device=device)
                        except Exception as e2:
                            try:
                                # Fallback to audio-generation
                                return transformers_pipeline("audio-generation", model=model_id, device=device)
                            except Exception as e3:
                                # Log all attempts and raise the most relevant error
                                logger.error(f"Failed to load {model_id} with multiple pipeline types:")
                                logger.error(f"  text-to-speech: {str(e1)}")
                                logger.error(f"  text-to-audio: {str(e2)}")
                                logger.error(f"  audio-generation: {str(e3)}")
                                raise ValueError(f"Could not load audio model {model_id} with any supported pipeline type")
            else:
                raise ValueError(f"Unsupported model type: {model_type}")
        
        return await loop.run_in_executor(None, _load)
    
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
                    print(f"Warning: Model {model_id} might not be an audio model, but proceeding...")
                
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
    
    async def generate_image(
        self,
        model_id: str,
        prompt: str,
        negative_prompt: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate an image using a loaded model"""
        
        resolved_id = config.resolve_model_id(model_id)
        
        if resolved_id not in self.loaded_models:
            raise ValueError(f"Model {resolved_id} not loaded")
        
        model_info = self.loaded_models[resolved_id]
        model_info.last_used = time.time()
        
        try:
            # Prepare generation parameters
            generation_params = {
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                **config.DEFAULT_GENERATION_CONFIG,
                **kwargs
            }
            
            # Remove None values
            generation_params = {k: v for k, v in generation_params.items() if v is not None}
            
            logger.info(f"Generating image with {resolved_id}: {prompt[:50]}...")
            
            start_time = time.time()
            
            # Run generation in thread pool
            loop = asyncio.get_event_loop()
            
            def _generate():
                return model_info.pipeline(**generation_params).images[0]
            
            image = await loop.run_in_executor(None, _generate)
            
            generation_time = time.time() - start_time
            
            logger.info(f"Image generated in {generation_time:.2f}s")
            
            return {
                "image": image,
                "generation_time": generation_time,
                "parameters": generation_params            }
        except Exception as e:
            logger.error(f"Image generation failed: {str(e)}")
            raise
    
    async def generate_audio(
        self,
        model_id: str,
        prompt: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate audio using a loaded model"""
        resolved_id = config.resolve_model_id(model_id)
        
        if resolved_id not in self.loaded_models:
            raise ValueError(f"Model {resolved_id} not loaded")
        
        model_info = self.loaded_models[resolved_id]
        
        if model_info.model_type != "text-to-audio":
            raise ValueError(f"Model {resolved_id} is not a text-to-audio model")
        
        model_info.last_used = time.time()
        
        try:
            logger.info(f"Generating audio with {resolved_id}: {prompt[:50]}...")
            start_time = time.time()
            
            # Run generation in thread pool
            loop = asyncio.get_event_loop()
            
            def _generate():
                pipeline = model_info.pipeline
                
                if isinstance(pipeline, dict):
                    # Handle specific model types
                    if pipeline["type"] == "speecht5":                        # SpeechT5 TTS generation
                        processor = pipeline["processor"]
                        model = pipeline["model"]
                        vocoder = pipeline["vocoder"]
                        
                        inputs = processor(text=prompt, return_tensors="pt")
                        
                        # Load default speaker embeddings if not provided
                        import torch
                        
                        try:
                            # Try to load speaker embeddings from the dataset
                            from datasets import load_dataset
                            embeddings_dataset = load_dataset("Matthijs/cmu-arctic-xvectors", split="validation")
                            speaker_embeddings = torch.tensor(embeddings_dataset[7306]["xvector"]).unsqueeze(0)
                        except Exception:
                            # Fallback: create random speaker embeddings with the correct shape (512 dimensions)
                            speaker_embeddings = torch.randn((1, 512))
                        
                        # Ensure all tensors are on the same device
                        device = model.device
                        inputs = {k: v.to(device) for k, v in inputs.items()}
                        speaker_embeddings = speaker_embeddings.to(device)
                          # Ensure vocoder is also on the same device
                        if hasattr(vocoder, 'to'):
                            vocoder = vocoder.to(device)
                        
                        speech = model.generate_speech(inputs["input_ids"], speaker_embeddings=speaker_embeddings, vocoder=vocoder)
                        return speech.cpu().numpy()
                    
                    elif pipeline["type"] == "musicgen":
                        # MusicGen generation
                        processor = pipeline["processor"]
                        model = pipeline["model"]
                        
                        inputs = processor(
                            text=[prompt],
                            padding=True,
                            return_tensors="pt",
                        )
                        
                        # Ensure all tensors are on the same device as the model
                        device = model.device
                        inputs = {k: v.to(device) for k, v in inputs.items() if hasattr(v, 'to')}
                        
                        audio_values = model.generate(**inputs, max_new_tokens=256)
                        return audio_values[0, 0].cpu().numpy()
                    else:
                        raise ValueError(f"Unknown audio model type: {pipeline['type']}")
                
                else:
                    # Generic transformers pipeline
                    # Filter out unsupported parameters for generic pipelines
                    supported_params = {}
                    for key, value in kwargs.items():
                        # Only include common audio generation parameters
                        if key in ['sample_rate', 'duration', 'max_new_tokens', 'num_inference_steps', 'guidance_scale']:
                            supported_params[key] = value
                    
                    result = pipeline(prompt, **supported_params)
                    if isinstance(result, dict) and "audio" in result:
                        return result["audio"]
                    elif hasattr(result, 'audio'):
                        return result.audio
                    else:
                        return result
            
            audio = await loop.run_in_executor(None, _generate)
            
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
