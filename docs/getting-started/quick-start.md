# Quick Start Guide

## 🚀 Get Started with Prizm in 5 Minutes

This guide will get you up and running with the Prizm Media Transformation SDK in just a few minutes.

## 📋 Prerequisites

- **Node.js 18+** with npm
- **Docker** with GPU support (for local services - optional)
- **Git** for cloning the repository

## ⚡ Quick Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd prizm

# Install dependencies
npm install

# Verify installation
npm run test
```

### 2. Start a Service (Optional)

#### Option A: Text-to-Speech (Chatterbox TTS)

```bash
# Start the TTS service
docker-compose -f services/chatterbox/docker-compose.yml up -d

# Wait for service to load (60-90 seconds)
# Check logs: docker logs chatterbox-tts-server

# Verify it's working
curl http://localhost:8004/health
```

#### Option B: Speech-to-Text (Whisper STT)

```bash
# Start the STT service  
docker-compose -f services/whisper/docker-compose.yml up -d

# Verify it's working
curl http://localhost:9000/health
```

### 3. Test the Services

```bash
# Run integration tests to see services in action
npm run test:integration

# Or test specific service
npm run test:integration -- ChatterboxTTSDockerService.integration.test.ts
```

## 🎵 Your First Transformation

### Text-to-Speech Example

```typescript
import { ChatterboxTTSDockerService } from './src/media/ChatterboxTTSDockerService';

async function generateSpeech() {
  const ttsService = new ChatterboxTTSDockerService();
  
  // Generate speech from text
  const result = await ttsService.generateTTS(
    'Hello! Welcome to Prizm Media Transformation!',
    './output/welcome.mp3'
  );
  
  if (result.success) {
    console.log(`✅ Generated: ${result.audioPath}`);
    console.log(`⏱️ Duration: ${result.duration} seconds`);
  }
}

generateSpeech();
```

### Speech-to-Text Example

```typescript
import { WhisperSTTService } from './src/media/ingest/WhisperSTTService';

async function transcribeAudio() {
  const sttService = new WhisperSTTService();
  
  // Transcribe audio file
  const input = {
    type: 'audio' as const,
    data: './path/to/audio.wav'
  };
  
  const output = await sttService.transform(input, 'text');
  
  console.log(`📝 Transcription: ${output.data}`);
  console.log(`🎯 Confidence: ${output.metadata?.confidence}`);
}

transcribeAudio();
```

## 🔧 Using the MediaTransformer Interface

All services implement the same interface for consistency:

```typescript
// Generic transformation function
async function transformMedia(
  service: MediaTransformer,
  inputData: string,
  inputType: MediaType,
  outputType: MediaType
) {
  // Check if service is available
  if (!(await service.isAvailable())) {
    console.log('Service not available, starting...');
    if ('startService' in service) {
      await (service as any).startService();
    }
  }
  
  // Perform transformation
  const input = { type: inputType, data: inputData };
  const output = await service.transform(input, outputType);
  
  console.log(`✅ Transformed ${inputType} → ${outputType}`);
  return output;
}

// Use with any service
const ttsService = new ChatterboxTTSDockerService();
const audioOutput = await transformMedia(
  ttsService, 
  'Hello world', 
  'text', 
  'audio'
);
```

## 🧪 Running Tests

### Unit Tests (Fast)

```bash
# Run all unit tests
npm run test

# Run specific service tests
npm run test -- ChatterboxTTSDockerService.test.ts

# Run with coverage
npm run test:coverage
```

### Integration Tests (Real Services)

```bash
# Run all integration tests
npm run test:integration

# Run specific integration test
npm run test:integration -- ChatterboxTTSDockerService.integration.test.ts

# Watch mode for development
npm run test:integration -- --watch
```

## 🐳 Docker Management

### Service Lifecycle

```typescript
const service = new ChatterboxTTSDockerService();

// Start service
await service.startService();

// Check status
const status = await service.getServiceStatus(); // 'running', 'stopped', etc.

// Check health
const healthy = await service.isServiceHealthy();

// Restart if needed
if (!healthy) {
  await service.restartService();
}

// Stop when done
await service.stopService();
```

### Manual Docker Commands

```bash
# Start services
docker-compose -f services/chatterbox/docker-compose.yml up -d
docker-compose -f services/whisper/docker-compose.yml up -d

# Check status
docker ps

# View logs
docker logs chatterbox-tts-server
docker logs whisper-asr-webservice

# Stop services
docker-compose -f services/chatterbox/docker-compose.yml stop
docker-compose -f services/whisper/docker-compose.yml stop
```

## 📊 Monitoring & Debugging

### Health Checks

```bash
# Check TTS service health
curl http://localhost:8004/health

# Expected response:
{
  "status": "healthy",
  "model_loaded": true,
  "running_tasks": 0,
  "max_concurrent_tasks": 3
}

# Check STT service health
curl http://localhost:9000/health
```

### Debug Mode

```typescript
// Enable debug logging
const service = new ChatterboxTTSDockerService();
service.setDebugMode?.(true);

// This will log all HTTP requests and Docker operations
const result = await service.generateTTS('Debug test', './debug.mp3');
```

### Common Issues

#### GPU Not Available
```bash
# Check GPU support
nvidia-smi
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
```

#### Service Won't Start
```bash
# Check Docker daemon
docker info

# Check logs for errors
docker logs chatterbox-tts-server --tail 50
```

#### Tests Failing
```bash
# Make sure Docker services are stopped before running tests
docker-compose -f services/chatterbox/docker-compose.yml stop
docker-compose -f services/whisper/docker-compose.yml stop

# Run tests
npm run test:integration
```

## 🔮 Next Steps

### Add a New Service

1. **Implement MediaTransformer interface**
2. **Add Docker self-management** (optional)
3. **Create unit and integration tests**
4. **Add documentation**

See [Service Development Guide](../services/development-guide.md) for details.

### Explore the Architecture

- [System Architecture](../architecture/system-overview.md)
- [MediaTransformer Interface](../architecture/media-transformer.md)
- [Docker Self-Management](../architecture/docker-management.md)

### API Reference

- [MediaTransformer API](../api/media-transformer.md)
- [LocalServiceManager API](../api/local-service-manager.md)

## 🎉 You're Ready!

You now have a working media transformation system with:
- ✅ Text-to-Speech conversion
- ✅ Speech-to-Text transcription  
- ✅ Docker self-management
- ✅ Comprehensive testing
- ✅ Production-ready architecture

Start building amazing media transformations! 🚀

---

**Need Help?** Check out the [Troubleshooting Guide](../troubleshooting/common-issues.md) or [API Documentation](../api/media-transformer.md).
