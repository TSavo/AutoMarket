/**
 * DerivativeMediaHandler
 *
 * Interface and implementation for managing derivative media assets.
 * This includes thumbnails, previews, screenshots, etc. that are
 * derived from other media assets.
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
  ImageAsset,
  ImageFormat
} from '../image';
import { AssetManager } from '../AssetManager';

/**
 * Standard derivative types for consistent tagging
 */
export enum DerivativeType {
  THUMBNAIL = 'thumbnail',
  PREVIEW = 'preview',
  SCREENCAP = 'screencap',
  WAVEFORM = 'waveform',
  FONT_SAMPLE = 'font-sample',
  VIDEO_PREVIEW = 'video-preview'
}

/**
 * Options for registering a derivative media asset
 */
export interface DerivativeMediaOptions {
  /**
   * Path to the derivative file
   */
  path: string;

  /**
   * Original source asset ID
   */
  sourceAssetId: string;

  /**
   * Derivative type for tagging
   */
  derivativeType: DerivativeType;

  /**
   * Optional title for the derivative
   */
  title?: string;

  /**
   * Optional description for the derivative
   */
  description?: string;

  /**
   * Optional additional tags
   */
  additionalTags?: string[];

  /**
   * Optional content purpose
   */
  contentPurpose?: ContentPurpose[];

  /**
   * Optional width (for images)
   */
  width?: number;

  /**
   * Optional height (for images)
   */
  height?: number;

  /**
   * Whether to generate a new ID (default: true)
   */
  generateId?: boolean;
}

/**
 * Result of registering a derivative media asset
 */
export interface DerivativeMediaResult {
  /**
   * Whether the registration was successful
   */
  success: boolean;

  /**
   * The registered derivative asset (if successful)
   */
  asset?: BaseAsset;

  /**
   * The ID of the registered derivative asset (if successful)
   */
  derivativeId?: string;

  /**
   * Error message (if unsuccessful)
   */
  error?: string;

  /**
   * Warnings (if any)
   */
  warnings?: string[];
}

/**
 * Interface for derivative media handling
 */
export interface DerivativeMediaHandler {
  /**
   * Initialize the derivative media handler
   */
  initialize(): Promise<void>;

  /**
   * Check if the derivative media handler is initialized
   */
  isInitialized(): boolean;

  /**
   * Register a derivative media asset
   * @param options Options for registering the derivative
   */
  registerDerivative(options: DerivativeMediaOptions): Promise<DerivativeMediaResult>;

  /**
   * Get all derivatives for a source asset
   * @param sourceAssetId The ID of the source asset
   * @param derivativeType Optional type to filter by
   */
  getDerivativesForAsset(sourceAssetId: string, derivativeType?: DerivativeType): Promise<BaseAsset[]>;

  /**
   * Update the source asset with links to its derivatives
   * @param sourceAssetId The ID of the source asset
   * @param derivativeIds The IDs of the derivatives
   */
  updateSourceAssetDerivativeLinks(
    sourceAssetId: string,
    derivativeIds: string[]
  ): Promise<boolean>;
}

/**
 * Implementation of DerivativeMediaHandler
 */
export class DerivativeMediaHandlerImpl implements DerivativeMediaHandler {
  private assetManager: AssetManager;
  private initialized: boolean = false;

  /**
   * Create a new DerivativeMediaHandlerImpl
   * @param assetManager AssetManager instance
   */
  constructor(assetManager: AssetManager) {
    this.assetManager = assetManager;
  }

  /**
   * Initialize the derivative media handler
   */
  public async initialize(): Promise<void> {
    console.log('Initializing DerivativeMediaHandler');

    // Ensure the asset manager is initialized
    if (!this.assetManager.isInitialized()) {
      console.log('Initializing AssetManager from DerivativeMediaHandler');
      await this.assetManager.initialize();
    }

    this.initialized = true;
    console.log('DerivativeMediaHandler initialized successfully');
  }

  /**
   * Check if the derivative media handler is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Register a derivative media asset
   * @param options Options for registering the derivative
   */
  public async registerDerivative(options: DerivativeMediaOptions): Promise<DerivativeMediaResult> {
    try {
      // Ensure the handler is initialized
      if (!this.initialized) {
        console.log('Initializing DerivativeMediaHandler before registering derivative');
        await this.initialize();
      }

      // Check if the source asset exists and get it as a class instance
      const sourceAssetClass = this.assetManager.getAssetClassById(options.sourceAssetId);
      if (!sourceAssetClass) {
        return {
          success: false,
          error: `Source asset with ID ${options.sourceAssetId} not found`
        };
      }

      // Get the plain object for compatibility with existing code
      const sourceAsset = sourceAssetClass.toObject();

      // Check if the derivative file exists
      if (!fs.existsSync(options.path)) {
        return {
          success: false,
          error: `Derivative file not found: ${options.path}`
        };
      }

      // Determine the media type based on file extension
      const mediaType = this.determineMediaType(options.path);
      if (mediaType === undefined) {
        return {
          success: false,
          error: `Unsupported file type: ${path.extname(options.path)}`
        };
      }

      // Generate ID
      const id = options.generateId !== false ? uuidv4() : path.basename(options.path, path.extname(options.path));

      // Get file stats
      const stats = fs.statSync(options.path);

      // Calculate relative path
      const relativePath = this.getRelativePath(options.path);

      // Create base asset with appropriate tags (no inheritance from source)
      const allTags = [
        options.derivativeType, // The derivative type (e.g., 'thumbnail')
        `source:${sourceAsset.id}`, // The source relationship
        // Add media type tag based on the determined media type
        mediaType === MediaType.IMAGE ? 'image' :
        mediaType === MediaType.VIDEO ? 'video' :
        mediaType === MediaType.AUDIO ? 'audio' :
        mediaType === MediaType.FONT ? 'font' : '',
        // Add any additional tags specified in the options
        ...(options.additionalTags || [])
      ];
      // Use a Set to ensure uniqueness
      const uniqueTags = [...new Set(allTags)];

      console.log(`Creating derivative asset with ${uniqueTags.length} unique tags (from ${allTags.length} total)`);

      const baseAsset: BaseAsset = {
        id,
        path: relativePath,
        filename: path.basename(options.path),
        type: mediaType,
        title: options.title || `${options.derivativeType} of ${sourceAsset.title}`,
        description: options.description || `${options.derivativeType} generated from ${sourceAsset.title}`,
        tags: uniqueTags,
        contentPurpose: options.contentPurpose || this.getContentPurposeForDerivative(options.derivativeType),
        dateCreated: new Date().toISOString(),
        dateModified: new Date().toISOString(),
        author: sourceAsset.author || '',
        license: sourceAsset.license || '',
        fileSize: stats.size
      };

      // Add image-specific properties if it's an image and dimensions are provided
      if (mediaType === MediaType.IMAGE && options.width && options.height) {
        // First create a basic image asset with required properties
        const imageAsset = baseAsset as ImageAsset;
        imageAsset.width = options.width;
        imageAsset.height = options.height;
        imageAsset.format = this.determineImageFormat(options.path);
        imageAsset.optimized = false;
        imageAsset.hasResponsiveVersions = false;

        // Add basic image tag
        if (!imageAsset.tags.includes('image')) {
          imageAsset.tags.push('image');
        }

        // We'll use the ImageAssetClass methods after adding to the asset manager
      }

      // Check if a derivative with the same source and type already exists
      const existingDerivatives = await this.getDerivativesForAsset(
        options.sourceAssetId,
        options.derivativeType
      );

      if (existingDerivatives.length > 0) {
        // Update the existing derivative instead of creating a new one
        const existingDerivative = existingDerivatives[0];

        console.log(`Found existing derivative with ID ${existingDerivative.id}, updating instead of creating new one`);

        // Combine tags from existing derivative and new base asset
        const combinedTags = [...existingDerivative.tags, ...baseAsset.tags];

        // Ensure tags are unique
        const uniqueTags = [...new Set(combinedTags)];

        console.log(`Merging tags: ${existingDerivative.tags.length} existing + ${baseAsset.tags.length} new = ${uniqueTags.length} unique`);

        // Merge properties
        const updatedAsset: BaseAsset = {
          ...existingDerivative,
          path: baseAsset.path,
          filename: baseAsset.filename,
          title: baseAsset.title,
          description: baseAsset.description,
          tags: uniqueTags,
          dateModified: baseAsset.dateModified,
          fileSize: baseAsset.fileSize
        };

        // Update asset
        await this.assetManager.updateAsset(updatedAsset);

        console.log(`Updated existing derivative asset with ID ${updatedAsset.id}`);

        return {
          success: true,
          asset: updatedAsset,
          derivativeId: updatedAsset.id,
          warnings: ['Updated existing derivative asset instead of creating a new one']
        };
      }

      // Add asset
      const addedAsset = await this.assetManager.addAsset(baseAsset);

      // If it's an image, set the appropriate properties directly
      if (baseAsset.type === MediaType.IMAGE && options.width && options.height) {
        try {
          // Update the image asset with dimensions and format
          const imageAsset = addedAsset as ImageAsset;
          imageAsset.width = options.width;
          imageAsset.height = options.height;
          imageAsset.format = this.determineImageFormat(options.path);

          // Calculate aspect ratio based on dimensions
          const ratio = options.width / options.height;

          // Set aspect ratio based on common ratios
          if (Math.abs(ratio - 16/9) < 0.05) {
            imageAsset.aspectRatio = '16:9';
          } else if (Math.abs(ratio - 4/3) < 0.05) {
            imageAsset.aspectRatio = '4:3';
          } else if (Math.abs(ratio - 1) < 0.05) {
            imageAsset.aspectRatio = '1:1';
          } else if (Math.abs(ratio - 3/2) < 0.05) {
            imageAsset.aspectRatio = '3:2';
          } else if (Math.abs(ratio - 21/9) < 0.05) {
            imageAsset.aspectRatio = '21:9';
          } else {
            // For custom aspect ratios, calculate the simplified ratio
            const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
            const divisor = gcd(options.width, options.height);
            const simplifiedWidth = options.width / divisor;
            const simplifiedHeight = options.height / divisor;
            imageAsset.aspectRatio = `${simplifiedWidth}:${simplifiedHeight}`;
          }

          // Add appropriate tags
          if (!imageAsset.tags.includes('width:' + options.width)) {
            imageAsset.tags.push('width:' + options.width);
          }

          if (!imageAsset.tags.includes('height:' + options.height)) {
            imageAsset.tags.push('height:' + options.height);
          }

          if (!imageAsset.tags.includes('aspectRatio:' + imageAsset.aspectRatio)) {
            imageAsset.tags.push('aspectRatio:' + imageAsset.aspectRatio);
          }

          if (!imageAsset.tags.includes('format:' + imageAsset.format)) {
            imageAsset.tags.push('format:' + imageAsset.format);
          }

          // Update the asset
          await this.assetManager.updateAsset(imageAsset);
          console.log(`Updated image asset with dimensions ${options.width}x${options.height} and aspect ratio ${imageAsset.aspectRatio}`);
        } catch (error) {
          console.warn(`Error setting image properties: ${error}`);
          // Continue even if this fails - the basic properties are already set
        }
      }

      // Update source asset with derivative links
      await this.updateSourceAssetDerivativeLinks(
        options.sourceAssetId,
        [addedAsset.id]
      );

      return {
        success: true,
        asset: addedAsset,
        derivativeId: addedAsset.id
      };
    } catch (error) {
      return {
        success: false,
        error: `Error registering derivative: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get all derivatives for a source asset
   * @param sourceAssetId The ID of the source asset
   * @param derivativeType Optional type to filter by
   */
  public async getDerivativesForAsset(
    sourceAssetId: string,
    derivativeType?: DerivativeType
  ): Promise<BaseAsset[]> {
    console.log(`Getting derivatives for asset ${sourceAssetId}, type filter: ${derivativeType || 'none'}`);

    // Ensure the handler is initialized
    if (!this.initialized) {
      console.log('Initializing DerivativeMediaHandler before getting derivatives');
      await this.initialize();
    }

    // Get all assets
    const allAssets = this.assetManager.getMedia();
    console.log(`Total assets in database: ${allAssets.length}`);

    // Filter for derivatives of the source asset
    const derivatives = allAssets.filter(asset => {
      const isSourceMatch = asset.tags.includes(`source:${sourceAssetId}`);
      const isTypeMatch = !derivativeType || asset.tags.includes(derivativeType);
      return isSourceMatch && isTypeMatch;
    });

    console.log(`Found ${derivatives.length} derivatives for asset ${sourceAssetId}`);

    // Log the derivatives for debugging
    if (derivatives.length > 0) {
      derivatives.forEach((derivative, index) => {
        console.log(`Derivative ${index + 1}: ID=${derivative.id}, Type=${derivative.type}, Path=${derivative.path}`);
        console.log(`Tags: ${derivative.tags.join(', ')}`);
      });
    }

    return derivatives;
  }

  /**
   * Update the source asset with links to its derivatives
   * @param sourceAssetId The ID of the source asset
   * @param derivativeIds The IDs of the derivatives to add
   */
  public async updateSourceAssetDerivativeLinks(
    sourceAssetId: string,
    derivativeIds: string[]
  ): Promise<boolean> {
    try {
      // Ensure the handler is initialized
      if (!this.initialized) {
        console.log('Initializing DerivativeMediaHandler before updating source asset derivative links');
        await this.initialize();
      }

      // Get the source asset directly
      const sourceAsset = this.assetManager.getAssetById(sourceAssetId);
      if (!sourceAsset) {
        console.error(`Source asset with ID ${sourceAssetId} not found`);
        return false;
      }

      console.log(`Source asset found with ID ${sourceAssetId}`);

      // Add each derivative tag
      let tagsAdded = 0;
      for (const derivativeId of derivativeIds) {
        const derivativeTag = `derivative:${derivativeId}`;
        if (!sourceAsset.tags.includes(derivativeTag)) {
          sourceAsset.tags.push(derivativeTag);
          tagsAdded++;
        }
      }

      console.log(`Added ${tagsAdded} new derivative tags to source asset ${sourceAssetId}`);

      // Update the asset if tags were added
      if (tagsAdded > 0) {
        await this.assetManager.updateAsset(sourceAsset);
        console.log(`Updated source asset ${sourceAssetId} with derivative links`);
      } else {
        console.log(`No new derivative links to add to source asset ${sourceAssetId}`);
      }

      return true;
    } catch (error) {
      console.error('Error updating source asset derivative links:', error);
      return false;
    }
  }

  /**
   * Get appropriate content purpose for derivative type
   * @param derivativeType The derivative type
   */
  private getContentPurposeForDerivative(derivativeType: DerivativeType): ContentPurpose[] {
    switch (derivativeType) {
      case DerivativeType.THUMBNAIL:
        return [ContentPurpose.THUMBNAIL];
      case DerivativeType.PREVIEW:
        return [ContentPurpose.CONTENT];
      case DerivativeType.SCREENCAP:
        return [ContentPurpose.CONTENT];
      case DerivativeType.WAVEFORM:
        return [ContentPurpose.CONTENT];
      case DerivativeType.FONT_SAMPLE:
        return [ContentPurpose.CONTENT];
      case DerivativeType.VIDEO_PREVIEW:
        return [ContentPurpose.CONTENT, ContentPurpose.THUMBNAIL];
      default:
        return [ContentPurpose.CONTENT];
    }
  }

  // getSourceAssetTags method removed - no longer needed as we're not inheriting tags

  /**
   * Get relative path from project root
   * @param filePath Absolute path to the file
   * @returns Relative path from project root
   */
  private getRelativePath(filePath: string): string {
    // Try to find 'public' directory in path
    const publicIndex = filePath.indexOf('public');

    if (publicIndex !== -1) {
      // Return path relative to public directory
      return filePath.substring(publicIndex + 'public'.length).replace(/\\/g, '/');
    }

    // If public directory not found, return the file name
    return '/' + path.basename(filePath);
  }

  /**
   * Determine media type from file extension
   * @param filePath Path to the file
   */
  private determineMediaType(filePath: string): MediaType | undefined {
    const ext = path.extname(filePath).toLowerCase().substring(1);

    // Common image extensions
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(ext)) {
      return MediaType.IMAGE;
    }

    // Common video extensions
    if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
      return MediaType.VIDEO;
    }

    // Common audio extensions
    if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(ext)) {
      return MediaType.AUDIO;
    }

    // Common font extensions
    if (['ttf', 'otf', 'woff', 'woff2'].includes(ext)) {
      return MediaType.FONT;
    }

    return undefined;
  }

  /**
   * Determine image format from file extension
   * @param filePath Path to the file
   */
  private determineImageFormat(filePath: string): ImageFormat {
    const ext = path.extname(filePath).toLowerCase().substring(1);

    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return ImageFormat.JPEG;
      case 'png':
        return ImageFormat.PNG;
      case 'gif':
        return ImageFormat.GIF;
      case 'webp':
        return ImageFormat.WEBP;
      case 'svg':
        return ImageFormat.SVG;
      case 'avif':
        return ImageFormat.AVIF;
      default:
        // Default to JPEG if unknown
        return ImageFormat.JPEG;
    }
  }

  // Method removed - now using the common utility directly
}
