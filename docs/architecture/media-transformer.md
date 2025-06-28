# MediaTransformer Interface

## 🎯 Overview

The MediaTransformer interface is the cornerstone of the Prizm Media Transformation System. It provides a unified, type-safe API for all media transformations, ensuring consistency across different service implementations within the provider→model→transform architecture.

## 📋 Interface Definition

```typescript
interface MediaTransformer {
  // Service identification
  readonly id: string;
  readonly name: string;
  readonly type: 'local' | 'remote';
  readonly transforms: TransformCapability[];
  
  // Core transformation method
  transform(
    input: MediaInput, 
    outputType: MediaType, 
    options?: TransformOptions
  ): Promise<MediaOutput>;
  
  // Service availability
  isAvailable(): Promise<boolean>;
  
  // Service information
  getInfo(): ServiceInfo;
}
```

## 🔧 Core Types

### MediaInput

```typescript
interface MediaInput {
  type: MediaType;
  data: string | Buffer | Uint8Array;
  metadata?: {
    filename?: string;
    mimeType?: string;
    size?: number;
    duration?: number;
    [key: string]: any;
  };
}
```

**Supported Types**:
- `'text'`: Plain text content
- `'audio'`: Audio files (MP3, WAV, etc.)
- `'image'`: Image files (PNG, JPEG, etc.)
- `'video'`: Video files (MP4, AVI, etc.)

### MediaOutput

```typescript
interface MediaOutput {
  type: MediaType;
  data: string | Buffer | Uint8Array;
  metadata?: {
    processingTime?: number;
    confidence?: number;
    format?: string;
    size?: number;
    duration?: number;
    service?: string;
    [key: string]: any;
  };
}
```

### TransformCapability

```typescript
interface TransformCapability {
  input: MediaType;
  output: MediaType;
  description: string;
  options?: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean';
      default?: any;
      description?: string;
    };
  };
}
```

## 🎵 Implementation Examples

### WhisperSTTService (Audio → Text)

```typescript
class WhisperSTTService implements MediaTransformer {
  readonly id = 'whisper';
  readonly name = 'Whisper STT';
  readonly type = 'local';
  readonly transforms = [{
    input: 'audio',
    output: 'text',
    description: 'Convert speech to text using OpenAI Whisper'
  }];

  async transform(
    input: MediaInput, 
    outputType: MediaType
  ): Promise<MediaOutput> {
    // Validate input type
    if (input.type !== 'audio') {
      throw new Error(`WhisperSTTService only supports audio input, received: ${input.type}`);
    }
    
    // Validate output type
    if (outputType !== 'text') {
      throw new Error(`WhisperSTTService only outputs text, requested: ${outputType}`);
    }
    
    // Ensure service is available
    if (!(await this.isAvailable())) {
      throw new Error('Whisper service is not available');
    }
    
    // Perform transcription
    const result = await this.transcribeAudio(input.data as string);
    
    return {
      type: 'text',
      data: result.transcription,
      metadata: {
        confidence: result.confidence,
        processingTime: result.processingTime,
        service: 'whisper'
      }
    };
  }
}
```

### ChatterboxTTSDockerService (Text → Audio)

```typescript
class ChatterboxTTSDockerService implements MediaTransformer {
  readonly id = 'chatterbox-tts';
  readonly name = 'Chatterbox TTS';
  readonly type = 'local';
  readonly transforms = [{
    input: 'text',
    output: 'audio',
    description: 'Convert text to speech using Chatterbox TTS'
  }];

  async transform(
    input: MediaInput, 
    outputType: MediaType,
    options?: TTSOptions
  ): Promise<MediaOutput> {
    // Validate input/output types
    if (input.type !== 'text') {
      throw new Error(`ChatterboxTTSDockerService only supports text input`);
    }
    
    if (outputType !== 'audio') {
      throw new Error(`ChatterboxTTSDockerService only outputs audio`);
    }
    
    // Generate audio
    const result = await this.generateTTS(
      input.data as string,
      undefined, // Use temporary file
      options
    );
    
    if (!result.success) {
      throw new Error(`TTS generation failed: ${result.error}`);
    }
    
    // Read generated audio file
    const audioBuffer = fs.readFileSync(result.audioPath!);
    
    return {
      type: 'audio',
      data: audioBuffer,
      metadata: {
        duration: result.duration,
        processingTime: result.processingTime,
        format: options?.outputFormat || 'mp3',
        service: 'chatterbox-tts'
      }
    };
  }
}
```

## 🔄 Transform Options

### Common Options

```typescript
interface BaseTransformOptions {
  // Progress callback for long-running operations
  onProgress?: (progress: ProgressInfo) => void;
  
  // Timeout for the operation (milliseconds)
  timeout?: number;
  
  // Quality settings
  quality?: 'low' | 'medium' | 'high';
}
```

### Service-Specific Options

#### WhisperSTTService Options

```typescript
interface WhisperOptions extends BaseTransformOptions {
  // Whisper model to use
  model?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  
  // Language hint (auto-detect if not specified)
  language?: string;
  
  // Enable word-level timestamps
  wordTimestamps?: boolean;
}
```

#### ChatterboxTTSDockerService Options

```typescript
interface TTSOptions extends BaseTransformOptions {
  // Output audio format
  outputFormat?: 'mp3' | 'wav';
  
  // Speech speed multiplier
  speed?: number;
  
  // Voice selection
  voice?: string;
  
  // Audio quality settings
  temperature?: number;
  exaggeration?: number;
  cfg_weight?: number;
}
```

## 📊 Progress Monitoring

### ProgressInfo Interface

```typescript
interface ProgressInfo {
  progress: number;        // 0-100 percentage
  message: string;         // Human-readable status
  stage?: string;          // Current processing stage
  estimatedTimeRemaining?: number; // Milliseconds
}
```

### Usage Example

```typescript
const result = await ttsService.transform(
  { type: 'text', data: 'Hello world' },
  'audio',
  {
    onProgress: (progress) => {
      console.log(`${progress.progress}% - ${progress.message}`);
    }
  }
);
```

## 🛡️ Error Handling

### Standard Error Types

```typescript
// Input validation errors
class InvalidInputError extends Error {
  constructor(expected: MediaType, received: MediaType) {
    super(`Expected ${expected} input, received ${received}`);
  }
}

// Service availability errors
class ServiceUnavailableError extends Error {
  constructor(serviceName: string) {
    super(`${serviceName} service is not available`);
  }
}

// Transformation errors
class TransformationError extends Error {
  constructor(message: string, public readonly details?: any) {
    super(message);
  }
}
```

### Error Handling Best Practices

```typescript
async transform(input: MediaInput, outputType: MediaType): Promise<MediaOutput> {
  try {
    // Validate inputs
    this.validateInput(input, outputType);
    
    // Check service availability
    if (!(await this.isAvailable())) {
      throw new ServiceUnavailableError(this.name);
    }
    
    // Perform transformation
    return await this.performTransformation(input, outputType);
    
  } catch (error) {
    // Log error for debugging
    console.error(`[${this.id}] Transformation failed:`, error);
    
    // Re-throw with context
    if (error instanceof TransformationError) {
      throw error;
    }
    
    throw new TransformationError(
      `${this.name} transformation failed: ${error.message}`,
      { originalError: error }
    );
  }
}
```

## 🧪 Testing MediaTransformers

### Unit Test Example

```typescript
describe('WhisperSTTService', () => {
  let service: WhisperSTTService;
  
  beforeEach(() => {
    service = new WhisperSTTService();
  });
  
  test('should validate input types', async () => {
    const invalidInput = { type: 'image' as const, data: 'test' };
    
    await expect(service.transform(invalidInput, 'text'))
      .rejects.toThrow('WhisperSTTService only supports audio input');
  });
  
  test('should validate output types', async () => {
    const validInput = { type: 'audio' as const, data: '/path/to/audio.wav' };
    
    await expect(service.transform(validInput, 'image' as any))
      .rejects.toThrow('WhisperSTTService only outputs text');
  });
});
```

### Integration Test Example

```typescript
describe('ChatterboxTTSDockerService Integration', () => {
  test('should generate audio from text', async () => {
    const service = new ChatterboxTTSDockerService();
    
    const input = { type: 'text' as const, data: 'Hello world' };
    const result = await service.transform(input, 'audio');
    
    expect(result.type).toBe('audio');
    expect(result.data).toBeInstanceOf(Buffer);
    expect(result.metadata?.duration).toBeGreaterThan(0);
  });
});
```

## 🚀 Adding New MediaTransformers

### Step 1: Implement the Interface

```typescript
class NewTransformerService implements MediaTransformer {
  readonly id = 'new-transformer';
  readonly name = 'New Transformer';
  readonly type = 'local';
  readonly transforms = [/* capabilities */];
  
  async transform(input: MediaInput, outputType: MediaType): Promise<MediaOutput> {
    // Implementation
  }
  
  async isAvailable(): Promise<boolean> {
    // Check if service is ready
  }
  
  getInfo(): ServiceInfo {
    // Return service information
  }
}
```

### Step 2: Add Docker Management (if needed)

```typescript
class NewTransformerService implements MediaTransformer, LocalServiceManager {
  private dockerService: DockerComposeService;
  
  constructor() {
    this.dockerService = new DockerComposeService(
      'new-service-container',
      path.join(__dirname, '../../../services/new-service/docker-compose.yml')
    );
  }
  
  // Implement LocalServiceManager methods
}
```

### Step 3: Create Tests

```typescript
// Unit tests
describe('NewTransformerService', () => {
  // Test business logic
});

// Integration tests
describe('NewTransformerService Integration', () => {
  // Test with real service
});
```

---

**Next**: [Docker Self-Management](./docker-management.md)
