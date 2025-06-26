# AudioSequenceBuilder - Default Parameters

## 🎛️ Current Default Parameters Used

Here's what the AudioSequenceBuilder uses for all TTS generation:

### 📊 **Conditioning Parameters (Audio Quality)**
```typescript
conditioning: {
  dnsmos: 4.5,        // Overall audio quality (1.0-5.0, default: 4.0)
  fmax: 24000,        // Frequency max in Hz (0-24000, default: 24000) 
  vqScore: 0.75,      // Voice quality score (0.5-0.8, default: 0.78)
  pitchStd: 40.0,     // Pitch variation (0.0-300.0, default: 45.0)
  speakingRate: 13.0  // Words per minute (5.0-30.0, default: 15.0)
}
```

### 🎯 **Generation Parameters (Output Control)**
```typescript
generation: {
  cfgScale: 2.8,      // Classifier-free guidance (1.0-5.0, default: 2.0)
  randomizeSeed: false, // Use fixed seed for consistency
  baseSeed: 90000,    // Starting seed (same for all chunks)
  
  // NovelAI unified sampler defaults:
  linear: 0.5,        // Default: 0.5
  confidence: 0.40,   // Default: 0.40  
  quadratic: 0.00,    // Default: 0.00
  
  // Legacy sampling defaults:
  topP: 0,            // Default: 0
  minK: 0,            // Default: 0
  minP: 0             // Default: 0
}
```

### 🎭 **Emotion Parameters**
```typescript
emotion: {
  happiness: 0.5,     // Default: 1.0
  neutral: 0.5,       // Default: 0.2
  // All others default to small values (0.05)
}
```

## 🔧 Key Points About Parameters:

### **Fmax (Frequency Maximum):**
- **Default used**: `24000 Hz` (from ZonosClient default)
- **Purpose**: Controls the maximum frequency range of generated audio
- **Range**: 0-24000 Hz
- **Higher values**: More frequency detail, potentially better quality
- **Lower values**: More compressed sound, faster generation

### **Audio Quality Settings:**
- **DNSMOS**: `4.5` (higher than default 4.0 for better quality)
- **VQ Score**: `0.75` (slightly lower than default 0.78 for more natural sound)
- **Speaking Rate**: `13.0` (slightly faster than default 15.0)
- **Pitch Std**: `40.0` (slightly less variation than default 45.0)

### **Generation Settings:**
- **CFG Scale**: `2.8` (higher than default 2.0 for better adherence to conditioning)
- **Same Seed**: All chunks use identical seed for maximum voice consistency

## ⚙️ Customizing Parameters

You can override any of these when creating the AudioSequenceBuilder:

```typescript
const builder = new AudioSequenceBuilder("http://localhost:7860", {
  speakerAudio: "../confusion.wav",
  voice: {
    conditioning: {
      fmax: 22050,        // Lower frequency range
      dnsmos: 5.0,        // Maximum quality
      speakingRate: 10.0, // Slower speech
      pitchStd: 30.0      // Less pitch variation
    },
    generation: {
      cfgScale: 3.5,      // Stronger conditioning adherence
      baseSeed: 12345     // Custom seed
    },
    emotion: {
      happiness: 0.8,     // More happy
      neutral: 0.2        // Less neutral
    }
  }
});
```

## 🎧 Parameter Impact on Audio:

- **Higher Fmax**: More detailed audio, larger file sizes
- **Higher DNSMOS**: Better overall quality but slower generation
- **Lower Speaking Rate**: Slower, more deliberate speech
- **Lower Pitch Std**: More monotone voice
- **Higher CFG Scale**: Stronger adherence to voice characteristics
- **Same Seed**: Consistent voice across all chunks

The current defaults provide a good balance of **quality**, **consistency**, and **generation speed** for most use cases.
