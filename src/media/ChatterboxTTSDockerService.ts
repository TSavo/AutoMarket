/**
 * ChatterboxTTSDockerService
 * 
 * Docker-based service for Chatterbox TTS processing.
 * Manages Docker containers for text-to-speech generation.
 */

import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export interface ChatterboxDockerConfig {
  dockerImage?: string;
  containerName?: string;
  port?: number;
  enableGPU?: boolean;
  maxConcurrent?: number;
  workingDir?: string;
}

export interface TTSRequest {
  text: string;
  voice?: string;
  language?: string;
  speed?: number;
  pitch?: number;
  outputFormat?: 'wav' | 'mp3' | 'flac';
  voiceCloneFile?: string;
}

export interface TTSResponse {
  audioBuffer: Buffer;
  metadata: {
    duration: number;
    sampleRate: number;
    channels: number;
    format: string;
    processingTime: number;
  };
}

export class ChatterboxTTSDockerService extends EventEmitter {
  private static instance: ChatterboxTTSDockerService | null = null;
  private config: ChatterboxDockerConfig;
  private isRunning = false;
  private containerId: string | null = null;

  private constructor() {
    super();
    this.config = {
      dockerImage: 'chatterbox-tts:latest',
      containerName: 'chatterbox-tts-service',
      port: 8000,
      enableGPU: false,
      maxConcurrent: 2,
      workingDir: path.join(os.tmpdir(), 'chatterbox-tts')
    };
  }
  static getInstance(): ChatterboxTTSDockerService {
    if (!ChatterboxTTSDockerService.instance) {
      ChatterboxTTSDockerService.instance = new ChatterboxTTSDockerService();
    }
    return ChatterboxTTSDockerService.instance;
  }

  async configure(config: Partial<ChatterboxDockerConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Ensure working directory exists
    await fs.mkdir(this.config.workingDir!, { recursive: true });
    
    this.emit('configured', this.config);
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if Docker is available
      await execAsync('docker --version');
      
      // Check if the Docker image exists or can be pulled
      const { stdout } = await execAsync(`docker images -q ${this.config.dockerImage}`);
      if (!stdout.trim()) {
        console.log(`[ChatterboxDockerService] Image ${this.config.dockerImage} not found locally, checking if it can be pulled...`);
        // For now, return false if image doesn't exist
        // In production, you might want to auto-pull the image
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[ChatterboxDockerService] Docker availability check failed:', error);
      return false;
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[ChatterboxDockerService] Service already running');
      return;
    }

    try {
      console.log('[ChatterboxDockerService] Starting Docker container...');
      
      // Stop any existing container with the same name
      await this.stopExistingContainer();
      
      // Build Docker run command
      const gpuFlag = this.config.enableGPU ? '--gpus all' : '';
      const dockerCommand = [
        'docker run -d',
        '--name', this.config.containerName!,
        '-p', `${this.config.port}:8000`,
        '-v', `${this.config.workingDir}:/app/workspace`,
        gpuFlag,
        this.config.dockerImage,
        '&& echo "CONTAINER_STARTED"'
      ].filter(Boolean).join(' ');

      console.log('[ChatterboxDockerService] Docker command:', dockerCommand);
      
      const { stdout } = await execAsync(dockerCommand);
      this.containerId = stdout.trim().split('\n')[0];
      
      // Wait for container to be ready
      await this.waitForContainer();
      
      this.isRunning = true;
      this.emit('started', { containerId: this.containerId });
      
      console.log(`[ChatterboxDockerService] Container started with ID: ${this.containerId}`);
      
    } catch (error) {
      console.error('[ChatterboxDockerService] Failed to start container:', error);
      throw new Error(`Failed to start Chatterbox Docker service: ${error.message}`);
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning || !this.containerId) {
      console.log('[ChatterboxDockerService] Service not running');
      return;
    }

    try {
      console.log('[ChatterboxDockerService] Stopping Docker container...');
      
      await execAsync(`docker stop ${this.containerId}`);
      await execAsync(`docker rm ${this.containerId}`);
      
      this.isRunning = false;
      this.containerId = null;
      this.emit('stopped');
      
      console.log('[ChatterboxDockerService] Container stopped');
      
    } catch (error) {
      console.error('[ChatterboxDockerService] Failed to stop container:', error);
      throw new Error(`Failed to stop Chatterbox Docker service: ${error.message}`);
    }
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  async cleanup(): Promise<void> {
    await this.stop();
    
    try {
      // Clean up working directory
      await fs.rm(this.config.workingDir!, { recursive: true, force: true });
      console.log('[ChatterboxDockerService] Cleanup completed');
    } catch (error) {
      console.error('[ChatterboxDockerService] Cleanup failed:', error);
    }
  }

  async processTextToSpeech(request: TTSRequest): Promise<TTSResponse> {
    if (!this.isRunning) {
      throw new Error('Chatterbox Docker service is not running');
    }

    const startTime = Date.now();
    
    try {
      console.log('[ChatterboxDockerService] Processing TTS request:', {
        textLength: request.text.length,
        voice: request.voice,
        language: request.language
      });

      // Create temporary files
      const requestId = this.generateRequestId();
      const inputFile = path.join(this.config.workingDir!, `input_${requestId}.txt`);
      const outputFile = path.join(this.config.workingDir!, `output_${requestId}.${request.outputFormat || 'wav'}`);
      
      // Write input text
      await fs.writeFile(inputFile, request.text, 'utf-8');
      
      // Build TTS command
      const ttsCommand = this.buildTTSCommand(request, inputFile, outputFile);
      
      // Execute TTS inside container
      console.log('[ChatterboxDockerService] Executing TTS command:', ttsCommand);
      await execAsync(ttsCommand);
      
      // Read output audio
      const audioBuffer = await fs.readFile(outputFile);
      
      // Get audio metadata (this would be enhanced with actual audio analysis)
      const metadata = await this.getAudioMetadata(outputFile);
      
      // Cleanup temporary files
      await Promise.allSettled([
        fs.unlink(inputFile),
        fs.unlink(outputFile)
      ]);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`[ChatterboxDockerService] TTS completed in ${processingTime}ms, audio size: ${audioBuffer.length} bytes`);
      
      return {
        audioBuffer,
        metadata: {
          ...metadata,
          processingTime
        }
      };
      
    } catch (error) {
      console.error('[ChatterboxDockerService] TTS processing failed:', error);
      throw new Error(`TTS processing failed: ${error.message}`);
    }
  }

  async getContainerStatus(): Promise<{
    running: boolean;
    containerId: string | null;
    uptime?: string;
    health?: string;
  }> {
    if (!this.containerId) {
      return { running: false, containerId: null };
    }

    try {
      const { stdout } = await execAsync(`docker ps --filter id=${this.containerId} --format "{{.Status}}"`);
      const status = stdout.trim();
      
      return {
        running: this.isRunning && !!status,
        containerId: this.containerId,
        uptime: status || undefined,
        health: 'unknown' // Would be enhanced with actual health checks
      };
    } catch (error) {
      return {
        running: false,
        containerId: this.containerId,
        health: 'error'
      };
    }
  }

  private async stopExistingContainer(): Promise<void> {
    try {
      const { stdout } = await execAsync(`docker ps -aq --filter name=${this.config.containerName}`);
      if (stdout.trim()) {
        await execAsync(`docker stop ${this.config.containerName} && docker rm ${this.config.containerName}`);
        console.log('[ChatterboxDockerService] Removed existing container');
      }
    } catch (error) {
      // Ignore errors if container doesn't exist
    }
  }

  private async waitForContainer(): Promise<void> {
    const maxWaitTime = 30000; // 30 seconds
    const checkInterval = 1000; // 1 second
    let waited = 0;

    while (waited < maxWaitTime) {
      try {
        // Check if container is running and responding
        const { stdout } = await execAsync(`docker exec ${this.containerId} echo "ready"`);
        if (stdout.trim() === 'ready') {
          return;
        }
      } catch (error) {
        // Container not ready yet
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    throw new Error('Container failed to become ready within timeout');
  }

  private buildTTSCommand(request: TTSRequest, inputFile: string, outputFile: string): string {
    const containerInputFile = `/app/workspace/${path.basename(inputFile)}`;
    const containerOutputFile = `/app/workspace/${path.basename(outputFile)}`;
    
    const ttsArgs = [
      `--input "${containerInputFile}"`,
      `--output "${containerOutputFile}"`,
      request.voice ? `--voice "${request.voice}"` : '',
      request.language ? `--language "${request.language}"` : '',
      request.speed ? `--speed ${request.speed}` : '',
      request.pitch ? `--pitch ${request.pitch}` : '',
      request.outputFormat ? `--format "${request.outputFormat}"` : '',
      request.voiceCloneFile ? `--voice-clone "/app/workspace/${path.basename(request.voiceCloneFile)}"` : ''
    ].filter(Boolean).join(' ');

    return `docker exec ${this.containerId} python /app/tts_processor.py ${ttsArgs}`;
  }

  private async getAudioMetadata(audioFile: string): Promise<{
    duration: number;
    sampleRate: number;
    channels: number;
    format: string;
  }> {
    // This would be enhanced with actual audio analysis using ffprobe or similar
    const stats = await fs.stat(audioFile);
    const format = path.extname(audioFile).substring(1);
    
    // Mock metadata - in production this would use actual audio analysis
    return {
      duration: Math.max(1, Math.floor(stats.size / 44100)), // Rough estimate
      sampleRate: 44100,
      channels: 2,
      format
    };
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
