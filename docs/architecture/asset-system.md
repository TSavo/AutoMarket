# Asset & Role System Architecture

## 🎯 Overview

The AutoMarket Asset & Role System provides intelligent, format-agnostic media loading with automatic capability detection. The system uses role-based mixins to dynamically add functionality to assets based on their format, enabling type-safe transformations across different media types.

## 🏗️ Core Architecture

### Smart Asset Factory

The `SmartAssetFactory` and `AssetLoader` provide the main entry point for loading media assets:

```typescript
// Single entry point for any media format
const asset = AssetLoader.load('video.mp4');  // Auto-detects as Video + Audio
const video = await asset.asVideo();           // Access video functionality
const audio = await asset.asAudio();           // Extract audio via FFMPEG
```

### Role-Based Design

Assets are enhanced with roles based on their format capabilities:

```
Format Detection → Role Assignment → Capability Enhancement
     .mp4       →  Video + Audio   →   Video methods + Audio extraction
     .mp3       →  Audio + Speech  →   Audio methods + Speech recognition
     .png       →  Image           →   Image methods + Manipulation
     .txt       →  Text            →   Text methods + Processing
```

## 🎭 Role System

### Core Role Interfaces

#### AudioRole
```typescript
interface AudioRole {
  asAudio(): Promise<Audio>;
  getDuration(): Promise<number>;
  getSampleRate(): Promise<number>;
  getChannels(): Promise<number>;
  getBitrate(): Promise<number>;
  
  // Audio transformations
  changeSpeed(factor: number): Promise<Audio>;
  changeVolume(factor: number): Promise<Audio>;
  extractSegment(start: number, duration: number): Promise<Audio>;
}
```

#### VideoRole
```typescript
interface VideoRole {
  asVideo(): Promise<Video>;
  getDuration(): Promise<number>;
  getResolution(): Promise<{ width: number; height: number }>;
  getFrameRate(): Promise<number>;
  
  // Video transformations
  extractAudio(): Promise<Audio>;        // Video → Audio via FFmpeg
  extractFrame(timestamp: number): Promise<Image>;
  resize(width: number, height: number): Promise<Video>;
  crop(x: number, y: number, width: number, height: number): Promise<Video>;
}
```

#### TextRole
```typescript
interface TextRole {
  asText(): Promise<Text>;
  getContent(): Promise<string>;
  getLanguage(): Promise<string>;
  getWordCount(): Promise<number>;
  
  // Text transformations
  toSpeech(voice?: string): Promise<Audio>;
  translate(targetLanguage: string): Promise<Text>;
  summarize(maxLength?: number): Promise<Text>;
}
```

#### ImageRole
```typescript
interface ImageRole {
  asImage(): Promise<Image>;
  getDimensions(): Promise<{ width: number; height: number }>;
  getFormat(): Promise<string>;
  getColorSpace(): Promise<string>;
  
  // Image transformations
  resize(width: number, height: number): Promise<Image>;
  crop(x: number, y: number, width: number, height: number): Promise<Image>;
  convertFormat(format: string): Promise<Image>;
}
```

### Role Mixins

Roles are applied using TypeScript mixins for dynamic capability enhancement:

```typescript
// Mixin implementations
export function withAudioRole<T extends Constructor<BaseAsset>>(Base: T) {
  return class extends Base implements AudioRole {
    async asAudio(): Promise<Audio> {
      return new Audio(this.path, await this.getAudioMetadata());
    }
    
    async getDuration(): Promise<number> {
      const metadata = await this.getAudioMetadata();
      return metadata.duration;
    }
    
    async extractSegment(start: number, duration: number): Promise<Audio> {
      // Use FFMPEG to extract audio segment
      const ffmpegProvider = getFFMPEGProvider();
      return await ffmpegProvider.extractAudioSegment(this.path, start, duration);
    }
  };
}
```

## 📁 Format Registry

The system maintains a comprehensive registry of supported formats:

```typescript
const FORMAT_REGISTRY: Record<string, FormatInfo> = {
  // Audio formats - can play audio and speech roles
  mp3: { 
    extension: 'mp3', 
    mimeType: 'audio/mpeg', 
    category: 'audio', 
    roles: ['audio', 'speech'] 
  },
  wav: { 
    extension: 'wav', 
    mimeType: 'audio/wav', 
    category: 'audio', 
    roles: ['audio', 'speech'] 
  },
  
  // Video formats - can play video, audio, and speech roles
  mp4: { 
    extension: 'mp4', 
    mimeType: 'video/mp4', 
    category: 'video', 
    roles: ['video', 'audio', 'speech'] 
  },
  avi: { 
    extension: 'avi', 
    mimeType: 'video/x-msvideo', 
    category: 'video', 
    roles: ['video', 'audio', 'speech'] 
  },
  
  // Image formats - can play image role
  png: { 
    extension: 'png', 
    mimeType: 'image/png', 
    category: 'image', 
    roles: ['image'] 
  },
  jpg: { 
    extension: 'jpg', 
    mimeType: 'image/jpeg', 
    category: 'image', 
    roles: ['image'] 
  },
  
  // Text formats - can play text role
  txt: { 
    extension: 'txt', 
    mimeType: 'text/plain', 
    category: 'text', 
    roles: ['text'] 
  },
  md: { 
    extension: 'md', 
    mimeType: 'text/markdown', 
    category: 'text', 
    roles: ['text'] 
  }
};
```

## 🔧 Asset Creation Flow

### 1. Format Detection
```typescript
export function detectFormatFromPath(filePath: string): FormatInfo | null {
  const extension = path.extname(filePath).toLowerCase().substring(1);
  return FORMAT_REGISTRY[extension] || null;
}
```

### 2. Role Assignment
```typescript
export function createAssetWithRoles(filePath: string, metadata: AssetMetadata): BaseAsset & AnyRole {
  const formatInfo = detectFormatFromPath(filePath);
  if (!formatInfo) {
    throw new Error(`Unsupported format: ${path.extname(filePath)}`);
  }
  
  let AssetClass: any = BaseAsset;
  
  // Apply role mixins based on format capabilities
  if (formatInfo.roles.includes('audio')) {
    AssetClass = withAudioRole(AssetClass);
  }
  if (formatInfo.roles.includes('video')) {
    AssetClass = withVideoRole(AssetClass);
  }
  if (formatInfo.roles.includes('text')) {
    AssetClass = withTextRole(AssetClass);
  }
  if (formatInfo.roles.includes('image')) {
    AssetClass = withImageRole(AssetClass);
  }
  
  return new AssetClass(filePath, metadata, formatInfo);
}
```

### 3. Type-Safe Usage
```typescript
// Automatic type detection and role assignment
const asset = AssetLoader.load('presentation.mp4');

// TypeScript knows this asset has both Video and Audio roles
if (hasVideoRole(asset)) {
  const resolution = await asset.getResolution();
  const duration = await asset.getDuration();
}

if (hasAudioRole(asset)) {
  const audio = await asset.asAudio();
  const sampleRate = await asset.getSampleRate();
}
```

## 🛡️ Type Guards

Type guards provide runtime type checking for roles:

```typescript
// Role type guards
export function hasAudioRole(asset: any): asset is AudioRole {
  return asset && typeof asset.asAudio === 'function';
}

export function hasVideoRole(asset: any): asset is VideoRole {
  return asset && typeof asset.asVideo === 'function';
}

export function hasTextRole(asset: any): asset is TextRole {
  return asset && typeof asset.asText === 'function';
}

export function hasImageRole(asset: any): asset is ImageRole {
  return asset && typeof asset.asImage === 'function';
}

// Usage with type narrowing
if (hasVideoRole(asset) && hasAudioRole(asset)) {
  // TypeScript knows asset has both Video and Audio capabilities
  const video = await asset.asVideo();
  const audio = await asset.extractAudio();
}
```

## 📊 Asset Types

### Concrete Asset Classes

The system provides concrete asset classes for specific format combinations:

```typescript
// MP3Asset - Audio Role Only
export class MP3Asset extends withAudioRole(BaseAsset) {
  constructor(filePath: string, metadata: AssetMetadata) {
    super(filePath, metadata, FORMAT_REGISTRY.mp3);
  }
}

// MP4Asset - Video + Audio Roles
export class MP4Asset extends withVideoRole(withAudioRole(BaseAsset)) {
  constructor(filePath: string, metadata: AssetMetadata) {
    super(filePath, metadata, FORMAT_REGISTRY.mp4);
  }
}

// PNGAsset - Image Role Only
export class PNGAsset extends withImageRole(BaseAsset) {
  constructor(filePath: string, metadata: AssetMetadata) {
    super(filePath, metadata, FORMAT_REGISTRY.png);
  }
}
```

### Generic Asset Creation

For maximum flexibility, the factory creates generic assets with appropriate roles:

```typescript
export class SmartAssetFactory {
  static createAsset(filePath: string): BaseAsset & AnyRole {
    const formatInfo = detectFormatFromPath(filePath);
    const metadata = this.extractMetadata(filePath);
    
    return createAssetWithRoles(filePath, metadata);
  }
  
  static load(filePath: string): BaseAsset & AnyRole {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    return this.createAsset(filePath);
  }
}

// Convenience alias
export const AssetLoader = SmartAssetFactory;
```

## 🔄 Asset Transformations

### Cross-Format Transformations

Assets can be transformed between formats using their role capabilities:

```typescript
// Video to Audio extraction
const videoAsset = AssetLoader.load('movie.mp4');
const audio = await videoAsset.extractAudio();  // Returns Audio object

// Text to Speech
const textAsset = AssetLoader.load('script.txt');
const speech = await textAsset.toSpeech('en-US-AriaNeural');  // Returns Audio object

// Audio to Text (Speech Recognition)
const audioAsset = AssetLoader.load('recording.wav');
const transcript = await audioAsset.toText();  // Returns Text object
```

### Provider Integration

Asset transformations automatically use appropriate providers:

```typescript
// Asset roles automatically use the best available provider
class AudioRoleMixin {
  async toText(): Promise<Text> {
    // Automatically uses Whisper STT provider
    const whisperProvider = getWhisperProvider();
    const model = await whisperProvider.createAudioToTextModel('whisper-large');
    return await model.transform(this);
  }
  
  async changeSpeed(factor: number): Promise<Audio> {
    // Automatically uses FFMPEG provider
    const ffmpegProvider = getFFMPEGProvider();
    const model = await ffmpegProvider.createAudioFilterModel('speed-change');
    return await model.transform(this, { speedFactor: factor });
  }
}
```

## 📝 Metadata System

### Asset Metadata

Each asset maintains comprehensive metadata:

```typescript
interface AssetMetadata {
  // Basic file information
  filename: string;
  originalFilename: string;
  path: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Format-specific metadata
  duration?: number;          // Audio/Video
  resolution?: { width: number; height: number };  // Image/Video
  sampleRate?: number;        // Audio
  frameRate?: number;         // Video
  bitrate?: number;           // Audio/Video
  channels?: number;          // Audio
  colorSpace?: string;        // Image/Video
  
  // Content metadata
  tags?: string[];
  description?: string;
  contentPurpose?: ContentPurpose;
  language?: string;
}
```

### Metadata Extraction

Metadata is extracted automatically during asset creation:

```typescript
class MetadataExtractor {
  static async extractMetadata(filePath: string): Promise<AssetMetadata> {
    const stats = await fs.promises.stat(filePath);
    const formatInfo = detectFormatFromPath(filePath);
    
    const baseMetadata: AssetMetadata = {
      filename: path.basename(filePath),
      originalFilename: path.basename(filePath),
      path: filePath,
      fileSize: stats.size,
      mimeType: formatInfo?.mimeType || 'application/octet-stream',
      createdAt: stats.birthtime,
      updatedAt: stats.mtime
    };
    
    // Extract format-specific metadata
    if (formatInfo?.category === 'video') {
      Object.assign(baseMetadata, await this.extractVideoMetadata(filePath));
    } else if (formatInfo?.category === 'audio') {
      Object.assign(baseMetadata, await this.extractAudioMetadata(filePath));
    } else if (formatInfo?.category === 'image') {
      Object.assign(baseMetadata, await this.extractImageMetadata(filePath));
    }
    
    return baseMetadata;
  }
}
```

## 🚀 Usage Examples

### Basic Asset Loading
```typescript
import { AssetLoader } from './src/media/assets';

// Auto-detect format and roles
const videoAsset = AssetLoader.load('presentation.mp4');
console.log('Asset has video role:', hasVideoRole(videoAsset));
console.log('Asset has audio role:', hasAudioRole(videoAsset));

// Use role-specific functionality
const video = await videoAsset.asVideo();
const duration = await videoAsset.getDuration();
const resolution = await videoAsset.getResolution();
```

### Cross-Format Transformations
```typescript
// Video to audio extraction
const videoAsset = AssetLoader.load('movie.mp4');
const extractedAudio = await videoAsset.extractAudio();

// Audio speed adjustment
const audioAsset = AssetLoader.load('speech.wav');
const fasterSpeech = await audioAsset.changeSpeed(1.5);

// Text to speech
const textAsset = AssetLoader.load('script.txt');
const speechAudio = await textAsset.toSpeech('en-US-GuyNeural');
```

### Type-Safe Role Checking
```typescript
function processAsset(asset: BaseAsset & AnyRole) {
  if (hasVideoRole(asset)) {
    // TypeScript knows asset has video capabilities
    console.log('Processing video asset...');
    const duration = await asset.getDuration();
    const resolution = await asset.getResolution();
  }
  
  if (hasAudioRole(asset)) {
    // TypeScript knows asset has audio capabilities
    console.log('Processing audio asset...');
    const sampleRate = await asset.getSampleRate();
    const channels = await asset.getChannels();
  }
}
```

### Batch Processing
```typescript
async function processMediaDirectory(directoryPath: string) {
  const files = await fs.promises.readdir(directoryPath);
  
  for (const file of files) {
    try {
      const asset = AssetLoader.load(path.join(directoryPath, file));
      
      if (hasVideoRole(asset)) {
        // Extract thumbnails from videos
        const thumbnail = await asset.extractFrame(1.0);
        await thumbnail.save(`${file}_thumbnail.png`);
        
        // Extract audio track
        const audio = await asset.extractAudio();
        await audio.save(`${file}_audio.wav`);
      }
      
      if (hasAudioRole(asset) && !hasVideoRole(asset)) {
        // Transcribe audio files
        const transcript = await asset.toText();
        await transcript.save(`${file}_transcript.txt`);
      }
      
    } catch (error) {
      console.warn(`Skipping unsupported file: ${file}`);
    }
  }
}
```

## 🎯 Best Practices

### Asset Loading
1. **Use AssetLoader**: Always use `AssetLoader.load()` for consistent behavior
2. **Check Roles**: Use type guards to check available roles before usage
3. **Handle Errors**: Wrap asset loading in try-catch for unsupported formats
4. **Validate Files**: Ensure files exist before attempting to load

### Role Usage
1. **Type Guards First**: Always check roles before accessing role-specific methods
2. **Graceful Degradation**: Handle cases where expected roles are not available
3. **Provider Dependencies**: Ensure required providers are configured for transformations
4. **Resource Management**: Properly dispose of temporary files created during transformations

### Performance
1. **Lazy Loading**: Metadata is extracted lazily when needed
2. **Caching**: Cache asset instances for repeated access
3. **Parallel Processing**: Use Promise.all for independent asset operations
4. **Memory Management**: Clean up large assets when no longer needed
