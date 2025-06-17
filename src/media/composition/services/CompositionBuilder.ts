/**
 * Composition Builder
 * Builds composition objects from selected assets and timing
 */
import { VideoAsset } from '../../video';
import { Composition } from '../../types';
import { SelectedAssets } from './AspectRatioAssetSelector';
import { OverlayTiming } from './IntelligentOverlayTimer';
import { AutoCompositionOptions } from './AutomaticVideoComposer';

/**
 * Builds composition objects for VideoComposer
 */
export class CompositionBuilder {
  
  /**
   * Build complete composition from selected assets and timing
   */
  buildComposition(
    contentAsset: VideoAsset,
    selectedAssets: SelectedAssets,
    overlayTimings: OverlayTiming[],
    options: AutoCompositionOptions
  ): Composition {
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    const composition: Composition = {
      id: `auto-${timestamp}`,
      title: `Auto-Composed-${contentAsset.filename}-${timestamp}`,
      description: `Auto-composed ${contentAsset.aspectRatio} video featuring ${contentAsset.filename}`,
      contentAssetId: contentAsset.id,
      crossfadeDuration: options.crossfadeDuration || 1.0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Add selected intro
    if (selectedAssets.intro) {
      composition.introAssetId = selectedAssets.intro.id;
    }
    
    // Add selected outro
    if (selectedAssets.outro) {
      composition.outroAssetId = selectedAssets.outro.id;
    }
    
    // Add overlay configs from timing calculations
    if (selectedAssets.overlay && overlayTimings.length > 0) {
      composition.overlayConfigs = overlayTimings.map(timing => ({
        assetId: selectedAssets.overlay!.id,
        startTime: timing.startTime,
        duration: timing.duration,
        position: timing.position,
        scale: timing.scale,
        opacity: timing.opacity
      }));
    }
    
    return composition;
  }
}
