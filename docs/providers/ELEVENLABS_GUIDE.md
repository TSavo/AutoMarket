# 🎤 ElevenLabs Integration Guide

The ElevenLabs provider gives you access to premium text-to-speech capabilities with natural-sounding voices.

## 🚀 Quick Start

### 1. Get Your API Key

1. Sign up at [ElevenLabs](https://elevenlabs.io)
2. Go to your profile → API Keys
3. Create a new API key
4. Set environment variable:

```bash
export ELEVENLABS_API_KEY="your_api_key_here"
```

### 2. Basic Usage

```typescript
import { $ } from 'prizm';

// Simple text-to-speech
const speech = await (await $("elevenlabs")("voice-id"))("Hello world!");

console.log(`Generated ${speech.format} audio: ${speech.data.length} bytes`);
```

### 3. Core SDK Usage

```typescript
import { ElevenLabsProvider, Text } from 'prizm';

const provider = new ElevenLabsProvider();
await provider.configure({ 
  apiKey: process.env.ELEVENLABS_API_KEY 
});

const model = await provider.createTextToAudioModel('voice-id');
const speech = await model.transform(Text.fromString("Hello world!"), {
  voice_settings: {
    stability: 0.75,
    similarity_boost: 0.8
  }
});
```

## 🎯 Advanced Features

### Voice Selection

```typescript
// List available voices
const provider = new ElevenLabsProvider();
const model = await provider.createTextToAudioModel('any-voice-id');
const voices = await model.getAvailableVoices();

console.log('Available voices:', voices);

// Use specific voice
const speech = await (await $("elevenlabs")("specific-voice-id"))("Hello!");
```

### Voice Settings

```typescript
const speech = await model.transform(Text.fromString("Hello world!"), {
  model_id: "eleven_turbo_v2",
  voice_settings: {
    stability: 0.8,        // 0.0 - 1.0 (more variable vs more stable)
    similarity_boost: 0.9, // 0.0 - 1.0 (low vs high similarity)
    style: 0.2,           // 0.0 - 1.0 (more monotone vs more expressive)
    use_speaker_boost: true
  }
});
```

### Long Text Handling

```typescript
const longText = Text.fromString(`
  This is a very long text that needs to be processed.
  ElevenLabs will handle it automatically and generate
  high-quality speech for the entire content.
`);

const speech = await model.transform(longText, {
  model_id: "eleven_turbo_v2"  // Faster for long texts
});
```

## 🏭 Production Tips

### Error Handling

```typescript
try {
  const speech = await (await $("elevenlabs")("voice-id"))("Hello!");
  console.log('Success!', speech.format);
} catch (error) {
  if (error.message.includes('quota')) {
    console.log('ElevenLabs quota exceeded, fallback to local TTS');
    // Fallback to local provider
    const backup = await (await $("chatterbox")("default"))("Hello!");
  } else {
    console.error('ElevenLabs error:', error.message);
  }
}
```

### Cost Optimization

```typescript
// Use faster/cheaper model for less critical content
const speech = await model.transform(text, {
  model_id: "eleven_turbo_v2"  // Faster and cheaper
});

// Use premium model for important content
const premiumSpeech = await model.transform(text, {
  model_id: "eleven_multilingual_v2"  // Higher quality
});
```

### Caching Results

```typescript
import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';

async function cachedTTS(text: string, voiceId: string) {
  const hash = createHash('md5').update(`${text}-${voiceId}`).digest('hex');
  const cachePath = `./cache/${hash}.mp3`;
  
  if (existsSync(cachePath)) {
    console.log('Using cached audio');
    return { data: readFileSync(cachePath), format: 'mp3' };
  }
  
  const speech = await (await $("elevenlabs")(voiceId))(text);
  writeFileSync(cachePath, speech.data);
  
  return speech;
}
```

## 🎬 Multi-Provider Workflows

### ElevenLabs + OpenRouter Pipeline

```typescript
// Generate script with AI, then create speech
const script = await (await $("openrouter")("llama-free"))(
  "Write a 30-second product demo script", 
  { system: "You are a marketing copywriter" }
);

const voiceover = await (await $("elevenlabs")("professional-voice"))(
  script.content
);

console.log('Generated script and voiceover!');
```

### Fallback Chain

```typescript
async function reliableTTS(text: string) {
  try {
    // Try premium ElevenLabs first
    return await (await $("elevenlabs")("premium-voice"))(text);
  } catch (error) {
    console.log('ElevenLabs failed, trying local TTS...');
    try {
      // Fallback to local Chatterbox
      return await (await $("chatterbox")("default"))(text);
    } catch (error2) {
      // Final fallback to HuggingFace
      return await (await $("huggingface")("speecht5"))(text);
    }
  }
}
```

## 📊 Provider Information

- **Type**: Remote API
- **Capabilities**: Text-to-Audio
- **Output Format**: MP3
- **Max Text Length**: 10,000 characters
- **Voice Cloning**: Not supported (use Zonos for voice cloning)
- **Languages**: 29+ languages supported
- **Models**: 
  - `eleven_monolingual_v1` (English only, high quality)
  - `eleven_turbo_v2` (Fast, multilingual)
  - `eleven_multilingual_v2` (Premium, multilingual)

## 🔗 Related Providers

- **Zonos**: Voice cloning capabilities
- **Chatterbox**: Local TTS alternative  
- **HuggingFace**: Open source TTS models
- **Creatify**: AI avatar with voice

## 🎉 Success!

You now have premium text-to-speech capabilities integrated into your Prizm workflow! ElevenLabs provides the highest quality voice generation for professional applications.
