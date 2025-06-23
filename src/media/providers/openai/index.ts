/**
 * OpenAI Provider - Complete Integration Package
 * 
 * All OpenAI-related components in one place:
 * - Provider (service management & model factory)
 * - Models (transformation implementations)
 * - Client (API communication)
 */

// Main provider
export { OpenAIProvider } from './OpenAIProvider';

// Models
export { OpenAITextToTextModel } from './OpenAITextToTextModel';
export type { OpenAITextToTextOptions, OpenAITextToTextConfig } from './OpenAITextToTextModel';

export { OpenAITextToImageModel } from './OpenAITextToImageModel';
export type { OpenAITextToImageOptions, OpenAITextToImageConfig } from './OpenAITextToImageModel';

export { OpenAITextToAudioModel } from './OpenAITextToAudioModel';
export type { OpenAITextToAudioOptions, OpenAITextToAudioConfig } from './OpenAITextToAudioModel';

export { OpenAIAudioToTextModel } from './OpenAIAudioToTextModel';
export type { OpenAIAudioToTextOptions, OpenAIAudioToTextConfig } from './OpenAIAudioToTextModel';

// API client
export { OpenAIAPIClient } from './OpenAIAPIClient';
export type {
  OpenAIConfig,
  OpenAITranscriptionRequest,
  OpenAITranslationRequest,
  OpenAITranscriptionResponse
} from './OpenAIAPIClient';
