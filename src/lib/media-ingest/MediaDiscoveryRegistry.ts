/**
 * MediaDiscoveryRegistry
 *
 * Registry for all available media metadata discovery implementations.
 * This class manages the registration and retrieval of discovery implementations
 * for different media types.
 */

import { MediaType } from '../types';
import { MediaMetadataDiscovery } from './types';
import { FFMPEGAudioDiscovery } from './FFMPEGAudioDiscovery';
import { FFMPEGVideoDiscovery } from './FFMPEGVideoDiscovery'; // Corrected import

/**
 * Registry for media metadata discovery implementations
 */
export class MediaDiscoveryRegistry {
  // Map of media type to array of discovery implementations
  private registry: Map<MediaType, MediaMetadataDiscovery<any>[]> = new Map();
  private initialized: boolean = false;

  /**
   * Register a discovery implementation
   * @param discovery Discovery implementation to register
   */
  public register(discovery: MediaMetadataDiscovery<any>): void {
    const mediaType = discovery.getSupportedMediaType();
    const id = discovery.getId();

    // Initialize array if it doesn't exist
    if (!this.registry.has(mediaType)) {
      this.registry.set(mediaType, []);
    }

    // Get existing array
    const discoveries = this.registry.get(mediaType)!;

    // Check if discovery with this ID already exists
    const existingIndex = discoveries.findIndex(d => d.getId() === id);
    if (existingIndex >= 0) {
      // Skip if already registered (don't replace the existing one)
      // console.log(`MediaDiscoveryRegistry: Discovery ${id} already registered for media type ${mediaType}`);
      return;
    }

    // Add new discovery implementation
    discoveries.push(discovery);
    console.log(`MediaDiscoveryRegistry: Registered discovery ${id} for media type ${mediaType}`);

    // Sort by priority (highest first)
    discoveries.sort((a, b) => b.getPriority() - a.getPriority());
    
    this.initialized = true;
  }

  /**
   * Get all discovery implementations for a media type
   * @param mediaType Media type to get discoveries for
   * @returns Array of discovery implementations
   */
  public getDiscoveries(mediaType: MediaType): MediaMetadataDiscovery<any>[] {
    return this.registry.get(mediaType) || [];
  }

  /**
   * Get discovery implementation by ID
   * @param id ID of the discovery implementation
   * @returns Discovery implementation or undefined if not found
   */
  public getDiscoveryById(id: string): MediaMetadataDiscovery<any> | undefined {
    // Iterate through all discoveries
    for (const discoveries of this.registry.values()) {
      const discovery = discoveries.find(d => d.getId() === id);
      if (discovery) {
        return discovery;
      }
    }

    return undefined;
  }

  /**
   * Get best matching discovery implementations for a file
   * This method checks which discoveries can handle the file and returns them in priority order
   * @param path Path to the file
   * @returns Promise that resolves to an array of discovery implementations
   */
  public async getBestMatchingDiscoveries(path: string): Promise<MediaMetadataDiscovery<any>[]> {
    console.log(`MediaDiscoveryRegistry: Finding best matching discoveries for file: ${path}`);
    const matches: MediaMetadataDiscovery<any>[] = [];

    // Log all registered media types and discoveries
    console.log(`MediaDiscoveryRegistry: Registered media types: ${Array.from(this.registry.keys()).join(', ')}`);
    console.log(`MediaDiscoveryRegistry: Total registered discoveries: ${this.getAllDiscoveries().length}`);

    // Check each media type
    for (const [mediaType, discoveries] of this.registry.entries()) {
      console.log(`MediaDiscoveryRegistry: Checking ${discoveries.length} discoveries for media type: ${mediaType}`);

      // Check each discovery
      for (const discovery of discoveries) {
        try {
          console.log(`MediaDiscoveryRegistry: Testing discovery: ${discovery.getId()}`);

          // Check if this discovery can handle the file
          const canHandle = await discovery.canHandle(path);
          console.log(`MediaDiscoveryRegistry: Discovery ${discovery.getId()} ${canHandle ? 'can' : 'cannot'} handle file`);

          if (canHandle) {
            matches.push(discovery);
          }
        } catch (error) {
          console.error(`Error checking if discovery ${discovery.getId()} can handle file ${path}:`, error);
        }
      }
    }

    // Sort by priority (highest first)
    matches.sort((a, b) => b.getPriority() - a.getPriority());

    console.log(`MediaDiscoveryRegistry: Found ${matches.length} matching discoveries: ${matches.map(d => d.getId()).join(', ')}`);

    return matches;
  }

  /**
   * Get all registered discovery implementations
   * @returns All registered discovery implementations
   */
  public getAllDiscoveries(): MediaMetadataDiscovery<any>[] {
    const allDiscoveries: MediaMetadataDiscovery<any>[] = [];

    // Iterate through all discoveries
    for (const discoveries of this.registry.values()) {
      allDiscoveries.push(...discoveries);
    }

    return allDiscoveries;
  }

  /**
   * Get all registered media types
   * @returns All registered media types
   */
  public getRegisteredMediaTypes(): MediaType[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Clear the registry
   */
  public clear(): void {
    this.registry.clear();
    this.initialized = false;
  }

  /**
   * Check if the registry is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}

// Create singleton instance
export const mediaDiscoveryRegistry = new MediaDiscoveryRegistry();

// Optionally, auto-register known discoveries here if not done elsewhere
// For example:
mediaDiscoveryRegistry.register(new FFMPEGVideoDiscovery());
mediaDiscoveryRegistry.register(new FFMPEGAudioDiscovery());
