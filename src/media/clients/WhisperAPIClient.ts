/**
 * WhisperAPIClient
 * 
 * Pure API client for Whisper STT service.
 * Handles only HTTP communication with the Whisper API.
 * Extracted from WhisperSTTService for separation of concerns.
 */

import * as fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

export interface WhisperTranscriptionRequest {
  audioFilePath: string;
  task?: 'transcribe' | 'translate';
  language?: string;
  word_timestamps?: boolean;
}

export interface WhisperTranscriptionResponse {
  text: string;
  language?: string;
  confidence?: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  duration?: number;
}

/**
 * Pure API client for Whisper STT service
 */
export class WhisperAPIClient {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(
    baseUrl: string = 'http://localhost:9000',
    timeout: number = 300000 // 5 minutes
  ) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * Transcribe audio via API
   */
  async transcribeAudio(request: WhisperTranscriptionRequest): Promise<WhisperTranscriptionResponse> {
    // Validate input file exists
    if (!fs.existsSync(request.audioFilePath)) {
      throw new Error(`Audio file not found: ${request.audioFilePath}`);
    }

    // Create form data using Node.js form-data library (works perfectly with axios)
    const formData = new FormData();

    // Use createReadStream for Node.js form-data library
    formData.append('audio_file', fs.createReadStream(request.audioFilePath));
    
    // Add optional parameters
    if (request.task) {
      formData.append('task', request.task);
    }
    if (request.language) {
      formData.append('language', request.language);
    }
    if (request.word_timestamps) {
      formData.append('word_timestamps', 'true');
    }

    try {
      console.log(`[WhisperAPI] Making transcription request to ${this.baseUrl}/asr`);

      // Make the request using axios (much more reliable for multipart uploads)
      const response = await axios.post(`${this.baseUrl}/asr`, formData, {
        headers: formData.getHeaders(),
        timeout: this.timeout,
        responseType: 'text' // Handle both JSON and plain text responses
      });

      console.log(`[WhisperAPI] Received response: ${response.data.substring(0, 100)}...`);

      // Try to parse as JSON first, fall back to plain text
      try {
        const result = JSON.parse(response.data);
        // Validate JSON response structure
        if (result && typeof result.text === 'string') {
          console.log(`[WhisperAPI] Parsed JSON response: ${result.text.substring(0, 100)}...`);
          return this.normalizeResponse(result);
        }
      } catch (jsonError) {
        // Response is plain text, not JSON
        console.log('[WhisperAPI] Received plain text response, wrapping in result object');
      }

      // Handle plain text response
      if (response.data && response.data.trim()) {
        console.log(`[WhisperAPI] Using plain text response: ${response.data.substring(0, 100)}...`);
        return {
          text: response.data.trim(),
          language: 'unknown',
          confidence: 0.95
        };
      }

      throw new Error('Empty or invalid response from Whisper service');

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout after 5 minutes');
        }
        if (error.response) {
          throw new Error(`Whisper service error (${error.response.status}): ${error.response.data}`);
        }
        if (error.request) {
          throw new Error('No response from Whisper service');
        }
      }

      throw error;
    }
  }

  /**
   * Check if the API is healthy/available
   */
  async checkHealth(): Promise<boolean> {
    try {
      // Whisper service doesn't have a dedicated health endpoint,
      // so we check if the ASR endpoint responds to GET requests
      const response = await axios.get(`${this.baseUrl}/asr`, {
        timeout: 5000, // 5 second timeout for health check
        validateStatus: () => true // Accept any status code
      });

      // Even if it returns an error, if we get a response, the service is up
      return response.status !== undefined;
    } catch (error) {
      console.warn('[WhisperAPI] Health check failed:', error);
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
    supportedFormats: string[];
  } {
    return {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      endpoints: ['/asr'],
      supportedFormats: [
        'mp3', 'wav', 'flac', 'm4a', 'ogg', 
        'wma', 'aac', 'opus', 'webm'
      ]
    };
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return [
      'mp3', 'wav', 'flac', 'm4a', 'ogg', 
      'wma', 'aac', 'opus', 'webm'
    ];
  }

  /**
   * Get supported languages (subset of Whisper's full language support)
   */
  getSupportedLanguages(): string[] {
    return [
      'auto', 'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko',
      'zh', 'ar', 'hi', 'nl', 'sv', 'da', 'no', 'fi', 'pl', 'tr'
    ];
  }

  /**
   * Validate audio file format
   */
  validateAudioFormat(filePath: string): boolean {
    const extension = filePath.split('.').pop()?.toLowerCase();
    return extension ? this.getSupportedFormats().includes(extension) : false;
  }

  /**
   * Create a transcription request object from parameters
   */
  createTranscriptionRequest(
    audioFilePath: string,
    options?: {
      task?: 'transcribe' | 'translate';
      language?: string;
      word_timestamps?: boolean;
    }
  ): WhisperTranscriptionRequest {
    return {
      audioFilePath,
      task: options?.task || 'transcribe',
      language: options?.language,
      word_timestamps: options?.word_timestamps
    };
  }

  /**
   * Normalize response format to ensure consistency
   */
  private normalizeResponse(response: any): WhisperTranscriptionResponse {
    return {
      text: response.text || '',
      language: response.language || 'unknown',
      confidence: response.confidence || 0.9,
      segments: response.segments || response.word_timestamps || [],
      duration: response.duration
    };
  }
}
