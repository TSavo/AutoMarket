# 🎯 Prizm - One-Liner Magic & Quick Examples

The most elegant media transformation SDK ever built! Prizm makes complex AI operations as simple as a single function call while providing unlimited scalability and customization through its layered architecture.

## ⚡ The Ultimate One-Liners

### 🖼️ **Instant Image Generation**
```typescript
// Fluent API - zero configuration required
const image = await $("replicate")("flux-schnell")('Cyberpunk cat with neon eyes');
const proImage = await $("falai")("flux-pro")('Professional headshot', { steps: 4 });
```

### 🎬 **Instant Video Generation**  
```typescript
// One line from text to video
const video = await $("runway")("gen-3")('Dragon flying through clouds');
const animation = await $("replicate")("animate")(heroImage, { duration: 5 });
```

### 🎵 **Instant Audio Generation**
```typescript
// Text to speech in one line - local or remote
const audio = await $("chatterbox")("voice-clone")('Welcome to the future!');
const speech = await $("huggingface")("mms-tts")('Professional narration');
```

### 🗣️ **Instant Speech Recognition**
```typescript
// Video to transcript in one line  
const transcript = await AssetLoader.load('video.mp4').asSpeech().transcribe();
```

### 🎨 **Instant Style Transfer**
```typescript
// Apply artistic style in one line
const styled = await $("replicate")("style-transfer")(photo, { style: 'van-gogh' });
```

### 🔄 **Instant Format Conversion**
```typescript
// Convert any media format with smart loading
const mp3 = await AssetLoader.load('video.mp4').asAudio().convertTo('mp3');
```

### 🎛️ **Instant Audio Processing**
```typescript
// Convert and enhance audio in one line
const enhanced = await (await new FFMPEGProvider().createAudioToAudioModel()).transform(audioFile, { outputFormat: 'flac', normalize: true, denoise: true });
```

### 🌍 **Instant Translation + Voice**
```typescript
// Translate and speak in one line
const voice = await (await new OpenRouterProvider().createTextToTextModel()).transform('Hello').then(text => 
  new TogetherProvider().createTextToAudioModel().transform(text, { language: 'spanish' }));
```

### 🎭 **Instant Video Composition**
```typescript
// Compose videos with overlays in one line
const final = await new FFMPEGCompositionBuilder().compose(main).addOverlay(logo).transform(ffmpegModel);
```

## 🚀 Quick Start Examples (2-3 Lines)

### 🎪 **Multi-Provider Pipeline**
```typescript
// Use 3 different AI providers in sequence
const script = await (await new OpenRouterProvider().createTextToTextModel('deepseek/deepseek-chat:free')).transform('Write a product description');
const image = await (await new FalAiProvider().createTextToImageModel('flux-pro')).transform(script);
const video = await (await new ReplicateProvider().createImageToVideoModel('runway-gen3')).transform(image);
```

### 🎨 **Creative Content Factory**
```typescript
// Generate complete marketing asset set
const [logo, background, video] = await Promise.all([
  (await new HuggingFaceProvider().createTextToImageModel()).transform('Modern tech logo'),
  (await new FalAiProvider().createTextToImageModel()).transform('Professional background'),
  (await new TogetherProvider().createTextToAudioModel()).transform('Welcome to our platform')
]);
```

### 🌊 **Smart Asset Processing**
```typescript
// Load any file, get all capabilities automatically
const asset = AssetLoader.load('unknown-file.mp4');
const [video, audio, transcript] = await Promise.all([asset.asVideo(), asset.asAudio(), asset.asSpeech().transcribe()]);
```

### 🎬 **Advanced Video Composition**
```typescript
// Professional video editing in 2 lines
const builder = new FFMPEGCompositionBuilder().prepend(intro).compose(main).append(outro);
const final = await builder.addOverlay(logo, {position: 'top-right', colorKey: '#000000'}).transform(ffmpegModel);
```

## 🎯 Provider-Specific Quick Examples

### 🤖 **FAL.ai - Premium AI Models**
```typescript
// Text to image (best quality)
const image = await (await new FalAiProvider().createTextToImageModel('fal-ai/flux-pro')).transform('Epic sunset');

// Text to video (cinematic)
const video = await (await new FalAiProvider().createTextToVideoModel('runway-gen3')).transform('Waves crashing');

// Image to video (animation)
const animated = await (await new FalAiProvider().createImageToVideoModel()).transform(staticImage);

// Text to audio (voice generation)
const speech = await (await new FalAiProvider().createTextToAudioModel()).transform('Hello world');
```

### 🔄 **Replicate - Model Variety**
```typescript
// Style transfer
const styled = await (await new ReplicateProvider().createImageToImageModel('style-transfer')).transform(photo);

// Video enhancement
const enhanced = await (await new ReplicateProvider().createVideoToVideoModel('enhance')).transform(lowResVideo);

// Background removal
const cutout = await (await new ReplicateProvider().createImageToImageModel('remove-bg')).transform(portrait);

// Upscaling
const upscaled = await (await new ReplicateProvider().createImageToImageModel('esrgan')).transform(image, {scale: 4});
```

### 🆓 **OpenRouter - Free LLMs**
```typescript
// Free text generation
const text = await (await new OpenRouterProvider().createTextToTextModel('deepseek/deepseek-chat:free')).transform('Explain AI');

// Free code generation
const code = await (await new OpenRouterProvider().createTextToTextModel('qwen/qwen-2.5-coder-32b-instruct:free')).transform('Write Python function');

// Free creative writing
const story = await (await new OpenRouterProvider().createTextToTextModel('meta-llama/llama-3.3-70b-instruct:free')).transform('Write short story');

// Free analysis
const analysis = await (await new OpenRouterProvider().createTextToTextModel('google/gemma-2-9b-it:free')).transform('Analyze this data');
```

### 🤗 **HuggingFace - Any Model**
```typescript
// Any text-to-image model
const image = await (await new HuggingFaceProvider().createTextToImageModel('black-forest-labs/FLUX.1-dev')).transform('Space cat');

// Any text generation model  
const text = await (await new HuggingFaceProvider().createTextToTextModel('microsoft/DialoGPT-large')).transform('Hello');

// Any speech model
const audio = await (await new HuggingFaceProvider().createTextToAudioModel('facebook/mms-tts-eng')).transform('Hi there');

// Zero configuration - just the model name!
const result = await (await new HuggingFaceProvider().createTextToImageModel('stabilityai/stable-diffusion-xl-base-1.0')).transform('Futuristic city');
```

### 🏢 **Enterprise Providers**
```typescript
// OpenAI GPT-4
const response = await (await new OpenAIProvider().createTextToTextModel('gpt-4')).transform('Business strategy');

// Anthropic Claude
const analysis = await (await new AnthropicProvider().createTextToTextModel('claude-3-opus')).transform('Analyze market trends');

// Google Gemini
const insights = await (await new GoogleProvider().createTextToTextModel('gemini-pro')).transform('Technical insights');

// Azure OpenAI (Enterprise)
const report = await (await new AzureOpenAIProvider().createTextToTextModel('gpt-4')).transform('Generate report');
```

## 🎬 Local Docker Services

### 🎞️ **FFMPEG Video Processing**
```typescript
// Professional video editing locally
const composed = await new FFMPEGCompositionBuilder()
  .compose(mainVideo)
  .addOverlay(logoVideo, {position: 'top-right', colorKey: '#000000'})
  .transform(ffmpegModel);

// Extract metadata
const metadata = await (await new FFMPEGProvider().createVideoModel()).getMetadata('video.mp4');

// Convert formats
const mp4 = await (await new FFMPEGProvider().createVideoModel()).convert('input.avi', 'mp4');
```

### 🎵 **FFMPEG Audio Processing**
```typescript
// Convert audio formats locally
const wav = await (await new FFMPEGProvider().createAudioToAudioModel()).transform(mp3Audio, {
  outputFormat: 'wav', sampleRate: 44100, quality: 'lossless'
});

// Apply audio effects
const enhanced = await (await new FFMPEGProvider().createAudioToAudioModel()).transform(audio, {
  normalize: true, denoise: true, volume: 1.2, reverb: { roomSize: 0.8 }
});

// Extract audio segments
const segment = await (await new FFMPEGProvider().createAudioToAudioModel()).transform(longAudio, {
  startTime: 60, duration: 30, fadeIn: 2, fadeOut: 2
});
```

### 🗣️ **Chatterbox TTS (Voice Cloning)**
```typescript
// Clone voice and generate speech
const clonedVoice = await (await new ChatterboxProvider().createTextToAudioModel()).cloneVoice('sample.wav');
const speech = await clonedVoice.transform('This is my cloned voice!');

// Multiple languages
const spanish = await (await new ChatterboxProvider().createTextToAudioModel()).transform('Hola mundo', {language: 'es'});
```

### 👂 **Whisper STT (Multi-Language)**
```typescript
// Transcribe any language
const transcript = await (await new WhisperProvider().createSpeechToTextModel()).transform(audioFile);

// With timestamps
const timestamped = await (await new WhisperProvider().createSpeechToTextModel()).transform(audioFile, {timestamps: true});

// Specific language
const spanish = await (await new WhisperProvider().createSpeechToTextModel()).transform(audioFile, {language: 'es'});
```

## 🎨 Creative One-Liner Combinations

### 🌈 **Chain Multiple Providers**
```typescript
// OpenRouter → FAL.ai → Replicate → FFMPEG (4 providers, 1 line!)
const epic = await new FFMPEGCompositionBuilder().compose(
  await (await new ReplicateProvider().createImageToVideoModel()).transform(
    await (await new FalAiProvider().createTextToImageModel()).transform(
      await (await new OpenRouterProvider().createTextToTextModel('deepseek/deepseek-chat:free')).transform('Describe epic scene')
    )
  )
).transform(ffmpegModel);
```

### 🎪 **Parallel Multi-Provider**
```typescript
// Generate 5 variations using 5 different providers simultaneously
const variations = await Promise.all([
  (await new FalAiProvider().createTextToImageModel()).transform('Sunset'),
  (await new ReplicateProvider().createTextToImageModel()).transform('Sunset'),
  (await new HuggingFaceProvider().createTextToImageModel()).transform('Sunset'),
  (await new OpenAIProvider().createTextToImageModel()).transform('Sunset'),
  (await new TogetherProvider().createTextToImageModel()).transform('Sunset')
]);
```

### 🔄 **Auto-Fallback Chain**
```typescript
// Try providers in order until one succeeds
const image = await getBestTextToImageProvider().then(p => p.createTextToImageModel()).then(m => m.transform('Cat'))
  .catch(() => new FalAiProvider().createTextToImageModel().then(m => m.transform('Cat')))
  .catch(() => new ReplicateProvider().createTextToImageModel().then(m => m.transform('Cat')));
```

### 🎨 **Style Transfer Chain**
```typescript
// Apply multiple style transfers in sequence  
const styled = await [vanGoghStyle, picassoStyle, monetStyle].reduce(async (img, style) =>
  (await new ReplicateProvider().createImageToImageModel()).transform(await img, {style}), 
  Promise.resolve(originalImage)
);
```

## 🚀 Advanced One-Liners

### 🌍 **Multi-Language Content**
```typescript
// Generate content in 5 languages simultaneously
const global = await Promise.all(['en', 'es', 'fr', 'de', 'ja'].map(lang =>
  (await new TogetherProvider().createTextToAudioModel()).transform('Welcome!', {language: lang})
));
```

### 🎭 **A/B Testing**
```typescript
// Generate A/B test variations
const abTest = await Promise.all(['professional', 'casual', 'energetic'].map(style =>
  (await new FalAiProvider().createTextToImageModel()).transform('Product photo', {style})
));
```

### 🔊 **Audio Processing Chain**
```typescript
// Extract → Enhance → Transcribe → Translate → Synthesize (complete audio pipeline)
const result = await (await new TogetherProvider().createTextToAudioModel()).transform(
  await (await new OpenRouterProvider().createTextToTextModel()).transform(
    await (await new WhisperProvider().createSpeechToTextModel()).transform(
      await (await new FFMPEGProvider().createAudioToAudioModel()).transform(
        await (await AssetLoader.load('video.mp4')).asAudio(), 
        { normalize: true, denoise: true }
      )
    ), {translate: 'spanish'}
  ), {language: 'es'}
);
```

### 🎚️ **Audio Enhancement Pipeline**
```typescript
// Multi-stage audio enhancement using FFMPEG
const professional = await (await new FFMPEGProvider().createAudioToAudioModel()).transform(
  await (await new FFMPEGProvider().createAudioToAudioModel()).transform(
    await (await new FFMPEGProvider().createAudioToAudioModel()).transform(rawAudio, 
      { denoise: true, normalize: false }), // Step 1: Denoise
    { normalize: true, volume: 1.1 }), // Step 2: Normalize and adjust volume
  { outputFormat: 'flac', sampleRate: 96000, quality: 'lossless' } // Step 3: High-quality output
);
```

### 🎬 **Video Analysis + Enhancement**
```typescript
// Analyze quality → Generate improvements → Apply enhancements
const enhanced = await (await new ReplicateProvider().createVideoToVideoModel()).transform(originalVideo, 
  JSON.parse(await (await new OpenRouterProvider().createTextToTextModel()).transform(
    `Analyze this video and suggest enhancements: ${originalVideo.getMetadata()}`
  ))
);
```

## 🎯 Use Case One-Liners

### 📱 **Social Media Content**
```typescript
// Instagram post
const instaPost = await (await new FalAiProvider().createTextToImageModel()).transform('Product shot', {aspect: '1:1', style: 'instagram'});

// TikTok video
const tiktok = await (await new FalAiProvider().createTextToVideoModel()).transform('Trending dance', {aspect: '9:16', duration: 15});

// YouTube thumbnail
const thumbnail = await (await new FalAiProvider().createTextToImageModel()).transform('Click-worthy thumbnail', {aspect: '16:9', style: 'youtube'});
```

### 💼 **Business Content**
```typescript
// Logo generation
const logo = await (await new HuggingFaceProvider().createTextToImageModel()).transform('Modern tech startup logo', {transparent: true});

// Product mockup
const mockup = await (await new ReplicateProvider().createImageToImageModel()).transform(productPhoto, {style: 'professional-mockup'});

// Presentation slide
const slide = await (await new FalAiProvider().createTextToImageModel()).transform('Data visualization slide', {aspect: '16:9'});
```

### 🎓 **Educational Content**
```typescript
// Explainer video
const explainer = await (await new FalAiProvider().createTextToVideoModel()).transform('How photosynthesis works', {style: 'educational'});

// Diagram
const diagram = await (await new HuggingFaceProvider().createTextToImageModel()).transform('Scientific process diagram', {style: 'educational'});

// Narration
const narration = await (await new TogetherProvider().createTextToAudioModel()).transform('Lesson explanation', {voice: 'teacher'});
```

### 🎮 **Gaming Content**
```typescript
// Game asset
const asset = await (await new FalAiProvider().createTextToImageModel()).transform('Fantasy sword icon', {style: 'game-asset'});

// Character design
const character = await (await new ReplicateProvider().createTextToImageModel()).transform('RPG character design', {style: 'game-art'});

// Background music
const bgm = await (await new TogetherProvider().createTextToAudioModel()).transform('Epic adventure music', {style: 'orchestral'});
```

## 🎉 Why One-Liners Are Powerful

### ⚡ **Instant Prototyping**
Test ideas immediately without complex setup or configuration.

### 🔄 **Easy Experimentation**  
Try different providers and models with minimal code changes.

### 🚀 **Rapid Development**
Go from concept to working prototype in minutes, not hours.

### 🌊 **Seamless Scaling**
Start with one-liners, gradually expand to complex pipelines.

### 🎯 **Provider Agnostic**
Switch between providers without changing your application logic.

## 🎬 Ready to Create Magic?

These one-liners are just the beginning! Each simple command opens the door to unlimited creative possibilities. Start with a one-liner, then expand into multi-provider pipelines, real-time collaboration, and enterprise-scale media processing.

**From one line of code to Hollywood-level productions! 🎭✨**

---

*For more advanced examples:*
- [Provider Showcase](./PROVIDER_SHOWCASE.md)
- [Awesome Examples](./AWESOME_EXAMPLES.md)
- [Quick Start Guide](./getting-started/quick-start-new.md)
