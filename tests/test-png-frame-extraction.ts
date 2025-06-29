/**
 * Test PNG Frame Extraction
 *
 * Tests the FFmpeg Video-to-Image implementation specifically for PNG output.
 */

import { SmartAssetFactory } from '../src/media/assets/SmartAssetFactory';
import { VideoAsset } from '../src/media/assets/types';
import { Image } from '../src/media/assets/roles';
import * as path from 'path';
import * as fs from 'fs';

// Import all providers to ensure they register themselves
import '../src/media/providers';

async function testPngFrameExtraction() {
  console.log('🖼️ TESTING PNG FRAME EXTRACTION');
  console.log('===================================');

  try {
    // Ensure temp directory exists
    const tempDir = path.normalize(path.join(__dirname, '../temp'));
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Load test video
    const videoPath = path.normalize(path.join(__dirname, '../test-videos', 'base.mp4'));
    console.log(`📁 Loading video: ${videoPath}`);

    const videoAsset = await SmartAssetFactory.load<VideoAsset>(videoPath);
    console.log(`✅ Video loaded: ${videoAsset.toString()}\n`);

    // Test 1: Extract a PNG frame
    console.log('🚀 ATTEMPTING PNG FRAME EXTRACTION:');
    const extractedImage = await videoAsset.asRole(Image, { format: 'png' });
    console.log(`   ✅ SUCCESS! Frame extracted: ${extractedImage.toString()}`);
    console.log(`   Image format: ${extractedImage.format}`);
    console.log(`   Image size: ${extractedImage.data.length} bytes`);
    console.log(`   Metadata: ${JSON.stringify(extractedImage.metadata, null, 2)}\n`);

    // Test 2: Verify the extracted image is a PNG
    console.log('🔍 VERIFYING IMAGE FORMAT:');
    if (extractedImage.format === 'png') {
      console.log('   ✅ Extracted image format is PNG.');
    } else {
      console.log(`   ❌ Extracted image format is ${extractedImage.format}, expected PNG.`);
      throw new Error('Incorrect image format');
    }

    // Test 3: Attempt to save the image to a temporary file and check its header
    console.log('💾 SAVING AND VERIFYING FILE HEADER:');
    const tempPngPath = path.normalize(path.join(tempDir, `test_extracted_frame_${Date.now()}.png`));
    fs.writeFileSync(tempPngPath, extractedImage.data);
    console.log(`   ✅ Image saved to: ${tempPngPath}`);

    // Read the first few bytes to check for PNG signature (89 50 4E 47 0D 0A 1A 0A)
    const fileBuffer = fs.readFileSync(tempPngPath);
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    if (fileBuffer.slice(0, 8).equals(pngSignature)) {
      console.log('   ✅ File header matches PNG signature.');
    } else {
      console.log('   ❌ File header does NOT match PNG signature.');
      throw new Error('Invalid PNG file header');
    }

    // Clean up temporary file
    fs.unlinkSync(tempPngPath);
    console.log('   ✅ Temporary file cleaned up.');

    console.log('\n🏆 PNG FRAME EXTRACTION TEST PASSED!');

  } catch (error) {
    console.error(`❌ PNG FRAME EXTRACTION TEST FAILED: ${error.message}`);
  }
}

if (require.main === module) {
  testPngFrameExtraction();
}

export { testPngFrameExtraction };
