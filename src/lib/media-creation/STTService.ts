/**
 * Speech-to-Text Service Interface
 * Defines the common interface for STT services in the media processing pipeline
 */

export interface WordTimestamp {
    word: string;
    start: number;
    end: number;
    confidence?: number;
}

export interface STTResult {
    success: boolean;
    text: string;
    confidence: number;
    language: string;
    processingTime: number;
    wordTimestamps?: WordTimestamp[];
    error?: string;
    metadata?: {
        service: string;
        model?: string;
        task?: string;
        fileSize?: number;
        duration?: number;
        error?: boolean;
        [key: string]: any;
    };
}

export interface STTService {
    /**
     * Check if the STT service is available and ready to process audio
     */
    isAvailable(): Promise<boolean>;

    /**
     * Get information about the STT service
     */
    getServiceInfo(): Promise<{
        name: string;
        version: string;
        status: string;
    }>;

    /**
     * Transcribe audio file to text
     */
    transcribeAudio(
        audioFilePath: string,
        options?: {
            language?: string;
            task?: 'transcribe' | 'translate';
            word_timestamps?: boolean;
        }
    ): Promise<STTResult>;

    /**
     * Get supported audio formats
     */
    getSupportedFormats(): string[];

    /**
     * Get supported languages
     */
    getSupportedLanguages(): string[];

    /**
     * Clean up any resources used by the service
     */
    cleanup(): Promise<void>;
}

export interface STTServiceOptions {
    baseUrl?: string;
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
}
