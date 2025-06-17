/**
 * Media Ingest System - Serverless Build Optimized Entry Point
 * 
 * This file provides access to the media ingest system in a way that
 * avoids importing heavy dependencies at build time. This is useful
 * for serverless functions that only need part of the media system.
 */

import { AssetManager } from './AssetManager';
import { DerivativeRetriever } from './derivatives/DerivativeRetriever';
import { DerivativeType } from './derivatives/types';

// Singleton instances for easy access
const assetManager = new AssetManager();
const derivativeRetriever = new DerivativeRetriever(assetManager);

/**
 * Initialize all required services
 * 
 * Use this when you only need asset management and derivative retrieval
 * without the full media processing pipeline
 */
async function initializeServices(): Promise<void> {
  if (!assetManager.isInitialized()) {
    await assetManager.initialize();
  }
  
  if (!derivativeRetriever.isInitialized()) {
    await derivativeRetriever.initialize();
  }
  
  console.log('Lightweight media services initialized');
}

export {
  assetManager,
  derivativeRetriever,
  initializeServices,
  DerivativeType
};
