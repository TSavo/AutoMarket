
import { BaseAsset, AssetMetadata } from '../Asset';
import { withAudioRole, withVideoRole, withTextRole, withImageRole } from '../mixins';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CORE ASSET CLASSES - Generic, role-based design
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
    // Auto-detect format from file extension
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
      hasAudio: true, // Most videos have audio
      ...metadata
    }, metadata.mimeType || 'video/mp4', metadata.format || 'mp4');
  }

  static fromFile(filePath: string): VideoAsset {
    // Auto-detect format from file extension
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
    }, metadata.mimeType || 'image/jpeg', metadata.format || 'jpg');
  }

  static fromFile(filePath: string): ImageAsset {
    // Auto-detect format from file extension
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
    // Auto-detect format from file extension
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

// Legacy MIME type mappings for individual Asset classes
const AUDIO_MIME_TYPES: Record<string, string> = { /* ... */ };
const VIDEO_MIME_TYPES: Record<string, string> = { /* ... */ };
const IMAGE_MIME_TYPES: Record<string, string> = { /* ... */ };
const TEXT_MIME_TYPES: Record<string, string> = { /* ... */ };
