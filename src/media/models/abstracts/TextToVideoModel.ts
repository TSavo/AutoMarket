/**
 * TextToVideoModel - Abstract Base Class
 * 
 * Abstract base class for text-to-video generation models that create video content
 * from textual descriptions. This class provides a unified interface for generating
 * videos using various AI models like Runway Gen3, Luma Dream Machine, and others.
 * 
 * ## Features
 * - **Text-to-Video Generation**: Create videos from text prompts
 * - **Customizable Parameters**: Control duration, resolution, frame rate, and quality
 * - **Multiple Formats**: Support for MP4, WebM, MOV, and other video formats
 * - **Aspect Ratio Control**: Generate videos in various aspect ratios
 * - **Motion Control**: Adjust motion strength and video dynamics
 * - **Negative Prompts**: Specify what should not appear in the video
 * - **Seed Control**: Reproducible generation with seed values
 * - **Loop Support**: Create seamless looping videos
 * 
 * ## Architecture
 * Uses the Asset-role system for type-safe input/output handling with automatic
 * casting between TextRole and Video types. Supports extensive customization
 * through the TextToVideoOptions interface.
 * 
 * ## Usage Patterns
 * 
 * ### Basic Video Generation
 * ```typescript
 * const model = await provider.createTextToVideoModel('runway-gen3');
 * const prompt = Text.fromString("A serene lake with mountains in the background");
 * const video = await model.transform(prompt, {
 *   duration: 5,
 *   width: 1280,
 *   height: 720,
 *   fps: 24
 * });
 * ```
 * 
 * ### High-Quality Production
 * ```typescript
 * const video = await model.transform(prompt, {
 *   duration: 10,
 *   aspectRatio: '16:9',
 *   quality: 'high',
 *   motionStrength: 0.8,
 *   guidanceScale: 7.5,
 *   negativePrompt: 'blurry, low quality'
 * });
 * ```
 * 
 * ### Looping Video
 * ```typescript
 * const loopingVideo = await model.transform(prompt, {
 *   duration: 3,
 *   loop: true,
 *   seed: 12345 // For reproducible results
 * });
 * ```
 * 
 * @abstract
 * @extends Model<TextRole, TextToVideoOptions, Video>
 */

import { Model, ModelMetadata } from './Model';
import { Text, TextRole, Video } from '../../assets/roles';

/**
 * Configuration options for text-to-video generation.
 * 
 * These options control various aspects of the video generation process,
 * from basic parameters like duration and resolution to advanced settings
 * like motion control and generation guidance.
 */
export interface TextToVideoOptions {
  /** Video duration in seconds (typically 1-30 seconds depending on model) */
  duration?: number;
  
  /** Video width in pixels */
  width?: number;
  
  /** Video height in pixels */
  height?: number;
  
  /** Aspect ratio (e.g., '16:9', '4:3', '1:1', '9:16') */
  aspectRatio?: string;
  
  /** Frames per second (typically 24, 30, or 60) */
  fps?: number;
  
  /** Quality setting (0.0 to 1.0 or 'low'/'medium'/'high') */
  quality?: number | 'low' | 'medium' | 'high';
  
  /** Output video format */
  format?: 'mp4' | 'webm' | 'mov' | 'avi';
  
  /** Seed for reproducible generation */
  seed?: number;
  
  /** Motion strength/intensity (0.0 = static, 1.0 = high motion) */
  motionStrength?: number;
  
  /** Create a seamlessly looping video */
  loop?: boolean;
  
  /** Negative prompt describing what to avoid */
  negativePrompt?: string;
  
  /** Guidance scale for prompt adherence (higher = more literal) */
  guidanceScale?: number;
  
  /** Number of inference steps (more steps = better quality, slower) */
  steps?: number;
  
  /** Style preset or artistic direction */
  style?: string;
  
  /** Camera movement type (pan, zoom, static, etc.) */
  cameraMovement?: 'static' | 'pan' | 'zoom' | 'dolly' | 'orbit';
  
  /** Lighting condition */
  lighting?: 'natural' | 'studio' | 'dramatic' | 'soft' | 'golden-hour';
  
  /** Additional provider-specific parameters */
  [key: string]: any;
}

/**
 * Abstract base class for text-to-video models.
 * 
 * Provides the foundation for all text-to-video generation models,
 * ensuring consistent interface and metadata handling across different
 * providers and model implementations.
 */
export abstract class TextToVideoModel extends Model<TextRole, TextToVideoOptions, Video> {
  protected metadata: ModelMetadata;

  /**
   * Initialize a new TextToVideoModel instance.
   * 
   * Automatically enhances the provided metadata to include text-to-video
   * specific capabilities and supported input/output types.
   * 
   * @param metadata - Model metadata including id, name, capabilities, etc.
   */
  constructor(metadata: ModelMetadata) {
    // Ensure the model supports text-to-video transformation
    const enhancedMetadata: ModelMetadata = {
      ...metadata,
      inputTypes: [...new Set([...metadata.inputTypes, 'text'])],
      outputTypes: [...new Set([...metadata.outputTypes, 'video'])],
      capabilities: [...new Set([...metadata.capabilities, 'text-to-video', 'video-generation'])]
    };
    
    super(enhancedMetadata);
    this.metadata = enhancedMetadata;
  }
  
  /**
   * Transform text prompt into a generated video.
   * 
   * Converts text descriptions into video content using the model's
   * generation capabilities. The quality and characteristics of the output
   * depend on the specific model and provided options.
   * 
   * @param input - Text prompt describing the desired video content
   * @param options - Optional configuration for video generation parameters
   * @returns Promise resolving to generated video
   * 
   * @example
   * ```typescript
   * const prompt = Text.fromString("A cat playing with a ball in a sunny garden");
   * const video = await model.transform(prompt, {
   *   duration: 5,
   *   aspectRatio: '16:9',
   *   quality: 'high',
   *   fps: 30
   * });
   * ```
   */
  abstract transform(input: TextRole, options?: TextToVideoOptions): Promise<Video>;

  /**
   * Check if the model is currently available and ready for use.
   * 
   * Verifies that the model can be accessed and is operational. This may
   * include checking API connectivity, service health, quota limits, or
   * local model availability.
   * 
   * @returns Promise resolving to true if model is available, false otherwise
   * 
   * @example
   * ```typescript
   * if (await model.isAvailable()) {
   *   const video = await model.transform(prompt);
   * } else {
   *   console.log('Model is not currently available');
   * }
   * ```
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Get the list of supported video output formats.
   * 
   * Returns the video formats that this model can generate. Common formats
   * include 'mp4', 'webm', 'mov'. The availability depends on the
   * underlying model and provider capabilities.
   * 
   * @returns Array of supported format strings
   */
  abstract getSupportedFormats(): string[];

  /**
   * Get available aspect ratios for this model.
   * 
   * Returns the aspect ratios that this model supports. Common ratios
   * include '16:9', '4:3', '1:1', '9:16'. Some models may support
   * custom ratios or have specific limitations.
   * 
   * @returns Array of supported aspect ratio strings
   */
  abstract getSupportedAspectRatios(): string[];

  /**
   * Get the supported video duration range.
   * 
   * Returns the minimum and maximum video duration this model can generate.
   * Duration limits vary significantly between different models and providers.
   * 
   * @returns Object with min and max duration in seconds
   */
  abstract getSupportedDurationRange(): { min: number; max: number };

  /**
   * Get the maximum resolution supported by this model.
   * 
   * Returns the highest resolution (width x height) that this model
   * can generate. Higher resolutions may require more processing time
   * and may have different pricing.
   * 
   * @returns Object with maximum width and height
   */
  abstract getMaxResolution(): { width: number; height: number };

  /**
   * Estimate the processing time for a given prompt and options.
   * 
   * Provides an estimate of how long video generation will take based
   * on the complexity of the prompt and the requested video parameters.
   * 
   * @param prompt - Text prompt to analyze
   * @param options - Video generation options
   * @returns Estimated processing time in milliseconds
   */
  abstract estimateProcessingTime(prompt: string, options?: TextToVideoOptions): number;

  /**
   * Check if this model supports specific features.
   * 
   * Allows checking for advanced features like looping, camera movement,
   * style presets, or other model-specific capabilities.
   * 
   * @param feature - Feature name to check
   * @returns True if feature is supported, false otherwise
   */
  abstract supportsFeature(feature: string): boolean;
}
