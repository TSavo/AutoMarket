/**
 * ProgressTracker.ts
 *
 * Tracks progress of FFMPEG operations
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { createInterface, Interface } from 'readline';

/**
 * Progress information
 */
export interface ProgressInfo {
  frame: number;
  fps: number;
  q: number;
  size: string;
  time: string;
  bitrate: string;
  speed: string;
  progress: number; // 0-100
  eta: number; // seconds
  stage: string;
}

/**
 * Progress tracker events
 */
export interface ProgressTrackerEvents {
  progress: (info: ProgressInfo) => void;
  start: () => void;
  end: () => void;
  error: (error: Error) => void;
  log: (message: string) => void;
}

/**
 * Progress tracker options
 */
export interface ProgressTrackerOptions {
  totalDuration: number; // Total duration in seconds
  logLevel?: 'none' | 'error' | 'warning' | 'info' | 'debug';
  updateInterval?: number; // Minimum time between progress updates in ms
}

/**
 * Tracks progress of FFMPEG operations
 */
export class ProgressTracker extends EventEmitter {
  private process: ChildProcess | null = null;
  private readline: Interface | null = null;
  private totalDuration: number;
  private startTime: number = 0;
  private lastProgressTime: number = 0;
  private lastProgress: ProgressInfo | null = null;
  private logLevel: string;
  private updateInterval: number;
  private isCancelled: boolean = false;
  private currentStage: string = 'initializing';

  /**
   * Create a new progress tracker
   * @param options Progress tracker options
   */
  constructor(options: ProgressTrackerOptions) {
    super();
    this.totalDuration = options.totalDuration;
    this.logLevel = options.logLevel || 'info';
    this.updateInterval = options.updateInterval || 500; // Default to 500ms
  }

  /**
   * Attach to an FFMPEG process
   * @param command FFMPEG command to execute
   * @param existingProcess Optional existing child process
   * @returns The child process
   */
  public attachToProcess(command: string, existingProcess?: ChildProcess): ChildProcess {
    // If an existing process is provided, use it
    if (existingProcess) {
      this.process = existingProcess;

      // Set up error handling
      existingProcess.on('error', (error) => {
        this.emit('error', error);
        this.cleanup();
      });

      // Set up stdout handling for progress parsing
      if (existingProcess.stdout) {
        this.readline = createInterface({
          input: existingProcess.stdout,
          crlfDelay: Infinity
        });

        // Set up readline handlers
        this.readline.on('line', (line: string) => {
          this.parseLine(line);
        });
      }

      // Record start time and emit start event
      this.startTime = Date.now();
      this.lastProgressTime = this.startTime;
      this.emit('start');
      this.log('info', 'FFMPEG process attached');

      return existingProcess;
    }

    // Otherwise, create a new process
    // Split the command into executable and arguments
    const parts = command.split(' ');
    const executable = parts[0];
    const args = parts.slice(1);

    // Add progress output arguments if not already present
    if (!args.includes('-progress')) {
      args.push('-progress', 'pipe:1');
    }

    // Add stats_period if not already present (for more frequent updates)
    if (!args.includes('-stats_period')) {
      args.push('-stats_period', '0.5'); // Update every 0.5 seconds
    }

    // Spawn the process
    this.process = spawn(executable, args, {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Set up readline interface for stdout
    this.readline = createInterface({
      input: this.process.stdout!,
      terminal: false
    });

    // Set up event listeners
    this.setupEventListeners();

    // Record start time
    this.startTime = Date.now();
    this.lastProgressTime = this.startTime;

    // Emit start event
    this.emit('start');
    this.log('info', 'FFMPEG process started');

    return this.process;
  }

  /**
   * Set up event listeners for the FFMPEG process
   */
  private setupEventListeners(): void {
    if (!this.process || !this.readline) {
      return;
    }

    // Listen for stdout data
    this.readline.on('line', (line: string) => {
      this.parseLine(line);
    });

    // Listen for stderr data
    this.process.stderr!.on('data', (data: Buffer) => {
      const message = data.toString().trim();

      // Log the message
      this.log('debug', message);

      // Check for stage changes
      if (message.includes('Starting pass 1/2')) {
        this.currentStage = 'pass1';
        this.emit('progress', this.createProgressInfo(0));
      } else if (message.includes('Starting pass 2/2')) {
        this.currentStage = 'pass2';
        this.emit('progress', this.createProgressInfo(50)); // Assume 50% progress after first pass
      }

      // Extract frame information from stderr if not available in stdout
      const frameMatch = message.match(/frame=\s*(\d+)/);
      const timeMatch = message.match(/time=\s*(\d+:\d+:\d+\.\d+)/);
      const fpsMatch = message.match(/fps=\s*(\d+\.?\d*)/);
      const speedMatch = message.match(/speed=\s*(\d+\.?\d*x)/);

      if (frameMatch && timeMatch) {
        const frame = parseInt(frameMatch[1], 10);
        const time = timeMatch[1];
        const fps = fpsMatch ? parseFloat(fpsMatch[1]) : 0;
        const speed = speedMatch ? speedMatch[1] : '0x';

        // Calculate progress
        const timeComponents = time.split(':').map(parseFloat);
        const seconds = timeComponents[0] * 3600 + timeComponents[1] * 60 + timeComponents[2];
        const progress = Math.min(100, Math.round((seconds / this.totalDuration) * 100));

        // Calculate ETA
        const elapsedMs = Date.now() - this.startTime;
        const elapsedSeconds = elapsedMs / 1000;
        const eta = progress > 0 ? (elapsedSeconds / progress) * (100 - progress) : 0;

        // Create progress info
        const progressInfo: ProgressInfo = {
          frame,
          fps,
          q: 0,
          size: '0kB',
          time,
          bitrate: '0kbits/s',
          speed,
          progress,
          eta,
          stage: this.currentStage
        };

        // Check if we should emit a progress update
        const now = Date.now();
        if (now - this.lastProgressTime >= this.updateInterval) {
          this.emit('progress', progressInfo);
          this.lastProgressTime = now;
          this.lastProgress = progressInfo;
        }
      }
    });

    // Listen for process exit
    this.process.on('exit', (code: number | null) => {
      if (code === 0) {
        // Process completed successfully
        this.emit('progress', this.createProgressInfo(100));
        this.emit('end');
        this.log('info', 'FFMPEG process completed successfully');
      } else if (!this.isCancelled) {
        // Process failed
        this.emit('error', new Error(`FFMPEG process exited with code ${code}`));
        this.log('error', `FFMPEG process exited with code ${code}`);
      }

      // Clean up
      this.cleanup();
    });

    // Listen for process error
    this.process.on('error', (error: Error) => {
      this.emit('error', error);
      this.log('error', `FFMPEG process error: ${error.message}`);

      // Clean up
      this.cleanup();
    });
  }

  /**
   * Parse a line of FFMPEG progress output
   * @param line Line to parse
   */
  private parseLine(line: string): void {
    // Check for progress information
    if (line.includes('=')) {
      const [key, value] = line.split('=').map(part => part.trim());

      // Update progress info based on key
      if (key === 'frame' && this.lastProgress) {
        this.lastProgress.frame = parseInt(value, 10);
      } else if (key === 'fps' && this.lastProgress) {
        this.lastProgress.fps = parseFloat(value);
      } else if (key === 'q' && this.lastProgress) {
        this.lastProgress.q = parseFloat(value);
      } else if (key === 'size' && this.lastProgress) {
        this.lastProgress.size = value;
      } else if (key === 'time' && this.lastProgress) {
        this.lastProgress.time = value;

        // Calculate progress based on time
        const timeComponents = value.split(':').map(parseFloat);
        const seconds = timeComponents[0] * 3600 + timeComponents[1] * 60 + timeComponents[2];
        const progress = Math.min(100, Math.round((seconds / this.totalDuration) * 100));

        // Calculate ETA
        const elapsedMs = Date.now() - this.startTime;
        const elapsedSeconds = elapsedMs / 1000;
        const eta = progress > 0 ? (elapsedSeconds / progress) * (100 - progress) : 0;

        if (this.lastProgress) {
          this.lastProgress.progress = progress;
          this.lastProgress.eta = eta;
        }
      } else if (key === 'bitrate' && this.lastProgress) {
        this.lastProgress.bitrate = value;
      } else if (key === 'speed' && this.lastProgress) {
        this.lastProgress.speed = value;
      } else if (key === 'progress') {
        // Check if we've reached the end
        if (value === 'end') {
          this.emit('progress', this.createProgressInfo(100));
          this.emit('end');
          this.log('info', 'FFMPEG process completed successfully');

          // Clean up
          this.cleanup();
        }
      }

      // Check if we should emit a progress update
      const now = Date.now();
      if (this.lastProgress && now - this.lastProgressTime >= this.updateInterval) {
        this.emit('progress', this.lastProgress);
        this.lastProgressTime = now;
      }
    }
  }

  /**
   * Create a progress info object with the specified progress
   * @param progress Progress percentage (0-100)
   * @returns Progress info object
   */
  private createProgressInfo(progress: number): ProgressInfo {
    return {
      frame: 0,
      fps: 0,
      q: 0,
      size: '0kB',
      time: '00:00:00.00',
      bitrate: '0kbits/s',
      speed: '0x',
      progress,
      eta: 0,
      stage: this.currentStage
    };
  }

  /**
   * Log a message
   * @param level Log level
   * @param message Message to log
   */
  private log(level: string, message: string): void {
    const levels = {
      none: 0,
      error: 1,
      warning: 2,
      info: 3,
      debug: 4
    };

    // Check if we should log this message
    if (levels[level as keyof typeof levels] <= levels[this.logLevel as keyof typeof levels]) {
      this.emit('log', `[${level.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.readline) {
      this.readline.close();
      this.readline = null;
    }

    this.process = null;
  }

  /**
   * Cancel the FFMPEG process
   */
  public cancel(): void {
    if (this.process) {
      this.isCancelled = true;
      this.process.kill('SIGTERM');
      this.log('info', 'FFMPEG process cancelled');
      this.emit('end');

      // Clean up
      this.cleanup();
    }
  }

  /**
   * Set an external process to track
   * @param process The child process to track
   */
  public setProcess(process: ChildProcess): void {
    this.process = process;

    // Set up error handling
    process.on('error', (error) => {
      this.emit('error', error);
      this.cleanup();
    });

    // Handle process stdout and stderr
    if (process.stdout) {
      const stdoutReader = createInterface({ input: process.stdout });
      stdoutReader.on('line', (line) => this.parseLine(line));
    }

    if (process.stderr) {
      const stderrReader = createInterface({ input: process.stderr });
      stderrReader.on('line', (line) => {
        if (line.includes('frame=') || line.includes('time=')) {
          this.parseLine(line);
        } else {
          this.log('debug', `STDERR: ${line}`);
        }
      });
    }

    // Handle process exit
    process.on('exit', (code) => {
      if (code !== 0 && !this.isCancelled) {
        this.emit('error', new Error(`FFMPEG process exited with code ${code}`));
      } else if (!this.isCancelled) {
        this.emit('end');
      }

      this.cleanup();
    });

    this.log('info', 'External process attached to progress tracker');
  }
}
