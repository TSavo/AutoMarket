/**
 * Media Ingest System - Main Entry Point
 *
 * This file provides a convenient way to initialize and use the media ingest system.
 */

import { AssetManager } from '../AssetManager';
import { MediaIngestService } from './MediaIngestService';
import { MediaDiscoveryRegistry } from './MediaDiscoveryRegistry';
import { DerivativeMediaHandlerImpl } from './DerivativeMediaHandler';
// Import discovery implementations
import { ExifMediaDiscovery } from './ExifMediaDiscovery';
import { FFMPEGVideoDiscovery } from './FFMPEGVideoDiscovery';
import { FFMPEGAudioDiscovery } from './FFMPEGAudioDiscovery';
import { FontkitMediaDiscovery } from './implementations/FontkitMediaDiscovery';
import { PngMediaDiscovery } from './implementations/PngMediaDiscovery';

// Export all the components for direct imports
export { MediaIngestService } from './MediaIngestService';
export { MediaDiscoveryRegistry } from './MediaDiscoveryRegistry';
export { ExifMediaDiscovery } from './ExifMediaDiscovery';
export { FFMPEGVideoDiscovery } from './FFMPEGVideoDiscovery';
export { FFMPEGAudioDiscovery } from './FFMPEGAudioDiscovery';
export { FontkitMediaDiscovery } from './implementations/FontkitMediaDiscovery';
export { PngMediaDiscovery } from './implementations/PngMediaDiscovery';
export { DerivativeMediaHandlerImpl, DerivativeType } from './DerivativeMediaHandler';

// Export types
export * from './types';

// Singleton instances for easy access
const assetManager = new AssetManager();
const mediaDiscoveryRegistry = new MediaDiscoveryRegistry();
const derivativeMediaHandler = new DerivativeMediaHandlerImpl(assetManager);
const mediaIngestService = new MediaIngestService(assetManager);

// Pre-create all known discovery implementations (order matters for priority)
const pngMediaDiscovery = new PngMediaDiscovery();
const exifMediaDiscovery = new ExifMediaDiscovery();
const ffmpegVideoDiscoveryInstance = new FFMPEGVideoDiscovery(derivativeMediaHandler, assetManager);
const ffmpegAudioDiscoveryInstance = new FFMPEGAudioDiscovery();
const fontkitMediaDiscovery = new FontkitMediaDiscovery(derivativeMediaHandler);

/**
 * Register the default set of discovery implementations
 * This is done separately from initialization to allow flexibility
 */
function registerDefaults(): void {
  mediaDiscoveryRegistry.register(pngMediaDiscovery); // Highest priority for PNG files
  mediaDiscoveryRegistry.register(exifMediaDiscovery);
  mediaDiscoveryRegistry.register(ffmpegVideoDiscoveryInstance);
  mediaDiscoveryRegistry.register(ffmpegAudioDiscoveryInstance);
  mediaDiscoveryRegistry.register(fontkitMediaDiscovery);

  console.log(`Default media discoveries registered (${mediaDiscoveryRegistry.getAllDiscoveries().length} total)`);
}

/**
 * Initialize the media ingest system
 * This ensures everything is properly set up
 * @returns Promise that resolves when initialization is complete
 */
async function initialize(): Promise<void> {
  console.log('Initializing media ingest system...');

  // Register default discoveries if not already registered
  if (mediaDiscoveryRegistry.getAllDiscoveries().length === 0) {
    registerDefaults();
  }

  // Initialize the asset manager first
  if (!assetManager.isInitialized()) {
    await assetManager.initialize();
  }

  // Initialize the media ingest service
  await mediaIngestService.initialize();

  console.log(`Media ingest system initialized with ${mediaDiscoveryRegistry.getAllDiscoveries().length} discoveries.`);
}

// Export singleton instances and helper functions
export {
  assetManager,
  mediaDiscoveryRegistry,
  mediaIngestService,
  derivativeMediaHandler,
  initialize,
  registerDefaults
};