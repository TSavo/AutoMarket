# AutoMarket Media Creation Integration

This document describes the media creation tools copied from horizon-city-stories to AutoMarket.

## 🎯 What Was Copied

### Core Media Creation Tools
- **Image Generation** (Replicate API) - High-quality image generation from text prompts
- **Image Animation** (FAL.ai) - Convert static images into animated videos
- **Text-to-Speech** (Chatterbox TTS) - Convert text to natural-sounding speech
- **Speech-to-Text** (Whisper) - Transcribe audio files to text with high accuracy
- **Avatar Generation** (Creatify) - Generate video avatars from scripts
- **Media Ingest System** - Complete pipeline for processing uploaded media files

### Project Structure Added

```
src/lib/
├── media-creation/           # Main media creation tools
│   ├── index.ts             # Main API exports
│   ├── config.ts            # Configuration and paths
│   ├── types.ts             # TypeScript type definitions
│   ├── generate-image.ts    # Replicate image generation
│   ├── animate-image.ts     # FAL.ai animation
│   ├── generate-tts.ts      # TTS generation
│   ├── audio-processor.ts   # Audio processing pipeline
│   ├── image-processor.ts   # Image processing pipeline
│   ├── text-sanitizer.ts    # Text cleanup for TTS
│   ├── utils.ts             # Utility functions
│   ├── process-blog-post.ts # Blog post processing
│   ├── WhisperSTTService.ts # Whisper speech-to-text service
│   └── STTService.ts        # STT service types and interfaces
├── animation/               # Animation generation tools
│   ├── core/                # Core animation utilities
│   ├── blog/                # Blog-specific animations
│   └── utils/               # Animation utilities
└── media-ingest/            # Complete media ingest system
    ├── MediaIngestService.ts # Main ingest orchestrator
    ├── WhisperSTTService.ts  # Whisper STT integration
    ├── FFMPEGVideoDiscovery.ts # Video metadata extraction
    ├── FFMPEGAudioDiscovery.ts # Audio metadata extraction
    └── types.ts             # Ingest system types
```

## 🔧 Services Integration

### 1. Replicate (Image Generation)
- **Model**: black-forest-labs/flux-1.1-pro-ultra
- **Features**: High-quality image generation, aspect ratio control, negative prompts
- **Usage**: Generate marketing images, product visuals, concept art

### 2. FAL.ai (Animation)
- **Features**: Image-to-video animation, customizable FPS and duration
- **Usage**: Animate product images, create engaging video content

### 3. Chatterbox TTS (Text-to-Speech)
- **Features**: Natural voice synthesis, multiple providers, voice cloning
- **Usage**: Create audio content, voiceovers, accessibility features

### 4. Whisper (Speech-to-Text)
- **Model**: OpenAI Whisper via Docker container
- **Features**: High-accuracy transcription, multi-language support, word timestamps
- **Docker Setup**: `docker run -d -p 9000:9000 onerahmet/openai-whisper-asr-webservice:latest`
- **Usage**: Transcribe audio files, extract subtitles, accessibility features

### 5. Media Ingest System
- **Features**: Automatic metadata extraction, file processing, asset management
- **Integrations**: FFMPEG for media analysis, Whisper for audio transcription
- **Usage**: Process uploaded files, extract metadata, generate derivatives

## 🛠️ Environment Setup

### Required Environment Variables

```bash
# Image Generation
REPLICATE_API_TOKEN=your_replicate_token

# Animation
FALAI_API_KEY=your_falai_key

# TTS Configuration
TTS_ENABLED=true
TTS_PROVIDER=auto
CHATTERBOX_DOCKER_URL=http://localhost:8004

# Creatify
CREATIFY_API_ID=your_creatify_id
CREATIFY_API_KEY=your_creatify_key
NEXT_PUBLIC_CREATIFY_API_ID=your_creatify_id
NEXT_PUBLIC_CREATIFY_API_KEY=your_creatify_key
```

## 📋 Testing

### Test Interface
Access the media creation test interface at: `/media-test`

The test page allows you to:
1. Generate images from text prompts
2. Animate the generated images
3. Convert text to speech
4. View all generated media results

### API Endpoints (Need to be Created)
- `POST /api/media/generate-image` - Image generation
- `POST /api/media/animate-image` - Image animation  
- `POST /api/media/generate-tts` - Text-to-speech
- `POST /api/media/transcribe-audio` - Speech-to-text transcription
- `POST /api/media/ingest` - Media file ingestion and processing

## 🚀 Usage Examples

### Generate an Image
```typescript
import { generateImage } from '@/src/lib/media-creation';

const result = await generateImage(
  "A futuristic car in a cyberpunk city",
  "/path/to/output.png",
  {
    width: 1024,
    height: 1024,
    aspectRatio: "1:1"
  }
);
```

### Animate an Image
```typescript
import { animateImage } from '@/src/lib/media-creation';

const result = await animateImage(
  "/path/to/image.png",
  "The car drives through the neon-lit streets",
  {
    fps: 30,
    numFrames: 60
  }
);
```

### Transcribe Audio
```typescript
import { whisperSTTService } from '@/src/lib/media-creation';

const result = await whisperSTTService.transcribeAudio(
  "/path/to/audio.mp3",
  {
    language: 'en',
    task: 'transcribe',
    word_timestamps: true
  }
);

if (result.success) {
  console.log('Transcript:', result.text);
  console.log('Confidence:', result.confidence);
  console.log('Language:', result.language);
}
```

### Process Media File
```typescript
import { mediaIngestService } from '@/src/lib/media-ingest';

// Initialize the service
await mediaIngestService.initialize();

// Ingest a video file (automatically extracts metadata and transcribes audio)
const result = await mediaIngestService.ingestFile(
  "/path/to/video.mp4",
  {
    generateId: true,
    extractTags: true
  }
);

if (result.success && result.asset) {
  console.log('Asset ID:', result.asset.id);
  console.log('Duration:', result.asset.duration);
  console.log('Has Transcript:', result.asset.hasTranscript);
}
```

## 📦 Dependencies Added

The following packages were already included in AutoMarket:
- `@fal-ai/client` - FAL.ai integration
- `replicate` - Replicate API client
- `@tsavo/creatify-api-ts` - Creatify integration
- `axios` - HTTP client
- `sharp` - Image processing
- `dotenv` - Environment variables
- `gray-matter` - Markdown frontmatter parsing

## 🎯 Next Steps

1. **Create API Routes**: Implement the API endpoints for media generation
2. **Configure APIs**: Set up API keys for all services
3. **Test Integration**: Use the test interface to verify functionality
4. **Extend Features**: Add more advanced media creation workflows
5. **Optimize Performance**: Implement caching and background processing

## 🔗 Related Files

- `pages/media-test.tsx` - Test interface for media creation
- `.env.example` - Environment variable examples
- `src/lib/media-creation/index.ts` - Main API entry point

## 📚 Documentation

- [Replicate API Documentation](https://replicate.com/docs)
- [FAL.ai Documentation](https://fal.ai/docs)
- [Creatify API Documentation](https://creatify.ai/docs)
- Original implementation: `horizon-city-stories/scripts/blog/`
