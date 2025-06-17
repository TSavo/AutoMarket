/**
 * Light-weight derivative retrieval service
 * 
 * This module provides functionality for retrieving derivative assets
 * without importing heavy media processing dependencies.
 */

import { AssetManager } from '../AssetManager';
import { BaseAsset } from '../types';
import { DerivativeAsset, DerivativeType } from './types';

/**
 * Extended DerivativeAsset interface to add fields needed by the UI
 */
export interface ExtendedDerivativeAsset extends DerivativeAsset {
  title?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  format?: string;
  dateCreated: string;
  sourceAssetId: string;  // Renamed from sourceId for UI compatibility
}

/**
 * Service for retrieving derivative assets without the processing components
 */
export class DerivativeRetriever {
  private assetManager: AssetManager;
  private initialized = false;

  /**
   * Creates a new DerivativeRetriever
   * 
   * @param assetManager - The asset manager instance to use
   */
  constructor(assetManager: AssetManager) {
    this.assetManager = assetManager;
  }

  /**
   * Initializes the retriever
   */
  async initialize(): Promise<void> {
    if (!this.assetManager.isInitialized()) {
      await this.assetManager.initialize();
    }
    this.initialized = true;
  }

  /**
   * Checks if the retriever is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Gets derivatives for a specific asset
   * 
   * @param assetId - The ID of the source asset
   * @param type - Optional type filter
   * @returns An array of derivative assets
   */
  async getDerivativesForAsset(assetId: string, type?: DerivativeType): Promise<ExtendedDerivativeAsset[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Get the source asset
    const sourceAsset = await this.assetManager.getAssetById(assetId);
    if (!sourceAsset) {
      return [];
    }

    // Find all derivative tags
    const derivativeTags = sourceAsset.tags.filter(tag => tag.startsWith('derivative:'));
    
    // Return empty array if no derivatives
    if (derivativeTags.length === 0) {
      return [];
    }

    // Process each derivative tag
    const derivatives: ExtendedDerivativeAsset[] = [];
    
    for (const tag of derivativeTags) {
      const derivativeId = tag.substring('derivative:'.length);
      const derivativeAsset = await this.assetManager.getAssetById(derivativeId);
      
      if (derivativeAsset) {
        // Extract derivative type from tags
        const typeTag = derivativeAsset.tags.find(t => 
          Object.values(DerivativeType).includes(t as DerivativeType)
        ) as DerivativeType | undefined;
        
        // Skip if type filter is provided and doesn't match
        if (type && typeTag !== type) {
          continue;
        }

        // Create derivative asset with additional fields for UI compatibility
        const derivative: ExtendedDerivativeAsset = {
          id: derivativeAsset.id,
          path: derivativeAsset.path,
          type: typeTag || DerivativeType.PREVIEW, // Default to preview if not found
          tags: derivativeAsset.tags,
          sourceId: assetId,
          // Additional fields for UI compatibility
          sourceAssetId: assetId,
          dateCreated: derivativeAsset.dateCreated || new Date().toISOString(),
          title: derivativeAsset.title || `${typeTag || 'Derivative'} ${derivativeAsset.id.substring(0, 8)}`,
          // Safely extract properties that may not be on all asset types
          width: (derivativeAsset as any).width,
          height: (derivativeAsset as any).height,
          fileSize: derivativeAsset.fileSize,
          format: (derivativeAsset as any).format
        };

        derivatives.push(derivative);
      }
    }

    return derivatives;
  }
}
