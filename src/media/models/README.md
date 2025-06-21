# Models Directory Organization

This directory has been reorganized for better maintainability and scalability. The new structure separates abstract interfaces from concrete implementations and groups models by provider.

## Directory Structure

```
src/media/models/
├── abstracts/                    # Abstract base classes and interfaces
│   ├── Model.ts                  # Root abstract base class
│   ├── TextToImageModel.ts       # Text-to-image transformation interface
│   ├── TextToAudioModel.ts       # Text-to-audio (TTS) transformation interface
│   ├── TextToVideoModel.ts       # Text-to-video transformation interface
│   ├── TextToTextModel.ts        # Text-to-text (LLM) transformation interface
│   ├── AudioToTextModel.ts       # Audio-to-text (STT) transformation interface
│   ├── ImageToVideoModel.ts      # Image-to-video transformation interface
│   ├── VideoToAudioModel.ts      # Video-to-audio extraction interface
│   ├── VideoToVideoModel.ts      # Video composition/overlay interface
│   └── index.ts                  # Re-exports all abstract interfaces
│
├── providers/                    # Provider-specific implementations
│   ├── replicate/                # Replicate API models
│   │   ├── ReplicateTextToImageModel.ts
│   │   ├── ReplicateTextToAudioModel.ts
│   │   ├── ReplicateTextToVideoModel.ts
│   │   └── index.ts              # Re-exports Replicate models
│   │
│   ├── together/                 # Together AI models
│   │   ├── TogetherTextToImageModel.ts
│   │   ├── TogetherTextToAudioModel.ts
│   │   ├── TogetherTextToTextModel.ts
│   │   └── index.ts              # Re-exports Together models
│   │
│   ├── openrouter/               # OpenRouter API models
│   │   ├── OpenRouterTextToTextModel.ts
│   │   └── index.ts              # Re-exports OpenRouter models
│   │
│   ├── docker/                   # Local Docker-based services
│   │   ├── chatterbox/           # Chatterbox TTS service
│   │   │   ├── ChatterboxTTSModel.ts
│   │   │   ├── ChatterboxDockerModel.ts
│   │   │   └── index.ts
│   │   ├── whisper/              # Whisper STT service
│   │   │   ├── WhisperSTTModel.ts
│   │   │   ├── WhisperDockerModel.ts
│   │   │   └── index.ts
│   │   ├── ffmpeg/               # FFMPEG service
│   │   │   ├── FFMPEGDockerModel.ts
│   │   │   ├── FFMPEGVideoFilterModel.ts
│   │   │   └── index.ts
│   │   └── index.ts              # Re-exports all Docker models
│   │
│   └── index.ts                  # Re-exports all provider models
│
├── shared/                       # Shared types and utilities
│   ├── Audio.ts                  # Shared audio types
│   └── index.ts                  # Re-exports shared utilities
│
└── index.ts                      # Main entry point with backward compatibility
```

## Key Benefits

### 1. **Clear Separation of Concerns**
- **Abstracts**: Define interfaces and contracts
- **Providers**: Implement provider-specific logic
- **Shared**: Common utilities used across models

### 2. **Provider Grouping**
Models are organized by their provider/service:
- **Remote APIs**: Replicate, Together, OpenRouter
- **Local Docker Services**: Chatterbox, Whisper, FFMPEG

### 3. **Backward Compatibility**
The main `index.ts` re-exports everything at the root level, so existing imports continue to work:

```typescript
// These still work unchanged:
import { ReplicateTextToImageModel } from '../models';
import { TogetherTextToImageModel } from '../models';
import { ChatterboxTTSModel } from '../models';
```

### 4. **Flexible Import Options**
You can now import more specifically if desired:

```typescript
// Import from specific provider
import { ReplicateTextToImageModel } from '../models/providers/replicate';

// Import specific abstracts
import { TextToImageModel } from '../models/abstracts';

// Import all models from a provider
import * as ReplicateModels from '../models/providers/replicate';
```

## Adding New Models

### For a New Provider
1. Create a new directory under `providers/`
2. Add your model implementations
3. Create an `index.ts` that re-exports your models
4. Update `providers/index.ts` to include your new provider
5. Update the main `index.ts` for backward compatibility

### For an Existing Provider
1. Add your model file to the appropriate provider directory
2. Update the provider's `index.ts` to re-export your model
3. Update the main `index.ts` for backward compatibility

### For a New Abstract Interface
1. Add your abstract model to `abstracts/`
2. Update `abstracts/index.ts` to re-export it
3. Implement concrete models in appropriate provider directories

## Migration Notes

- All import paths have been updated automatically
- No changes needed to existing code that imports from the main models directory
- The reorganization is transparent to external consumers
- All functionality remains exactly the same

This organization scales well as you add more providers (FAL.ai, Anthropic, etc.) and makes the codebase much easier to navigate and maintain.
