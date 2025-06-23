"""
Handler Package Initialization

Imports all handler classes for easy access.
"""

from .base_handler import ModelHandler
from .registry import ModelHandlerRegistry

# Audio handlers
from .audio.speecht5_handler import SpeechT5Handler
from .audio.musicgen_handler import MusicGenHandler
from .audio.facebook_mms_handler import FacebookMMSTTSHandler
from .audio.espnet_vits_handler import ESPnetVITSHandler
from .audio.resemble_ai_handler import ResembleAIHandler
from .audio.kokoro_handler import KokoroHandler
from .audio.generic_audio_handler import GenericAudioHandler

# Image handlers
from .image.stable_diffusion_handler import StableDiffusionHandler
from .image.stable_diffusion_xl_handler import StableDiffusionXLHandler
from .image.generic_diffusion_handler import GenericDiffusionHandler

__all__ = [
    'ModelHandler',
    'ModelHandlerRegistry',
    'SpeechT5Handler',
    'MusicGenHandler',
    'FacebookMMSTTSHandler',
    'ESPnetVITSHandler',
    'ResembleAIHandler',
    'KokoroHandler',
    'GenericAudioHandler',
    'StableDiffusionHandler',
    'StableDiffusionXLHandler',
    'GenericDiffusionHandler'
]
