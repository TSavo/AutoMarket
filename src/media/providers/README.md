# Provider-Centric Organization

This directory organizes all provider-related components by **provider domain** rather than by component type. This makes development and maintenance much easier.

## Structure

```
providers/
├── openrouter/                 # Everything OpenRouter
│   ├── OpenRouterProvider.ts           # Service management & factory
│   ├── OpenRouterTextToTextModel.ts    # Model implementations
│   ├── OpenRouterAPIClient.ts          # API communication
│   ├── OpenRouterProvider.test.ts      # Tests
│   └── index.ts                        # Clean exports
├── replicate/                  # Everything Replicate
│   ├── ReplicateProvider.ts
│   ├── ReplicateTextToImageModel.ts
│   ├── ReplicateTextToVideoModel.ts
│   ├── ReplicateClient.ts
│   └── index.ts
├── together/                   # Everything Together AI
│   ├── TogetherProvider.ts
│   ├── TogetherTextToImageModel.ts
│   ├── TogetherAPIClient.ts
│   └── index.ts
└── docker/                     # Docker-based services
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

This organization aligns with how developers actually think about and work with providers - as complete integration packages rather than scattered components.
