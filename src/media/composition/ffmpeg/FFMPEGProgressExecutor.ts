import { updateProgress } from '../progress/ProgressStore';

/**
 * Enhanced FFMPEG executor with real-time progress tracking
 */
export class FFMPEGProgressExecutor {
  private jobId: string;
  private totalDurationSeconds?: number;

  constructor(jobId: string, totalDurationSeconds?: number) {
    this.jobId = jobId;
    this.totalDurationSeconds = totalDurationSeconds;
  }

  /**
   * Parse FFMPEG progress output and extract current time
   */
  private parseFFMPEGProgress(output: string) {
    const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const seconds = parseInt(timeMatch[3]);
      const ms = parseInt(timeMatch[4]);
      
      return hours * 3600 + minutes * 60 + seconds + ms / 100;
    }
    return null;
  }

  /**
   * Calculate progress percentage
   */
  private calculateProgress(currentTime: number): number {
    if (!this.totalDurationSeconds || this.totalDurationSeconds <= 0) {
      return 0;
    }
    return Math.min(100, Math.max(0, (currentTime / this.totalDurationSeconds) * 100));
  }

  /**
   * Execute FFMPEG command with real-time progress tracking
   */
  public async executeCommandWithProgress(command: string, timeoutMs: number = 600000): Promise<void> {
    const { spawn } = require('child_process');
    
    return new Promise<void>((resolve, reject) => {
      updateProgress(this.jobId, {
        status: 'processing',
        progress: 0,
        message: 'Starting FFMPEG processing...'
      });

      const timeout = setTimeout(() => {
        if (ffmpegProcess && !ffmpegProcess.killed) {
          ffmpegProcess.kill('SIGTERM');
        }
        reject(new Error(`FFMPEG process timed out after ${timeoutMs / 1000} seconds`));
      }, timeoutMs);

      // Split command and add progress reporting
      const commandParts = command.split(' ');
      const ffmpegBinary = commandParts[0];
      const args = commandParts.slice(1);
      args.push('-progress', 'pipe:1', '-nostats');
      
      const ffmpegProcess = spawn(ffmpegBinary, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let lastUpdate = 0;

      // Parse stdout for progress
      ffmpegProcess.stdout.on('data', (data: Buffer) => {
        const currentTime = this.parseFFMPEGProgress(data.toString());
        const now = Date.now();
        
        if (currentTime !== null && now - lastUpdate > 500) {
          const progress = this.calculateProgress(currentTime);
          
          updateProgress(this.jobId, {
            status: 'processing',
            progress: Math.round(progress),
            message: `Processing video... ${progress.toFixed(1)}% complete`
          });

          lastUpdate = now;
        }
      });

      ffmpegProcess.on('close', (code: number) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          updateProgress(this.jobId, {
            status: 'completed',
            progress: 100,
            message: 'Video processing completed successfully!'
          });
          resolve();
        } else {
          updateProgress(this.jobId, {
            status: 'failed',
            progress: 0,
            error: `FFMPEG process exited with code ${code}`
          });
          reject(new Error(`FFMPEG process exited with code ${code}`));
        }
      });

      ffmpegProcess.on('error', (error: Error) => {
        clearTimeout(timeout);
        updateProgress(this.jobId, {
          status: 'failed',
          progress: 0,
          error: `FFMPEG process error: ${error.message}`
        });
        reject(error);
      });
    });
  }
}
