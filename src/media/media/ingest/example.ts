/**
 * Media Ingest Example
 * 
 * Example showing how to use the media ingest system with derivative assets.
 */

import path from 'path';
import { 
  mediaIngestService,
  derivativeMediaHandler,
  initialize,
  DerivativeType
} from '../ingest';
import { VideoAsset } from '../video';
import { FontAsset } from '../font';

async function main() {
  try {
    // Initialize the media ingest system
    await initialize();
    console.log('✅ Media ingest system initialized');
    
    // Example 1: Ingest a video file
    console.log('\n📹 Example 1: Ingest video file');
    const videoPath = path.resolve(__dirname, 'public/videos/sample-video.mp4');
    const videoResult = await mediaIngestService.ingestFile<VideoAsset>(videoPath, {
      path: videoPath,
      generateId: true,
      extractTags: true,
      defaultTitle: 'Sample Video',
      defaultDescription: 'A sample video for testing the media ingest system'
    });
    
    if (videoResult.success && videoResult.asset) {
      console.log('✅ Video ingested successfully');
      console.log(`   ID: ${videoResult.asset.id}`);
      console.log(`   Title: ${videoResult.asset.title}`);
      console.log(`   Duration: ${videoResult.asset.duration} seconds`);
      console.log(`   Dimensions: ${videoResult.asset.width}x${videoResult.asset.height}`);
      
      // Check if a thumbnail was generated and registered
      if (videoResult.asset.thumbnailPath) {
        console.log(`   Thumbnail ID: ${videoResult.asset.thumbnailPath}`);
        
        // Get the thumbnail derivative
        const derivatives = await derivativeMediaHandler.getDerivativesForAsset(
          videoResult.asset.id,
          DerivativeType.THUMBNAIL
        );
        
        if (derivatives.length > 0) {
          console.log(`   Thumbnail title: ${derivatives[0].title}`);
          console.log(`   Thumbnail path: ${derivatives[0].path}`);
        }
      }
    } else {
      console.error('❌ Failed to ingest video:', videoResult.error);
    }
    
    // Example 2: Ingest a font file
    console.log('\n🔤 Example 2: Ingest font file');
    const fontPath = path.resolve(__dirname, 'fonts/sample-font.ttf');
    const fontResult = await mediaIngestService.ingestFile<FontAsset>(fontPath, {
      path: fontPath,
      generateId: true,
      extractTags: true,
      defaultTitle: 'Sample Font',
      defaultDescription: 'A sample font for testing the media ingest system'
    });
    
    if (fontResult.success && fontResult.asset) {
      console.log('✅ Font ingested successfully');
      console.log(`   ID: ${fontResult.asset.id}`);
      console.log(`   Family: ${fontResult.asset.family}`);
      console.log(`   Weight: ${fontResult.asset.weight}`);
      console.log(`   Style: ${fontResult.asset.style}`);
      
      // Check if a preview was generated and registered
      if (fontResult.asset.previewImagePath) {
        console.log(`   Preview ID: ${fontResult.asset.previewImagePath}`);
        
        // Get the preview derivative
        const derivatives = await derivativeMediaHandler.getDerivativesForAsset(
          fontResult.asset.id,
          DerivativeType.FONT_SAMPLE
        );
        
        if (derivatives.length > 0) {
          console.log(`   Preview title: ${derivatives[0].title}`);
          console.log(`   Preview path: ${derivatives[0].path}`);
        }
      }
    } else {
      console.error('❌ Failed to ingest font:', fontResult.error);
    }
    
  } catch (error) {
    console.error('❌ An error occurred:', error);
  }
}

// Run the example
main().catch(console.error);
