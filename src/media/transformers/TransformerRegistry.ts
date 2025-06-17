/**
 * MediaTransformer Registry
 * 
 * Central registry for managing all MediaTransformers.
 * Provides discovery, selection, and execution of transformations.
 */

import {
  MediaTransformer,
  TransformerRegistry,
  MediaType,
  MediaInput,
  MediaOutput,
  TransformationRequest,
  TransformationResult
} from '../types/MediaTransformer';

/**
 * Default MediaTransformer Registry Implementation
 */
export class DefaultTransformerRegistry implements TransformerRegistry {
  private transformers: Map<string, MediaTransformer> = new Map();

  /**
   * Register a transformer
   */
  register(transformer: MediaTransformer): void {
    this.transformers.set(transformer.id, transformer);
  }

  /**
   * Unregister a transformer
   */
  unregister(transformerId: string): void {
    this.transformers.delete(transformerId);
  }

  /**
   * Get all registered transformers
   */
  getTransformers(): MediaTransformer[] {
    return Array.from(this.transformers.values());
  }

  /**
   * Get a transformer by ID
   */
  getTransformer(id: string): MediaTransformer | undefined {
    return this.transformers.get(id);
  }

  /**
   * Find transformers that can perform a specific transformation
   */
  findTransformers(inputType: MediaType, outputType: MediaType): MediaTransformer[] {
    const compatibleTransformers: MediaTransformer[] = [];

    for (const transformer of this.transformers.values()) {
      for (const capability of transformer.transforms) {
        const inputMatches = Array.isArray(capability.input) 
          ? capability.input.includes(inputType)
          : capability.input === inputType;
        
        if (inputMatches && capability.output === outputType) {
          compatibleTransformers.push(transformer);
          break; // Don't add the same transformer multiple times
        }
      }
    }

    return compatibleTransformers;
  }

  /**
   * Find transformers that can handle multiple input types
   */
  findMultiInputTransformers(inputTypes: MediaType[], outputType: MediaType): MediaTransformer[] {
    const compatibleTransformers: MediaTransformer[] = [];

    for (const transformer of this.transformers.values()) {
      for (const capability of transformer.transforms) {
        if (Array.isArray(capability.input)) {
          // Check if all required input types are supported
          const allInputsSupported = inputTypes.every(inputType => 
            capability.input.includes(inputType)
          );
          
          if (allInputsSupported && capability.output === outputType) {
            compatibleTransformers.push(transformer);
            break;
          }
        }
      }
    }

    return compatibleTransformers;
  }

  /**
   * Get the best transformer for a specific transformation
   */
  async getBestTransformer(
    inputType: MediaType, 
    outputType: MediaType, 
    preferences?: {
      preferLocal?: boolean;
      excludeTransformers?: string[];
    }
  ): Promise<MediaTransformer | null> {
    let candidates = this.findTransformers(inputType, outputType);

    // Filter out excluded transformers
    if (preferences?.excludeTransformers) {
      candidates = candidates.filter(t => !preferences.excludeTransformers!.includes(t.id));
    }

    if (candidates.length === 0) {
      return null;
    }

    // Sort by preference: local first if preferred, then by availability
    if (preferences?.preferLocal) {
      candidates.sort((a, b) => {
        if (a.type === 'local' && b.type === 'remote') return -1;
        if (a.type === 'remote' && b.type === 'local') return 1;
        return 0;
      });
    }

    // Find the first available transformer
    for (const transformer of candidates) {
      try {
        const isAvailable = await transformer.isAvailable();
        if (isAvailable) {
          return transformer;
        }
      } catch (error) {
        console.warn(`Error checking availability of transformer ${transformer.id}:`, error);
      }
    }

    return null;
  }

  /**
   * Execute a transformation request
   */
  async executeTransformation(request: TransformationRequest): Promise<TransformationResult> {
    const startTime = Date.now();

    try {
      let transformer: MediaTransformer | null = null;      // Use specific transformer if requested
      if (request.transformerId) {
        transformer = this.getTransformer(request.transformerId) || null;
        if (!transformer) {
          return {
            success: false,
            error: `Transformer ${request.transformerId} not found`,
            transformerId: request.transformerId
          };
        }
      } else {
        // Find the best transformer for this transformation
        const inputType = Array.isArray(request.input) 
          ? request.input[0].type // Use first input type for discovery
          : request.input.type;
          
        transformer = await this.getBestTransformer(inputType, request.outputType);
        
        if (!transformer) {
          return {
            success: false,
            error: `No transformer available for ${inputType} → ${request.outputType}`,
            transformerId: 'none'
          };
        }
      }

      // Check if transformer is available
      const isAvailable = await transformer.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: `Transformer ${transformer.id} is not available`,
          transformerId: transformer.id
        };
      }

      // Execute the transformation
      const output = await transformer.transform(request.input, request.outputType, request.options);
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        output,
        transformerId: transformer.id,
        processingTime,
        metadata: {
          transformerName: transformer.name,
          transformerType: transformer.type
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        transformerId: request.transformerId || 'unknown',
        processingTime
      };
    }
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalTransformers: number;
    localTransformers: number;
    remoteTransformers: number;
    availableTransformations: Array<{
      input: MediaType | MediaType[];
      output: MediaType;
      transformerCount: number;
    }>;
  } {
    const transformers = this.getTransformers();
    const localCount = transformers.filter(t => t.type === 'local').length;
    const remoteCount = transformers.filter(t => t.type === 'remote').length;

    // Collect all unique transformations
    const transformationMap = new Map<string, number>();
    
    for (const transformer of transformers) {
      for (const capability of transformer.transforms) {
        const key = `${JSON.stringify(capability.input)} → ${capability.output}`;
        transformationMap.set(key, (transformationMap.get(key) || 0) + 1);
      }
    }

    const availableTransformations = Array.from(transformationMap.entries()).map(([key, count]) => {
      const [inputStr, output] = key.split(' → ');
      const input = JSON.parse(inputStr);
      return { input, output: output as MediaType, transformerCount: count };
    });

    return {
      totalTransformers: transformers.length,
      localTransformers: localCount,
      remoteTransformers: remoteCount,
      availableTransformations
    };
  }
}

/**
 * Global transformer registry instance
 */
export const transformerRegistry = new DefaultTransformerRegistry();

/**
 * Convenience function to register transformers
 */
export function registerTransformer(transformer: MediaTransformer): void {
  transformerRegistry.register(transformer);
}

/**
 * Convenience function to execute transformations
 */
export function executeTransformation(request: TransformationRequest): Promise<TransformationResult> {
  return transformerRegistry.executeTransformation(request);
}
