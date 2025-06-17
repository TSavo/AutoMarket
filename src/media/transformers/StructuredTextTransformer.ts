/**
 * Structured Text Transformer
 * 
 * Implements MediaTransformer interface for text→structured text transformations
 * Uses TypeBox for JSON schema validation and Ollama for generation
 */

import { 
  MediaTransformer, 
  MediaInput, 
  MediaOutput, 
  TransformCapability,
  createMediaOutput 
} from '../types/MediaTransformer';
import { Type, Static, TSchema } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { OllamaTransformer } from './OllamaTransformer';

export interface StructuredTextOptions {
  schema: TSchema;
  model?: string;
  temperature?: number;
  maxRetries?: number;
  systemPrompt?: string;
}

/**
 * Structured Text Transformer for text→structured text transformations
 * 
 * Converts unstructured text into structured JSON that conforms to a schema:
 * - Extract structured data from text
 * - Generate structured responses
 * - Validate output against JSON schema
 * - Retry on validation failures
 */
export class StructuredTextTransformer implements MediaTransformer {
  readonly id = 'structured-text';
  readonly name = 'Structured Text Generator';
  readonly type = 'local' as const;
  readonly transforms: TransformCapability[] = [
    {
      input: 'text',
      output: 'text',
      description: 'Transform text into structured JSON conforming to a schema'
    }
  ];

  private ollamaTransformer: OllamaTransformer;

  constructor() {
    this.ollamaTransformer = new OllamaTransformer();
  }

  async isAvailable(): Promise<boolean> {
    return this.ollamaTransformer.isAvailable();
  }

  async transform(input: MediaInput, outputType: 'text', options?: StructuredTextOptions): Promise<MediaOutput> {
    // Validate input type
    if (input.type !== 'text') {
      throw new Error(`StructuredTextTransformer only supports text input, received: ${input.type}`);
    }

    // Validate output type
    if (outputType !== 'text') {
      throw new Error(`StructuredTextTransformer only outputs text, requested: ${outputType}`);
    }

    if (!options?.schema) {
      throw new Error('Schema is required for structured text transformation');
    }

    try {
      const prompt = typeof input.data === 'string' ? input.data : input.data.toString('utf-8');
      const result = await this.generateStructuredText(prompt, options);

      return createMediaOutput('text', JSON.stringify(result.data, null, 2), {
        schema: this.schemaToString(options.schema),
        validationPassed: result.validationPassed,
        attempts: result.attempts,
        model: result.model,
        processingTime: result.processingTime,
        service: 'structured-text',
        ...result.metadata
      });
    } catch (error) {
      throw new Error(`Structured text transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate structured text with schema validation
   */
  private async generateStructuredText(prompt: string, options: StructuredTextOptions) {
    const maxRetries = options.maxRetries || 3;
    const schema = options.schema;
    const schemaString = this.schemaToString(schema);
    
    let lastError: string = '';
    let attempts = 0;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      attempts = attempt;
      
      try {
        // Build structured prompt
        const structuredPrompt = this.buildStructuredPrompt(prompt, schemaString, options.systemPrompt, lastError);
        
        // Generate text using Ollama
        const textInput = { type: 'text' as const, data: structuredPrompt };
        const result = await this.ollamaTransformer.transform(textInput, 'text', {
          model: options.model,
          temperature: options.temperature || 0.3, // Lower temperature for structured output
          maxTokens: 1000
        });

        // Extract JSON from response
        const generatedText = typeof result.data === 'string' ? result.data : result.data.toString('utf-8');
        const jsonData = this.extractJSON(generatedText);

        // Validate against schema
        const isValid = Value.Check(schema, jsonData);
        
        if (isValid) {
          return {
            data: jsonData,
            validationPassed: true,
            attempts,
            model: result.metadata?.model,
            processingTime: result.metadata?.processingTime,
            metadata: result.metadata
          };
        } else {
          const errors = [...Value.Errors(schema, jsonData)];
          lastError = errors.map(e => `${e.path}: ${e.message}`).join(', ');
          console.warn(`Attempt ${attempt}: Schema validation failed:`, lastError);
          
          if (attempt === maxRetries) {
            // Return invalid data with validation info on final attempt
            return {
              data: jsonData,
              validationPassed: false,
              attempts,
              validationErrors: lastError,
              model: result.metadata?.model,
              processingTime: result.metadata?.processingTime,
              metadata: result.metadata
            };
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`Attempt ${attempt}: Generation failed:`, lastError);
        
        if (attempt === maxRetries) {
          throw new Error(`Failed to generate structured text after ${maxRetries} attempts: ${lastError}`);
        }
      }
    }

    throw new Error('Unexpected end of generation loop');
  }

  /**
   * Build prompt for structured text generation
   */
  private buildStructuredPrompt(userPrompt: string, schemaString: string, systemPrompt?: string, lastError?: string): string {
    let prompt = systemPrompt || 'You are a helpful assistant that generates structured JSON responses.';
    
    prompt += `\n\nGenerate a JSON response that strictly conforms to this schema:\n${schemaString}`;
    
    if (lastError) {
      prompt += `\n\nPrevious attempt failed validation with errors: ${lastError}`;
      prompt += '\nPlease fix these issues in your response.';
    }
    
    prompt += `\n\nUser request: ${userPrompt}`;
    prompt += '\n\nRespond with ONLY valid JSON that matches the schema exactly:';
    
    return prompt;
  }

  /**
   * Extract JSON from generated text
   */
  private extractJSON(text: string): any {
    try {
      // Try to parse the entire text as JSON first
      return JSON.parse(text.trim());
    } catch {
      // Look for JSON within the text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          throw new Error('Found JSON-like content but failed to parse');
        }
      }
      
      // Look for array JSON
      const arrayMatch = text.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        try {
          return JSON.parse(arrayMatch[0]);
        } catch {
          throw new Error('Found array-like content but failed to parse');
        }
      }
      
      throw new Error('No valid JSON found in response');
    }
  }

  /**
   * Convert TypeBox schema to string representation
   */
  private schemaToString(schema: TSchema): string {
    try {
      return JSON.stringify(schema, null, 2);
    } catch {
      return 'Schema serialization failed';
    }
  }

  /**
   * Get transformer information
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      transforms: this.transforms,
      status: 'unknown' as const
    };
  }
}

// Example schemas for common use cases
export const CommonSchemas = {
  /**
   * Extract key information from text
   */
  KeyInfo: Type.Object({
    title: Type.String({ description: 'Main title or topic' }),
    summary: Type.String({ description: 'Brief summary' }),
    keyPoints: Type.Array(Type.String(), { description: 'Key points or takeaways' }),
    tags: Type.Array(Type.String(), { description: 'Relevant tags or categories' })
  }),

  /**
   * Contact information extraction
   */
  ContactInfo: Type.Object({
    name: Type.Optional(Type.String()),
    email: Type.Optional(Type.String()),
    phone: Type.Optional(Type.String()),
    company: Type.Optional(Type.String()),
    address: Type.Optional(Type.String())
  }),

  /**
   * Event information
   */
  EventInfo: Type.Object({
    title: Type.String(),
    date: Type.String({ format: 'date' }),
    time: Type.Optional(Type.String()),
    location: Type.Optional(Type.String()),
    description: Type.String(),
    attendees: Type.Optional(Type.Array(Type.String()))
  })
};
