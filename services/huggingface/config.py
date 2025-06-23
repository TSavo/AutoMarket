"""
Configuration for HuggingFace Text-to-Image Service
"""

import os
import torch
from typing import Dict, Any, Optional

# Server Configuration
SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("SERVER_PORT", "8007"))
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

# Device Configuration
def get_device() -> str:
    """Determine the best available device"""
    if torch.cuda.is_available():
        return "cuda"
    elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
        return "mps"
    else:
        return "cpu"

DEVICE = os.getenv("DEVICE", get_device())

# Memory Configuration
MAX_MEMORY_GB = float(os.getenv("MAX_MEMORY_GB", "8.0"))
ENABLE_MEMORY_EFFICIENT_ATTENTION = os.getenv("ENABLE_MEMORY_EFFICIENT_ATTENTION", "true").lower() == "true"
ENABLE_CPU_OFFLOAD = os.getenv("ENABLE_CPU_OFFLOAD", "false").lower() == "true"

# Model Configuration
DEFAULT_PRECISION = os.getenv("DEFAULT_PRECISION", "fp16")  # fp16 or fp32
MAX_LOADED_MODELS = int(os.getenv("MAX_LOADED_MODELS", "3"))
MODEL_UNLOAD_TIMEOUT = int(os.getenv("MODEL_UNLOAD_TIMEOUT", "300"))  # seconds

# Cache Configuration
HF_CACHE_DIR = os.getenv("HF_HOME", "/app/hf_cache")
TEMP_DIR = os.getenv("TEMP_DIR", "/app/temp")
LOG_DIR = os.getenv("LOG_DIR", "/app/logs")

# Generation Defaults
DEFAULT_GENERATION_CONFIG = {
    "width": 512,
    "height": 512,
    "num_inference_steps": 20,
    "guidance_scale": 7.5,
    "scheduler": "DPMSolverMultistepScheduler"
}

# Supported Model Types
SUPPORTED_MODEL_TYPES = [
    "StableDiffusionPipeline",
    "StableDiffusionXLPipeline", 
    "FluxPipeline",
    "LatentConsistencyModelPipeline"
]

# Model Aliases for common models
MODEL_ALIASES = {
    "sd15": "runwayml/stable-diffusion-v1-5",
    "sd21": "stabilityai/stable-diffusion-2-1",
    "sdxl": "stabilityai/stable-diffusion-xl-base-1.0",
    "flux-dev": "black-forest-labs/FLUX.1-dev",
    "flux-schnell": "black-forest-labs/FLUX.1-schnell",
    "lcm": "SimianLuo/LCM_Dreamshaper_v7"
}

def resolve_model_id(model_id: str) -> str:
    """Resolve model aliases to full HuggingFace model IDs"""
    return MODEL_ALIASES.get(model_id, model_id)

def get_model_config(model_id: str) -> Dict[str, Any]:
    """Get model-specific configuration"""
    resolved_id = resolve_model_id(model_id)
    
    # Default config
    config = {
        "torch_dtype": torch.float16 if DEFAULT_PRECISION == "fp16" else torch.float32,
        "use_safetensors": True,
        "variant": "fp16" if DEFAULT_PRECISION == "fp16" else None
    }
    
    # Model-specific overrides
    if "flux" in resolved_id.lower():
        config.update({
            "torch_dtype": torch.bfloat16,  # FLUX works better with bfloat16
            "variant": None  # FLUX doesn't have fp16 variants
        })
    elif "xl" in resolved_id.lower():
        config.update({
            "use_refiner": False  # Disable refiner by default for speed
        })
    elif "lcm" in resolved_id.lower():
        config.update({
            "num_inference_steps": 4,  # LCM models work with fewer steps
            "guidance_scale": 1.0
        })
    
    return config

# Logging Configuration
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        },
    },
    "handlers": {
        "default": {
            "formatter": "default",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout",
        },
        "file": {
            "formatter": "default",
            "class": "logging.FileHandler",
            "filename": f"{LOG_DIR}/huggingface_service.log",
        },
    },
    "root": {
        "level": "INFO",
        "handlers": ["default", "file"],
    },
}
