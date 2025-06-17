/**
 * Video Ingestion Service
 * Handles auto-ingestion of rendered videos as finished marketing assets
 */
import { AssetManager } from '../../AssetManager';
import { MediaIngestService } from '../../ingest/MediaIngestService';
import { VideoAsset } from '../../video';
import { ContentPurpose } from '../../types';

/**
 * Handles ingestion of auto-composed videos with proper tagging
 */
export class VideoIngestionService {
  private assetManager: AssetManager;
  private mediaIngestService: MediaIngestService;

  constructor(assetManager: AssetManager, mediaIngestService: MediaIngestService) {
    this.assetManager = assetManager;
    this.mediaIngestService = mediaIngestService;
  }

  /**
   * Ingest rendered video as finished marketing asset
   */
  async ingestRenderedVideo(composition: any): Promise<VideoAsset> {
    const result = await this.mediaIngestService.ingestFile<VideoAsset>(
      composition.outputPath,
      {
        path: composition.outputPath,
        generateId: true,
        extractTags: true,
        overwriteExisting: false
      }
    );

    if (result.success && result.asset) {
      // Tag as finished marketing video
      result.asset.tags = [
        ...result.asset.tags,
        'auto-composed',
        'finished',
        'marketing'
      ];

      // Set content purpose for finished marketing videos
      result.asset.contentPurpose = [ContentPurpose.FINISHED, ContentPurpose.MARKETING];

      await this.assetManager.updateAsset(result.asset);

      console.log(`Auto-composed video ingested as finished marketing asset: ${result.asset.id}`);
      return result.asset;

    } else {
      throw new Error(`Failed to ingest rendered video: ${result.error}`);
    }
  }
}
