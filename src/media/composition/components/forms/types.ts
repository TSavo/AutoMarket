import { VideoAsset } from '../../../video';
import { OverlayConfig } from '../overlay';

/**
 * Initial values for the composition form
 */
export interface CompositionFormValues {
  title?: string;
  description?: string;
  contentAssetId?: string;
  introAssetId?: string;
  outroAssetId?: string;
  overlayConfigs?: OverlayConfig[];
  crossfadeDuration?: number;
}

/**
 * Props for the enhanced composition form
 */
export interface EnhancedCompositionFormProps {
  onSubmit: (values: CompositionFormValues) => void;
  isLoading?: boolean;
  initialValues?: CompositionFormValues | null;
}

/**
 * Interface for video asset card component
 */
export interface VideoAssetCardProps {
  asset: VideoAsset;
  selected: boolean;
  onClick: () => void;
}