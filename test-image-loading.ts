/**
 * Test Image Asset Loading
 * 
 * Test loading PNG files into the asset system
 */

import { SmartAssetFactory } from './src/media/assets/SmartAssetFactory';
import { hasImageRole, Image } from './src/media/assets/roles';

async function testImageLoading() {
  console.log('🖼️ Testing image asset loading...\n');

  try {
    // Create a test PNG file path (this would be where the Together AI saves files)
    const testPngPath = 'C:\\Users\\T\\AppData\\Local\\Temp\\test-image.png';
    
    // Create a small test PNG buffer (1x1 pixel PNG)
    const fs = require('fs');
    const testPngBuffer = Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
      0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222,
      0, 0, 0, 12, 73, 68, 65, 84, 8, 215, 99, 248, 15, 0, 0, 1,
      0, 1, 255, 255, 255, 255, 0, 0, 0, 2, 0, 0, 1, 218, 202, 218, 218
    ]);
    
    // Write test file
    fs.writeFileSync(testPngPath, testPngBuffer);
    
    console.log('1️⃣ Loading PNG file with SmartAssetFactory...');
    const asset = SmartAssetFactory.load(testPngPath);
    console.log(`✅ Asset loaded: ${asset.toString()}`);
    
    console.log('2️⃣ Checking if asset has image role...');
    if (hasImageRole(asset)) {
      console.log('✅ Asset has image role capability');
      
      console.log('3️⃣ Converting to image...');
      const image = await asset.asRole(Image);
      console.log(`✅ Image created: ${image.toString()}`);
      
      console.log('4️⃣ Getting image metadata...');
      const metadata = asset.getImageMetadata();
      console.log(`✅ Metadata: ${JSON.stringify(metadata, null, 2)}`);
      
    } else {
      console.log('❌ Asset does not have image role capability');
    }
    
    // Clean up
    if (fs.existsSync(testPngPath)) {
      fs.unlinkSync(testPngPath);
    }
    
    console.log('\n🎉 Image loading test completed successfully!');
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the test
if (require.main === module) {
  testImageLoading().catch(console.error);
}

export { testImageLoading };
