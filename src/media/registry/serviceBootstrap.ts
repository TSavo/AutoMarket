/**
 * Service Bootstrap System
 * 
 * Single entry point for service registration.
 * All services register themselves when their modules are imported.
 * 
 * Usage:
 *   import { initializeServices } from './serviceBootstrap';
 *   await initializeServices();
 */

import { ServiceRegistry } from './ServiceRegistry';

// Re-export the registry for convenience
export { ServiceRegistry } from './ServiceRegistry';

/**
 * Initialize all services by importing their modules
 * This triggers side-effect registration
 */
export async function initializeServices(): Promise<void> {
  console.log('🐳 Initializing service registry...');
  
  const registry = ServiceRegistry.getInstance();
  
  // Import all service modules - this triggers their self-registration
  const serviceImports = [
    () => import('../services/HuggingFaceDockerService'),
    () => import('../services/ChatterboxDockerService'),
    () => import('../services/FFMPEGDockerService'),
    () => import('../services/WhisperDockerService'),
    () => import('../services/KokoroDockerService'),
    () => import('../services/ZonosDockerService'),
    () => import('../services/OllamaDockerService'),
  ];
  
  // Import all services concurrently
  const results = await Promise.allSettled(
    serviceImports.map(importFn => importFn())
  );
  
  // Log results
  let successCount = 0;
  let errorCount = 0;
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successCount++;
    } else {
      errorCount++;
      console.warn(`Failed to import service ${index}:`, result.reason);
    }
  });
  
  const stats = registry.getStats();
  
  console.log(`✅ Service registry initialized:`);
  console.log(`   Imports: ${successCount} successful, ${errorCount} failed`);
  console.log(`   Registered: ${stats.totalServices} services`);
  console.log(`   Available: ${registry.getAvailableServices().join(', ')}`);
}

/**
 * Get a service from the registry (convenience function)
 */
export async function getService(id: string, config?: any) {
  const registry = ServiceRegistry.getInstance();
  return registry.getService(id, config);
}

/**
 * Get all services (convenience function)
 */
export async function getServices() {
  const registry = ServiceRegistry.getInstance();
  return registry.getServices();
}

/**
 * Start all services (convenience function)
 */
export async function startAllServices() {
  const registry = ServiceRegistry.getInstance();
  return registry.startAllServices();
}

/**
 * Stop all services (convenience function)
 */
export async function stopAllServices() {
  const registry = ServiceRegistry.getInstance();
  return registry.stopAllServices();
}

/**
 * Get status of all services (convenience function)
 */
export async function getAllServiceStatus() {
  const registry = ServiceRegistry.getInstance();
  return registry.getAllServiceStatus();
}

/**
 * Check if services are initialized
 */
export function isInitialized(): boolean {
  const registry = ServiceRegistry.getInstance();
  return registry.getAvailableServices().length > 0;
}
