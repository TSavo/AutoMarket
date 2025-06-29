# asRole<T>() Universal Role Transformation Documentation

## Overview

The `asRole<T>()` method is a universal role transformation method that replaces all individual role methods (`asText()`, `asAudio()`, `asVideo()`, `asImage()`) with a unified, type-safe approach using TypeScript generics.

## Method Signature

```typescript
async asRole<T extends Audio | Video | Text | Image>(
  targetType: new (...args: any[]) => T,
  modelId?: string
): Promise<T>
```

### Parameters

- **`targetType`**: Constructor function for the target role class (Audio, Video, Text, or Image)
- **`modelId`**: Optional model ID for provider selection (defaults to 'default')

### Returns

- **`Promise<T>`**: Promise resolving to an instance of the target role type

## Usage Examples

### Basic Role Transformations

```typescript
import { AssetLoader, Audio, Video, Text, Image } from './media/assets';

// Load any media asset
const videoAsset = AssetLoader.load('movie.mp4');

// Convert to different roles using the unified pattern
const audio = await videoAsset.asRole(Audio);           // Extract audio from video
const transcript = await videoAsset.asRole(Text);       // Extract speech as text  
const thumbnail = await videoAsset.asRole(Image);       // Extract frame as image

const textAsset = AssetLoader.load('script.txt');
const speech = await textAsset.asRole(Audio);           // Text-to-speech
const video = await textAsset.asRole(Video);            // Text-to-video generation
const illustration = await textAsset.asRole(Image);     // Text-to-image generation
```

### With Custom Model Selection

```typescript
// Use specific models for transformations
const audio = await videoAsset.asRole(Audio, 'ffmpeg-high-quality');
const speech = await textAsset.asRole(Audio, 'elevenlabs-premium');
const video = await textAsset.asRole(Video, 'runway-gen3');
const image = await textAsset.asRole(Image, 'flux-pro');
```

### Type Safety Benefits

```typescript
// TypeScript knows the exact return type
const audio: Audio = await videoAsset.asRole(Audio);
const text: Text = await audioAsset.asRole(Text);
const video: Video = await textAsset.asRole(Video);
const image: Image = await textAsset.asRole(Image);

// Compile-time error if you try to use wrong type
// const invalid = await videoAsset.asRole(SomeOtherClass); // ❌ Compile error
```

## Provider Discovery

The `asRole<T>()` method automatically discovers the appropriate provider based on:

1. **Source Asset Type**: Determined from the asset's format and metadata
2. **Target Role Type**: Determined from the `targetType` parameter
3. **Provider Capabilities**: Mapped to the correct provider interface

### Automatic Provider Mapping

| Source → Target | Provider Capability | Example Provider |
|----------------|-------------------|------------------|
| Video → Audio | VideoToAudioProvider | FFMPEG |
| Video → Text | VideoToTextProvider | Whisper (via FFMPEG + Whisper) |
| Audio → Text | AudioToTextProvider | Whisper |
| Text → Audio | TextToAudioProvider | ElevenLabs |
| Text → Video | TextToVideoProvider | FalAI (Runway) |
| Text → Image | TextToImageProvider | FalAI (FLUX) |

## Error Handling

```typescript
try {
  const audio = await videoAsset.asRole(Audio);
  console.log('✅ Conversion successful:', audio.toString());
} catch (error) {
  if (error.message.includes('Provider not found')) {
    console.error('❌ No provider available for this conversion');
  } else if (error.message.includes('Invalid asset')) {
    console.error('❌ Asset cannot be converted to this role');
  } else {
    console.error('❌ Conversion failed:', error.message);
  }
}
```

## Capability Checking

Before attempting transformations, you can check if an asset supports a specific role:

```typescript
import { Audio, Video, Text, Image } from './media/assets';

if (videoAsset.canPlayRole(Audio)) {
  const audio = await videoAsset.asRole(Audio);
}

if (textAsset.canPlayRole(Video)) {
  const video = await textAsset.asRole(Video);  
}
```

## Migration from Old Pattern

### Before (Deprecated)

```typescript
// Old individual methods
const audio = await videoAsset.asAudio();
const text = await audioAsset.asText();
const video = await textAsset.asVideo();
const image = await textAsset.asImage();
```

### After (New Unified Pattern)

```typescript
// New unified asRole<T>() method
const audio = await videoAsset.asRole(Audio);
const text = await audioAsset.asRole(Text);
const video = await textAsset.asRole(Video);
const image = await textAsset.asRole(Image);
```

## Advanced Usage

### Batch Processing

```typescript
async function processMediaBatch(assets: Asset[]) {
  const results = await Promise.all(
    assets.map(async (asset) => {
      // Convert all assets to audio for analysis
      try {
        return await asset.asRole(Audio);
      } catch (error) {
        console.warn(`Could not convert ${asset} to audio:`, error.message);
        return null;
      }
    })
  );
  
  return results.filter(Boolean);
}
```

### Chained Transformations

```typescript
// Video → Audio → Text → Audio (voice cloning pipeline)
const video = AssetLoader.load('original.mp4');
const audio = await video.asRole(Audio);           // Extract original audio
const transcript = await audio.asRole(Text);       // Transcribe speech
const newVoice = await transcript.asRole(Audio, 'voice-clone-model'); // New voice
```

## Performance Considerations

- **Provider Caching**: Providers are cached by the registry for efficient reuse
- **Lazy Loading**: Providers are only instantiated when needed
- **Model Reuse**: Models are reused within the same provider when possible
- **Memory Management**: Large media assets are processed in streams when supported

## Best Practices

1. **Always handle errors** - Provider availability can vary
2. **Use appropriate model IDs** - Different models have different quality/speed tradeoffs
3. **Check capabilities first** - Use `canPlayRole()` to avoid unnecessary errors
4. **Batch similar operations** - Group transformations using the same provider
5. **Monitor resource usage** - Media transformations can be resource-intensive

## Implementation Details

The `asRole<T>()` method internally:

1. **Determines source and target roles** from asset metadata and targetType
2. **Maps to MediaCapability** enum values for provider lookup
3. **Uses ProviderRegistry.findBestProvider()** to get the optimal provider
4. **Calls provider.getModel()** to get the appropriate model instance
5. **Invokes model.transform()** with the source asset
6. **Returns the transformed result** as the target type

This provides a clean, type-safe, and extensible foundation for all media transformations in the system.
