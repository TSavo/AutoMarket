/**
 * FFMPEG Local Client Example
 * 
 * Example showing how to use the FFMPEGProvider with a local FFMPEG client
 * that bypasses Docker and connects directly to a running FFMPEG service.
 */

import { FFMPEGProvider } from './src/media/providers/ffmpeg/FFMPEGProvider';
import { IFFMPEGClient, AudioConversionOptions, AudioExtractionResult, HealthCheckResult } from './src/media/providers/ffmpeg/IFFMPEGClient';
import { Readable } from 'stream';
import axios from 'axios';

/**
 * Local FFMPEG Client that connects directly to a running FFMPEG service
 * without using Docker. This is a lightweight implementation for direct HTTP calls.
 */
class FFMPEGLocalClient implements IFFMPEGClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: { baseUrl: string; timeout?: number }) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout || 300000;
  }

  async checkHealth(): Promise<HealthCheckResult> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });
      return {
        status: response.data.status || 'healthy',
        version: response.data.version,
        uptime: response.data.uptime,
        activeJobs: response.data.activeJobs,
        totalProcessed: response.data.totalProcessed
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const health = await this.checkHealth();
      return health.status === 'healthy';
    } catch {
      return false;
    }
  }
  async extractAudio(
    videoData: Buffer | Readable | string,
    options?: any
  ): Promise<AudioExtractionResult> {
    // Implementation for audio extraction via local HTTP call
    const formData = new FormData();
    
    if (typeof videoData === 'string') {
      throw new Error('File path input not supported in local client - use Buffer instead');
    }
      if (Buffer.isBuffer(videoData)) {
      formData.append('video', new Blob([videoData]), 'video.mp4');
    } else {
      throw new Error('Unsupported input type for local client');
    }

    // Add options
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
    }

    try {
      const response = await fetch(`${this.baseUrl}/audio/extract`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(this.timeout)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      throw new Error(`Audio extraction failed: ${error.message}`);
    }
  }
  async convertAudio(
    audioData: Buffer | Readable | string,
    options?: AudioConversionOptions
  ): Promise<AudioExtractionResult> {
    // Implementation for audio conversion via local HTTP call
    const formData = new FormData();
    
    if (typeof audioData === 'string') {
      throw new Error('File path input not supported in local client - use Buffer instead');
    }
      if (Buffer.isBuffer(audioData)) {
      formData.append('audio', new Blob([audioData]), 'audio.mp3');
    } else {
      throw new Error('Unsupported input type for local client');
    }

    // Add options
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
    }

    try {
      const response = await fetch(`${this.baseUrl}/audio/convert`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(this.timeout)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      throw new Error(`Audio conversion failed: ${error.message}`);
    }
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    try {
      const response = await fetch(`${this.baseUrl}/download/${encodeURIComponent(filePath)}`, {
        signal: AbortSignal.timeout(this.timeout)
      });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      throw new Error(`File download failed: ${error.message}`);
    }
  }

  async getMetadata(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/metadata`, {
        signal: AbortSignal.timeout(5000)
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to get metadata: ${error.message}`);
    }
  }
}

/**
 * Example usage of FFMPEGProvider with local client
 */
async function testFFMPEGWithLocalClient() {
  console.log('🎵 Testing FFMPEG Provider with Local Client...\n');

  try {
    // Create a local FFMPEG client that connects directly to the service
    const localClient = new FFMPEGLocalClient({
      baseUrl: 'http://localhost:8006', // Direct connection to FFMPEG service
      timeout: 300000 // 5 minutes
    });

    // Create FFMPEG provider with the local client
    const provider = new FFMPEGProvider(localClient);

    // Configure the provider
    await provider.configure({
      baseUrl: 'http://localhost:8006',
      timeout: 300000
    });

    console.log('✅ FFMPEG Provider configured with local client');

    // Check availability
    const isAvailable = await provider.isAvailable();
    console.log(`🔍 Provider Available: ${isAvailable ? '✅ Yes' : '❌ No'}`);

    if (!isAvailable) {
      console.log('❌ FFMPEG service not available on localhost:8006');
      return;
    }

    // Get health status
    const health = await provider.getHealth();
    console.log('🏥 Health Status:', JSON.stringify(health, null, 2));

    // Test audio-to-audio functionality
    console.log('\n🎵 Testing Audio-to-Audio Model...');
    
    try {
      const audioModel = await provider.createAudioToAudioModel('ffmpeg-audio-to-audio');
      console.log(`✅ Audio model created: ${audioModel.getName()}`);
      
      // Show supported formats
      console.log(`📋 Input Formats: ${audioModel.getSupportedInputFormats().join(', ')}`);
      console.log(`📋 Output Formats: ${audioModel.getSupportedOutputFormats().join(', ')}`);
      
      console.log('\n📝 Example Audio Conversions:');
      console.log('  • MP3 → WAV: { outputFormat: "wav", sampleRate: 44100, quality: "lossless" }');
      console.log('  • WAV → FLAC: { outputFormat: "flac", normalize: true, quality: "lossless" }');
      console.log('  • Any → MP3: { outputFormat: "mp3", bitrate: "320k", normalize: true }');
      
    } catch (error) {
      console.log(`❌ Audio model creation failed: ${error.message}`);
    }

    console.log('\n🎬 Testing Video-to-Audio Model...');
    
    try {
      const videoModel = await provider.createVideoToAudioModel('ffmpeg-video-to-audio');
      console.log(`✅ Video model created: ${videoModel.getName()}`);
      
      console.log('\n📝 Example Video Audio Extractions:');
      console.log('  • Extract MP3: { outputFormat: "mp3", bitrate: "192k" }');
      console.log('  • Extract WAV: { outputFormat: "wav", sampleRate: 48000 }');
      console.log('  • Extract Segment: { startTime: 30, duration: 60, outputFormat: "mp3" }');
      
    } catch (error) {
      console.log(`❌ Video model creation failed: ${error.message}`);
    }

    console.log('\n✅ Local client test completed!');
    console.log('\n💡 Key Benefits of Local Client:');
    console.log('  • Direct HTTP connection (no Docker overhead)');
    console.log('  • Faster startup and response times');
    console.log('  • Simpler deployment in containerized environments');
    console.log('  • Works with any FFMPEG service implementation');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

/**
 * Example: Using with Docker client (existing behavior)
 */
async function testFFMPEGWithDockerClient() {
  console.log('🐳 Testing FFMPEG Provider with Docker Client...\n');

  try {
    // Create provider without explicit client (will use Docker client by default)
    const provider = new FFMPEGProvider();

    // Configure for Docker
    await provider.configure({
      baseUrl: 'http://localhost:8006',
      dockerImage: 'ffmpeg-service:latest',
      enableGPU: true
    });

    console.log('✅ FFMPEG Provider configured with Docker client');

    const isAvailable = await provider.isAvailable();
    console.log(`🔍 Provider Available: ${isAvailable ? '✅ Yes' : '❌ No'}`);

    if (isAvailable) {
      console.log('🐳 Docker client provides additional features:');
      console.log('  • Container lifecycle management');
      console.log('  • GPU acceleration support');
      console.log('  • Resource isolation');
      console.log('  • Automatic service recovery');
    }

  } catch (error) {
    console.error('❌ Docker client test failed:', error.message);
  }
}

// Run tests
if (require.main === module) {
  console.log('🚀 FFMPEG Provider Refactoring Demo\n');
  console.log('This demo shows how the FFMPEGProvider now works with any client implementation:\n');
  
  testFFMPEGWithLocalClient()
    .then(() => console.log('\n' + '─'.repeat(50) + '\n'))
    .then(() => testFFMPEGWithDockerClient())
    .catch(console.error);
}

export { FFMPEGLocalClient, testFFMPEGWithLocalClient, testFFMPEGWithDockerClient };
