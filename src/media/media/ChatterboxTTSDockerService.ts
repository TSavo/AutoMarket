import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface TTSDockerResult {
    success: boolean;
    audioPath?: string;
    duration?: number;
    error?: string;
    processingTime: number;
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

// TTS Task Status interface (from new async API)
export interface TTSTaskStatus {
    task_id: string;
    status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    current_stage: string;
    created_at: string;
    updated_at: string;
    total_chunks: number;
    completed_chunks: number;
}

/**
 * Chatterbox TTS Service using the devnen/Chatterbox-TTS-Server Docker container
 * 
 * This service provides text-to-speech functionality using Chatterbox TTS model
 * running in a local Docker container with web API.
 */
export class ChatterboxTTSDockerService {
    private readonly baseUrl: string;
    private readonly maxRetries: number;
    private readonly retryDelay: number;

    constructor(
        baseUrl: string = 'http://localhost:8004',
        maxRetries: number = 3,
        retryDelay: number = 1000
    ) {
        this.baseUrl = baseUrl;
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;
    }

    /**
     * Check if the Chatterbox TTS service is available
     */
    async isAvailable(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`${this.baseUrl}/`, {
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
     * Check if Docker container is running
     */
    async isContainerRunning(): Promise<boolean> {
        try {
            const { stdout } = await execAsync('docker ps --filter "name=chatterbox-tts" --format "{{.Names}}"');
            return stdout.trim().length > 0;
        } catch (error) {
            return false;
        }
    }    /**
     * Restart the Docker container to ensure fresh state
     */
    async ensureContainerRunning(): Promise<boolean> {
        try {
            console.log('Restarting Chatterbox TTS Docker container...');
            
            const chatterboxPath = 'C:\\Users\\T\\Projects\\Chatterbox-TTS-Server';
            
            // Always restart the container for fresh state
            console.log('Stopping existing Chatterbox containers...');
            await execAsync(`cd "${chatterboxPath}" && docker-compose down`, { cwd: chatterboxPath });
            
            console.log('Starting Chatterbox TTS container...');
            await execAsync(`cd "${chatterboxPath}" && docker-compose up -d`, { cwd: chatterboxPath });

            // Wait for service to be ready
            console.log('Waiting for Chatterbox TTS service to be ready...');
            for (let i = 0; i < 30; i++) {
                if (await this.isAvailable()) {
                    console.log('Chatterbox TTS service is ready');
                    return true;
                }
                console.log(`Waiting... (${i + 1}/30)`);
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            throw new Error('Container started but service is not responding after 90 seconds');
        } catch (error) {
            console.error('Failed to restart Chatterbox TTS container:', error);
            return false;
        }
    }

    /**
     * Generate TTS audio from text
     */    async generateTTS(
        text: string,
        outputPath: string,
        options?: {
            voice?: string;
            speed?: number;
            voiceFile?: string; // Path to reference voice file for cloning
            outputFormat?: 'mp3' | 'wav'; // Support both MP3 and WAV output
            onProgress?: TTSProgressCallback;
        }
    ): Promise<TTSDockerResult> {
        const startTime = Date.now();

        // Initial progress update
        if (options?.onProgress) {
            options.onProgress({
                stage: 'initializing',
                progress: 0,
                message: 'Initializing TTS generation...'
            });
        }

        try {            // Ensure container is running (restarts for fresh state)
            if (!(await this.ensureContainerRunning())) {
                throw new Error('Chatterbox TTS container is not available');
            }

            if (options?.onProgress) {
                options.onProgress({
                    stage: 'initializing',
                    progress: 20,
                    message: 'Chatterbox Docker container ready...'
                });
            }            // Prepare the request body as JSON according to API spec
            const requestBody: any = {
                text: text,
                voice_mode: options?.voiceFile ? 'clone' : 'predefined',
                output_format: options?.outputFormat || 'mp3', // Use specified format or default to MP3
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
                // For voice cloning, we need to upload the file first
                const filename = await this.uploadReferenceAudio(options.voiceFile);
                requestBody.reference_audio_filename = filename;
            } else {
                // Use a default predefined voice
                requestBody.predefined_voice_id = options?.voice || 'Abigail.wav';
            }

            if (options?.onProgress) {
                options.onProgress({
                    stage: 'processing',
                    progress: 30,
                    message: 'Starting TTS generation...'
                });
            }

            // Use the existing sync API with progress monitoring
            const result = await this.performTTSRequestWithProgress(requestBody, outputPath, options?.onProgress);

            if (options?.onProgress) {
                options.onProgress({
                    stage: 'complete',
                    progress: 100,
                    message: 'TTS generation completed successfully!'
                });
            }

            const endTime = Date.now();
            const processingTime = endTime - startTime;

            return {
                success: true,
                audioPath: outputPath,
                duration: result.duration,
                processingTime
            };

        } catch (error) {
            const endTime = Date.now();
            const processingTime = endTime - startTime;

            console.error('Chatterbox TTS generation failed:', error);
            
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown TTS error',
                processingTime
            };
        }
    }    /**
     * Perform TTS request with progress monitoring via Docker logs and automatic retry on timeout
     */
    private async performTTSRequestWithProgress(
        requestBody: any,
        outputPath: string,
        onProgress?: TTSProgressCallback,
        retryCount: number = 0
    ): Promise<{ duration?: number }> {
        const maxRetries = 2; // Allow up to 2 retries for timeout issues
        
        // Start monitoring Docker logs for progress if callback provided
        let logMonitor: { process: any; timeoutPromise: Promise<void> } | null = null;
        if (onProgress) {
            logMonitor = await this.monitorDockerLogs(onProgress);
        }

        try {
            // Race between the TTS request and the progress timeout
            const ttsRequestPromise = this.makeTTSRequest(requestBody, outputPath);
            
            if (logMonitor) {
                // Wait for either the TTS request to complete or the timeout to trigger
                const result = await Promise.race([
                    ttsRequestPromise,
                    logMonitor.timeoutPromise.then(() => {
                        throw new Error('TTS generation timeout: No progress update for 7 minutes');
                    })
                ]);
                
                // Stop log monitoring on success
                if (logMonitor.process) {
                    logMonitor.process.kill();
                }
                
                return result;
            } else {
                // No progress monitoring, just wait for the request
                return await ttsRequestPromise;
            }

        } catch (error) {
            // Stop log monitoring on error
            if (logMonitor && logMonitor.process) {
                logMonitor.process.kill();
            }
            
            // Check if this is a timeout error and we can retry
            const isTimeoutError = error instanceof Error && error.message.includes('timeout');
            
            if (isTimeoutError && retryCount < maxRetries) {
                console.log(`⚠️ TTS timeout detected (attempt ${retryCount + 1}/${maxRetries + 1}). Restarting Docker container and retrying...`);
                
                if (onProgress) {
                    onProgress({
                        stage: 'initializing',
                        progress: 0,
                        message: `Timeout detected. Restarting container and retrying (${retryCount + 1}/${maxRetries + 1})...`
                    });
                }
                
                // Force restart the Docker container (the ensureContainerRunning method already does this)
                await this.ensureContainerRunning();
                
                // Wait a bit for the container to fully stabilize
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Retry the request
                return this.performTTSRequestWithProgress(requestBody, outputPath, onProgress, retryCount + 1);
            }
            
            // If not a timeout error or we've exhausted retries, throw the error
            throw error;
        }
    }/**
     * Monitor Docker logs for progress updates with 7-minute timeout on progress updates
     */
    private async monitorDockerLogs(onProgress: TTSProgressCallback): Promise<{ process: any; timeoutPromise: Promise<void> }> {
        try {
            // Start monitoring Docker logs - try different container names
            let containerName = 'chatterbox-tts-server';

            // Check if the container exists with different possible names
            try {
                const { stdout } = await execAsync('docker ps --format "{{.Names}}" | grep chatterbox');
                const containerNames = stdout.trim().split('\n').filter(name => name.length > 0);
                if (containerNames.length > 0) {
                    containerName = containerNames[0];
                }
            } catch (error) {
                // Use default container name
            }

            // Use --since with a few seconds ago to avoid old logs
            const logProcess = exec(`docker logs -f ${containerName} --since 5s`);

            let lastChunk = 0;
            let totalChunks = 0;
            let sessionStarted = false;
            const startTime = Date.now();
            let lastProgressTime = Date.now(); // Track when we last received a progress update
            let progressTimeoutId: NodeJS.Timeout | null = null;
            let timeoutReject: ((error: Error) => void) | null = null;

            // Create a promise that rejects on timeout
            const timeoutPromise = new Promise<void>((_, reject) => {
                timeoutReject = reject;
            });

            // Function to reset the progress timeout
            const resetProgressTimeout = () => {
                if (progressTimeoutId) {
                    clearTimeout(progressTimeoutId);
                }
                
                progressTimeoutId = setTimeout(() => {
                    console.error('❌ TTS generation timeout: No progress update for 7 minutes. Aborting...');
                    
                    // Kill the log process
                    if (logProcess) {
                        logProcess.kill();
                    }
                    
                    // Reject the timeout promise to abort the TTS generation
                    if (timeoutReject) {
                        timeoutReject(new Error('TTS generation timeout: No progress update for 7 minutes'));
                    }
                }, 7 * 60 * 1000); // 7 minutes
            };

            // Set initial timeout
            resetProgressTimeout();

            // Function to process log lines from both stdout and stderr
            const processLogLine = (data: Buffer) => {
                const logLine = data.toString();

                // Look for chunk progress: "[INFO] server: Synthesizing chunk X/Y (chars)..."
                const chunkMatch = logLine.match(/Synthesizing chunk (\d+)\/(\d+)/);
                if (chunkMatch) {
                    const currentChunk = parseInt(chunkMatch[1]);
                    const total = parseInt(chunkMatch[2]);

                    // Only start tracking when we see chunk 1 (start of new session)
                    if (!sessionStarted && currentChunk === 1) {
                        sessionStarted = true;
                        lastChunk = 0;
                        totalChunks = 0;
                        console.log('🎤 Started TTS session with 7-minute progress timeout');
                    }

                    // Only process chunks if we've started the current session
                    if (sessionStarted && currentChunk > lastChunk) {
                        lastChunk = currentChunk;
                        totalChunks = total;
                        lastProgressTime = Date.now(); // Update progress timestamp
                        
                        // Reset the timeout since we got a progress update
                        resetProgressTimeout();

                        // Convert to simple 1-100% progress
                        const progress = Math.round((currentChunk / total) * 100);
                        const elapsed = (Date.now() - startTime) / 1000;

                        // Better time estimation: only calculate if we have meaningful progress
                        let estimatedRemaining = 0;
                        if (currentChunk > 1 && elapsed > 0) {
                            const avgTimePerChunk = elapsed / currentChunk;
                            const remainingChunks = total - currentChunk;
                            estimatedRemaining = Math.round(avgTimePerChunk * remainingChunks);
                        }

                        onProgress({
                            stage: 'processing',
                            currentChunk,
                            totalChunks: total,
                            progress,
                            message: `Processing chunk ${currentChunk} of ${total}...`,
                            estimatedTimeRemaining: estimatedRemaining > 0 ? estimatedRemaining : undefined
                        });
                    }
                }
            };

            // Monitor both stdout and stderr since logs can come from either
            logProcess.stdout?.on('data', processLogLine);
            logProcess.stderr?.on('data', processLogLine);

            logProcess.on('error', (error) => {
                console.warn('Docker logs monitoring error:', error);
                if (progressTimeoutId) {
                    clearTimeout(progressTimeoutId);
                }
            });

            logProcess.on('exit', () => {
                if (progressTimeoutId) {
                    clearTimeout(progressTimeoutId);
                }
            });

            // Stop monitoring after a reasonable time (but the progress timeout should catch hangs earlier)
            setTimeout(() => {
                if (progressTimeoutId) {
                    clearTimeout(progressTimeoutId);
                }
                logProcess.kill();
            }, 900000); // 15 minutes max

            return { process: logProcess, timeoutPromise };        } catch (error) {
            console.warn('Failed to monitor Docker logs for progress:', error);
            // Return a dummy structure that won't timeout
            return { 
                process: null, 
                timeoutPromise: new Promise<void>(() => {}) // Never resolves, but also never rejects
            };
        }
    }

    /**
     * Make the actual HTTP request to the Chatterbox TTS service
     */
    private async makeTTSRequest(requestBody: any, outputPath: string): Promise<{ duration?: number }> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000000); // 15 minute timeout for voice cloning

        try {
            const response = await fetch(`${this.baseUrl}/tts`, {
                method: 'POST',
                body: JSON.stringify(requestBody),
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`TTS request failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            // Check if response is audio
            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('audio')) {
                const responseText = await response.text();
                throw new Error(`Expected audio response, got: ${contentType} - ${responseText}`);
            }            // Save the audio file
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

            return { duration };

        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Upload reference audio file for voice cloning
     */
    private async uploadReferenceAudio(localFilePath: string): Promise<string> {
        const filename = path.basename(localFilePath);

        const form = new FormData();
        form.append('files', fs.createReadStream(localFilePath));

        const response = await fetch(`${this.baseUrl}/upload_reference`, {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: HTTP ${response.status}: ${errorText}`);
        }

        console.log(`Reference audio uploaded: ${filename}`);
        return filename;
    }



    /**
     * Cleanup resources
     */
    async cleanup(): Promise<void> {
        // No persistent connections to clean up
        console.log('ChatterboxTTSDockerService cleanup completed');
    }
}

// Export singleton instance
export const chatterboxTTSDockerService = new ChatterboxTTSDockerService();

export default ChatterboxTTSDockerService;
