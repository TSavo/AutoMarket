/**
 * Automatic Video Composer - Main orchestration service
 */
import { AssetManager } from '../../AssetManager';
import { VideoAsset } from '../../video';
import { VideoComposer } from './VideoComposer';
import { ProcessingQueue, JobStatus } from './ProcessingQueue';
import { MediaIngestService } from '../../ingest/MediaIngestService';
import { Composition } from '../../types';
import { v4 as uuidv4 } from 'uuid';

// Import composed services
import { AspectRatioAssetSelector } from './AspectRatioAssetSelector';
import { IntelligentOverlayTimer } from './IntelligentOverlayTimer';
import { CompositionBuilder } from './CompositionBuilder';
import { VideoIngestionService } from './VideoIngestionService';

/**
 * Simple options for automatic composition
 */
export interface AutoCompositionOptions {
  crossfadeDuration?: number;
  outputFormat?: string;
  resolution?: string;
  fps?: number;
  useHardwareAcceleration?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Result of automatic composition
 */
export interface AutoCompositionResult {
  success: boolean;
  jobId: string;
  composedVideoAsset?: VideoAsset;
  error?: string;
  selectedAssets?: {
    intro?: VideoAsset;
    outro?: VideoAsset;
    overlay?: VideoAsset;
  };
}

/**
 * Main automatic video composition service
 * Composes smaller focused services to handle the workflow
 */
export class AutomaticVideoComposer {
  private assetManager: AssetManager;
  private videoComposer: VideoComposer;
  private processingQueue: ProcessingQueue;
  private mediaIngestService: MediaIngestService;

  // Composed services
  private assetSelector: AspectRatioAssetSelector;
  private overlayTimer: IntelligentOverlayTimer;
  private compositionBuilder: CompositionBuilder;
  private ingestionService: VideoIngestionService;

  constructor(assetManager?: AssetManager) {
    this.assetManager = assetManager || new AssetManager();
    this.videoComposer = new VideoComposer(this.assetManager);
    this.processingQueue = new ProcessingQueue({ maxConcurrent: 2, autoStart: true });
    this.mediaIngestService = new MediaIngestService(this.assetManager);

    // Initialize composed services
    this.assetSelector = new AspectRatioAssetSelector(this.assetManager);
    this.overlayTimer = new IntelligentOverlayTimer();
    this.compositionBuilder = new CompositionBuilder();
    this.ingestionService = new VideoIngestionService(this.assetManager, this.mediaIngestService);
  }

  /**
   * Main method: Automatically compose video with zero configuration
   */
  async composeVideoAutomatically(
    contentAsset: VideoAsset,
    options: AutoCompositionOptions = {}
  ): Promise<AutoCompositionResult> {
    
    // Initialize services
    if (!this.assetManager.isInitialized()) {
      await this.assetManager.initialize();
    }
    await this.mediaIngestService.initialize();

    // Step 1: Select assets with aspect ratio matching
    const selectedAssets = await this.assetSelector.selectAssets(contentAsset);
    
    // Step 2: Calculate intelligent overlay timing
    const overlayTimings = this.overlayTimer.calculateTimings(
      contentAsset, 
      selectedAssets, 
      options.crossfadeDuration || 1.0
    );
    
    // Step 3: Build composition
    const composition = this.compositionBuilder.buildComposition(
      contentAsset,
      selectedAssets,
      overlayTimings,
      options
    );
    
    // Step 4: Queue for processing
    const jobId = uuidv4();
    await this.queueCompositionJob(jobId, composition);
    
    return {
      success: true,
      jobId,
      selectedAssets
    };
  }

  /**
   * Queue composition job for processing
   */
  private async queueCompositionJob(jobId: string, composition: Composition): Promise<any> {
    const processingTask = async (job: any, updateProgress: (progress: number) => void) => {
      try {
        // Create composition
        const fullComposition = await this.videoComposer.createComposition(composition);
        if (!fullComposition) {
          throw new Error('Failed to create composition');
        }

        // Auto-ingest rendered video
        const ingestedAsset = await this.ingestionService.ingestRenderedVideo(fullComposition);
        
        return {
          success: true,
          composedVideoAsset: ingestedAsset,
          fullComposition
        };
        
      } catch (error) {
        console.error('Auto-composition processing error:', error);
        throw error;
      }
    };
    
    return this.processingQueue.addJob(jobId, composition, processingTask);
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    status: JobStatus;
    progress: number;
    result?: AutoCompositionResult;
    error?: string;
  }> {
    
    const job = this.processingQueue.getJob(jobId);
    
    if (!job) {
      return {
        status: JobStatus.FAILED,
        progress: 0,
        error: 'Job not found'
      };
    }
    
    let result;
    if (job.status === JobStatus.COMPLETED && job.result) {
      result = {
        success: true,
        jobId,
        composedVideoAsset: job.result.composedVideoAsset
      };
    }
    
    return {
      status: job.status,
      progress: job.progress,
      result,
      error: job.error?.message
    };
  }
}
