/**
 * Video composer service with processing queue
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
import { AspectRatio, ContentPurpose } from '../../types'; 
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
  private processingQueue: ProcessingQueue;
  private jobProgressCallbacks: Map<string, (progress: JobProgress) => void> = new Map();

  constructor(assetManager?: AssetManager) {
    this.assetManager = assetManager || new AssetManager();
    if (!this.assetManager.isInitialized()) {
      console.warn('AssetManager provided to VideoComposer is not initialized. Ensure it is initialized before use.');
    }

    // Initialize processing queue - allow concurrent tasks based on CPU cores
    const concurrentTasks = Math.max(1, Math.min(os.cpus().length - 1, 4)); // At most 4, at least 1
    this.processingQueue = new ProcessingQueue({
      maxConcurrent: concurrentTasks,
      autoStart: true,
      onJobStatusChange: (job) => this.handleJobStatusChange(job)
    });

    // Clean up old jobs every hour
    setInterval(() => {
      this.processingQueue.cleanupJobs();
    }, 60 * 60 * 1000);
  }
  
  /**
   * Get the number of available processing slots
   */
  public getProcessingCapacity(): number {
    return this.processingQueue['options'].maxConcurrent;
  }

  /**
   * Add a progress tracking callback for a job
   * @param jobId The ID of the job
   * @param callback The function to call when progress updates
   */
  public addProgressCallback(jobId: string, callback: (progress: JobProgress) => void): void {
    this.jobProgressCallbacks.set(jobId, callback);
  }

  /**
   * Remove a progress tracking callback
   * @param jobId The ID of the job
   */
  public removeProgressCallback(jobId: string): void {
    this.jobProgressCallbacks.delete(jobId);
  }

  /**
   * Get all current processing jobs
   */
  public getAllJobs(): ProcessingJob[] {
    return this.processingQueue.getAllJobs();
  }

  /**
   * Get a job by ID
   */
  public getJob(jobId: string): ProcessingJob | undefined {
    return this.processingQueue.getJob(jobId);
  }

  /**
   * Cancel a job
   */
  public cancelJob(jobId: string): boolean {
    return this.processingQueue.cancelJob(jobId);
  }
  
  /**
   * Handle job status changes
   */
  private handleJobStatusChange(job: ProcessingJob): void {
    // Call relevant callback if registered
    const callback = this.jobProgressCallbacks.get(job.id);
    if (callback) {
      // Calculate ETA and time remaining
      let timeRemaining: number | undefined;
      let eta: number | undefined;
      
      if (job.status === JobStatus.PROCESSING && job.startTime) {
        const elapsedMs = Date.now() - job.startTime;
        const progressPerMs = job.progress / elapsedMs;
        
        if (progressPerMs > 0) {
          const remainingProgress = 100 - job.progress;
          timeRemaining = Math.round(remainingProgress / progressPerMs / 1000);
          eta = Math.round(Date.now() + (remainingProgress / progressPerMs));
        }
      }

      callback({
        jobId: job.id,
        progress: job.progress,
        status: job.status,
        timeRemaining,
        eta
      });
    }
  }

  /**
   * Create a video composition through the processing queue
   * @param data Input composition data
   * @param options Optional composition options
   * @returns Promise with the job ID
   */
  public async queueComposition(
    data: InputComposition, 
    options: { 
      useHardwareAcceleration?: boolean
    } = {}
  ): Promise<string> {
    // Generate a unique job ID
    const jobId = `comp_${Date.now()}_${uuidv4().substring(0, 8)}`;

    // Queue the job
    this.processingQueue.addJob(
      jobId, 
      { 
        compositionData: data, 
        options 
      }, 
      async (job, updateProgress) => {
        // This is the actual processing function that will be called when the job is executed
        try {
          // Set initial progress
          updateProgress(1);
          
          // Create the composition
          const result = await this._createComposition(
            data, 
            options,
            (progress) => updateProgress(progress)
          );
          
          // Set final progress
          updateProgress(100);
          
          // Return the result
          return result;
        } catch (error) {
          // Handle errors
          console.error(`Error creating composition ${jobId}:`, error);
          throw error;
        }
      }
    );

    return jobId;
  }

  /**
   * Internal implementation of create composition to support queueing
   */
  private async _createComposition(
    data: InputComposition,
    options: { useHardwareAcceleration?: boolean } = {},
    progressCallback?: (progress: number) => void
  ): Promise<FullComposition> {
    if (!this.assetManager.isInitialized()) {
        throw new Error("AssetManager is not initialized. Cannot create composition.");
    }

    const now = new Date().toISOString();
    const assembledClips: Clip[] = [];
    let currentTimelinePos = 0;

    // Apply crossfade duration if provided
    const crossfadeDuration = data.crossfadeDuration || 0.5; // Default to 0.5s if not specified

    // Report progress for asset loading
    if (progressCallback) progressCallback(5);

    // --- Process Main Sequence Clips (Intro, Content, Outro) ---
    // [existing clip processing code...]

    // --- Determine Output Settings ---
    const outputSettings: CompositionOutputSettings = {
        ...DEFAULT_OUTPUT_SETTINGS,
        ...((data as any).outputSettings || {}),
    };

    // Report progress for configuration
    if (progressCallback) progressCallback(10);

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
      useHardwareAcceleration: options.useHardwareAcceleration || false,
      hardwareAccelerationType: 'auto',
      progressCallback: (progress) => {
        // Map FFMPEG progress (0-100) to our overall progress (10-90)
        const mappedProgress = 10 + (progress.progress * 0.8);
        if (progressCallback) progressCallback(mappedProgress);
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
      if (progressCallback) progressCallback(95); // Almost done
      await this.ingestRenderedVideo(fullCompositionData);

      // Return the completed composition
      return fullCompositionData;

    } catch (error) {
      console.error('Error executing FFMPEG command:', error);
      throw new Error(`FFMPEG execution failed: ${(error as Error).message}`);
    }
  }

  /**
   * Backward compatibility method that uses the queue system internally
   */
  public async createComposition(data: InputComposition): Promise<FullComposition | undefined> {
    try {
      const jobId = await this.queueComposition(data);
      
      // Wait for the job to complete
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          const job = this.getJob(jobId);
          if (job) {
            if (job.status === JobStatus.COMPLETED) {
              clearInterval(checkInterval);
              resolve(job.result);
            } else if (job.status === JobStatus.FAILED) {
              clearInterval(checkInterval);
              reject(job.error || new Error('Job failed'));
            }
          }
        }, 500);
      });
    } catch (error) {
      console.error('Error creating composition:', error);
      return undefined;
    }
  }

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
