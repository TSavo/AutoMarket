# Provider-Centric Organization

This directory organizes all provider-related components by **provider domain** within the Prizm SDK architecture. This makes development and maintenance much easier within the provider→model→transform pattern.

## Structure

```
providers/
├── elevenlabs/                 # Everything ElevenLabs TTS
│   ├── ElevenLabsProvider.ts           # Service management & factory
│   ├── ElevenLabsTextToAudioModel.ts   # Text-to-speech implementation
│   ├── ElevenLabsClient.ts             # API communication
│   └── index.ts                        # Clean exports
├── openrouter/                 # Everything OpenRouter
│   ├── OpenRouterProvider.ts           # Service management & factory
│   ├── OpenRouterTextToTextModel.ts    # Model implementations
│   ├── OpenRouterAPIClient.ts          # API communication
│   ├── OpenRouterProvider.test.ts      # Tests
│   └── index.ts                        # Clean exports
├── creatify/                   # Everything Creatify AI Avatars  
│   ├── CreatifyProvider.ts             # Service management & factory
│   ├── CreatifyTextToAudioModel.ts     # Avatar voice generation
│   ├── CreatifyTextToVideoModel.ts     # Avatar video generation
│   ├── CreatifyClient.ts               # API communication
│   └── index.ts                        # Clean exports
├── replicate/                  # Everything Replicate
│   ├── ReplicateProvider.ts
│   ├── ReplicateTextToImageModel.ts
│   ├── ReplicateTextToVideoModel.ts
│   ├── ReplicateTextToAudioModel.ts
│   ├── ReplicateClient.ts
│   └── index.ts
├── together/                   # Everything Together AI
│   ├── TogetherProvider.ts
│   ├── TogetherTextToImageModel.ts
│   ├── TogetherTextToAudioModel.ts
│   ├── TogetherAPIClient.ts
│   └── index.ts
└── docker/                     # Docker-based services
    ├── zonos/                  # Zonos voice cloning TTS
    ├── huggingface/            # HuggingFace models
    ├── chatterbox/             # Chatterbox TTS
    ├── whisper/                # Whisper STT
    └── ffmpeg/                 # FFMPEG processing
```

## Benefits

### 🎯 **Cohesive Development**
When working on OpenRouter integration, all related files are in `providers/openrouter/`:
- Provider logic
- Model implementations  
- API client
- Tests

### 🔧 **Easier Maintenance**
- API changes affect one directory
- Provider-specific patterns are co-located
- Clear ownership boundaries

### 📦 **Clean Imports**
```typescript
// Before (scattered)
import { OpenRouterProvider } from '../providers/OpenRouterProvider';
import { OpenRouterTextToTextModel } from '../models/providers/openrouter/OpenRouterTextToTextModel';
import { OpenRouterAPIClient } from '../clients/OpenRouterAPIClient';

// After (cohesive)
import { 
  OpenRouterProvider, 
  OpenRouterTextToTextModel, 
  OpenRouterAPIClient 
} from '../providers/openrouter';
```

### 🧠 **Better Mental Model**
Each provider directory is a **complete integration package**:
- Everything needed to use that provider
- Self-contained with clear boundaries
- Easy to understand and reason about

## Usage

```typescript
// Import everything from one provider
import { OpenRouterProvider, OpenRouterTextToTextModel } from './providers/openrouter';

// Or import from the main index for cross-provider usage
import { TextToTextProvider } from './capabilities';
```

## 🚀 Usage Examples

### ElevenLabs Text-to-Speech
```typescript
import { ElevenLabsProvider } from './elevenlabs';
import { Text } from '../assets/roles';

const provider = new ElevenLabsProvider();
await provider.configure({ apiKey: process.env.ELEVENLABS_API_KEY });

const model = await provider.createTextToAudioModel('voice-id');
const speech = await model.transform(Text.fromString("Hello world!"));
```

### Replicate Image Generation
```typescript
import { ReplicateProvider } from './replicate';
import { Text } from '../assets/roles';

const provider = new ReplicateProvider();
const model = await provider.createTextToImageModel('flux-schnell');
const image = await model.transform(Text.fromString("A beautiful sunset"));
```

### Zonos Voice Cloning
```typescript
import { ZonosDockerProvider } from './docker/zonos';
import { Text, Audio } from '../assets/roles';

const provider = new ZonosDockerProvider();
const model = await provider.createTextToAudioModel('zonos-tts');

const voiceSample = Audio.fromFile('./my-voice.wav');
const clonedSpeech = await model.transform(Text.fromString("Hello in my voice!"), {
  voiceToClone: voiceSample
});
```

This organization aligns with how developers actually think about and work with providers - as complete integration packages rather than scattered components.
