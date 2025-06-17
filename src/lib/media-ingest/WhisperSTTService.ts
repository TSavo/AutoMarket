import { STTService, STTResult } from '../types/STTService';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Whisper STT Service using the onerahmet/openai-whisper-asr-webservice Docker container
 * 
 * This service provides speech-to-text functionality using OpenAI's Whisper model
 * running in a local Docker container.
 */
export class WhisperSTTService implements STTService {
    private readonly baseUrl: string;
    private readonly maxRetries: number;
    private readonly retryDelay: number;

    constructor(
        baseUrl: string = 'http://localhost:9000',
        maxRetries: number = 3,
        retryDelay: number = 1000
    ) {
        this.baseUrl = baseUrl;
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;
    }    /**
     * Check if the Whisper service is available
     */
    async isAvailable(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`${this.baseUrl}/asr`, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // The service responds with 405 Method Not Allowed for GET requests,
            // but this confirms the service is running
            return response.status === 405 || response.status === 200;
        } catch (error) {
            console.warn('Whisper service availability check failed:', error);
            return false;
        }
    }

    /**
     * Get service information
     */
    async getServiceInfo(): Promise<{ name: string; version: string; status: string }> {
        const available = await this.isAvailable();
        return {
            name: 'Whisper STT Service',
            version: '1.0.0',
            status: available ? 'available' : 'unavailable'
        };
    }

    /**
     * Transcribe audio file to text using Whisper
     */
    async transcribeAudio(audioFilePath: string, options?: {
        language?: string;
        task?: 'transcribe' | 'translate';
        word_timestamps?: boolean;
    }): Promise<STTResult> {
        const startTime = Date.now();

        try {
            // Validate input file
            if (!fs.existsSync(audioFilePath)) {
                throw new Error(`Audio file not found: ${audioFilePath}`);
            }

            const result = await this.performTranscription(audioFilePath, options);
            
            const endTime = Date.now();
            const processingTime = endTime - startTime;

            return {
                success: true,
                text: result.text,
                confidence: result.confidence || 0.9, // Whisper doesn't provide confidence scores
                language: result.language || options?.language || 'auto',
                processingTime,
                wordTimestamps: result.segments || [],
                metadata: {
                    service: 'whisper',
                    model: 'whisper-1',
                    task: options?.task || 'transcribe',
                    fileSize: fs.statSync(audioFilePath).size,
                    duration: result.duration
                }
            };

        } catch (error) {
            const endTime = Date.now();
            const processingTime = endTime - startTime;

            console.error('Whisper transcription failed:', error);
            
            return {
                success: false,
                text: '',
                confidence: 0,
                language: 'unknown',
                processingTime,
                error: error instanceof Error ? error.message : 'Unknown transcription error',
                wordTimestamps: [],
                metadata: {
                    service: 'whisper',
                    error: true
                }
            };
        }
    }

    /**
     * Perform the actual transcription with retry logic
     */
    private async performTranscription(
        audioFilePath: string, 
        options?: any
    ): Promise<any> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await this.makeTranscriptionRequest(audioFilePath, options);
            } catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                
                if (attempt === this.maxRetries) {
                    break;
                }

                console.warn(`Transcription attempt ${attempt} failed, retrying in ${this.retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            }
        }

        throw lastError || new Error('Max retries exceeded');
    }    /**
     * Make the actual HTTP request to the Whisper service
     */
    private async makeTranscriptionRequest(
        audioFilePath: string,
        options?: any
    ): Promise<any> {
        // Create form data
        const formData = new FormData();
        formData.append('audio_file', fs.createReadStream(audioFilePath));
        
        // Add optional parameters
        if (options?.task) {
            formData.append('task', options.task);
        }
        if (options?.language) {
            formData.append('language', options.language);
        }
        if (options?.word_timestamps) {
            formData.append('word_timestamps', 'true');
        }

        // Set up request with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout

        try {
            // Make the request
            const response = await fetch(`${this.baseUrl}/asr`, {
                method: 'POST',
                body: formData,
                headers: formData.getHeaders(),
                signal: controller.signal
            });            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Whisper service error (${response.status}): ${errorText}`);
            }

            // Try to parse as JSON first, fall back to plain text
            let result: any;
            const responseText = await response.text();
            
            try {
                result = JSON.parse(responseText);
                // Validate JSON response structure
                if (result && typeof result.text === 'string') {
                    return result;
                }
            } catch (jsonError) {
                // Response is plain text, not JSON
                console.log('[WhisperSTT] Received plain text response, wrapping in result object');
            }
            
            // Handle plain text response
            if (responseText && responseText.trim()) {
                return {
                    text: responseText.trim(),
                    language: 'unknown',
                    confidence: 0.95
                };
            }
            
            throw new Error('Empty or invalid response from Whisper service');
        } catch (error) {
            clearTimeout(timeoutId);
            
            if ((error as Error).name === 'AbortError') {
                throw new Error('Request timeout after 5 minutes');
            }
            
            throw error;
        }
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
    private validateAudioFormat(filePath: string): boolean {
        const extension = filePath.split('.').pop()?.toLowerCase();
        return extension ? this.getSupportedFormats().includes(extension) : false;
    }

    /**
     * Cleanup method to stop any background processes
     */
    async cleanup(): Promise<void> {
        // No persistent connections to clean up for this implementation
        console.log('WhisperSTTService cleanup completed');
    }

    /**
     * Get video duration using ffprobe
     */
    async getVideoDuration(videoPath: string): Promise<number> {
        try {
            const { stdout } = await execAsync(
                `ffprobe -v quiet -print_format json -show_format "${videoPath}"`
            );
            
            const info = JSON.parse(stdout);
            const duration = parseFloat(info.format.duration || '0');
            
            if (duration > 0) {
                console.log(`[WhisperSTT] Video duration detected: ${duration} seconds`);
                return duration;
            } else {
                console.warn(`[WhisperSTT] Could not detect video duration from ffprobe`);
                return 0;
            }
        } catch (error) {
            console.warn(`[WhisperSTT] Failed to get video duration: ${(error as Error).message}`);
            return 0;
        }
    }
}

// Export default instance
export const whisperSTTService = new WhisperSTTService();

// Export for direct instantiation
export default WhisperSTTService;
