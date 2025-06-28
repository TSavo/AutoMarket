# MediaTransformer API Reference

## 🎯 Overview

The MediaTransformer interface provides a unified API for all media transformations in the Prizm system. This document provides comprehensive API documentation with examples and best practices.

## 📋 Interface Definition

```typescript
interface MediaTransformer {
  readonly id: string;
  readonly name: string;
  readonly type: 'local' | 'remote';
  readonly transforms: TransformCapability[];
  
  transform(input: MediaInput, outputType: MediaType, options?: any): Promise<MediaOutput>;
  isAvailable(): Promise<boolean>;
  getInfo(): ServiceInfo;
}
```

## 🔧 Core Methods

### transform()

Performs media transformation from input to output format.

```typescript
transform(
  input: MediaInput, 
  outputType: MediaType, 
  options?: TransformOptions
): Promise<MediaOutput>
```

**Parameters**:
- `input`: The media content to transform
- `outputType`: Desired output media type
- `options`: Transformation-specific options

**Returns**: Promise resolving to transformed media output

**Throws**:
- `InvalidInputError`: Invalid input type or format
- `ServiceUnavailableError`: Service not ready
- `TransformationError`: Transformation failed

**Example**:
```typescript
const input = {
  type: 'text' as const,
  data: 'Hello, world!'
};

const output = await transformer.transform(input, 'audio', {
  outputFormat: 'mp3',
  speed: 1.2
});

console.log(`Generated ${output.data.length} bytes of audio`);
```

### isAvailable()

Checks if the service is available and ready to process requests.

```typescript
isAvailable(): Promise<boolean>
```

**Returns**: Promise resolving to availability status

**Example**:
```typescript
if (await transformer.isAvailable()) {
  console.log('Service is ready');
} else {
  console.log('Service is not available');
}
```

### getInfo()

Returns service information and capabilities.

```typescript
getInfo(): ServiceInfo
```

**Returns**: Service information object

**Example**:
```typescript
const info = transformer.getInfo();
console.log(`Service: ${info.name} (${info.id})`);
console.log(`Transforms: ${info.transforms.length}`);
```

## 📊 Data Types

### MediaInput

```typescript
interface MediaInput {
  type: MediaType;
  data: string | Buffer | Uint8Array;
  metadata?: MediaMetadata;
}
```

**Properties**:
- `type`: Media type ('text', 'audio', 'image', 'video')
- `data`: Media content (file path, buffer, or string)
- `metadata`: Optional metadata about the media

**Examples**:
```typescript
// Text input
const textInput: MediaInput = {
  type: 'text',
  data: 'Hello, world!'
};

// Audio file input
const audioInput: MediaInput = {
  type: 'audio',
  data: '/path/to/audio.wav',
  metadata: {
    filename: 'audio.wav',
    duration: 10.5
  }
};

// Buffer input
const bufferInput: MediaInput = {
  type: 'audio',
  data: audioBuffer,
  metadata: {
    mimeType: 'audio/wav',
    size: audioBuffer.length
  }
};
```

### MediaOutput

```typescript
interface MediaOutput {
  type: MediaType;
  data: string | Buffer | Uint8Array;
  metadata?: MediaMetadata;
}
```

**Properties**:
- `type`: Output media type
- `data`: Transformed content
- `metadata`: Processing metadata

**Example**:
```typescript
{
  type: 'audio',
  data: Buffer.from(audioData),
  metadata: {
    duration: 3.2,
    processingTime: 1500,
    format: 'mp3',
    service: 'chatterbox-tts'
  }
}
```

### TransformCapability

```typescript
interface TransformCapability {
  input: MediaType;
  output: MediaType;
  description: string;
  options?: OptionDefinition;
}
```

**Properties**:
- `input`: Supported input type
- `output`: Supported output type
- `description`: Human-readable description
- `options`: Available transformation options

**Example**:
```typescript
{
  input: 'text',
  output: 'audio',
  description: 'Convert text to speech using neural TTS',
  options: {
    speed: {
      type: 'number',
      default: 1.0,
      description: 'Speech speed multiplier'
    },
    outputFormat: {
      type: 'string',
      default: 'mp3',
      description: 'Audio output format'
    }
  }
}
```

### ServiceInfo

```typescript
interface ServiceInfo {
  id: string;
  name: string;
  type: 'local' | 'remote';
  version?: string;
  description?: string;
  transforms: TransformCapability[];
  status?: ServiceStatus;
}
```

**Example**:
```typescript
{
  id: 'chatterbox-tts',
  name: 'Chatterbox TTS',
  type: 'local',
  version: '2.0.2',
  description: 'High-quality neural text-to-speech',
  transforms: [{
    input: 'text',
    output: 'audio',
    description: 'Convert text to speech'
  }],
  status: 'running'
}
```

## 🎵 Service-Specific APIs

### ChatterboxTTSDockerService

#### Additional Methods

```typescript
class ChatterboxTTSDockerService implements MediaTransformer {
  // Generate TTS to file
  generateTTS(
    text: string, 
    outputPath?: string, 
    options?: TTSOptions
  ): Promise<TTSResult>;
  
  // Upload reference audio for voice cloning
  uploadReferenceAudio(filePath: string): Promise<string>;
}
```

#### TTSOptions

```typescript
interface TTSOptions {
  outputFormat?: 'mp3' | 'wav';
  speed?: number;                    // 0.5 - 2.0
  temperature?: number;              // 0.0 - 1.0
  exaggeration?: number;             // 0.0 - 1.0
  cfg_weight?: number;               // 0.0 - 1.0
  voice_mode?: 'predefined' | 'cloned';
  predefined_voice_id?: string;
  reference_audio?: string;
  language?: string;
  onProgress?: (progress: ProgressInfo) => void;
}
```

#### TTSResult

```typescript
interface TTSResult {
  success: boolean;
  audioPath?: string;
  duration?: number;
  processingTime: number;
  error?: string;
}
```

**Example**:
```typescript
const ttsService = new ChatterboxTTSDockerService();

// Generate TTS with options
const result = await ttsService.generateTTS(
  'Hello from Chatterbox TTS!',
  './output/hello.mp3',
  {
    outputFormat: 'mp3',
    speed: 1.2,
    temperature: 0.7,
    onProgress: (progress) => {
      console.log(`${progress.progress}% - ${progress.message}`);
    }
  }
);

if (result.success) {
  console.log(`Generated: ${result.audioPath}`);
  console.log(`Duration: ${result.duration} seconds`);
} else {
  console.error(`Failed: ${result.error}`);
}
```

### WhisperSTTService

#### Additional Methods

```typescript
class WhisperSTTService implements MediaTransformer {
  // Transcribe audio file
  transcribeAudio(
    audioPath: string, 
    options?: WhisperOptions
  ): Promise<TranscriptionResult>;
}
```

#### WhisperOptions

```typescript
interface WhisperOptions {
  model?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  language?: string;
  wordTimestamps?: boolean;
  temperature?: number;
  onProgress?: (progress: ProgressInfo) => void;
}
```

#### TranscriptionResult

```typescript
interface TranscriptionResult {
  transcription: string;
  confidence: number;
  processingTime: number;
  language?: string;
  segments?: TranscriptionSegment[];
}
```

**Example**:
```typescript
const whisperService = new WhisperSTTService();

// Transcribe audio
const result = await whisperService.transcribeAudio(
  './audio/speech.wav',
  {
    model: 'base',
    language: 'en',
    wordTimestamps: true
  }
);

console.log(`Transcription: ${result.transcription}`);
console.log(`Confidence: ${result.confidence}`);
```

## 🔄 Progress Monitoring

### ProgressInfo Interface

```typescript
interface ProgressInfo {
  progress: number;                  // 0-100 percentage
  message: string;                   // Status message
  stage?: string;                    // Processing stage
  estimatedTimeRemaining?: number;   // Milliseconds
  currentStep?: number;              // Current step
  totalSteps?: number;               // Total steps
}
```

### Progress Callback Usage

```typescript
const progressCallback = (progress: ProgressInfo) => {
  const percentage = progress.progress.toFixed(1);
  const eta = progress.estimatedTimeRemaining 
    ? `ETA: ${Math.round(progress.estimatedTimeRemaining / 1000)}s`
    : '';
  
  console.log(`${percentage}% - ${progress.message} ${eta}`);
  
  // Update UI progress bar
  updateProgressBar(progress.progress);
};

const result = await transformer.transform(input, 'audio', {
  onProgress: progressCallback
});
```

## 🛡️ Error Handling

### Error Types

```typescript
// Base transformation error
class TransformationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'TransformationError';
  }
}

// Input validation error
class InvalidInputError extends TransformationError {
  constructor(expected: MediaType, received: MediaType) {
    super(`Expected ${expected} input, received ${received}`);
    this.name = 'InvalidInputError';
  }
}

// Service availability error
class ServiceUnavailableError extends TransformationError {
  constructor(serviceName: string) {
    super(`${serviceName} service is not available`);
    this.name = 'ServiceUnavailableError';
  }
}

// Timeout error
class TransformationTimeoutError extends TransformationError {
  constructor(timeoutMs: number) {
    super(`Transformation timed out after ${timeoutMs}ms`);
    this.name = 'TransformationTimeoutError';
  }
}
```

### Error Handling Best Practices

```typescript
async function safeTransform(
  transformer: MediaTransformer,
  input: MediaInput,
  outputType: MediaType
): Promise<MediaOutput | null> {
  try {
    // Check availability first
    if (!(await transformer.isAvailable())) {
      console.warn(`${transformer.name} is not available`);
      return null;
    }
    
    // Perform transformation
    return await transformer.transform(input, outputType);
    
  } catch (error) {
    if (error instanceof InvalidInputError) {
      console.error('Invalid input:', error.message);
    } else if (error instanceof ServiceUnavailableError) {
      console.error('Service unavailable:', error.message);
    } else if (error instanceof TransformationTimeoutError) {
      console.error('Transformation timed out:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
    
    return null;
  }
}
```

## 🧪 Testing MediaTransformers

### Mock Implementation

```typescript
class MockMediaTransformer implements MediaTransformer {
  readonly id = 'mock-transformer';
  readonly name = 'Mock Transformer';
  readonly type = 'local';
  readonly transforms = [{
    input: 'text',
    output: 'audio',
    description: 'Mock transformation'
  }];
  
  async transform(input: MediaInput, outputType: MediaType): Promise<MediaOutput> {
    return {
      type: outputType,
      data: Buffer.from('mock-data'),
      metadata: {
        processingTime: 100,
        service: this.id
      }
    };
  }
  
  async isAvailable(): Promise<boolean> {
    return true;
  }
  
  getInfo(): ServiceInfo {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      transforms: this.transforms
    };
  }
}
```

### Test Utilities

```typescript
// Create test media input
function createTestInput(type: MediaType, data: any): MediaInput {
  return { type, data };
}

// Validate media output
function validateOutput(output: MediaOutput, expectedType: MediaType): void {
  expect(output.type).toBe(expectedType);
  expect(output.data).toBeDefined();
  expect(output.metadata).toBeDefined();
}

// Test transformation
async function testTransformation(
  transformer: MediaTransformer,
  input: MediaInput,
  outputType: MediaType
): Promise<void> {
  const output = await transformer.transform(input, outputType);
  validateOutput(output, outputType);
}
```

---

**Next**: [LocalServiceManager API](./local-service-manager.md)
