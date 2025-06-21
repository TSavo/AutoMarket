# AutoMarket Quick Start Guide

## 🎯 Overview

This guide will help you get AutoMarket up and running quickly. AutoMarket is a comprehensive media processing platform that unifies multiple AI providers and local Docker services under a common interface.

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Docker** and Docker Compose (for local services)
- **Git** for version control
- **API Keys** for providers you want to use (optional for getting started)

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd AutoMarket
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
# Copy example environment file
cp .env.example .env.local

# Edit the file to add your API keys (optional for initial testing)
nano .env.local
```

### 4. Verify Installation
```bash
# Run tests to verify everything is working
npm run test

# Run type checking
npm run type-check
```

## 🔧 Basic Configuration

### Environment Variables

Add your API keys to `.env.local`:

```bash
# API Provider Keys (optional - you can start without these)
FALAI_API_KEY=your_fal_ai_key_here
TOGETHER_API_KEY=your_together_ai_key_here
OPENROUTER_API_KEY=your_openrouter_key_here
REPLICATE_API_TOKEN=your_replicate_token_here

# Docker Service URLs (default values)
FFMPEG_SERVICE_URL=http://localhost:8006
CHATTERBOX_DOCKER_URL=http://localhost:8004
WHISPER_SERVICE_URL=http://localhost:9000
```

### Get API Keys (Free Options Available)

1. **Together.ai** (Free tier available): https://api.together.xyz/settings/api-keys
2. **OpenRouter** (Free models available): https://openrouter.ai/keys
3. **FAL.ai** (Pay-per-use): https://fal.ai/dashboard/keys
4. **Replicate** (Pay-per-use): https://replicate.com/account/api-tokens

## 🏃‍♂️ First Steps

### 1. Test Provider Connection (No API Key Required)

Create `test-basic.ts`:

```typescript
import { TogetherProvider } from './src/media/providers/together';

async function testBasicConnection() {
  console.log('🧪 Testing AutoMarket Basic Setup...\n');
  
  // Test provider creation (no API key needed for this)
  const provider = new TogetherProvider();
  console.log('✅ Provider created:', provider.name);
  console.log('✅ Capabilities:', provider.capabilities);
  console.log('✅ Available models:', provider.models.length);
  
  console.log('\n🎉 Basic setup working!');
  console.log('💡 Add API keys to .env.local to test actual functionality');
}

testBasicConnection().catch(console.error);
```

Run it:
```bash
npx tsx test-basic.ts
```

### 2. Test Smart Asset Loading

Create `test-assets.ts`:

```typescript
import { AssetLoader, hasVideoRole, hasAudioRole, hasTextRole } from './src/media/assets';
import fs from 'fs';

async function testAssetLoading() {
  console.log('🧪 Testing Smart Asset Loading...\n');
  
  // Create a simple test file
  const testFile = 'test.txt';
  fs.writeFileSync(testFile, 'Hello, AutoMarket!');
  
  try {
    // Load asset with automatic role detection
    const asset = AssetLoader.load(testFile);
    console.log('✅ Asset loaded:', asset.filename);
    console.log('✅ File size:', asset.fileSize, 'bytes');
    console.log('✅ MIME type:', asset.mimeType);
    
    // Check roles
    console.log('📋 Available roles:');
    console.log('  - Text role:', hasTextRole(asset));
    console.log('  - Audio role:', hasAudioRole(asset));
    console.log('  - Video role:', hasVideoRole(asset));
    
    if (hasTextRole(asset)) {
      const text = await asset.asText();
      const content = await asset.getContent();
      console.log('✅ Text content:', content);
    }
    
  } finally {
    // Cleanup
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  }
  
  console.log('\n🎉 Asset loading working!');
}

testAssetLoading().catch(console.error);
```

Run it:
```bash
npx tsx test-assets.ts
```

### 3. Test with Real API Key

If you have a Together.ai API key, create `test-real-api.ts`:

```typescript
import { TogetherProvider } from './src/media/providers/together';
import { Text } from './src/media/assets/roles';

async function testRealAPI() {
  console.log('🧪 Testing Real API Connection...\n');
  
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    console.log('❌ Please set TOGETHER_API_KEY in .env.local');
    return;
  }
  
  try {
    // Configure provider
    const provider = new TogetherProvider();
    await provider.configure({ apiKey });
    
    console.log('✅ Provider configured');
    
    // Test availability
    const isAvailable = await provider.isAvailable();
    console.log('✅ Provider available:', isAvailable);
    
    if (isAvailable) {
      // Get free models
      const freeModels = provider.getFreeModels();
      console.log('✅ Free models available:', freeModels.length);
      
      if (freeModels.length > 0) {
        // Test text generation with free model
        const freeTextModel = freeModels.find(m => 
          m.capabilities.includes('text-generation')
        );
        
        if (freeTextModel) {
          console.log('🚀 Testing with free model:', freeTextModel.name);
          const model = await provider.createTextToTextModel(freeTextModel.id);
          
          const input = new Text('Hello, AutoMarket!');
          const result = await model.transform(input);
          
          console.log('✅ Generated text:', result.content.substring(0, 100) + '...');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n🎉 Real API test complete!');
}

testRealAPI().catch(console.error);
```

Run it:
```bash
npx tsx test-real-api.ts
```

## 🐳 Docker Services Setup

### 1. Start FFMPEG Service

```bash
# Navigate to FFMPEG service directory
cd services/ffmpeg

# Start the service
docker-compose up -d

# Check if it's running
docker-compose ps

# Test the service
curl http://localhost:8006/health
```

### 2. Test FFMPEG Integration

Create `test-ffmpeg.ts`:

```typescript
import { FFMPEGDockerProvider } from './src/media/providers/docker/ffmpeg';

async function testFFMPEGService() {
  console.log('🧪 Testing FFMPEG Docker Service...\n');
  
  try {
    const provider = new FFMPEGDockerProvider();
    await provider.configure({
      serviceUrl: 'http://localhost:8006'
    });
    
    console.log('✅ FFMPEG provider configured');
    
    const isAvailable = await provider.isAvailable();
    console.log('✅ FFMPEG available:', isAvailable);
    
    if (isAvailable) {
      const health = await provider.getHealth();
      console.log('✅ FFMPEG health:', health.status);
      console.log('✅ Available models:', provider.models.length);
    }
    
  } catch (error) {
    console.error('❌ FFMPEG Error:', error.message);
    console.log('💡 Make sure Docker is running and FFMPEG service is started');
  }
  
  console.log('\n🎉 FFMPEG test complete!');
}

testFFMPEGService().catch(console.error);
```

## 📚 Next Steps

### Explore Core Features

1. **Provider System**: Try different providers and compare results
2. **Asset Loading**: Load different media formats and explore their capabilities
3. **Video Composition**: Use FFMPEG for video processing and composition
4. **Model Discovery**: Explore dynamic model discovery from providers

### Example Workflows

#### Text to Image Generation
```typescript
import { FalAiProvider } from './src/media/providers/falai';
import { Text } from './src/media/assets/roles';

const provider = new FalAiProvider();
await provider.configure({ apiKey: process.env.FALAI_API_KEY });

const model = await provider.createTextToImageModel('fal-ai/flux-schnell');
const prompt = new Text('A beautiful sunset over mountains');
const image = await model.transform(prompt);
```

#### Audio Processing
```typescript
import { AssetLoader } from './src/media/assets';

const audioAsset = AssetLoader.load('speech.wav');
const fasterSpeech = await audioAsset.changeSpeed(1.5);
const transcript = await audioAsset.toText();  // Uses Whisper
```

#### Video Composition
```typescript
import { FFMPEGCompositionBuilder } from './src/media/providers/docker/ffmpeg';

const composer = new FFMPEGCompositionBuilder()
  .compose(mainVideo)
  .addOverlay(logoVideo, { 
    position: 'top-right', 
    opacity: 0.8 
  });

const result = await composer.transform(ffmpegModel);
```

### Development Workflow

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Run Tests During Development**:
   ```bash
   # Watch mode for tests
   npm run test -- --watch
   
   # Run specific test file
   npm run test test-basic.ts
   ```

3. **Type Checking**:
   ```bash
   # Continuous type checking
   npm run type-check -- --watch
   ```

## 🔍 Troubleshooting

### Common Issues

#### "Provider not available"
- Check if API key is correctly set in `.env.local`
- Verify the API key is valid on the provider's website
- Check internet connection

#### "Docker service not responding"
- Ensure Docker is running: `docker --version`
- Check if service is started: `docker-compose ps`
- Check service logs: `docker-compose logs`

#### "Module not found" errors
- Run `npm install` to ensure all dependencies are installed
- Check TypeScript configuration: `npm run type-check`

#### Permission errors with Docker
- On Linux/Mac, you may need to run Docker commands with `sudo`
- Or add your user to the docker group

### Getting Help

1. **Check Documentation**: Browse the `/docs` folder for detailed guides
2. **Run Tests**: Use `npm run test` to verify your setup
3. **Check Examples**: Look at test files for usage examples
4. **Review Logs**: Check console output for detailed error messages

## 🎯 What's Next?

Now that you have AutoMarket running, explore these areas:

1. **[Provider System](../architecture/provider-system.md)**: Learn about the multi-provider architecture
2. **[Asset System](../architecture/asset-system.md)**: Understand smart asset loading and roles
3. **[Video Composition](../video/composition-system.md)**: Advanced video processing capabilities
4. **[API Reference](../api/)**: Detailed API documentation

## 🚀 Production Deployment

For production deployment:

1. **Environment Setup**: Use production environment variables
2. **Docker Services**: Deploy Docker services with proper resource limits
3. **API Rate Limits**: Configure appropriate rate limiting for providers
4. **Monitoring**: Set up health checks and monitoring
5. **Security**: Secure API keys and service endpoints

Ready to build amazing media applications with AutoMarket! 🎉
