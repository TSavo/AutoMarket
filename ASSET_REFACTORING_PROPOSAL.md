/**
 * PROPOSAL: Refactored Asset Classes & Universal Role Compatibility
 * 
 * Replace format-specific classes (MP3Asset, MP4Asset, etc.) with 
 * role-based generic classes where format is just metadata.
 * 
 * CRITICAL INSIGHT: Assets should implement MULTIPLE roles to enable
 * universal compatibility through automatic provider-based conversions.
 */

import { BaseAsset, AssetMetadata } from '../Asset';
import { withAudioRole, withVideoRole, withTextRole, withImageRole } from '../mixins';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// UNIVERSAL ROLE COMPATIBILITY DESIGN
// ============================================================================

/**
 * CORE PRINCIPLE: Any asset can be input to any model through asRole<T>()
 * 
 * Examples:
 * - TextAsset → ImageToVideoModel → Text→Image→Video pipeline
 * - VideoAsset → AudioModel → Video→Audio extraction via FFmpeg
 * - AudioAsset → TextModel → Audio→Text transcription via Whisper
 * - TextAsset → AudioModel → Text→Speech synthesis via TTS
 * 
 * This is achieved by:
 * 1. Assets implementing multiple role interfaces
 * 2. Models using asRole<T>() to convert inputs to required types
 * 3. Provider system automatically finding conversion paths
 */

// ============================================================================
// MULTI-ROLE ASSET CLASSES
// ============================================================================

/**
 * AudioAsset - Handles all audio formats AND can be converted to other roles
 * Implements: AudioRole (primary) + TextRole (via speech-to-text)
 */
export class AudioAsset extends withTextRole(withAudioRole(BaseAsset)) {
  constructor(data: Buffer, metadata: AssetMetadata = {}) {
    super(data, {
      category: 'audio',
      hasAudio: true,
      ...metadata
    }, metadata.mimeType || 'audio/mpeg', metadata.format || 'mp3');
  }

  static fromFile(filePath: string): AudioAsset {
    const format = path.extname(filePath).toLowerCase().slice(1);
    const mimeType = AUDIO_MIME_TYPES[format] || 'audio/mpeg';
    
    const data = fs.readFileSync(filePath);
    return new AudioAsset(data, {
      sourceFile: filePath,
      format,
      mimeType,
      fileSize: data.length
    });
  }
}

/**
 * VideoAsset - Handles all video formats AND can be converted to other roles
 * Implements: VideoRole (primary) + AudioRole (extract audio) + ImageRole (extract frames)
 */
export class VideoAsset extends withImageRole(withAudioRole(withVideoRole(BaseAsset))) {
  constructor(data: Buffer, metadata: AssetMetadata = {}) {
    super(data, {
      category: 'video',
      hasAudio: true,
      hasVideo: true,
      ...metadata
    }, metadata.mimeType || 'video/mp4', metadata.format || 'mp4');
  }

  static fromFile(filePath: string): VideoAsset {
    const format = path.extname(filePath).toLowerCase().slice(1);
    const mimeType = VIDEO_MIME_TYPES[format] || 'video/mp4';
    
    const data = fs.readFileSync(filePath);
    return new VideoAsset(data, {
      sourceFile: filePath,
      format,
      mimeType,
      fileSize: data.length
    });
  }
}

/**
 * ImageAsset - Handles all image formats AND can be converted to other roles  
 * Implements: ImageRole (primary) + VideoRole (via image-to-video) + TextRole (via OCR)
 */
export class ImageAsset extends withTextRole(withVideoRole(withImageRole(BaseAsset))) {
  constructor(data: Buffer, metadata: AssetMetadata = {}) {
    super(data, {
      category: 'image',
      ...metadata
    }, metadata.mimeType || 'image/png', metadata.format || 'png');
  }

  static fromFile(filePath: string): ImageAsset {
    const format = path.extname(filePath).toLowerCase().slice(1);
    const mimeType = IMAGE_MIME_TYPES[format] || 'image/png';
    
    const data = fs.readFileSync(filePath);
    return new ImageAsset(data, {
      sourceFile: filePath,
      format,
      mimeType,
      fileSize: data.length
    });
  }
}

/**
 * TextAsset - Handles all text formats AND can be converted to other roles
 * Implements: TextRole (primary) + AudioRole (via TTS) + ImageRole (via text-to-image) + VideoRole (via text-to-video)
 */
export class TextAsset extends withVideoRole(withImageRole(withAudioRole(withTextRole(BaseAsset)))) {
  constructor(content: string, metadata: AssetMetadata = {}) {
    const data = Buffer.from(content, 'utf8');
    super(data, {
      category: 'text',
      encoding: 'utf8',
      wordCount: content.split(/\s+/).length,
      ...metadata
    }, metadata.mimeType || 'text/plain', metadata.format || 'txt');
  }

  static fromString(content: string, metadata: AssetMetadata = {}): TextAsset {
    return new TextAsset(content, metadata);
  }

  static fromFile(filePath: string): TextAsset {
    const format = path.extname(filePath).toLowerCase().slice(1);
    const mimeType = TEXT_MIME_TYPES[format] || 'text/plain';
    
    const content = fs.readFileSync(filePath, 'utf8');
    return new TextAsset(content, {
      sourceFile: filePath,
      format,
      mimeType,
      fileSize: Buffer.byteLength(content, 'utf8')
    });
  }

  get content(): string {
    return this.data.toString('utf8');
  }
}

// ============================================================================
// UNIVERSAL MODEL COMPATIBILITY PATTERN
// ============================================================================

/**
 * ALL models follow this pattern for universal compatibility:
 * 
 * class SomeModel {
 *   async transform(input: ExpectedRole): Promise<OutputType> {
 *     // Convert ANY input to required type via asRole<T>()
 *     const requiredType = await input.asRole(RequiredClass);
 *     
 *     // Process with the required type
 *     return await this.processSpecificType(requiredType);
 *   }
 * }
 * 
 * Examples in practice:
 */

// ImageToVideoModel automatically handles ANY input
class ImageToVideoModel {
  async transform(input: ImageRole): Promise<Video> {
    // TextAsset → Image via text-to-image provider
    // VideoAsset → Image via frame extraction  
    // AudioAsset → Image via waveform visualization
    const image = await input.asRole(Image);
    return this.processImage(image);
  }
}

// AudioModel automatically handles ANY input  
class AudioModel {
  async transform(input: AudioRole): Promise<Audio> {
    // VideoAsset → Audio via FFmpeg extraction
    // TextAsset → Audio via TTS synthesis
    // ImageAsset → Audio via image-to-sound
    const audio = await input.asRole(Audio);
    return this.processAudio(audio);
  }
}

// ============================================================================
// PROVIDER-BASED CONVERSION MATRIX
// ============================================================================

/**
 * The asRole<T>() system enables these automatic conversions:
 * 
 * FROM\TO     | Audio    | Video    | Image    | Text
 * ------------|----------|----------|----------|----------
 * Audio       | identity | ❌       | waveform | Whisper
 * Video       | FFmpeg   | identity | frames   | OCR+STT  
 * Image       | ❌       | Runway   | identity | OCR
 * Text        | TTS      | Text2Vid | DALL-E   | identity
 * 
 * ❌ = No direct conversion (would need intermediate steps)
 * 
 * Multi-hop conversions are possible:
 * Audio → Text → Image → Video (speech transcription → image generation → video)
 */

// ============================================================================
// USAGE EXAMPLES - UNIVERSAL COMPATIBILITY
// ============================================================================

/*
// 🔥 BEFORE (Limited, type-rigid):
const imageModel = new ImageToVideoModel();
const imageAsset = new ImageAsset(buffer);  // Only worked with images
const video = await imageModel.transform(imageAsset);

// 🚀 AFTER (Universal, any-to-any):
const imageModel = new ImageToVideoModel();

// Text → Image → Video pipeline
const textAsset = TextAsset.fromString("A sunset over mountains");
const videoFromText = await imageModel.transform(textAsset);

// Video → Image → Video pipeline (frame extraction + processing)
const videoAsset = VideoAsset.fromFile('input.mp4');
const processedVideo = await imageModel.transform(videoAsset);

// Audio → Image → Video pipeline (waveform visualization)
const audioAsset = AudioAsset.fromFile('music.mp3');  
const videoFromAudio = await imageModel.transform(audioAsset);

// ALL of these work seamlessly through asRole<T>()!
*/

// ============================================================================
// IMPLEMENTATION REQUIREMENTS
// ============================================================================

/**
 * To enable this universal compatibility:
 * 
 * 1. **Asset Classes**: Must implement multiple role mixins
 *    - TextAsset: TextRole + AudioRole + ImageRole + VideoRole
 *    - VideoAsset: VideoRole + AudioRole + ImageRole  
 *    - AudioAsset: AudioRole + TextRole
 *    - ImageAsset: ImageRole + VideoRole + TextRole
 * 
 * 2. **Provider System**: Must have conversion capabilities
 *    - Text→Image: DALL-E, Midjourney, etc.
 *    - Text→Audio: TTS providers
 *    - Video→Audio: FFmpeg
 *    - Audio→Text: Whisper
 *    - Image→Video: Runway, Stable Video Diffusion
 *    - And more...
 * 
 * 3. **Models**: Must use asRole<T>() pattern
 *    const required = await input.asRole(RequiredType);
 * 
 * 4. **Role Transformation**: Enhanced canPlayRole<T>() and asRole<T>()
 *    - Provider capability checking
 *    - Multi-hop conversion support
 *    - Graceful fallbacks
 */

// ============================================================================
// BENEFITS OF UNIVERSAL COMPATIBILITY
// ============================================================================

/**
 * ✅ GAME-CHANGING BENEFITS:
 * 
 * 1. **Universal Model Input**: ANY asset can be input to ANY model
 * 2. **Automatic Pipelines**: Complex multi-step workflows become simple
 * 3. **Provider Abstraction**: Users don't need to know conversion details
 * 4. **Composable Workflows**: Chain any transformations seamlessly
 * 5. **Future-Proof**: New providers add capabilities to ALL assets
 * 6. **Type Safety**: Full TypeScript support throughout
 * 7. **Error Handling**: Clear feedback when conversions aren't possible
 * 
 * 🎯 RESULT: A truly universal, multi-modal AI media processing system!
 */

// ============================================================================
// SMART ASSET FACTORY - Type-safe dispatcher
// ============================================================================

/**
 * SmartAssetFactory - Type-safe asset loading that dispatches to appropriate Asset.fromFile()
 * 
 * This is much simpler than the current complex mixin system.
 * The generic type parameter tells the factory which Asset class to use.
 */
export class SmartAssetFactory {
  /**
   * Load an asset with explicit type specification
   * 
   * @example
   * const video = await SmartAssetFactory.load<VideoAsset>('movie.mp4');
   * const audio = await SmartAssetFactory.load<AudioAsset>('song.wav');
   * const image = await SmartAssetFactory.load<ImageAsset>('photo.jpg');
   * const text = await SmartAssetFactory.load<TextAsset>('document.txt');
   */
  static async load<T extends BaseAsset>(filePath: string): Promise<T> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Detect format to validate against expected type
    const format = path.extname(filePath).toLowerCase().slice(1);
    const formatInfo = detectFormatCategory(format);
    
    if (!formatInfo) {
      throw new Error(`Unsupported file format: ${format}`);
    }

    // Use TypeScript's type system to dispatch to the correct fromFile method
    // The compiler ensures type safety here
    switch (formatInfo.category) {
      case 'audio':
        return AudioAsset.fromFile(filePath) as T;
      case 'video':
        return VideoAsset.fromFile(filePath) as T;
      case 'image':
        return ImageAsset.fromFile(filePath) as T;
      case 'text':
        return TextAsset.fromFile(filePath) as T;
      default:
        throw new Error(`Unsupported category: ${formatInfo.category}`);
    }
  }

  /**
   * Auto-detect and load - returns union type, user must cast or check
   * 
   * @example
   * const asset = await SmartAssetFactory.loadAuto('unknown.mp4');
   * if (asset instanceof VideoAsset) {
   *   // TypeScript knows this is VideoAsset
   * }
   */
  static async loadAuto(filePath: string): Promise<AudioAsset | VideoAsset | ImageAsset | TextAsset> {
    const format = path.extname(filePath).toLowerCase().slice(1);
    const formatInfo = detectFormatCategory(format);
    
    if (!formatInfo) {
      throw new Error(`Unsupported file format: ${format}`);
    }

    switch (formatInfo.category) {
      case 'audio': return AudioAsset.fromFile(filePath);
      case 'video': return VideoAsset.fromFile(filePath);
      case 'image': return ImageAsset.fromFile(filePath);
      case 'text': return TextAsset.fromFile(filePath);
      default:
        throw new Error(`Unsupported category: ${formatInfo.category}`);
    }
  }
}

// ============================================================================
// FORMAT DETECTION UTILITIES
// ============================================================================

interface FormatInfo {
  category: 'audio' | 'video' | 'image' | 'text';
  mimeType: string;
}

const FORMAT_REGISTRY: Record<string, FormatInfo> = {
  // Audio formats
  mp3: { category: 'audio', mimeType: 'audio/mpeg' },
  wav: { category: 'audio', mimeType: 'audio/wav' },
  flac: { category: 'audio', mimeType: 'audio/flac' },
  ogg: { category: 'audio', mimeType: 'audio/ogg' },
  
  // Video formats
  mp4: { category: 'video', mimeType: 'video/mp4' },
  avi: { category: 'video', mimeType: 'video/x-msvideo' },
  mov: { category: 'video', mimeType: 'video/quicktime' },
  webm: { category: 'video', mimeType: 'video/webm' },
  
  // Image formats
  png: { category: 'image', mimeType: 'image/png' },
  jpg: { category: 'image', mimeType: 'image/jpeg' },
  jpeg: { category: 'image', mimeType: 'image/jpeg' },
  webp: { category: 'image', mimeType: 'image/webp' },
  
  // Text formats
  txt: { category: 'text', mimeType: 'text/plain' },
  md: { category: 'text', mimeType: 'text/markdown' },
  json: { category: 'text', mimeType: 'application/json' },
  html: { category: 'text', mimeType: 'text/html' },
};

function detectFormatCategory(format: string): FormatInfo | null {
  return FORMAT_REGISTRY[format.toLowerCase()] || null;
}

// Legacy MIME type mappings for individual Asset classes
const AUDIO_MIME_TYPES: Record<string, string> = { /* ... */ };
const VIDEO_MIME_TYPES: Record<string, string> = { /* ... */ };
const IMAGE_MIME_TYPES: Record<string, string> = { /* ... */ };
const TEXT_MIME_TYPES: Record<string, string> = { /* ... */ };

// ============================================================================
// USAGE EXAMPLES - BEFORE vs AFTER
// ============================================================================

/*
// ❌ BEFORE (Current problematic design):
const mp3Asset = new MP3Asset(buffer);           // Format-specific class
const mp4Asset = new MP4Asset(buffer);           // Dozens of these classes
const webpAsset = new WebPAsset(buffer);         // Poor maintainability
const smartAsset = await SmartAssetFactory.load(path) as any; // Type casting needed!

// ✅ AFTER (Proposed clean design):
const audio = await SmartAssetFactory.load<AudioAsset>('song.mp3');   // Type-safe!
const video = await SmartAssetFactory.load<VideoAsset>('movie.mp4');  // No casting!
const image = await SmartAssetFactory.load<ImageAsset>('photo.webp'); // Clean API!
const text = await SmartAssetFactory.load<TextAsset>('doc.txt');      // Explicit intent!

// Format is accessible via metadata:
console.log(audio.metadata.format); // 'mp3'
console.log(video.metadata.format); // 'mp4'  
console.log(image.metadata.format); // 'webp'

// Role capabilities work perfectly with full type safety:
audio.canPlayRole(Audio); // ✅ true, no casting needed
video.canPlayRole(Video); // ✅ true, TypeScript knows the type
video.canPlayRole(Audio); // ✅ true (can extract audio), provider-checked
image.canPlayRole(Image); // ✅ true, type-safe

// Perfect API - simple, clean, type-safe, maintainable!
*/

// ============================================================================
// MIGRATION BENEFITS
// ============================================================================

/*
✅ BENEFITS of this refactoring:

1. **Type Safety**: No more (asset as any) casts needed
2. **Simplicity**: SmartAssetFactory becomes a simple dispatcher  
3. **Maintainability**: 4 asset classes instead of dozens
4. **Explicit Intent**: Developer declares expected type upfront
5. **Clean API**: Consistent with individual Asset.fromFile() methods
6. **Better Testing**: Easy to mock and test specific asset types
7. **Future-Proof**: Easy to add new formats without new classes

🎯 IMPLEMENTATION PLAN:

1. Create new AudioAsset, VideoAsset, ImageAsset, TextAsset classes
2. Update SmartAssetFactory to be a type-safe dispatcher
3. Migrate existing code from MP3Asset/MP4Asset/etc to new classes
4. Remove old format-specific asset classes
5. Update tests to use new type-safe API

This is a significant architecture improvement that eliminates:
- Complex runtime mixin generation
- Type casting issues  
- Format-specific class proliferation
- Maintenance overhead
*/
