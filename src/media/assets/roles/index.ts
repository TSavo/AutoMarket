/**
 * Asset Roles - Main Export
 * 
 * Clean, organized export of all role-related functionality:
 * - Core media classes (Audio, Video, Text, Image)
 * - Role interfaces (AudioRole, VideoRole, etc.)
 * - Type definitions (formats, metadata)
 * - Type guards (hasAudioRole, hasVideoRole, etc.)
 */

// Core media classes
export * from './classes';

// Role interfaces
export * from './interfaces';

// Type definitions
export * from './types';

// Type guards
export * from './guards';

// Convenience union types
import type { Audio, Video, Text, Image } from './classes';
export type AnyMedia = Audio | Video | Text | Image;
