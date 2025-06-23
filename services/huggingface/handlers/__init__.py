"""
Handler Package Initialization

Imports all handler classes for easy access.
"""

from .base_handler import ModelHandler
from .registry import ModelHandlerRegistry

# Audio handlers
from .audio.speecht5_handler import SpeechT5Handler
from .audio.musicgen_handler import MusicGenHandler
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
    'GenericAudioHandler',
    'StableDiffusionHandler',
    'StableDiffusionXLHandler',
    'GenericDiffusionHandler'
]
