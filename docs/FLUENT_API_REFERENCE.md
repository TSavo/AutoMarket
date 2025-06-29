# 🎯 Fluent API Complete Reference

Prizm's Fluent API provides the most elegant syntax for AI media transformations. We now offer **two syntax patterns** for maximum flexibility and consistency, plus **dynamic provider loading**.

## 🌐 **NEW: Dynamic Provider Loading (June 2025)**

### **Dynamic Provider Syntax**
```typescript
import { getProvider, $$ } from 'prizm';

// Load providers dynamically
const customProvider = await getProvider('github:company/ai-provider@v1.0.0');
const enterpriseProvider = await getProvider('@company/enterprise-ai@2.1.0');

// Use with fluent syntax
const result = await $$(customProvider)("custom-model")(input, options);

// Or with provider ID after loading
const result = await $$("custom-provider")("model")(input);
```

### **Dynamic Provider with Services**
```typescript
// Provider loads its service dependency
const provider = await getProvider('github:lab/research-provider@latest');

await provider.configure({
  serviceUrl: 'github:lab/gpu-inference-service@v2.0.0',
  serviceConfig: { enableQuantum: true, memory: '32GB' }
});

// Use like any built-in provider
const result = await $$(provider)("quantum-model")(input);
```

### **Environment-Specific Providers**
```typescript
// Load different providers per environment
const providerId = process.env.NODE_ENV === 'production'
  ? '@company/production-ai@stable'
  : 'github:company/dev-ai@main';

const provider = await getProvider(providerId);
const result = await $$(provider)("model")(input);
```

## 🚀 **Syntax Patterns**

### **🆕 Single Await Pattern (Recommended)**
```typescript
import { $$ } from 'prizm';

// Pattern: await $$("provider")("model")(input, options)
const speech = await $$("elevenlabs")("voice-id")("Hello world!");
const image = await $$("replicate")("flux-schnell")("Beautiful sunset");
const video = await $$("runway")("gen-3")("Dancing robot");
```

### **🔄 Double Await Pattern (Legacy)**
```typescript
import { $ } from 'prizm';

// Pattern: await (await $("provider")("model"))(input, options)
const speech = await (await $("elevenlabs")("voice-id"))("Hello world!");
const image = await (await $("replicate")("flux-schnell"))("Beautiful sunset");
const video = await (await $("runway")("gen-3"))("Dancing robot");
```

### **Model Storage Pattern (Both Versions)**
```typescript
// Single await version
const ttsModel = $$("elevenlabs")("voice-id");
const speech1 = await ttsModel("First message");
const speech2 = await ttsModel("Second message");

// Double await version  
const imageModel = await $("replicate")("flux-schnell");
const image1 = await imageModel("First image prompt");
const image2 = await imageModel("Second image prompt");
```

### **Traditional Transform Syntax**
```typescript
// Core SDK pattern (most explicit)
const provider = await $("elevenlabs");
const model = await provider.model("voice-id");
const result = await model.transform(Text.fromString("Hello world!"), {
  voice_settings: { stability: 0.8 }
});
```

## 🏭 **Provider-Specific Examples**

### **ElevenLabs (Text-to-Speech)**
```typescript
// Single await (cleanest)
const speech = await $$("elevenlabs")("voice-id")("Hello!");

// With options
const speech = await $$("elevenlabs")("voice-id")("Hello!", {
  voice_settings: {
    stability: 0.8,
    similarity_boost: 0.9
  }
});

// Double await (legacy)
const turbo = await (await $("elevenlabs")("voice-id"))("Fast speech", {
  model_id: "eleven_turbo_v2"
});
```

### **Replicate (Image/Video Generation)**
```typescript
// Single await
const image = await $$("replicate")("flux-schnell")("Cyberpunk cat");
const video = await $$("replicate")("runway-gen3")("Waves crashing");

// Double await  
const animation = await (await $("replicate")("animate"))(imageAsset, {
  duration: 5
});
```

### **OpenRouter (Text Processing)**
```typescript
// Single await
const enhanced = await $$("openrouter")("llama-free")(
  "Simple text",
  { system: "Enhance this text", temperature: 0.8 }
);

// Double await
const translated = await (await $("openrouter")("llama-free"))(
  "Hello world",
  { system: "Translate to Spanish" }
);
```

### **FAL.ai (Premium AI)**
```typescript
// Premium image generation
const image = await (await $("falai")("flux-pro"))("Professional headshot");

// Audio generation
const audio = await (await $("falai")("xtts-v2"))("Hello world!");

// Video generation
const video = await (await $("falai")("runway-gen3"))("Epic battle scene");
```

### **Docker Services (Local)**
```typescript
// Zonos voice cloning
const cloned = await (await $("zonos")("tts"))("Hello in my voice!", {
  speakerAudio: "./my-voice.wav"
});

// Chatterbox TTS
const speech = await (await $("chatterbox")("default"))("Local speech");

// HuggingFace models
const tts = await (await $("huggingface")("speecht5"))("Open source TTS");
```

## 🔗 **Pipeline Patterns**

### **Sequential Processing**
```typescript
// Script → Speech → Video pipeline
const script = await (await $("openrouter")("llama-free"))(
  "Write a product demo script",
  { system: "You are a marketing copywriter" }
);

const voiceover = await (await $("elevenlabs")("professional-voice"))(
  script.content
);

const video = await (await $("replicate")("runway-gen3"))(
  "Product demonstration video"
);
```

### **Parallel Processing**
```typescript
// Generate multiple assets in parallel
const [speech, image, video] = await Promise.all([
  (await $("elevenlabs")("voice-id"))("Product description"),
  (await $("replicate")("flux-schnell"))("Product image"),
  (await $("runway")("gen-3"))("Product demo video")
]);
```

### **Fallback Chains**
```typescript
async function reliableGeneration(prompt: string) {
  try {
    return await (await $("elevenlabs")("premium-voice"))(prompt);
  } catch (error) {
    console.log('ElevenLabs failed, trying local...');
    return await (await $("chatterbox")("default"))(prompt);
  }
}
```

## 🎛️ **Advanced Patterns**

### **Dynamic Provider Selection**
```typescript
function getProvider(quality: 'fast' | 'premium') {
  return quality === 'premium' ? 'elevenlabs' : 'chatterbox';
}

const speech = await (await $(getProvider('premium'))("voice-id"))("Hello!");
```

### **Configuration Builder**
```typescript
class PipelineBuilder {
  private provider: string;
  private model: string;
  
  setProvider(provider: string) {
    this.provider = provider;
    return this;
  }
  
  setModel(model: string) {
    this.model = model;
    return this;
  }
  
  async execute(input: string, options?: any) {
    return await (await $(this.provider)(this.model))(input, options);
  }
}

// Usage
const result = await new PipelineBuilder()
  .setProvider('elevenlabs')
  .setModel('voice-id')
  .execute("Hello world!");
```

### **Batch Processing**
```typescript
async function batchTTS(texts: string[], voiceId: string) {
  const model = await $("elevenlabs")(voiceId);
  
  return Promise.all(
    texts.map(text => model(text))
  );
}

const speeches = await batchTTS([
  "First message",
  "Second message", 
  "Third message"
], "voice-id");
```

## 🛡️ **Error Handling Patterns**

### **Try-Catch with Fallback**
```typescript
async function robustTTS(text: string) {
  try {
    return await (await $("elevenlabs")("premium-voice"))(text);
  } catch (error) {
    if (error.message.includes('quota')) {
      console.log('Quota exceeded, using local TTS');
      return await (await $("chatterbox")("default"))(text);
    }
    throw error;
  }
}
```

### **Provider Health Check**
```typescript
async function healthyProvider(providers: string[]) {
  for (const provider of providers) {
    try {
      const instance = await $(provider);
      const isHealthy = await instance.getHealth();
      if (isHealthy.status === 'healthy') {
        return provider;
      }
    } catch (error) {
      console.log(`${provider} unhealthy:`, error.message);
    }
  }
  throw new Error('No healthy providers available');
}

const provider = await healthyProvider(['elevenlabs', 'chatterbox']);
const speech = await (await $(provider)("model-id"))("Hello!");
```

## 📊 **Performance Tips**

### **Model Reuse**
```typescript
// ❌ Inefficient (creates new model each time)
for (const text of texts) {
  const speech = await (await $("elevenlabs")("voice-id"))(text);
}

// ✅ Efficient (reuse model)
const model = await $("elevenlabs")("voice-id");
for (const text of texts) {
  const speech = await model(text);
}
```

### **Provider Caching**
```typescript
const providerCache = new Map();

async function getCachedProvider(name: string) {
  if (!providerCache.has(name)) {
    providerCache.set(name, await $(name));
  }
  return providerCache.get(name);
}

const elevenlabs = await getCachedProvider('elevenlabs');
const voice = await elevenlabs("voice-id");
```

## 🎯 **Provider Availability**

| Provider | Status | Capabilities | Example |
|----------|--------|--------------|---------|
| `elevenlabs` | ✅ Ready | Text-to-Audio | `$("elevenlabs")("voice-id")` |
| `replicate` | ✅ Ready | Text-to-Image, Text-to-Video | `$("replicate")("flux-schnell")` |
| `openrouter` | ✅ Ready | Text-to-Text | `$("openrouter")("llama-free")` |
| `falai` | ✅ Ready | Text-to-Image, Text-to-Audio, Text-to-Video | `$("falai")("flux-pro")` |
| `creatify` | ✅ Ready | Text-to-Audio, Text-to-Video | `$("creatify")("avatar-model")` |
| `zonos` | ✅ Ready | Text-to-Audio (Voice Cloning) | `$("zonos")("tts")` |
| `chatterbox` | ✅ Ready | Text-to-Audio (Local) | `$("chatterbox")("default")` |
| `huggingface` | ✅ Ready | Text-to-Image, Text-to-Audio | `$("huggingface")("speecht5")` |
| `whisper` | ✅ Ready | Audio-to-Text | `$("whisper")("base")` |

## 🎉 **Success!**

You now have complete mastery of Prizm's Fluent API! These patterns enable you to create powerful AI media pipelines with minimal code while maintaining full flexibility and error handling.
