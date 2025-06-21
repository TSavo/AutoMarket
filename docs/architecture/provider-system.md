# Provider System Architecture

## 🎯 Overview

The AutoMarket Provider System is a sophisticated multi-provider architecture that unifies remote AI services and local Docker services under a common MediaProvider interface. The system enables seamless switching between providers while maintaining consistent APIs and type safety.

## 🏗️ Provider-Centric Organization

Each provider is organized as a complete package containing all related components:

```
providers/
├── falai/                    # FAL.ai provider package
│   ├── FalAiProvider.ts     # Provider implementation
│   ├── FalAiClient.ts       # API client
│   ├── models/              # Model implementations
│   │   ├── FalTextToImageModel.ts
│   │   ├── FalTextToVideoModel.ts
│   │   └── FalTextToAudioModel.ts
│   └── index.ts             # Package exports
├── together/                # Together.ai provider package
│   ├── TogetherProvider.ts
│   ├── TogetherAPIClient.ts
│   ├── models/
│   └── index.ts
└── docker/                  # Docker provider packages
    ├── ffmpeg/              # FFMPEG Docker provider
    ├── chatterbox/          # TTS Docker provider
    └── whisper/             # STT Docker provider
```

## 📋 MediaProvider Interface

All providers implement the unified MediaProvider interface:

```typescript
interface MediaProvider {
  readonly id: string;                           // Unique provider identifier
  readonly name: string;                         // Human-readable name
  readonly type: ProviderType;                   // 'local' | 'remote'
  readonly capabilities: MediaCapability[];     // What this provider can do
  readonly models: ProviderModel[];             // Available models

  // Configuration and lifecycle
  configure(config: ProviderConfig): Promise<void>;
  isAvailable(): Promise<boolean>;
  
  // Model management
  getModelsForCapability(capability: MediaCapability): ProviderModel[];
  
  // Health and monitoring
  getHealth(): Promise<HealthStatus>;
}
```

## 🔌 Provider Types

### Remote API Providers

Connect to external AI services via REST APIs:

#### FAL.ai Provider
- **Capabilities**: Image generation, video animation, audio generation
- **Models**: 100+ models discovered dynamically
- **Features**: AI-powered model categorization, file downloads, progress tracking

```typescript
const falProvider = new FalAiProvider();
await falProvider.configure({ apiKey: process.env.FALAI_API_KEY });

const imageModels = falProvider.getModelsForCapability(MediaCapability.IMAGE_GENERATION);
const textToImageModel = await falProvider.createTextToImageModel('fal-ai/flux-pro');
```

#### Together.ai Provider
- **Capabilities**: Text generation, image generation, audio generation
- **Models**: 150+ models with free tier support
- **Features**: Model discovery, pricing information, parameter optimization

```typescript
const togetherProvider = new TogetherProvider();
await togetherProvider.configure({ apiKey: process.env.TOGETHER_API_KEY });

const freeModels = togetherProvider.getFreeModels();
const textModel = await togetherProvider.createTextToTextModel('meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo');
```

#### OpenRouter Provider
- **Capabilities**: Text generation, LLM access
- **Models**: Popular models with fallback support
- **Features**: Free model detection, rate limiting, error handling

```typescript
const openRouterProvider = new OpenRouterProvider();
await openRouterProvider.configure({ apiKey: process.env.OPENROUTER_API_KEY });

const textModel = await openRouterProvider.createTextToTextModel('deepseek/deepseek-r1-distill-llama-70b');
```

### Local Docker Providers

Manage containerized services for local processing:

#### FFMPEG Provider
- **Capabilities**: Video generation, video animation, audio enhancement
- **Services**: Docker containerized FFMPEG with REST API
- **Features**: N-video composition, overlay support, filter complex generation

```typescript
const ffmpegProvider = new FFMPEGDockerProvider();
await ffmpegProvider.configure({ 
  dockerImage: 'ffmpeg-service:latest',
  serviceUrl: 'http://localhost:8006'
});

const composerModel = await ffmpegProvider.createVideoComposerModel('ffmpeg-composer');
```

#### Chatterbox TTS Provider
- **Capabilities**: Text-to-speech, voice cloning
- **Services**: Docker TTS service with multiple voice options
- **Features**: Voice cloning, natural speech synthesis

```typescript
const chatterboxProvider = new ChatterboxProvider();
await chatterboxProvider.configure({
  dockerImage: 'chatterbox-tts:latest',
  baseUrl: 'http://localhost:8004'
});
```

## 🎯 Dynamic Model Discovery

Providers automatically discover and categorize available models:

### Discovery Process
1. **API Scraping**: Retrieve model lists from provider APIs
2. **Capability Detection**: Analyze model metadata to determine capabilities
3. **Categorization**: Group models by capabilities (text, image, video, audio)
4. **Validation**: Ensure models meet capability requirements
5. **Caching**: Store discovered models for performance

### Model Categorization
```typescript
// Example from TogetherProvider
private determineModelCapabilities(model: any): MediaCapability[] {
  const capabilities: MediaCapability[] = [];
  const modelId = model.id.toLowerCase();
  
  // Image generation detection
  if (modelId.includes('flux') || modelId.includes('stable-diffusion')) {
    capabilities.push(MediaCapability.IMAGE_GENERATION);
  }
  
  // Text generation detection
  if (model.type === 'chat' || modelId.includes('llama') || modelId.includes('gpt')) {
    capabilities.push(MediaCapability.TEXT_GENERATION);
  }
  
  // Audio generation detection
  if (modelId.includes('sonic') || model.type === 'audio') {
    capabilities.push(MediaCapability.AUDIO_GENERATION);
  }
  
  return capabilities;
}
```

## 🔧 Provider Configuration

### Environment Configuration
```bash
# API Provider Keys
FALAI_API_KEY=your_fal_ai_key
REPLICATE_API_TOKEN=your_replicate_token
TOGETHER_API_KEY=your_together_key
OPENROUTER_API_KEY=your_openrouter_key

# Docker Service URLs
FFMPEG_SERVICE_URL=http://localhost:8006
CHATTERBOX_DOCKER_URL=http://localhost:8004
WHISPER_SERVICE_URL=http://localhost:9000
```

### Programmatic Configuration
```typescript
// Configure multiple providers
const providers = [
  new FalAiProvider(),
  new TogetherProvider(),
  new OpenRouterProvider(),
  new FFMPEGDockerProvider()
];

// Configure all providers
for (const provider of providers) {
  await provider.configure({
    apiKey: process.env[`${provider.id.toUpperCase()}_API_KEY`],
    timeout: 30000,
    retries: 3
  });
}

// Verify availability
const availableProviders = [];
for (const provider of providers) {
  if (await provider.isAvailable()) {
    availableProviders.push(provider);
  }
}
```

## 🎭 Capability Mixins

Providers can implement multiple capability interfaces using mixins:

```typescript
// Provider with multiple capabilities
export class FalAiProvider 
  implements MediaProvider, TextToImageProvider, TextToVideoProvider, TextToAudioProvider {
  
  // TextToImageProvider implementation
  async createTextToImageModel(modelId: string): Promise<TextToImageModel> {
    return new FalTextToImageModel(this.client, modelId);
  }
  
  // TextToVideoProvider implementation
  async createTextToVideoModel(modelId: string): Promise<TextToVideoModel> {
    return new FalTextToVideoModel(this.client, modelId);
  }
  
  // TextToAudioProvider implementation
  async createTextToAudioModel(modelId: string): Promise<TextToAudioModel> {
    return new FalTextToAudioModel(this.client, modelId);
  }
}
```

## 📊 Provider Health Monitoring

### Health Status
```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  activeJobs: number;
  queuedJobs: number;
  lastError?: string;
}

// Example health check
const health = await provider.getHealth();
if (health.status === 'healthy') {
  // Provider is ready for requests
} else {
  console.warn(`Provider ${provider.name} is ${health.status}`);
}
```

### Service Status for Docker Providers
```typescript
// Docker provider specific status
async getServiceStatus(): Promise<{ running: boolean; healthy: boolean; error?: string }> {
  try {
    const isRunning = await this.dockerService.isContainerRunning();
    const isHealthy = await this.dockerService.isServiceHealthy();
    
    return {
      running: isRunning,
      healthy: isHealthy
    };
  } catch (error) {
    return {
      running: false,
      healthy: false,
      error: error.message
    };
  }
}
```

## 🔄 Provider Registry

Central management of all providers:

```typescript
class ProviderRegistry {
  private providers = new Map<string, MediaProvider>();
  
  register(provider: MediaProvider): void {
    this.providers.set(provider.id, provider);
  }
  
  getProvider(id: string): MediaProvider | undefined {
    return this.providers.get(id);
  }
  
  getProvidersForCapability(capability: MediaCapability): MediaProvider[] {
    return Array.from(this.providers.values())
      .filter(provider => provider.capabilities.includes(capability));
  }
  
  async getAvailableProviders(): Promise<MediaProvider[]> {
    const available = [];
    for (const provider of this.providers.values()) {
      if (await provider.isAvailable()) {
        available.push(provider);
      }
    }
    return available;
  }
}
```

## 🚀 Usage Examples

### Basic Provider Usage
```typescript
import { FalAiProvider } from './src/media/providers/falai';

// Create and configure provider
const provider = new FalAiProvider();
await provider.configure({ apiKey: process.env.FALAI_API_KEY });

// Check availability
if (await provider.isAvailable()) {
  // Get models for specific capability
  const imageModels = provider.getModelsForCapability(MediaCapability.IMAGE_GENERATION);
  
  // Create and use model
  const model = await provider.createTextToImageModel('fal-ai/flux-pro');
  const result = await model.transform(textInput);
}
```

### Multi-Provider Usage
```typescript
import { FalAiProvider, TogetherProvider } from './src/media/providers';

// Configure multiple providers
const falProvider = new FalAiProvider();
const togetherProvider = new TogetherProvider();

await Promise.all([
  falProvider.configure({ apiKey: process.env.FALAI_API_KEY }),
  togetherProvider.configure({ apiKey: process.env.TOGETHER_API_KEY })
]);

// Get image generation models from all providers
const allImageModels = [
  ...falProvider.getModelsForCapability(MediaCapability.IMAGE_GENERATION),
  ...togetherProvider.getModelsForCapability(MediaCapability.IMAGE_GENERATION)
];

// Use the best available model
const bestModel = allImageModels.find(model => model.pricing?.inputCost === 0) || allImageModels[0];
```

## 🔍 Error Handling

### Provider-Level Error Handling
```typescript
try {
  await provider.configure(config);
} catch (error) {
  if (error.code === 'INVALID_API_KEY') {
    console.error('Invalid API key for provider:', provider.name);
  } else if (error.code === 'NETWORK_ERROR') {
    console.error('Network error connecting to provider:', provider.name);
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

### Model-Level Error Handling
```typescript
try {
  const result = await model.transform(input);
} catch (error) {
  if (error.code === 'QUOTA_EXCEEDED') {
    // Try with a different provider
    const fallbackProvider = getAvailableProvider(capability);
    const fallbackModel = await fallbackProvider.createModel(modelId);
    return await fallbackModel.transform(input);
  }
  throw error;
}
```

## 🎯 Best Practices

### Provider Selection
1. **Capability First**: Choose providers based on required capabilities
2. **Cost Optimization**: Prefer free models when available
3. **Fallback Strategy**: Always have backup providers configured
4. **Health Monitoring**: Check provider health before making requests

### Configuration Management
1. **Environment Variables**: Use environment variables for API keys
2. **Configuration Validation**: Validate configuration at startup
3. **Secure Storage**: Never hard-code API keys in source code
4. **Rotation Support**: Support for API key rotation

### Performance Optimization
1. **Connection Pooling**: Reuse HTTP connections where possible
2. **Model Caching**: Cache model instances for repeated use
3. **Parallel Requests**: Use Promise.all for independent operations
4. **Timeout Handling**: Set appropriate timeouts for different operations
