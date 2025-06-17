/**
 * Intelligent Overlay Timer
 * Calculates smart overlay placement with gaps
 */
import { VideoAsset } from '../../video';
import { SelectedAssets } from './AspectRatioAssetSelector';

export interface OverlayTiming {
  startTime: number;
  duration: number;
  position: string;
  scale: number;
  opacity: number;
}

/**
 * Calculates intelligent overlay timing with strategic placement
 */
export class IntelligentOverlayTimer {
  private readonly GAP_BUFFER = 3; // 3 seconds gap before/after overlays

  /**
   * Calculate overlay timings for start and end placement
   */
  calculateTimings(
    contentAsset: VideoAsset,
    selectedAssets: SelectedAssets,
    crossfadeDuration: number
  ): OverlayTiming[] {
    
    if (!selectedAssets.overlay) return [];

    const timings: OverlayTiming[] = [];
    const overlayAsset = selectedAssets.overlay;
    
    const contentDuration = contentAsset.duration;
    const introLength = selectedAssets.intro?.duration || 0;
    const outroLength = selectedAssets.outro?.duration || 0;
    
    // Timeline: [intro] [content] [outro]
    const contentStartTime = introLength;
    const contentEndTime = contentStartTime + contentDuration;
    
    // Try to place overlay near start
    const startTiming = this.calculateStartOverlay(
      contentAsset,
      overlayAsset,
      contentStartTime,
      contentEndTime
    );
    if (startTiming) timings.push(startTiming);
    
    // Try to place overlay near end
    const endTiming = this.calculateEndOverlay(
      contentAsset,
      overlayAsset,
      contentStartTime,
      contentEndTime,
      startTiming || undefined
    );
    if (endTiming) timings.push(endTiming);
    
    console.log(`Overlay timings calculated:`, timings.map(t => 
      `${t.startTime}s-${t.startTime + t.duration}s at ${t.position}`
    ));
    
    return timings;
  }

  /**
   * Calculate start overlay placement
   */
  private calculateStartOverlay(
    contentAsset: VideoAsset,
    overlayAsset: VideoAsset,
    contentStartTime: number,
    contentEndTime: number
  ): OverlayTiming | null {
    
    const overlayStartTime = contentStartTime + this.GAP_BUFFER;
    const maxDuration = contentEndTime - overlayStartTime - this.GAP_BUFFER;
    
    if (maxDuration <= 0) return null;
    
    return {
      startTime: overlayStartTime,
      duration: Math.min(overlayAsset.duration, maxDuration),
      position: this.getPositionForAspectRatio(contentAsset.aspectRatio, 'start'),
      scale: this.getScaleForAspectRatio(contentAsset.aspectRatio),
      opacity: 0.9
    };
  }

  /**
   * Calculate end overlay placement
   */
  private calculateEndOverlay(
    contentAsset: VideoAsset,
    overlayAsset: VideoAsset,
    contentStartTime: number,
    contentEndTime: number,
    startTiming?: OverlayTiming
  ): OverlayTiming | null {
    
    const overlayEndTime = contentEndTime - this.GAP_BUFFER;
    const overlayStartTime = overlayEndTime - overlayAsset.duration;
    
    // Check if conflicts with start overlay
    if (startTiming) {
      const startEnd = startTiming.startTime + startTiming.duration;
      if (overlayStartTime < startEnd + this.GAP_BUFFER) {
        return null; // Too close to start overlay
      }
    }
    
    if (overlayStartTime < contentStartTime + this.GAP_BUFFER) {
      return null; // Would start too early
    }
    
    return {
      startTime: overlayStartTime,
      duration: overlayAsset.duration,
      position: this.getPositionForAspectRatio(contentAsset.aspectRatio, 'end'),
      scale: this.getScaleForAspectRatio(contentAsset.aspectRatio),
      opacity: 0.9
    };
  }

  /**
   * Get overlay position based on content aspect ratio and placement
   */
  private getPositionForAspectRatio(aspectRatio: string, placement: 'start' | 'end'): string {
    switch (aspectRatio) {
      case '16:9':
        return placement === 'start' ? 'top-right' : 'bottom-right';
      case '9:16':
        return placement === 'start' ? 'top-center' : 'bottom-center';
      case '1:1':
        return placement === 'start' ? 'top-right' : 'bottom-left';
      case '4:5':
        return placement === 'start' ? 'top-center' : 'bottom-center';
      default:
        return 'bottom-right';
    }
  }

  /**
   * Get overlay scale based on content aspect ratio
   */
  private getScaleForAspectRatio(aspectRatio: string): number {
    switch (aspectRatio) {
      case '16:9': return 0.25;
      case '9:16': return 0.35;
      case '1:1': return 0.30;
      case '4:5': return 0.32;
      default: return 0.25;
    }
  }
}
