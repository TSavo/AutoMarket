/**
 * Type definitions for FFMPEG Service
 */

export interface FFmpegOptions {
  outputFormat?: 'wav' | 'mp3' | 'flac' | 'm4a' | 'aac' | 'ogg';
  sampleRate?: number | undefined;
  channels?: number | undefined;
  bitrate?: string | undefined;
  quality?: string | undefined;
  startTime?: number | undefined;
  duration?: number | undefined;
  volume?: number | undefined;
  normalize?: boolean;
}

export interface VideoProcessingOptions {
  outputFormat?: 'mp4' | 'avi' | 'mov' | 'mkv' | 'webm';
  codec?: string;
  bitrate?: string;
  resolution?: string;
  fps?: number;
  startTime?: number;
  duration?: number;
}

export interface VideoCompositionOptions {
  // Output options only - filter logic is now provided via filterComplex
  outputFormat?: 'mp4' | 'avi' | 'mov' | 'mkv' | 'webm';
  codec?: string;
  bitrate?: string;
  resolution?: string;
  fps?: number;
  // Custom filter complex string (required)
  filterComplex?: string;
  // Custom output mapping options
  videoOutputLabel?: string; // Label for video output (default: 'v')
  audioOutputLabel?: string; // Label for audio output (default: use input audio)
  customAudioMapping?: boolean; // Whether to use custom audio mapping instead of input audio
}

export interface AudioExtractionResult {
  success: boolean;
  outputPath?: string;
  filename?: string;
  format: string;
  metadata: {
    duration?: number;
    sampleRate?: number;
    channels?: number;
    size: number;
    bitrate?: string;
  };
  processingTime: number;
  error?: string;
}

export interface VideoProcessingResult {
  success: boolean;
  outputPath?: string;
  filename?: string;
  format: string;
  metadata: {
    duration?: number;
    width?: number;
    height?: number;
    fps?: number;
    size: number;
    bitrate?: string;
    codec?: string;
  };
  processingTime: number;
  error?: string;
}

export interface VideoCompositionResult {
  success: boolean;
  outputPath?: string;
  filename?: string;
  format: string;
  metadata: {
    duration?: number;
    width?: number;
    height?: number;
    fps?: number;
    size: number;
    bitrate?: string;
    codec?: string;
  };
  processingTime: number;
  error?: string;
}

export interface ProcessingJob {
  id: string;
  type: 'audio-extraction' | 'video-processing' | 'audio-conversion' | 'video-composition';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  inputFile: string;
  outputFile?: string;
  options: FFmpegOptions | VideoProcessingOptions | VideoCompositionOptions;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  progress?: number;
}

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy';
  version: string;
  ffmpegVersion?: string | undefined;
  uptime: number;
  activeJobs: number;
  totalProcessed: number;
  timestamp: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface FileUploadInfo {
  originalName: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
  uploadedAt: Date;
}

export interface FrameExtractionOptions {
  frameTime?: number; // Extract frame at specific time (seconds)
  frameNumber?: number; // Extract specific frame number
  format?: 'png' | 'jpg' | 'webp' | 'bmp';
  width?: number;
  height?: number;
  quality?: number; // 1-100, for JPEG
  multiple?: boolean; // Extract multiple frames
  frameRate?: number; // For multiple frame extraction (fps)
}

export interface FrameExtractionResult {
  success: boolean;
  data: {
    frames: Array<{
      filename: string;
      path: string;
      size: number;
      format: string;
      frameTime?: number;
      frameNumber?: number;
      index?: number;
    }>;
    extractionOptions: FrameExtractionOptions;
    processingTime: number;
    totalFrames: number;
  };
  timestamp: Date;
}
