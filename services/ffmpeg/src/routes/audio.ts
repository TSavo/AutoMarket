/**
 * Audio processing routes for FFMPEG Service
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { FFmpegOptions, AudioExtractionResult } from '../types';

export const audioRoutes = Router();

/**
 * POST /audio/convert
 * Convert audio file to different format
 */
audioRoutes.post('/convert', asyncHandler(async (req: Request, res: Response) => {
  const upload = req.app.locals.upload;
  const logger = req.app.locals.logger;
  const outputDir = req.app.locals.outputDir;

  // Handle file upload
  await new Promise<void>((resolve, reject) => {
    upload.single('audio')(req, res, (err: any) => {
      if (err) reject(err);
      else resolve();
    });
  });

  if (!req.file) {
    throw createError('No audio file provided', 400);
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

  const outputFilename = `converted_${outputId}.${options.outputFormat}`;
  const outputPath = path.join(outputDir, outputFilename);

  logger.info('Starting audio conversion', {
    inputFile: req.file.originalname,
    outputFile: outputFilename,
    options
  });

  try {
    // Convert audio using fluent-ffmpeg
    await new Promise<void>((resolve, reject) => {
      let command = ffmpeg(inputPath);

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
      } else if (options.outputFormat === 'wav') {
        command = command.audioCodec('pcm_s16le');
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
          logger.info('Audio conversion completed', { outputFile: outputFilename });
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

    // Get audio metadata from converted file
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

    logger.error('Audio conversion failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw createError(`Audio conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
}));
