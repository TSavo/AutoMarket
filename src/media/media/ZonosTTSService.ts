import { AudioSequenceBuilder, SequenceOptions } from './audio-sequence-builder';
import fs from 'fs';
import path from 'path';

export interface ZonosTTSResult {
    success: boolean;
    audioPath?: string;
    duration?: number;
    fileSize?: number;
    error?: string;
    processingTime: number;
}

// Progress tracking interface (matching your existing interface)
export interface ZonosTTSProgress {
    stage: 'initializing' | 'processing' | 'finalizing' | 'complete';
    currentChunk?: number;
    totalChunks?: number;
    progress: number; // 0-100
    message: string;
    estimatedTimeRemaining?: number; // seconds
}

// Progress callback type
export type ZonosTTSProgressCallback = (progress: ZonosTTSProgress) => void;

export interface ZonosTTSOptions {
    // Server configuration
    serverUrl?: string; // Default: http://localhost:7860
    
    // Voice configuration
    speakerAudio?: string; // Path to speaker audio file for voice cloning
    
    // Audio processing options
    maxChunkLength?: number; // Maximum characters per chunk (default: 200)
    pauseAtParagraphs?: boolean; // Insert pauses at paragraph breaks (default: true)
    pauseDuration?: number; // Pause duration in ms for paragraphs (default: 400)
    pauseBetweenChunks?: boolean; // Insert pauses between chunks (default: true)
    chunkPauseDuration?: number; // Pause duration in ms between chunks (default: 150)
    outputFormat?: 'wav' | 'mp3'; // Output format (default: mp3)
    mp3Quality?: number; // MP3 quality 0-9, lower is better (default: 2)
    
    // Voice conditioning
    speakingRate?: number; // 5.0 - 30.0, default: 15.0
    pitchStd?: number; // 0.0 - 300.0, default: 45.0
    
    // Emotion settings
    happiness?: number; // 0.0 - 1.0, default: 1.0
    sadness?: number; // 0.0 - 1.0, default: 0.3
    neutral?: number; // 0.0 - 1.0, default: 0.2
    
    // Generation settings
    cfgScale?: number; // 1.0 - 5.0, default: 2.0
    randomizeSeed?: boolean; // default: true
}

/**
 * Zonos TTS Service using the Zonos TTS Server
 * 
 * This service provides advanced text-to-speech functionality with:
 * - Emotional voice control
 * - Natural chunking and pausing
 * - Voice cloning capabilities
 * - MP3 output with quality control
 */
export class ZonosTTSService {
    private readonly serverUrl: string;
    private readonly options: {
        maxChunkLength: number;
        pauseAtParagraphs: boolean;
        pauseDuration: number;
        pauseBetweenChunks: boolean;
        chunkPauseDuration: number;
        outputFormat: 'wav' | 'mp3';
        mp3Quality: number;
        speakingRate: number;
        pitchStd: number;
        happiness: number;
        sadness: number;
        neutral: number;
        cfgScale: number;
        randomizeSeed: boolean;
        speakerAudio?: string;
    };

    constructor(options: ZonosTTSOptions = {}) {
        this.serverUrl = options.serverUrl || 'http://localhost:7860';
        
        // Set default options
        this.options = {
            maxChunkLength: options.maxChunkLength || 200,
            pauseAtParagraphs: options.pauseAtParagraphs ?? true,
            pauseDuration: options.pauseDuration || 400,
            pauseBetweenChunks: options.pauseBetweenChunks ?? true,
            chunkPauseDuration: options.chunkPauseDuration || 150,
            outputFormat: options.outputFormat || 'mp3',
            mp3Quality: options.mp3Quality || 2,
            speakingRate: options.speakingRate || 15.0,
            pitchStd: options.pitchStd || 45.0,
            happiness: options.happiness || 1.0,
            sadness: options.sadness || 0.3,
            neutral: options.neutral || 0.2,
            cfgScale: options.cfgScale || 2.0,
            randomizeSeed: options.randomizeSeed ?? true,
            speakerAudio: options.speakerAudio
        };
    }

    /**
     * Check if the Zonos TTS server is available
     */    async checkAvailability(): Promise<{ available: boolean; error?: string }> {
        try {
            const response = await fetch(`${this.serverUrl}/`, {
                method: 'GET'
            });
            
            if (response.ok) {
                return { available: true };
            } else {
                return { 
                    available: false, 
                    error: `Server responded with status ${response.status}` 
                };
            }
        } catch (error) {
            return { 
                available: false, 
                error: `Cannot connect to Zonos server at ${this.serverUrl}: ${error instanceof Error ? error.message : String(error)}` 
            };
        }
    }

    /**
     * Generate TTS audio from text using Zonos
     */
    async generateTTS(
        text: string, 
        outputPath: string, 
        progressCallback?: ZonosTTSProgressCallback
    ): Promise<ZonosTTSResult> {
        const startTime = Date.now();
        
        try {
            // Report initialization
            progressCallback?.({
                stage: 'initializing',
                progress: 0,
                message: 'Initializing Zonos TTS...'
            });

            // Prepare sequence options
            const sequenceOptions: SequenceOptions = {
                speakerAudio: this.options.speakerAudio || path.join(__dirname, 'default-speaker.wav'),
                maxChunkLength: this.options.maxChunkLength,
                pauseAtParagraphs: this.options.pauseAtParagraphs,
                pauseDuration: this.options.pauseDuration,
                pauseBetweenChunks: this.options.pauseBetweenChunks,
                chunkPauseDuration: this.options.chunkPauseDuration,
                outputFormat: this.options.outputFormat,
                mp3Quality: this.options.mp3Quality,
                voice: {
                    conditioning: {
                        speakingRate: this.options.speakingRate,
                        pitchStd: this.options.pitchStd,
                        dnsmos: 4.0,
                        fmax: 24000,
                        vqScore: 0.78
                    },
                    generation: {
                        cfgScale: this.options.cfgScale,
                        randomizeSeed: this.options.randomizeSeed
                    },
                    emotion: {
                        happiness: this.options.happiness,
                        sadness: this.options.sadness,
                        neutral: this.options.neutral,
                        disgust: 0.05,
                        fear: 0.05,
                        surprise: 0.05,
                        anger: 0.05,
                        other: 0.1
                    }
                }
            };

            // Create audio sequence builder
            const builder = new AudioSequenceBuilder(this.serverUrl, sequenceOptions);

            // Connect to server
            progressCallback?.({
                stage: 'initializing',
                progress: 10,
                message: 'Connecting to Zonos server...'
            });

            await builder.connect();            // Build sequence with progress tracking
            progressCallback?.({
                stage: 'processing',
                progress: 20,
                message: 'Processing text and generating audio...'
            });

            // Generate the audio sequence
            await builder.buildSequence(text, outputPath);

            progressCallback?.({
                stage: 'finalizing',
                progress: 95,
                message: 'Finalizing audio output...'
            });

            // Check if output file exists and get stats
            if (!fs.existsSync(outputPath)) {
                throw new Error('Audio generation completed but output file not found');
            }

            const stats = fs.statSync(outputPath);
            const processingTime = Date.now() - startTime;

            // Try to get audio duration (this would need ffprobe or similar)
            let duration = 0;
            try {
                // You could implement duration detection here using ffprobe
                // For now, estimate based on text length (rough estimate)
                const wordsPerMinute = this.options.speakingRate * 60;
                const wordCount = text.split(/\s+/).length;
                duration = Math.round((wordCount / wordsPerMinute) * 60);
            } catch (error) {
                console.warn('Could not determine audio duration:', error);
            }

            progressCallback?.({
                stage: 'complete',
                progress: 100,
                message: 'Audio generation complete!'
            });

            return {
                success: true,
                audioPath: outputPath,
                duration,
                fileSize: stats.size,
                processingTime
            };

        } catch (error) {
            const processingTime = Date.now() - startTime;
            
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                processingTime
            };
        }
    }

    /**
     * Get audio duration using ffprobe (if available)
     */
    private async getAudioDuration(filePath: string): Promise<number> {
        try {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            
            const { stdout } = await execAsync(
                `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`
            );
            
            return parseFloat(stdout.trim()) || 0;
        } catch (error) {
            console.warn('Could not get audio duration with ffprobe:', error);
            return 0;
        }
    }

    /**
     * Clean up temporary files (if any)
     */
    async cleanup(): Promise<void> {
        // AudioSequenceBuilder handles its own cleanup
        // This method is here for interface compatibility
    }

    /**
     * Get server status and configuration
     */
    async getServerInfo(): Promise<any> {
        try {
            const response = await fetch(`${this.serverUrl}/`, {
                method: 'GET'
            });
            
            if (response.ok) {
                return {
                    serverUrl: this.serverUrl,
                    status: 'online',
                    options: this.options
                };
            } else {
                return {
                    serverUrl: this.serverUrl,
                    status: 'error',
                    error: `Server responded with status ${response.status}`
                };
            }
        } catch (error) {
            return {
                serverUrl: this.serverUrl,
                status: 'offline',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}

// Export types for external use
export type { SequenceOptions } from './audio-sequence-builder';
export { AudioSequenceBuilder } from './audio-sequence-builder';
