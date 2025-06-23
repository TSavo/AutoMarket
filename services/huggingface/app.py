"""
HuggingFace Multimodal Service

FastAPI service that dynamically loads and runs HuggingFace models:
- Text-to-Image: diffusion models (Stable Diffusion, FLUX, etc.)
- Text-to-Audio: TTS and audio generation models (SpeechT5, MusicGen, etc.)

Supports any compatible model from the HuggingFace Hub.
"""

import asyncio
import logging
import logging.config
import os
import base64
import io
import numpy as np
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional, List

import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from PIL import Image

# Audio processing imports
try:
    import soundfile as sf
    AUDIO_IMPORTS_AVAILABLE = True
except ImportError:
    AUDIO_IMPORTS_AVAILABLE = False

import config
from model_manager import ModelManager

# Configure logging
logging.config.dictConfig(config.LOGGING_CONFIG)
logger = logging.getLogger(__name__)

# Log audio availability after logger is configured
if not AUDIO_IMPORTS_AVAILABLE:
    logger.warning("soundfile not available - audio generation will be limited")

# Global model manager
model_manager: Optional[ModelManager] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global model_manager
    
    # Startup
    logger.info("Starting HuggingFace Multimodal Service")
    logger.info("Supports: Text-to-Image and Text-to-Audio models")
    logger.info(f"Device: {config.DEVICE}")
    logger.info(f"Cache directory: {config.HF_CACHE_DIR}")
    
    # Create directories
    os.makedirs(config.TEMP_DIR, exist_ok=True)
    os.makedirs(config.LOG_DIR, exist_ok=True)
    
    # Initialize model manager
    model_manager = ModelManager()
    
    yield
    
    # Shutdown
    logger.info("Shutting down HuggingFace Multimodal Service")

# Create FastAPI app
app = FastAPI(
    title="HuggingFace Multimodal Service",
    description="Dynamic text-to-image and text-to-audio generation using HuggingFace models",
    version="2.0.0",
    lifespan=lifespan
)

# Request/Response Models
class ModelLoadRequest(BaseModel):
    modelId: str = Field(..., description="HuggingFace model ID or alias")
    force: bool = Field(False, description="Force reload if already loaded")
    precision: str = Field("fp16", description="Model precision (fp16 or fp32)")
    device: str = Field("auto", description="Device to load model on (cuda, cpu, auto)")

class ModelLoadResponse(BaseModel):
    success: bool
    modelId: str
    loadTime: int  # milliseconds
    memoryUsage: int  # MB
    error: Optional[str] = None

class GenerationRequest(BaseModel):
    modelId: str = Field(..., description="HuggingFace model ID or alias")
    prompt: str = Field(..., description="Text prompt for image generation")
    negativePrompt: Optional[str] = Field(None, description="Negative prompt")
    width: int = Field(512, description="Image width")
    height: int = Field(512, description="Image height")
    numInferenceSteps: int = Field(20, description="Number of inference steps")
    guidanceScale: float = Field(7.5, description="Guidance scale")
    seed: Optional[int] = Field(None, description="Random seed")
    scheduler: Optional[str] = Field(None, description="Scheduler name")

class GenerationResponse(BaseModel):
    success: bool
    imageBase64: Optional[str] = None
    metadata: Dict[str, Any]
    error: Optional[str] = None

# Audio Generation Models
class AudioGenerationRequest(BaseModel):
    modelId: str = Field(..., description="HuggingFace model ID or alias")
    prompt: str = Field(..., description="Text prompt for audio generation")
    voice: Optional[str] = Field("default", description="Voice identifier")
    speed: float = Field(1.0, description="Speech speed multiplier", ge=0.5, le=2.0)
    pitch: float = Field(0.0, description="Pitch adjustment", ge=-1.0, le=1.0)
    volume: float = Field(1.0, description="Volume level", ge=0.0, le=1.0)
    sampleRate: int = Field(22050, description="Audio sample rate")
    format: str = Field("wav", description="Output audio format")
    language: Optional[str] = Field("en", description="Language code")
    seed: Optional[int] = Field(None, description="Random seed")

class AudioGenerationResponse(BaseModel):
    success: bool
    audioBase64: Optional[str] = None
    metadata: Dict[str, Any]
    error: Optional[str] = None

class ModelInfo(BaseModel):
    modelId: str
    loaded: bool
    memoryUsage: Optional[int] = None
    loadTime: Optional[float] = None
    capabilities: List[str]
    parameters: Dict[str, Any]

class HealthResponse(BaseModel):
    status: str
    loadedModels: List[str]
    memoryUsage: Dict[str, Any]
    gpuInfo: Optional[Dict[str, Any]] = None

# API Endpoints
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        loaded_models = [info["modelId"] for info in model_manager.list_loaded_models()]
        memory_info = model_manager.get_memory_info()
        
        return HealthResponse(
            status="healthy",
            loadedModels=loaded_models,
            memoryUsage=memory_info,
            gpuInfo=memory_info.get("gpu")
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return HealthResponse(
            status="unhealthy",
            loadedModels=[],
            memoryUsage={},
            error=str(e)
        )

@app.post("/models/load", response_model=ModelLoadResponse)
async def load_model(request: ModelLoadRequest):
    """Load a model dynamically from HuggingFace Hub"""
    try:
        result = await model_manager.load_model(
            model_id=request.modelId,
            force=request.force,
            precision=request.precision,
            device=request.device if request.device != "auto" else config.DEVICE
        )
        
        return ModelLoadResponse(**result)
        
    except Exception as e:
        logger.error(f"Model loading failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/{model_id}", response_model=ModelInfo)
async def get_model_info(model_id: str):
    """Get information about a loaded model"""
    try:
        info = model_manager.get_model_info(model_id)
        if not info:
            raise HTTPException(status_code=404, detail=f"Model {model_id} not loaded")
        
        return ModelInfo(**info)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get model info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models", response_model=List[ModelInfo])
async def list_models():
    """List all loaded models"""
    try:
        models = model_manager.list_loaded_models()
        return [ModelInfo(**model) for model in models]
        
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/models/{model_id}")
async def unload_model(model_id: str):
    """Unload a specific model"""
    try:
        result = await model_manager.unload_model(model_id)
        return result

    except Exception as e:
        logger.error(f"Failed to unload model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate", response_model=GenerationResponse)
async def generate_image(request: GenerationRequest):
    """Generate an image from text"""
    try:
        # Ensure model is loaded
        model_info = model_manager.get_model_info(request.modelId)
        if not model_info:
            # Try to load the model automatically
            logger.info(f"Auto-loading model: {request.modelId}")
            load_result = await model_manager.load_model(request.modelId)
            if not load_result["success"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to load model {request.modelId}: {load_result.get('error')}"
                )

        # Generate image
        import torch
        generation_params = {
            "width": request.width,
            "height": request.height,
            "num_inference_steps": request.numInferenceSteps,
            "guidance_scale": request.guidanceScale,
            "generator": None if request.seed is None else torch.Generator().manual_seed(request.seed)
        }

        # Remove None values
        generation_params = {k: v for k, v in generation_params.items() if v is not None}

        result = await model_manager.generate_image(
            model_id=request.modelId,
            prompt=request.prompt,
            negative_prompt=request.negativePrompt,
            **generation_params
        )

        # Convert PIL Image to base64
        image = result["image"]
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        image_base64 = base64.b64encode(buffer.getvalue()).decode()

        return GenerationResponse(
            success=True,
            imageBase64=image_base64,
            metadata={
                "modelId": request.modelId,
                "generationTime": result["generation_time"],
                "parameters": result["parameters"],
                "seed": request.seed
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate/audio", response_model=AudioGenerationResponse)
async def generate_audio(request: AudioGenerationRequest):
    """Generate audio from text"""
    try:
        # Ensure model is loaded
        model_info = model_manager.get_model_info(request.modelId)
        if not model_info:
            # Try to load the model automatically
            logger.info(f"Auto-loading audio model: {request.modelId}")
            load_result = await model_manager.load_model(request.modelId)
            if not load_result["success"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to load model {request.modelId}: {load_result.get('error')}"
                )

        # Generate audio using model manager
        generation_params = {
            "voice": request.voice,
            "speed": request.speed,
            "pitch": request.pitch,
            "volume": request.volume,
            "sample_rate": request.sampleRate,
            "language": request.language,
            "seed": request.seed
        }

        # Remove None values
        generation_params = {k: v for k, v in generation_params.items() if v is not None}

        result = await model_manager.generate_audio(
            model_id=request.modelId,
            prompt=request.prompt,
            **generation_params
        )

        # Convert audio to base64
        audio_data = result["audio"]
        
        # Handle different audio formats
        if isinstance(audio_data, np.ndarray):
            # Convert numpy array to bytes
            if not AUDIO_IMPORTS_AVAILABLE:
                raise ImportError("soundfile library not available - cannot process audio")
            buffer = io.BytesIO()
            sf.write(buffer, audio_data, request.sampleRate, format=request.format.upper())
            audio_bytes = buffer.getvalue()
        elif isinstance(audio_data, bytes):
            audio_bytes = audio_data
        else:
            raise ValueError("Unsupported audio data format")

        audio_base64 = base64.b64encode(audio_bytes).decode()

        return AudioGenerationResponse(
            success=True,
            audioBase64=audio_base64,
            metadata={
                "modelId": request.modelId,
                "generationTime": result["generation_time"],
                "parameters": result["parameters"],
                "format": request.format,
                "sampleRate": request.sampleRate,
                "duration": result.get("duration", 0)
            }
        )

    except HTTPException:
        raise
    except ValueError as e:
        # Handle specialized handler errors (these contain detailed compatibility info)
        error_msg = str(e)
        logger.error(f"Audio generation validation error: {error_msg}")
        
        # Check if this is a specialized handler error with detailed information
        if any(keyword in error_msg.lower() for keyword in [
            'compatibility issues', 'model format incompatibility', 
            'parameter incompatibility', 'not compatible', 'espnet vits', 
            'facebook mms-tts', 'missing required model files'
        ]):
            # This is a detailed error from a specialized handler
            raise HTTPException(status_code=400, detail=error_msg)
        else:
            # Generic validation error
            raise HTTPException(status_code=400, detail=f"Audio generation validation failed: {error_msg}")
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Audio generation failed: {error_msg}")
        
        # Check if the error message contains detailed handler information
        if any(keyword in error_msg.lower() for keyword in [
            'compatibility issues', 'model format incompatibility',
            'parameter incompatibility', 'espnet vits', 'facebook mms-tts'
        ]):
            # Preserve detailed error messages from specialized handlers
            raise HTTPException(status_code=500, detail=error_msg)
        else:
            # Generic error
            raise HTTPException(status_code=500, detail=f"Audio generation failed: {error_msg}")

@app.post("/generate/image", response_model=GenerationResponse)
async def generate_image_explicit(request: GenerationRequest):
    """Generate an image from text (explicit endpoint for API consistency)"""
    # Route to the main image generation function
    return await generate_image(request)

if __name__ == "__main__":
    # Import torch here to avoid issues with multiprocessing
    import torch

    uvicorn.run(
        "app:app",
        host=config.SERVER_HOST,
        port=config.SERVER_PORT,
        log_level="info" if not config.DEBUG else "debug",
        reload=config.DEBUG
    )
