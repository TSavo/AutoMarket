# 🚀 Prizm - The Ultimate AI Media Processing Platform

The most advanced multi-provider AI media processing platform ever built! Prizm unifies 15+ AI providers, supports 500+ models, and features **Universal Role Compatibility** - where ANY asset can be input to ANY model through automatic conversions.

## 🔥 **Universal Role Compatibility - GAME CHANGER**

**The breakthrough feature that changes everything:** Any asset can be input to any model through automatic provider-based conversions.

```typescript
// ✨ Text → Image → Video pipeline (automatically!)
const textAsset = TextAsset.fromString("A sunset over mountains");
const video = await imageToVideoModel.transform(textAsset);
// Behind the scenes: Text →(DALL-E)→ Image →(Runway)→ Video

// ✨ Video → Audio extraction (automatically!)  
const videoAsset = VideoAsset.fromFile('movie.mp4');
const audio = await audioModel.transform(videoAsset);
// Behind the scenes: Video →(FFmpeg)→ Audio

// ✨ Audio → Text transcription (automatically!)
const audioAsset = AudioAsset.fromFile('speech.wav');
const transcript = await textModel.transform(audioAsset);
// Behind the scenes: Audio →(Whisper)→ Text

// 🎯 The magic: inputAsset.asRole(RequiredType)
```

**Benefits:**
- 🌍 **Universal Input**: ANY asset → ANY model
- 🔄 **Automatic Pipelines**: Complex workflows become simple
- 🛡️ **Type Safe**: Full TypeScript support  
- 🚀 **Future Proof**: New providers enhance ALL assets
- 🎨 **Composable**: Chain any transformations seamlessly

## ⚡ **One-Line Magic**
```typescript
// NEW: Single await - ultra clean!
const image = await $$("replicate")("flux-schnell")("A majestic dragon");
const speech = await $$("elevenlabs")("voice-id")("Hello world!");

// LEGACY: Double await - still works
const image = await (await $("replicate")("flux-schnell"))("A majestic dragon");
const speech = await (await $("elevenlabs")("voice-id"))("Hello world!");

// Core SDK - maximum control  
const registry = ProviderRegistry.getInstance();
const provider = await registry.getProvider('elevenlabs');
const model = await provider.createTextToAudioModel('voice-id');
const result = await model.transform(Text.fromString(input), options);

// REST API - language agnostic
POST /api/v1/transform/elevenlabs/voice-id
{ capability: 'text-to-audio', input: 'Hello world!' }
```

## 🏗️ **Layered Architecture**

**Prizm provides the unified platform to make it happen!**

1. **Core SDK** - provider→model→transform foundation
2. **Fluent API** - zero-config one-liners: `$("provider")("model")(input)`
3. **REST API** - language-agnostic HTTP interface  
4. **Job System** - async workflows with generation chains
5. **Smart Assets** - format-agnostic loading with auto-detection
6. **Asset Utilities** - rich helper methods for manipulation
7. **Type Guards** - runtime safety and role checking
8. **Provider Utils** - discovery and health management
9. **Job Management** - complete workflow orchestration
10. **Format Registry** - extensible format detection system

## 🎯 **Target Users**

- **AI Agent Frameworks** (LangChain, AutoGen, custom agents)
- **Multi-modal Applications** requiring consistent media transformation
- **Workflow Orchestrators** needing reliable media processing
- **Developer Tools** that want to add media capabilities  
- **Production Applications** requiring enterprise-grade media infrastructure

## 🌟 **World-Class Features**

- 🔌 **15+ AI Providers**: FAL.ai, Replicate, Together.ai, OpenRouter, HuggingFace, OpenAI + Local Docker Services
- 🧠 **500+ AI Models**: Access any model through unified interfaces with dynamic discovery
- 🎨 **Smart Asset System**: Load any format, get the right capabilities automatically
- 🐳 **Docker Services**: Local FFMPEG, Chatterbox TTS, Whisper STT for privacy and control
- 🔄 **Job System**: Async processing with complete generation chain tracking
- 💰 **Cost Optimization**: Automatic free model detection and intelligent provider selection
- 🛡️ **Enterprise Ready**: Auto-scaling, failover, load balancing, comprehensive testing
- 📱 **Language Agnostic**: REST API works with any programming language

## 🚀 Quick Start

### 1. Core SDK Usage
```typescript
import { ProviderRegistry, Text } from 'prizm';

const registry = ProviderRegistry.getInstance();
const provider = await registry.getProvider('elevenlabs');
const model = await provider.createTextToAudioModel('voice-id');
const result = await model.transform(Text.fromString("Hello world!"), options);
```

### 2. Fluent API (Zero Config)
```typescript
import { $$ } from 'prizm';

// NEW: Single await pattern (cleanest)
const speech = await $$("elevenlabs")("voice-id")("Hello world!");
const image = await $$("replicate")("flux-schnell")("A beautiful sunset");
const video = await $$("runway")("gen-3")("Dancing robot", { duration: 5 });

// LEGACY: Double await pattern (still works)
const speechLegacy = await (await $("elevenlabs")("voice-id"))("Hello world!");
```

### 3. Smart Asset Loading
```typescript
import { AssetLoader } from 'prizm';

const asset = AssetLoader.load('video.mp4');  // Auto-detects format + roles
const video = await asset.asVideo();           // Type-safe video access
const audio = await asset.extractAudio();     // FFmpeg integration
```

### 4. REST API (Any Language)
```bash
# Start the server
npm install && npm run dev

# Make requests from any language
curl -X POST http://localhost:3000/api/v1/transform/replicate/flux-schnell \
  -H "Content-Type: application/json" \
  -d '{"capability": "text-to-image", "input": "A majestic dragon"}'
```

## 🏗️ **Prizm SDK Architecture**

### **Layer 1: Core SDK** (Maximum Control)
```typescript
// Full control over every aspect
const registry = ProviderRegistry.getInstance();
const provider = await registry.getProvider('replicate');
const models = provider.getModelsForCapability('text-to-image');
const model = await provider.getModel('flux-schnell');
const result = await model.transform(input, { steps: 4, aspect_ratio: "16:9" });
```

### **Layer 2: Smart Asset System** (Format-Agnostic)
```typescript
// Zero-config asset loading with auto-detection
const asset = AssetLoader.load('video.mp4');  // Auto-detects: Video + Audio + Speech
const formatInfo = AssetLoader.getFormatInfo('video.mp4');
const canDoSpeech = AssetLoader.supportsRoles('video.mp4', ['speech']);
```

### **Layer 3: Job System** (Production Workflows)
```typescript
// Async processing with generation chains
const { jobId } = await fetch('/api/v1/transform/replicate/flux-schnell', {
  method: 'POST',
  body: JSON.stringify({ capability: 'text-to-image', input: 'Dragon' })
});
const result = await pollJobUntilComplete(jobId);
```

## 📁 Prizm SDK Structure

```
src/
├── media/                     # Core Prizm SDK
│   ├── registry/             # Provider registry and bootstrapping
│   ├── providers/            # Provider implementations
│   │   ├── elevenlabs/      # ElevenLabs TTS provider package
│   │   ├── falai/           # FAL.ai provider package
│   │   ├── replicate/       # Replicate provider package
│   │   ├── together/        # Together.ai provider package
│   │   ├── openrouter/      # OpenRouter provider package
│   │   ├── creatify/        # Creatify AI avatar provider package
│   │   └── docker/          # Docker-based local providers
│   │       ├── zonos/       # Zonos TTS voice cloning
│   │       ├── huggingface/ # HuggingFace models
│   │       ├── chatterbox/  # Chatterbox TTS
│   │       └── ffmpeg/      # FFMPEG processing
│   ├── assets/              # Smart asset loading system
│   │   ├── roles/           # Role-based asset classes (Audio, Video, Text, Image)
│   │   ├── mixins/          # Role mixin implementations
│   │   └── SmartAssetFactory.ts  # Format-agnostic asset loading
│   ├── fluent/              # Fluent API ($("provider")("model") syntax)
│   ├── capabilities/        # Provider capability system
│   ├── models/              # Model abstractions and implementations
│   └── types/               # TypeScript type definitions
├── app/api/v1/              # REST API endpoints
│   ├── transform/           # Transformation endpoints
│   ├── jobs/                # Job management system
│   ├── providers/           # Provider discovery endpoints
│   └── capabilities/        # Capability listing endpoints
└── services/                # Base Docker service management

services/                    # Docker service configurations
├── ffmpeg/                 # FFMPEG video processing service
├── chatterbox/             # Text-to-speech service
└── whisper/                # Speech-to-text service
```

## 📦 **Installation & Setup**

### NPM Package (Coming Soon)
```bash
npm install prizm
```

### Development Setup
```bash
git clone https://github.com/your-org/prizm
cd prizm
npm install
npm run dev
```

## 🔧 Environment Configuration

```bash
# API Provider Keys (add the ones you want to use)
FALAI_API_KEY=your_fal_ai_key
REPLICATE_API_TOKEN=your_replicate_token
OPENROUTER_API_KEY=your_openrouter_key

# Docker Service URLs (optional - for local services)
FFMPEG_SERVICE_URL=http://localhost:8006
CHATTERBOX_DOCKER_URL=http://localhost:8004
WHISPER_SERVICE_URL=http://localhost:9000
```

## 📚 **Documentation**

### **Getting Started**
- [Quick Start Guide](docs/getting-started/quick-start.md) - Set up and first transformation
- [ElevenLabs Integration](docs/providers/ELEVENLABS_GUIDE.md) - Premium text-to-speech setup
- [TypeScript Migration Guide](docs/TYPESCRIPT_MIGRATION_GUIDE.md) - Fix common issues

### **API References**  
- [Fluent API Complete Reference](docs/FLUENT_API_REFERENCE.md) - All syntax patterns
- [Provider Documentation](src/media/providers/README.md) - Provider-specific guides
- [Asset Roles](src/media/assets/roles/README.md) - Working with media assets

### **Implementation Guides**
- [HuggingFace TextToAudio Implementation](HUGGINGFACE_TEXTTOAUDIO_IMPLEMENTATION.md)
- [Zonos Docker Integration](ZONOS_DOCKER_INTEGRATION.md) 
- [FFMPEG Refactoring Success](FFMPEG_REFACTORING_SUCCESS.md)

### 🏗️ **Architecture & Development**
- [🔌 Provider Registry Deep Dive](./docs/architecture/provider-registry.md) - Centralized provider management
- [🧠 Model Discovery Deep Dive](./docs/architecture/model-discovery.md) - How models are dynamically discovered
- [🎨 Asset & Role System Architecture](./docs/architecture/asset-system.md) - Smart asset loading and roles
- [🎬 Video Composition](./N-VIDEO-COMPOSITION-ENHANCEMENT.md) - Advanced video composition
- [🧪 Testing Guide](./docs/development/testing.md) - Comprehensive testing strategy
- [🔧 Environment Configuration Guide](./docs/development/environment-configuration.md) - Setting up environment variables
- [📡 API Reference](./docs/api/) - Complete REST API documentation

### 🎪 **Epic Examples**

#### � **AI Agent Integration**
```typescript
// LangChain agent using Prizm for media capabilities
import { ProviderRegistry } from 'prizm';

class MediaCapableAgent extends Agent {
  constructor() {
    super();
    this.registry = ProviderRegistry.getInstance();
  }
  
  async createMarketingCampaign(description: string) {
    // Generate copy
    const copy = await this.generateCopy(description);
    
    // Create visuals with Prizm
    const provider = await this.registry.getProvider('replicate');
    const model = await provider.getModel('flux-pro');
    const heroImage = await model.transform(copy, { aspect_ratio: "16:9" });
    
    return { copy, heroImage };
  }
}
```

#### 🌈 **Ultimate Marketing Pipeline**
```typescript
// Script → Images → Animation → Voiceover → Composition
const script = await $("openrouter")("deepseek/deepseek-chat:free")("Write epic marketing script");
const visuals = await $("replicate")("flux-pro")(script);
const animation = await $("runway")("gen-3")(visuals, { duration: 5 });
const voiceover = await $("chatterbox")("voice-clone")(script);
const final = await $("ffmpeg")("compose")([animation, voiceover]);
```

#### 🎨 **Smart Asset Processing**
```typescript
// Load any format, get all capabilities automatically
const asset = AssetLoader.load('mystery-file.???');  // Works with ANY format!

if (hasVideoRole(asset)) {
  const video = await asset.asVideo();
  const thumbnail = await asset.extractFrame(1.0);
}

if (hasAudioRole(asset)) {
  const audio = await asset.asAudio();
  const transcript = await asset.transcribe();
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Test specific components
npm run test:providers   # Test provider integrations
npm run test:assets     # Test asset loading system
npm run test:api        # Test REST API endpoints
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Star History

⭐ **Star this repo** if Prizm helps your project!

[![Star History Chart](https://api.star-history.com/svg?repos=your-org/prizm&type=Date)](https://star-history.com/#your-org/prizm&Date)

---

**Built with ❤️ by the Prizm Team**

*Making AI media transformation as simple as one line of code.*
```bash
# Test video composition
npm run test:composition

# Test provider functionality  
npm run test:providers

# Test asset loading
npm run test:assets
```

## 🐳 Docker Services (Docker Compose Only)

Prizm now manages local Docker services purely via Docker Compose. You no longer need to manually `cd` into service directories and run `docker-compose up`. The `ServiceRegistry` handles this dynamically when a `MediaProvider` requests a service.

For development, ensure Docker is running and the necessary Docker Compose files are available (e.g., in the `services/` directory).
