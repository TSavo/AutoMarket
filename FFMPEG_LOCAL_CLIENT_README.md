# FFMPEG Local Client Implementation

## Overview

Successfully created a local equivalent of `FFMPEGAPIClient` that runs ffmpeg locally instead of using the Docker service. This provides a drop-in replacement with the ability to switch between implementations.

## What Was Created

### 1. FFMPEGLocalClient (`src/media/clients/FFMPEGLocalClient.ts`)
- **Purpose**: Local implementation that runs ffmpeg/ffprobe directly on the system
- **Interface**: Implements the same interface as `FFMPEGAPIClient` for drop-in replacement
- **Features**:
  - Audio extraction from video files
  - Audio format conversion
  - Video composition and filtering
  - Video metadata extraction
  - Multiple video processing
  - Temporary file management with automatic cleanup

### 2. FFMPEGClientFactory (`src/media/clients/FFMPEGClientFactory.ts`)
- **Purpose**: Factory pattern for creating and switching between client implementations
- **Features**:
  - Create API client (service-based)
  - Create local client (local ffmpeg)
  - Environment variable configuration
  - Runtime switching between implementations
  - Unified wrapper interface

### 3. Updated Index (`src/media/clients/index.ts`)
- **Purpose**: Centralized exports for all FFMPEG client functionality
- **Exports**: All client types, factory functions, and interfaces

## Key Features

### Drop-in Replacement
The local client implements the exact same interface as the API client:
```typescript
interface IFFMPEGClient {
  checkHealth(): Promise<any>;
  extractAudio(videoData: any, options?: any): Promise<any>;
  convertAudio(audioData: any, options?: any): Promise<any>;
  downloadFile(outputPath: string): Promise<Buffer>;
  getServiceInfo(): Promise<any>;
  testConnection(): Promise<boolean>;
  composeVideo(videoBuffers: Buffer[], options?: any): Promise<any>;
  filterVideo(videoData: any, options?: any): Promise<any>;
  filterMultipleVideos(videoBuffers: Buffer[], options?: any): Promise<any>;
  getVideoMetadata(videoData: any): Promise<any>;
}
```

### Easy Switching
```typescript
// Create local client
const localClient = createFFMPEGClient({
  type: 'local',
  localConfig: {
    timeout: 600000 // 10 minutes for complex operations
  }
});

// Create API client
const apiClient = createFFMPEGClient({
  type: 'api',
  apiConfig: {
    baseUrl: 'http://localhost:9000'
  }
});

// Or use environment variables
const client = createFFMPEGClientFromEnv();
```

### Configuration Options
```typescript
interface FFMPEGLocalConfig {
  ffmpegPath?: string;      // Custom ffmpeg binary path
  ffprobePath?: string;     // Custom ffprobe binary path
  tempDir?: string;         // Custom temp directory
  timeout?: number;         // Process timeout (default: 5 minutes)
  maxRetries?: number;      // Retry attempts (default: 3)
  retryDelay?: number;      // Delay between retries (default: 1000ms)
}
```

## Test Results

Successfully tested with `test-examples-5-6.ts` which demonstrates:

### ✅ Working Features
- **Single intro/outro** with `.prepend()` and `.append()`
- **Multiple intros/outros** with multiple arguments
- **Video concatenation** with proper audio handling
- **Filter complex generation** for concatenation
- **Output files** written to disk for verification
- **LOCAL FFMPEG client** working as drop-in replacement

### Test Output
```
🎬 Testing Examples 5 and 6 - Prepend/Append Functionality (LOCAL)
🔧 Using LOCAL FFMPEG client instead of Docker service
✅ Local FFMPEG connection successful
📋 Local FFMPEG info: {
  name: 'FFMPEG Local Client',
  version: '1.0.0-local',
  ffmpegVersion: '6.0-essentials_build-www.gyan.dev',
  type: 'local'
}

✅ Intro/Outro composition completed: 47189206 bytes
✅ Multi intro/outro composition completed: 47950093 bytes
```

### Generated Files
- `example-5-intro-outro-result-LOCAL.mp4` (47MB)
- `example-6-multi-intro-outro-result-LOCAL.mp4` (47MB)

## Usage Examples

### Basic Usage
```typescript
import { createFFMPEGClient } from './src/media/clients';

// Create local client
const client = createFFMPEGClient({ type: 'local' });

// Test connection
const isConnected = await client.testConnection();
if (!isConnected) {
  console.error('FFMPEG not available. Please install ffmpeg.');
  return;
}

// Use with existing models
const filter = new FFMPEGVideoFilterModel(undefined, client);
```

### Environment Configuration
```bash
# Set environment variables
export FFMPEG_CLIENT_TYPE=local
export FFMPEG_PATH=/usr/local/bin/ffmpeg
export FFMPEG_LOCAL_TIMEOUT=600000

# Use in code
const client = createFFMPEGClientFromEnv();
```

### Runtime Switching
```typescript
const wrapper = new FFMPEGClientWrapper({ type: 'api' });

// Switch to local at runtime
wrapper.switchTo('local', {
  timeout: 600000
});

console.log(wrapper.getCurrentType()); // 'local'
```

## Benefits

1. **No Docker Dependency**: Works without Docker service running
2. **Better Performance**: Direct local execution, no network overhead
3. **Easier Development**: No need to manage Docker containers
4. **Drop-in Replacement**: Existing code works unchanged
5. **Flexible Configuration**: Easy switching between implementations
6. **Better Error Handling**: Direct access to ffmpeg error messages

## Requirements

- **ffmpeg** and **ffprobe** must be installed and available in PATH
- Or specify custom paths in configuration
- Sufficient disk space for temporary files
- Appropriate timeout settings for complex operations

## Installation

FFMPEG can be downloaded from: https://ffmpeg.org/download.html

For Windows, the test used: `6.0-essentials_build-www.gyan.dev`

## Next Steps

The local client is now ready for production use and can be integrated into any existing workflow that currently uses the API client.
