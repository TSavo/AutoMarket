/**
 * BaseMediaDiscovery
 *
 * Abstract base class for media metadata discovery implementations.
 * This class provides common functionality for all discovery implementations.
 */

import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  BaseAsset,
  MediaType,
  ContentPurpose
} from '../types';
import {
  MediaMetadataDiscovery,
  MediaIngestOptions,
  MediaIngestResult
} from './types';

/**
 * Abstract base class for media metadata discovery
 */
export abstract class BaseMediaDiscovery<T extends BaseAsset> implements MediaMetadataDiscovery<T> {
  /**
   * Get the unique identifier for this discovery implementation
   */
  public abstract getId(): string;

  /**
   * Get the display name for this discovery implementation
   */
  public abstract getName(): string;

  /**
   * Get the media type this discovery implementation supports
   */
  public abstract getSupportedMediaType(): MediaType;

  /**
   * Get the priority of this discovery implementation (higher number = higher priority)
   */
  public abstract getPriority(): number;

  /**
   * Check if this discovery implementation can handle the given file
   * @param path Path to the file
   */
  public abstract canHandle(path: string): Promise<boolean>;

  /**
   * Discover metadata from the given file and create an asset object
   * @param path Path to the file
   * @param options Options for the discovery process
   */
  public abstract discoverMetadata(filePath: string, options: MediaIngestOptions): Promise<MediaIngestResult<T>>;

  /**
   * Create a base asset object with common properties
   * @param filePath Path to the file
   * @param options Options for the discovery process
   * @returns Base asset object
   */
  protected createBaseAsset(filePath: string, options: MediaIngestOptions): BaseAsset {
    // Generate ID if requested, otherwise use filename without extension
    const id = options.generateId
      ? uuidv4()
      : path.basename(filePath, path.extname(filePath));

    // Get file stats
    const stats = fs.statSync(filePath);

    // Calculate relative path from project root if possible
    const relativePath = this.getRelativePath(filePath);

    // Determine the filename to use for the title - prefer original if available
    const originalFilename = options.originalFilename || path.basename(filePath);
    const titleFilename = path.basename(originalFilename, path.extname(originalFilename));

    console.log(`Asset title creation:`, {
      originalFilename,
      titleFilename,
      defaultTitle: options.defaultTitle
    });

    // Ensure tags are unique
    const defaultTags = options.defaultTags || [];
    const uniqueTags = [...new Set(defaultTags)];

    if (defaultTags.length !== uniqueTags.length) {
      console.log(`Removed ${defaultTags.length - uniqueTags.length} duplicate tags from default tags`);
    }

    // Create base asset
    const baseAsset: BaseAsset = {
      id,
      path: relativePath,
      filename: path.basename(filePath),
      type: this.getSupportedMediaType(),
      title: options.defaultTitle || titleFilename,
      description: options.defaultDescription || '',
      tags: uniqueTags,
      contentPurpose: (options.defaultContentPurpose?.map(p => p as ContentPurpose) || [ContentPurpose.CONTENT]),
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      author: options.author || '',
      license: options.license || '',
      fileSize: stats.size
    };

    return baseAsset;
  }

  /**
   * Get relative path from project root
   * @param filePath Absolute path to the file
   * @returns Relative path from project root
   */
  protected getRelativePath(filePath: string): string {
    // Check if the file is in the public folder already
    const publicIndex = filePath.indexOf('public');

    if (publicIndex !== -1) {
      // Return path relative to public directory
      return filePath.substring(publicIndex + 'public'.length).replace(/\\/g, '/');
    }

    // For external files, preserve directory structure when copying
    // Try to detect if this looks like a structured import (has multiple levels)
    const pathParts = filePath.split(path.sep);
    const filename = path.basename(filePath);
    
    // Look for common bulk import patterns
    let targetSubPath = 'uploads'; // default
    
    // If path contains common media folders, preserve that structure
    const mediaFolders = ['videos', 'images', 'audio', 'media', 'assets'];
    const bulkFolders = ['bulk_uploads', 'imports', 'temp', 'staging'];
    
    // Find the index of a media folder or bulk folder in the path
    let preserveFromIndex = -1;
    for (let i = pathParts.length - 1; i >= 0; i--) {
      const part = pathParts[i].toLowerCase();
      if (mediaFolders.includes(part)) {
        preserveFromIndex = i;
        break;
      }
      // If we find a bulk folder, start preserving from the next folder
      if (bulkFolders.some(bulk => part.includes(bulk.toLowerCase()))) {
        preserveFromIndex = i + 1;
        break;
      }
    }
    
    // Build target path preserving structure
    if (preserveFromIndex >= 0 && preserveFromIndex < pathParts.length - 1) {
      // Preserve structure from the detected folder onwards
      const preservedParts = pathParts.slice(preserveFromIndex, -1); // exclude filename
      targetSubPath = preservedParts.join('/');
    }
    
    const publicPath = `/${targetSubPath}/${filename}`;
    const publicFullPath = path.join(process.cwd(), 'public', targetSubPath, filename);

    // Create target directory if it doesn't exist
    const targetDir = path.join(process.cwd(), 'public', targetSubPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log(`Created directory: ${targetDir}`);
    }

    // Copy the file to the public directory
    try {
      fs.copyFileSync(filePath, publicFullPath);
      console.log(`Copied file preserving structure: ${filePath} -> ${publicFullPath}`);
    } catch (error) {
      console.error(`Error copying file to public directory: ${error instanceof Error ? error.message : String(error)}`);
    }

    return publicPath.replace(/\\/g, '/');
  }

  /**
   * Extract tags from filename and path
   * @param filePath Path to the file
   * @returns Array of extracted tags
   * @deprecated This method is no longer used as we don't want to generate tags from file paths
   */
  protected extractTagsFromPath(filePath: string): string[] {
    // This method is deprecated and returns an empty array
    console.log(`Tag extraction from paths is disabled`);
    return [];
  }

  /**
   * Create success result with asset
   * @param asset The asset to include in the result
   * @param warnings Optional array of warnings
   * @returns Success result with asset
   */
  protected createSuccessResult(asset: T, warnings?: string[]): MediaIngestResult<T> {
    return {
      success: true,
      asset,
      warnings
    };
  }

  /**
   * Create error result
   * @param error Error message
   * @returns Error result
   */
  protected createErrorResult(error: string): MediaIngestResult<T> {
    return {
      success: false,
      error
    };
  }
}
