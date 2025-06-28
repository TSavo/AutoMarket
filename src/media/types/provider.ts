/**
 * Core Provider System Types
 * 
 * Defines the capability-driven provider architecture where:
 * Provider → Capabilities → Models → Invocation Methods
 */

import { z } from 'zod';

/**
 * Media transformation capabilities that providers can support.
 * 
 * Each capability maps directly to a specific Model class and transform signature.
 * This enables deterministic model instantiation based on input/output types.
 */
export enum MediaCapability {
  // Text transformation capabilities
  TEXT_TO_TEXT = 'text-to-text',           // TextToTextModel: transform(text) -> Text

  // Image generation and transformation capabilities  
  TEXT_TO_IMAGE = 'text-to-image',         // TextToImageModel: transform(text) -> Image
  IMAGE_TO_IMAGE = 'image-to-image',       // ImageToImageModel: transform(image) -> Image
  IMAGE_TO_TEXT = 'image-to-text',         // ImageToTextModel: transform(image) -> Text

  // Video generation and transformation capabilities
  TEXT_TO_VIDEO = 'text-to-video',         // TextToVideoModel: transform(text) -> Video
  IMAGE_TO_VIDEO = 'image-to-video',       // ImageToVideoModel: transform(image) -> Video
  VIDEO_TO_VIDEO = 'video-to-video',       // VideoToVideoModel: transform(video) -> Video
  VIDEO_TO_IMAGE = 'video-to-image',       // VideoToImageModel: transform(video) -> Image
  VIDEO_TO_AUDIO = 'video-to-audio',       // VideoToAudioModel: transform(video) -> Audio

  // Audio generation and transformation capabilities
  TEXT_TO_AUDIO = 'text-to-audio',         // TextToAudioModel: transform(text) -> Audio
  AUDIO_TO_TEXT = 'audio-to-text',         // AudioToTextModel: transform(audio) -> Text
  AUDIO_TO_AUDIO = 'audio-to-audio',       // AudioToAudioModel: transform(audio) -> Audio

  // 3D generation capabilities
  TEXT_TO_3D = 'text-to-3d',               // TextTo3DModel: transform(text) -> Model3D
  IMAGE_TO_3D = 'image-to-3d'              // ImageTo3DModel: transform(image) -> Model3D
}

/**
 * Provider execution types
 */
export enum ProviderType {
  LOCAL = 'local',    // Scripts, Docker, local APIs
  REMOTE = 'remote'   // Cloud APIs
}

/**
 * Model configuration for a specific capability
 */
export interface ProviderModel {
  id: string;
  name: string;
  description?: string;
  capabilities: MediaCapability[];
  parameters: Record<string, any>;
  pricing?: {
    inputCost?: number;
    outputCost?: number;
    currency: string;
  };
  limits?: {
    maxInputSize?: number;
    maxOutputSize?: number;
    rateLimit?: number;
  };
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  environment?: Record<string, string>;
  dockerImage?: string;
  scriptPath?: string;
}

/**
 * Base provider interface that all providers must implement
 */
export interface MediaProvider {
  readonly id: string;
  readonly name: string;
  readonly type: ProviderType;
  readonly capabilities: MediaCapability[];
  readonly models: ProviderModel[];
  
  /**
   * Configure the provider with credentials and settings
   */
  configure(config: ProviderConfig): Promise<void>;
  
  /**
   * Check if the provider is properly configured and available
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Get available models for a specific capability
   */
  getModelsForCapability(capability: MediaCapability): ProviderModel[];
  
  /**
   * Get a model instance by ID with automatic type detection.
   * 
   * This method provides the intelligent model instantiation that enables
   * the elegant getProvider().getModel().transform() pattern. It determines
   * the correct Model class based on the model's capabilities.
   * 
   * @param modelId - ID of the model to instantiate
   * @returns Promise resolving to the appropriate Model instance
   * @example
   * ```typescript
   * const model = await provider.getModel('fal-ai/flux-pro');
   * const result = await model.transform(input, options);
   * ```
   */
  getModel(modelId: string): Promise<any>;
  
  /**
   * Get provider health and usage statistics
   */
  getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    activeJobs: number;
    queuedJobs: number;
    lastError?: string;
  }>;
}

/**
 * Provider registry for managing all available providers
 */
export interface ProviderRegistry {
  /**
   * Register a new provider
   */
  register(provider: MediaProvider): void;
  
  /**
   * Get all registered providers
   */
  getProviders(): MediaProvider[];
  
  /**
   * Get providers that support a specific capability
   */
  getProvidersForCapability(capability: MediaCapability): MediaProvider[];
  
  /**
   * Get a specific provider by ID
   */
  getProvider(id: string): MediaProvider | undefined;
  
  /**
   * Find the best provider for a capability based on availability and cost
   */
  findBestProvider(capability: MediaCapability, criteria?: {
    maxCost?: number;
    preferLocal?: boolean;
    excludeProviders?: string[];
  }): MediaProvider | undefined;
}

// Zod schemas for validation
export const GenerationRequestSchema = z.object({
  capability: z.nativeEnum(MediaCapability),
  modelId: z.string(),
  input: z.any(),                           // RAW Role object(s) - matches transform() signature
  options: z.record(z.any()).optional(),    // Transform options - matches transform() signature  
  parameters: z.record(z.any()).optional(), // Legacy - for backward compatibility
  metadata: z.record(z.any()).optional()
});

export const ProviderConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  timeout: z.number().positive().optional(),
  retries: z.number().min(0).optional(),
  environment: z.record(z.string()).optional(),
  dockerImage: z.string().optional(),
  scriptPath: z.string().optional()
});

// ============================================================================
// GENERATION SYSTEM TYPES
// ============================================================================

/**
 * Options for transformation methods.
 */
export interface FluentTransformOptions {
  [key: string]: any;
}

/**
 * Result of a transformation, potentially including job information.
 */
export interface FluentTransformResult {
  jobId?: string;           // If async via job system
  result?: any;             // If synchronous
  promise?: Promise<any>;   // If async direct
}

/**
 * Request for media generation
 */
// Types for the fluent API wrappers
export type CallableModelType = ((input: any, options?: FluentTransformOptions, useJobSystem?: boolean) => Promise<any>) & {
  transform: (input: any, options?: FluentTransformOptions, useJobSystem?: boolean) => Promise<any>;
  getModelInfo: () => { providerId: string; modelId: string; capabilities: MediaCapability[] };
};

export type CallableProviderType = ((modelId: string) => Promise<CallableModelType>) & {
  model: (modelId: string) => Promise<CallableModelType>;
  getProviderInfo: () => { id: string; type: ProviderType; isAvailable: Promise<boolean>; models: ProviderModel[] };
};

export interface GenerationRequest {
  capability: MediaCapability;
  modelId: string;
  parameters: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Result of media generation
 */
export interface GenerationResult {
  jobId: string;
  status: JobStatus;
  output?: any;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Status of a generation job
 */
export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// ============================================================================
// PROVIDER SYSTEM TYPES  
// ============================================================================
