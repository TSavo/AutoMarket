/**
 * Core Provider System Types
 * 
 * Defines the capability-driven provider architecture where:
 * Provider → Capabilities → Models → Invocation Methods
 */

import { z } from 'zod';

/**
 * Media generation capabilities that providers can support
 */
export enum MediaCapability {
  // Image capabilities
  IMAGE_GENERATION = 'image-generation',
  IMAGE_UPSCALING = 'image-upscaling',
  IMAGE_ENHANCEMENT = 'image-enhancement',
  IMAGE_STYLE_TRANSFER = 'image-style-transfer',
  IMAGE_INPAINTING = 'image-inpainting',
  IMAGE_OUTPAINTING = 'image-outpainting',
  
  // Video capabilities
  VIDEO_GENERATION = 'video-generation',
  VIDEO_ANIMATION = 'video-animation',
  VIDEO_UPSCALING = 'video-upscaling',
  VIDEO_STYLE_TRANSFER = 'video-style-transfer',
  VIDEO_FACE_SWAP = 'video-face-swap',
  VIDEO_LIP_SYNC = 'video-lip-sync',
  
  // Audio capabilities
  TEXT_TO_SPEECH = 'text-to-speech',
  VOICE_CLONING = 'voice-cloning',
  AUDIO_ENHANCEMENT = 'audio-enhancement',
  MUSIC_GENERATION = 'music-generation',
  
  // Avatar capabilities
  AVATAR_GENERATION = 'avatar-generation',
  AVATAR_ANIMATION = 'avatar-animation',
  
  // 3D capabilities
  MODEL_3D_GENERATION = '3d-generation',
  MODEL_3D_ANIMATION = '3d-animation'
}

/**
 * Provider execution types
 */
export enum ProviderType {
  LOCAL = 'local',    // Scripts, Docker, local APIs
  REMOTE = 'remote'   // Cloud APIs
}

/**
 * Job status for async operations
 */
export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
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
 * Generation request for any capability
 */
export interface GenerationRequest {
  capability: MediaCapability;
  modelId: string;
  parameters: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Generation result from any provider
 */
export interface GenerationResult {
  jobId: string;
  status: JobStatus;
  outputs?: Array<{
    type: 'image' | 'video' | 'audio' | 'text' | 'file';
    url?: string;
    data?: Buffer;
    metadata?: Record<string, any>;
  }>;
  error?: string;
  progress?: number;
  estimatedTimeRemaining?: number;
  cost?: {
    amount: number;
    currency: string;
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
   * Generate media using the specified model and parameters
   */
  generate(request: GenerationRequest): Promise<GenerationResult>;
  
  /**
   * Get the status of a running job
   */
  getJobStatus(jobId: string): Promise<GenerationResult>;
  
  /**
   * Cancel a running job
   */
  cancelJob(jobId: string): Promise<boolean>;
  
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
  parameters: z.record(z.any()),
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
