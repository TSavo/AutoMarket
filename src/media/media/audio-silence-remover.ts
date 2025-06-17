/**
 * AudioSilenceRemover
 * 
 * A utility for detecting and removing low volume/silence areas from MP3 files.
 * Uses FFMPEG's silencedetect and silenceremove filters to process audio.
 */

import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { exec, spawn } from 'child_process';

const execAsync = promisify(exec);

export interface SilenceDetectionOptions {
  /** Minimum duration of silence to detect (in seconds) */
  silenceDuration?: number;
  /** Volume threshold below which is considered silence (in dB) */
  silenceThreshold?: string;
  /** Output directory for processed files */
  outputDir?: string;
  /** Whether to create a backup of the original file */
  createBackup?: boolean;
  /** Custom suffix for output files */
  outputSuffix?: string;
}

export interface SilenceSegment {
  start: number;
  end: number;
  duration: number;
}

export interface SilenceDetectionResult {
  originalFile: string;
  outputFile: string;
  silenceSegments: SilenceSegment[];
  originalDuration: number;
  processedDuration: number;
  timeSaved: number;
}

export class AudioSilenceRemover {  private defaultOptions: Required<SilenceDetectionOptions> = {
    silenceDuration: 1.0, // 1 second minimum - as requested
    silenceThreshold: '-40dB', // Higher threshold to catch low volume areas
    outputDir: '',
    createBackup: true,
    outputSuffix: '_silence_removed'
  };

  constructor(private options: SilenceDetectionOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Check if FFMPEG is available
   */
  public async checkFFMPEGAvailable(): Promise<boolean> {
    try {
      await execAsync('ffmpeg -version');
      return true;
    } catch (error) {
      console.error('FFMPEG not found. Please install FFMPEG and add it to your PATH.');
      return false;
    }
  }

  /**
   * Get audio duration using ffprobe
   */
  private async getAudioDuration(filePath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`
      );
      return parseFloat(stdout.trim());
    } catch (error) {
      throw new Error(`Failed to get audio duration: ${error}`);
    }
  }

  /**
   * Detect silence segments in an audio file
   */
  public async detectSilence(filePath: string): Promise<SilenceSegment[]> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const silenceSegments: SilenceSegment[] = [];
    
    return new Promise((resolve, reject) => {
      const command = [
        'ffmpeg',
        '-i', filePath,
        '-af', `silencedetect=noise=${this.options.silenceThreshold}:d=${this.options.silenceDuration}`,
        '-f', 'null',
        '-'
      ];

      const ffmpeg = spawn(command[0], command.slice(1), {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stderrData = '';

      ffmpeg.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFMPEG process exited with code ${code}`));
          return;
        }

        // Parse silence detection output
        const silenceStartRegex = /silence_start: ([\d.]+)/g;
        const silenceEndRegex = /silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g;

        let match;
        const starts: number[] = [];
        const ends: { end: number; duration: number }[] = [];

        // Extract silence starts
        while ((match = silenceStartRegex.exec(stderrData)) !== null) {
          starts.push(parseFloat(match[1]));
        }

        // Extract silence ends and durations
        while ((match = silenceEndRegex.exec(stderrData)) !== null) {
          ends.push({
            end: parseFloat(match[1]),
            duration: parseFloat(match[2])
          });
        }

        // Match starts with ends
        for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
          const start = starts[i];
          const { end, duration } = ends[i];
          
          silenceSegments.push({
            start,
            end,
            duration
          });
        }

        resolve(silenceSegments);
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFMPEG error: ${error.message}`));
      });
    });
  }

  /**
   * Remove silence from an audio file
   */
  public async removeSilence(filePath: string): Promise<SilenceDetectionResult> {
    if (!await this.checkFFMPEGAvailable()) {
      throw new Error('FFMPEG is not available');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const originalDuration = await this.getAudioDuration(filePath);
    const silenceSegments = await this.detectSilence(filePath);

    // Prepare output file path
    const dir = this.options.outputDir || path.dirname(filePath);
    const ext = path.extname(filePath);
    const basename = path.basename(filePath, ext);
    const outputFile = path.join(dir, `${basename}${this.options.outputSuffix}${ext}`);

    // Create backup if requested
    if (this.options.createBackup) {
      const backupFile = path.join(dir, `${basename}_backup${ext}`);
      fs.copyFileSync(filePath, backupFile);
      console.log(`Backup created: ${backupFile}`);
    }    // Build FFMPEG command to remove silence segments
    // We'll use a different approach: build a complex filter that keeps only non-silent parts
    return new Promise(async (resolve, reject) => {
      try {
        // If no silence segments detected, just copy the file
        if (silenceSegments.length === 0) {
          console.log('No silence segments detected, copying original file...');
          fs.copyFileSync(filePath, outputFile);
          const processedDuration = await this.getAudioDuration(outputFile);
          
          const result: SilenceDetectionResult = {
            originalFile: filePath,
            outputFile,
            silenceSegments: [],
            originalDuration,
            processedDuration,
            timeSaved: 0
          };
          
          console.log(`\n✅ No silence to remove!`);
          resolve(result);
          return;
        }

        // Build segments to keep (non-silent parts)
        const keepSegments: { start: number; end: number }[] = [];
        let currentTime = 0;

        for (const silenceSegment of silenceSegments) {
          // Add segment before this silence
          if (currentTime < silenceSegment.start) {
            keepSegments.push({
              start: currentTime,
              end: silenceSegment.start
            });
          }
          currentTime = silenceSegment.end;
        }

        // Add final segment after last silence
        if (currentTime < originalDuration) {
          keepSegments.push({
            start: currentTime,
            end: originalDuration
          });
        }

        console.log(`Keeping ${keepSegments.length} audio segments, removing ${silenceSegments.length} silence segments`);

        // Build filter_complex command to concatenate kept segments
        let filterComplex = '';
        let inputs = '';
        
        for (let i = 0; i < keepSegments.length; i++) {
          const segment = keepSegments[i];
          const duration = segment.end - segment.start;
          
          inputs += `-ss ${segment.start} -t ${duration} -i "${filePath}" `;
          filterComplex += `[${i}:a]`;
        }
        
        filterComplex += `concat=n=${keepSegments.length}:v=0:a=1[out]`;

        const command = [
          'ffmpeg',
          ...inputs.trim().split(' '),
          '-filter_complex', filterComplex,
          '-map', '[out]',
          '-c:a', 'mp3',
          '-b:a', '192k',
          '-y',
          outputFile
        ];        console.log(`Removing silence from: ${filePath}`);
        console.log(`Output file: ${outputFile}`);
        console.log(`Detected ${silenceSegments.length} silence segments`);

        const ffmpeg = spawn(command[0], command.slice(1), {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stderrData = '';

        ffmpeg.stderr.on('data', (data) => {
          const output = data.toString();
          stderrData += output;
          
          // Show progress
          const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
          if (timeMatch) {
            const hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const seconds = parseInt(timeMatch[3]);
            const currentTime = hours * 3600 + minutes * 60 + seconds;
            const progress = ((currentTime / originalDuration) * 100).toFixed(1);
            process.stdout.write(`\rProgress: ${progress}%`);
          }
        });

        ffmpeg.on('close', async (code) => {
          console.log(''); // New line after progress

          if (code !== 0) {
            reject(new Error(`FFMPEG process exited with code ${code}\nError: ${stderrData}`));
            return;
          }

          try {
            const processedDuration = await this.getAudioDuration(outputFile);
            const timeSaved = originalDuration - processedDuration;

            const result: SilenceDetectionResult = {
              originalFile: filePath,
              outputFile,
              silenceSegments,
              originalDuration,
              processedDuration,
              timeSaved
            };

            console.log(`\n✅ Silence removal completed!`);
            console.log(`Original duration: ${originalDuration.toFixed(2)}s`);
            console.log(`Processed duration: ${processedDuration.toFixed(2)}s`);
            console.log(`Time saved: ${timeSaved.toFixed(2)}s (${((timeSaved / originalDuration) * 100).toFixed(1)}%)`);

            resolve(result);
          } catch (error) {
            reject(new Error(`Failed to get processed file duration: ${error}`));
          }
        });        ffmpeg.on('error', (error) => {
          reject(new Error(`FFMPEG error: ${error.message}`));
        });

      } catch (error) {
        reject(new Error(`Setup error: ${error}`));
      }
    });
  }

  /**
   * Analyze an audio file for silence without removing it
   */
  public async analyzeSilence(filePath: string): Promise<{
    silenceSegments: SilenceSegment[];
    totalSilenceDuration: number;
    silencePercentage: number;
    audioDuration: number;
  }> {
    if (!await this.checkFFMPEGAvailable()) {
      throw new Error('FFMPEG is not available');
    }

    const audioDuration = await this.getAudioDuration(filePath);
    const silenceSegments = await this.detectSilence(filePath);
    
    const totalSilenceDuration = silenceSegments.reduce((total, segment) => total + segment.duration, 0);
    const silencePercentage = (totalSilenceDuration / audioDuration) * 100;

    return {
      silenceSegments,
      totalSilenceDuration,
      silencePercentage,
      audioDuration
    };
  }

  /**
   * Batch process multiple audio files
   */
  public async processMultipleFiles(filePaths: string[]): Promise<SilenceDetectionResult[]> {
    const results: SilenceDetectionResult[] = [];
    
    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      console.log(`\n🎵 Processing file ${i + 1}/${filePaths.length}: ${path.basename(filePath)}`);
      
      try {
        const result = await this.removeSilence(filePath);
        results.push(result);
      } catch (error) {
        console.error(`❌ Failed to process ${filePath}: ${error}`);
      }
    }

    return results;
  }
}
