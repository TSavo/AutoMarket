/**
 * MediaIngestService
 *
 * Service for ingesting media files and extracting metadata.
 * This class orchestrates the ingest process using a hardcoded list of discovery implementations.
 */

import path from 'path';
import fs from 'fs';
import { BaseAsset, MediaType, VideoAsset } from '../types';
import { AssetManager } from '../AssetManager';
import {
  MediaIngestOptions,
  MediaIngestResult,
  MediaMetadataDiscovery
} from './types';
import { isImageAsset } from '../image';
import { isVideoAsset } from '../video';
import { isAudioAsset } from '../audio';
import { isFontAsset } from '../font';
import { WhisperSTTService } from './WhisperSTTService';

// Import all discovery implementations directly
import { ExifMediaDiscovery } from './ExifMediaDiscovery';
import { FFMPEGVideoDiscovery } from './FFMPEGVideoDiscovery';
import { FFMPEGAudioDiscovery } from './FFMPEGAudioDiscovery';
import { PngMediaDiscovery } from './implementations/PngMediaDiscovery';
import { FontkitMediaDiscovery } from './implementations/FontkitMediaDiscovery';
import { DerivativeMediaHandler, DerivativeMediaHandlerImpl } from './DerivativeMediaHandler'; // Assuming DerivativeMediaHandlerImpl is the concrete class

/**
 * Service for ingesting media files
 */
export class MediaIngestService {
  private assetManager: AssetManager;
  private derivativeMediaHandler: DerivativeMediaHandler;
  private discoverers: MediaMetadataDiscovery<any>[];
  private whisperSTTService: WhisperSTTService;

  /**
   * Create a new MediaIngestService
   * @param assetManager AssetManager instance
   */
  constructor(assetManager: AssetManager) {
    this.assetManager = assetManager;
    // It's common for DerivativeMediaHandler to also need AssetManager
    this.derivativeMediaHandler = new DerivativeMediaHandlerImpl(this.assetManager); 
    this.whisperSTTService = new WhisperSTTService();

    // Instantiate and order discovery mechanisms
    // Order can be important if multiple discoverers can handle the same file type
    this.discoverers = [
      new PngMediaDiscovery(), // Higher priority for PNGs
      new ExifMediaDiscovery(),
      new FFMPEGVideoDiscovery(this.derivativeMediaHandler, this.assetManager),
      new FFMPEGAudioDiscovery(),
      new FontkitMediaDiscovery(this.derivativeMediaHandler),
    ].sort((a, b) => b.getPriority() - a.getPriority()); // Sort by priority, highest first
  }

  /**
   * Initialize the service
   * @returns Promise that resolves when initialization is complete
   */
  public async initialize(): Promise<void> {
    // Ensure the asset manager is initialized
    if (!this.assetManager.isInitialized()) {
      await this.assetManager.initialize();
    }
    // Ensure derivative media handler is initialized
    if (!this.derivativeMediaHandler.isInitialized()) {
      await this.derivativeMediaHandler.initialize();
    }
  }

  /**
   * Get all registered discovery implementations
   * @returns All registered discovery implementations
   */
  private getAllDiscoveries(): MediaMetadataDiscovery<any>[] {
    return this.discoverers;
  }

  /**
   * Get best matching discovery implementations for a file
   * This method checks which discoveries can handle the file and returns them in priority order
   * @param path Path to the file
   * @returns Promise that resolves to an array of discovery implementations
   */
  private async getBestMatchingDiscoveries(filePath: string): Promise<MediaMetadataDiscovery<any>[]> {
    console.log(`MediaIngestService: Finding best matching discoveries for file: ${filePath}`);
    const matches: MediaMetadataDiscovery<any>[] = [];

    for (const discovery of this.discoverers) {
      try {
        console.log(`MediaIngestService: Testing discovery: ${discovery.getId()}`);
        const canHandle = await discovery.canHandle(filePath);
        console.log(`MediaIngestService: Discovery ${discovery.getId()} ${canHandle ? 'can' : 'cannot'} handle file`);
        if (canHandle) {
          matches.push(discovery);
        }
      } catch (error) {
        console.error(`Error checking if discovery ${discovery.getId()} can handle file ${filePath}:`, error);
      }
    }
    // Already sorted by priority in constructor, but if priorities can change, re-sort here.
    // matches.sort((a, b) => b.getPriority() - a.getPriority());
    console.log(`MediaIngestService: Found ${matches.length} matching discoveries: ${matches.map(d => d.getId()).join(', ')}`);
    return matches;
  }


  /**
   * Ingest a media file and extract metadata
   * @param filePath Path to the media file
   * @param options Options for the ingest process
   * @returns Promise that resolves to the ingest result
   */
  public async ingestFile<T extends BaseAsset>(
    filePath: string,
    options: MediaIngestOptions
  ): Promise<MediaIngestResult<T>> {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `File not found: ${filePath}`
        };
      }

      // Get file extension
      const _ext = path.extname(filePath).toLowerCase().substring(1);

      // Get matching discoveries
      console.log(`MediaIngestService.ingestFile: Getting discoveries for file: ${filePath}`);
      // const discoveries = await mediaDiscoveryRegistry.getBestMatchingDiscoveries(filePath); // OLD
      const discoveries = await this.getBestMatchingDiscoveries(filePath); // NEW
      console.log(`MediaIngestService.ingestFile: Found ${discoveries.length} matching discoveries: ${discoveries.map(d => d.getId()).join(', ')}`);

      if (discoveries.length === 0) {
        // Get all registered discoveries for debugging
        // const allDiscoveries = mediaDiscoveryRegistry.getAllDiscoveries(); // OLD
        const allDiscoveries = this.getAllDiscoveries(); // NEW
        console.log(`MediaIngestService.ingestFile: All registered discoveries: ${allDiscoveries.map(d => d.getId()).join(', ')}`);

        // Get file extension
        const ext = path.extname(filePath).toLowerCase();
        console.log(`MediaIngestService.ingestFile: File extension: ${ext}`);

        // Try to read file header for debugging
        try {
          const buffer = Buffer.alloc(8);
          const fd = fs.openSync(filePath, 'r');
          fs.readSync(fd, buffer, 0, 8, 0);
          fs.closeSync(fd);
          console.log(`MediaIngestService.ingestFile: File header bytes: ${buffer.toString('hex')}`);
        } catch (error) {
          console.error(`MediaIngestService.ingestFile: Error reading file header: ${error}`);
        }

        return {
          success: false,
          error: `No suitable discovery implementation found for file: ${filePath}`
        };
      }

      // Use the highest priority discovery that can handle the file
      const discovery = discoveries[0];

      // Discover metadata
      const result = await discovery.discoverMetadata(filePath, options);

      // If successful, add or update asset in the asset manager
      if (result.success && result.asset) {
        const existingAsset = this.assetManager.getAssetById<T>(result.asset.id);

        if (existingAsset && !options.overwriteExisting) {
          return {
            success: false,
            error: `Asset with ID ${result.asset.id} already exists and overwriteExisting is false`
          };
        }

        if (existingAsset) {
          // Update existing asset
          await this.assetManager.updateAsset<T>(result.asset as T);
        } else {
          // Add new asset
          await this.assetManager.addAsset<T>(result.asset as T);
        }

        // If video ingest was successful, trigger async post-processing
        if (isVideoAsset(result.asset)) {
          // Start STT processing in background
          this.processVideoTranscriptAsync(filePath, result.asset.id);
          
          // Start thumbnail generation in background
          this.processVideoThumbnailAsync(filePath, result.asset.id);
        }
      }

      return result as MediaIngestResult<T>;
    } catch (error) {
      return {
        success: false,
        error: `Error ingesting file: ${(error as Error).message}`
      };
    }
  }

  /**
   * Detect media type from file extension
   * @param filePath Path to the media file
   * @returns Detected media type or undefined if not detected
   */
  public detectMediaType(filePath: string): MediaType | undefined {
    const ext = path.extname(filePath).toLowerCase().substring(1);

    // Common image extensions
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'].includes(ext)) {
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
   * Get suitable discovery implementations for a file
   * @param filePath Path to the media file
   * @returns Promise that resolves to an array of discovery implementations
   */
  public async getDiscoveriesForFile(filePath: string): Promise<MediaMetadataDiscovery<any>[]> {
    console.log(`MediaIngestService: Getting discoveries for file: ${filePath}`);

    // Get all registered discoveries for debugging
    // const allDiscoveries = mediaDiscoveryRegistry.getAllDiscoveries(); // OLD
    const allDiscoveries = this.getAllDiscoveries(); // NEW
    console.log(`MediaIngestService: All registered discoveries: ${allDiscoveries.map(d => d.getId()).join(', ')}`);

    // Get best matching discoveries
    // const discoveries = await mediaDiscoveryRegistry.getBestMatchingDiscoveries(filePath); // OLD
    const discoveries = await this.getBestMatchingDiscoveries(filePath); // NEW
    console.log(`MediaIngestService: Found ${discoveries.length} matching discoveries: ${discoveries.map(d => d.getId()).join(', ')}`);

    return discoveries;
  }

  /**
   * Get media type specific asset from base asset
   * @param asset Base asset
   * @returns Type-specific asset or undefined if not recognized
   */
  public getTypedAsset<T extends BaseAsset>(asset: BaseAsset): T | undefined {
    if (isImageAsset(asset)) {
      return asset as unknown as T;
    } else if (isVideoAsset(asset)) {
      return asset as unknown as T;
    } else if (isAudioAsset(asset)) {
      return asset as unknown as T;
    } else if (isFontAsset(asset)) {
      return asset as unknown as T;
    }

    return undefined;
  }

  /**
   * Process video transcript asynchronously (non-blocking)
   * This method is called after successful video ingest to generate transcripts
   * @param filePath Path to the video file
   * @param assetId Asset ID for updating metadata
   */
  private processVideoTranscriptAsync(filePath: string, assetId: string): void {
    // Fire and forget - run STT processing in background
    this.generateVideoTranscript(filePath, assetId).catch(error => {
      console.error(`STT processing failed for ${filePath}:`, error);
      // Could emit event or add to retry queue here
    });
  }

  /**
   * Generate transcript for a video and update asset metadata
   * @param filePath Path to the video file
   * @param assetId Asset ID to update with transcript
   */
  private async generateVideoTranscript(filePath: string, assetId: string): Promise<void> {
    try {
      console.log(`[STT] Starting transcript generation for: ${filePath}`);
      
      // Check if Whisper is available
      const availability = await this.whisperSTTService.isAvailable();
      if (!availability) {
        console.warn(`[STT] Whisper not available`);
        return;
      }

      // Generate transcript
      const transcriptResult = await this.whisperSTTService.transcribeAudio(filePath);
      
      if (transcriptResult.success && transcriptResult.text) {
        console.log(`[STT] Transcript generated successfully for: ${filePath}`);
        
        // Update asset metadata with transcript
        const asset = this.assetManager.getAssetById(assetId);
        if (asset && isVideoAsset(asset)) {
          // Cast to VideoAsset for transcript properties
          const videoAsset = asset as VideoAsset;
          videoAsset.transcript = transcriptResult.text;
          videoAsset.transcriptLanguage = transcriptResult.language;
          videoAsset.transcriptConfidence = transcriptResult.confidence;
          videoAsset.transcriptGeneratedAt = new Date().toISOString();
          
          // Update asset in manager
          await this.assetManager.updateAsset(videoAsset);
          console.log(`[STT] Asset metadata updated with transcript for: ${assetId}`);
        }
      } else {
        console.error(`[STT] Transcript generation failed for ${filePath}:`, transcriptResult.error);
      }
    } catch (error) {
      console.error(`[STT] Error during transcript processing for ${filePath}:`, error);
    }
  }

  /**
   * Process video thumbnail generation asynchronously
   * This method is called after successful video ingest to generate thumbnails
   * @param filePath Path to the video file
   * @param assetId Asset ID for updating metadata
   */
  private processVideoThumbnailAsync(filePath: string, assetId: string): void {
    // Fire and forget - run thumbnail processing in background
    this.generateVideoThumbnail(filePath, assetId).catch(error => {
      console.error(`Thumbnail processing failed for ${filePath}:`, error);
      // Could emit event or add to retry queue here
    });
  }

  /**
   * Generate thumbnail for a video and update asset metadata
   * @param filePath Path to the video file
   * @param assetId Asset ID to update with thumbnail
   */
  private async generateVideoThumbnail(filePath: string, assetId: string): Promise<void> {
    try {
      console.log(`[Thumbnail] Starting thumbnail generation for: ${filePath}`);
      
      // Get the FFMPEGVideoDiscovery instance from our discoverers
      const videoDiscovery = this.discoverers.find(d => d.constructor.name === 'FFMPEGVideoDiscovery') as any;
      
      if (!videoDiscovery) {
        console.warn(`[Thumbnail] FFMPEGVideoDiscovery not available`);
        return;
      }

      // Generate and register thumbnail (now that asset exists in database)
      const thumbnailInfo = await videoDiscovery.generateAndRegisterThumbnail(filePath, assetId);
      
      if (thumbnailInfo.success) {
        console.log(`[Thumbnail] Thumbnail generated successfully for: ${filePath}`);
        
        // Update asset metadata with thumbnail path
        const asset = this.assetManager.getAssetById(assetId);
        if (asset && isVideoAsset(asset)) {
          const videoAsset = asset as VideoAsset;
          
          if (thumbnailInfo.thumbnailPath) {
            videoAsset.thumbnailPath = thumbnailInfo.thumbnailPath;
            console.log(`[Thumbnail] Set video thumbnail path: ${thumbnailInfo.thumbnailPath}`);
          } else if (thumbnailInfo.derivativeId) {
            // Get the actual asset from the asset manager
            const thumbnailAsset = this.assetManager.getAssetById(thumbnailInfo.derivativeId);
            if (thumbnailAsset) {
              videoAsset.thumbnailPath = thumbnailAsset.path;
              console.log(`[Thumbnail] Set video thumbnail path from derivative: ${thumbnailAsset.path}`);
            }
          }
          
          // Update asset in manager
          await this.assetManager.updateAsset(videoAsset);
          console.log(`[Thumbnail] Asset metadata updated with thumbnail for: ${assetId}`);
        }
      } else {
        console.error(`[Thumbnail] Thumbnail generation failed for ${filePath}:`, thumbnailInfo.error);
        
        // Try fallback thumbnail generation without derivative registration
        console.log(`[Thumbnail] Attempting fallback thumbnail generation for: ${filePath}`);
        const fallbackInfo = await videoDiscovery.generateThumbnail(filePath);
        
        if (fallbackInfo.success) {
          const asset = this.assetManager.getAssetById(assetId);
          if (asset && isVideoAsset(asset)) {
            const videoAsset = asset as VideoAsset;
            videoAsset.thumbnailPath = fallbackInfo.thumbnailPath;
            await this.assetManager.updateAsset(videoAsset);
            console.log(`[Thumbnail] Fallback thumbnail generated: ${fallbackInfo.thumbnailPath}`);
          }
        }
      }
    } catch (error) {
      console.error(`[Thumbnail] Error during thumbnail processing for ${filePath}:`, error);
    }
  }

  /**
   * Get the AssetManager instance
   * @returns AssetManager instance
   */
  public getAssetManager(): AssetManager {
    return this.assetManager;
  }
}
