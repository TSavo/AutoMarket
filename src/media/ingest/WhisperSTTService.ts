import { STTService, STTResult } from '../types/STTService';
import {
  MediaTransformer,
  MediaInput,
  MediaOutput,
  TransformCapability,
  LocalServiceManager,
  ServiceStatus,
  createMediaOutput
} from '../types/MediaTransformer';
import { DockerComposeService } from '../../services/DockerComposeService';
import { WhisperAPIClient, WhisperTranscriptionRequest } from '../clients/WhisperAPIClient';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Whisper STT Service using the onerahmet/openai-whisper-asr-webservice Docker container
 *
 * This service provides speech-to-text functionality using OpenAI's Whisper model
 * running in a local Docker container. Implements both STTService and MediaTransformer interfaces.
 */
export class WhisperSTTService implements STTService, MediaTransformer, LocalServiceManager {
    // Service properties
    private readonly dockerService: DockerComposeService;
    private readonly apiClient: WhisperAPIClient;

    // MediaTransformer properties
    readonly id = 'whisper';
    readonly name = 'Whisper STT';
    readonly type = 'local' as const;
    readonly transforms: TransformCapability[] = [
        {
            input: 'audio',
            output: 'text',
            description: 'Convert audio files to text using Whisper STT'
        }
    ];

    constructor(
        baseUrl: string = 'http://localhost:9000'
    ) {
        // Initialize API client (pure HTTP client)
        this.apiClient = new WhisperAPIClient(baseUrl);

        // Initialize Docker Compose service for infrastructure management
        this.dockerService = new DockerComposeService({
            serviceName: 'whisper',
            composeFile: 'services/whisper/docker-compose.yml',
            containerName: 'whisper-service',
            healthCheckUrl: `${baseUrl}/asr`
        });
    }    /**
     * Check if the Whisper service is available
     */
    async isAvailable(): Promise<boolean> {
        // Delegate to API client for health checking
        return await this.apiClient.checkHealth();
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

            // Create transcription request using API client
            const request = this.apiClient.createTranscriptionRequest(audioFilePath, {
                task: options?.task || 'transcribe',
                language: options?.language,
                word_timestamps: options?.word_timestamps
            });

            // Perform transcription using API client
            const result = await this.apiClient.transcribeAudio(request);

            const endTime = Date.now();
            const processingTime = endTime - startTime;

            return {
                success: true,
                text: result.text,
                confidence: result.confidence || 0.9,
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
     * Get supported audio formats
     */
    getSupportedFormats(): string[] {
        return this.apiClient.getSupportedFormats();
    }

    /**
     * Get supported languages
     */
    getSupportedLanguages(): string[] {
        return this.apiClient.getSupportedLanguages();
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

    // MediaTransformer interface implementation

    /**
     * Transform audio input to text output
     */
    async transform(input: MediaInput, outputType: 'text', options?: Record<string, any>): Promise<MediaOutput> {
        // Validate input type
        if (input.type !== 'audio') {
            throw new Error(`WhisperSTTService only supports audio input, received: ${input.type}`);
        }

        // Validate output type
        if (outputType !== 'text') {
            throw new Error(`WhisperSTTService only outputs text, requested: ${outputType}`);
        }

        try {
            // Handle different input data types
            let audioFilePath: string;

            if (typeof input.data === 'string') {
                // Assume it's a file path
                audioFilePath = input.data;
            } else {
                // Handle Buffer data - would need to write to temp file
                throw new Error('Buffer input not yet supported - please provide file path as string');
            }

            // Use existing transcribeAudio method
            const result = await this.transcribeAudio(audioFilePath, {
                language: options?.language,
                task: options?.task || 'transcribe',
                word_timestamps: options?.word_timestamps
            });

            if (result.success) {
                return createMediaOutput('text', result.text, {
                    confidence: result.confidence,
                    language: result.language,
                    wordTimestamps: result.wordTimestamps,
                    processingTime: result.processingTime,
                    service: 'whisper',
                    ...result.metadata
                });
            } else {
                throw new Error(result.error || 'Transcription failed');
            }
        } catch (error) {
            throw new Error(`Whisper transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get transformer information
     */
    getInfo() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            transforms: this.transforms,
            status: 'unknown' as const // Will be determined by isAvailable()
        };
    }

    // LocalServiceManager interface implementation

    /**
     * Start the Whisper Docker service using DockerComposeService
     */
    async startService(): Promise<boolean> {
        // DockerComposeService handles health checking via Docker
        return await this.dockerService.startService();
    }

    /**
     * Stop the Whisper Docker service using DockerComposeService
     */
    async stopService(): Promise<boolean> {
        return await this.dockerService.stopService();
    }

    /**
     * Get the current status of the Whisper service using DockerComposeService
     */
    async getServiceStatus(): Promise<ServiceStatus> {
        const status = await this.dockerService.getServiceStatus();

        if (status.running) {
            // Trust Docker health checks instead of network connectivity
            if (status.health === 'healthy') {
                return 'running';
            } else if (status.health === 'unhealthy') {
                return 'error';
            } else if (status.health === 'starting') {
                return 'starting';
            } else {
                // No health check defined, assume running if container is running
                return 'running';
            }
        } else if (status.state === 'exited') {
            return 'stopped';
        } else if (status.state === 'error') {
            return 'error';
        } else {
            return 'stopped';
        }
    }

    /**
     * Get Docker service management information
     */
    getDockerServiceInfo() {
        const dockerConfig = this.dockerService.getConfig();
        const apiInfo = this.apiClient.getInfo();
        return {
            containerName: dockerConfig.containerName,
            dockerImage: 'onerahmet/openai-whisper-asr-webservice:latest',
            ports: [9000],
            command: `docker-compose -f ${dockerConfig.composeFile} up -d ${dockerConfig.serviceName}`,
            composeService: dockerConfig.serviceName,
            composeFile: dockerConfig.composeFile,
            healthCheckUrl: dockerConfig.healthCheckUrl || `${apiInfo.baseUrl}/asr`,
            network: 'whisper-network',
            serviceDirectory: 'services/whisper'
        };
    }
}

// Export default instance
export const whisperSTTService = new WhisperSTTService();

// Export for direct instantiation
export default WhisperSTTService;
