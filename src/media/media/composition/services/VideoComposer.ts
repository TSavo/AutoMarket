/**
 * Video composer service
 */
import { AssetManager } from '../../AssetManager';
import { VideoAsset, isVideoAsset } from '../../video';
import { ImageAsset, isImageAsset } from '../../image';
import { Clip, ClipType, OverlayPosition } from '../models/Clip';
import { Composition as FullComposition, CompositionOutputSettings, DEFAULT_OUTPUT_SETTINGS } from '../models/Composition';
import { Composition as InputComposition } from '../../types'; // Renamed for clarity
import { FFMPEGCommandBuilder, CommandBuilderOptions } from '../ffmpeg/CommandBuilder';
import { MediaIngestService } from '../../ingest/MediaIngestService';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { AspectRatio, ContentPurpose } from '../../types'; // Added imports for AspectRatio and ContentPurpose enums
import { ProjectManager } from '../services/ProjectManager';
import { CompositionProject } from '../models/CompositionProject';
import { TransitionType } from '../ffmpeg/AdvancedTransitions';
import { ProcessingQueue, JobStatus, ProcessingJob } from './ProcessingQueue';
import os from 'os';

/**
 * Options for composition creation
 */
export interface CompositionOptions {
  outputFormat: string;
  resolution: string;
  quality: string;
  fps: number;
  useHardwareAcceleration?: boolean;
}

/**
 * Status of a composition task
 * @deprecated Use JobStatus from ProcessingQueue instead
 */
export enum CompositionTaskStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Job progress information
 */
export interface JobProgress {
  jobId: string;
  progress: number;
  status: JobStatus;
  timeRemaining?: number;
  eta?: number;
}

/**
 * VideoComposer service for creating and managing compositions
 */
export class VideoComposer {
  private assetManager: AssetManager;

  constructor(assetManager?: AssetManager) {
    this.assetManager = assetManager || new AssetManager();
    if (!this.assetManager.isInitialized()) {
      // It's crucial AssetManager is initialized before use.
      // Consider throwing an error or ensuring initialization here if that's a desired pattern.
      console.warn('AssetManager provided to VideoComposer is not initialized. Ensure it is initialized before use.');
      // Initialize the asset manager
      this.assetManager.initialize();
    }
  }

  /**
   * Create a video composition
   */
  async createComposition(data: InputComposition): Promise<FullComposition | undefined> {
    if (!this.assetManager.isInitialized()) {
        throw new Error("AssetManager is not initialized. Cannot create composition.");
    }
    const now = new Date().toISOString();
    const assembledClips: Clip[] = [];
    let currentTimelinePos = 0;

    // Apply crossfade duration if provided
    const crossfadeDuration = data.crossfadeDuration || 0.5; // Default to 0.5s if not specified

    // --- Process Main Sequence Clips (Intro, Content, Outro) ---

    // 1. Process Intro Asset (if any)
    if (data.introAssetId) {
      const introAssetObj = await this.assetManager.getAssetById(data.introAssetId);
      if (introAssetObj) {
        let introDuration: number = 0;

        if (isVideoAsset(introAssetObj)) {
          introDuration = introAssetObj.duration;
        } else if (isImageAsset(introAssetObj)) {
          // For images, use provided introDuration or default to 5 seconds
          introDuration = data.introDuration || 5;
        } else {
          console.warn(`Intro asset with ID ${data.introAssetId} is not a valid video or image. Skipping.`);
          // Skip to the next section by using a conditional block instead of continue
        }

        // Only create clip if we have a valid introAssetObj and determined duration
        if (introDuration > 0 && (isVideoAsset(introAssetObj) || isImageAsset(introAssetObj))) {
          // Create intro clip with fade out for crossfade
          const introClip: Clip = {
            id: uuidv4(),
            asset: introAssetObj as VideoAsset | ImageAsset,
            type: ClipType.INTRO,
            startTime: currentTimelinePos,
            duration: introDuration,
            resizeToFit: true,
            fadeOut: crossfadeDuration, // Use the crossfade duration for fade out
          };
        // Add audio asset if provided
        if (data.introAudioAssetId) {
          introClip.audioAssetId = data.introAudioAssetId;
          // Resolve audio asset and attach path
          const audioAsset = await this.assetManager.getAudioAssetById(data.introAudioAssetId);
          if (audioAsset) {
            (introClip as any).audioPath = audioAsset.path;
          }
        }
        assembledClips.push(introClip);
        // Adjust timeline position, accounting for crossfade
        currentTimelinePos += introDuration - crossfadeDuration;
      } else {
        console.warn(`Intro video asset with ID ${data.introAssetId} not found or not a video. Skipping.`);
      }
    }

    // 2. Process Content Asset (mandatory)
    if (!data.contentAssetId) {
      throw new Error('contentAssetId is required to create a composition.');
    }
    const contentAssetObj = await this.assetManager.getAssetById(data.contentAssetId);
    if (!contentAssetObj) {
      throw new Error(`Content asset with ID ${data.contentAssetId} not found.`);
    }

    // Handle both video and image assets
    if (!isVideoAsset(contentAssetObj) && !isImageAsset(contentAssetObj)) {
      throw new Error(`Content asset with ID ${data.contentAssetId} is not a valid video or image.`);
    }

    // Determine duration based on asset type
    let contentDuration: number;
    if (isVideoAsset(contentAssetObj)) {
      contentDuration = contentAssetObj.duration;
    } else if (isImageAsset(contentAssetObj)) {
      // For images, use provided duration or default to 5 seconds
      contentDuration = data.contentDuration || 5;
    } else {
      throw new Error(`Unsupported asset type for content asset with ID ${data.contentAssetId}`);
    }

    // Create content clip with fade in/out for crossfades if needed
    const contentClip: Clip = {
      id: uuidv4(),
      asset: contentAssetObj,
      type: ClipType.CONTENT,
      startTime: currentTimelinePos,
      duration: contentDuration,
      resizeToFit: true,
    };

    // Add fade in if there's an intro
    if (data.introAssetId) {
      contentClip.fadeIn = crossfadeDuration;
    }

    // Add fade out if there's an outro
    if (data.outroAssetId) {
      contentClip.fadeOut = crossfadeDuration;
    }

    // Add audio asset if provided
    if (data.contentAudioAssetId) {
      contentClip.audioAssetId = data.contentAudioAssetId;
      // Resolve audio asset and attach path
      const audioAsset = await this.assetManager.getAudioAssetById(data.contentAudioAssetId);
      if (audioAsset) {
        (contentClip as any).audioPath = audioAsset.path;
      }
    }
    assembledClips.push(contentClip);

    // Adjust timeline position, accounting for crossfade if there's an outro
    currentTimelinePos += contentDuration - (data.outroAssetId ? crossfadeDuration : 0);

    // 3. Process Outro Asset (if any)
    if (data.outroAssetId) {
      const outroAssetObj = await this.assetManager.getAssetById(data.outroAssetId);
      if (outroAssetObj && isVideoAsset(outroAssetObj)) {
        const outroClip: Clip = {
          id: uuidv4(),
          asset: outroAssetObj,
          type: ClipType.OUTRO,
          startTime: currentTimelinePos,
          duration: outroAssetObj.duration,
          resizeToFit: true,
          fadeIn: crossfadeDuration, // Use the crossfade duration for fade in
        };
        // Add audio asset if provided
        if (data.outroAudioAssetId) {
          outroClip.audioAssetId = data.outroAudioAssetId;
          // Resolve audio asset and attach path
          const audioAsset = await this.assetManager.getAudioAssetById(data.outroAudioAssetId);
          if (audioAsset) {
            (outroClip as any).audioPath = audioAsset.path;
          }
        }
        assembledClips.push(outroClip);
      } else {
        console.warn(`Outro video asset with ID ${data.outroAssetId} not found or not a video. Skipping.`);
      }
    }

    // --- Process Overlay Assets ---
    if (data.overlayConfigs && Array.isArray(data.overlayConfigs)) {
      for (const overlayConfig of data.overlayConfigs) {
        // Skip if no asset ID is provided
        if (!overlayConfig.assetId) {
          console.warn('Overlay config missing assetId. Skipping.');
          continue;
        }

        const overlayAssetDetails = await this.assetManager.getAssetById(overlayConfig.assetId);
        if (!overlayAssetDetails) {
          console.warn(`Overlay asset with ID ${overlayConfig.assetId} not found. Skipping.`);
          continue;
        }

        if (!isVideoAsset(overlayAssetDetails) && !isImageAsset(overlayAssetDetails)) {
            console.warn(`Overlay asset with ID ${overlayConfig.assetId} is not a valid video or image. Skipping.`);
            continue;
        }

        // Determine overlay duration
        let overlayDuration = overlayConfig.duration;
        if (overlayDuration === undefined) {
            if (isVideoAsset(overlayAssetDetails)) {
                overlayDuration = overlayAssetDetails.duration;
            } else { // ImageAsset
                // Default image overlay duration if not specified
                overlayDuration = isVideoAsset(contentAssetObj) ? contentAssetObj.duration : (data.contentDuration || 5); // Default to main content duration
            }
        }

        // Determine overlay position
        let position: OverlayPosition | { x: number; y: number } = OverlayPosition.MIDDLE_CENTER;
        if (overlayConfig.position) {
            if (typeof overlayConfig.position === 'string') {
                // Check if it's a valid OverlayPosition enum value
                if (Object.values(OverlayPosition).includes(overlayConfig.position as OverlayPosition)) {
                    position = overlayConfig.position as OverlayPosition;
                }
            } else if (typeof overlayConfig.position === 'object' &&
                       'x' in overlayConfig.position &&
                       'y' in overlayConfig.position) {
                position = overlayConfig.position as { x: number; y: number };
            }
        }

        // Create the overlay clip
        assembledClips.push({
          id: uuidv4(),
          asset: overlayAssetDetails,
          type: ClipType.OVERLAY,
          startTime: overlayConfig.startTime || 0,
          duration: overlayDuration,
          position: position,
          scale: overlayConfig.scale || 1.0,
          opacity: overlayConfig.opacity || 1.0,
          fadeIn: overlayConfig.fadeIn || 0.3, // Default fade in
          fadeOut: overlayConfig.fadeOut || 0.3, // Default fade out
          mute: true, // Overlays are muted by default
        });
      }
    }

    // --- Determine Output Settings ---
    const outputSettings: CompositionOutputSettings = {
        ...DEFAULT_OUTPUT_SETTINGS,
        ...((data as any).outputSettings || {}), // Assuming InputComposition might have outputSettings
    };

    // Set output dimensions based on content asset if not specified
    if (!outputSettings.width || outputSettings.width === 0) {
        outputSettings.width = contentAssetObj.width;
    }
    if (!outputSettings.height || outputSettings.height === 0) {
        outputSettings.height = contentAssetObj.height;
    }

    // Set frame rate based on content asset if not specified
    if (!outputSettings.frameRate || outputSettings.frameRate === 0) {
        // Use contentAssetObj.frameRate if available and valid, otherwise default
        if (isVideoAsset(contentAssetObj) && contentAssetObj.frameRate && contentAssetObj.frameRate > 0) {
            outputSettings.frameRate = contentAssetObj.frameRate;
        } else {
            outputSettings.frameRate = DEFAULT_OUTPUT_SETTINGS.frameRate;
        }
    }

    // Calculate aspect ratio if not specified
    if (!outputSettings.aspectRatio || outputSettings.aspectRatio === DEFAULT_OUTPUT_SETTINGS.aspectRatio) {
        // Try to get aspect ratio from content asset
        const contentAR = (contentAssetObj as any).aspectRatio;

        if (typeof contentAR === 'string' && Object.values(AspectRatio).includes(contentAR as AspectRatio)) {
            outputSettings.aspectRatio = contentAR as AspectRatio;
        } else {
            // Calculate aspect ratio from dimensions
            const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
            const divisor = gcd(outputSettings.width, outputSettings.height);
            const widthRatio = outputSettings.width / divisor;
            const heightRatio = outputSettings.height / divisor;

            // Check if it matches a standard aspect ratio
            const aspectRatioStr = `${widthRatio}:${heightRatio}`;

            // Find matching standard aspect ratio or use custom
            let matchedAspectRatio = Object.values(AspectRatio).find(ar => ar === aspectRatioStr);

            if (matchedAspectRatio) {
                outputSettings.aspectRatio = matchedAspectRatio as AspectRatio;
            } else {
                // Special case for common ratios with different representations
                if (Math.abs(outputSettings.width / outputSettings.height - 16/9) < 0.01) {
                    outputSettings.aspectRatio = AspectRatio.LANDSCAPE_WIDESCREEN;
                } else if (Math.abs(outputSettings.width / outputSettings.height - 4/3) < 0.01) {
                    outputSettings.aspectRatio = AspectRatio.LANDSCAPE_STANDARD;
                } else {
                    outputSettings.aspectRatio = AspectRatio.CUSTOM;
                }
            }
        }
    }

    // --- Prepare Full Composition Data ---
    const safeTitle = (data.title || 'composition').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const defaultOutputPath = `output/${safeTitle}_${Date.now()}.mp4`;

    const fullCompositionData: FullComposition = {
      id: data.id || 'comp_' + Date.now(),
      title: data.title || 'Untitled Composition',
      description: data.description || '',
      clips: assembledClips,
      outputSettings: outputSettings,
      dateCreated: now,
      dateModified: now,
      tags: Array.isArray((data as any).tags) ? (data as any).tags : [],
      outputPath: (data as any).outputPath || defaultOutputPath,
      crossfadeDuration: data.crossfadeDuration
    };

    // Ensure output directory exists
    const outputDir = path.dirname(fullCompositionData.outputPath!);
    if (!fs.existsSync(outputDir)){
        await fs.promises.mkdir(outputDir, { recursive: true });
    }

    // --- Build and Execute FFMPEG Command ---
    // Create command builder with advanced options
    const commandBuilder = new FFMPEGCommandBuilder(fullCompositionData, {
      useAdvancedTransitions: (data as any).useAdvancedTransitions || false,
      transitionType: (data as any).transitionType || TransitionType.FADE,
      textOverlays: (data as any).textOverlays || [],
      audioTracks: (data as any).audioTracks || [],
      enableProgressTracking: true,
      progressCallback: (progress) => {
        console.log(`FFMPEG Progress: ${progress.progress}% (ETA: ${Math.round(progress.eta)} seconds)`);
      }
    });

    // Get the command for logging
    const command = commandBuilder.buildCommand();
    console.log(`Executing FFMPEG command: ${command}`);

    try {
      // Execute the command with progress tracking
      const jobId = uuidv4();
      await commandBuilder.executeCommandWithProgress(jobId);

      console.log(`Composition created: ${fullCompositionData.outputPath}`);

      // Auto-ingest the rendered video into the asset system
      await this.ingestRenderedVideo(fullCompositionData);

      // Return the completed composition
      return fullCompositionData;

    } catch (error) {
      console.error('Error executing FFMPEG command:', error);
      throw new Error(`FFMPEG execution failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get a composition by ID
   */
  // Commented out due to TypeScript errors - will be implemented in a future update
  /*
  async getCompositionById(id: string): Promise<FullComposition | null> {
    if (!id) {
      throw new Error('Composition ID is required');
    }

    try {
      // Create a project manager to handle storage operations
      const projectManager = new ProjectManager(this.assetManager);
      await projectManager.initialize();

      // Get the composition project from storage
      const project = await projectManager.getProject(id);

      if (!project) {
        console.log(`Composition with ID ${id} not found`);
        return null;
      }

      // Convert the project to a full composition
      const fullComposition: FullComposition = {
        id: project.id,
        title: project.title || project.name, // Use title or fall back to name
        description: project.description || '',
        clips: [], // Will be populated below
        outputSettings: project.outputSettings || DEFAULT_OUTPUT_SETTINGS,
        dateCreated: project.dateCreated,
        dateModified: project.dateModified,
        tags: project.tags || [],
        outputPath: project.outputPath || '',
        crossfadeDuration: project.crossfadeDuration || 0.5
      };
  */

      /*
      // Load clips from asset references
      const clips: Clip[] = [];

      // Process main sequence clips
      if (project.contentAssetId) {
        const contentAsset = this.assetManager.getAssetById(project.contentAssetId);
        if (contentAsset && isVideoAsset(contentAsset)) {
          let startTime = 0;
          const crossfadeDuration = project.crossfadeDuration || 0.5;

          // Add intro clip if exists
          if (project.introAssetId) {
            const introAsset = this.assetManager.getAssetById(project.introAssetId);
            if (introAsset && isVideoAsset(introAsset)) {
              clips.push({
                id: uuidv4(),
                asset: introAsset,
                type: ClipType.INTRO,
                startTime: 0,
                duration: introAsset.duration,
                resizeToFit: true,
                fadeOut: crossfadeDuration
              });

              startTime = introAsset.duration - crossfadeDuration;
            }
          }

          // Add content clip
          const contentClip: Clip = {
            id: uuidv4(),
            asset: contentAsset,
            type: ClipType.CONTENT,
            startTime,
            duration: contentAsset.duration,
            resizeToFit: true
          };

          // Add fade effects if needed
          if (project.introAssetId) {
            contentClip.fadeIn = crossfadeDuration;
          }

          if (project.outroAssetId) {
            contentClip.fadeOut = crossfadeDuration;
          }

          clips.push(contentClip);

          // Update timeline position
          startTime += contentAsset.duration - (project.outroAssetId ? crossfadeDuration : 0);

          // Add outro clip if exists
          if (project.outroAssetId) {
            const outroAsset = this.assetManager.getAssetById(project.outroAssetId);
            if (outroAsset && isVideoAsset(outroAsset)) {
              clips.push({
                id: uuidv4(),
                asset: outroAsset,
                type: ClipType.OUTRO,
                startTime,
                duration: outroAsset.duration,
                resizeToFit: true,
                fadeIn: crossfadeDuration
              });
            }
          }
        }
      }

      // Process overlay clips
      if (project.overlayConfigs && Array.isArray(project.overlayConfigs)) {
        for (const overlayConfig of project.overlayConfigs) {
          if (!overlayConfig.assetId) continue;

          const overlayAsset = this.assetManager.getAssetById(overlayConfig.assetId);
          if (!overlayAsset || (!isVideoAsset(overlayAsset) && !isImageAsset(overlayAsset))) continue;

          // Determine overlay duration
          let overlayDuration = overlayConfig.duration;
          if (overlayDuration === undefined) {
            if (isVideoAsset(overlayAsset)) {
              overlayDuration = overlayAsset.duration;
            } else {
              // Default image overlay duration
              const contentAsset = project.contentAssetId ?
                this.assetManager.getAssetById(project.contentAssetId) : null;
              overlayDuration = contentAsset && isVideoAsset(contentAsset) ? contentAsset.duration : 10;
            }
          }

          // Create overlay clip
          clips.push({
            id: uuidv4(),
            asset: overlayAsset,
            type: ClipType.OVERLAY,
            startTime: overlayConfig.startTime || 0,
            duration: overlayDuration,
            position: overlayConfig.position || OverlayPosition.MIDDLE_CENTER,
            scale: overlayConfig.scale || 1.0,
            opacity: overlayConfig.opacity || 1.0,
            fadeIn: overlayConfig.fadeIn || 0.3,
            fadeOut: overlayConfig.fadeOut || 0.3,
            mute: true
          });
        }
      }

      // Add clips to the full composition
      fullComposition.clips = clips;

      return fullComposition;
    } catch (error) {
      console.error(`Error getting composition with ID ${id}:`, error);
      throw new Error(`Failed to get composition: ${(error as Error).message}`);
    }
    */
  }

  /**
   * List all compositions
   */
  // Commented out due to TypeScript errors - will be implemented in a future update
  /*
  async listCompositions(): Promise<FullComposition[]> {
    try {
      // Create a project manager to handle storage operations
      const projectManager = new ProjectManager(this.assetManager);
      await projectManager.initialize();

      // Get all projects from storage
      const projects = await projectManager.listProjects();

      // Convert projects to composition summaries (without full clip details)
      const compositions: FullComposition[] = [];

      for (const project of projects) {
        compositions.push({
          id: project.id,
          title: project.title || project.name || 'Untitled Composition',
          description: project.description || '',
          clips: [], // Placeholder - full clips would be loaded when getting a specific composition
          outputSettings: project.outputSettings || DEFAULT_OUTPUT_SETTINGS,
          dateCreated: project.dateCreated,
          dateModified: project.dateModified,
          tags: project.tags || [],
          outputPath: project.outputPath || '',
          crossfadeDuration: project.crossfadeDuration || 0.5
        });
      }

      return compositions;
    } catch (error) {
      console.error('Error listing compositions:', error);
      throw new Error(`Failed to list compositions: ${(error as Error).message}`);
    }
  }
  */

  /**
   * Auto-ingest rendered video into the asset management system
   * @param composition The completed composition
   */
  private async ingestRenderedVideo(composition: FullComposition): Promise<void> {
    if (!composition.outputPath) {
      console.warn('No output path specified for composition - skipping auto-ingestion');
      return;
    }

    try {
      const mediaIngestService = new MediaIngestService(this.assetManager);
      await mediaIngestService.initialize();

      const ingestOptions = {
        path: composition.outputPath,
        generateId: true,
        extractTags: true,
        overwriteExisting: false
      };

      const result = await mediaIngestService.ingestFile<VideoAsset>(
        composition.outputPath,
        ingestOptions
      );

      if (result.success && result.asset) {
        // Add composition-specific tags
        result.asset.tags = [
          ...result.asset.tags,
          'generated',
          'composition',
          'rendered',
          composition.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        ];
        
        // Set content purpose for reuse
        result.asset.contentPurpose = [ContentPurpose.CONTENT]; // Or determine based on composition type
        
        // Update asset with enhanced metadata
        await this.assetManager.updateAsset(result.asset);
        
        console.log(`Rendered video ingested as asset: ${result.asset.id}`);
      } else {
        console.warn(`Failed to ingest rendered video: ${result.error}`);
      }
    } catch (error) {
      console.error('Error during video auto-ingestion:', error);
      // Don't throw error - ingestion failure shouldn't fail the entire composition
    }
  }
}

export default VideoComposer;