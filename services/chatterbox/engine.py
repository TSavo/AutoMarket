# File: engine.py
# Core TTS model loading and speech generation logic.

import logging
import random
import numpy as np
import torch
from typing import Optional, Tuple
from pathlib import Path

from chatterbox.tts import ChatterboxTTS  # Main TTS engine class
from chatterbox.models.s3gen.const import (
    S3GEN_SR,
)  # Default sample rate from the engine

# Import the singleton config_manager
from config import config_manager

logger = logging.getLogger(__name__)

# --- Global Module Variables ---
chatterbox_model: Optional[ChatterboxTTS] = None
MODEL_LOADED: bool = False
model_device: Optional[str] = (
    None  # Stores the resolved device string ('cuda' or 'cpu')
)

# Channel-last memory format optimization
_channel_last_applied: bool = False


def set_seed(seed_value: int):
    """
    Sets the seed for torch, random, and numpy for reproducibility.
    This is called if a non-zero seed is provided for generation.
    """
    torch.manual_seed(seed_value)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed_value)
        torch.cuda.manual_seed_all(seed_value)  # if using multi-GPU
    random.seed(seed_value)
    np.random.seed(seed_value)
    logger.info(f"Global seed set to: {seed_value}")


def _test_cuda_functionality() -> bool:
    """
    Tests if CUDA is actually functional, not just available.

    Returns:
        bool: True if CUDA works, False otherwise.
    """
    if not torch.cuda.is_available():
        return False

    try:
        test_tensor = torch.tensor([1.0])
        test_tensor = test_tensor.cuda()
        test_tensor = test_tensor.cpu()
        return True
    except Exception as e:
        logger.warning(f"CUDA functionality test failed: {e}")
        return False


def _apply_channel_last_optimization() -> bool:
    """
    Apply channel-last memory format optimization to the model.
    This optimizes tensor memory layout for better GPU performance.

    Returns:
        bool: True if optimization applied successfully, False otherwise.
    """
    global _channel_last_applied

    try:
        from config import get_channel_last_enabled

        if not get_channel_last_enabled():
            logger.info("Channel-last memory format disabled in configuration")
            return False

        if model_device != 'cuda':
            logger.info("Channel-last optimization disabled - not using CUDA device")
            return False

        if not hasattr(chatterbox_model, 's3gen'):
            logger.warning("Channel-last: s3gen model not found")
            return False

        logger.info("Applying channel-last memory format optimization...")

        # Apply channel-last to the vocoder (main GPU-intensive component)
        if hasattr(chatterbox_model.s3gen, 'mel2wav'):
            try:
                chatterbox_model.s3gen.mel2wav = chatterbox_model.s3gen.mel2wav.to(
                    memory_format=torch.channels_last
                )
                logger.info("✅ Vocoder (mel2wav) converted to channel-last format")
            except Exception as e:
                logger.warning(f"Failed to apply channel-last to vocoder: {e}")

        # Apply channel-last to the flow model
        if hasattr(chatterbox_model.s3gen, 'flow'):
            try:
                chatterbox_model.s3gen.flow = chatterbox_model.s3gen.flow.to(
                    memory_format=torch.channels_last
                )
                logger.info("✅ Flow model converted to channel-last format")
            except Exception as e:
                logger.warning(f"Failed to apply channel-last to flow model: {e}")

        # Apply channel-last to the T3 model
        if hasattr(chatterbox_model, 't3'):
            try:
                chatterbox_model.t3 = chatterbox_model.t3.to(
                    memory_format=torch.channels_last
                )
                logger.info("✅ T3 model converted to channel-last format")
            except Exception as e:
                logger.warning(f"Failed to apply channel-last to T3 model: {e}")

        _channel_last_applied = True
        logger.info("🚀 Channel-last memory format applied - expect 5-20% additional performance improvement")

        return True

    except Exception as e:
        logger.warning(f"Channel-last optimization failed (model will still work): {e}")
        _channel_last_applied = False
        return False


def load_model() -> bool:
    """
    Loads the TTS model.
    This version directly attempts to load from the Hugging Face repository (or its cache)
    using `from_pretrained`, bypassing the local `paths.model_cache` directory.
    Updates global variables `chatterbox_model`, `MODEL_LOADED`, and `model_device`.

    Returns:
        bool: True if the model was loaded successfully, False otherwise.
    """
    global chatterbox_model, MODEL_LOADED, model_device

    if MODEL_LOADED:
        logger.info("TTS model is already loaded.")
        return True

    try:
        # Determine processing device with robust CUDA detection and intelligent fallback
        device_setting = config_manager.get_string("tts_engine.device", "auto")

        if device_setting == "auto":
            if _test_cuda_functionality():
                resolved_device_str = "cuda"
                logger.info("CUDA functionality test passed. Using CUDA.")
            else:
                resolved_device_str = "cpu"
                logger.info("CUDA not functional or not available. Using CPU.")

        elif device_setting == "cuda":
            if _test_cuda_functionality():
                resolved_device_str = "cuda"
                logger.info("CUDA requested and functional. Using CUDA.")
            else:
                resolved_device_str = "cpu"
                logger.warning(
                    "CUDA was requested in config but functionality test failed. "
                    "PyTorch may not be compiled with CUDA support. "
                    "Automatically falling back to CPU."
                )

        elif device_setting == "cpu":
            resolved_device_str = "cpu"
            logger.info("CPU device explicitly requested in config. Using CPU.")

        else:
            logger.warning(
                f"Invalid device setting '{device_setting}' in config. "
                f"Defaulting to auto-detection."
            )
            resolved_device_str = "cuda" if _test_cuda_functionality() else "cpu"
            logger.info(f"Auto-detection resolved to: {resolved_device_str}")

        model_device = resolved_device_str
        logger.info(f"Final device selection: {model_device}")

        # Get configured model_repo_id for logging and context,
        # though from_pretrained might use its own internal default if not overridden.
        model_repo_id_config = config_manager.get_string(
            "model.repo_id", "ResembleAI/chatterbox"
        )

        logger.info(
            f"Attempting to load model directly using from_pretrained (expected from Hugging Face repository: {model_repo_id_config} or library default)."
        )
        try:
            # Directly use from_pretrained. This will utilize the standard Hugging Face cache.
            # The ChatterboxTTS.from_pretrained method handles downloading if the model is not in the cache.
            chatterbox_model = ChatterboxTTS.from_pretrained(device=model_device)
            # The actual repo ID used by from_pretrained is often internal to the library,
            # but logging the configured one provides user context.
            logger.info(
                f"Successfully loaded TTS model using from_pretrained on {model_device} (expected from '{model_repo_id_config}' or library default)."
            )

            # Apply performance optimizations (all quality-safe)
            from config import (
                get_torch_compile_enabled,
                get_cuda_optimizations_enabled,
                get_cuda_memory_fraction,
                get_inference_mode_enabled,
                get_channel_last_enabled
            )

            torch_compile_enabled = get_torch_compile_enabled()
            cuda_optimizations_enabled = get_cuda_optimizations_enabled()
            cuda_memory_fraction = get_cuda_memory_fraction()
            inference_mode_enabled = get_inference_mode_enabled()

            # Apply CUDA optimizations first (if enabled and on CUDA)
            if cuda_optimizations_enabled and model_device == 'cuda':
                try:
                    logger.info("Applying CUDA memory optimizations...")

                    # Set CUDA memory allocation strategy
                    import os
                    os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'max_split_size_mb:512,expandable_segments:True'

                    # Set memory fraction (validate range)
                    if 0.1 <= cuda_memory_fraction <= 1.0:
                        torch.cuda.set_per_process_memory_fraction(cuda_memory_fraction)
                        logger.info(f"✅ CUDA memory fraction set to {cuda_memory_fraction}")
                    else:
                        logger.warning(f"Invalid CUDA memory fraction {cuda_memory_fraction}, using default")

                    # Clear cache and optimize memory
                    torch.cuda.empty_cache()
                    logger.info("✅ CUDA memory cache cleared and optimized")

                except Exception as e_cuda:
                    logger.warning(f"CUDA optimization failed (model will still work): {e_cuda}")
                    logger.info("Continuing without CUDA optimizations")
            elif cuda_optimizations_enabled and model_device != 'cuda':
                logger.info("CUDA optimizations disabled - not using CUDA device")
            elif not cuda_optimizations_enabled:
                logger.info("CUDA optimizations disabled in configuration")

            if torch_compile_enabled and hasattr(torch, 'compile') and model_device != 'cpu':
                try:
                    logger.info("Applying torch.compile optimization for better performance...")

                    # Compile the vocoder (main bottleneck) for faster inference
                    if hasattr(chatterbox_model, 's3gen') and hasattr(chatterbox_model.s3gen, 'mel2wav'):
                        chatterbox_model.s3gen.mel2wav = torch.compile(
                            chatterbox_model.s3gen.mel2wav,
                            mode="reduce-overhead",  # Optimize for repeated calls
                            fullgraph=False  # Allow fallback for unsupported ops
                        )
                        logger.info("✅ Vocoder (mel2wav) compiled successfully")

                    # Optionally compile the flow model (token→mel) as well
                    if hasattr(chatterbox_model, 's3gen') and hasattr(chatterbox_model.s3gen, 'flow'):
                        chatterbox_model.s3gen.flow = torch.compile(
                            chatterbox_model.s3gen.flow,
                            mode="reduce-overhead",
                            fullgraph=False
                        )
                        logger.info("✅ Flow model (token→mel) compiled successfully")

                    # Compile the main T3 model (text→tokens)
                    if hasattr(chatterbox_model, 't3'):
                        chatterbox_model.t3 = torch.compile(
                            chatterbox_model.t3,
                            mode="reduce-overhead",
                            fullgraph=False
                        )
                        logger.info("✅ T3 model (text→tokens) compiled successfully")

                    logger.info("🚀 Torch.compile optimization applied - expect 20-30% performance improvement")

                except Exception as e_compile:
                    logger.warning(f"Torch.compile optimization failed (model will still work): {e_compile}")
                    logger.info("Continuing with uncompiled model - performance will be standard")
            else:
                if not torch_compile_enabled:
                    logger.info("Torch.compile disabled in configuration - using standard model")
                elif not hasattr(torch, 'compile'):
                    logger.info("Torch.compile not available (PyTorch < 2.0) - using standard model")
                elif model_device == 'cpu':
                    logger.info("Torch.compile disabled for CPU - using standard model")

            # Apply channel-last memory format optimization (works with torch.compile)
            _apply_channel_last_optimization()
        except Exception as e_hf:
            logger.error(
                f"Failed to load model using from_pretrained (expected from '{model_repo_id_config}' or library default): {e_hf}",
                exc_info=True,
            )
            chatterbox_model = None
            MODEL_LOADED = False
            return False

        MODEL_LOADED = True
        if chatterbox_model:
            logger.info(
                f"TTS Model loaded successfully on {model_device}. Engine sample rate: {chatterbox_model.sr} Hz."
            )
        else:
            logger.error(
                "Model loading sequence completed, but chatterbox_model is None. This indicates an unexpected issue."
            )
            MODEL_LOADED = False
            return False

        return True

    except Exception as e:
        logger.error(
            f"An unexpected error occurred during model loading: {e}", exc_info=True
        )
        chatterbox_model = None
        MODEL_LOADED = False
        return False


def synthesize(
    text: str,
    audio_prompt_path: Optional[str] = None,
    temperature: float = 0.8,
    exaggeration: float = 0.5,
    cfg_weight: float = 0.5,
    seed: int = 0,
) -> Tuple[Optional[torch.Tensor], Optional[int]]:
    """
    Synthesizes audio from text using the loaded TTS model.

    Args:
        text: The text to synthesize.
        audio_prompt_path: Path to an audio file for voice cloning or predefined voice.
        temperature: Controls randomness in generation.
        exaggeration: Controls expressiveness.
        cfg_weight: Classifier-Free Guidance weight.
        seed: Random seed for generation. If 0, default randomness is used.
              If non-zero, a global seed is set for reproducibility.

    Returns:
        A tuple containing the audio waveform (torch.Tensor) and the sample rate (int),
        or (None, None) if synthesis fails.
    """
    global chatterbox_model

    if not MODEL_LOADED or chatterbox_model is None:
        logger.error("TTS model is not loaded. Cannot synthesize audio.")
        return None, None

    try:
        # Set seed globally if a specific seed value is provided and is non-zero.
        if seed != 0:
            logger.info(f"Applying user-provided seed for generation: {seed}")
            set_seed(seed)
        else:
            logger.info(
                "Using default (potentially random) generation behavior as seed is 0."
            )

        logger.debug(
            f"Synthesizing with params: audio_prompt='{audio_prompt_path}', temp={temperature}, "
            f"exag={exaggeration}, cfg_weight={cfg_weight}, seed_applied_globally_if_nonzero={seed}"
        )

        # Performance monitoring for optimizations effectiveness
        import time
        start_time = time.time()

        # Check if inference mode optimization is enabled
        from config import get_inference_mode_enabled, get_cuda_optimizations_enabled
        use_inference_mode = get_inference_mode_enabled()

        # Call the core model's generate method with optimal inference context
        if use_inference_mode:
            # Use torch.inference_mode() for better performance (quality-safe)
            with torch.inference_mode():
                wav_tensor = chatterbox_model.generate(
                    text=text,
                    audio_prompt_path=audio_prompt_path,
                    temperature=temperature,
                    exaggeration=exaggeration,
                    cfg_weight=cfg_weight,
                )
        else:
            # Standard generation (fallback)
            wav_tensor = chatterbox_model.generate(
                text=text,
                audio_prompt_path=audio_prompt_path,
                temperature=temperature,
                exaggeration=exaggeration,
                cfg_weight=cfg_weight,
            )

        # Log performance metrics with optimization status
        generation_time = time.time() - start_time
        if wav_tensor is not None:
            audio_duration = len(wav_tensor[0]) / chatterbox_model.sr
            rtf = generation_time / audio_duration  # Real-time factor

            # Build optimization status string
            optimizations = []
            if hasattr(chatterbox_model.s3gen, 'mel2wav') and hasattr(chatterbox_model.s3gen.mel2wav, '_torchdynamo_orig_callable'):
                optimizations.append("torch.compile")
            if use_inference_mode:
                optimizations.append("inference_mode")
            if model_device == 'cuda' and get_cuda_optimizations_enabled():
                optimizations.append("cuda_opt")
            if _channel_last_applied:
                optimizations.append("channel_last")

            opt_str = f" [{'+'.join(optimizations)}]" if optimizations else ""

            logger.info(
                f"Generation completed{opt_str}: {generation_time:.2f}s for {audio_duration:.2f}s audio "
                f"(RTF: {rtf:.2f}x, {'faster' if rtf < 1.0 else 'slower'} than real-time)"
            )
        else:
            logger.warning(f"Generation failed after {generation_time:.2f}s")

        # The ChatterboxTTS.generate method already returns a CPU tensor.
        return wav_tensor, chatterbox_model.sr

    except Exception as e:
        logger.error(f"Error during TTS synthesis: {e}", exc_info=True)
        return None, None


# --- End File: engine.py ---
