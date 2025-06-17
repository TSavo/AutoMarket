/**
 * FFMPEGVideoDiscovery
 *
 * Video metadata discovery implementation using FFMPEG.
 * This class extracts metadata from video files using the FFMPEG command-line tool.
 */

import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import fs from 'fs';
import sharp from 'sharp';
import {
  MediaType,
  AspectRatio,
  ContentPurpose
} from '../types';
import { calculateAspectRatio } from '../utils/AspectRatioUtils';
import {
  VideoAsset,
  VideoFormat
} from '../video';
import {
  MediaIngestOptions,
  MediaIngestResult,
  VideoMediaDiscovery
} from './types';
import { BaseMediaDiscovery } from './BaseMediaDiscovery';
import {
  DerivativeMediaHandler,
  DerivativeType
} from './DerivativeMediaHandler';
import { AssetManager } from '../AssetManager';
import { VideoAssetClass } from '../VideoAssetClass';

// Promisify exec
const execAsync = promisify(exec);

/**
 * Video metadata discovery implementation using FFMPEG
 */
export class FFMPEGVideoDiscovery extends BaseMediaDiscovery<VideoAsset> implements VideoMediaDiscovery {
  // Cache for ffprobe results
  private ffprobeCache: Map<string, any> = new Map();

  // Derivative media handler
  private derivativeHandler: DerivativeMediaHandler | undefined;

  // Asset manager reference
  private assetManager: AssetManager | undefined;

  /**
   * Create a new FFMPEGVideoDiscovery
   * @param derivativeHandler Optional derivative media handler
   * @param assetManager Optional asset manager
   */
  constructor(derivativeHandler?: DerivativeMediaHandler, assetManager?: AssetManager) {
    super();

    // Use provided handler or undefined
    this.derivativeHandler = derivativeHandler;
    this.assetManager = assetManager;
  }

  /**
   * Set the derivative media handler
   * @param handler The derivative media handler to use
   */
  public setDerivativeHandler(handler: DerivativeMediaHandler): void {
    this.derivativeHandler = handler;
  }

  /**
   * Set the asset manager
   * @param manager The asset manager to use
   */
  public setAssetManager(manager: AssetManager): void {
    this.assetManager = manager;
  }

  /**
   * Get the unique identifier for this discovery implementation
   */
  public getId(): string {
    return 'ffmpeg-video-discovery';
  }

  /**
   * Get the display name for this discovery implementation
   */
  public getName(): string {
    return 'FFMPEG Video Discovery';
  }

  /**
   * Get the media type this discovery implementation supports
   */
  public getSupportedMediaType(): MediaType {
    return MediaType.VIDEO;
  }

  /**
   * Get the priority of this discovery implementation (higher number = higher priority)
   */
  public getPriority(): number {
    return 100; // High priority as it's a reliable method
  }

  /**
   * Get supported video formats
   */
  public getSupportedFormats(): VideoFormat[] {
    return [VideoFormat.MP4, VideoFormat.WEBM];
  }

  /**
   * Check if this discovery implementation can handle the given file
   * @param filePath Path to the file
   */
  public async canHandle(filePath: string): Promise<boolean> {
    const ext = path.extname(filePath).toLowerCase();

    // Check by extension first as a quick test
    if (['.mp4', '.webm', '.mov', '.avi', '.mkv'].includes(ext)) {
      try {
        // Verify it's a valid video file with ffprobe
        await this.getFFProbeInfo(filePath);
        return true;
      } catch {
        // Not a valid video file or ffprobe failed
        return false;
      }
    }

    return false;
  }

  /**
   * Discover metadata from the given file and create an asset object
   * @param filePath Path to the file
   * @param options Options for the discovery process
   */
  public async discoverMetadata(filePath: string, options: MediaIngestOptions): Promise<MediaIngestResult<VideoAsset>> {
    try {
      // Create base asset
      const baseAsset = this.createBaseAsset(filePath, options);

      // Get video dimensions
      const dimensions = await this.getVideoDimensions(filePath);

      // Get video format
      const format = await this.getVideoFormat(filePath);

      // Get video duration
      const duration = await this.getVideoDuration(filePath);

      // Check if video has audio
      const hasAudio = await this.hasAudio(filePath);

      // Check if video has captions
      const captionsInfo = await this.hasCaptions(filePath);

      // Check if video has transparency (alpha channel)
      const hasTransparency = await this.hasTransparency(filePath);

      // Calculate aspect ratio
      const aspectRatio = this.calculateAspectRatio(dimensions.width, dimensions.height);

      // Create video asset using VideoAssetClass (without thumbnail for now)
      const videoAsset = new VideoAssetClass({
        ...baseAsset,
        type: MediaType.VIDEO,
        format,
        width: dimensions.width,
        height: dimensions.height,
        aspectRatio,
        duration,
        hasAudio,
        hasCaptions: captionsInfo.hasCaptions,
        hasTransparency,
        captionPaths: captionsInfo.captionPaths
      });

      // Add standard video tag
      videoAsset.addTag('video');

      // Set dimensions (this will also set aspect ratio and add dimension tags)
      if (dimensions.width && dimensions.height) {
        videoAsset.setDimensions(dimensions.width, dimensions.height);
        console.log(`Set dimensions: ${dimensions.width}x${dimensions.height}`);
      }

      // Set resolution (SD, HD, 4K, etc.)
      const resolution = this.getResolutionLabel(dimensions.height);
      if (resolution) {
        videoAsset.setResolution(resolution);
        console.log(`Set resolution: ${resolution}`);
      }

      // Set duration
      if (duration) {
        videoAsset.setDuration(duration);
        console.log(`Set duration: ${duration} seconds`);
      }

      // Get ffprobe info for additional metadata
      try {
        const ffprobeInfo = await this.getFFProbeInfo(filePath);

        // Add fps tag if available in metadata
        if (ffprobeInfo.streams && ffprobeInfo.streams.length > 0) {
          const videoStream = ffprobeInfo.streams.find((s: any) => s.codec_type === 'video');

          if (videoStream) {
            // Set frame rate
            if (videoStream.r_frame_rate) {
              try {
                // r_frame_rate is often in the format "30000/1001" for 29.97 fps
                const [numerator, denominator] = videoStream.r_frame_rate.split('/').map(Number);
                if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
                  const fps = Math.round((numerator / denominator) * 100) / 100;
                  videoAsset.setFrameRate(fps);
                  console.log(`Set frame rate: ${fps} fps`);
                }
              } catch (e) {
                console.warn(`Could not parse frame rate: ${videoStream.r_frame_rate}`, e);
              }
            }

            // Set video codec
            if (videoStream.codec_name) {
              videoAsset.setCodec(videoStream.codec_name);
              console.log(`Set video codec: ${videoStream.codec_name}`);
            }
          }

          // Set audio codec if available
          const audioStream = ffprobeInfo.streams.find((s: any) => s.codec_type === 'audio');
          if (audioStream && audioStream.codec_name) {
            videoAsset.setAudioCodec(audioStream.codec_name);
            console.log(`Set audio codec: ${audioStream.codec_name}`);
          }
        }

        // Set bitrate if available in format metadata
        if (ffprobeInfo.format && ffprobeInfo.format.bit_rate) {
          const bitrate = parseInt(ffprobeInfo.format.bit_rate);
          if (!isNaN(bitrate)) {
            videoAsset.setBitrate(bitrate);
            console.log(`Set bitrate: ${bitrate} bps`);
          }
        }
      } catch (metadataError) {
        console.warn('Error extracting additional metadata tags:', metadataError);
      }

      // Set audio status
      videoAsset.setHasAudio(hasAudio);
      console.log(`Set audio status: ${hasAudio ? 'has audio' : 'no audio'}`);

      // Set transparency status and add appropriate tags
      videoAsset.setTransparency(hasTransparency);
      console.log(`Set transparency status: ${hasTransparency ? 'has transparency (alpha channel)' : 'no transparency'}`);
      if (hasTransparency) {
        console.log('Added OVERLAY content purpose due to transparency');
        if (!videoAsset.contentPurpose.includes(ContentPurpose.OVERLAY)) {
          videoAsset.contentPurpose.push(ContentPurpose.OVERLAY);
        }
      }

      // Ensure tags are unique
      const removedCount = videoAsset.uniquifyTags();
      if (removedCount > 0) {
        console.log(`Removed ${removedCount} duplicate tags from video asset`);
      }

      // Thumbnail generation moved to post-processing in MediaIngestService
      // to avoid timing issues where derivative registration fails because
      // the main asset hasn't been saved to database yet.
      console.log(`Skipping thumbnail generation during discovery - will be handled in post-processing`);

      return this.createSuccessResult(videoAsset);
    } catch (error) {
      return this.createErrorResult(`Error discovering video metadata: ${(error as Error).message}`);
    }
  }

  /**
   * Get video dimensions
   * @param filePath Path to the video file
   */
  public async getVideoDimensions(filePath: string): Promise<{ width: number; height: number }> {
    const info = await this.getFFProbeInfo(filePath);

    // Get the first video stream
    const videoStream = info.streams.find((stream: any) => stream.codec_type === 'video');

    if (!videoStream) {
      throw new Error('No video stream found');
    }

    return {
      width: parseInt(videoStream.width, 10),
      height: parseInt(videoStream.height, 10)
    };
  }

  /**
   * Get video format
   * @param filePath Path to the video file
   */
  public async getVideoFormat(filePath: string): Promise<VideoFormat> {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.mp4':
        return VideoFormat.MP4;
      case '.webm':
        return VideoFormat.WEBM;
      default:
        // Default to MP4 for other formats (we'll convert if necessary)
        return VideoFormat.MP4;
    }
  }

  /**
   * Get video duration in seconds
   * @param filePath Path to the video file
   */
  public async getVideoDuration(filePath: string): Promise<number> {
    const info = await this.getFFProbeInfo(filePath);

    if (info.format && info.format.duration) {
      return parseFloat(info.format.duration);
    }

    // If format duration is not available, try to get from video stream
    const videoStream = info.streams.find((stream: any) => stream.codec_type === 'video');

    if (videoStream && videoStream.duration) {
      return parseFloat(videoStream.duration);
    }

    throw new Error('Could not determine video duration');
  }

  /**
   * Check if video has audio tracks
   * @param filePath Path to the video file
   */
  public async hasAudio(filePath: string): Promise<boolean> {
    const info = await this.getFFProbeInfo(filePath);

    // Check if there's an audio stream
    return info.streams.some((stream: any) => stream.codec_type === 'audio');
  }

  /**
   * Check if video has captions
   * @param filePath Path to the video file
   */
  public async hasCaptions(filePath: string): Promise<{
    hasCaptions: boolean;
    captionPaths?: string[];
  }> {
    const info = await this.getFFProbeInfo(filePath);

    // Check if there's a subtitle stream
    const hasEmbeddedCaptions = info.streams.some((stream: any) => stream.codec_type === 'subtitle');

    // Check for external caption files
    const captionPaths = await this.findExternalCaptions(filePath);

    return {
      hasCaptions: hasEmbeddedCaptions || captionPaths.length > 0,
      captionPaths: captionPaths.length > 0 ? captionPaths : undefined
    };
  }

  /**
   * Check if video has an alpha channel (transparency)
   * @param filePath Path to the video file
   */
  public async hasTransparency(filePath: string): Promise<boolean> {
    const info = await this.getFFProbeInfo(filePath);

    // Get the first video stream
    const videoStream = info.streams.find((stream: any) => stream.codec_type === 'video');

    if (!videoStream) {
      return false;
    }

    // Enhanced transparency detection for various formats
    let isTransparent = false;
    let detectionMethod = '';

    // Method 1: Check the alpha channel in pixel format
    if (videoStream.pix_fmt && videoStream.pix_fmt.includes('a')) {
      isTransparent = true;
      detectionMethod = `pixel format: ${videoStream.pix_fmt}`;
    }
    
    // Method 2: Check ALPHA_MODE metadata (common for VP8/VP9)
    if (!isTransparent && videoStream.tags && videoStream.tags.ALPHA_MODE === '1') {
      isTransparent = true;
      detectionMethod = `ALPHA_MODE metadata: ${videoStream.tags.ALPHA_MODE}`;
    }

    // Method 3: Special check for VP9 codec
    if (!isTransparent && videoStream.codec_name === 'vp9') {
      // VP9 can have alpha channel without explicit 'a' in pixel format
      if (videoStream.tags && Object.keys(videoStream.tags).length > 0) {
        // Log all tags for debugging
        console.log(`VP9 codec detected. Metadata tags:`, JSON.stringify(videoStream.tags));
        
        // Additional VP9-specific checks could be added here if needed
      }
    }

    // Log the result
    if (isTransparent) {
      console.log(`Video has transparency (detected via ${detectionMethod})`);
    } else {
      console.log(`Video does not have transparency. Codec: ${videoStream.codec_name}, Pixel format: ${videoStream.pix_fmt}`);
    }

    return isTransparent;
  }

  /**
   * Generate and register a thumbnail for the video using the derivative handler
   * @param filePath Path to the video file
   * @param assetId ID of the video asset
   */
  public async generateAndRegisterThumbnail(filePath: string, assetId: string): Promise<{
    success: boolean;
    derivativeId?: string;
    error?: string;
    thumbnailPath?: string;
  }> {
    try {
      console.log(`Starting thumbnail generation for video: ${filePath} (Asset ID: ${assetId})`);

      if (!this.derivativeHandler) {
        console.error('No derivative handler available for thumbnail generation');
        return {
          success: false,
          error: 'No derivative handler available'
        };
      }

      // Generate thumbnail
      const thumbnailPath = this.getThumbnailPath(filePath);
      console.log(`Thumbnail will be generated at: ${thumbnailPath}`);

      // Ensure the directory exists
      const thumbnailDir = path.dirname(thumbnailPath);
      if (!fs.existsSync(thumbnailDir)) {
        console.log(`Creating thumbnail directory: ${thumbnailDir}`);
        fs.mkdirSync(thumbnailDir, { recursive: true });
      }

      // Get video duration
      const duration = await this.getVideoDuration(filePath);
      console.log(`Video duration: ${duration} seconds`);

      // Take screenshot at 10% of the video duration
      const screenshotTime = Math.min(duration * 0.1, 5); // 10% of duration or 5 seconds, whichever is less
      console.log(`Taking screenshot at ${screenshotTime} seconds`);

      // Execute ffmpeg to generate thumbnail
      try {
        console.log(`Running ffmpeg command to generate thumbnail`);
        const ffmpegCommand = `ffmpeg -i "${filePath}" -ss ${screenshotTime} -vframes 1 -vf "scale=640:-1" -y "${thumbnailPath}"`;
        console.log(`Command: ${ffmpegCommand}`);
        const { stderr } = await execAsync(ffmpegCommand);
        if (stderr) {
          console.log(`FFMPEG stderr (not necessarily an error): ${stderr}`);
        }
      } catch (ffmpegError) {
        console.error('FFMPEG error generating thumbnail:', ffmpegError);
        // Try fallback method with a different time
        try {
          console.log('Trying fallback thumbnail generation at 0 seconds');
          await execAsync(`ffmpeg -i "${filePath}" -ss 0 -vframes 1 -vf "scale=640:-1" -y "${thumbnailPath}"`);
        } catch (fallbackError) {
          console.error('Fallback thumbnail generation also failed:', fallbackError);
          throw new Error(`FFMPEG thumbnail generation failed: ${(ffmpegError as Error).message}`);
        }
      }

      // Verify the thumbnail was created
      if (!fs.existsSync(thumbnailPath)) {
        console.error(`Thumbnail file was not created at: ${thumbnailPath}`);
        return {
          success: false,
          error: 'Thumbnail file was not created'
        };
      }

      console.log(`Thumbnail file created successfully at: ${thumbnailPath}`);

      // Get dimensions of the thumbnail
      let thumbnailDimensions = { width: 640, height: 360 }; // Default dimensions

      try {
        const metadata = await sharp(thumbnailPath).metadata();
        if (metadata.width && metadata.height) {
          thumbnailDimensions = {
            width: metadata.width,
            height: metadata.height
          };
          console.log(`Thumbnail dimensions: ${thumbnailDimensions.width}x${thumbnailDimensions.height}`);
        }
      } catch (err) {
        console.warn('Could not read thumbnail dimensions:', err);
      }

      // Register the thumbnail as a derivative asset
      console.log(`Registering thumbnail as derivative asset`);
      const result = await this.derivativeHandler.registerDerivative({
        path: thumbnailPath,
        sourceAssetId: assetId,
        derivativeType: DerivativeType.THUMBNAIL,
        width: thumbnailDimensions.width,
        height: thumbnailDimensions.height,
        contentPurpose: [ContentPurpose.THUMBNAIL],
        additionalTags: ['thumbnail', 'auto-generated'] // Only add the 'thumbnail' tag, not video-specific tags
      });

      if (!result.success) {
        console.error(`Failed to register thumbnail: ${result.error}`);
        return {
          success: false,
          error: result.error || 'Unknown error registering thumbnail'
        };
      }

      console.log(`Thumbnail registered successfully with ID: ${result.derivativeId}`);

      // Update the video asset with the thumbnailPath
      if (result.asset && result.derivativeId) {
        // Get the relative path for the thumbnail
        const relativePath = result.asset.path;
        console.log(`Thumbnail relative path: ${relativePath}`);

        return {
          success: true,
          derivativeId: result.derivativeId,
          thumbnailPath: relativePath
        };
      }

      return {
        success: false,
        error: 'Failed to get asset or derivativeId from result'
      };
    } catch (error) {
      console.error('Error generating and registering thumbnail:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Legacy method: Generate or find a thumbnail for the video
   * @param filePath Path to the video file
   */
  public async generateThumbnail(filePath: string): Promise<{
    success: boolean;
    thumbnailPath?: string;
    error?: string;
  }> {
    try {
      // Check if thumbnail already exists
      const existingThumbnail = this.findExistingThumbnail(filePath);

      if (existingThumbnail) {
        return {
          success: true,
          thumbnailPath: existingThumbnail
        };
      }

      // Generate thumbnail
      const thumbnailPath = this.getThumbnailPath(filePath);
      console.log(`Legacy thumbnail generation at path: ${thumbnailPath}`);

      // Ensure the directory exists
      const thumbnailDir = path.dirname(thumbnailPath);
      if (!fs.existsSync(thumbnailDir)) {
        console.log(`Creating thumbnail directory: ${thumbnailDir}`);
        fs.mkdirSync(thumbnailDir, { recursive: true });
      }

      // Get video duration
      const duration = await this.getVideoDuration(filePath);

      // Take screenshot at 10% of the video duration
      const screenshotTime = Math.min(duration * 0.1, 5); // 10% of duration or 5 seconds, whichever is less

      try {
        // Execute ffmpeg to generate thumbnail
        console.log(`Running legacy ffmpeg command to generate thumbnail at ${screenshotTime} seconds`);
        const { stderr } = await execAsync(`ffmpeg -i "${filePath}" -ss ${screenshotTime} -vframes 1 -vf "scale=640:-1" -y "${thumbnailPath}"`);
        if (stderr) {
          console.log(`FFMPEG stderr (not necessarily an error): ${stderr}`);
        }
      } catch (ffmpegError) {
        console.error('FFMPEG error in legacy thumbnail generation:', ffmpegError);
        // Try with a different time
        try {
          console.log('Trying legacy thumbnail generation at 0 seconds');
          await execAsync(`ffmpeg -i "${filePath}" -ss 0 -vframes 1 -vf "scale=640:-1" -y "${thumbnailPath}"`);
        } catch (fallbackError) {
          console.error('Legacy fallback thumbnail generation also failed:', fallbackError);
          return {
            success: false,
            error: `FFMPEG thumbnail generation failed: ${(ffmpegError as Error).message}`
          };
        }
      }

      // Verify the thumbnail was created
      if (!fs.existsSync(thumbnailPath)) {
        console.error(`Legacy thumbnail file was not created at: ${thumbnailPath}`);
        return {
          success: false,
          error: 'Thumbnail file was not created'
        };
      }

      const relativePath = this.getRelativePath(thumbnailPath);
      console.log(`Legacy thumbnail generated successfully at: ${relativePath}`);

      return {
        success: true,
        thumbnailPath: relativePath
      };
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Calculate aspect ratio from dimensions
   * @param width Image width
   * @param height Image height
   */
  public calculateAspectRatio(width: number, height: number): AspectRatio | string {
    // Use the common utility function to calculate aspect ratio
    return calculateAspectRatio(width, height, 'FFMPEG:');
  }

  /**
   * Get FFProbe information for a video file
   * @param filePath Path to the video file
   */
  private async getFFProbeInfo(filePath: string): Promise<any> {
    // Check cache first
    if (this.ffprobeCache.has(filePath)) {
      return this.ffprobeCache.get(filePath);
    }

    // Execute ffprobe to get video info
    const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`);

    // Parse JSON
    const info = JSON.parse(stdout);

    // Cache result
    this.ffprobeCache.set(filePath, info);

    return info;
  }

  /**
   * Find external caption files for a video
   * @param filePath Path to the video file
   */
  private async findExternalCaptions(filePath: string): Promise<string[]> {
    const captionPaths: string[] = [];
    const baseFilePath = filePath.substring(0, filePath.lastIndexOf('.'));
    const dir = path.dirname(filePath);

    // Check for common caption file extensions
    const captionExtensions = ['.vtt', '.srt', '.ass', '.ssa'];

    for (const ext of captionExtensions) {
      const captionPath = baseFilePath + ext;

      if (fs.existsSync(captionPath)) {
        captionPaths.push(this.getRelativePath(captionPath));
      }
    }

    // Check for language-specific captions (e.g., video_en.vtt)
    try {
      const files = fs.readdirSync(dir);
      const baseName = path.basename(baseFilePath);

      for (const file of files) {
        if (file.startsWith(baseName + '_') && captionExtensions.some(ext => file.endsWith(ext))) {
          captionPaths.push(this.getRelativePath(path.join(dir, file)));
        }
      }
    } catch {
      // Ignore directory read errors
    }

    return captionPaths;
  }

  /**
   * Find an existing thumbnail for a video
   * @param filePath Path to the video file
   */
  private findExistingThumbnail(filePath: string): string | undefined {
    const baseFilePath = filePath.substring(0, filePath.lastIndexOf('.'));
    const dir = path.dirname(filePath);

    // Check for common thumbnail file names
    const thumbnailNames = [
      baseFilePath + '.jpg',
      baseFilePath + '.png',
      baseFilePath + '_thumb.jpg',
      baseFilePath + '_thumb.png',
      baseFilePath + '_thumbnail.jpg',
      baseFilePath + '_thumbnail.png'
    ];

    for (const thumbnailPath of thumbnailNames) {
      if (fs.existsSync(thumbnailPath)) {
        return this.getRelativePath(thumbnailPath);
      }
    }

    // Check for thumbnails in a 'thumbnails' directory
    const thumbnailsDir = path.join(dir, 'thumbnails');

    if (fs.existsSync(thumbnailsDir)) {
      const baseName = path.basename(baseFilePath);

      const thumbnailInDir = [
        path.join(thumbnailsDir, baseName + '.jpg'),
        path.join(thumbnailsDir, baseName + '.png')
      ];

      for (const thumbnailPath of thumbnailInDir) {
        if (fs.existsSync(thumbnailPath)) {
          return this.getRelativePath(thumbnailPath);
        }
      }
    }

    return undefined;
  }

  /**
   * Get the path where a thumbnail should be generated
   * @param filePath Path to the video file
   */
  private getThumbnailPath(filePath: string): string {
    const baseFilePath = filePath.substring(0, filePath.lastIndexOf('.'));
    const dir = path.dirname(filePath);

    // Create thumbnails directory if it doesn't exist
    const thumbnailsDir = path.join(dir, 'thumbnails');

    if (!fs.existsSync(thumbnailsDir)) {
      fs.mkdirSync(thumbnailsDir, { recursive: true });
    }

    // Use filename + .jpg in thumbnails directory
    const baseName = path.basename(baseFilePath);
    return path.join(thumbnailsDir, baseName + '.jpg');
  }

  // getGCD method removed - now using the common utility in AspectRatioUtils



  /**
   * Get a human-readable resolution label based on height
   * @param height The height in pixels
   * @returns Resolution label (SD, HD, FHD, 2K, 4K, 8K)
   */
  private getResolutionLabel(height?: number): string | null {
    if (!height) return null;

    if (height <= 480) return 'SD';
    if (height <= 720) return 'HD';
    if (height <= 1080) return 'FHD';
    if (height <= 1440) return '2K';
    if (height <= 2160) return '4K';
    if (height <= 4320) return '8K';

    return 'UHD'; // Ultra HD for anything higher
  }

  /**
   * Get relative path from absolute path and ensure the file is in the public directory
   * @param absolutePath Absolute path
   */
  protected getRelativePath(absolutePath: string): string {
    // Check if path is already relative
    if (absolutePath.startsWith('/') || absolutePath.startsWith('./')) {
      return absolutePath;
    }

    // Convert to relative path
    const publicDir = path.join(process.cwd(), 'public');

    if (absolutePath.startsWith(publicDir)) {
      return absolutePath.substring(publicDir.length).replace(/\\/g, '/');
    }

    // If not in public dir, copy it to public/thumbnails
    try {
      // Create public/thumbnails directory if it doesn't exist
      const publicThumbnailsDir = path.join(publicDir, 'thumbnails');
      if (!fs.existsSync(publicThumbnailsDir)) {
        fs.mkdirSync(publicThumbnailsDir, { recursive: true });
      }

      // Get the filename
      const filename = path.basename(absolutePath);

      // Create the destination path
      const destinationPath = path.join(publicThumbnailsDir, filename);

      // Copy the file
      console.log(`Copying thumbnail from ${absolutePath} to ${destinationPath}`);
      fs.copyFileSync(absolutePath, destinationPath);

      // Return the relative path
      return `/thumbnails/${filename}`;
    } catch (error) {
      console.error(`Error copying thumbnail to public directory: ${error}`);
      // If copy fails, return the original path
      return absolutePath;
    }
  }
}
