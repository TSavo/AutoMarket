/**
 * FFMPEGVideoFilterModel - Pure Video Transformation Implementation
 * 
 * Concrete implementation of VideoToVideoModel using FFmpeg for video filtering and transformation.
 * Focuses purely on transforming input videos to output videos without composition concerns.
 */

import { FFMPEGAPIClient } from './FFMPEGAPIClient';
import { IFFMPEGClient } from '../../ffmpeg/IFFMPEGClient';
import { FFMPEGDockerService } from '../../../services/FFMPEGDockerService';
import { Video, VideoRole } from '../../../assets/roles';
import { VideoToVideoModel, VideoCompositionOptions } from '../../../models/abstracts/VideoToVideoModel';
import { ModelMetadata } from '../../../models/abstracts/Model';

export class FFMPEGVideoFilterModel extends VideoToVideoModel {
  constructor(
    private dockerService?: FFMPEGDockerService,
    private apiClient?: IFFMPEGClient
  ) {
    const metadata: ModelMetadata = {
      id: 'ffmpeg-video-filter',
      name: 'FFmpeg Video Filter',
      description: 'FFmpeg-based video filtering and transformation model',
      version: '1.0.0',
      provider: 'ffmpeg-docker',
      capabilities: ['video-to-video', 'video-filtering', 'video-effects'],
      inputTypes: ['video'],
      outputTypes: ['video']
    };
    super(metadata);
  }

  // ===============================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ===============================
  /**
   * Implementation of VideoToVideoModel abstract method
   */  async transform(
    videos: VideoRole | VideoRole[], 
    options?: VideoCompositionOptions
  ): Promise<Video> {
    if (!Array.isArray(videos)) {
      videos = [videos];
    }

    if (videos.length === 0) {
      throw new Error('At least one video is required');
    }

    // If customFilterComplex is provided, use it directly like filterMultipleVideos
    if (!options?.customFilterComplex) {
      throw new Error('Custom filter complex is required for FFMPEGVideoFilterModel');
    }
  
    // Convert VideoRoles to Video objects
    const videoObjects = await Promise.all(videos.map(v => v.asVideo()));
    const videoBuffers = videoObjects.map(video => video.data);    if (!this.apiClient) {
      throw new Error('FFMPEGAPIClient is required for transform operation');
    }

    if (!this.apiClient.filterMultipleVideos) {
      throw new Error('filterMultipleVideos method is not available on this FFMPEG client');
    }

    const apiClient = this.apiClient; // TypeScript narrowing    // Use the same logic as filterMultipleVideos
    const result = await apiClient.filterMultipleVideos!(videoBuffers, {
      filterComplex: options.customFilterComplex!,
      videoOutputLabel: options.videoOutputLabel || 'final_video',
      audioOutputLabel: options.audioOutputLabel || 'mixed_audio', 
      customAudioMapping: true,
      outputFormat: options.outputFormat as any
    });

    if (!result.videoBuffer) {
      throw new Error('No video buffer returned from filter operation');
    }    const composedVideo = new Video(
      result.videoBuffer,
      options.outputFormat || 'mp4',
      { 
        format: options.outputFormat || 'mp4',
        duration: result.metadata.duration,
        width: result.metadata.width,
        height: result.metadata.height,
        framerate: result.metadata.framerate || 30
      }
    );
    // Build metadata
    const metadata = {
      duration: result.metadata.duration || 0,
      resolution: `${result.metadata.width}x${result.metadata.height}`,
      aspectRatio: '16:9',
      framerate: options.framerate || 30,
      baseVideoInfo: {
        duration: videoObjects[0].getDuration() || 0,
        resolution: `${videoObjects[0].getDimensions()?.width || 1920}x${videoObjects[0].getDimensions()?.height || 1080}`
      },
      overlayInfo: {
        count: videos.length - 1,
        overlays: videos.slice(1).map((video, index) => ({
          index,
          startTime: 0,
          duration: 0,
          position: 'custom',
          finalSize: { width: 0, height: 0 }
        }))
      }
    };

    // Set metadata on the video object if it supports it
    if ('setMetadata' in composedVideo) {
      (composedVideo as any).setMetadata(metadata);
    }

    return composedVideo;
  }

  /**
   * Check if the model is available
   */
  async isAvailable(): Promise<boolean> {
    return this.apiClient !== undefined;
  }
  
}
