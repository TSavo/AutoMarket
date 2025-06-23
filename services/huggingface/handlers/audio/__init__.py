"""Audio handlers package"""

from .speecht5_handler import SpeechT5Handler
from .musicgen_handler import MusicGenHandler
from .generic_audio_handler import GenericAudioHandler

__all__ = ['SpeechT5Handler', 'MusicGenHandler', 'GenericAudioHandler']
