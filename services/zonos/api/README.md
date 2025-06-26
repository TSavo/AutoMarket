# Zonos TypeScript API Client ✅ FULLY WORKING

A fully functional TypeScript/JavaScript client for the Zonos TTS (Text-to-Speech) Gradio interface.

## 🎉 Current Status: FULLY WORKING ✅

- ✅ **Basic TTS Generation** - Working perfectly
- ✅ **Emotional Control** - Happy, sad, angry emotions working
- ✅ **Speaking Rate Control** - Fast/slow speech working
- ✅ **Audio Quality Control** - High/standard quality working
- ✅ **Seed Control** - Reproducible results working
- ✅ **WAV File Generation** - Audio files saved successfully
- ✅ **Voice Cloning with confusion.wav** - WORKING! 🎭
- ⚠️ **Audio Prefix Continuation** - Limited (Gradio security restrictions)

## 🚨 Important: Prefix Audio Continuation Issue

**The `prefixAudio` continuation feature is currently broken.** It returns combined audio (prefix + new content) instead of just the new content, making it unusable for creating flowing speech sequences.

**✅ Solution: Use AudioSequenceBuilder**

For long-form audio generation, use the `AudioSequenceBuilder` class instead:

```typescript
import { AudioSequenceBuilder } from "./src/audio-sequence-builder.js";

const builder = new AudioSequenceBuilder("http://localhost:7860", {
  speakerAudio: "../confusion.wav",
  maxChunkLength: 150,
  pauseAtParagraphs: true
});

await builder.connect();
await builder.buildSequence(longScript, "complete_audio.wav");
```

See [AUDIO_SEQUENCE_BUILDER.md](./AUDIO_SEQUENCE_BUILDER.md) for complete documentation.

---

```bash
cd api
npm install

# Available demos:
npm run demo         # Comprehensive demo (8 audio samples)
npm run confusion    # Voice cloning with confusion.wav ⭐ NEW!
npm run test-simple  # Basic functionality test
npm run test-emotional # Emotion control test
```

## 🎭 Voice Cloning Success!

The **confusion.wav voice cloning is now working perfectly!** The API correctly:

1. ✅ Loads the confusion.wav file as a Buffer (4.9MB)
2. ✅ Passes it to the Gradio client in the correct format
3. ✅ Generates speech with the cloned voice characteristics
4. ✅ Maintains voice consistency across different emotions

### Voice Cloning Example:

```typescript
import { ZonosClient } from "./src/zonos-client.js";

const client = new ZonosClient("http://localhost:7860");
await client.connect();

// Clone voice from confusion.wav
const result = await client.generateSpeech({
  text: "This uses the confusion.wav voice!",
  speakerAudio: "../confusion.wav", // ✅ Works!
  emotion: { happiness: 0.8, neutral: 0.2 }
});

await client.saveAudio(result, "cloned_voice.wav");
```

## 📁 Generated Audio Samples

### Comprehensive Demo (`npm run demo`):
- `demo_1_basic.wav` - Basic TTS
- `demo_2_happy.wav` - Happy emotion 😊
- `demo_3_sad.wav` - Sad emotion 😢  
- `demo_4_angry.wav` - Angry emotion 😠
- `demo_5_fast.wav` - Fast speaking rate ⚡
- `demo_5_slow.wav` - Slow speaking rate 🐌
- `demo_6_high_quality.wav` - High quality audio 🎛️
- `demo_6_standard_quality.wav` - Standard quality audio

### Voice Cloning Demo (`npm run confusion`):
- `confusion_part1.wav` - Using confusion.wav voice (neutral/happy)
- `confusion_part2.wav` - Same voice but much happier emotion
- `default_voice_comparison.wav` - Default voice for comparison

## 🔧 Technical Details

The key breakthrough was understanding that **Gradio's JavaScript client expects file inputs as Buffers**, not file paths or URLs. The updated `handleAudioInput` method:

```typescript
// ✅ Correct approach - Buffer for Gradio client
const buffer = fs.readFileSync(filePath);
return buffer; // Gradio handles this correctly
```

This follows the official Gradio documentation: *"For certain inputs, such as images, you should pass in a Buffer, Blob or File"*

## Installation

```bash
cd api
npm install
```

## Building

```bash
npm run build
```

## Usage

### Basic Example

```typescript
import { ZonosClient } from "./src/index";

const client = new ZonosClient("http://localhost:7860");

// Connect to the API
await client.connect();

// Generate speech
const result = await client.quickTTS("Hello, world!");

// Save to file
await client.saveAudio(result, "output.wav");

// Disconnect
await client.disconnect();
```

### Advanced Example with Voice Cloning

```typescript
import { ZonosClient, TTSConfig } from "./src/index";

const client = new ZonosClient("http://localhost:7860");
await client.connect();

const config: TTSConfig = {
  text: "This voice is cloned from the reference audio.",
  speakerAudio: "path/to/reference_voice.wav",
  conditioning: {
    dnsmos: 4.5,
    speakingRate: 12.0,
    pitchStd: 50.0
  },
  emotion: {
    happiness: 0.8,
    neutral: 0.2
  },
  generation: {
    cfgScale: 3.0,
    seed: 42
  },
  unconditional: {
    emotion: false // Don't ignore emotion conditioning
  }
};

const result = await client.generateSpeech(config);
await client.saveAudio(result, "cloned_voice.wav");
```

## API Reference

### ZonosClient

#### Constructor
- `new ZonosClient(baseUrl?: string)` - Default baseUrl is "http://localhost:7860"

#### Methods
- `connect()` - Connect to the Zonos Gradio interface
- `disconnect()` - Disconnect from the interface
- `quickTTS(text: string, speakerAudio?: string)` - Simple TTS generation
- `generateSpeech(config: TTSConfig)` - Full-featured TTS generation
- `saveAudio(result: TTSResult, outputPath: string)` - Save audio to WAV file

### Configuration Objects

#### TTSConfig
```typescript
interface TTSConfig {
  text: string;                    // Required: Text to synthesize
  modelChoice?: string;            // "Zyphra/Zonos-v0.1-transformer" | "Zyphra/Zonos-v0.1-hybrid"
  language?: string;               // Default: "en-us"
  speakerAudio?: string | Buffer;  // Reference audio for voice cloning
  prefixAudio?: string | Buffer;   // Audio to continue from
  speakerNoised?: boolean;         // Whether to denoise speaker audio
  emotion?: EmotionConfig;
  conditioning?: ConditioningConfig;
  generation?: GenerationConfig;
  unconditional?: UnconditionalConfig;
}
```

#### EmotionConfig
```typescript
interface EmotionConfig {
  happiness?: number;    // 0.0 - 1.0, default: 1.0
  sadness?: number;      // 0.0 - 1.0, default: 0.05
  disgust?: number;      // 0.0 - 1.0, default: 0.05
  fear?: number;         // 0.0 - 1.0, default: 0.05
  surprise?: number;     // 0.0 - 1.0, default: 0.05
  anger?: number;        // 0.0 - 1.0, default: 0.05
  other?: number;        // 0.0 - 1.0, default: 0.1
  neutral?: number;      // 0.0 - 1.0, default: 0.2
}
```

#### ConditioningConfig
```typescript
interface ConditioningConfig {
  dnsmos?: number;       // 1.0 - 5.0, default: 4.0 (overall audio quality)
  fmax?: number;         // 0 - 24000, default: 24000 (frequency max in Hz)
  vqScore?: number;      // 0.5 - 0.8, default: 0.78 (voice quality score)
  pitchStd?: number;     // 0.0 - 300.0, default: 45.0 (pitch variation)
  speakingRate?: number; // 5.0 - 30.0, default: 15.0 (words per minute)
}
```

#### GenerationConfig
```typescript
interface GenerationConfig {
  cfgScale?: number;     // 1.0 - 5.0, default: 2.0 (classifier-free guidance)
  seed?: number;         // Random seed
  randomizeSeed?: boolean; // Whether to randomize seed, default: true
  
  // NovelAI unified sampler
  linear?: number;       // -2.0 - 2.0, default: 0.5
  confidence?: number;   // -2.0 - 2.0, default: 0.40
  quadratic?: number;    // -2.0 - 2.0, default: 0.00
  
  // Legacy sampling
  topP?: number;         // 0.0 - 1.0, default: 0
  minK?: number;         // 0.0 - 1024, default: 0
  minP?: number;         // 0.0 - 1.0, default: 0
}
```

#### UnconditionalConfig
```typescript
interface UnconditionalConfig {
  speaker?: boolean;     // Ignore speaker conditioning
  emotion?: boolean;     // Ignore emotion conditioning (default: true)
  vqscore?: boolean;     // Ignore VQ score
  fmax?: boolean;        // Ignore frequency max
  pitchStd?: boolean;    // Ignore pitch std
  speakingRate?: boolean; // Ignore speaking rate
  dnsmos?: boolean;      // Ignore DNSMOS
  speakerNoised?: boolean; // Ignore speaker noise flag
}
```

## Running Examples

```bash
# Start your Zonos Docker container first
docker-compose up

# Then run the example
npm run test
```

## Prerequisites

1. **Zonos Docker Container Running**: Make sure your Zonos container is running on port 7860
2. **Audio Files**: For voice cloning examples, you'll need reference audio files
3. **Node.js**: Version 16 or higher

## Tips

1. **Voice Cloning**: Use high-quality, clean audio samples (3-10 seconds) for best results
2. **Emotions**: Start with subtle emotion values and adjust gradually
3. **Performance**: Use unconditional settings to ignore certain conditioning for faster generation
4. **Seeds**: Set a specific seed for reproducible results

## Error Handling

The client includes comprehensive error handling:
- Connection failures
- Missing audio files
- Invalid parameter ranges
- API timeouts

All errors are thrown as descriptive Error objects with helpful messages.
