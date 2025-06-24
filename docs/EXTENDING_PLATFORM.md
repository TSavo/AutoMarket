# 🛠️ AutoMarket - Adding New Providers, Models & Services

This guide shows you how to extend AutoMarket with new AI providers, models, and services. The platform is designed for easy extensibility using consistent interfaces and patterns.

## 🎯 Quick Overview

AutoMarket's extensible architecture follows these patterns:
- **Providers**: Service integrations (FAL.ai, OpenAI, local Docker services)
- **Models**: Specific AI model implementations (text-to-image, text-to-video, etc.)
- **Clients**: API communication layers
- **Services**: Docker-based local services

## 🔌 Adding a New Remote API Provider

Let's add a hypothetical "AmazingAI" provider that supports text-to-image generation.

### Step 1: Create Provider Package Structure
```
src/media/providers/amazingai/
├── AmazingAiProvider.ts          # Main provider class
├── AmazingAiClient.ts            # API client
├── models/                       # Model implementations
│   ├── AmazingAiTextToImageModel.ts
│   └── AmazingAiTextToVideoModel.ts
├── AmazingAiProvider.test.ts     # Tests
└── index.ts                      # Package exports
```

### Step 2: Implement the API Client
```typescript
// src/media/providers/amazingai/AmazingAiClient.ts
import axios, { AxiosInstance } from 'axios';

export interface AmazingAiConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export interface AmazingAiResponse<T = any> {
  success: boolean;
  data: T;
  requestId: string;
  cost?: number;
}

export class AmazingAiClient {
  private client: AxiosInstance;
  private config: AmazingAiConfig;

  constructor(config: AmazingAiConfig) {
    this.config = {
      baseUrl: 'https://api.amazingai.com/v1',
      timeout: 300000,
      retries: 3,
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'AutoMarket/1.0'
      }
    });
  }

  async generateImage(prompt: string, options: any = {}): Promise<AmazingAiResponse> {
    const response = await this.client.post('/generate/image', {
      prompt,
      width: options.width || 1024,
      height: options.height || 1024,
      steps: options.steps || 20,
      guidance_scale: options.guidanceScale || 7.5,
      model: options.model || 'amazingai-v3'
    });

    return response.data;
  }

  async getAvailableModels(): Promise<any[]> {
    const response = await this.client.get('/models');
    return response.data.models;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch (error) {
      return false;
    }
  }
}
```

### Step 3: Create Model Implementation
```typescript
// src/media/providers/amazingai/models/AmazingAiTextToImageModel.ts
import { TextToImageModel } from '../../../models/abstracts/TextToImageModel';
import { Text, Image } from '../../../assets/roles';
import { AmazingAiClient } from '../AmazingAiClient';

export interface AmazingAiTextToImageOptions {
  width?: number;
  height?: number;
  steps?: number;
  guidanceScale?: number;
  model?: string;
  seed?: number;
}

export class AmazingAiTextToImageModel extends TextToImageModel {
  constructor(
    private client: AmazingAiClient,
    private modelId: string
  ) {
    super();
  }

  getId(): string {
    return this.modelId;
  }

  getProvider(): string {
    return 'amazingai';
  }

  async transform(
    input: Text,
    options: AmazingAiTextToImageOptions = {}
  ): Promise<Image> {
    try {
      const response = await this.client.generateImage(input.getText(), {
        ...options,
        model: this.modelId
      });

      if (!response.success) {
        throw new Error(`AmazingAI generation failed: ${response.data.error}`);
      }

      // Download the generated image
      const imageUrl = response.data.image_url;
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      // Create Image asset with metadata
      return new Image(imageBuffer, 'png', {
        generatedBy: 'amazingai',
        model: this.modelId,
        prompt: input.getText(),
        requestId: response.requestId,
        cost: response.cost,
        width: options.width || 1024,
        height: options.height || 1024,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      throw new Error(`AmazingAI text-to-image failed: ${error.message}`);
    }
  }

  async estimateCost(input: Text, options: AmazingAiTextToImageOptions = {}): Promise<number> {
    // Implement cost estimation based on AmazingAI pricing
    const baseImageCost = 0.02; // $0.02 per image
    const resolutionMultiplier = ((options.width || 1024) * (options.height || 1024)) / (1024 * 1024);
    return baseImageCost * resolutionMultiplier;
  }
}
```

### Step 4: Implement the Provider
```typescript
// src/media/providers/amazingai/AmazingAiProvider.ts
import { 
  MediaProvider, 
  ProviderType, 
  MediaCapability, 
  ProviderModel, 
  ProviderConfig, 
  GenerationRequest, 
  GenerationResult 
} from '../../types/provider';
import { TextToImageProvider } from '../../capabilities';
import { AmazingAiClient, AmazingAiConfig } from './AmazingAiClient';
import { AmazingAiTextToImageModel } from './models/AmazingAiTextToImageModel';

export class AmazingAiProvider implements MediaProvider, TextToImageProvider {
  readonly id = 'amazingai';
  readonly name = 'AmazingAI';
  readonly type = ProviderType.REMOTE;

  readonly capabilities = [
    MediaCapability.TEXT_TO_IMAGE,
    MediaCapability.IMAGE_TO_IMAGE
  ];

  private config?: ProviderConfig;
  private client?: AmazingAiClient;
  private discoveredModels = new Map<string, ProviderModel>();
  private configurationPromise: Promise<void> | null = null;

  constructor() {
    // Auto-configure from environment variables
    this.configurationPromise = this.autoConfigureFromEnv().catch(error => {
      this.configurationPromise = null;
    });
  }

  private async autoConfigureFromEnv(): Promise<void> {
    const apiKey = process.env.AMAZINGAI_API_KEY;
    
    if (apiKey) {
      try {
        await this.configure({
          apiKey,
          timeout: 300000,
          retries: 3
        });
      } catch (error) {
        console.warn(`[AmazingAiProvider] Auto-configuration failed: ${error.message}`);
        throw error;
      }
    } else {
      throw new Error('No AMAZINGAI_API_KEY found in environment');
    }
  }

  get models(): ProviderModel[] {
    return Array.from(this.discoveredModels.values());
  }

  async configure(config: ProviderConfig): Promise<void> {
    this.config = config;
    
    if (!config.apiKey) {
      throw new Error('AmazingAI API key is required');
    }

    const amazingAiConfig: AmazingAiConfig = {
      apiKey: config.apiKey,
      timeout: config.timeout || 300000,
      retries: config.retries || 3
    };

    this.client = new AmazingAiClient(amazingAiConfig);

    // Discover available models
    await this.discoverModels();
  }

  async isAvailable(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      return await this.client.testConnection();
    } catch (error) {
      console.warn('AmazingAI availability check failed:', error);
      return false;
    }
  }

  // TextToImageProvider interface
  async createTextToImageModel(modelId?: string): Promise<AmazingAiTextToImageModel> {
    await this.ensureConfigured();
    
    const defaultModel = 'amazingai-v3';
    const selectedModel = modelId || defaultModel;
    
    return new AmazingAiTextToImageModel(this.client!, selectedModel);
  }

  getSupportedTextToImageModels(): string[] {
    return this.models
      .filter(model => model.capabilities.includes(MediaCapability.TEXT_TO_IMAGE))
      .map(model => model.id);
  }

  supportsTextToImageModel(modelId: string): boolean {
    return this.getSupportedTextToImageModels().includes(modelId);
  }

  // Service management methods
  async startService(): Promise<boolean> {
    return true; // Remote providers are always "running"
  }

  async stopService(): Promise<boolean> {
    return true;
  }

  async getServiceStatus(): Promise<{ running: boolean; healthy: boolean; error?: string }> {
    const isAvailable = await this.isAvailable();
    return {
      running: true,
      healthy: isAvailable,
      error: isAvailable ? undefined : 'API connection failed'
    };
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    throw new Error('AmazingAiProvider should use Model instances for generation, not direct generation');
  }

  // Helper methods
  private async ensureConfigured(): Promise<void> {
    if (this.client) {
      return;
    }
    
    if (this.configurationPromise) {
      await this.configurationPromise;
    }
    
    if (!this.client) {
      throw new Error('Provider auto-configuration failed - no API key found in environment');
    }
  }

  private async discoverModels(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      const availableModels = await this.client.getAvailableModels();
      
      for (const model of availableModels) {
        const providerModel: ProviderModel = {
          id: model.id,
          name: model.name || model.id,
          description: model.description,
          capabilities: this.parseCapabilities(model.type),
          pricing: {
            inputCost: model.pricing?.per_image || 0.02,
            outputCost: 0,
            currency: 'USD'
          },
          parameters: {
            width: { type: 'number', default: 1024, min: 256, max: 2048 },
            height: { type: 'number', default: 1024, min: 256, max: 2048 },
            steps: { type: 'number', default: 20, min: 1, max: 100 },
            guidanceScale: { type: 'number', default: 7.5, min: 1, max: 20 }
          }
        };

        this.discoveredModels.set(model.id, providerModel);
      }

      console.log(`[AmazingAiProvider] Discovered ${this.discoveredModels.size} models`);
    } catch (error) {
      console.warn('[AmazingAiProvider] Model discovery failed:', error.message);
    }
  }

  private parseCapabilities(modelType: string): MediaCapability[] {
    switch (modelType) {
      case 'text-to-image':
        return [MediaCapability.TEXT_TO_IMAGE];
      case 'image-to-image':
        return [MediaCapability.IMAGE_TO_IMAGE];
      case 'text-to-video':
        return [MediaCapability.TEXT_TO_VIDEO];
      default:
        return [];
    }
  }
}

// Auto-register with the provider registry
import { ProviderRegistry } from '../../registry/ProviderRegistry';
ProviderRegistry.getInstance().register('amazingai', AmazingAiProvider);
```

### Step 5: Create Package Index
```typescript
// src/media/providers/amazingai/index.ts
/**
 * AmazingAI Provider - Complete Integration Package
 */

// Main provider
export { AmazingAiProvider } from './AmazingAiProvider';

// Models
export { AmazingAiTextToImageModel } from './models/AmazingAiTextToImageModel';
export type { AmazingAiTextToImageOptions } from './models/AmazingAiTextToImageModel';

// API client
export { AmazingAiClient } from './AmazingAiClient';
export type { AmazingAiConfig, AmazingAiResponse } from './AmazingAiClient';
```

### Step 6: Write Tests
```typescript
// src/media/providers/amazingai/AmazingAiProvider.test.ts
import { AmazingAiProvider } from './AmazingAiProvider';
import { Text } from '../../assets/roles';

describe('AmazingAiProvider', () => {
  let provider: AmazingAiProvider;

  beforeEach(() => {
    provider = new AmazingAiProvider();
  });

  describe('Configuration', () => {
    it('should configure with API key', async () => {
      await provider.configure({ apiKey: 'test-api-key' });
      expect(provider.id).toBe('amazingai');
      expect(provider.name).toBe('AmazingAI');
    });

    it('should throw error without API key', async () => {
      await expect(provider.configure({})).rejects.toThrow('AmazingAI API key is required');
    });
  });

  describe('TextToImageProvider Interface', () => {
    beforeEach(async () => {
      await provider.configure({ apiKey: 'test-api-key' });
    });

    it('should create text-to-image model', async () => {
      const model = await provider.createTextToImageModel('amazingai-v3');
      expect(model).toBeDefined();
      expect(model.getId()).toBe('amazingai-v3');
      expect(model.getProvider()).toBe('amazingai');
    });

    it('should return supported models', () => {
      const supportedModels = provider.getSupportedTextToImageModels();
      expect(supportedModels).toBeInstanceOf(Array);
    });
  });
});
```

### Step 7: Update Environment Configuration
```bash
# Add to .env.local
AMAZINGAI_API_KEY=your_amazing_ai_api_key_here
```

### Step 8: Usage Example
```typescript
import { AmazingAiProvider } from './src/media/providers/amazingai';
import { Text } from './src/media/assets/roles';

// The provider auto-configures from environment variables
const provider = new AmazingAiProvider();

// Create a text-to-image model
const model = await provider.createTextToImageModel('amazingai-v3');

// Generate an image
const text = new Text('A beautiful sunset over the mountains');
const image = await model.transform(text, {
  width: 1024,
  height: 1024,
  steps: 30,
  guidanceScale: 8.0
});

console.log('✅ Generated image:', image.getMetadata());
```

## 🐳 Adding a New Docker Service

Let's add a hypothetical "VideoAI" service that runs locally via Docker.

### Step 1: Create Service Structure
```
src/media/providers/docker/videoai/
├── VideoAiDockerProvider.ts      # Docker provider implementation
├── VideoAiAPIClient.ts           # API client for Docker service
├── VideoAiLocalClient.ts         # Local fallback client
├── models/                       # Model implementations
│   └── VideoAiTextToVideoModel.ts
└── index.ts                      # Package exports

services/videoai/                 # Docker service configuration
├── docker-compose.yml            # Docker setup
├── Dockerfile                    # Service container
├── requirements.txt              # Dependencies
└── app.py                        # Service application
```

### Step 2: Create Docker Service Configuration
```yaml
# services/videoai/docker-compose.yml
version: '3.8'

services:
  videoai:
    build: .
    container_name: automarket-videoai
    ports:
      - "8008:8008"
    environment:
      - SERVICE_PORT=8008
      - MODEL_CACHE_DIR=/app/models
      - TEMP_DIR=/app/temp
    volumes:
      - ./models:/app/models
      - ./temp:/app/temp
      - ./outputs:/app/outputs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8008/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

```dockerfile
# services/videoai/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy application
COPY app.py .
COPY models/ ./models/

# Create directories
RUN mkdir -p /app/temp /app/outputs /app/models

EXPOSE 8008

CMD ["python", "app.py"]
```

```python
# services/videoai/app.py
from flask import Flask, request, jsonify, send_file
import os
import uuid
import tempfile
from videoai_processor import VideoAiProcessor

app = Flask(__name__)
processor = VideoAiProcessor()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'service': 'videoai'})

@app.route('/generate/video', methods=['POST'])
def generate_video():
    try:
        data = request.json
        prompt = data['prompt']
        options = data.get('options', {})
        
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        
        # Process video generation
        result = processor.generate_video(prompt, options, request_id)
        
        return jsonify({
            'success': True,
            'request_id': request_id,
            'video_path': result['video_path'],
            'duration': result['duration'],
            'width': result['width'],
            'height': result['height']
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/download/<request_id>', methods=['GET'])
def download_video(request_id):
    try:
        video_path = f'/app/outputs/{request_id}.mp4'
        if os.path.exists(video_path):
            return send_file(video_path, as_attachment=True)
        else:
            return jsonify({'error': 'Video not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8008, debug=False)
```

### Step 3: Create Docker Provider Implementation
```typescript
// src/media/providers/docker/videoai/VideoAiDockerProvider.ts
import { 
  MediaProvider, 
  ProviderType, 
  MediaCapability, 
  ProviderModel,
  ProviderConfig,
  GenerationRequest,
  GenerationResult
} from '../../../types/provider';
import { TextToVideoProvider } from '../../../capabilities';
import { DockerComposeService } from '../../../services/DockerComposeService';
import { VideoAiAPIClient } from './VideoAiAPIClient';
import { VideoAiLocalClient } from './VideoAiLocalClient';
import { VideoAiTextToVideoModel } from './models/VideoAiTextToVideoModel';

export interface VideoAiDockerConfig extends ProviderConfig {
  dockerServiceUrl?: string;
  dockerComposePath?: string;
  enableLocalFallback?: boolean;
}

export class VideoAiDockerProvider implements MediaProvider, TextToVideoProvider {
  readonly id = 'videoai-docker';
  readonly name = 'VideoAI Docker';
  readonly type = ProviderType.LOCAL;

  readonly capabilities = [
    MediaCapability.TEXT_TO_VIDEO,
    MediaCapability.IMAGE_TO_VIDEO
  ];

  private config?: VideoAiDockerConfig;
  private dockerService?: DockerComposeService;
  private apiClient?: VideoAiAPIClient;
  private localClient?: VideoAiLocalClient;

  get models(): ProviderModel[] {
    return [
      {
        id: 'videoai-v1',
        name: 'VideoAI v1',
        description: 'High-quality text-to-video generation',
        capabilities: [MediaCapability.TEXT_TO_VIDEO],
        pricing: { inputCost: 0, outputCost: 0, currency: 'USD' },
        parameters: {
          width: { type: 'number', default: 1024, min: 256, max: 2048 },
          height: { type: 'number', default: 1024, min: 256, max: 2048 },
          duration: { type: 'number', default: 5, min: 1, max: 30 },
          fps: { type: 'number', default: 24, min: 12, max: 60 }
        }
      }
    ];
  }

  async configure(config: VideoAiDockerConfig): Promise<void> {
    this.config = {
      dockerServiceUrl: 'http://localhost:8008',
      dockerComposePath: './services/videoai',
      enableLocalFallback: true,
      ...config
    };

    // Initialize Docker service
    this.dockerService = new DockerComposeService(
      'videoai',
      this.config.dockerComposePath!
    );

    // Initialize API client
    this.apiClient = new VideoAiAPIClient({
      baseUrl: this.config.dockerServiceUrl!,
      timeout: 600000 // 10 minutes for video generation
    });

    // Initialize local fallback if enabled
    if (this.config.enableLocalFallback) {
      this.localClient = new VideoAiLocalClient();
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiClient) {
      return false;
    }

    try {
      // Check if Docker service is running
      const isRunning = await this.dockerService?.isRunning() || false;
      if (isRunning) {
        return await this.apiClient.testConnection();
      }

      // Check local fallback
      return this.localClient?.isAvailable() || false;
    } catch (error) {
      return false;
    }
  }

  // TextToVideoProvider interface
  async createTextToVideoModel(modelId?: string): Promise<VideoAiTextToVideoModel> {
    const selectedModel = modelId || 'videoai-v1';
    
    // Determine which client to use
    const client = await this.getActiveClient();
    
    return new VideoAiTextToVideoModel(client, selectedModel);
  }

  getSupportedTextToVideoModels(): string[] {
    return this.models.map(model => model.id);
  }

  supportsTextToVideoModel(modelId: string): boolean {
    return this.getSupportedTextToVideoModels().includes(modelId);
  }

  // Service management
  async startService(): Promise<boolean> {
    if (!this.dockerService) {
      return false;
    }

    try {
      await this.dockerService.start();
      
      // Wait for service to be ready
      const maxAttempts = 30;
      for (let i = 0; i < maxAttempts; i++) {
        if (await this.apiClient?.testConnection()) {
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      return false;
    } catch (error) {
      console.error('[VideoAiDockerProvider] Failed to start service:', error);
      return false;
    }
  }

  async stopService(): Promise<boolean> {
    if (!this.dockerService) {
      return true;
    }

    try {
      await this.dockerService.stop();
      return true;
    } catch (error) {
      console.error('[VideoAiDockerProvider] Failed to stop service:', error);
      return false;
    }
  }

  async getServiceStatus(): Promise<{ running: boolean; healthy: boolean; error?: string }> {
    try {
      const isRunning = await this.dockerService?.isRunning() || false;
      
      if (!isRunning) {
        return {
          running: false,
          healthy: false,
          error: 'Docker service not running'
        };
      }

      const isHealthy = await this.apiClient?.testConnection() || false;
      
      return {
        running: isRunning,
        healthy: isHealthy,
        error: isHealthy ? undefined : 'Service unhealthy'
      };
    } catch (error) {
      return {
        running: false,
        healthy: false,
        error: error.message
      };
    }
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    throw new Error('VideoAiDockerProvider should use Model instances for generation');
  }

  // Helper methods
  private async getActiveClient(): Promise<VideoAiAPIClient | VideoAiLocalClient> {
    // Try Docker service first
    if (await this.dockerService?.isRunning() && await this.apiClient?.testConnection()) {
      return this.apiClient!;
    }

    // Fallback to local client
    if (this.localClient && await this.localClient.isAvailable()) {
      console.log('[VideoAiDockerProvider] Using local fallback client');
      return this.localClient;
    }

    throw new Error('No available VideoAI client (Docker service down and no local fallback)');
  }
}
```

### Step 4: Create API Client
```typescript
// src/media/providers/docker/videoai/VideoAiAPIClient.ts
import axios, { AxiosInstance } from 'axios';

export interface VideoAiAPIConfig {
  baseUrl: string;
  timeout?: number;
}

export interface VideoGenerationOptions {
  width?: number;
  height?: number;
  duration?: number;
  fps?: number;
  seed?: number;
}

export class VideoAiAPIClient {
  private client: AxiosInstance;

  constructor(config: VideoAiAPIConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 600000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      return false;
    }
  }

  async generateVideo(prompt: string, options: VideoGenerationOptions = {}): Promise<{
    requestId: string;
    videoPath: string;
    duration: number;
    width: number;
    height: number;
  }> {
    const response = await this.client.post('/generate/video', {
      prompt,
      options
    });

    if (!response.data.success) {
      throw new Error(`VideoAI generation failed: ${response.data.error}`);
    }

    return {
      requestId: response.data.request_id,
      videoPath: response.data.video_path,
      duration: response.data.duration,
      width: response.data.width,
      height: response.data.height
    };
  }

  async downloadVideo(requestId: string): Promise<Buffer> {
    const response = await this.client.get(`/download/${requestId}`, {
      responseType: 'arraybuffer'
    });

    return Buffer.from(response.data);
  }
}
```

### Step 5: Usage Example
```typescript
import { VideoAiDockerProvider } from './src/media/providers/docker/videoai';
import { Text } from './src/media/assets/roles';

// Configure the Docker provider
const provider = new VideoAiDockerProvider();
await provider.configure({
  dockerServiceUrl: 'http://localhost:8008',
  dockerComposePath: './services/videoai',
  enableLocalFallback: true
});

// Start the Docker service
console.log('🐳 Starting VideoAI Docker service...');
const started = await provider.startService();

if (started) {
  console.log('✅ VideoAI service is running');
  
  // Create a model and generate video
  const model = await provider.createTextToVideoModel('videoai-v1');
  const text = new Text('A cat riding a bicycle through a park');
  
  const video = await model.transform(text, {
    width: 1024,
    height: 1024,
    duration: 10,
    fps: 24
  });
  
  console.log('🎬 Generated video:', video.getMetadata());
} else {
  console.log('❌ Failed to start VideoAI service');
}
```

## 🔧 Adding Custom Capabilities

Sometimes you need to add entirely new capabilities to the system.

### Step 1: Define New Capability
```typescript
// src/media/types/provider.ts
export enum MediaCapability {
  // Existing capabilities...
  TEXT_TO_IMAGE = 'text-to-image',
  TEXT_TO_VIDEO = 'text-to-video',
  TEXT_TO_AUDIO = 'text-to-audio',
  
  // New custom capability
  TEXT_TO_3D_MODEL = 'text-to-3d-model',
  IMAGE_TO_3D_MODEL = 'image-to-3d-model'
}
```

### Step 2: Create Capability Interface
```typescript
// src/media/capabilities/TextTo3DProvider.ts
import { TextTo3DModel } from '../models/abstracts/TextTo3DModel';

export interface TextTo3DProvider {
  createTextTo3DModel(modelId?: string): Promise<TextTo3DModel>;
  getSupportedTextTo3DModels(): string[];
  supportsTextTo3DModel(modelId: string): boolean;
}
```

### Step 3: Create Abstract Model
```typescript
// src/media/models/abstracts/TextTo3DModel.ts
import { BaseModel } from './BaseModel';
import { Text } from '../../assets/roles';
import { ThreeDModel } from '../../assets/roles/ThreeDModel'; // New asset type

export abstract class TextTo3DModel extends BaseModel<Text, ThreeDModel> {
  abstract transform(input: Text, options?: any): Promise<ThreeDModel>;
  
  async estimateCost(input: Text, options?: any): Promise<number> {
    return 0.5; // Default cost estimate
  }
  
  async validateInput(input: Text): Promise<boolean> {
    return input.getText().length > 0 && input.getText().length <= 1000;
  }
}
```

### Step 4: Create New Asset Type
```typescript
// src/media/assets/roles/ThreeDModel.ts
import { BaseAsset } from '../Asset';

export class ThreeDModel extends BaseAsset {
  constructor(
    data: Buffer,
    format: string = 'obj',
    metadata?: any
  ) {
    super(data, metadata, `model/${format}`, format);
  }

  getVertexCount(): number {
    return this.metadata?.vertexCount || 0;
  }

  getFaceCount(): number {
    return this.metadata?.faceCount || 0;
  }

  getFileFormat(): string {
    return this.format;
  }

  async exportAs(format: 'obj' | 'fbx' | 'gltf' | 'stl'): Promise<ThreeDModel> {
    // Implement format conversion logic
    // This could use a 3D processing library like Three.js or Assimp
    throw new Error('3D model format conversion not implemented');
  }

  async generateThumbnail(width = 256, height = 256): Promise<Buffer> {
    // Implement 3D model thumbnail generation
    // This could use a 3D rendering library
    throw new Error('3D model thumbnail generation not implemented');
  }

  toString(): string {
    return `3D Model (${this.format}, ${this.getVertexCount()} vertices, ${this.getFaceCount()} faces)`;
  }
}
```

## 🎨 Advanced Customization Examples

### Custom Model with Streaming Support
```typescript
// Custom model with real-time progress updates
export class CustomStreamingModel extends TextToImageModel {
  async transform(input: Text, options: any = {}): Promise<Image> {
    const { onProgress, onQueuePosition } = options;
    
    // Start generation
    const jobId = await this.client.startGeneration(input.getText(), options);
    
    // Poll for progress
    while (true) {
      const status = await this.client.getJobStatus(jobId);
      
      if (status.progress !== undefined && onProgress) {
        onProgress(status.progress);
      }
      
      if (status.queuePosition !== undefined && onQueuePosition) {
        onQueuePosition(status.queuePosition);
      }
      
      if (status.completed) {
        const result = await this.client.getResult(jobId);
        return new Image(result.data, 'png', result.metadata);
      }
      
      if (status.failed) {
        throw new Error(`Generation failed: ${status.error}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

### Custom Provider with Cost Optimization
```typescript
// Provider that automatically selects cheapest model
export class CostOptimizedProvider implements TextToImageProvider {
  private providers: MediaProvider[] = [];
  
  async createTextToImageModel(modelId?: string): Promise<TextToImageModel> {
    // Get all available models across providers
    const availableModels = await this.getAllAvailableModels();
    
    // Sort by cost (prioritize free models)
    const sortedModels = availableModels.sort((a, b) => {
      return (a.pricing?.inputCost || 0) - (b.pricing?.inputCost || 0);
    });
    
    // Select the cheapest available model
    const selectedModel = sortedModels[0];
    const provider = this.providers.find(p => p.supportsTextToImageModel(selectedModel.id));
    
    return provider!.createTextToImageModel(selectedModel.id);
  }
  
  private async getAllAvailableModels(): Promise<ProviderModel[]> {
    const allModels: ProviderModel[] = [];
    
    for (const provider of this.providers) {
      if (await provider.isAvailable()) {
        allModels.push(...provider.models);
      }
    }
    
    return allModels;
  }
}
```

## 🚀 Next Steps

With these patterns, you can extend AutoMarket with:

- **New AI providers** (Stability AI, Midjourney, RunwayML, etc.)
- **Custom Docker services** (background removal, upscaling, style transfer)
- **New capabilities** (3D generation, AR/VR content, audio processing)
- **Specialized models** (domain-specific AI, custom fine-tuned models)
- **Advanced features** (cost optimization, quality scoring, A/B testing)

The unified architecture ensures that any new provider or service integrates seamlessly with the existing ecosystem, providing a consistent developer experience across all media processing capabilities.

---

*For more information, see:*
- [Provider System Architecture](./architecture/provider-system.md)
- [Capability Interfaces](./architecture/capabilities.md)
- [Docker Services Guide](./services/docker-services.md)
- [Testing Guide](./testing/provider-testing.md)
