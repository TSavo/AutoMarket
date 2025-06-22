/**
 * Provider Bootstrap System
 * 
 * This is the single entry point for provider registration.
 * All providers register themselves when their modules are imported.
 * 
 * Usage:
 *   import { initializeProviders } from './bootstrap';
 *   await initializeProviders();
 */

import { ProviderRegistry } from './ProviderRegistry';

/**
 * Initialize all providers by importing their modules
 * This triggers side-effect registration
 */
export async function initializeProviders(): Promise<void> {
  console.log('🏗️ Initializing provider registry...');
  
  const registry = ProviderRegistry.getInstance();
  
  // Import all provider modules - this triggers their self-registration
  const providerImports = [
    () => import('../providers/openrouter/OpenRouterProvider'),
    () => import('../providers/falai/FalAiProvider'), 
    () => import('../providers/together/TogetherProvider'),
    () => import('../providers/replicate/ReplicateProvider'),
    () => import('../providers/docker/ffmpeg/FFMPEGDockerProvider'),
    () => import('../providers/docker/chatterbox/ChatterboxDockerProvider'),
    () => import('../providers/docker/whisper/WhisperDockerProvider'),
  ];
  
  // Import all providers concurrently
  const results = await Promise.allSettled(
    providerImports.map(importFn => importFn())
  );
  
  // Log results
  let successCount = 0;
  let errorCount = 0;
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successCount++;
    } else {
      errorCount++;
      console.warn(`Failed to import provider ${index}:`, result.reason);
    }
  });
  
  const stats = registry.getStats();
  
  console.log(`✅ Provider registry initialized:`);
  console.log(`   Imports: ${successCount} successful, ${errorCount} failed`);
  console.log(`   Registered: ${stats.totalProviders} providers`);
  console.log(`   Available: ${registry.getAvailableProviders().join(', ')}`);
}

/**
 * Get a provider from the registry (convenience function)
 */
export async function getProvider(id: string) {
  const registry = ProviderRegistry.getInstance();
  return registry.getProvider(id);
}

/**
 * Check if providers are initialized
 */
export function isInitialized(): boolean {
  const registry = ProviderRegistry.getInstance();
  return registry.getAvailableProviders().length > 0;
}
