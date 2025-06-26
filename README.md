# 🚀 AutoMarket - The Ultimate AI Media Processing Platform

The most advanced multi-provider AI media processing platform ever built! AutoMarket unifies 15+ AI providers, supports 500+ models, and makes complex media pipelines as simple as one line of code.

## ⚡ **One-Line Magic**
```typescript
// Generate epic video with multiple AI providers in one line!
const epic = await new FFMPEGCompositionBuilder()
  .compose(await (await new FalAiProvider().createTextToVideoModel()).transform('Dragon flying'))
  .addOverlay(await (await new ReplicateProvider().createTextToImageModel()).transform('Glowing logo'))
  .transform(ffmpegModel);
```

## 🌟 **World-Class Features**

- 🔌 **15+ AI Providers**: FAL.ai, Replicate, Together.ai, OpenRouter, HuggingFace, OpenAI, Anthropic, Google Gemini, xAI, Mistral, Azure OpenAI + Local Docker Services
- 🧠 **500+ AI Models**: Access any model through unified interfaces with dynamic discovery
- 🎬 **Hollywood-Level Video Composition**: N-video composition with overlays, green screen, professional effects
- 🎨 **Smart Asset System**: Load any format, get the right capabilities automatically
- 🐳 **Docker Services**: Local FFMPEG, Chatterbox TTS, Whisper STT for privacy and control
- 🔄 **Real-Time Processing**: Progress tracking, streaming, collaborative editing
- 💰 **Cost Optimization**: Automatic free model detection and intelligent provider selection
- 🛡️ **Enterprise Ready**: Auto-scaling, failover, load balancing, comprehensive testing

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
- **Remote Providers**: FAL.ai, Replicate, Together.ai, OpenRouter, OpenAI, Anthropic, Google Gemini, xAI, Mistral, Azure OpenAI
- **Local Providers**: FFMPEG, Chatterbox TTS, Whisper STT (Docker-based)

## 📁 Project Structure

```
src/
├── media/                     # Main media processing system
│   ├── assets/               # Smart asset loading and roles
│   │   ├── roles/           # Role-based asset classes
│   │   ├── mixins/          # Role mixin implementations
│   │   └── SmartAssetFactory.ts
│   ├── providers/            # Provider implementations
│   │   ├── falai/           # FAL.ai provider package
│   │   ├── replicate/       # Replicate provider package
│   │   ├── together/        # Together.ai provider package
│   │   ├── openrouter/      # OpenRouter provider package
│   │   └── docker/          # Docker-based providers
│   │       ├── ffmpeg/      # FFMPEG video processing
│   │       ├── chatterbox/  # TTS services
│   │       └── whisper/     # STT services
│   ├── capabilities/        # Provider capability system
│   ├── models/              # Model implementations (backward compatibility)
│   └── types/               # TypeScript type definitions
├── services/                # Base Docker service management
└── components/              # React components (frontend)

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
HUGGINGFACE_SERVICE_URL=http://localhost:8007
```

## 📚 **World-Class Documentation**

### 🎯 **Quick Start & Examples**
- [⚡ One-Liner Magic](./docs/ONE_LINER_MAGIC.md) - Generate content with single lines of code
- [🚀 Awesome Examples](./docs/AWESOME_EXAMPLES.md) - Epic multi-provider pipelines & use cases
- [🌟 Provider Showcase](./docs/PROVIDER_SHOWCASE.md) - Advanced multi-provider examples
- [🛠️ Extending Platform](./docs/EXTENDING_PLATFORM.md) - Add new providers, models & services

### 🏗️ **Architecture & Development**
- [📖 Getting Started Guide](./docs/getting-started/quick-start-new.md) - Complete setup and first steps
- [🔌 Provider System](./docs/architecture/provider-system.md) - Multi-provider architecture
- [🎨 Asset System](./docs/architecture/asset-system.md) - Smart asset loading and roles
- [🎬 Video Composition](./N-VIDEO-COMPOSITION-ENHANCEMENT.md) - Advanced video composition

### 🎪 **Cool Pipeline Examples**

#### 🌈 **Ultimate Marketing Video (5 AI Providers)**
```typescript
// Script → Images → Animation → Voiceover → Composition
const script = await openRouter.createTextToTextModel('deepseek/deepseek-chat:free').then(m => m.transform('Write epic script'));
const visuals = await falAi.createTextToImageModel('flux-pro').then(m => m.transform(script));
const animation = await replicate.createImageToVideoModel('runway-gen3').then(m => m.transform(visuals));
const voiceover = await together.createTextToAudioModel().then(m => m.transform(script));
const final = await new FFMPEGCompositionBuilder().compose(animation).addAudioTrack(voiceover).transform(ffmpegModel);
```

#### 🎨 **Smart Asset Processing**
```typescript
// Load any format, get all capabilities automatically
const asset = AssetLoader.load('mystery-file.???');  // Works with ANY format!
const video = await asset.asVideo();        // Direct video access
const audio = await asset.asAudio();        // Auto-extract with FFmpeg
const transcript = await asset.asSpeech().transcribe();  // Auto-transcribe
```

#### 🌍 **Multi-Language Content Factory**
```typescript
// Generate content in 5 languages using different providers
const languages = ['English', 'Spanish', 'French', 'German', 'Japanese'];
const globalContent = await Promise.all(languages.map(async lang => ({
  script: await openRouter.createTextToTextModel().transform(`Product description in ${lang}`),
  visual: await falAi.createTextToImageModel().transform(`Professional ${lang} market imagery`),
  voice: await together.createTextToAudioModel().transform(script, { language: lang })
})));
```

#### 🎭 **Hollywood-Level Green Screen**
```typescript
// Professional compositing with multiple layers
const epic = await new FFMPEGCompositionBuilder()
  .compose(backgroundPlate)
  .addOverlay(greenScreenActor, { 
    colorKey: '#00FF00', 
    colorKeySimilarity: 0.4,
    colorKeyBlend: 0.1 
  })
  .addOverlay(vfxLayer, { blendMode: 'screen', opacity: 0.8 })
  .addOverlay(lightingEffects, { blendMode: 'overlay' })
  .transform(ffmpegModel);
```

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

# Start HuggingFace Text-to-Image service
cd services/huggingface && docker-compose up -d
```
