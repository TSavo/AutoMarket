/**
 * Video composition services exports
 */
export { VideoComposer } from './VideoComposer';
export { ProcessingQueue, JobStatus } from './ProcessingQueue';
export { AutomaticVideoComposer } from './AutomaticVideoComposer';
export { AspectRatioAssetSelector } from './AspectRatioAssetSelector';
export { IntelligentOverlayTimer } from './IntelligentOverlayTimer';
export { CompositionBuilder } from './CompositionBuilder';
export { VideoIngestionService } from './VideoIngestionService';

export type { AutoCompositionOptions, AutoCompositionResult } from './AutomaticVideoComposer';
export type { SelectedAssets } from './AspectRatioAssetSelector';
export type { OverlayTiming } from './IntelligentOverlayTimer';
