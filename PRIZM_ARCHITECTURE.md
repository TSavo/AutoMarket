# PRIZM ARCHITECTURE: Universal Multi-Modal AI Platform

## 🎯 **System Overview**

Prizm is built around the **Universal Role Compatibility** principle where ANY asset can be input to ANY model through automatic provider-based conversions. This creates a unified multi-modal AI platform that's both simple to use and infinitely extensible.

## 🏗️ **Core Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    UNIVERSAL INPUT LAYER                     │
│  TextAsset | VideoAsset | AudioAsset | ImageAsset | ...     │
└─────────────────────┬───────────────────────────────────────┘
                      │ asRole<T>() - Universal Compatibility
┌─────────────────────▼───────────────────────────────────────┐
│                  ROLE TRANSFORMATION                        │  
│  Text↔Audio | Video↔Audio | Text↔Image | Image↔Video | ...  │
│         Provider Discovery & Automatic Conversion           │
└─────────────────────┬───────────────────────────────────────┘
                      │ Unified Role Interfaces  
┌─────────────────────▼───────────────────────────────────────┐
│                   MODEL LAYER                               │
│ ImageToVideo | TextToAudio | VideoToAudio | AudioToText |..│
│              All models accept ANY input                    │
└─────────────────────┬───────────────────────────────────────┘
                      │ Provider Abstraction
┌─────────────────────▼───────────────────────────────────────┐
│                  PROVIDER LAYER                             │
│ OpenAI | Anthropic | Runway | ElevenLabs | FFmpeg | ...    │
│              Unified Provider Interface                     │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 **Universal Role Compatibility Flow**

### **Example: Text → Image → Video Pipeline**

```typescript
// User code (one line!)
const video = await imageToVideoModel.transform(textAsset);
```

**What happens behind the scenes:**

```
1. ImageToVideoModel.transform(textAsset: TextAsset)
   ↓
2. const image = await textAsset.asRole(Image)
   ↓  
3. RoleTransformation.findProvider('text-to-image')
   ↓
4. Provider Discovery: ['dall-e-3', 'midjourney', 'stable-diffusion']
   ↓
5. Best Provider Selected: 'dall-e-3' 
   ↓
6. TextToImageProvider.transform(textAsset) → ImageAsset
   ↓
7. ImageToVideoModel.processImage(imageAsset) → VideoAsset
```

### **Provider Capability Matrix**

```typescript
const CAPABILITY_MAP = {
  'text-to-image': ['dall-e-3', 'midjourney', 'stable-diffusion'],
  'text-to-audio': ['elevenlabs', 'openai-tts', 'azure-speech'],  
  'video-to-audio': ['ffmpeg'],
  'audio-to-text': ['whisper', 'azure-speech-to-text'],
  'image-to-video': ['runway', 'stable-video-diffusion'],
  // ... exponentially growing capabilities
};
```

## 🎭 **Asset Role System**

### **Multi-Role Asset Classes**

Each asset implements multiple role interfaces for maximum compatibility:

```typescript
// TextAsset: Can become ANY other type
class TextAsset extends withVideoRole(
  withImageRole(
    withAudioRole(
      withTextRole(BaseAsset)
    )
  )
) {
  // Conversion capabilities:
  // → Text (identity)
  // → Audio (TTS providers)  
  // → Image (text-to-image providers)
  // → Video (text-to-video or text→image→video)
}

// VideoAsset: Rich extraction capabilities  
class VideoAsset extends withImageRole(
  withAudioRole(
    withVideoRole(BaseAsset)
  )
) {
  // Conversion capabilities:
  // → Video (identity)
  // → Audio (FFmpeg extraction)
  // → Image (frame extraction)
}
```

### **Role Interface Design**

```typescript
interface AudioRole {
  asRole<T>(targetType: AudioConstructor): Promise<Audio>;
  canPlayRole<T>(targetType: AudioConstructor): boolean;
}

interface VideoRole {
  asRole<T>(targetType: VideoConstructor): Promise<Video>;  
  canPlayRole<T>(targetType: VideoConstructor): boolean;
}

// Pattern repeats for Text, Image, and future roles
```

## 🔧 **Provider Architecture**

### **Unified Provider Interface**

```typescript
interface MediaProvider {
  id: string;
  name: string;
  capabilities: MediaCapability[];
  
  // Core transformation method
  transform<TInput, TOutput>(
    input: TInput, 
    capability: MediaCapability,
    options?: any
  ): Promise<TOutput>;
  
  // Health and availability
  isAvailable(): Promise<boolean>;
  testConnection(): Promise<boolean>;
}
```

### **Provider Registry**

```typescript
class ProviderRegistry {
  // Automatic provider discovery
  findBestProvider(criteria: {
    from: RoleType;
    to: RoleType;
    modelId?: string;
    preferences?: ProviderPreferences;
  }): Promise<MediaProvider>;
  
  // Capability checking
  getCapabilities(providerId: string): MediaCapability[];
  
  // Health monitoring
  getHealthyProviders(): Promise<MediaProvider[]>;
}
```

### **Service Architecture: Docker Compose Only**

Prizm's architecture for local services (like FFMPEG, Chatterbox, Whisper) is designed for maximum separation and reliability. Instead of dynamically loading and executing service-specific JavaScript/TypeScript code within the main application, services are defined and managed purely via **Docker Compose**.

- **Service Definition**: Each local service is defined by a `docker-compose.yml` file and a `prizm.service.json` metadata file (specifying service name, health check URL, etc.) within its own repository (e.g., on GitHub) or local directory.
- **`ServiceRegistry` Role**: The `ServiceRegistry` acts as the orchestrator. When a `MediaProvider` requires a local service, it requests it from the `ServiceRegistry` using a simple identifier (e.g., a GitHub URL or local file path). The `ServiceRegistry` then:
    1.  Clones the service's repository (if remote) to a temporary location.
    2.  Reads the `docker-compose.yml` and `prizm.service.json` files.
    3.  Instantiates a `DockerComposeService` (which directly interacts with the Docker daemon) configured with the service's Docker Compose details.
    4.  Returns this `DockerComposeService` instance to the `MediaProvider`.
- **`MediaProvider` Interaction**: The `MediaProvider` then uses the returned `DockerComposeService` instance to manage the lifecycle of the Docker containers (start, stop, check health) and configures its internal API client to communicate with the running Docker service's exposed ports.

This approach ensures:
- **True Separation of Concerns**: The application's core logic is decoupled from service-specific implementation details.
- **Enhanced Security**: No arbitrary external JavaScript/TypeScript code is executed within the main application's process for service management.
- **Simplified Service Definitions**: Services are self-contained Docker Compose units, making them portable and easy to manage.
- **Robustness**: Leverages Docker's native orchestration capabilities for reliable service deployment and management.


## 🎯 **Model Layer Design**

### **Universal Model Pattern**

ALL models follow this pattern for universal compatibility:

```typescript
abstract class BaseModel<TInput, TOptions, TOutput> {
  async transform(input: TInput, options?: TOptions): Promise<TOutput> {
    // 1. Convert ANY input to required type via asRole<T>()
    const converted = await input.asRole(this.getRequiredType());
    
    // 2. Validate conversion
    if (!this.isValidInput(converted)) {
      throw new Error(`Invalid input for ${this.constructor.name}`);
    }
    
    // 3. Process with model-specific logic  
    return await this.processInput(converted, options);
  }
  
  abstract processInput(input: RequiredType, options?: TOptions): Promise<TOutput>;
  abstract getRequiredType(): Constructor;
}
```

### **Example Model Implementations**

```typescript
class ImageToVideoModel extends BaseModel<ImageRole, ImageToVideoOptions, Video> {
  getRequiredType() { return Image; }
  
  async processInput(image: Image, options?: ImageToVideoOptions): Promise<Video> {
    // Model-specific image-to-video logic
    return await this.provider.generateVideo(image, options);
  }
}

class TextToAudioModel extends BaseModel<TextRole, TextToAudioOptions, Audio> {
  getRequiredType() { return Text; }
  
  async processInput(text: Text, options?: TextToAudioOptions): Promise<Audio> {
    // Model-specific text-to-speech logic  
    return await this.provider.synthesizeSpeech(text, options);
  }
}
```

## 🚀 **API Layers**

### **Layer 1: Core SDK**
```typescript
// Maximum control and flexibility
const registry = ProviderRegistry.getInstance();
const provider = await registry.getProvider('elevenlabs');
const model = await provider.createTextToAudioModel('voice-id');
const result = await model.transform(textAsset, options);
```

### **Layer 2: Fluent API**  
```typescript
// Zero-config one-liners with type safety
const audio = await $$("elevenlabs")("voice-id")("Hello world!");
const image = await $$("replicate")("flux-schnell")("A dragon");
```

### **Layer 3: REST API**
```typescript
// Language-agnostic HTTP interface
POST /api/v1/transform/elevenlabs/voice-id
{
  "capability": "text-to-audio",
  "input": "Hello world!",
  "options": { "voice_settings": { "speed": 1.2 } }
}
```

## 🔮 **Extensibility & Future Growth**

### **Adding New Providers**
```typescript
// New provider automatically enhances ALL assets
class NewAmazingProvider implements MediaProvider {
  capabilities = ['text-to-3d', 'audio-to-video'];
  
  async transform(input: any, capability: string): Promise<any> {
    // Provider-specific implementation
  }
}

// Registration makes it available system-wide
ProviderRegistry.register(new NewAmazingProvider());

// Now ALL text assets can generate 3D models!
// Now ALL audio assets can generate videos!
```

### **Exponential Capability Growth**

With N providers and M capabilities each:
- **Total Capabilities**: N × M
- **Asset Compatibility**: Each new provider enhances ALL asset types
- **Model Flexibility**: Each new capability benefits ALL models

**Example**: Adding a new "Text → 3D" provider instantly enables:
- Text → 3D models
- Video → Text → 3D (via OCR)  
- Audio → Text → 3D (via transcription)
- Image → Text → 3D (via OCR)

## 🎯 **Key Architectural Principles**

### **1. Universal Compatibility**
Any asset can be input to any model through automatic conversions.

### **2. Provider Abstraction**  
Models don't know or care about specific providers - the system handles routing.

### **3. Type Safety**
Full TypeScript support with intelligent error messages.

### **4. Composability**
Everything works with everything through standardized interfaces.

### **5. Extensibility**
New providers/capabilities enhance the entire system.

### **6. Performance**
Efficient provider discovery and caching for production use.

## 🎪 **Real-World Impact**

This architecture enables:

- **Content Creators**: Complex media pipelines in single lines of code
- **AI Agents**: Universal media processing capabilities 
- **Developers**: No provider lock-in, consistent APIs across all services
- **Enterprises**: Reliable, scalable, provider-agnostic media infrastructure
- **Researchers**: Easy experimentation with different models and providers

## 🏆 **Result**

**A truly universal, multi-modal AI platform** where the only limit is imagination! 🚀
