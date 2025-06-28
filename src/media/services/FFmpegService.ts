/**
 * FFmpegService
 * 
 * Service for handling FFmpeg operations for audio/video processing.
 * Provides methods to extract audio from video files and convert between formats.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface FFmpegOptions {
  outputFormat?: 'wav' | 'mp3' | 'flac' | 'm4a';
  sampleRate?: number;
  channels?: number;
  bitrate?: string;
  quality?: string;
  startTime?: number;
  duration?: number;
}

export interface AudioExtractionResult {
  audioBuffer: Buffer;
  format: string;
  metadata: {
    duration?: number;
    sampleRate?: number;
    channels?: number;
    size: number;
  };
}

/**
 * FFmpeg service for audio/video processing
 */
export class FFmpegService {
  private static instance: FFmpegService;
  private ffmpegPath: string;
  private tempDir: string;

  constructor(ffmpegPath?: string, tempDir?: string) {
    this.ffmpegPath = ffmpegPath || 'ffmpeg';
    this.tempDir = tempDir || path.join(os.tmpdir(), 'prizm-ffmpeg');
    this.ensureTempDir();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): FFmpegService {
    if (!FFmpegService.instance) {
      FFmpegService.instance = new FFmpegService();
    }
    return FFmpegService.instance;
  }

  /**
   * Extract audio from video buffer
   */
  async extractAudioFromVideo(
    videoBuffer: Buffer,
    options: FFmpegOptions = {}
  ): Promise<AudioExtractionResult> {
    const {
      outputFormat = 'wav',
      sampleRate = 44100,
      channels = 2,
      bitrate = '192k',
      startTime,
      duration
    } = options;

    // Create temporary files
    const inputFile = this.createTempFile(videoBuffer, 'video');
    const outputFile = this.createTempFile(null, `audio.${outputFormat}`);

    try {
      // Build ffmpeg command
      const args = [
        '-i', inputFile,
        '-vn', // No video
        '-acodec', this.getAudioCodec(outputFormat),
        '-ar', sampleRate.toString(),
        '-ac', channels.toString()
      ];

      // Add optional parameters
      if (startTime !== undefined) {
        args.splice(2, 0, '-ss', startTime.toString());
      }
      if (duration !== undefined) {
        args.push('-t', duration.toString());
      }
      if (outputFormat === 'mp3') {
        args.push('-b:a', bitrate);
      }

      args.push('-y', outputFile); // Overwrite output file

      // Execute ffmpeg
      await this.executeFFmpeg(args);

      // Read the output file
      const audioBuffer = fs.readFileSync(outputFile);

      // Get metadata from the extracted audio
      const metadata = await this.getAudioMetadata(outputFile);

      return {
        audioBuffer,
        format: outputFormat,
        metadata: {
          ...metadata,
          size: audioBuffer.length
        }
      };
    } finally {
      // Clean up temporary files
      this.cleanupTempFile(inputFile);
      this.cleanupTempFile(outputFile);
    }
  }

  /**
   * Extract audio from video file path
   */
  async extractAudioFromVideoFile(
    videoFilePath: string,
    options: FFmpegOptions = {}
  ): Promise<AudioExtractionResult> {
    const videoBuffer = fs.readFileSync(videoFilePath);
    return this.extractAudioFromVideo(videoBuffer, options);
  }

  /**
   * Convert audio format
   */
  async convertAudio(
    audioBuffer: Buffer,
    fromFormat: string,
    toFormat: string,
    options: FFmpegOptions = {}
  ): Promise<Buffer> {
    const inputFile = this.createTempFile(audioBuffer, `audio.${fromFormat}`);
    const outputFile = this.createTempFile(null, `audio.${toFormat}`);

    try {
      const args = [
        '-i', inputFile,
        '-acodec', this.getAudioCodec(toFormat),
        '-y', outputFile
      ];

      await this.executeFFmpeg(args);
      return fs.readFileSync(outputFile);
    } finally {
      this.cleanupTempFile(inputFile);
      this.cleanupTempFile(outputFile);
    }
  }

  /**
   * Check if FFmpeg is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.executeFFmpeg(['-version']);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get audio metadata using ffprobe
   */
  async getAudioMetadata(filePath: string): Promise<{
    duration?: number;
    sampleRate?: number;
    channels?: number;
  }> {
    try {
      const result = await this.executeFFprobe([
        '-v', 'quiet',
        '-show_entries', 'format=duration:stream=sample_rate,channels',
        '-of', 'csv=p=0',
        filePath
      ]);

      const lines = result.trim().split('\n');
      const formatLine = lines[0]?.split(',');
      const streamLine = lines[1]?.split(',');

      return {
        duration: formatLine?.[0] ? parseFloat(formatLine[0]) : undefined,
        sampleRate: streamLine?.[0] ? parseInt(streamLine[0]) : undefined,
        channels: streamLine?.[1] ? parseInt(streamLine[1]) : undefined
      };
    } catch (error) {
      console.warn('Failed to get audio metadata:', error);
      return {};
    }
  }

  /**
   * Get video metadata using ffprobe
   */  async getVideoMetadata(filePath: string): Promise<{
    duration?: number;
    width?: number;
    height?: number;
    frameRate?: number;
    codec?: string;
  }> {
    try {
      // Use JSON output format which is much more reliable than CSV
      const result = await this.executeFFprobe([
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        '-select_streams', 'v:0', // Select first video stream
        filePath
      ]);

      const data = JSON.parse(result);
      const videoStream = data.streams?.[0];
      const format = data.format;

      // Parse frame rate from video stream
      let frameRate: number | undefined;
      if (videoStream?.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
        if (den && den > 0) {
          frameRate = num / den;
        }      }

      return {
        duration: format?.duration ? parseFloat(format.duration) : undefined,
        width: videoStream?.width ? parseInt(videoStream.width) : undefined,
        height: videoStream?.height ? parseInt(videoStream.height) : undefined,
        frameRate,
        codec: videoStream?.codec_name || undefined
      };
    } catch (error) {
      console.warn('Failed to get video metadata with ffprobe:', error);
      return {};
    }
  }

  /**
   * Execute FFmpeg command
   */
  private executeFFmpeg(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, args, {
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

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`FFmpeg process error: ${error.message}`));
      });
    });
  }

  /**
   * Execute FFprobe command
   */
  private executeFFprobe(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn('ffprobe', args, {
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

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`FFprobe failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`FFprobe process error: ${error.message}`));
      });
    });
  }

  /**
   * Get appropriate audio codec for format
   */
  private getAudioCodec(format: string): string {
    switch (format.toLowerCase()) {
      case 'mp3':
        return 'libmp3lame';
      case 'wav':
        return 'pcm_s16le';
      case 'flac':
        return 'flac';
      case 'm4a':
        return 'aac';
      case 'ogg':
        return 'libvorbis';
      default:
        return 'pcm_s16le'; // Default to WAV
    }
  }

  /**
   * Create temporary file
   */
  private createTempFile(buffer: Buffer | null, suffix: string): string {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${suffix}`;
    const filePath = path.join(this.tempDir, fileName);
    
    if (buffer) {
      fs.writeFileSync(filePath, buffer);
    }
    
    return filePath;
  }

  /**
   * Clean up temporary file
   */
  private cleanupTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn(`Failed to cleanup temp file ${filePath}:`, error);
    }
  }

  /**
   * Ensure temp directory exists
   */
  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }  /**
   * Extract audio from video buffer - simplified version that returns just the audio buffer
   */
  async extractAudio(videoBuffer: Buffer, inputFormat: string): Promise<Buffer> {
    console.log(`[FFmpegService] extractAudio called with format: ${inputFormat}, buffer size: ${videoBuffer.length} bytes`);
    
    try {
      const result = await this.extractAudioFromVideo(videoBuffer, {
        outputFormat: 'wav',
        sampleRate: 44100,
        channels: 2
      });
      console.log(`[FFmpegService] Audio extraction successful, output size: ${result.audioBuffer.length} bytes`);
      return result.audioBuffer;
    } catch (error) {
      console.error('[FFmpegService] Failed to extract audio:', error.message);
      throw new Error(`Failed to extract audio: ${error.message}`);
    }
  }
}
