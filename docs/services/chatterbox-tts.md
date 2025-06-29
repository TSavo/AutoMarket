# ChatterboxTTSDockerService Documentation

## 🎯 Overview

The ChatterboxTTSDockerService provides high-quality text-to-speech conversion using the Chatterbox TTS engine with CUDA acceleration. It implements both the MediaTransformer and LocalServiceManager interfaces for seamless integration within the Prizm SDK ecosystem and Docker self-management.

## 🌐 **Dynamic Service Loading (June 2025)**

Chatterbox TTS can now be used as a dynamic service dependency:

### **As a Distributed Service**
```yaml
# prizm.service.yml for Chatterbox TTS
name: chatterbox-tts
version: "1.0.0"
description: "High-quality neural text-to-speech with CUDA acceleration"

docker:
  composeFile: "docker-compose.yml"
  serviceName: "chatterbox"
  ports: [8082]
  healthCheck:
    url: "http://localhost:8082/health"
    
capabilities:
  - "text-to-audio"
  
requirements:
  gpu: true
  memory: "4GB"
```

### **Usage with Dynamic Loading**
```typescript
// Provider requests Chatterbox TTS service
await provider.configure({
  serviceUrl: 'github:community/chatterbox-tts-service@v1.0.0',
  serviceConfig: {
    enableCUDA: true,
    qualityLevel: 'high',
    voiceModel: 'neural-v2'
  }
});

// Or use from local services directory
await provider.configure({
  serviceUrl: 'chatterbox-tts'  // Local static service
});
```

### **Custom Chatterbox Providers**
```typescript
// Custom provider that uses Chatterbox TTS
const voiceProvider = await getProvider('github:studio/voice-cloning@v2.0.0');

await voiceProvider.configure({
  serviceUrl: 'github:studio/enhanced-chatterbox@v1.0.0',
  serviceConfig: {
    voiceCloningEnabled: true,
    customModels: '/models/custom-voices',
    realTimeProcessing: true
  }
});

const clonedVoice = await $$(voiceProvider)("clone-voice")(audioSample);
```

## 🚀 Key Features

- **🎵 High-Quality TTS**: Neural text-to-speech with natural voice synthesis
- **🚀 CUDA Acceleration**: GPU-powered processing for faster generation
- **📁 Multiple Formats**: MP3 and WAV output support
- **⚡ Speed Control**: Variable playback speed (0.5x to 2.0x)
- **🐳 Docker Self-Management**: Automatic container lifecycle management
- **📊 Progress Monitoring**: Real-time progress updates during generation
- **🔄 Voice Cloning**: Support for custom voice models (future feature)
- **🎯 Prizm Integration**: Full compatibility with Fluent API and Core SDK

## 📋 Service Information

```typescript
{
  id: 'chatterbox-tts',
  name: 'Chatterbox TTS',
  type: 'local',
  transforms: [{
    input: 'text',
    output: 'audio',
    description: 'Convert text to speech using Chatterbox TTS'
  }]
}
```

## 🔧 Installation & Setup

### Prerequisites

- Docker with GPU support (nvidia-docker2)
- NVIDIA GPU with CUDA support
- At least 8GB GPU memory recommended
- 16GB system RAM recommended

### Docker Configuration

```yaml
# services/chatterbox/docker-compose.yml
version: '3.8'

services:
  chatterbox-init:
    image: busybox
    command: ["sh", "-c", "echo 'Initializing Chatterbox TTS...' && sleep 2"]
    
  chatterbox-tts-server:
    image: ghcr.io/resemble-ai/chatterbox:latest
    depends_on:
      - chatterbox-init
    ports:
      - "8004:8004"
    environment:
      - CUDA_VISIBLE_DEVICES=0
      - PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
    volumes:
      - ./models:/app/models
      - ./audio_cache:/app/audio_cache
      - ./reference_audio:/app/reference_audio
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8004/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

### Manual Startup

```bash
# Start the service
docker-compose -f services/chatterbox/docker-compose.yml up -d

# Check logs
docker logs chatterbox-tts-server

# Verify health
curl http://localhost:8004/health
```

## 🎵 Usage Examples

### Basic Text-to-Speech

```typescript
import { ChatterboxTTSDockerService } from './ChatterboxTTSDockerService';

const ttsService = new ChatterboxTTSDockerService();

// Generate speech from text
const result = await ttsService.generateTTS(
  'Hello, this is a test of the Chatterbox TTS service.',
  './output/hello.mp3'
);

console.log(`Generated audio: ${result.audioPath}`);
console.log(`Duration: ${result.duration} seconds`);
```

### MediaTransformer Interface

```typescript
// Using the unified MediaTransformer interface
const input = {
  type: 'text' as const,
  data: 'Welcome to Prizm!'
};

const output = await ttsService.transform(input, 'audio', {
  outputFormat: 'wav',
  speed: 1.2
});

// output.data contains the audio buffer
console.log(`Generated ${output.data.length} bytes of audio`);
```

### Advanced Options

```typescript
const result = await ttsService.generateTTS(
  'This is a test with custom settings.',
  './output/custom.mp3',
  {
    outputFormat: 'mp3',
    speed: 1.5,
    temperature: 0.7,
    exaggeration: 0.3,
    cfg_weight: 0.8,
    onProgress: (progress) => {
      console.log(`${progress.progress}% - ${progress.message}`);
    }
  }
);
```

## ⚙️ Configuration Options

### TTSOptions Interface

```typescript
interface TTSOptions {
  // Audio output format
  outputFormat?: 'mp3' | 'wav';
  
  // Speech speed multiplier (0.5 - 2.0)
  speed?: number;
  
  // Voice model settings
  temperature?: number;      // 0.0 - 1.0 (default: 0.5)
  exaggeration?: number;     // 0.0 - 1.0 (default: 0.5)
  cfg_weight?: number;       // 0.0 - 1.0 (default: 0.5)
  
  // Text processing
  split_text?: boolean;      // Split long text into chunks
  chunk_size?: number;       // Characters per chunk (default: 120)
  
  // Voice selection
  voice_mode?: 'predefined' | 'cloned';
  predefined_voice_id?: string;  // Default: 'Abigail.wav'
  reference_audio?: string;      // Path for voice cloning
  
  // Language detection
  language?: string;         // 'auto' or specific language code
  
  // Progress monitoring
  onProgress?: (progress: ProgressInfo) => void;
}
```

### Default Configuration

```typescript
const DEFAULT_OPTIONS: TTSOptions = {
  outputFormat: 'mp3',
  speed: 1.0,
  temperature: 0.5,
  exaggeration: 0.5,
  cfg_weight: 0.5,
  split_text: true,
  chunk_size: 120,
  voice_mode: 'predefined',
  predefined_voice_id: 'Abigail.wav',
  language: 'auto'
};
```

## 📊 Performance Characteristics

### Startup Performance

```
Model Loading Time: 60-90 seconds
Memory Usage: 4-8GB GPU, 2-4GB RAM
First Request: Additional 5-10 seconds
Subsequent Requests: 2-5 seconds per request
```

### Processing Performance

| Text Length | Processing Time | Output Size (MP3) |
|-------------|----------------|-------------------|
| 10 words    | 2-3 seconds    | ~8-15 KB         |
| 50 words    | 3-5 seconds    | ~25-50 KB        |
| 100 words   | 5-8 seconds    | ~50-100 KB       |
| 500 words   | 15-25 seconds  | ~200-400 KB      |

### Quality Settings Impact

| Setting | Quality | Speed | File Size |
|---------|---------|-------|-----------|
| Low     | Good    | Fast  | Small     |
| Medium  | Better  | Medium| Medium    |
| High    | Best    | Slow  | Large     |

## 🔄 Service Management

### Lifecycle Operations

```typescript
const ttsService = new ChatterboxTTSDockerService();

// Start the service
const started = await ttsService.startService();
console.log(`Service started: ${started}`);

// Check status
const status = await ttsService.getServiceStatus();
console.log(`Service status: ${status}`); // 'running', 'stopped', 'starting', 'error'

// Check availability
const available = await ttsService.isAvailable();
console.log(`Service available: ${available}`);

// Restart if needed
if (!available) {
  await ttsService.restartService();
}

// Stop when done
await ttsService.stopService();
```

### Health Monitoring

```typescript
// Monitor service health
setInterval(async () => {
  const healthy = await ttsService.isServiceHealthy();
  const status = await ttsService.getServiceStatus();
  
  console.log(`Health: ${healthy}, Status: ${status}`);
  
  if (!healthy && status === 'running') {
    console.log('Service is running but unhealthy, restarting...');
    await ttsService.restartService();
  }
}, 30000); // Check every 30 seconds
```

## 🧪 Testing

### Unit Tests

```typescript
describe('ChatterboxTTSDockerService', () => {
  let service: ChatterboxTTSDockerService;
  
  beforeEach(() => {
    service = new ChatterboxTTSDockerService();
  });
  
  test('should provide correct service info', () => {
    const info = service.getInfo();
    expect(info.id).toBe('chatterbox-tts');
    expect(info.transforms[0].input).toBe('text');
    expect(info.transforms[0].output).toBe('audio');
  });
  
  test('should validate input types', async () => {
    const invalidInput = { type: 'image' as const, data: 'test' };
    
    await expect(service.transform(invalidInput, 'audio'))
      .rejects toThrow('ChatterboxTTSDockerService only supports text input');
  });
});
```

### Integration Tests

```typescript
describe('ChatterboxTTSDockerService Integration', () => {
  test('should generate TTS audio', async () => {
    const service = new ChatterboxTTSDockerService();
    
    // Start service
    await service.startService();
    
    // Generate audio
    const result = await service.generateTTS(
      'Integration test audio',
      './temp/test.mp3'
    );
    
    expect(result.success).toBe(true);
    expect(fs.existsSync(result.audioPath!)).toBe(true);
    
    // Stop service
    await service.stopService();
  });
});
```

### Running Tests

```bash
# Unit tests only
npm run test -- ChatterboxTTSDockerService

# Integration tests (requires Docker)
npm run test:integration -- ChatterboxTTSDockerService.integration.test.ts

# All tests
npm run test:integration
```

## 🛠️ Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check Docker daemon
docker info

# Check GPU support
nvidia-smi
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi

# Check logs
docker logs chatterbox-tts-server
```

#### Out of Memory Errors

```yaml
# Reduce GPU memory usage in docker-compose.yml
environment:
  - PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:256
```

#### Slow Performance

```typescript
// Use shorter text chunks
const options = {
  chunk_size: 60,  // Reduce from default 120
  split_text: true
};
```

### Debug Mode

```typescript
// Enable debug logging
const service = new ChatterboxTTSDockerService();
service.setDebugMode(true);

// This will log all HTTP requests and responses
const result = await service.generateTTS('Debug test', './debug.mp3');
```

### Health Check Endpoint

```bash
# Manual health check
curl http://localhost:8004/health

# Expected response:
{
  "status": "healthy",
  "model_loaded": true,
  "running_tasks": 0,
  "max_concurrent_tasks": 3,
  "timestamp": 1750151233.3141916,
  "version": "2.0.2"
}
```

## 🔮 Future Enhancements

### Planned Features

- **Voice Cloning**: Custom voice model training
- **Batch Processing**: Multiple texts in single request
- **Streaming Output**: Real-time audio streaming
- **Language Models**: Multi-language support
- **Quality Presets**: Predefined quality/speed combinations

### API Extensions

```typescript
// Future voice cloning API
interface VoiceCloneOptions {
  referenceAudio: string;
  voiceName: string;
  trainingSteps?: number;
}

// Future batch processing API
interface BatchTTSRequest {
  texts: string[];
  outputDir: string;
  options?: TTSOptions;
}
```

---

**Related Documentation**:
- [WhisperSTTService](./whisper-stt.md)
- [Service Development Guide](./development-guide.md)
- [Docker Management](../architecture/docker-management.md)
