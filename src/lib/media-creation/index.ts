/**
 * AutoMarket Media Creation API
 * 
 * Main entry point for all media creation services including:
 * - Image generation via Replicate
 * - Image animation via FAL.ai
 * - Text-to-speech via Chatterbox TTS
 * - Speech-to-text via Whisper
 * - Avatar generation via Creatify
 */

// Export core functions
export { generateImage } from './generate-image';
export { animateImage, getAnimationPath, getAnimationWebPath } from './animate-image';
export { generateTTS, checkTTSAvailability } from './generate-tts';
export { processAudio } from './audio-processor';
export { processMainImage } from './image-processor';

// Export Whisper STT functionality
export { WhisperSTTService, whisperSTTService } from './WhisperSTTService';

// Export types
export type {
  BlogImageData,
  BlogPostData,
  ProcessingOptions
} from './types';

export type {
  TTSOptions,
  TTSResult,
  TTSProgress
} from './generate-tts';

export type {
  ImageGenerationOptions
} from './generate-image';

export type {
  AnimationOptions
} from './animate-image';

// Export STT types
export type {
  STTService,
  STTResult,
  WordTimestamp,
  STTServiceOptions
} from './STTService';

// Export configuration
export {
  AUTOMARKET_PATH,
  BLOG_POSTS_PATH,
  IMAGES_PATH,
  VIDEOS_PATH,
  AUDIO_PATH,
  initializeDirectories
} from './config';

// Export utilities
export { sanitizeBlogPostFile, sanitizeForTTS } from './text-sanitizer';
export { findBlogPostBySlug, updateMdxFile } from './utils';
