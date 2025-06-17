/**
 * Model - Abstract Base Class
 * 
 * Base class for all media transformation models.
 * Defines the core transformation contract that all models must implement.
 */

export interface ModelMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  provider: string;
  capabilities: string[];
  inputTypes: string[];
  outputTypes: string[];
}

export interface TransformationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    processingTime?: number;
    modelUsed?: string;
    provider?: string;
    [key: string]: any;
  };
}

/**
 * Abstract base class for all media transformation models
 */
export abstract class Model<TInput = any, TOutput = any> {
  protected metadata: ModelMetadata;

  constructor(metadata: ModelMetadata) {
    this.metadata = metadata;
  }

  /**
   * Core transformation method that all models must implement
   */
  abstract transform(input: TInput): Promise<TransformationResult<TOutput>>;

  /**
   * Get the input schema for this model
   */
  abstract getInputSchema(): any;

  /**
   * Get the output schema for this model
   */
  abstract getOutputSchema(): any;

  /**
   * Check if the model is available and ready to use
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Get model metadata
   */
  getMetadata(): ModelMetadata {
    return { ...this.metadata };
  }

  /**
   * Get model ID
   */
  getId(): string {
    return this.metadata.id;
  }

  /**
   * Get model name
   */
  getName(): string {
    return this.metadata.name;
  }

  /**
   * Get model description
   */
  getDescription(): string {
    return this.metadata.description;
  }

  /**
   * Get model version
   */
  getVersion(): string {
    return this.metadata.version;
  }

  /**
   * Get provider name
   */
  getProvider(): string {
    return this.metadata.provider;
  }

  /**
   * Get model capabilities
   */
  getCapabilities(): string[] {
    return [...this.metadata.capabilities];
  }

  /**
   * Get supported input types
   */
  getInputTypes(): string[] {
    return [...this.metadata.inputTypes];
  }

  /**
   * Get supported output types
   */
  getOutputTypes(): string[] {
    return [...this.metadata.outputTypes];
  }

  /**
   * Check if the model supports a specific input type
   */
  supportsInputType(type: string): boolean {
    return this.metadata.inputTypes.includes(type);
  }

  /**
   * Check if the model supports a specific output type
   */
  supportsOutputType(type: string): boolean {
    return this.metadata.outputTypes.includes(type);
  }

  /**
   * Check if the model has a specific capability
   */
  hasCapability(capability: string): boolean {
    return this.metadata.capabilities.includes(capability);
  }

  /**
   * Validate input against the model's input schema
   */
  protected validateInput(input: TInput): boolean {
    // Default implementation - subclasses can override for specific validation
    return input !== null && input !== undefined;
  }

  /**
   * Validate output against the model's output schema
   */
  protected validateOutput(output: TOutput): boolean {
    // Default implementation - subclasses can override for specific validation
    return output !== null && output !== undefined;
  }

  /**
   * Create a successful transformation result
   */
  protected createSuccessResult(
    data: TOutput, 
    metadata?: Record<string, any>
  ): TransformationResult<TOutput> {
    return {
      success: true,
      data,
      metadata: {
        modelUsed: this.metadata.id,
        provider: this.metadata.provider,
        ...metadata
      }
    };
  }

  /**
   * Create a failed transformation result
   */
  protected createErrorResult(
    error: string, 
    metadata?: Record<string, any>
  ): TransformationResult<TOutput> {
    return {
      success: false,
      error,
      metadata: {
        modelUsed: this.metadata.id,
        provider: this.metadata.provider,
        ...metadata
      }
    };
  }

  /**
   * Measure execution time of a function
   */
  protected async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> {
    const startTime = Date.now();
    const result = await fn();
    const endTime = Date.now();
    return {
      result,
      time: endTime - startTime
    };
  }

  /**
   * Get a string representation of the model
   */
  toString(): string {
    return `${this.metadata.name} (${this.metadata.id}) v${this.metadata.version} by ${this.metadata.provider}`;
  }

  /**
   * Get a JSON representation of the model
   */
  toJSON(): ModelMetadata {
    return this.getMetadata();
  }
}
