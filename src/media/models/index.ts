/**
 * Media Models - Backward Compatibility Export
 * 
 * This file provides backward compatibility by re-exporting all models
 * from the new provider-centric organization.
 * 
 * New Structure (Provider-Centric):
 * - providers/openrouter/    - All OpenRouter components together
 * - providers/replicate/     - All Replicate components together  
 * - providers/together/      - All Together AI components together
 * - providers/docker/        - All Docker service components together
 * 
 * Legacy Structure (Maintained for Compatibility):
 * - models/abstracts/        - Abstract base classes and interfaces
 * - models/shared/           - Shared types and utilities (re-exports from assets/roles)
 * - models/index.ts          - THIS FILE - Re-exports everything for backward compatibility
 */

// Abstract base classes and interfaces
export * from './abstracts';
// Shared types and utilities
export * from './shared';

// Backward compatibility exports - re-export everything at the root level
// This ensures existing imports like `import { ReplicateTextToImageModel } from '../models'` still work

// Re-export all concrete implementations for backward compatibility
// Note: These now import from the new provider-centric organization
export { ReplicateTextToImageModel } from '../providers/replicate/ReplicateTextToImageModel';
export { ReplicateTextToAudioModel } from '../providers/replicate/ReplicateTextToAudioModel';
export { ReplicateTextToVideoModel } from '../providers/replicate/ReplicateTextToVideoModel';

export { TogetherTextToImageModel } from '../providers/together/TogetherTextToImageModel';
export { TogetherTextToAudioModel } from '../providers/together/TogetherTextToAudioModel';
export { TogetherTextToTextModel } from '../providers/together/TogetherTextToTextModel';

export { OpenRouterTextToTextModel } from '../providers/openrouter/OpenRouterTextToTextModel';

export { ChatterboxTTSModel } from '../providers/docker/chatterbox/ChatterboxTTSModel';
export { ChatterboxDockerModel } from '../providers/docker/chatterbox/ChatterboxDockerModel';

export { WhisperSTTModel } from '../providers/docker/whisper/WhisperSTTModel';
export { WhisperDockerModel } from '../providers/docker/whisper/WhisperDockerModel';

export { FFMPEGDockerModel } from '../providers/docker/ffmpeg/FFMPEGDockerModel';
export { FFMPEGVideoFilterModel } from '../providers/docker/ffmpeg/FFMPEGVideoFilterModel';

// Core media types (now properly organized in shared/)
export { Audio, Video, Text, Image } from './shared';
