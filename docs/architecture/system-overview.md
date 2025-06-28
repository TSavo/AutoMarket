# Prizm SDK Architecture Overview

## 🏗️ High-Level Architecture

Prizm is built on a sophisticated layered architecture that provides unified access to 15+ AI providers through multiple interface layers. The system emphasizes:

- **Layered Interface Design**: From zero-config one-liners to maximum-control APIs
- **Provider-Centric Organization**: Each provider contains all related components
- **Capability-Driven Discovery**: Providers declare capabilities, models are discovered dynamically
- **Smart Asset Management**: Format-agnostic loading with automatic role detection
- **Type-Safe Operations**: Comprehensive TypeScript support with validation

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Prizm SDK Layers                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Layer 10: Format Registry | Layer 9: Job Management | Layer 8: Provider Utils│
├─────────────────────────────────────────────────────────────────────────────┤
│ Layer 7: Type Guards | Layer 6: Asset Utilities | Layer 5: Smart Assets    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Layer 4: Job System | Layer 3: REST API | Layer 2: Fluent API             │
├─────────────────────────────────────────────────────────────────────────────┤
│                       Layer 1: Core SDK                                     │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────────────┤
│   FAL.ai    │ Together.ai │ OpenRouter  │  Replicate  │   Docker Providers  │
│  Provider   │  Provider   │  Provider   │  Provider   │                     │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────────────┤
│ 100+ Models │ 150+ Models │ LLM Models  │ Image/Video │  Local Processing   │
│ Image/Video │ Text/Image/ │ Text Gen    │ Models      │                     │
│ Audio Gen   │ Audio       │             │             │                     │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────────────┘
```

## 🔧 Core Components

### 1. Core SDK (Layer 1)

**Purpose**: Provider→model→transform foundation with maximum control

**Key Features**:
- Capability declaration (IMAGE_GENERATION, VIDEO_ANIMATION, etc.)
- Dynamic model discovery and categorization
- Health monitoring and availability checking
- Configuration management with API keys/settings

**Interface Definition**:
```typescript
interface MediaProvider {
  readonly id: string;
  readonly name: string;
  readonly type: ProviderType;                    // 'local' | 'remote'
  readonly capabilities: MediaCapability[];      // What this provider can do
  readonly models: ProviderModel[];              // Available models per capability
  
  configure(config: ProviderConfig): Promise<void>;
  isAvailable(): Promise<boolean>;
  getModelsForCapability(capability: MediaCapability): ProviderModel[];
  getHealth(): Promise<HealthStatus>;
}
```

### 2. Provider Ecosystem

**Remote API Providers**:
- **FAL.ai**: 100+ models for image, video, audio generation with AI-powered categorization
- **Together.ai**: 150+ models including free tier, text/image/audio capabilities
- **OpenRouter**: LLM access with free model detection and rate limiting
- **Replicate**: Image and video processing with model metadata caching
- **OpenAI**: ChatGPT, DALL-E and TTS models
- **Anthropic**: Claude text generation
- **Google Gemini**: Experimental Gemini models
- **xAI**: Grok LLM models
- **Mistral**: Lightweight LLMs
- **Azure OpenAI**: Enterprise GPT service

**Local Docker Providers**:
- **FFMPEG**: Video composition, filtering, audio extraction with REST API
- **Chatterbox**: Text-to-speech with voice cloning capabilities
- **Whisper**: Speech-to-text with multi-language support

### 3. Smart Asset System

**Purpose**: Format-agnostic media loading with automatic capability detection

**Key Features**:
- **AssetLoader**: Single entry point for loading any media format
- **Role Detection**: Automatic assignment of Audio, Video, Text, Image roles
- **Mixin System**: Dynamic capability addition based on format
- **Type Safety**: Full TypeScript support with role validation

**Architecture**:
```typescript
// Smart loading with automatic role assignment
const asset = AssetLoader.load('video.mp4');  // Gets VideoRole + AudioRole
const video = await asset.asVideo();           // Access video functionality  
const audio = await asset.asAudio();           // Access audio extraction

// Role-based type system
interface VideoRole {
  asVideo(): Promise<Video>;
  getDuration(): Promise<number>;
  getResolution(): Promise<{ width: number; height: number }>;
  extractAudio(): Promise<Audio>;  // Video → Audio via FFmpeg
}
```
  }
  
  // Health-based readiness
  private async waitForHealthy(): Promise<boolean> {
    // Polls until Docker health check reports "healthy"
  }
}
```

## 🎯 Design Principles

### 1. Don't Repeat Yourself (DRY)

**Implementation**:
- `DockerComposeService` is reused by all Docker-based services
- Common patterns extracted into base classes
- Shared utilities for error handling and logging

**Benefits**:
- Consistent behavior across all services
- Easier maintenance and updates
- Reduced code duplication

### 2. Separation of Concerns

**MediaTransformer Layer**:
- Handles input/output validation
- Manages transformation logic
- Provides progress callbacks

**LocalServiceManager Layer**:
- Manages service lifecycle
- Handles Docker operations
- Monitors service health

**DockerComposeService Layer**:
- Executes Docker commands
- Parses Docker output
- Manages container state

### 3. Testability

**Unit Tests**:
- Mock external dependencies
- Test business logic in isolation
- Fast execution for development feedback

**Integration Tests**:
- Test with real Docker services
- Validate actual transformations
- Ensure end-to-end functionality

## 🔄 Data Flow

### Typical Transformation Flow

1. **Input Validation**
   ```typescript
   // MediaTransformer validates input type
   if (input.type !== 'audio') {
     throw new Error('Invalid input type');
   }
   ```

2. **Service Readiness Check**
   ```typescript
   // Ensure Docker service is running and healthy
   const status = await this.getServiceStatus();
   if (status !== 'running') {
     await this.startService();
   }
   ```

3. **Transformation Execution**
   ```typescript
   // Execute the actual transformation
   const result = await this.performTransformation(input, options);
   ```

4. **Output Generation**
   ```typescript
   // Return standardized output
   return {
     type: 'text',
     data: transcription,
     metadata: { confidence, processingTime }
   };
   ```

## 🐳 Docker Integration

### Service Self-Management

Each service manages its own Docker dependencies:

```typescript
class WhisperSTTService implements MediaTransformer, LocalServiceManager {
  private dockerService: DockerComposeService;
  
  constructor() {
    this.dockerService = new DockerComposeService(
      'whisper-asr-webservice',
      path.join(__dirname, '../../../services/whisper/docker-compose.yml')
    );
  }
}
```

### Health Monitoring

Services wait for actual Docker health checks:

```yaml
# docker-compose.yml
services:
  whisper-asr-webservice:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
```

## 🚀 Scalability Considerations

### Horizontal Scaling
- Each service can run multiple instances
- Load balancing can be added at the Docker level
- Services are stateless for easy scaling

### Vertical Scaling
- GPU acceleration support (CUDA for Chatterbox TTS)
- Memory and CPU limits configurable per service
- Resource monitoring and optimization

### Future Extensibility
- New services can be added by implementing MediaTransformer
- Existing DockerComposeService can be reused
- Plugin architecture for custom transformations

## 📊 Performance Characteristics

### WhisperSTTService
- **Startup Time**: ~30-60 seconds (model loading)
- **Processing**: ~1-2x real-time for audio transcription
- **Memory**: ~2-4GB depending on model size

### ChatterboxTTSDockerService
- **Startup Time**: ~60-90 seconds (CUDA model loading)
- **Processing**: ~2-5 seconds for short text
- **Memory**: ~4-8GB with CUDA acceleration

### DockerComposeService
- **Command Execution**: ~100-500ms per Docker command
- **Health Checks**: ~2-5 seconds for service readiness
- **Container Management**: Minimal overhead

---

**Next**: [MediaTransformer Interface](./media-transformer.md)
