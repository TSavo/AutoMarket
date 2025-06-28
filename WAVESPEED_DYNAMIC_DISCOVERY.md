# WaveSpeedAI Dynamic Model Discovery Implementation

## Overview

This implementation adds dynamic model discovery capabilities to the WaveSpeedAI provider, following the same patterns used by other providers in the system that don't have direct `/models` endpoints (like Replicate and FalAI).

## Architecture

### 1. Model Discovery Strategy

Since WaveSpeedAI doesn't provide a `/models` endpoint, we use a **hybrid approach**:

1. **Documentation-based Discovery**: Use the comprehensive model list from WaveSpeedAI's API documentation as the source of truth
2. **AI-enhanced Categorization**: Optionally use OpenRouter's free models to enhance categorization and capabilities
3. **Intelligent Caching**: Cache discovered models with configurable TTL to avoid repeated discovery
4. **Graceful Fallback**: Fall back to hardcoded models if discovery fails

### 2. Key Components

#### WaveSpeedClient Enhancements

```typescript
interface WaveSpeedModelMetadata {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: Record<string, any>;
  capabilities: string[];
  tags: string[];
  pricing?: string;
  lastUpdated: number;
}
```

#### Discovery Methods

- **`discoverModels()`**: Main discovery orchestration with caching
- **`getDocumentedModels()`**: Extract from existing hardcoded model list
- **`categorizeModel()`**: Rule-based categorization from model ID/description
- **`enhanceModelWithAI()`**: AI-powered categorization using free OpenRouter models
- **`extractParameters()`**: Generate parameter schemas based on model type
- **`extractCapabilities()`**: Extract technical capabilities from model metadata
- **`extractTags()`**: Generate searchable tags from model information

### 3. Configuration

```typescript
const config: WaveSpeedConfig = {
  apiKey: 'your-wavespeed-key',
  discovery: {
    openRouterApiKey: 'optional-openrouter-key', // For AI enhancement
    cacheDir: './cache/wavespeed',              // Cache directory
    maxCacheAge: 24 * 60 * 60 * 1000           // 24 hours
  }
};
```

## Implementation Patterns

### 1. Following Existing Patterns

This implementation follows the same patterns used by:

- **Replicate**: Uses API + AI categorization + caching
- **FalAI**: Uses web scraping + AI enhancement + caching
- **Together**: Uses direct `/models` endpoint (for reference)

### 2. Cache-First Strategy

```typescript
// 1. Check cache first
const cached = await this.loadAllFromCache();
if (cached && cached.length > 0 && (Date.now() - cached[0].lastUpdated) < maxCacheAge) {
  return cached;
}

// 2. Cache miss - discover and cache
const models = await this.getDocumentedModels();
// ... enhance models ...
await this.saveAllToCache(enhancedModels);
```

### 3. AI Enhancement (Optional)

Uses **free** OpenRouter models only:

```typescript
model: 'deepseek/deepseek-chat:free', // FREE model only
messages: [
  {
    role: 'system',
    content: `Categorize this WaveSpeedAI model and extract capabilities...`
  },
  {
    role: 'user', 
    content: `Model: ${model.id}...`
  }
]
```

## Model Categorization

### Automatic Categorization Rules

```typescript
private categorizeModel(modelId: string, description: string): string {
  const id = modelId.toLowerCase();
  const desc = description.toLowerCase();

  if (id.includes('t2v') || desc.includes('text-to-video')) return 'text-to-video';
  if (id.includes('i2v') || desc.includes('image-to-video')) return 'image-to-video';
  if (id.includes('kontext') || desc.includes('image editing')) return 'image-to-image';
  if (id.includes('flux') || desc.includes('image generation')) return 'text-to-image';
  // ... more rules ...
  return 'other';
}
```

### Supported Categories

- `text-to-image` - FLUX models, HiDream, etc.
- `text-to-video` - WAN 2.1 T2V models
- `image-to-video` - WAN 2.1 I2V models
- `image-to-image` - FLUX Kontext models
- `video-to-video` - Video enhancement models
- `text-to-audio` - Audio generation models
- `image-to-3d` - 3D generation models

## Usage Examples

### 1. Basic Discovery

```typescript
const client = new WaveSpeedClient({
  apiKey: 'your-key'
});

const models = await client.discoverModels();
console.log(`Discovered ${models.length} models`);
```

### 2. With AI Enhancement

```typescript
const client = new WaveSpeedClient({
  apiKey: 'your-key',
  discovery: {
    openRouterApiKey: 'your-openrouter-key'
  }
});

const models = await client.discoverModels();
// Models will have AI-enhanced categorization
```

### 3. Provider Integration

```typescript
const provider = new WaveSpeedProvider();
await provider.configure({
  apiKey: 'your-key'
});

// Models are automatically discovered and cached
console.log(`Provider has ${provider.models.length} models`);
```

## Testing

Run the test script to verify the implementation:

```bash
# Set environment variables
export WAVESPEED_API_KEY="your-key"
export OPENROUTER_API_KEY="your-openrouter-key" # Optional

# Run the test
npx ts-node test-wavespeed-discovery.ts
```

## Benefits

1. **Dynamic**: Models are discovered from the latest documentation
2. **Intelligent**: AI-enhanced categorization and capabilities
3. **Performant**: Intelligent caching reduces API calls
4. **Resilient**: Graceful fallback to hardcoded models
5. **Consistent**: Follows established patterns from other providers
6. **Cost-effective**: Uses only free AI models for enhancement

## Future Enhancements

1. **Real-time Discovery**: Monitor WaveSpeedAI for new models
2. **Community Models**: Support for user-contributed model metadata
3. **Performance Metrics**: Track model performance and popularity
4. **Advanced Filtering**: Search and filter models by capabilities
5. **Model Versioning**: Track model updates and changelogs
