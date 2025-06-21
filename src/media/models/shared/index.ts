/**
 * Shared Models - Common utilities and re-exports
 * 
 * This directory contains shared model utilities and re-exports
 * core media types from the assets/roles system.
 */

// Re-export core media types from assets/roles (the authoritative source)
export { 
  Audio, Video, Text, Image,
  type AudioFormat, type VideoFormat, type ImageFormat,
  type AudioMetadata, type VideoMetadata, type TextMetadata, type ImageMetadata
} from '../../assets/roles';
