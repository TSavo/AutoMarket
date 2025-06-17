/**
 * Aspect Ratio Asset Selector
 * Handles aspect ratio matching and random selection
 */
import { AssetManager } from '../../AssetManager';
import { VideoAsset, isVideoAsset } from '../../video';

export interface SelectedAssets {
  intro?: VideoAsset;
  outro?: VideoAsset;
  overlay?: VideoAsset;
}

/**
 * Selects assets with aspect ratio matching for intro/outro
 * Overlays are all 16:9 so no filtering needed
 */
export class AspectRatioAssetSelector {
  private assetManager: AssetManager;

  constructor(assetManager: AssetManager) {
    this.assetManager = assetManager;
  }

  /**
   * Select assets matching content aspect ratio
   */
  async selectAssets(contentAsset: VideoAsset): Promise<SelectedAssets> {
    const contentAspectRatio = contentAsset.aspectRatio;
    
    // Get all assets by system tags and filter to video assets
    const introAssets = this.assetManager.getByTag('intro').filter(isVideoAsset);
    const outroAssets = this.assetManager.getByTag('outro').filter(isVideoAsset);
    const overlayAssets = this.assetManager.getByTag('overlay').filter(isVideoAsset);
    
    // Filter intro/outro by matching aspect ratio
    const matchingIntros = this.filterByAspectRatio(introAssets, contentAspectRatio);
    const matchingOutros = this.filterByAspectRatio(outroAssets, contentAspectRatio);
    
    // Random selection (same video can be used for both intro/outro)
    const selectedIntro = this.randomSelect(matchingIntros);
    const selectedOutro = this.randomSelect(matchingOutros);
    const selectedOverlay = this.randomSelect(overlayAssets);
    
    console.log(`Selected assets for ${contentAspectRatio} content:`, {
      intro: selectedIntro?.filename,
      outro: selectedOutro?.filename,
      overlay: selectedOverlay?.filename
    });
    
    return {
      intro: selectedIntro,
      outro: selectedOutro,
      overlay: selectedOverlay
    };
  }

  /**
   * Filter assets by aspect ratio
   */
  private filterByAspectRatio(assets: VideoAsset[], aspectRatio: string): VideoAsset[] {
    return assets.filter(asset => asset.aspectRatio === aspectRatio);
  }

  /**
   * Random selection from array
   */
  private randomSelect(assets: VideoAsset[]): VideoAsset | undefined {
    if (assets.length === 0) return undefined;
    return assets[Math.floor(Math.random() * assets.length)];
  }
}
