/**
 * Health check routes for FFMPEG Service
 */

import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { asyncHandler } from '../middleware/errorHandler';
import { ServiceHealth, ApiResponse } from '../types';

const execAsync = promisify(exec);

export const healthRoutes = Router();

// Service start time for uptime calculation
const startTime = Date.now();
let totalProcessed = 0;
let activeJobs = 0;

/**
 * GET /health
 * Basic health check endpoint
 */
healthRoutes.get('/', asyncHandler(async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    // Check if FFmpeg is available
    let ffmpegVersion: string | undefined;
    try {
      const { stdout } = await execAsync('ffmpeg -version');
      const versionMatch = stdout.match(/ffmpeg version ([^\s]+)/);
      ffmpegVersion = versionMatch ? versionMatch[1] : 'unknown';
    } catch (error) {
      logger.warn('FFmpeg not found or not accessible', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw new Error('FFmpeg not available');
    }

    const uptime = Date.now() - startTime;
    
    const health: ServiceHealth = {
      status: 'healthy',
      version: '1.0.0',
      ffmpegVersion,
      uptime,
      activeJobs,
      totalProcessed,
      timestamp: new Date()
    };

    const response: ApiResponse<ServiceHealth> = {
      success: true,
      data: health,
      message: 'Service is healthy',
      timestamp: new Date()
    };

    res.json(response);

  } catch (error) {
    const health: ServiceHealth = {
      status: 'unhealthy',
      version: '1.0.0',
      uptime: Date.now() - startTime,
      activeJobs,
      totalProcessed,
      timestamp: new Date()
    };

    const response: ApiResponse<ServiceHealth> = {
      success: false,
      data: health,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Service is unhealthy',
      timestamp: new Date()
    };

    res.status(503).json(response);
  }
}));

/**
 * GET /health/detailed
 * Detailed health check with system information
 */
healthRoutes.get('/detailed', asyncHandler(async (req: Request, res: Response) => {
  const logger = req.app.locals.logger;

  try {
    // Get FFmpeg version and capabilities
    const { stdout: versionOutput } = await execAsync('ffmpeg -version');
    const { stdout: codecsOutput } = await execAsync('ffmpeg -codecs');
    const { stdout: formatsOutput } = await execAsync('ffmpeg -formats');

    const versionMatch = versionOutput.match(/ffmpeg version ([^\s]+)/);
    const ffmpegVersion = versionMatch ? versionMatch[1] : 'unknown';

    // Parse available codecs and formats
    const audioCodecs = codecsOutput.match(/DEA.* ([a-z0-9_]+) /g)?.map(m => m.trim()) || [];
    const videoCodecs = codecsOutput.match(/DEV.* ([a-z0-9_]+) /g)?.map(m => m.trim()) || [];
    const formats = formatsOutput.match(/DE ([a-z0-9_,]+) /g)?.map(m => m.trim()) || [];

    const uptime = Date.now() - startTime;
    
    const detailedHealth = {
      status: 'healthy',
      version: '1.0.0',
      ffmpeg: {
        version: ffmpegVersion,
        audioCodecs: audioCodecs.slice(0, 10), // Limit for response size
        videoCodecs: videoCodecs.slice(0, 10),
        formats: formats.slice(0, 20)
      },
      system: {
        uptime,
        activeJobs,
        totalProcessed,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage()
      },
      timestamp: new Date()
    };

    const response: ApiResponse = {
      success: true,
      data: detailedHealth,
      message: 'Detailed health information',
      timestamp: new Date()
    };

    res.json(response);

  } catch (error) {
    logger.error('Detailed health check failed', { error: error instanceof Error ? error.message : 'Unknown error' });

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to get detailed health information',
      timestamp: new Date()
    };

    res.status(503).json(response);
  }
}));

// Export functions to update counters
export const incrementActiveJobs = () => activeJobs++;
export const decrementActiveJobs = () => activeJobs--;
export const incrementTotalProcessed = () => totalProcessed++;
