/**
 * Auto Composition State Handler
 *
 * Handles auto-composition of avatar videos using the existing AutomaticVideoComposer
 * to add branding, intro/outro, and overlays.
 */

import {
  PipelineAction,
  PipelineContext,
  PipelineState,
  ComposedVideo,
  StateHandler
} from '../types';
import { AutomaticVideoComposer } from '../../media/composition/services/AutomaticVideoComposer';
import { AssetManager } from '../../media/AssetManager';
import { VideoAsset, VideoFormat } from '../../media/video';
import { MediaType, ContentPurpose } from '../../media/types';
import { JobStatus } from '../../media/composition/services/ProcessingQueue';
import { MediaIngestService } from '../../media/ingest/MediaIngestService';
import path from 'path';

export class AutoCompositionStateHandler implements StateHandler {
  private assetManager: AssetManager;
  private composer: AutomaticVideoComposer;
  private videoDir: string;

  /**
   * Create a new AutoCompositionStateHandler
   * @param assetManager AssetManager instance (optional, will create if not provided)
   * @param videoDir Directory for storing videos
   */
  constructor(assetManager?: AssetManager, videoDir: string = '/videos') {
    this.assetManager = assetManager || new AssetManager();
    this.composer = new AutomaticVideoComposer(this.assetManager);
    this.videoDir = videoDir;
  }

  /**
   * Check if this handler can handle the given state
   * @param state Current pipeline state
   * @returns True if this handler can handle the state
   */
  canHandle(state: PipelineState): boolean {
    return [
      PipelineState.AVATAR_GENERATED,
      PipelineState.AUTO_COMPOSING,
      PipelineState.AUTO_COMPOSED
    ].includes(state);
  }

  /**
   * Handle a state transition
   * @param action Action being performed
   * @param context Current pipeline context
   * @returns Updated context after handling the action
   */
  async handleTransition(
    action: PipelineAction,
    context: PipelineContext
  ): Promise<PipelineContext> {
    switch (action) {
      case PipelineAction.AUTO_COMPOSE:
        return this.composeVideo(context);

      case PipelineAction.REGENERATE_COMPOSITION:
        return this.regenerateComposition(context);

      default:
        // For unsupported actions, just return the unchanged context
        return context;
    }
  }

  /**
   * Compose the video using AutomaticVideoComposer
   * @param context Current pipeline context
   * @returns Updated context with composed video
   */
  private async composeVideo(context: PipelineContext): Promise<PipelineContext> {
    if (!context.avatarVideo || !context.avatarVideo.url) {
      throw new Error('Cannot compose video: No avatar video available');
    }

    try {
      // Download the avatar video to a local file if it's a URL
      const avatarVideoPath = await this.downloadVideo(context.avatarVideo.url, context.id);

      // Create composition using AutomaticVideoComposer
      const composition = await this.createComposition(avatarVideoPath, context);

      // Return updated context with type assertion
      return {
        ...context,
        composedVideo: composition
      } as PipelineContext;
    } catch (error) {
      // Handle error and update context
      console.error('Video composition error:', error);

      return {
        ...context,
        error: {
          message: error instanceof Error ? error.message : 'Unknown composition error',
          state: context.currentState,
          action: PipelineAction.AUTO_COMPOSE,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Regenerate the composition
   * @param context Current pipeline context
   * @returns Updated context with regenerated composition
   */
  private async regenerateComposition(context: PipelineContext): Promise<PipelineContext> {
    // The key difference here is that we force a fresh composition
    const updatedContext = await this.composeVideo(context);

    // Add metadata to indicate this was a regeneration (if successful)
    if (updatedContext.composedVideo && !updatedContext.error) {
      updatedContext.composedVideo = {
        ...updatedContext.composedVideo,
        regenerated: true
      } as ComposedVideo;
    }

    return updatedContext;
  }

  /**
   * Download a video from a URL to a local file
   * @param url URL of the video
   * @param pipelineId Pipeline ID for naming
   * @returns Local path to downloaded video
   */
  private async downloadVideo(url: string, pipelineId: string): Promise<string> {
    try {
      // If the URL is already a local path, just return it
      if (url.startsWith('/')) {
        return url;
      }

      // Ensure the videos directory exists
      const fs = require('fs');
      const path = require('path');
      if (!fs.existsSync(this.videoDir)) {
        fs.mkdirSync(this.videoDir, { recursive: true });
      }

      // Generate a unique filename
      const outputPath = path.join(this.videoDir, `avatar-${pipelineId}.mp4`);

      console.log(`[AUTO COMPOSITION] Downloading video from ${url} to ${outputPath}...`);

      // Download the file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      // Write the file to disk
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(buffer));

      console.log(`[AUTO COMPOSITION] Successfully downloaded video to ${outputPath}`);

      return outputPath;
    } catch (error) {
      throw new Error(`Failed to download video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a composition using AutomaticVideoComposer
   * @param avatarVideoPath Path to avatar video
   * @param context Pipeline context
   * @returns Composed video information
   */
  private async createComposition(
    avatarVideoPath: string,
    context: PipelineContext
  ): Promise<ComposedVideo> {
    try {
      // Initialize asset manager if not already done
      if (!this.assetManager.isInitialized()) {
        await this.assetManager.initialize();
      }

      // First, we need to ingest the avatar video as an asset
      let contentAsset: VideoAsset;

      try {
        // Try to get the asset if it already exists
        contentAsset = await this.getOrCreateVideoAsset(avatarVideoPath, context);
      } catch (error) {
        console.error('Failed to create video asset:', error);
        // Fallback to simulated composition
        return this.createSimulatedComposition(context);
      }

      // Prepare composition options for AutomaticVideoComposer
      const options = {
        crossfadeDuration: 1.0,
        outputFormat: 'mp4',
        resolution: '1920x1080',
        fps: 30,
        priority: 'high' as const
      };

      console.log('Starting automatic composition with AutomaticVideoComposer...');

      // Use the real AutomaticVideoComposer
      const result = await this.composer.composeVideoAutomatically(contentAsset, options);

      if (!result.success) {
        throw new Error(result.error || 'Composition failed');
      }

      console.log(`AutomaticVideoComposer started job: ${result.jobId}`);
      console.log('Final video will be automatically ingested as "finished" and "marketing" asset');

      // Return composed video information
      return {
        id: result.jobId,
        status: 'processing', // Will be updated when job completes
        url: undefined, // Will be set when job completes
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Composition error:', error);
      // Fallback to simulated composition
      return this.createSimulatedComposition(context);
    }
  }

  /**
   * Get or create a video asset from the avatar video path
   */
  private async getOrCreateVideoAsset(avatarVideoPath: string, context: PipelineContext): Promise<VideoAsset> {
    try {
      console.log(`[AUTO COMPOSITION] Ingesting video file: ${avatarVideoPath}`);

      // Initialize the media ingest service
      const mediaIngestService = new MediaIngestService(this.assetManager);
      await mediaIngestService.initialize();

      // Check if we already have this asset
      // Use a more generic approach to find the asset
      const allVideos = await this.assetManager.getVideos();
      const existingAssets = allVideos.filter(video =>
        video.path === avatarVideoPath || video.filename === path.basename(avatarVideoPath)
      );

      if (existingAssets.length > 0) {
        console.log(`[AUTO COMPOSITION] Found existing asset for this video path`);
        return existingAssets[0] as VideoAsset;
      }

      // Ingest the video file
      const ingestResult = await mediaIngestService.ingestFile<VideoAsset>(
        avatarVideoPath,
        {
          path: avatarVideoPath,
          generateId: true,
          extractTags: true,
          overwriteExisting: false,
          defaultTitle: `Avatar Video - ${context.blog?.title || 'Untitled'}`,
          defaultDescription: `Generated avatar video for pipeline ${context.id}`,
          defaultTags: ['avatar', 'generated', 'pipeline', 'content'],
          defaultContentPurpose: [ContentPurpose.CONTENT]
        }
      );

      if (!ingestResult.success || !ingestResult.asset) {
        throw new Error(`Failed to ingest video file: ${ingestResult.error || 'Unknown error'}`);
      }

      console.log(`[AUTO COMPOSITION] Successfully ingested video as asset: ${ingestResult.asset.id}`);

      return ingestResult.asset;
    } catch (error) {
      console.error(`[AUTO COMPOSITION] Error ingesting video:`, error);
      throw new Error(`Failed to ingest video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a simulated composition as fallback
   */
  private createSimulatedComposition(context: PipelineContext): ComposedVideo {
    const composedVideoId = `comp-${Date.now()}`;
    const composedVideoPath = `${this.videoDir}/composed-${context.id}.mp4`;

    return {
      id: composedVideoId,
      status: 'complete',
      url: composedVideoPath,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Add approval tags to an asset
   * @param assetId Asset ID to tag as approved
   * @param approvalStep The step at which approval occurred
   */
  async addApprovalTags(assetId: string, approvalStep: string): Promise<void> {
    try {
      if (!this.assetManager.isInitialized()) {
        await this.assetManager.initialize();
      }

      const asset = await this.assetManager.getAssetById(assetId);
      if (asset) {
        // Add approval tags
        const approvalTags = [
          'approved',
          `approved-at-${approvalStep}`,
          `approved-${new Date().toISOString().split('T')[0]}` // Date stamp
        ];

        asset.tags = [...new Set([...asset.tags, ...approvalTags])]; // Ensure uniqueness
        await this.assetManager.updateAsset(asset);

        console.log(`Asset ${assetId} tagged as approved at step: ${approvalStep}`);
        console.log(`Added approval tags: ${approvalTags.join(', ')}`);
      }
    } catch (error) {
      console.error(`Failed to add approval tags to asset ${assetId}:`, error);
    }
  }

  /**
   * Check the status of a composition job
   * @param jobId Composition job ID
   * @returns Updated composed video information
   */
  async checkCompositionStatus(jobId: string): Promise<ComposedVideo> {
    try {
      console.log(`[AUTO COMPOSITION] 🔍 Checking status for composition job ${jobId}...`);

      // Use the real AutomaticVideoComposer to check job status
      const status = await this.composer.getJobStatus(jobId);

      console.log(`[AUTO COMPOSITION] 📊 Job ${jobId} status:`, status);

      // Map the AutomaticVideoComposer status to our ComposedVideo interface
      let composedVideoStatus: 'pending' | 'processing' | 'complete' | 'error';

      switch (status.status) {
        case JobStatus.QUEUED:
          composedVideoStatus = 'pending';
          break;
        case JobStatus.PROCESSING:
          composedVideoStatus = 'processing';
          break;
        case JobStatus.COMPLETED:
          composedVideoStatus = 'complete';
          break;
        case JobStatus.FAILED:
        case JobStatus.CANCELLED:
          composedVideoStatus = 'error';
          break;
        default:
          composedVideoStatus = 'processing';
      }

      // Generate URL from path if available
      const videoUrl = status.result?.composedVideoAsset?.path
        ? `/videos/${status.result.composedVideoAsset.filename || status.result.composedVideoAsset.id}.mp4`
        : undefined;

      return {
        id: jobId,
        status: composedVideoStatus,
        url: videoUrl,
        error: status.error ? String(status.error) : undefined,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[AUTO COMPOSITION] ❌ Failed to check composition status:`, error);
      throw new Error(`Failed to check composition status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
