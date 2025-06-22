"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
