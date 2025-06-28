# 🔧 TypeScript Migration Guide

This guide documents the recent TypeScript fixes and patterns you should use when working with Prizm providers.

## 🚨 Common Issues Fixed

### 1. **Text Class Constructor**

**❌ Old Pattern (Broken):**
```typescript
const text = new Text("hello world");
```

**✅ New Pattern (Correct):**
```typescript
const text = Text.fromString("hello world");
```

**Why?** The `Text` class constructor has specific parameters and `Text.fromString()` is the correct factory method.

### 2. **Promise Handling in Fluent API**

**❌ Old Pattern (Broken):**
```typescript
const result = await provider("model-id")(input);
```

**✅ New Pattern (Correct):**
```typescript
const result = await (await provider("model-id"))(input);
```

**Why?** The `provider("model-id")` call returns a Promise that needs to be awaited before calling the resulting function.

### 3. **Text Input Handling in Providers**

**❌ Old Pattern (Broken):**
```typescript
async transform(input: TextRole | string) {
  let textRole: TextRole;
  if (typeof input === 'string') {
    textRole = new Text(input);
  } else {
    textRole = input;
  }
  
  if (!textRole.isValid()) {
    throw new Error('Invalid text');
  }
  
  const content = textRole.content;
}
```

**✅ New Pattern (Correct):**
```typescript
async transform(input: TextRole | string) {
  const inputRole = Array.isArray(input) ? input[0] : input;
  
  let text: Text;
  if (typeof inputRole === 'string') {
    text = Text.fromString(inputRole);
  } else {
    text = await inputRole.asText();
  }
  
  if (!text.isValid()) {
    throw new Error('Invalid text');
  }
  
  const content = text.content;
}
```

**Why?** This pattern properly handles both string and TextRole inputs, uses the correct Text factory method, and maintains consistent variable naming.

### 4. **Audio Metadata Requirements**

**❌ Old Pattern (Missing format):**
```typescript
const audio = new Audio(buffer, textRole, {
  processingTime: 1000,
  provider: 'elevenlabs'
});
```

**✅ New Pattern (With required format):**
```typescript
const audio = new Audio(buffer, textRole, {
  format: 'mp3',  // Required!
  processingTime: 1000,
  provider: 'elevenlabs'
});
```

**Why?** The `AudioMetadata` interface requires a `format` property.

### 5. **Provider Model Interface Compliance**

**❌ Old Pattern (Missing parameters):**
```typescript
const models = provider.models.map(m => ({
  id: m.id,
  name: m.name,
  capabilities: m.capabilities
}));
```

**✅ New Pattern (Complete interface):**
```typescript
const models = provider.models.map(m => ({
  id: m.id,
  name: m.name,
  capabilities: m.capabilities,
  parameters: m.parameters || {}  // Required!
}));
```

**Why?** The `ProviderModel` interface requires a `parameters` property.

## 🔍 Import Fixes

### Missing Text Import

Many provider files were missing the `Text` import:

```typescript
// Add this import
import { TextRole, Audio, Text } from '../../assets/roles';
```

### Proper Import Structure

```typescript
// Core model imports
import { TextToAudioModel, TextToAudioOptions } from '../../models/abstracts/TextToAudioModel';
import { ModelMetadata } from '../../models/abstracts/Model';

// Asset role imports (include Text!)
import { Audio, TextRole, Text } from '../../assets/roles';

// Provider-specific imports
import { ElevenLabsClient } from './ElevenLabsClient';
```

## 🛠️ Provider Implementation Template

Use this template for creating new text-to-audio providers:

```typescript
import { TextToAudioModel, TextToAudioOptions } from '../../models/abstracts/TextToAudioModel';
import { ModelMetadata } from '../../models/abstracts/Model';
import { Audio, TextRole, Text } from '../../assets/roles';

export class MyTextToAudioModel extends TextToAudioModel {
  constructor(config: MyModelConfig) {
    const metadata: ModelMetadata = {
      id: config.modelId,
      name: config.name,
      // ... other metadata
    };
    super(metadata);
  }

  async transform(input: TextRole | TextRole[] | string | string[], options?: MyOptions): Promise<Audio> {
    // Standard input handling pattern
    const inputRole = Array.isArray(input) ? input[0] : input;
    
    let text: Text;
    if (typeof inputRole === 'string') {
      text = Text.fromString(inputRole);
    } else {
      text = await inputRole.asText();
    }
    
    if (!text.isValid()) {
      throw new Error('Invalid text data provided');
    }

    try {
      // Your provider logic here
      const audioBuffer = await this.generateAudio(text.content, options);
      
      return new Audio(audioBuffer, text, {
        format: 'mp3',  // Required!
        processingTime: Date.now() - startTime,
        provider: 'myprovider',
        // ... other metadata
      });
    } catch (error) {
      throw new Error(`Audio generation failed: ${error.message}`);
    }
  }
}
```

## 🧪 Test File Fixes

### Fluent API Test Pattern

**❌ Old Pattern:**
```typescript
const model = provider("model-id");
const result = await model(input);
```

**✅ New Pattern:**
```typescript
const model = await provider("model-id");
const result = await model(input);
```

### Method Chaining Test Pattern

**❌ Old Pattern:**
```typescript
const result = await provider.model("model-id").transform(input);
```

**✅ New Pattern:**
```typescript
const result = await (await provider.model("model-id")).transform(input);
```

## 🎯 Files Fixed

The following files were updated with these patterns:

**Core Providers:**
- `ElevenLabsTextToAudioModel.ts` ✅
- `OpenAITextToTextModel.ts` ✅  
- `OpenAITextToAudioModel.ts` ✅
- `CreatifyTextToAudioModel.ts` ✅
- `CreatifyTextToVideoModel.ts` ✅
- `ZonosTextToAudioModel.ts` ✅
- `FalTextToAudioModel.ts` ✅
- `ReplicateTextToImageModel.ts` ✅
- `HuggingFaceDockerModel.ts` ✅

**Test Files:**
- `test-direct-syntax.ts` ✅
- `test-enhanced-fluent.ts` ✅
- `test-fluent-api.ts` ✅
- `test-fluent-success.ts` ✅
- `test-simple-fluent.ts` ✅

**Utility Files:**
- `fluentWrappers.ts` ✅

## 🎉 Result

- **Before**: 23 TypeScript errors across 6 files
- **After**: 0 errors! 

All providers now compile cleanly and follow consistent patterns. The fluent API works correctly with proper Promise handling.

## 🚀 Best Practices

1. **Always use `Text.fromString()`** for string-to-Text conversion
2. **Always await provider calls** in fluent API: `await (await provider("model"))`
3. **Include required properties** like `format` in metadata
4. **Import `Text` class** in all provider files
5. **Use consistent input handling** pattern in transform methods
6. **Handle both string and TextRole inputs** properly
7. **Add proper error handling** with meaningful messages

Follow these patterns for any new providers or modifications to ensure TypeScript compliance!
