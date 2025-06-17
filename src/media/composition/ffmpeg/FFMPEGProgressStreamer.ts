import { updateProgress } from '../progress/ProgressStore';

/**
 * Simple FFMPEG executor that streams raw output to client
 */
export class FFMPEGProgressStreamer {
  private jobId: string;

  constructor(jobId: string) {
    this.jobId = jobId;
  }

  /**
   * Execute FFMPEG command and stream raw output to progress
   */
  public async executeWithProgressStream(command: string, timeoutMs: number = 600000): Promise<void> {
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

      const commandParts = command.split(' ');
      const ffmpegBinary = commandParts[0];
      const args = commandParts.slice(1);
      
      const ffmpegProcess = spawn(ffmpegBinary, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Stream raw FFMPEG output directly to progress
      ffmpegProcess.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        
        updateProgress(this.jobId, {
          status: 'processing',
          progress: 50, // Generic progress since we're not parsing
          message: output.trim()
        });
      });

      ffmpegProcess.on('close', (code: number) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          updateProgress(this.jobId, {
            status: 'completed',
            progress: 100,
            message: 'FFMPEG processing completed successfully!'
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
          error: `FFMPEG error: ${error.message}`
        });
        reject(error);
      });
    });
  }
}
