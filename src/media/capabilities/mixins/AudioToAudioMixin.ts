/**
 * AudioToAudioMixin
 * 
 * Mixin to add AudioToAudioProvider capabilities to a provider class.
 * This mixin enables providers to support audio-to-audio transformation models,
 * including format conversion, audio processing, and enhancement capabilities.
 * 
 * The mixin implements the AudioToAudioProvider interface and delegates to the base
 * provider's model management methods. It also provides service management capabilities
 * through the ServiceManagement interface for providers that manage external services
 * like Docker containers or remote APIs.
 * 
 * ## Features
 * - **Model Creation**: Create AudioToAudioModel instances from model IDs
 * - **Model Discovery**: Filter and identify audio-to-audio capable models
 * - **Service Management**: Start, stop, and monitor external services
 * - **Validation**: Ensure models implement the AudioToAudioModel interface
 * - **Delegation Pattern**: Seamlessly integrates with existing provider classes
 * 
 * ## Supported Model Types
 * The mixin automatically identifies audio-to-audio models by checking for these patterns:
 * - `audio-to-audio` - General audio processing models
 * - `audio-convert` - Audio format conversion models  
 * - `ffmpeg` - FFMPEG-based audio processing
 * - `audio-enhance` - Audio enhancement and filtering
 * - `audio-process` - General audio processing services
 * 
 * @example Basic Usage
 * ```typescript
 * class MyProvider extends withAudioToAudioProvider(BaseProvider) {
 *   // Provider now has AudioToAudioProvider capabilities
 * }
 * 
 * const provider = new MyProvider();
 * const model = await provider.createAudioToAudioModel('ffmpeg-audio-converter');
 * const audioInput = SmartAssetFactory.load('song.mp3');
 * const convertedAudio = await model.transform(audioInput, {
 *   outputFormat: 'wav',
 *   sampleRate: 44100,
 *   quality: 'high'
 * });
 * ```
 * 
 * @example Service Management
 * ```typescript
 * const provider = new MyDockerProvider();
 * await provider.startService(); // Start Docker container
 * 
 * const status = await provider.getServiceStatus();
 * if (status.healthy) {
 *   const model = await provider.createAudioToAudioModel('ffmpeg-converter');
 *   // Use model...
 * }
 * 
 * await provider.stopService(); // Stop Docker container
 * ```
 */

import { AudioToAudioModel } from '../../models/abstracts/AudioToAudioModel';
import { AudioToAudioProvider } from '../interfaces/AudioToAudioProvider';

/**
 * Constructor type for mixin functions
 */
export type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * Add AudioToAudioProvider capabilities to a provider class.
 * 
 * This mixin adds audio-to-audio transformation capabilities to any provider class,
 * enabling it to create and manage AudioToAudioModel instances. The mixin delegates
 * model creation to the base provider's getModel method and filters available models
 * to only include audio-to-audio capable models.
 * 
 * @param Base - The base provider class to extend
 * @returns Extended class with AudioToAudioProvider capabilities
 */
export function withAudioToAudioProvider<T extends Constructor>(Base: T) {
  return class extends Base implements AudioToAudioProvider {
    /**
     * Create an AudioToAudioModel instance for the specified model ID.
     * 
     * Delegates to the base provider's getModel method and validates that the
     * returned model is an instance of AudioToAudioModel.
     * 
     * @param modelId - The ID of the audio-to-audio model to create
     * @returns Promise resolving to an AudioToAudioModel instance
     * @throws Error if the model is not supported or not an AudioToAudioModel
     */
    async createAudioToAudioModel(modelId: string): Promise<AudioToAudioModel> {
      // Delegate to base provider's getModel method
      const model = await (this as any).getModel(modelId);

      if (!(model instanceof AudioToAudioModel)) {
        throw new Error(`Model '${modelId}' is not an AudioToAudioModel`);
      }

      return model;
    }

    /**
     * Get all supported audio-to-audio model IDs.
     * 
     * Filters the base provider's supported models to only include those
     * that are capable of audio-to-audio transformation. Uses common naming
     * patterns to identify audio-to-audio models.
     * 
     * @returns Array of supported audio-to-audio model IDs
     */
    getSupportedAudioToAudioModels(): string[] {
      // Filter supported models to only audio-to-audio models
      if (typeof (this as any).getSupportedModels === 'function') {
        const allModels = (this as any).getSupportedModels();
        return allModels.filter((modelId: string) =>
          modelId.includes('audio-to-audio') || 
          modelId.includes('audio-convert') || 
          modelId.includes('ffmpeg-audio') ||
          modelId.includes('audio-enhance') ||
          modelId.includes('audio-process') ||
          modelId.includes('audio-filter')
        );
      }
      return [];
    }
    
    /**
     * Check if a specific audio-to-audio model is supported.
     * 
     * @param modelId - The model ID to check
     * @returns True if the model is supported for audio-to-audio transformation
     */
    supportsAudioToAudioModel(modelId: string): boolean {
      return this.getSupportedAudioToAudioModels().includes(modelId);
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
