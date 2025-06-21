/**
 * TextToVideoProvider Interface
 * 
 * Provider role interface for text-to-video generation capabilities.
 * This interface defines the contract that providers must implement to support
 * video generation from text prompts using AI models.
 * 
 * ## Capabilities
 * - **Model Discovery**: Find and list available text-to-video models
 * - **Model Creation**: Instantiate specific models for video generation
 * - **Model Validation**: Check if specific models are supported
 * - **Provider Integration**: Seamless integration with the provider ecosystem
 * 
 * ## Implementation Requirements
 * Providers implementing this interface should:
 * 1. Support at least one text-to-video model
 * 2. Handle model lifecycle management
 * 3. Provide accurate model capability reporting
 * 4. Implement proper error handling for unsupported models
 * 
 * ## Usage Example
 * ```typescript
 * class MyVideoProvider implements TextToVideoProvider {
 *   async createTextToVideoModel(modelId: string): Promise<TextToVideoModel> {
 *     // Implementation specific to provider
 *   }
 *   
 *   getSupportedTextToVideoModels(): string[] {
 *     return ['runway-gen3', 'luma-dream-machine'];
 *   }
 *   
 *   supportsTextToVideoModel(modelId: string): boolean {
 *     return this.getSupportedTextToVideoModels().includes(modelId);
 *   }
 * }
 * ```
 */

import { TextToVideoModel } from '../../models/abstracts/TextToVideoModel';

/**
 * Text-to-Video Provider Role Interface
 * 
 * Defines the contract for providers that offer text-to-video generation
 * capabilities through various AI models and services.
 */
export interface TextToVideoProvider {
  /**
   * Create a TextToVideoModel instance for the specified model ID.
   * 
   * Instantiates and configures a specific text-to-video model that can be
   * used to generate videos from text prompts. The model should be ready
   * for use upon successful creation.
   * 
   * @param modelId - Unique identifier of the text-to-video model to create
   * @returns Promise resolving to a configured TextToVideoModel instance
   * @throws Error if the model ID is not supported or creation fails
   * 
   * @example
   * ```typescript
   * const model = await provider.createTextToVideoModel('runway-gen3');
   * const video = await model.transform(textPrompt, { duration: 5 });
   * ```
   */
  createTextToVideoModel(modelId: string): Promise<TextToVideoModel>;

  /**
   * Get all supported text-to-video model identifiers.
   * 
   * Returns a list of model IDs that this provider can create and manage.
   * These IDs can be used with createTextToVideoModel() to instantiate
   * specific models.
   * 
   * @returns Array of supported text-to-video model IDs
   * 
   * @example
   * ```typescript
   * const models = provider.getSupportedTextToVideoModels();
   * console.log(models); // ['runway-gen3', 'luma-dream-machine', 'stable-video']
   * ```
   */
  getSupportedTextToVideoModels(): string[];

  /**
   * Check if a specific text-to-video model is supported by this provider.
   * 
   * Validates whether the given model ID is available for use with this
   * provider. This is useful for checking compatibility before attempting
   * to create a model instance.
   * 
   * @param modelId - Model identifier to check for support
   * @returns True if the model is supported, false otherwise
   * 
   * @example
   * ```typescript
   * if (provider.supportsTextToVideoModel('runway-gen3')) {
   *   const model = await provider.createTextToVideoModel('runway-gen3');
   *   // Use the model...
   * } else {
   *   console.log('Model not supported by this provider');
   * }
   * ```
   */
  supportsTextToVideoModel(modelId: string): boolean;
}
