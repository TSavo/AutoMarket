/**
 * FFMPEG Local Client
 * 
 * Local equivalent of FFMPEGAPIClient that runs ffmpeg locally instead of using the Docker service.
 * Implements the same interface for drop-in replacement.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { 
  FFMPEGClientConfig,
  AudioExtractionOptions,
  AudioConversionOptions,
  AudioExtractionResult,
  ServiceHealth,
  VideoCompositionOptions,
  VideoCompositionResult
} from './FFMPEGAPIClient';

export interface FFMPEGLocalConfig {
  ffmpegPath?: string;
  ffprobePath?: string;
  tempDir?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * FFMPEG Local Client for running ffmpeg locally
 */
export class FFMPEGLocalClient {
  private readonly config: Required<FFMPEGLocalConfig>;
  private readonly tempDir: string;

  constructor(config: FFMPEGLocalConfig = {}) {
    this.config = {
      ffmpegPath: config.ffmpegPath || 'ffmpeg',
      ffprobePath: config.ffprobePath || 'ffprobe',
      tempDir: config.tempDir || os.tmpdir(),
      timeout: config.timeout || 300000, // 5 minutes default
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      ...config
    };

    // Ensure temp directory exists
    this.tempDir = path.join(this.config.tempDir, 'ffmpeg-local-client');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Check service health (simulated for local client)
   */
  async checkHealth(): Promise<ServiceHealth> {
    try {
      // Test ffmpeg availability
      await this.executeFFmpeg(['-version']);
      
      return {
        status: 'healthy',
        version: '1.0.0-local',
        ffmpegVersion: await this.getFFmpegVersion(),
        uptime: process.uptime(),
        activeJobs: 0,
        totalProcessed: 0,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        version: '1.0.0-local',
        uptime: process.uptime(),
        activeJobs: 0,
        totalProcessed: 0,
        timestamp: new Date()
      };
    }
  }

  /**
   * Extract audio from video file
   */
  async extractAudio(
    videoData: Buffer | Readable | string,
    options: AudioExtractionOptions = {}
  ): Promise<AudioExtractionResult> {
    const startTime = Date.now();
    const tempInputFile = path.join(this.tempDir, `input_${uuidv4()}.mp4`);
    const outputFormat = options.outputFormat || 'wav';
    const tempOutputFile = path.join(this.tempDir, `output_${uuidv4()}.${outputFormat}`);

    try {
      // Write input data to temp file
      await this.writeInputToFile(videoData, tempInputFile);

      // Build ffmpeg command
      const args = [
        '-i', tempInputFile,
        '-vn', // No video
      ];

      // Add audio options
      if (options.outputFormat) {
        args.push('-f', options.outputFormat);
      }
      if (options.sampleRate) {
        args.push('-ar', options.sampleRate.toString());
      }
      if (options.channels) {
        args.push('-ac', options.channels.toString());
      }
      if (options.bitrate) {
        args.push('-b:a', options.bitrate);
      }
      if (options.startTime) {
        args.push('-ss', options.startTime.toString());
      }
      if (options.duration) {
        args.push('-t', options.duration.toString());
      }
      if (options.volume && options.volume !== 1) {
        args.push('-af', `volume=${options.volume}`);
      }
      if (options.normalize) {
        args.push('-af', 'loudnorm');
      }

      args.push('-y', tempOutputFile);

      // Execute ffmpeg
      await this.executeFFmpeg(args);

      // Get output file stats and metadata
      const stats = fs.statSync(tempOutputFile);
      const metadata = await this.getAudioMetadata(tempOutputFile);

      const result: AudioExtractionResult = {
        success: true,
        outputPath: tempOutputFile,
        filename: path.basename(tempOutputFile),
        format: outputFormat,
        metadata: {
          duration: metadata.duration,
          sampleRate: metadata.sampleRate,
          channels: metadata.channels,
          size: stats.size,
          bitrate: metadata.bitrate
        },
        processingTime: Date.now() - startTime
      };

      return result;
    } catch (error) {
      throw new Error(`Audio extraction failed: ${error.message}`);
    } finally {
      // Cleanup temp input file
      if (fs.existsSync(tempInputFile)) {
        fs.unlinkSync(tempInputFile);
      }
    }
  }

  /**
   * Convert audio file format
   */
  async convertAudio(
    audioData: Buffer | Readable | string,
    options: AudioConversionOptions = {}
  ): Promise<AudioExtractionResult> {
    const startTime = Date.now();
    const tempInputFile = path.join(this.tempDir, `input_${uuidv4()}.wav`);
    const outputFormat = options.outputFormat || 'wav';
    const tempOutputFile = path.join(this.tempDir, `output_${uuidv4()}.${outputFormat}`);

    try {
      // Write input data to temp file
      await this.writeInputToFile(audioData, tempInputFile);

      // Build ffmpeg command (similar to extractAudio but for audio input)
      const args = ['-i', tempInputFile];

      // Add audio options
      if (options.outputFormat) {
        args.push('-f', options.outputFormat);
      }
      if (options.sampleRate) {
        args.push('-ar', options.sampleRate.toString());
      }
      if (options.channels) {
        args.push('-ac', options.channels.toString());
      }
      if (options.bitrate) {
        args.push('-b:a', options.bitrate);
      }
      if (options.startTime) {
        args.push('-ss', options.startTime.toString());
      }
      if (options.duration) {
        args.push('-t', options.duration.toString());
      }
      if (options.volume && options.volume !== 1) {
        args.push('-af', `volume=${options.volume}`);
      }
      if (options.normalize) {
        args.push('-af', 'loudnorm');
      }

      args.push('-y', tempOutputFile);

      // Execute ffmpeg
      await this.executeFFmpeg(args);

      // Get output file stats and metadata
      const stats = fs.statSync(tempOutputFile);
      const metadata = await this.getAudioMetadata(tempOutputFile);

      const result: AudioExtractionResult = {
        success: true,
        outputPath: tempOutputFile,
        filename: path.basename(tempOutputFile),
        format: outputFormat,
        metadata: {
          duration: metadata.duration,
          sampleRate: metadata.sampleRate,
          channels: metadata.channels,
          size: stats.size,
          bitrate: metadata.bitrate
        },
        processingTime: Date.now() - startTime
      };

      return result;
    } catch (error) {
      throw new Error(`Audio conversion failed: ${error.message}`);
    } finally {
      // Cleanup temp input file
      if (fs.existsSync(tempInputFile)) {
        fs.unlinkSync(tempInputFile);
      }
    }
  }

  /**
   * Download output file (for local client, just read the file)
   */
  async downloadFile(outputPath: string): Promise<Buffer> {
    try {
      if (!fs.existsSync(outputPath)) {
        throw new Error(`Output file not found: ${outputPath}`);
      }
      return fs.readFileSync(outputPath);
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  /**
   * Get service information (simulated for local client)
   */
  async getServiceInfo(): Promise<any> {
    return {
      name: 'FFMPEG Local Client',
      version: '1.0.0-local',
      ffmpegVersion: await this.getFFmpegVersion(),
      type: 'local'
    };
  }

  /**
   * Test connection (for local client, test ffmpeg availability)
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.checkHealth();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Compose videos together with overlay (supports 2-N videos)
   */
  async composeVideo(
    videoBuffers: Buffer[],
    options: VideoCompositionOptions = {}
  ): Promise<VideoCompositionResult> {
    const startTime = Date.now();
    const tempInputFiles: string[] = [];
    const tempOutputFile = path.join(this.tempDir, `composed_${uuidv4()}.mp4`);

    try {
      // Write all video buffers to temp files
      for (let i = 0; i < videoBuffers.length; i++) {
        const tempFile = path.join(this.tempDir, `input_${i}_${uuidv4()}.mp4`);
        fs.writeFileSync(tempFile, videoBuffers[i]);
        tempInputFiles.push(tempFile);
      }

      // Build ffmpeg command
      const args: string[] = [];

      // Add input files
      tempInputFiles.forEach(file => {
        args.push('-i', file);
      });

      // Build filter complex based on options
      let filterComplex = '';
      if (options.filterComplex) {
        filterComplex = options.filterComplex;
      } else {
        // Default composition logic
        if (videoBuffers.length === 2) {
          const layout = options.layout || 'overlay';
          switch (layout) {
            case 'side-by-side':
              filterComplex = '[0:v][1:v]hstack=inputs=2[v]';
              break;
            case 'overlay':
              const position = options.overlayPosition || 'center';
              const scale = options.overlayScale || 1;
              const opacity = options.overlayOpacity || 1;
              filterComplex = `[1:v]scale=iw*${scale}:ih*${scale}[scaled];[0:v][scaled]overlay=${this.getOverlayPosition(position)}:enable='between(t,${options.overlayStart || 0},${options.overlayEnd || 999999})'[v]`;
              if (opacity < 1) {
                filterComplex = `[1:v]scale=iw*${scale}:ih*${scale},format=yuva420p,colorchannelmixer=aa=${opacity}[scaled];[0:v][scaled]overlay=${this.getOverlayPosition(position)}[v]`;
              }
              break;
            case 'picture-in-picture':
              const pipPosition = options.pipPosition || 'top-right';
              const pipScale = options.pipScale || 0.25;
              const pipMargin = options.pipMargin || 10;
              filterComplex = `[1:v]scale=iw*${pipScale}:ih*${pipScale}[pip];[0:v][pip]overlay=${this.getPipPosition(pipPosition, pipMargin)}[v]`;
              break;
            default:
              filterComplex = '[0:v][1:v]overlay[v]';
          }
        } else {
          // For N videos, create a simple grid or stack
          filterComplex = this.buildNVideoFilterComplex(videoBuffers.length, options);
        }
      }

      if (filterComplex) {
        args.push('-filter_complex', filterComplex);
        args.push('-map', options.videoOutputLabel ? `[${options.videoOutputLabel}]` : '[v]');
      }

      // Audio mapping
      if (options.customAudioMapping) {
        if (options.audioOutputLabel) {
          args.push('-map', `[${options.audioOutputLabel}]`);
        }
      } else {
        // Use first input's audio by default
        args.push('-map', '0:a?');
      }

      // Output options
      if (options.codec) {
        args.push('-c:v', options.codec);
      }
      if (options.bitrate) {
        args.push('-b:v', options.bitrate);
      }
      if (options.resolution) {
        args.push('-s', options.resolution);
      }
      if (options.fps) {
        args.push('-r', options.fps.toString());
      }

      args.push('-y', tempOutputFile);

      // Execute ffmpeg
      await this.executeFFmpeg(args);

      // Get output file stats and metadata
      const stats = fs.statSync(tempOutputFile);
      const metadata = await this.getVideoMetadata(tempOutputFile);
      const videoBuffer = fs.readFileSync(tempOutputFile);

      const result: VideoCompositionResult = {
        success: true,
        videoBuffer,
        metadata: {
          duration: metadata.duration,
          width: metadata.width,
          height: metadata.height,
          framerate: metadata.framerate,
          size: stats.size,
          videoCount: videoBuffers.length
        },
        processingTime: Date.now() - startTime
      };

      return result;
    } catch (error) {
      throw new Error(`Video composition failed: ${error.message}`);
    } finally {
      // Cleanup temp files
      tempInputFiles.forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
      if (fs.existsSync(tempOutputFile)) {
        fs.unlinkSync(tempOutputFile);
      }
    }
  }

  /**
   * Apply filter complex to a single video
   */
  async filterVideo(
    videoData: Buffer | Readable | string,
    options: VideoCompositionOptions = {}
  ): Promise<VideoCompositionResult> {
    const startTime = Date.now();
    const tempInputFile = path.join(this.tempDir, `input_${uuidv4()}.mp4`);
    const tempOutputFile = path.join(this.tempDir, `filtered_${uuidv4()}.mp4`);

    try {
      // Write input data to temp file
      await this.writeInputToFile(videoData, tempInputFile);

      // Build ffmpeg command
      const args = ['-i', tempInputFile];

      // Apply filter complex if provided
      if (options.filterComplex) {
        args.push('-filter_complex', options.filterComplex);
        if (options.videoOutputLabel) {
          args.push('-map', `[${options.videoOutputLabel}]`);
        }
      }

      // Audio mapping
      if (options.customAudioMapping && options.audioOutputLabel) {
        args.push('-map', `[${options.audioOutputLabel}]`);
      } else {
        args.push('-map', '0:a?');
      }

      // Output options
      if (options.codec) {
        args.push('-c:v', options.codec);
      }
      if (options.bitrate) {
        args.push('-b:v', options.bitrate);
      }
      if (options.resolution) {
        args.push('-s', options.resolution);
      }
      if (options.fps) {
        args.push('-r', options.fps.toString());
      }

      args.push('-y', tempOutputFile);

      // Execute ffmpeg
      await this.executeFFmpeg(args);

      // Get output file stats and metadata
      const stats = fs.statSync(tempOutputFile);
      const metadata = await this.getVideoMetadata(tempOutputFile);
      const videoBuffer = fs.readFileSync(tempOutputFile);

      const result: VideoCompositionResult = {
        success: true,
        videoBuffer,
        metadata: {
          duration: metadata.duration,
          width: metadata.width,
          height: metadata.height,
          framerate: metadata.framerate,
          size: stats.size
        },
        processingTime: Date.now() - startTime
      };

      return result;
    } catch (error) {
      throw new Error(`Video filter failed: ${error.message}`);
    } finally {
      // Cleanup temp files
      if (fs.existsSync(tempInputFile)) {
        fs.unlinkSync(tempInputFile);
      }
      if (fs.existsSync(tempOutputFile)) {
        fs.unlinkSync(tempOutputFile);
      }
    }
  }

  /**
   * Apply filter complex to multiple videos (N >= 1)
   */
  async filterMultipleVideos(
    videoBuffers: Buffer[],
    options: VideoCompositionOptions = {}
  ): Promise<VideoCompositionResult> {
    const startTime = Date.now();
    const tempInputFiles: string[] = [];
    const tempOutputFile = path.join(this.tempDir, `filtered_multi_${uuidv4()}.mp4`);

    try {
      // Write all video buffers to temp files
      for (let i = 0; i < videoBuffers.length; i++) {
        const tempFile = path.join(this.tempDir, `input_${i}_${uuidv4()}.mp4`);
        fs.writeFileSync(tempFile, videoBuffers[i]);
        tempInputFiles.push(tempFile);
      }

      // Build ffmpeg command
      const args: string[] = [];

      // Add input files
      tempInputFiles.forEach(file => {
        args.push('-i', file);
      });

      // Apply filter complex
      if (options.filterComplex) {
        args.push('-filter_complex', options.filterComplex);
        if (options.videoOutputLabel) {
          args.push('-map', `[${options.videoOutputLabel}]`);
        }
      } else {
        // Default multi-video filter
        const filterComplex = this.buildNVideoFilterComplex(videoBuffers.length, options);
        args.push('-filter_complex', filterComplex);
        args.push('-map', '[v]');
      }

      // Audio mapping
      if (options.customAudioMapping && options.audioOutputLabel) {
        args.push('-map', `[${options.audioOutputLabel}]`);
      } else {
        args.push('-map', '0:a?');
      }

      // Output options
      if (options.codec) {
        args.push('-c:v', options.codec);
      }
      if (options.bitrate) {
        args.push('-b:v', options.bitrate);
      }
      if (options.resolution) {
        args.push('-s', options.resolution);
      }
      if (options.fps) {
        args.push('-r', options.fps.toString());
      }

      args.push('-y', tempOutputFile);

      // Execute ffmpeg
      await this.executeFFmpeg(args);

      // Get output file stats and metadata
      const stats = fs.statSync(tempOutputFile);
      const metadata = await this.getVideoMetadata(tempOutputFile);
      const videoBuffer = fs.readFileSync(tempOutputFile);

      const result: VideoCompositionResult = {
        success: true,
        videoBuffer,
        metadata: {
          duration: metadata.duration,
          width: metadata.width,
          height: metadata.height,
          framerate: metadata.framerate,
          size: stats.size,
          videoCount: videoBuffers.length
        },
        processingTime: Date.now() - startTime
      };

      return result;
    } catch (error) {
      throw new Error(`Video filter failed: ${error.message}`);
    } finally {
      // Cleanup temp files
      tempInputFiles.forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
      if (fs.existsSync(tempOutputFile)) {
        fs.unlinkSync(tempOutputFile);
      }
    }
  }

  /**
   * Get video metadata
   */
  async getVideoMetadata(
    videoData: Buffer | Readable | string
  ): Promise<{ width: number; height: number; duration: number; framerate: number }> {
    let tempInputFile: string | null = null;

    try {
      let inputPath: string;

      if (typeof videoData === 'string') {
        inputPath = videoData;
      } else {
        tempInputFile = path.join(this.tempDir, `metadata_input_${uuidv4()}.mp4`);
        await this.writeInputToFile(videoData, tempInputFile);
        inputPath = tempInputFile;
      }

      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        inputPath
      ];

      const output = await this.executeFFprobe(args);
      const metadata = JSON.parse(output);

      // Find video stream
      const videoStream = metadata.streams.find((stream: any) => stream.codec_type === 'video');
      if (!videoStream) {
        throw new Error('No video stream found');
      }

      // Parse frame rate
      let framerate = 30; // default
      if (videoStream.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
        framerate = den ? num / den : num;
      }

      return {
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        duration: parseFloat(metadata.format.duration) || 0,
        framerate
      };
    } catch (error) {
      throw new Error(`Failed to get video metadata: ${error.message}`);
    } finally {
      if (tempInputFile && fs.existsSync(tempInputFile)) {
        fs.unlinkSync(tempInputFile);
      }
    }
  }

  // Private helper methods

  /**
   * Execute FFmpeg command
   */
  private executeFFmpeg(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.config.ffmpegPath, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        process.kill('SIGTERM');
        reject(new Error(`FFmpeg process timed out after ${this.config.timeout}ms`));
      }, this.config.timeout);

      process.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`FFmpeg process error: ${error.message}`));
      });
    });
  }

  /**
   * Execute FFprobe command
   */
  private executeFFprobe(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.config.ffprobePath, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        process.kill('SIGTERM');
        reject(new Error(`FFprobe process timed out after ${this.config.timeout}ms`));
      }, this.config.timeout);

      process.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`FFprobe failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`FFprobe process error: ${error.message}`));
      });
    });
  }

  /**
   * Write input data to file
   */
  private async writeInputToFile(data: Buffer | Readable | string, filePath: string): Promise<void> {
    if (typeof data === 'string') {
      // Copy file
      fs.copyFileSync(data, filePath);
    } else if (Buffer.isBuffer(data)) {
      // Write buffer
      fs.writeFileSync(filePath, data);
    } else {
      // Write stream
      return new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(filePath);
        data.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
    }
  }

  /**
   * Get FFmpeg version
   */
  private async getFFmpegVersion(): Promise<string> {
    try {
      const output = await this.executeFFmpeg(['-version']);
      const match = output.match(/ffmpeg version ([^\s]+)/);
      return match ? match[1] : 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Get audio metadata using ffprobe
   */
  private async getAudioMetadata(filePath: string): Promise<{
    duration?: number;
    sampleRate?: number;
    channels?: number;
    bitrate?: string;
  }> {
    try {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ];

      const output = await this.executeFFprobe(args);
      const metadata = JSON.parse(output);

      const audioStream = metadata.streams.find((stream: any) => stream.codec_type === 'audio');

      return {
        duration: parseFloat(metadata.format.duration),
        sampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate) : undefined,
        channels: audioStream?.channels ? parseInt(audioStream.channels) : undefined,
        bitrate: audioStream?.bit_rate || metadata.format.bit_rate
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Get overlay position string for ffmpeg
   */
  private getOverlayPosition(position: string): string {
    switch (position) {
      case 'top-left': return '0:0';
      case 'top-right': return 'W-w:0';
      case 'bottom-left': return '0:H-h';
      case 'bottom-right': return 'W-w:H-h';
      case 'center': return '(W-w)/2:(H-h)/2';
      default: return '(W-w)/2:(H-h)/2';
    }
  }

  /**
   * Get picture-in-picture position string for ffmpeg
   */
  private getPipPosition(position: string, margin: number): string {
    switch (position) {
      case 'top-left': return `${margin}:${margin}`;
      case 'top-right': return `W-w-${margin}:${margin}`;
      case 'bottom-left': return `${margin}:H-h-${margin}`;
      case 'bottom-right': return `W-w-${margin}:H-h-${margin}`;
      case 'center': return '(W-w)/2:(H-h)/2';
      default: return `W-w-${margin}:${margin}`;
    }
  }

  /**
   * Build filter complex for N videos
   */
  private buildNVideoFilterComplex(videoCount: number, options: VideoCompositionOptions): string {
    if (videoCount === 1) {
      return '[0:v]copy[v]';
    } else if (videoCount === 2) {
      return '[0:v][1:v]hstack=inputs=2[v]';
    } else {
      // For more than 2 videos, create a grid layout
      const cols = Math.ceil(Math.sqrt(videoCount));
      const rows = Math.ceil(videoCount / cols);

      let filterComplex = '';
      for (let i = 0; i < videoCount; i++) {
        filterComplex += `[${i}:v]scale=640:480[v${i}];`;
      }

      // Create horizontal stacks for each row
      for (let row = 0; row < rows; row++) {
        const startIdx = row * cols;
        const endIdx = Math.min(startIdx + cols, videoCount);
        const inputs: string[] = [];
        for (let i = startIdx; i < endIdx; i++) {
          inputs.push(`[v${i}]`);
        }
        if (inputs.length > 1) {
          filterComplex += `${inputs.join('')}hstack=inputs=${inputs.length}[row${row}];`;
        } else {
          filterComplex += `[v${startIdx}]copy[row${row}];`;
        }
      }

      // Stack rows vertically
      if (rows > 1) {
        const rowInputs: string[] = [];
        for (let i = 0; i < rows; i++) {
          rowInputs.push(`[row${i}]`);
        }
        filterComplex += `${rowInputs.join('')}vstack=inputs=${rows}[v]`;
      } else {
        filterComplex += '[row0]copy[v]';
      }

      return filterComplex;
    }
  }

  /**
   * Cleanup temp files (call this periodically or on shutdown)
   */
  cleanup(): void {
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        files.forEach(file => {
          const filePath = path.join(this.tempDir, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to cleanup temp files:', error.message);
    }
  }
}
