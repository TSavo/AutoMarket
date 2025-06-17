/**
 * Simple Media Transformer Interface
 * 
 * Based on the input→output pattern for clear, simple transformations:
 * - audio → text (STT)
 * - text → audio (TTS) 
 * - text → image (Generation)
 * - image → video (Animation)
 * - text + voice → video (Avatar)
 */

export type MediaType = 'text' | 'audio' | 'image' | 'video';

export interface MediaInput {
  type: MediaType;
  data: string | Buffer;
  metadata?: Record<string, any>;
}

export interface MediaOutput {
  type: MediaType;
  data: string | Buffer;
  metadata?: Record<string, any>;
}

export interface TransformCapability {
  input: MediaType | MediaType[];
  output: MediaType;
  description: string;
}

/**
 * Simple MediaTransformer interface
 * 
 * Each transformer declares what input→output transformations it supports
 * and provides a single transform method to perform them.
 */
export interface MediaTransformer {
  readonly id: string;
  readonly name: string;
  readonly type: 'local' | 'remote';
  
  /**
   * What transformations this provider supports
   */
  readonly transforms: TransformCapability[];
  
  /**
   * Check if the transformer is available and ready to use
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Perform a media transformation
   * 
   * @param input - The input media data
   * @param outputType - The desired output media type
   * @param options - Optional transformation parameters
   * @returns Promise<MediaOutput> - The transformed media
   */
  transform(input: MediaInput, outputType: MediaType, options?: Record<string, any>): Promise<MediaOutput>;
  
  /**
   * Get information about the transformer
   */
  getInfo(): {
    id: string;
    name: string;
    type: 'local' | 'remote';
    transforms: TransformCapability[];
    status: 'available' | 'unavailable' | 'unknown';
  };
}

/**
 * Registry for managing media transformers
 */
export interface TransformerRegistry {
  /**
   * Register a transformer
   */
  register(transformer: MediaTransformer): void;
  
  /**
   * Get all registered transformers
   */
  getTransformers(): MediaTransformer[];
  
  /**
   * Find transformers that can perform a specific transformation
   */
  findTransformers(inputType: MediaType, outputType: MediaType): MediaTransformer[];
  
  /**
   * Get the best transformer for a specific transformation
   */
  getBestTransformer(
    inputType: MediaType, 
    outputType: MediaType, 
    preferences?: {
      preferLocal?: boolean;
      excludeTransformers?: string[];
    }
  ): Promise<MediaTransformer | null>;
}

/**
 * Transformation request for workflow engines
 */
export interface TransformationRequest {
  input: MediaInput;
  outputType: MediaType;
  transformerId?: string; // Optional specific transformer to use
  options?: Record<string, any>;
}

/**
 * Transformation result
 */
export interface TransformationResult {
  success: boolean;
  output?: MediaOutput;
  error?: string;
  transformerId: string;
  processingTime?: number;
  metadata?: Record<string, any>;
}

/**
 * Helper function to create MediaInput from file path
 */
export function createMediaInput(
  type: MediaType, 
  data: string | Buffer, 
  metadata?: Record<string, any>
): MediaInput {
  return { type, data, metadata };
}

/**
 * Helper function to create MediaOutput
 */
export function createMediaOutput(
  type: MediaType,
  data: string | Buffer,
  metadata?: Record<string, any>
): MediaOutput {
  return { type, data, metadata };
}

/**
 * Service status for local services
 */
export type ServiceStatus = 'running' | 'stopped' | 'starting' | 'stopping' | 'error' | 'unknown';

/**
 * Local Service Manager Interface
 *
 * Optional interface for local services that can manage their own lifecycle.
 * Local MediaTransformers can implement this interface to support self-management.
 */
export interface LocalServiceManager {
  /**
   * Start the local service (e.g., Docker container, local process)
   * @returns Promise<boolean> - true if started successfully
   */
  startService(): Promise<boolean>;

  /**
   * Stop the local service
   * @returns Promise<boolean> - true if stopped successfully
   */
  stopService(): Promise<boolean>;

  /**
   * Get the current status of the service
   * @returns Promise<ServiceStatus> - current service status
   */
  getServiceStatus(): Promise<ServiceStatus>;

  /**
   * Get service management information
   */
  getServiceInfo(): {
    containerName?: string;
    dockerImage?: string;
    ports?: number[];
    command?: string;
    healthCheckUrl?: string;
  };
}
