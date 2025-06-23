# AutoMarket System Architecture Overview

## 🏗️ High-Level Architecture

AutoMarket is built on a sophisticated multi-provider architecture that unifies both remote AI services and local Docker-based services under a common interface. The system emphasizes:

- **Provider-Centric Organization**: Each provider contains all related components (Provider, Models, Client, Services)
- **Capability-Driven Discovery**: Providers declare capabilities, models are discovered dynamically
- **Smart Asset Management**: Format-agnostic loading with automatic role detection and transformations
- **Unified Interface**: All providers implement the same MediaProvider interface regardless of type
- **Type-Safe Operations**: Comprehensive TypeScript support with validation

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AutoMarket Application                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                       MediaProvider Interface                               │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────────────┤
│   FAL.ai    │ Together.ai │ OpenRouter  │  Replicate  │   Docker Providers  │
│  Provider   │  Provider   │  Provider   │  Provider   │                     │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────────────┤
│ 100+ Models │ 150+ Models │ LLM Models  │ Image/Video │  Local Processing   │
│ Image/Video │ Text/Image/ │ Text Gen    │ Models      │                     │
│ Audio Gen   │ Audio       │             │             │                     │
├─────────────┴─────────────┴─────────────┴─────────────┼─────────────────────┤
│                  Smart Asset System                   │  FFMPEG │ TTS │ STT │
├───────────────────────────────────────────────────────┼─────────┼─────┼─────┤
│              AssetLoader & Role System                │ Docker  │ Docker │Docker│
├───────────────────────────────────────────────────────┼─────────┼─────┼─────┤
│     Audio │ Video │ Text │ Image │ Role Mixins        │Container│Container│Container│
└───────────┴───────┴──────┴───────┴────────────────────┴─────────┴─────┴─────┘
```

## 🔧 Core Components

### 1. MediaProvider Interface

**Purpose**: Unified interface for all media providers (remote APIs and local services)

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

### 4. Capability System

**Purpose**: Define what providers can do and automatically match capabilities to models

**Key Features**:
- **MediaCapability Enum**: Extensive capability definitions (IMAGE_GENERATION, VIDEO_ANIMATION, etc.)
- **Dynamic Model Discovery**: Models automatically categorized by capabilities
- **Provider Mixins**: Add capability interfaces to providers dynamically
- **Type-Safe Capability Checking**: Guards and validation for capability support

**Capability Categories**:
```typescript
enum MediaCapability {
  // Text capabilities
  TEXT_GENERATION = 'text-generation',
  TEXT_TO_TEXT = 'text-to-text',

  // Image capabilities  
  IMAGE_GENERATION = 'image-generation',
  IMAGE_UPSCALING = 'image-upscaling',
  IMAGE_ENHANCEMENT = 'image-enhancement',

  // Video capabilities
  VIDEO_GENERATION = 'video-generation', 
  VIDEO_ANIMATION = 'video-animation',
  VIDEO_UPSCALING = 'video-upscaling',

  // Audio capabilities
  AUDIO_GENERATION = 'audio-generation',
  TEXT_TO_SPEECH = 'text-to-speech',
  VOICE_CLONING = 'voice-cloning',
  // ... many more
}
```

### 5. Video Composition System

**Purpose**: Advanced video composition with FFMPEG integration

**Key Features**:
- **N-Video Composition**: Support for any number of input videos
- **Complex Overlays**: Multi-layer overlays with positioning, timing, and opacity
- **Green Screen Support**: Color key removal for professional compositing
- **Filter Complex Generation**: Dynamic FFMPEG filter generation
- **Docker + Local Support**: Both Docker API and local FFMPEG fallback

**Composition Builder**:
```typescript
const composer = new FFMPEGCompositionBuilder()
  .prepend(introVideo)                    // Add intro sequence
  .compose(mainVideo)                     // Main content video
  .append(outroVideo)                     // Add outro sequence
  .addOverlay(logoVideo, {               // Logo overlay
    position: 'top-right',
    opacity: 0.8,
    width: '20%',
    colorKey: '#000000',                  // Remove black background
    startTime: 2.0                        // Appears after 2 seconds
  });

const result = await composer.transform(ffmpegModel);
```

## 🗂️ Directory Structure

```
src/media/
├── providers/                 # Provider-centric organization
│   ├── falai/                # FAL.ai provider package
│   │   ├── FalAiProvider.ts  # Provider implementation
│   │   ├── FalAiClient.ts    # API client
│   │   ├── models/           # Model implementations
│   │   └── index.ts          # Package exports
│   ├── together/             # Together.ai provider package
│   ├── openrouter/           # OpenRouter provider package
│   ├── replicate/            # Replicate provider package
│   └── docker/               # Docker provider packages
│       ├── ffmpeg/           # FFMPEG Docker provider
│       ├── chatterbox/       # TTS Docker provider
│       └── whisper/          # STT Docker provider
├── assets/                   # Smart asset system
│   ├── roles/                # Role-based asset classes
│   ├── mixins/               # Role mixin implementations
│   └── SmartAssetFactory.ts  # Asset loading logic
├── capabilities/             # Provider capability system
│   ├── interfaces/           # Capability interfaces
│   ├── mixins/               # Capability mixins
│   └── guards/               # Type guards
├── models/                   # Backward compatibility exports
├── types/                    # TypeScript type definitions
└── index.ts                  # Main media module export
```

## 🔄 Data Flow

### Provider Usage Flow
1. **Configuration**: Provider configured with API keys/settings
2. **Discovery**: Models discovered dynamically from provider APIs
3. **Capability Matching**: Models categorized by capabilities
4. **Model Creation**: Specific model instances created for transformations
5. **Execution**: Models handle actual media transformations

### Asset Processing Flow
1. **Loading**: AssetLoader detects format and assigns roles
2. **Role Assignment**: Automatic mixin application based on format
3. **Transformation**: Role methods provide access to transformation capabilities
4. **Output**: Results returned as typed media objects

## 🏆 Architectural Principles

1. **Provider Agnostic**: Switch between providers seamlessly
2. **Capability Driven**: Focus on what providers can do, not how they do it
3. **Type Safety**: Full TypeScript support with runtime validation
4. **Smart Defaults**: Intelligent fallbacks and automatic configuration
5. **Extensible**: Easy to add new providers, capabilities, and models
6. **Docker Integration**: Seamless local service management
7. **Testing First**: Comprehensive test coverage for all components

## 🚀 Key Benefits

### Developer Experience
- **Single Import**: `import { FalAiProvider } from './providers/falai'`
- **Type Safety**: Full TypeScript support with IntelliSense
- **Consistent APIs**: Same interface across all providers
- **Auto-Discovery**: Models discovered and categorized automatically

### Production Ready
- **Error Handling**: Comprehensive error handling and recovery
- **Health Monitoring**: Provider health checks and status reporting
- **Docker Management**: Automatic container lifecycle management
- **Scaling Support**: Horizontal and vertical scaling capabilities

### Extensibility
- **Plugin Architecture**: Easy to add new providers and capabilities
- **Mixin System**: Dynamic capability addition to providers and assets
- **Configuration Driven**: Environment-based provider configuration
- **Testing Infrastructure**: Comprehensive testing tools and patterns
