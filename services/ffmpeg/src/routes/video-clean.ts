/**
 * Video processing routes for FFMPEG Service
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { FFmpegOptions, AudioExtractionResult, VideoCompositionOptions, VideoCompositionResult } from '../types';

export const videoRoutes = Router();

/**
 * POST /video/extractAudio
 * Extract audio from video file
 */
videoRoutes.post('/extractAudio', asyncHandler(async (req: Request, res: Response) => {
  const upload = req.app.locals.upload;
  const logger = req.app.locals.logger;
  const outputDir = req.app.locals.outputDir;

  // Handle file upload
  await new Promise<void>((resolve, reject) => {
    upload.single('video')(req, res, (err: any) => {
      if (err) reject(err);
      else resolve();
    });
  });

  if (!req.file) {
    throw createError('No video file provided', 400);
  }

  const startTime = Date.now();
  const inputPath = req.file.path;
  const outputId = uuidv4();
  
  // Parse options from request body
  const options: FFmpegOptions = {
    outputFormat: req.body.outputFormat || 'wav',
    sampleRate: req.body.sampleRate ? parseInt(req.body.sampleRate) : undefined,
    channels: req.body.channels ? parseInt(req.body.channels) : undefined,
    bitrate: req.body.bitrate,
    quality: req.body.quality,
    startTime: req.body.startTime ? parseFloat(req.body.startTime) : undefined,
    duration: req.body.duration ? parseFloat(req.body.duration) : undefined,
    volume: req.body.volume ? parseFloat(req.body.volume) : undefined,
    normalize: req.body.normalize === 'true'
  };

  const outputFilename = `audio_${outputId}.${options.outputFormat}`;
  const outputPath = path.join(outputDir, outputFilename);

  logger.info('Starting audio extraction', {
    inputFile: req.file.originalname,
    outputFile: outputFilename,
    options
  });

  try {
    // Get input file metadata first
    const metadata = await new Promise<any>((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });

    // Extract audio using fluent-ffmpeg with GPU acceleration for decoding
    await new Promise<void>((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .inputOptions([
          '-hwaccel', 'cuda',
          '-hwaccel_output_format', 'cuda'
        ])
        .noVideo()
        .audioCodec('pcm_s16le'); // Default to PCM for WAV

      // Apply format-specific settings
      if (options.outputFormat === 'mp3') {
        command = command.audioCodec('libmp3lame');
      } else if (options.outputFormat === 'flac') {
        command = command.audioCodec('flac');
      } else if (options.outputFormat === 'm4a') {
        command = command.audioCodec('aac');
      } else if (options.outputFormat === 'aac') {
        command = command.audioCodec('aac');
      } else if (options.outputFormat === 'ogg') {
        command = command.audioCodec('libvorbis');
      }

      // Apply options
      if (options.sampleRate) {
        command = command.audioFrequency(options.sampleRate);
      }
      if (options.channels) {
        command = command.audioChannels(options.channels);
      }
      if (options.bitrate) {
        command = command.audioBitrate(options.bitrate);
      }
      if (options.quality) {
        command = command.audioQuality(parseInt(options.quality));
      }
      if (options.startTime) {
        command = command.seekInput(options.startTime);
      }
      if (options.duration) {
        command = command.duration(options.duration);
      }
      if (options.volume && options.volume !== 1.0) {
        command = command.audioFilters(`volume=${options.volume}`);
      }
      if (options.normalize) {
        command = command.audioFilters('loudnorm');
      }

      command
        .output(outputPath)
        .on('start', (commandLine) => {
          logger.info('FFmpeg command started', { command: commandLine });
        })
        .on('progress', (progress) => {
          logger.debug('Processing progress', progress);
        })
        .on('end', () => {
          logger.info('Audio extraction completed', { outputFile: outputFilename });
          resolve();
        })
        .on('error', (err) => {
          logger.error('FFmpeg error', { error: err.message });
          reject(err);
        })
        .run();
    });

    // Get output file stats
    const outputStats = fs.statSync(outputPath);
    const processingTime = Date.now() - startTime;

    // Get audio metadata from extracted file
    const audioMetadata = await new Promise<any>((resolve, reject) => {
      ffmpeg.ffprobe(outputPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });

    const result: AudioExtractionResult = {
      success: true,
      outputPath: `/outputs/${outputFilename}`,
      filename: outputFilename,
      format: options.outputFormat || 'wav',
      metadata: {
        duration: audioMetadata.format?.duration,
        sampleRate: audioMetadata.streams?.[0]?.sample_rate,
        channels: audioMetadata.streams?.[0]?.channels,
        size: outputStats.size,
        bitrate: audioMetadata.format?.bit_rate
      },
      processingTime
    };

    // Clean up input file
    fs.unlinkSync(inputPath);

    // Return the audio file directly instead of JSON metadata
    const audioBuffer = fs.readFileSync(outputPath);

    // Set appropriate headers for audio streaming
    const mimeType = options.outputFormat === 'mp3' ? 'audio/mpeg' :
                     options.outputFormat === 'wav' ? 'audio/wav' :
                     options.outputFormat === 'flac' ? 'audio/flac' :
                     options.outputFormat === 'm4a' ? 'audio/mp4' :
                     options.outputFormat === 'aac' ? 'audio/aac' :
                     options.outputFormat === 'ogg' ? 'audio/ogg' :
                     'audio/wav';

    res.set({
      'Content-Type': mimeType,
      'Content-Length': audioBuffer.length.toString(),
      'Content-Disposition': `attachment; filename="${outputFilename}"`,
      'X-Processing-Time': processingTime.toString(),
      'X-Audio-Duration': result.metadata.duration?.toString() || '',
      'X-Audio-Channels': result.metadata.channels?.toString() || '',
      'X-Audio-Sample-Rate': result.metadata.sampleRate?.toString() || ''
    });

    res.send(audioBuffer);

    // Clean up output file after sending
    fs.unlinkSync(outputPath);

  } catch (error) {
    // Clean up files on error
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    logger.error('Audio extraction failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw createError(`Audio extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
}));

/**
 * POST /video/filter
 * Apply filter complex to N videos (N >= 1)
 */
videoRoutes.post('/filter', asyncHandler(async (req: Request, res: Response) => {
  const upload = req.app.locals.upload;
  const logger = req.app.locals.logger;
  const outputDir = req.app.locals.outputDir;

  // Handle multiple file uploads (any number of videos)
  await new Promise<void>((resolve, reject) => {
    upload.any()(req, res, (err: any) => {
      if (err) {
        logger.error('File upload error:', err);
        reject(createError(`File upload failed: ${err.message}`, 400));
      } else {
        resolve();
      }
    });
  });

  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length < 1) {
    throw createError('At least one video file is required', 400);
  }

  const startTime = Date.now();
  const outputId = uuidv4();
  
  // Parse options from request body
  const options: VideoCompositionOptions = {
    outputFormat: req.body.outputFormat || 'mp4',
    codec: req.body.codec || 'h264_nvenc',
    bitrate: req.body.bitrate,
    resolution: req.body.resolution,
    filterComplex: req.body.filterComplex,
    videoOutputLabel: req.body.videoOutputLabel || 'final_video',
    audioOutputLabel: req.body.audioOutputLabel || 'mixed_audio',
    customAudioMapping: req.body.customAudioMapping === 'true'
  };

  // Add fps if provided
  if (req.body.fps) {
    options.fps = parseInt(req.body.fps);
  }

  // filterComplex is required for all operations
  const customFilterComplex = req.body.filterComplex;

  if (!customFilterComplex) {
    throw createError('filterComplex is required in the request body', 400);
  }

  const outputFilename = `filtered_${outputId}.${options.outputFormat}`;
  const outputPath = path.join(outputDir, outputFilename);

  logger.info('Starting video filtering', {
    videoCount: files.length,
    videoFiles: files.map(f => f.originalname),
    outputFile: outputFilename,
    options,
    filterComplex: customFilterComplex
  });

  try {
    // Get metadata for all input videos
    const videoMetadatas = await Promise.all(
      files.map(file => new Promise<any>((resolve, reject) => {
        ffmpeg.ffprobe(file.path, (err, metadata) => {
          if (err) reject(err);
          else resolve(metadata);
        });
      }))
    );

    // Get video dimensions from the first video (assumed to be base video)
    const baseVideoStream = videoMetadatas[0].streams.find((s: any) => s.codec_type === 'video');
    const baseWidth = baseVideoStream?.width || 1920;
    const baseHeight = baseVideoStream?.height || 1080;

    logger.info('Video metadata extracted', {
      videoCount: videoMetadatas.length,
      baseResolution: `${baseWidth}x${baseHeight}`
    });

    // Build input mapping for ffmpeg
    const inputPaths = files.map(file => file.path);
    
    // Create ffmpeg command with multiple inputs
    let command = ffmpeg();
    
    // Add all input files
    inputPaths.forEach(inputPath => {
      command = command.input(inputPath);
    });

    // Use the provided filter complex
    command = command
      .complexFilter(customFilterComplex)
      .outputOptions([
        '-map', `[${options.videoOutputLabel}]`,  // Map video output from filter
        ...(options.customAudioMapping && options.audioOutputLabel ? 
          ['-map', `[${options.audioOutputLabel}]`] : 
          ['-map', '0:a'] // Default to first input's audio
        ),
        '-c:v', options.codec || 'h264_nvenc',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart'
      ]);

    // Add additional encoding options
    if (options.bitrate) {
      command = command.outputOptions(['-b:v', options.bitrate]);
    }

    if (options.fps) {
      command = command.outputOptions(['-r', options.fps.toString()]);
    }

    // Execute the filter operation
    await new Promise<void>((resolve, reject) => {
      command
        .output(outputPath)
        .on('start', (commandLine) => {
          logger.info('FFmpeg video filter started', { commandLine });
        })
        .on('progress', (progress) => {
          logger.debug('Video filter progress:', progress);
        })
        .on('end', () => {
          logger.info('Video filter completed successfully');
          resolve();
        })
        .on('error', (err) => {
          logger.error('Video filter failed:', err);
          reject(err);
        })
        .run();
    });

    // Get output file stats
    const outputStats = fs.statSync(outputPath);
    const processingTime = Date.now() - startTime;

    // Get output video metadata
    const outputMetadata = await new Promise<any>((resolve, reject) => {
      ffmpeg.ffprobe(outputPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });

    const outputVideoStream = outputMetadata.streams.find((s: any) => s.codec_type === 'video');

    // Clean up input files
    files.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });

    // Return the video file directly with metadata in headers
    const videoBuffer = fs.readFileSync(outputPath);

    res.set({
      'Content-Type': 'video/mp4',
      'Content-Length': videoBuffer.length.toString(),
      'Content-Disposition': `attachment; filename="${outputFilename}"`,
      'X-Processing-Time': processingTime.toString(),
      'X-Video-Duration': outputMetadata.format?.duration?.toString() || '',
      'X-Video-Width': outputVideoStream?.width?.toString() || '',
      'X-Video-Height': outputVideoStream?.height?.toString() || '',
      'X-Video-FPS': outputVideoStream?.r_frame_rate || '',
      'X-Video-Count': files.length.toString()
    });

    res.send(videoBuffer);

    // Clean up output file after sending
    fs.unlinkSync(outputPath);

  } catch (error) {
    // Clean up files on error
    files.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    logger.error('Video filter failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw createError(`Video filter failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
}));

/**
 * POST /video/metadata
 * Get video metadata
 */
videoRoutes.post('/metadata', asyncHandler(async (req: Request, res: Response) => {
  const upload = req.app.locals.upload;
  const logger = req.app.locals.logger;

  // Handle file upload
  await new Promise<void>((resolve, reject) => {
    upload.single('video')(req, res, (err: any) => {
      if (err) reject(err);
      else resolve();
    });
  });

  if (!req.file) {
    throw createError('No video file provided', 400);
  }

  const videoPath = req.file.path;

  logger.info('Extracting video metadata', {
    file: req.file.originalname
  });

  try {
    // Get video metadata using ffprobe
    const metadata = await new Promise<any>((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });

    // Extract relevant metadata fields
    const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
    const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');

    const result = {
      format: metadata.format.format_name,
      duration: metadata.format.duration,
      size: metadata.format.size,
      bitrate: metadata.format.bit_rate,
      width: videoStream?.width,
      height: videoStream?.height,
      fps: videoStream?.r_frame_rate ? eval(videoStream.r_frame_rate) : undefined,
      videoCodec: videoStream?.codec_name,
      audioCodec: audioStream?.codec_name,
      channels: audioStream?.channels,
      sampleRate: audioStream?.sample_rate
    };

    logger.info('Video metadata extracted', {
      file: req.file.originalname,
      metadata: result
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Metadata extraction failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw createError(`Metadata extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  } finally {
    // Clean up uploaded file
    if (req.file?.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) logger.error('Failed to delete uploaded file', { file: req.file!.path, error: err.message });
      });
    }
  }
}));
