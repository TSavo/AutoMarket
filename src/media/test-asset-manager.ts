import { AssetManager } from './AssetManager';
import { AspectRatio, ContentPurpose } from './types';
import { VideoFormat } from './video';
import { FontAsset } from './font';

/**
 * Test function to demonstrate AssetManager usage
 */
async function testAssetManager() {
  try {
    console.log('Initializing AssetManager...');

    // Create and initialize the AssetManager
    const assetManager = new AssetManager();
    await assetManager.initialize();

    console.log('AssetManager initialized successfully.');

    // Example 1: Get all video assets
    console.log('\nExample 1: Get all video assets');
    const allVideos = assetManager.getVideos();
    console.log(`Found ${allVideos.length} video assets.`);
    allVideos.forEach(video => {
      console.log(`- ${video.title} (${video.duration}s, ${video.aspectRatio})`);
    });

    // Example 2: Get all intro videos in 16:9 aspect ratio with duration less than 10 seconds
    console.log('\nExample 2: Get intro videos in 16:9 with duration < 10s');
    const introVideos = assetManager.getVideos({
      contentPurpose: [ContentPurpose.INTRO],
      aspectRatio: AspectRatio.LANDSCAPE_WIDESCREEN,
      maxDuration: 10
    });
    console.log(`Found ${introVideos.length} matching intro videos.`);
    introVideos.forEach(video => {
      console.log(`- ${video.title} (${video.duration}s, ${video.aspectRatio})`);
    });

    // Example 3: Get all MP4 videos with audio
    console.log('\nExample 3: Get MP4 videos with audio');
    const mp4Videos = assetManager.getVideos({
      format: [VideoFormat.MP4],
      hasAudio: true
    });
    console.log(`Found ${mp4Videos.length} MP4 videos with audio.`);
    mp4Videos.forEach(video => {
      console.log(`- ${video.title} (format: ${video.format})`);
    });

    // Example 4: Get all assets by a specific author
    console.log('\nExample 4: Get all assets by "T Savo"');
    const authorVideos = assetManager.getVideos({
      author: 'T Savo'
    });
    console.log(`Found ${authorVideos.length} videos by T Savo.`);

    // Example 5: Get all images with cyberpunk tag
    console.log('\nExample 5: Get all images with cyberpunk tag');
    const cyberpunkImages = assetManager.getImages({
      tags: ['cyberpunk']
    });
    console.log(`Found ${cyberpunkImages.length} cyberpunk images.`);

    // Example 6: Get all background audio assets
    console.log('\nExample 6: Get all background audio assets');
    const backgroundAudio = assetManager.getAudio({
      contentPurpose: [ContentPurpose.BACKGROUND]
    });
    console.log(`Found ${backgroundAudio.length} background audio assets.`);
    backgroundAudio.forEach(audio => {
      console.log(`- ${audio.title} (${audio.duration}s)`);
    });

    // Example 7: Using multiple filters together
    console.log('\nExample 7: Get all marketing videos created in 2025 with duration < 8s');
    const marketingVideos = assetManager.getVideos({
      tags: ['marketing'],
      maxDuration: 8,
      dateCreatedAfter: '2025-01-01T00:00:00Z',
      dateCreatedBefore: '2025-12-31T23:59:59Z'
    });
    console.log(`Found ${marketingVideos.length} matching marketing videos.`);
    marketingVideos.forEach(video => {
      console.log(`- ${video.title} (${video.duration}s, created: ${video.dateCreated})`);
    });

    // Example 8: Using the generic getMedia method with type casting
    console.log('\nExample 8: Using getMedia to get all font assets');
    const allFonts = assetManager.getMedia<FontAsset>();
    console.log(`Found ${allFonts.length} font assets.`);
    allFonts.forEach(font => {
      console.log(`- ${font.title} (family: ${font.family}, format: ${font.format})`);
    });

    // Example 9: Using the convenience methods
    console.log('\nExample 9: Using convenience methods');
    const introVids = assetManager.getIntroVideos();
    console.log(`Found ${introVids.length} intro videos using the convenience method.`);

    const wideImages = assetManager.getImagesByAspectRatio(AspectRatio.LANDSCAPE_WIDESCREEN);
    console.log(`Found ${wideImages.length} widescreen images using the convenience method.`);

    const shortVids = assetManager.getShortVideos(10);
    console.log(`Found ${shortVids.length} videos under 10 seconds using the convenience method.`);

    console.log('\nAll tests completed successfully.');
  } catch (error) {
    console.error('Error testing AssetManager:', error);
  }
}

// Run the test function
testAssetManager();
