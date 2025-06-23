# AutoMarket Media Processing Platform Documentation

## 🎯 Overview

AutoMarket is a comprehensive media processing platform featuring a unified multi-provider architecture, smart asset management, and advanced video composition capabilities. The system integrates multiple AI providers (FAL.ai, Together.ai, OpenRouter, Replicate, OpenAI, Anthropic, Google Gemini, xAI, Mistral, Azure OpenAI) with local Docker services to provide a complete media transformation ecosystem.

## 🏗️ Architecture Highlights

- **� Multi-Provider Architecture**: Unified MediaProvider interface for remote APIs and local Docker services
- **🎨 Smart Asset System**: Format-agnostic loading with automatic role detection and transformations
- **🎬 Advanced Video Composition**: N-video composition with overlays, concatenation, and FFMPEG integration
- **� Docker Service Integration**: Local FFMPEG, Chatterbox TTS, and Whisper STT containerized services
- **� Dynamic Model Discovery**: Automatic discovery and categorization of available models from providers
- **🛡️ Type-Safe Development**: Full TypeScript support with comprehensive validation and interfaces

## 📚 Documentation Structure

### 🚀 Getting Started
- [Quick Start Guide](./getting-started/quick-start.md) - Get up and running with AutoMarket
- [Installation Guide](./getting-started/installation.md) - Complete installation instructions
- [Configuration](./getting-started/configuration.md) - Environment and provider configuration

### 🏛️ Architecture
- [System Architecture](./architecture/system-overview.md) - Complete system overview
- [Provider System](./architecture/provider-system.md) - Multi-provider architecture details
- [Asset & Role System](./architecture/asset-system.md) - Smart asset loading and role-based transformations
- [Capability System](./architecture/capability-system.md) - Provider capabilities and model management

### 🔧 Providers
- [FAL.ai Provider](./providers/falai.md) - Image, video, and audio generation
- [Together.ai Provider](./providers/together.md) - Text, image, and audio models  
- [OpenRouter Provider](./providers/openrouter.md) - LLM access and text generation
- [Replicate Provider](./providers/replicate.md) - Image and video processing
- [Docker Providers](./providers/docker.md) - Local FFMPEG, TTS, and STT services

### 🎬 Video Composition
- [Video Composition System](./video/composition-system.md) - N-video composition architecture
- [FFMPEG Integration](./video/ffmpeg-integration.md) - Docker-based video processing
- [Advanced Overlays](./video/overlay-system.md) - Complex overlay and compositing

### 🧪 Testing
- [Testing Strategy](./testing/strategy.md) - Complete testing approach
- [Provider Tests](./testing/provider-tests.md) - Testing provider implementations
- [Integration Tests](./testing/integration-tests.md) - End-to-end testing

### 📖 API Reference
- [MediaProvider API](./api/media-provider.md) - Core provider interface
- [Asset & Role APIs](./api/asset-apis.md) - Asset loading and transformation APIs
- [Model APIs](./api/model-apis.md) - Model creation and usage APIs

## 🎉 Key Features & Achievements

### ✅ Multi-Provider Architecture
- **Unified MediaProvider Interface**: Consistent API across all providers (local + remote)
- **FAL.ai Integration**: 100+ models for image, video, and audio generation
- **Together.ai Integration**: 150+ models with free tier support
- **OpenRouter Integration**: LLM access with free model detection
- **OpenAI Integration**: ChatGPT, DALL-E, TTS and more
- **Anthropic Integration**: Claude models for text generation
- **Google Gemini Integration**: Experimental Gemini models
- **xAI Integration**: Grok model access
- **Mistral Integration**: Lightweight LLMs
- **Azure OpenAI Integration**: Enterprise-ready GPT models
- **Docker Services**: Local FFMPEG, Chatterbox TTS, Whisper STT

### ✅ Smart Asset System
- **Format-Agnostic Loading**: Automatic format detection and role assignment
- **Role-Based Transformations**: Audio, Video, Text, Image roles with mixins
- **AssetLoader**: Single entry point for loading any media type
- **Type-Safe Operations**: Full TypeScript support with validation

### ✅ Advanced Video Composition
- **N-Video Composition**: Support for any number of input videos
- **Complex Overlays**: Multi-layer overlays with positioning and timing
- **Green Screen Support**: Color key removal for professional compositing  
- **FFMPEG Integration**: Both Docker API and local fallback support

### ✅ Dynamic Model Discovery
- **Runtime Model Discovery**: Automatic model detection from provider APIs
- **Capability Mapping**: Models automatically categorized by capabilities
- **Cost Optimization**: Free model detection and preference
- **Model Validation**: Type-safe model parameter validation

### ✅ Production-Ready Services
- **Docker Self-Management**: Services manage their own container lifecycle
- **Health Monitoring**: Comprehensive health checks and status reporting
- **Error Recovery**: Robust error handling with graceful degradation
- **Comprehensive Testing**: Unit and integration tests for all components

## 🚀 Quick Start

```bash
# Clone and install
git clone <repository-url>
cd AutoMarket
npm install

# Configure environment
cp .env.example .env.local
# Add your API keys

# Run tests
npm run test
npm run test:integration

# Start development server
npm run dev
```

## 💻 Basic Usage Examples

### Provider Configuration
```typescript
import { FalAiProvider, TogetherProvider } from './src/media/providers';

// Configure FAL.ai provider
const falProvider = new FalAiProvider();
await falProvider.configure({ apiKey: process.env.FALAI_API_KEY });

// Get models for specific capability
const imageModels = falProvider.getModelsForCapability(MediaCapability.IMAGE_GENERATION);
```

### Smart Asset Loading
```typescript
import { AssetLoader } from './src/media/assets';

// Auto-detect format and assign roles
const asset = AssetLoader.load('video.mp4');  // Gets Video + Audio roles
const video = await asset.asVideo();           // Access video functionality
const audio = await asset.extractAudio();     // Extract audio via FFMPEG
```

### Video Composition
```typescript
import { FFMPEGCompositionBuilder } from './src/media/providers/docker/ffmpeg';

const composer = new FFMPEGCompositionBuilder()
  .compose(mainVideo)
  .addOverlay(logoVideo, { 
    position: 'top-right', 
    opacity: 0.8,
    colorKey: '#000000' 
  });

const result = await composer.transform(ffmpegModel);
```
```

## 📞 Support

For questions, issues, or contributions, please refer to:
- [Contributing Guide](./development/contributing.md)
- [Troubleshooting](./troubleshooting/common-issues.md)
- [GitHub Issues](https://github.com/your-repo/issues)

---

**Built with ❤️ for production-ready media transformation**
