/**
 * AutoMarket Providers Package
 * 
 * Exports all provider implementations and utilities
 */

// Core provider implementations
export { ReplicateAdapter } from './adapters/ReplicateAdapter';
export { FalAiAdapter } from './adapters/FalAiAdapter';
export { CreatifyAdapter } from './remote/CreatifyProvider';
export { ChatterboxProvider } from './local/ChatterboxProvider';

// Provider factory and utilities
export { 
  ProviderFactory, 
  createProviderRegistry, 
  demonstrateProviders,
  type ProviderFactoryConfig 
} from './ProviderFactory';

// Re-export core types for convenience
export {
  MediaProvider,
  ProviderRegistry,
  MediaCapability,
  ProviderType,
  JobStatus,
  ProviderModel,
  ProviderConfig,
  GenerationRequest,
  GenerationResult
} from '@automarket/core';
