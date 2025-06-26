/**
 * Abstract Model Base Classes
 * 
 * Re-exports all abstract model interfaces and base classes
 */

// Core abstract base class
export { Model } from './Model';
export type { ModelMetadata } from './Model';

// Abstract model interfaces by transformation type
export { TextToImageModel } from './TextToImageModel';
export type { TextToImageOptions } from './TextToImageModel';

export { TextToAudioModel } from './TextToAudioModel';
export type { TextToAudioOptions } from './TextToAudioModel';

export { TextToVideoModel } from './TextToVideoModel';
export type { TextToVideoOptions } from './TextToVideoModel';

export { TextToTextModel } from './TextToTextModel';
export type { TextToTextOptions } from './TextToTextModel';

export { AudioToTextModel } from './AudioToTextModel';
export type { AudioToTextOptions } from './AudioToTextModel';

export { AudioToAudioModel } from './AudioToAudioModel';
export type { AudioToAudioOptions } from './AudioToAudioModel';

export { ImageToVideoModel } from './ImageToVideoModel';
export type { ImageToVideoOptions } from './ImageToVideoModel';

export { VideoToAudioModel } from './VideoToAudioModel';
export type { VideoToAudioOptions } from './VideoToAudioModel';

export { VideoToVideoModel } from './VideoToVideoModel';
export type { VideoCompositionOptions, VideoOverlayConfig } from './VideoToVideoModel';
