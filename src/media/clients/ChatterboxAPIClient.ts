/**
 * ChatterboxAPIClient
 * 
 * Pure API client for Chatterbox TTS service.
 * Handles only HTTP communication with the Chatterbox API.
 * Extracted from ChatterboxTTSDockerService for separation of concerns.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execAsync } from '../utils/execAsync';

export interface ChatterboxTTSRequest {
  text: string;
  voice_mode: 'clone' | 'predefined';
  output_format: 'mp3' | 'wav';
  split_text: boolean;
  chunk_size: number;
  temperature: number;
  exaggeration: number;
  cfg_weight: number;
  speed_factor: number;
  language: string;
  predefined_voice_id?: string;
  reference_audio_filename?: string;
}

export interface ChatterboxTTSResponse {
  audioBuffer: Buffer;
  duration?: number;
}

export interface ChatterboxUploadResponse {
  filename: string;
}

/**
 * Pure API client for Chatterbox TTS service
 */
export class ChatterboxAPIClient {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(
    baseUrl: string = 'http://localhost:8004',
    timeout: number = 900000 // 15 minutes for voice cloning
  ) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * Generate TTS audio via API
   */
  async generateTTS(request: ChatterboxTTSRequest, outputPath: string): Promise<ChatterboxTTSResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      console.log(`[ChatterboxAPI] Making TTS request to ${this.baseUrl}/tts`);

      const response = await fetch(`${this.baseUrl}/tts`, {
        method: 'POST',
        body: JSON.stringify(request),
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      console.log(`[ChatterboxAPI] TTS response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Check if response is audio
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('audio')) {
        const responseText = await response.text();
        throw new Error(`Expected audio response, got: ${contentType} - ${responseText}`);
      }

      // Save the audio file
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(outputPath, buffer);

      // Try to get duration (optional)
      let duration: number | undefined;
      try {
        const { stdout } = await execAsync(`ffprobe -i "${outputPath}" -show_entries format=duration -v quiet -of csv="p=0"`);
        duration = parseFloat(stdout.trim());
      } catch (error) {
        console.warn('Could not determine audio duration:', error);
      }

      return {
        audioBuffer: buffer,
        duration
      };

    } catch (error) {
      clearTimeout(timeoutId);
      console.error('[ChatterboxAPI] TTS request error:', error);

      if (error.name === 'AbortError') {
        throw new Error('TTS request timed out');
      }

      if (error.code === 'ECONNREFUSED') {
        throw new Error('TTS service is not responding - check if service is running');
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Upload reference audio file for voice cloning
   */
  async uploadReferenceAudio(localFilePath: string): Promise<ChatterboxUploadResponse> {
    const filename = path.basename(localFilePath);
    console.log(`[ChatterboxAPI] Uploading reference audio: ${localFilePath} -> ${filename}`);

    // Use native FormData for multipart handling
    const form = new FormData();
    const fileBuffer = fs.readFileSync(localFilePath);
    const blob = new Blob([fileBuffer]);
    form.append('files', blob, filename);

    console.log(`[ChatterboxAPI] FormData prepared, making upload request to ${this.baseUrl}/upload_reference`);

    const response = await fetch(`${this.baseUrl}/upload_reference`, {
      method: 'POST',
      body: form
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ChatterboxAPI] Upload failed: HTTP ${response.status}: ${errorText}`);
      throw new Error(`Upload failed: HTTP ${response.status}: ${errorText}`);
    }

    console.log(`[ChatterboxAPI] Reference audio uploaded successfully: ${filename}`);
    return { filename };
  }

  /**
   * Get list of reference audio files available on the server
   */
  async getReferenceFiles(): Promise<string[]> {
    console.log(`[ChatterboxAPI] Getting reference files from ${this.baseUrl}/get_reference_files`);
    try {
      const response = await fetch(`${this.baseUrl}/get_reference_files`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (!response.ok) {
        console.error(`[ChatterboxAPI] Failed to get reference files: ${response.status}`);
        throw new Error(`Failed to get reference files: ${response.status}`);
      }

      const files = await response.json();
      console.log(`[ChatterboxAPI] Retrieved reference files:`, files);
      return files;
    } catch (error) {
      console.warn('[ChatterboxAPI] Failed to get reference files:', error);
      throw error;
    }
  }

  /**
   * Check if the API is healthy/available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout for health check
      });

      return response.ok;
    } catch (error) {
      console.warn('[ChatterboxAPI] Health check failed:', error);
      return false;
    }
  }

  /**
   * Get API information
   */
  getInfo(): {
    baseUrl: string;
    timeout: number;
    endpoints: string[];
  } {
    return {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      endpoints: ['/tts', '/upload_reference', '/get_reference_files', '/health']
    };
  }

  /**
   * Create a TTS request object from options
   */
  createTTSRequest(
    text: string,
    options?: {
      voice?: string;
      speed?: number;
      voiceFile?: string;
      outputFormat?: 'mp3' | 'wav';
    }
  ): ChatterboxTTSRequest {
    const request: ChatterboxTTSRequest = {
      text: text,
      voice_mode: options?.voiceFile ? 'clone' : 'predefined',
      output_format: options?.outputFormat || 'mp3',
      split_text: true,
      chunk_size: 120,
      temperature: 0.5,
      exaggeration: 0.5,
      cfg_weight: 0.5,
      speed_factor: options?.speed || 1.0,
      language: 'auto'
    };

    // Add voice-specific options
    if (options?.voiceFile) {
      // For voice cloning, reference_audio_filename will be set after upload
    } else {
      // Use a default predefined voice
      request.predefined_voice_id = options?.voice || 'Abigail.wav';
    }

    return request;
  }
}
