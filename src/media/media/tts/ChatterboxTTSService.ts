// Use built-in fetch if available (Node 18+), otherwise use node-fetch
const fetch = globalThis.fetch || (async (url: string, options?: any) => {
    const { default: nodeFetch } = await import('node-fetch');
    return nodeFetch(url, options);
});
const FormData = require('form-data');
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * TTS Service interface for Chatterbox Docker service
 */
export interface TTSService {
    isAvailable(): Promise<boolean>;
    generateSpeech(text: string, outputPath: string, options?: TTSOptions): Promise<TTSResult>;
    getServiceInfo(): Promise<{ name: string; version: string; status: string }>;
}

export interface TTSOptions {
    voice_mode?: 'predefined' | 'clone';
    predefined_voice_id?: string;
    reference_audio_filename?: string;
    output_format?: 'wav' | 'opus' | 'mp3';
    split_text?: boolean;
    chunk_size?: number;
    temperature?: number;
    exaggeration?: number;
    cfg_weight?: number;
    seed?: number;
    speed_factor?: number;
    language?: string;
    onProgress?: TTSProgressCallback;
}

// Progress tracking interface
export interface TTSProgress {
    stage: 'initializing' | 'processing' | 'finalizing' | 'complete';
    currentChunk?: number;
    totalChunks?: number;
    progress: number; // 0-100
    message: string;
    estimatedTimeRemaining?: number; // seconds
}

// Progress callback type
export type TTSProgressCallback = (progress: TTSProgress) => void;

export interface TTSResult {
    success: boolean;
    audioPath: string;
    webPath: string;
    duration: number;
    fileSize: number;
    processingTime: number;
    error?: string;
    metadata?: {
        service: string;
        model?: string;
        voice_mode?: string;
        parameters?: any;
    };
}

/**
 * Chatterbox TTS Service using the devnen/Chatterbox-TTS-Server Docker container
 * 
 * This service provides text-to-speech functionality using Resemble AI's Chatterbox model
 * running in a local Docker container with web API.
 */
export class ChatterboxTTSService implements TTSService {
    private readonly baseUrl: string;
    private readonly maxRetries: number;
    private readonly retryDelay: number;
    private readonly logPath: string;

    constructor(
        baseUrl: string = 'http://localhost:8004',
        maxRetries: number = 3,
        retryDelay: number = 1000,
        logPath: string = 'C:\\Users\\T\\Projects\\Chatterbox-TTS-Server\\logs\\tts_server.log'
    ) {
        this.baseUrl = baseUrl;
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;
        this.logPath = logPath;
    }

    /**
     * Check if the Chatterbox TTS service is available
     */
    async isAvailable(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            // Use the health check endpoint from the documentation
            const response = await fetch(`${this.baseUrl}/api/ui/initial-data`, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            return response.status === 200;
        } catch (error) {
            console.warn('Chatterbox TTS service availability check failed:', error);
            return false;
        }
    }

    /**
     * Get service information
     */
    async getServiceInfo(): Promise<{ name: string; version: string; status: string }> {
        const available = await this.isAvailable();
        return {
            name: 'Chatterbox TTS Service (Docker)',
            version: '1.0.0',
            status: available ? 'available' : 'unavailable'
        };
    }

    /**
     * Generate speech from text using Chatterbox TTS
     */
    async generateSpeech(
        text: string, 
        outputPath: string, 
        options: TTSOptions = {}
    ): Promise<TTSResult> {
        const startTime = Date.now();

        try {            // Validate input text
            if (!text || text.trim().length === 0) {
                throw new Error('Text content is required for TTS generation');
            }

            // Handle reference audio upload for voice cloning
            let modifiedOptions = { ...options };
            if (options.voice_mode === 'clone' && options.reference_audio_filename) {
                console.log(`Uploading reference audio: ${options.reference_audio_filename}`);
                const uploadedFilename = await this.uploadReferenceAudio(options.reference_audio_filename);
                console.log(`Reference audio uploaded as: ${uploadedFilename}`);
                modifiedOptions.reference_audio_filename = uploadedFilename;
            }

            const result = await this.performGeneration(text, outputPath, modifiedOptions);
            
            const endTime = Date.now();
            const processingTime = endTime - startTime;

            // Get file stats
            const stats = fs.statSync(outputPath);
            const webPath = outputPath.replace(path.join(process.cwd(), 'public'), '');

            // Get audio duration (basic estimation: ~150 words per minute)
            const wordCount = text.split(/\s+/).length;
            const estimatedDuration = Math.max((wordCount / 150) * 60, 1);

            return {
                success: true,
                audioPath: outputPath,
                webPath,
                duration: estimatedDuration,
                fileSize: stats.size,
                processingTime,
                metadata: {
                    service: 'chatterbox-docker',
                    model: 'chatterbox-tts',
                    voice_mode: options.voice_mode || 'predefined',
                    parameters: {
                        temperature: options.temperature,
                        exaggeration: options.exaggeration,
                        cfg_weight: options.cfg_weight,
                        seed: options.seed,
                        speed_factor: options.speed_factor
                    }
                }
            };

        } catch (error) {
            const endTime = Date.now();
            const processingTime = endTime - startTime;

            console.error('Chatterbox TTS generation failed:', error);
            
            return {
                success: false,
                audioPath: outputPath,
                webPath: '',
                duration: 0,
                fileSize: 0,
                processingTime,
                error: error instanceof Error ? error.message : 'Unknown generation error',                metadata: {
                    service: 'chatterbox-docker',
                    model: 'error'
                }
            };
        }
    }

    /**
     * Upload reference audio file for voice cloning
     */
    private async uploadReferenceAudio(localFilePath: string): Promise<string> {
        if (!fs.existsSync(localFilePath)) {
            throw new Error(`Reference audio file not found: ${localFilePath}`);
        }

        const filename = path.basename(localFilePath);

        const form = new FormData();
        form.append('files', fs.createReadStream(localFilePath));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        try {
            console.log(`Uploading reference audio to: ${this.baseUrl}/upload_reference`);
            
            const response = await fetch(`${this.baseUrl}/upload_reference`, {
                method: 'POST',
                body: form,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Upload failed: HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('Upload successful:', result);
            
            // Return the filename that should be used in TTS requests
            return filename;

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Reference audio upload timed out');
            }
            
            throw error;
        }
    }

    /**
     * Perform the actual TTS generation with retry logic
     */
    private async performGeneration(
        text: string,
        outputPath: string,
        options: TTSOptions
    ): Promise<void> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                await this.makeGenerationRequest(text, outputPath, options);
                return;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                
                if (attempt === this.maxRetries) {
                    break;
                }

                console.warn(`TTS generation attempt ${attempt} failed, retrying in ${this.retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            }
        }

        throw lastError || new Error('Max retries exceeded');
    }

    /**
     * Monitor Docker logs for progress updates
     */
    private async monitorProgress(
        onProgress?: TTSProgressCallback,
        startTime: number = Date.now()
    ): Promise<void> {
        if (!onProgress) return;

        try {
            // Start monitoring Docker logs
            const logProcess = exec('docker logs -f chatterbox-tts-server --since 10s');

            let lastChunk = 0;
            let totalChunks = 0;
            let isProcessing = false;

            logProcess.stdout?.on('data', (data: Buffer) => {
                const logLine = data.toString();

                // Look for chunk progress: "Synthesizing chunk X/Y..."
                const chunkMatch = logLine.match(/Synthesizing chunk (\d+)\/(\d+)/);
                if (chunkMatch) {
                    isProcessing = true;
                    const currentChunk = parseInt(chunkMatch[1]);
                    const total = parseInt(chunkMatch[2]);

                    if (currentChunk > lastChunk || total !== totalChunks) {
                        lastChunk = currentChunk;
                        totalChunks = total;

                        const progress = Math.round((currentChunk / total) * 100);
                        const elapsed = (Date.now() - startTime) / 1000;
                        const estimatedTotal = elapsed * (total / currentChunk);
                        const estimatedRemaining = Math.max(0, estimatedTotal - elapsed);

                        onProgress({
                            stage: 'processing',
                            currentChunk,
                            totalChunks: total,
                            progress,
                            message: `Processing chunk ${currentChunk} of ${total}...`,
                            estimatedTimeRemaining: Math.round(estimatedRemaining)
                        });
                    }
                }
            });

            // Stop monitoring after a reasonable time or when processing seems complete
            setTimeout(() => {
                logProcess.kill();
            }, 900000); // 15 minutes max

        } catch (error) {
            console.warn('Failed to monitor Docker logs for progress:', error);
        }
    }

    /**
     * Make the actual HTTP request to the Chatterbox TTS service
     */
    private async makeGenerationRequest(
        text: string,
        outputPath: string,
        options: TTSOptions
    ): Promise<void> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 900000); // 15 minute timeout for voice cloning
        const startTime = Date.now();

        // Start progress monitoring if callback provided
        if (options.onProgress) {
            options.onProgress({
                stage: 'initializing',
                progress: 0,
                message: 'Starting TTS generation...'
            });

            // Start monitoring Docker logs for progress
            this.monitorProgress(options.onProgress, startTime);
        }

        try {            // Prepare request body for /tts endpoint
            const requestBody: any = {
                text: text,
                voice_mode: options.voice_mode || 'custom', // Use custom mode by default
                output_format: options.output_format || 'mp3', // Use mp3 for better compatibility
                split_text: options.split_text !== false, // Default to true
                chunk_size: options.chunk_size || 120,
                temperature: options.temperature || 0.7,
                exaggeration: options.exaggeration || 0.5,
                cfg_weight: options.cfg_weight || 0.5,
                speed_factor: options.speed_factor || 1.0,
                language: options.language || 'auto'
            };

            // Add optional voice parameters
            if (options.predefined_voice_id) {
                requestBody.predefined_voice_id = options.predefined_voice_id;
            }
            if (options.reference_audio_filename) {
                requestBody.reference_audio_filename = options.reference_audio_filename;
            }
            if (options.seed !== undefined) {
                requestBody.seed = options.seed;
            }

            console.log('Making TTS request to:', `${this.baseUrl}/tts`);
            console.log('Request body:', JSON.stringify(requestBody, null, 2));

            const response = await fetch(`${this.baseUrl}/tts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }            // Save the audio response to file
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            fs.writeFileSync(outputPath, buffer);

            console.log(`TTS audio saved to: ${outputPath}`);

            // Final progress update
            if (options.onProgress) {
                options.onProgress({
                    stage: 'complete',
                    progress: 100,
                    message: 'TTS generation completed successfully!'
                });
            }
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('TTS request timed out');
            }
            
            throw error;
        }
    }

    /**
     * Check if Docker container is running and start if needed
     */
    async checkDockerContainer(): Promise<{ running: boolean; error?: string }> {
        try {
            // Check if container is running
            const { stdout } = await execAsync('docker ps --filter "name=chatterbox-tts" --format "{{.Names}}"');
            
            if (stdout.trim()) {
                return { running: true };
            }

            // Try to start the container using docker-compose
            console.log('Chatterbox TTS container not running, attempting to start...');
            await execAsync('docker compose up -d chatterbox-tts-server', { 
                cwd: process.cwd() // Assumes docker-compose.yml is in project root
            });

            // Wait a bit for container to start
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Check again
            const { stdout: stdout2 } = await execAsync('docker ps --filter "name=chatterbox-tts" --format "{{.Names}}"');
            
            return { 
                running: !!stdout2.trim(),
                error: !stdout2.trim() ? 'Failed to start container' : undefined
            };

        } catch (error) {
            return {
                running: false,
                error: error instanceof Error ? error.message : 'Docker command failed'
            };
        }
    }

    /**
     * Cleanup service resources
     */
    async cleanup(): Promise<void> {
        // No persistent connections to clean up for HTTP-based service
        console.log('ChatterboxTTSService cleanup completed');
    }
}

// Export singleton instance
export const chatterboxTTSService = new ChatterboxTTSService();

// Export class as default
export default ChatterboxTTSService;
