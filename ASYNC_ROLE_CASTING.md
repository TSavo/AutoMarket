# Async Role Casting Enhancement

## Overview

The asset role system has been enhanced to support asynchronous role casting methods. This enables intelligent audio extraction from video files using FFmpeg when casting to Audio or Speech roles.

## Key Changes

### 1. All Role Interfaces Are Now Async

All role casting methods now return `Promise<T>` instead of `T`:

```typescript
// Before
export interface AudioRole {
  asAudio(): Audio;
}

export interface SpeechRole {
  asSpeech(): Speech;
}

// After
export interface AudioRole {
  asAudio(): Promise<Audio>;
}

export interface SpeechRole {
  asSpeech(): Promise<Speech>;
}
```

### 2. Intelligent FFmpeg Integration

When you call `asAudio()` or `asSpeech()` on a video asset, the system automatically:

1. Detects if the source is a video format
2. Uses FFmpeg to extract audio from the video
3. Returns an Audio/Speech object with the extracted audio data
4. Falls back gracefully if FFmpeg fails

### 3. Enhanced Mixins

The role mixins now include smart audio extraction:

```typescript
// Video to Speech conversion
async asSpeech(): Promise<Speech> {
  if (this.isVideoFormatForSpeech()) {
    return await this.extractSpeechFromVideo();
  }
  return new Speech(this.data, this);
}

// Video to Audio conversion  
async asAudio(): Promise<Audio> {
  if (this.isVideoFormatForAudio()) {
    return await this.extractAudioFromVideo();
  }
  return new Audio(this.data, this);
}
```

## Usage Examples

### Basic Usage

```typescript
import { MP4Asset } from '../assets/types';

// Create a video asset
const videoAsset = new MP4Asset(videoBuffer, { 
  format: 'mp4', 
  hasAudio: true 
});

// Extract audio using FFmpeg automatically
const audioData = await videoAsset.asAudio();
const speechData = await videoAsset.asSpeech();
```

### Error Handling

```typescript
try {
  const speech = await videoAsset.asSpeech();
  console.log('Speech extracted successfully');
} catch (error) {
  console.error('Failed to extract speech:', error.message);
}
```

### Checking Capabilities

```typescript
// Check if asset can provide audio/speech
if (videoAsset.canPlayAudioRole()) {
  const audio = await videoAsset.asAudio();
}

if (videoAsset.canPlaySpeechRole()) {
  const speech = await videoAsset.asSpeech();
}
```

## FFmpeg Service

The `FFmpegService` handles the audio extraction:

- **Input**: Video buffer + format
- **Output**: Audio buffer (WAV format, 44.1kHz, stereo)
- **Features**: Automatic temp file management, error handling, cleanup

### Supported Video Formats

The system automatically detects and processes these video formats:
- MP4
- AVI  
- MOV
- WMV
- FLV
- WebM
- MKV

## Migration Guide

### Updating Existing Code

All role casting calls must now be awaited:

```typescript
// Before
const audio = videoAsset.asAudio();
const speech = videoAsset.asSpeech();

// After  
const audio = await videoAsset.asAudio();
const speech = await videoAsset.asSpeech();
```

### Function Signatures

```typescript
// Before
function processVideo(asset: MP4Asset) {
  const audio = asset.asAudio();
  return audio;
}

// After
async function processVideo(asset: MP4Asset) {
  const audio = await asset.asAudio();
  return audio;
}
```

## Benefits

1. **Intelligent Processing**: Video files automatically have their audio extracted
2. **Seamless Experience**: Role casting "just works" regardless of source format
3. **Efficient**: Only runs FFmpeg when necessary (video → audio conversion)
4. **Robust**: Graceful fallback if FFmpeg operations fail
5. **Type Safe**: Full TypeScript support with proper async/await patterns

## Requirements

- FFmpeg must be installed and available in PATH
- Node.js environment with async/await support
- Sufficient disk space for temporary audio files during extraction

## Performance Considerations

- Audio extraction is I/O intensive (temporary files)
- Large video files will take longer to process
- Consider caching extracted audio for repeated access
- FFmpeg operations are CPU intensive for long videos

## Error Scenarios

The system handles these error cases gracefully:

1. **FFmpeg not available**: Falls back to original data
2. **Invalid video format**: Returns error with details
3. **Insufficient disk space**: Cleanup and error reporting
4. **Corrupted video**: Attempts extraction, falls back on failure

This enhancement makes the role system much more powerful and user-friendly, enabling seamless audio extraction from video content without requiring manual FFmpeg operations.
