/**
 * MediaTransf# // Re-export existing transformers for convenience
export { StructuredTextTransformer } from './StructuredTextTransformer';
export { OllamaTransformer } from './OllamaTransformer';xport existing transformers for convenience
export { StructuredTextTransformer } from './StructuredTextTransformer';
export { OllamaTransformer } from './OllamaTransformer';r Multi-Modal Providers Export
 * 
 * Central export point for all MediaTransformer implementations and utilities.
 */

// Core MediaTransformer types and interfaces
export * from '../types/MediaTransformer';

// Multi-modal provider implementations
export * from './FalAiTransformer';
export * from './ReplicateTransformer';

// Registry and utilities
export * from './TransformerRegistry';

// Demo and examples
export * from './MultiModalDemo';

// Re-export existing transformers for convenience  
export { StructuredTextTransformer } from './StructuredTextTransformer';
export { OllamaTransformer } from './OllamaTransformer';

/**
 * Quick setup function for common provider configurations
 */
export function setupCommonProviders() {
  const { transformerRegistry } = require('./TransformerRegistry');
  
  // Try to register FAL.ai if available
  try {
    const { createFalAiTransformerFromEnv } = require('./FalAiTransformer');
    const falAi = createFalAiTransformerFromEnv();
    transformerRegistry.register(falAi);
    console.log('✅ FAL.ai provider registered');
  } catch (error) {
    console.log('⚠️  FAL.ai provider not available (missing FALAI_API_KEY)');
  }

  // Try to register Replicate if available
  try {
    const { createReplicateTransformerFromEnv } = require('./ReplicateTransformer');
    const replicate = createReplicateTransformerFromEnv();
    transformerRegistry.register(replicate);
    console.log('✅ Replicate provider registered');
  } catch (error) {
    console.log('⚠️  Replicate provider not available (missing REPLICATE_API_TOKEN)');
  }
  // Try to register Ollama if available
  try {
    const { OllamaTransformer } = require('./OllamaTransformer');
    const ollama = new OllamaTransformer();
    transformerRegistry.register(ollama);
    console.log('✅ Ollama provider registered');
  } catch (error) {
    console.log('⚠️  Ollama provider not available');
  }

  return transformerRegistry;
}

/**
 * Create a fully configured MediaTransformer ecosystem
 */
export function createMediaTransformerEcosystem(config?: {
  falAi?: { apiKey: string };
  replicate?: { apiKey: string };
  whisper?: { baseUrl?: string };
  chatterbox?: { baseUrl?: string };
}) {
  const { transformerRegistry } = require('./TransformerRegistry');
  
  if (config?.falAi) {
    const { createFalAiTransformer } = require('./FalAiTransformer');
    transformerRegistry.register(createFalAiTransformer(config.falAi));
  }
  
  if (config?.replicate) {
    const { createReplicateTransformer } = require('./ReplicateTransformer');
    transformerRegistry.register(createReplicateTransformer(config.replicate));
  }
  
  // Additional providers would be configured here as they're implemented

  return {
    registry: transformerRegistry,
    stats: transformerRegistry.getStats(),
    findTransformers: transformerRegistry.findTransformers.bind(transformerRegistry),
    executeTransformation: transformerRegistry.executeTransformation.bind(transformerRegistry)
  };
}
