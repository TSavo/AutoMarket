# File: async_tts.py
# Async TTS generation with progress tracking

import asyncio
import logging
import time
import uuid
from pathlib import Path
from typing import Optional, List

import numpy as np
import torch

# Internal imports
import engine
import utils
from config import (
    get_output_path,
    get_predefined_voices_path,
    get_reference_audio_path,
    get_gen_default_temperature,
    get_gen_default_exaggeration,
    get_gen_default_cfg_weight,
    get_gen_default_seed,
    get_audio_sample_rate,
    get_audio_output_format,
)
from models import CustomTTSRequest
from task_manager import get_task_manager, ProgressCallback

logger = logging.getLogger(__name__)


async def generate_tts_async(task_id: str, request: CustomTTSRequest) -> Optional[str]:
    """
    Generate TTS audio asynchronously with progress tracking.
    
    Args:
        task_id: Unique task identifier
        request: TTS generation request
        
    Returns:
        Path to the generated audio file, or None if failed
    """
    task_manager = get_task_manager()
    progress_callback = lambda progress, stage, status=None: task_manager.update_task_progress(
        task_id, progress, stage, status
    )
    
    try:
        # Update status to processing
        progress_callback(0.0, "Starting TTS generation", "processing")
        
        # Validate model is loaded
        if not engine.MODEL_LOADED:
            raise Exception("TTS engine model is not currently loaded or available")
        
        progress_callback(2.0, "Model validation complete")
        
        # Validate voice configuration
        audio_prompt_path_for_engine = await _validate_voice_config(request)
        progress_callback(5.0, "Voice configuration validated")
        
        # Process text and create chunks
        text_chunks = await _process_text_chunks(request)
        if not text_chunks:
            raise Exception("Text processing resulted in no usable chunks")

        # Log text statistics for debugging
        total_chars = len(request.text)
        avg_chunk_size = total_chars / len(text_chunks) if text_chunks else 0
        logger.info(f"Text stats: {total_chars} chars, {len(text_chunks)} chunks, avg {avg_chunk_size:.1f} chars/chunk")

        # Warn if we have too many chunks (potential memory issue)
        if len(text_chunks) > 50:
            logger.warning(f"Large number of chunks ({len(text_chunks)}) may cause memory issues. Consider increasing chunk_size.")

        task_manager.set_task_chunks(task_id, len(text_chunks))
        progress_callback(10.0, f"Text split into {len(text_chunks)} chunks")
        
        # Generate audio for each chunk
        all_audio_segments_np = []
        engine_output_sample_rate = None
        
        chunk_progress_start = 15.0
        chunk_progress_range = 65.0  # 15% to 80%
        
        for i, chunk in enumerate(text_chunks):
            chunk_progress = chunk_progress_start + (i / len(text_chunks)) * chunk_progress_range

            # Log chunk length for debugging CUDA OOM issues
            chunk_len = len(chunk)
            if chunk_len > 500:
                logger.warning(f"Chunk {i+1} is very long ({chunk_len} chars) - may cause CUDA OOM")

            progress_callback(chunk_progress, f"Synthesizing chunk {i+1}/{len(text_chunks)} ({chunk_len} chars)")

            # Generate audio for this chunk
            chunk_audio_tensor, chunk_sr_from_engine = await _synthesize_chunk(
                chunk, audio_prompt_path_for_engine, request
            )
            
            if chunk_audio_tensor is None or chunk_sr_from_engine is None:
                raise Exception(f"TTS engine failed to synthesize audio for chunk {i+1}")
            
            # Track sample rate consistency
            if engine_output_sample_rate is None:
                engine_output_sample_rate = chunk_sr_from_engine
            elif engine_output_sample_rate != chunk_sr_from_engine:
                logger.warning(
                    f"Inconsistent sample rate from engine: chunk {i+1} ({chunk_sr_from_engine}Hz) "
                    f"differs from previous ({engine_output_sample_rate}Hz). Using first chunk's SR."
                )
            
            # Convert to numpy and apply post-processing
            chunk_audio_np = chunk_audio_tensor.cpu().numpy()
            
            # Apply speed factor if specified
            if request.speed_factor and request.speed_factor != 1.0:
                chunk_audio_tensor_for_speed, _ = utils.apply_speed_factor(
                    chunk_audio_tensor, chunk_sr_from_engine, request.speed_factor
                )
                chunk_audio_np = chunk_audio_tensor_for_speed.cpu().numpy()
            
            all_audio_segments_np.append(chunk_audio_np)
            task_manager.increment_completed_chunks(task_id)
            
            # Allow other tasks to run
            await asyncio.sleep(0.01)
        
        progress_callback(80.0, "All chunks synthesized, concatenating audio")
        
        # Concatenate all audio segments
        try:
            final_audio_np = np.concatenate(all_audio_segments_np, axis=0)
        except ValueError as e:
            logger.error(f"Audio concatenation failed: {e}", exc_info=True)
            for idx, seg in enumerate(all_audio_segments_np):
                logger.error(f"Segment {idx} shape: {seg.shape}, dtype: {seg.dtype}")
            raise Exception(f"Audio concatenation error: {e}")
        
        progress_callback(85.0, "Audio concatenation complete")
        
        # Apply final post-processing
        final_output_sample_rate = get_audio_sample_rate()
        progress_callback(90.0, "Applying final post-processing")
        
        # Encode audio to final format
        output_format_str = request.output_format if request.output_format else get_audio_output_format()
        encoded_audio_bytes = utils.encode_audio(
            audio_array=final_audio_np,
            sample_rate=engine_output_sample_rate,
            output_format=output_format_str,
            target_sample_rate=final_output_sample_rate,
        )
        
        if encoded_audio_bytes is None or len(encoded_audio_bytes) < 100:
            raise Exception(f"Failed to encode audio to {output_format_str} or generated invalid audio")
        
        progress_callback(95.0, f"Audio encoded to {output_format_str}")
        
        # Save to file
        output_path = await _save_result_file(task_id, encoded_audio_bytes, output_format_str)
        progress_callback(100.0, "TTS generation completed successfully")
        
        return output_path
        
    except Exception as e:
        logger.error(f"Async TTS generation failed for task {task_id}: {e}", exc_info=True)
        task_manager.set_task_failed(task_id, str(e))
        return None


async def _validate_voice_config(request: CustomTTSRequest) -> Optional[Path]:
    """Validate voice configuration and return audio prompt path."""
    predefined_voices_path = get_predefined_voices_path(ensure_absolute=True)
    reference_audio_path = get_reference_audio_path(ensure_absolute=True)
    
    if request.voice_mode == "predefined":
        if not request.predefined_voice_id:
            raise Exception("Predefined voice ID is required for predefined voice mode")
        
        voice_path = predefined_voices_path / request.predefined_voice_id
        if not voice_path.is_file():
            raise Exception(f"Predefined voice file not found: {request.predefined_voice_id}")
        
        return voice_path
        
    elif request.voice_mode == "clone":
        if not request.reference_audio_filename:
            raise Exception("Reference audio filename is required for clone voice mode")
        
        voice_path = reference_audio_path / request.reference_audio_filename
        if not voice_path.is_file():
            raise Exception(f"Reference audio file not found: {request.reference_audio_filename}")
        
        return voice_path
    
    else:
        raise Exception(f"Invalid voice mode: {request.voice_mode}")


async def _process_text_chunks(request: CustomTTSRequest) -> List[str]:
    """Process text and create chunks if needed."""
    if request.split_text and len(request.text) > (
        request.chunk_size * 1.5 if request.chunk_size else 120 * 1.5
    ):
        chunk_size_to_use = request.chunk_size if request.chunk_size is not None else 120
        logger.info(f"Splitting text into chunks of size ~{chunk_size_to_use}")
        text_chunks = utils.chunk_text_by_sentences(request.text, chunk_size_to_use)
    else:
        text_chunks = [request.text]
        logger.info("Processing text as a single chunk (splitting not enabled or text too short)")
    
    return text_chunks


async def _synthesize_chunk(
    chunk: str, 
    audio_prompt_path: Optional[Path], 
    request: CustomTTSRequest
) -> tuple[Optional[torch.Tensor], Optional[int]]:
    """Synthesize a single text chunk."""
    # Run synthesis in thread pool to avoid blocking
    loop = asyncio.get_event_loop()
    
    def sync_synthesize():
        return engine.synthesize(
            text=chunk,
            audio_prompt_path=str(audio_prompt_path) if audio_prompt_path else None,
            temperature=(
                request.temperature
                if request.temperature is not None
                else get_gen_default_temperature()
            ),
            exaggeration=(
                request.exaggeration
                if request.exaggeration is not None
                else get_gen_default_exaggeration()
            ),
            cfg_weight=(
                request.cfg_weight
                if request.cfg_weight is not None
                else get_gen_default_cfg_weight()
            ),
            seed=(
                request.seed if request.seed is not None else get_gen_default_seed()
            ),
        )
    
    return await loop.run_in_executor(None, sync_synthesize)


async def _save_result_file(task_id: str, audio_bytes: bytes, format_str: str) -> str:
    """Save the generated audio to a file and return the path."""
    output_path = get_output_path(ensure_absolute=True)
    output_path.mkdir(parents=True, exist_ok=True)
    
    timestamp_str = time.strftime("%Y%m%d_%H%M%S")
    filename = utils.sanitize_filename(f"async_tts_{task_id[:8]}_{timestamp_str}.{format_str}")
    file_path = output_path / filename
    
    # Write file asynchronously
    loop = asyncio.get_event_loop()
    
    def write_file():
        with open(file_path, "wb") as f:
            f.write(audio_bytes)
    
    await loop.run_in_executor(None, write_file)
    
    logger.info(f"Saved async TTS result: {file_path}")
    return str(file_path)
