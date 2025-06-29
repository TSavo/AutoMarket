# 🚀 Prizm - Awesome Examples & One-Liners

Welcome to the most elegant media transformation SDK ever built! Prizm makes AI-powered media generation as simple as one line of code, while supporting incredibly complex multi-provider pipelines.

## 🌐 **NEW: Dynamic Loading Examples (June 2025)**

### 🔄 Load Providers Dynamically
```typescript
import { getProvider } from 'prizm';

// Load custom provider from GitHub
const customProvider = await getProvider('https://github.com/company/ai-provider');

// Load enterprise provider from NPM
const enterpriseProvider = await getProvider('@company/enterprise-ai@2.1.0');

// Use like any built-in provider
const result = await customProvider.getModel('custom-model').transform(input);
```

### 🤝 Providers with Dynamic Services
```typescript
// Provider automatically loads GPU-accelerated service
const provider = await getProvider('github:company/inference-provider@v1.0.0');

await provider.configure({
  serviceUrl: 'github:company/gpu-inference-service@v2.0.0',
  serviceConfig: { 
    enableGPU: true, 
    memory: '24GB',
    modelPath: '/models/custom-model.bin'
  }
});

// Zero-setup inference with custom hardware
const result = await provider.getModel('ultra-fast-model').transform(input);
```

### 🌍 Environment-Specific Loading
```typescript
// Different providers for different environments
const provider = await getProvider(
  process.env.NODE_ENV === 'production'
    ? '@company/production-provider@stable'
    : 'github:company/dev-provider@main'
);

// Different services for different environments  
await provider.configure({
  serviceUrl: process.env.NODE_ENV === 'production'
    ? 'github:company/prod-service@v2.0.0'
    : 'github:company/dev-service@latest'
});
```

## 🎯 One-Liner Magic

### 🖼️ Generate Images (Fluent API - Zero Config)
```typescript
import { $ } from 'prizm';

// One line to rule them all - works immediately!
const image = await $("replicate")("flux-schnell")("A futuristic city at sunset");
const epicImage = await $("falai")("flux-pro")("A dragon soaring through clouds", { steps: 4 });
```

### 🎬 Generate Videos from Text
```typescript
// One line video generation with any provider
const video = await $("runway")("gen-3")("A cat riding a skateboard in slow motion");
const animation = await $("replicate")("animate-image")(heroImage, { duration: 5 });
```

### 🎵 Text to Speech in One Line
```typescript
// One line TTS with local or remote providers
const audio = await $("chatterbox")("voice-clone")("Hello world!");
const speech = await $("huggingface")("mms-tts-eng")("Professional voiceover text");
```

### 🗣️ Speech to Text from Video
```typescript
import { AssetLoader } from 'prizm';

// One line: load video + extract audio + transcribe
const transcript = await (await AssetLoader.load('video.mp4').asSpeech()).transcribe();
```

### 🎨 Smart Asset Loading (Any Format)
```typescript
import { AssetLoader } from 'prizm';

// Smart loading - auto-detects format and applies roles
const videoAsset = AssetLoader.load('input.mp4');    // Auto-detects: Video + Audio + Speech
const audioAsset = AssetLoader.load('music.mp3');    // Auto-detects: Audio + Speech
const imageAsset = AssetLoader.load('photo.jpg');    // Auto-detects: Image
const textAsset = AssetLoader.load('document.txt');  // Auto-detects: Text
```

## 🎬 Epic Video Composition Pipelines

### 🌟 The Ultimate Marketing Video Pipeline
```typescript
import { FFMPEGCompositionBuilder } from './src/media/providers/docker/ffmpeg';
import { AssetLoader } from './src/media/assets/SmartAssetFactory';

// Load assets with smart detection
const intro = await (AssetLoader.load('brand-intro.mp4')).asVideo();
const content = await (AssetLoader.load('main-content.mp4')).asVideo();
const outro = await (AssetLoader.load('call-to-action.mp4')).asVideo();
const logo = await (AssetLoader.load('floating-logo.webm')).asVideo();
const watermark = await (AssetLoader.load('watermark.png')).asVideo();

// Build epic composition
const finalVideo = await new FFMPEGCompositionBuilder()
  .prepend(intro)                           // Brand intro
  .compose(content)                         // Main content
  .append(outro)                            // Call to action
  .addOverlay(logo, {                       // Floating logo
    position: 'top-right',
    opacity: 0.8,
    width: '15%',
    colorKey: '#000000',                    // Remove black background
    colorKeySimilarity: 0.3,
    startTime: 2.0,                         // Appears after 2 seconds
    duration: 30                            // Lasts 30 seconds
  })
  .addOverlay(watermark, {                  // Subtle watermark
    position: 'bottom-left',
    opacity: 0.4,
    width: '10%',
    startTime: 0,                           // From beginning
    duration: -1                            // Until end
  })
  .transform(ffmpegModel);

console.log('🎉 Epic marketing video created!');
```

### 🎪 Multi-Provider AI Content Creation Pipeline
```typescript
import { FalAiProvider, TogetherProvider, OpenRouterProvider } from './src/media/providers';
import { FFMPEGCompositionBuilder } from './src/media/providers/docker/ffmpeg';

// Configure multiple providers
const falAi = new FalAiProvider();
const together = new TogetherProvider();
const openRouter = new OpenRouterProvider();

await Promise.all([
  falAi.configure({ apiKey: process.env.FALAI_API_KEY }),
  together.configure({ apiKey: process.env.TOGETHER_API_KEY }),
  openRouter.configure({ apiKey: process.env.OPENROUTER_API_KEY })
]);

// Step 1: Generate script with OpenRouter (free!)
const scriptModel = await openRouter.createTextToTextModel('deepseek/deepseek-chat:free');
const script = await scriptModel.transform('Write a 30-second script about AI innovation');

// Step 2: Generate background image with FAL.ai
const imageModel = await falAi.createTextToImageModel('fal-ai/flux-pro');
const background = await imageModel.transform('Futuristic AI laboratory, cinematic lighting');

// Step 3: Generate narration with Together.ai
const audioModel = await together.createTextToAudioModel('eleven-labs/eleven-tts');
const narration = await audioModel.transform(script);

// Step 4: Animate the image with FAL.ai
const videoModel = await falAi.createImageToVideoModel('fal-ai/runway-gen3');
const animatedBg = await videoModel.transform(background);

// Step 5: Compose everything together
const finalVideo = await new FFMPEGCompositionBuilder()
  .compose(animatedBg)                      // Animated background
  .addAudioTrack(narration)                 // AI-generated narration
  .addOverlay(titleCard, {                  // Title overlay
    position: 'center',
    startTime: 0,
    duration: 5,
    fadeIn: 1.0,
    fadeOut: 1.0
  })
  .transform(ffmpegModel);

console.log('🎬 Multi-provider AI video created with 3 different AI services!');
```

### 🔥 Advanced Green Screen Composition
```typescript
import { FFMPEGCompositionBuilder } from './src/media/providers/docker/ffmpeg';

// Hollywood-level green screen composition
const finalVideo = await new FFMPEGCompositionBuilder()
  .compose(backgroundPlate)                 // Background scene
  .addOverlay(greenScreenFootage, {         // Actor footage
    position: 'center',
    colorKey: '#00FF00',                    // Remove green
    colorKeySimilarity: 0.4,                // Precise keying
    colorKeyBlend: 0.1,                     // Smooth edges
    width: '80%',                           // Scale actor
    height: '80%'
  })
  .addOverlay(particleEffects, {           // VFX layer
    position: 'center',
    blendMode: 'screen',                    // Additive blending
    opacity: 0.7
  })
  .addOverlay(lightingEffects, {           // Lighting layer
    position: 'center',
    blendMode: 'overlay',
    opacity: 0.5
  })
  .transform(ffmpegModel);

console.log('🎭 Professional green screen composition complete!');
```

## 🤖 Multi-Provider Model Discovery

### 🔍 Discover ALL Available Models
```typescript
import { getAllProviders } from './src/media/registry/bootstrap';

// Get all providers and their models
const providers = await getAllProviders();

for (const provider of providers) {
  if (await provider.isAvailable()) {
    console.log(`\n🔌 ${provider.name} (${provider.type})`);
    console.log(`📊 Capabilities: ${provider.capabilities.join(', ')}`);
    
    const models = provider.models;
    console.log(`🤖 Models: ${models.length}`);
    
    // Show free models if available
    if (typeof provider.getFreeModels === 'function') {
      const freeModels = provider.getFreeModels();
      console.log(`💰 Free Models: ${freeModels.length}`);
      freeModels.slice(0, 3).forEach(model => {
        console.log(`   - ${model.id}: ${model.name}`);
      });
    }
  }
}
```

### 🎯 Smart Provider Selection
```typescript
import { ProviderRegistry } from './src/media/registry/ProviderRegistry';
import { MediaCapability } from './src/media/types/provider';

// Find the best provider for each capability
const registry = ProviderRegistry.getInstance();

const textToImageProviders = await registry.getProvidersForCapability(MediaCapability.TEXT_TO_IMAGE);
const textToVideoProviders = await registry.getProvidersForCapability(MediaCapability.TEXT_TO_VIDEO);
const textToAudioProviders = await registry.getProvidersForCapability(MediaCapability.TEXT_TO_AUDIO);

console.log('🖼️ Text-to-Image:', textToImageProviders.map(p => p.name));
console.log('🎬 Text-to-Video:', textToVideoProviders.map(p => p.name));
console.log('🎵 Text-to-Audio:', textToAudioProviders.map(p => p.name));

// Auto-select best provider (prioritizes free models, then quality)
const bestImageProvider = textToImageProviders[0];
const imageModel = await bestImageProvider.createTextToImageModel();
```

## 🌊 Streaming and Progress Examples

### 📊 Real-time Progress Tracking
```typescript
import { FalAiProvider } from './src/media/providers/falai';

const provider = new FalAiProvider();
const model = await provider.createTextToVideoModel('fal-ai/runway-gen3');

// Transform with progress callbacks
const video = await model.transform('Epic dragon flying over mountains', {
  onProgress: (progress) => {
    console.log(`🔄 Video Generation: ${Math.round(progress * 100)}%`);
    updateProgressBar(progress);
  },
  onQueuePosition: (position) => {
    console.log(`⏳ Queue position: ${position}`);
  },
  onStart: () => {
    console.log('🚀 Video generation started!');
  },
  onComplete: () => {
    console.log('✅ Video generation complete!');
  }
});
```

### 🔄 Streaming Composition Updates
```typescript
import { FFMPEGCompositionBuilder } from './src/media/providers/docker/ffmpeg';

const builder = new FFMPEGCompositionBuilder();

// Build composition with real-time preview
builder
  .compose(mainVideo)
  .addOverlay(overlay1, { position: 'top-left' })
  .onFilterUpdate((filterComplex) => {
    console.log('🔧 Updated filter:', filterComplex);
    showPreview(filterComplex);
  })
  .addOverlay(overlay2, { position: 'top-right' })
  .onValidation((result) => {
    if (!result.isValid) {
      console.error('❌ Validation errors:', result.errors);
    }
  });

const finalVideo = await builder.transform(ffmpegModel);
```

## 🔧 Advanced Configuration Examples

### ⚡ Performance-Optimized Setup
```typescript
import { FalAiProvider, ReplicateProvider, TogetherProvider } from './src/media/providers';
import { FFMPEGProvider } from './src/media/providers/ffmpeg';

// Configure providers with optimization
const providers = [
  new FalAiProvider(),
  new ReplicateProvider(),
  new TogetherProvider(),
  new FFMPEGProvider()
];

// Parallel configuration for speed
await Promise.all(providers.map(provider => 
  provider.configure({
    timeout: 600000,          // 10 minute timeout for large models
    retries: 3,               // Retry failed requests
    concurrency: 2,           // Parallel processing
    cacheDir: './cache',      // Model metadata caching
    maxCacheAge: 86400000     // 24 hour cache
  })
));

// Enable hardware acceleration for FFMPEG
const ffmpegProvider = new FFMPEGProvider();
await ffmpegProvider.configure({
  baseUrl: 'http://localhost:8006',
  hardwareAcceleration: 'nvidia',  // Use GPU acceleration
  codecPreference: 'h264_nvenc'    // Hardware encoding
});
```

### 🌐 Multi-Region Deployment
```typescript
import { ProviderRegistry } from './src/media/registry/ProviderRegistry';

const registry = ProviderRegistry.getInstance();

// Configure providers with region-specific endpoints
await registry.configureProvider('fal-ai', {
  apiKey: process.env.FALAI_API_KEY,
  region: 'us-east-1',
  endpoint: 'https://fal.run/fal-ai'
});

await registry.configureProvider('replicate', {
  apiKey: process.env.REPLICATE_API_TOKEN,
  region: 'us-west-2'
});

// Automatic failover configuration
await registry.enableFailover({
  primaryProvider: 'fal-ai',
  fallbackProviders: ['replicate', 'together'],
  maxRetries: 2,
  timeoutMs: 30000
});
```

## 🎨 Creative Pipeline Examples

### 🎪 AI Content Factory
```typescript
// Complete AI content generation pipeline
class AIContentFactory {
  async createMarketingVideo(topic: string) {
    // 1. Generate script
    const script = await this.openRouter
      .createTextToTextModel('deepseek/deepseek-chat:free')
      .transform(`Create a 30-second marketing script about: ${topic}`);

    // 2. Generate visuals
    const backgroundImage = await this.falAi
      .createTextToImageModel('fal-ai/flux-pro')
      .transform(`Professional ${topic} background, corporate style`);

    // 3. Animate visuals
    const backgroundVideo = await this.falAi
      .createImageToVideoModel('fal-ai/runway-gen3')
      .transform(backgroundImage);

    // 4. Generate voiceover
    const voiceover = await this.together
      .createTextToAudioModel('eleven-labs/eleven-tts')
      .transform(script);

    // 5. Compose final video
    return await new FFMPEGCompositionBuilder()
      .compose(backgroundVideo)
      .addAudioTrack(voiceover)
      .addOverlay(this.brandLogo, { position: 'top-right', opacity: 0.8 })
      .addOverlay(this.callToAction, { position: 'bottom-center', startTime: 25 })
      .transform(this.ffmpegModel);
  }
}

// Usage
const factory = new AIContentFactory();
const marketingVideo = await factory.createMarketingVideo('sustainable energy solutions');
```

### 🎭 Interactive Video Editor
```typescript
// Real-time collaborative video editing
class InteractiveVideoEditor {
  private builder = new FFMPEGCompositionBuilder();
  private collaborators = new Map();

  async addCollaborator(userId: string) {
    this.collaborators.set(userId, {
      permissions: ['edit', 'preview'],
      lastUpdate: Date.now()
    });
  }

  async addAssetWithPermission(userId: string, asset: Video, options: any) {
    if (!this.collaborators.has(userId)) {
      throw new Error('Unauthorized collaborator');
    }

    // Real-time updates to all collaborators
    this.builder.addOverlay(asset, options);
    
    // Broadcast update
    this.broadcastUpdate({
      type: 'asset_added',
      userId,
      asset: asset.metadata,
      options,
      timestamp: Date.now()
    });

    // Generate preview
    const preview = this.builder.preview();
    return { filterComplex: preview, collaborators: this.collaborators.size };
  }

  async renderFinal(): Promise<Video> {
    // Validate permissions
    const hasRenderPermission = Array.from(this.collaborators.values())
      .some(c => c.permissions.includes('render'));

    if (!hasRenderPermission) {
      throw new Error('No collaborator has render permission');
    }

    return await this.builder.transform(this.ffmpegModel);
  }
}
```

## 🚀 Production-Ready Examples

### 🏭 Auto-Scaling Media Pipeline
```typescript
// Production pipeline with auto-scaling
class ProductionMediaPipeline {
  private providers: MediaProvider[] = [];
  private loadBalancer = new LoadBalancer();

  async initialize() {
    // Configure multiple provider instances for load balancing
    const falAiInstances = Array.from({ length: 3 }, () => new FalAiProvider());
    const replicateInstances = Array.from({ length: 2 }, () => new ReplicateProvider());
    
    await Promise.all([
      ...falAiInstances.map(p => p.configure({ apiKey: process.env.FALAI_API_KEY })),
      ...replicateInstances.map(p => p.configure({ apiKey: process.env.REPLICATE_API_TOKEN }))
    ]);

    this.providers = [...falAiInstances, ...replicateInstances];
    this.loadBalancer.addProviders(this.providers);
  }

  async processJob(job: MediaJob): Promise<MediaResult> {
    // Intelligent provider selection based on:
    // - Current load
    // - Model availability  
    // - Cost optimization
    // - Geographic proximity
    
    const provider = await this.loadBalancer.selectOptimalProvider(job);
    
    try {
      return await provider.processJob(job);
    } catch (error) {
      // Automatic failover to next best provider
      const fallbackProvider = await this.loadBalancer.selectFallbackProvider(job, provider);
      return await fallbackProvider.processJob(job);
    }
  }
}

// Usage
const pipeline = new ProductionMediaPipeline();
await pipeline.initialize();

const result = await pipeline.processJob({
  type: 'text-to-video',
  input: 'A beautiful sunset over the ocean',
  priority: 'high',
  deadline: Date.now() + 300000 // 5 minutes
});
```

## 🎯 Ready to Build Something Amazing?

These examples showcase just a fraction of what's possible with Prizm. The platform's unified architecture means you can:

- **Mix and match providers** seamlessly
- **Chain complex operations** with simple, readable code  
- **Handle real-time processing** with progress tracking
- **Scale from prototype to production** without rewriting
- **Extend with new providers** using the same interfaces

Start with a one-liner, build a pipeline, create something epic! 🚀

---

*For more examples and detailed documentation, see:*
- [Quick Start Guide](./getting-started/quick-start-new.md)
- [Provider Documentation](./architecture/provider-system.md)
- [Asset System Guide](./architecture/asset-system.md)
- [Video Composition Tutorial](../N-VIDEO-COMPOSITION-ENHANCEMENT.md)
