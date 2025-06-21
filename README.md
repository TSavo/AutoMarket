# AutoMarket Media Processing Platform

A comprehensive media processing platform with multi-provider support, smart asset management, and advanced video composition capabilities.

## 🎯 Features

- **Multi-Provider Architecture**: Unified interface for FAL.ai, Replicate, Together.ai, OpenRouter
- **Smart Asset System**: Format-agnostic loading with automatic role detection
- **Advanced Video Composition**: N-video composition with overlays, concatenation, green screen
- **Docker Services**: Local FFMPEG, Chatterbox TTS, Whisper STT services
- **Dynamic Model Discovery**: Automatic discovery of available models from providers
- **Type-Safe Development**: Full TypeScript support with comprehensive validation

## 🚀 Quick Start

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
# Add your API keys for providers you want to use
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠️ Architecture

### Core Components
- **Provider System**: Unified MediaProvider interface for all providers
- **Asset Loader**: Smart asset loading with role-based transformations
- **Video Composition Builder**: Advanced FFMPEG-based video composition
- **Docker Service Management**: Local service lifecycle management

### Provider Ecosystem
- **Remote Providers**: FAL.ai, Replicate, Together.ai, OpenRouter
- **Local Providers**: FFMPEG, Chatterbox TTS, Whisper STT (Docker-based)

## 📁 Project Structure

```
src/
├── media/                     # Main media processing system
│   ├── assets/               # Smart asset loading and roles
│   ├── providers/            # Provider implementations
│   │   ├── falai/           # FAL.ai provider
│   │   ├── replicate/       # Replicate provider
│   │   ├── together/        # Together.ai provider
│   │   ├── openrouter/      # OpenRouter provider
│   │   └── docker/          # Docker-based providers
│   │       ├── ffmpeg/      # FFMPEG video processing
│   │       ├── chatterbox/  # TTS services
│   │       └── whisper/     # STT services
│   ├── models/              # Model implementations
│   └── types/               # TypeScript type definitions
└── services/                # Base Docker service management

services/                    # Docker service configurations
├── ffmpeg/                 # FFMPEG Docker setup
├── chatterbox/             # TTS Docker setup
└── whisper/                # STT Docker setup
```

## 🔧 Environment Configuration

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

## 📚 Usage Examples

### Basic Provider Usage
```typescript
import { FalAiProvider } from './src/media/providers/falai';

const provider = new FalAiProvider();
await provider.configure({ apiKey: process.env.FALAI_API_KEY });

const textToImageModel = await provider.createTextToImageModel('fal-ai/flux-pro');
const image = await textToImageModel.transform(textInput);
```

### Smart Asset Loading
```typescript
import { AssetLoader } from './src/media/assets/SmartAssetFactory';

const videoAsset = AssetLoader.load('video.mp4');  // Auto-detects format and roles
const audio = await videoAsset.asAudio();          // Extract audio via FFMPEG
const video = await videoAsset.asVideo();          // Access video directly
```

### Video Composition
```typescript
import { FFMPEGCompositionBuilder } from './src/media/providers/docker/ffmpeg';

const composer = new FFMPEGCompositionBuilder()
  .prepend(introVideo)                    // Add intro
  .compose(mainVideo)                     // Main content
  .append(outroVideo)                     // Add outro
  .addOverlay(logoVideo, {               // Logo overlay
    position: 'top-right',
    opacity: 0.8,
    width: '20%',
    colorKey: '#000000'                   // Remove black background
  });

const finalVideo = await composer.transform(ffmpegModel);
```

## 📖 Documentation

- [Provider Architecture](./src/media/providers/README.md) - Detailed provider system documentation
- [Asset System](./src/media/assets/roles/README.md) - Smart asset loading and role system
- [Video Composition](./COMPOSITION_BUILDER_REFACTORING.md) - Video composition capabilities
- [FAL.ai Implementation](./FALAI_IMPLEMENTATION_SUMMARY.md) - FAL.ai provider details
- [Architecture Overview](./.taskmaster/docs/prd.txt) - Complete system architecture

## 🧪 Testing

Run tests for specific components:
```bash
# Test video composition
npm run test:composition

# Test provider functionality  
npm run test:providers

# Test asset loading
npm run test:assets
```

## 🐳 Docker Services

Start required Docker services:
```bash
# Start FFMPEG service
cd services/ffmpeg && docker-compose up -d

# Start Chatterbox TTS service
cd services/chatterbox && docker-compose up -d

# Start Whisper STT service  
cd services/whisper && docker-compose up -d
```
