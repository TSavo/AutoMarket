"""Audio handlers package"""

from .speecht5_handler import SpeechT5Handler
from .musicgen_handler import MusicGenHandler
from .facebook_mms_handler import FacebookMMSTTSHandler
from .espnet_vits_handler import ESPnetVITSHandler
from .resemble_ai_handler import ResembleAIHandler
from .kokoro_handler import KokoroHandler
from .generic_audio_handler import GenericAudioHandler

__all__ = [
    'SpeechT5Handler', 
    'MusicGenHandler', 
    'FacebookMMSTTSHandler',
    'ESPnetVITSHandler',
    'ResembleAIHandler',
    'KokoroHandler',
    'GenericAudioHandler'
]
