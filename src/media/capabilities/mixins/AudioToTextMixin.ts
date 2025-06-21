/**
 * AudioToTextMixin
 * 
 * Mixin to add AudioToTextProvider capabilities to a provider class.
 * This mixin enables providers to support audio-to-text transformation models,
 * including speech-to-text (STT) and general audio transcription capabilities.
 * 
 * The mixin implements the AudioToTextProvider interface and delegates to the base
 * provider's model management methods. It also provides service management capabilities
 * through the ServiceManagement interface for providers that manage external services
 * like Docker containers or remote APIs.
 * 
 * ## Features
 * - **Model Creation**: Create AudioToTextModel instances from model IDs
 * - **Model Discovery**: Filter and identify audio-to-text capable models
 * - **Service Management**: Start, stop, and monitor external services
 * - **Validation**: Ensure models implement the AudioToTextModel interface
 * - **Delegation Pattern**: Seamlessly integrates with existing provider classes
 * 
 * ## Supported Model Types
 * The mixin automatically identifies audio-to-text models by checking for these patterns:
 * - `stt` - Speech-to-text models
 * - `speech-to-text` - Explicit speech-to-text naming
 * - `audio-to-text` - General audio transcription models
 * - `whisper` - OpenAI Whisper and compatible models
 * - `transcribe` - General transcription services
 * - `asr` - Automatic Speech Recognition models
 * 
 * @example Basic Usage
 * ```typescript
 * class MyProvider extends withAudioToTextProvider(BaseProvider) {
 *   // Provider now has AudioToTextProvider capabilities
 * }
 * 
 * const provider = new MyProvider();
 * const model = await provider.createAudioToTextModel('whisper-base');
 * const audioInput = AssetLoader.load('speech.wav');
 * const transcription = await model.transform(audioInput);
 * console.log(transcription.content); // "Hello, this is a test"
 * ```
 * 
 * @example Service Management
 * ```typescript
 * const provider = new MyDockerProvider();
 * await provider.startService(); // Start Docker container
 * 
 * const status = await provider.getServiceStatus();
 * if (status.healthy) {
 *   const model = await provider.createAudioToTextModel('whisper-large');
 *   // Use model...
 * }
 * 
 * await provider.stopService(); // Stop Docker container
 * ```
 */

import { AudioToTextModel } from '../../models/abstracts/AudioToTextModel';
import { AudioToTextProvider } from '../interfaces/AudioToTextProvider';

/**
 * Constructor type for mixin functions
 */
export type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * Add AudioToTextProvider capabilities to a provider class.
 * 
 * This mixin adds audio-to-text transformation capabilities to any provider class,
 * enabling it to create and manage AudioToTextModel instances. The mixin delegates
 * model creation to the base provider's getModel method and filters available models
 * to only include audio-to-text capable models.
 * 
 * @param Base - The base provider class to extend
 * @returns Extended class with AudioToTextProvider capabilities
 */
export function withAudioToTextProvider<T extends Constructor>(Base: T) {
  return class extends Base implements AudioToTextProvider {
    /**
     * Create an AudioToTextModel instance for the specified model ID.
     * 
     * Delegates to the base provider's getModel method and validates that the
     * returned model is an instance of AudioToTextModel.
     * 
     * @param modelId - The ID of the audio-to-text model to create
     * @returns Promise resolving to an AudioToTextModel instance
     * @throws Error if the model is not supported or not an AudioToTextModel
     */
    async createAudioToTextModel(modelId: string): Promise<AudioToTextModel> {
      // Delegate to base provider's getModel method
      const model = await (this as any).getModel(modelId);

      if (!(model instanceof AudioToTextModel)) {
        throw new Error(`Model '${modelId}' is not an AudioToTextModel`);
      }

      return model;
    }

    /**
     * Get all supported audio-to-text model IDs.
     * 
     * Filters the base provider's supported models to only include those
     * that are capable of audio-to-text transformation. Uses common naming
     * patterns to identify audio-to-text models.
     * 
     * @returns Array of supported audio-to-text model IDs
     */
    getSupportedAudioToTextModels(): string[] {
      // Filter supported models to only audio-to-text models
      const allModels = (this as any).getSupportedModels();
      return allModels.filter((modelId: string) => 
        modelId.includes('stt') || 
        modelId.includes('speech-to-text') || 
        modelId.includes('audio-to-text') || 
        modelId.includes('whisper') ||
        modelId.includes('transcribe') ||
        modelId.includes('asr') // Automatic Speech Recognition
      );
    }
    
    /**
     * Check if a specific audio-to-text model is supported.
     * 
     * @param modelId - The model ID to check
     * @returns True if the model is supported for audio-to-text transformation
     */
    supportsAudioToTextModel(modelId: string): boolean {
      return this.getSupportedAudioToTextModels().includes(modelId);
    }

    /**
     * Start the service managed by this provider.
     * 
     * Delegates to the base provider's startService method if it exists,
     * enabling providers that manage external services (like Docker containers)
     * to start their services. For providers that don't need service management,
     * this is a no-op that returns true.
     * 
     * @returns Promise resolving to true if service started successfully
     */
    async startService(): Promise<boolean> {
      // Delegate to base provider's startService method if it exists
      if (typeof (this as any).startService === 'function') {
        return await (this as any).startService();
      }
      return true; // No-op for providers that don't need service management
    }

    /**
     * Stop the service managed by this provider.
     * 
     * Delegates to the base provider's stopService method if it exists,
     * enabling providers that manage external services (like Docker containers)
     * to stop their services gracefully. For providers that don't need service
     * management, this is a no-op that returns true.
     * 
     * @returns Promise resolving to true if service stopped successfully
     */
    async stopService(): Promise<boolean> {
      // Delegate to base provider's stopService method if it exists
      if (typeof (this as any).stopService === 'function') {
        return await (this as any).stopService();
      }
      return true; // No-op for providers that don't need service management
    }

    /**
     * Get the current status of the service managed by this provider.
     * 
     * Delegates to the base provider's getServiceStatus method if it exists,
     * enabling providers that manage external services (like Docker containers)
     * to report their health status. For providers that don't need service
     * management, returns a default healthy status.
     * 
     * @returns Promise resolving to service status information
     */
    async getServiceStatus(): Promise<{ running: boolean; healthy: boolean; error?: string }> {
      // Delegate to base provider's getServiceStatus method if it exists
      if (typeof (this as any).getServiceStatus === 'function') {
        return await (this as any).getServiceStatus();
      }
      return { running: true, healthy: true }; // Default for providers that don't manage services
    }
  };
}