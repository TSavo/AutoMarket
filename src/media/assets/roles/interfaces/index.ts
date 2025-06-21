/**
 * Role Interfaces - Main Export
 * 
 * Centralized export for all role interfaces.
 */

export type { AudioRole } from './AudioRole';
export type { VideoRole } from './VideoRole';
export type { TextRole } from './TextRole';
export type { ImageRole } from './ImageRole';

// Import types to create union
import type { AudioRole } from './AudioRole';
import type { VideoRole } from './VideoRole';
import type { TextRole } from './TextRole';
import type { ImageRole } from './ImageRole';

// Union type for all role interfaces
export type AnyRole = AudioRole | VideoRole | TextRole | ImageRole;
