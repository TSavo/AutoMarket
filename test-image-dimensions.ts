/**
 * Test Image getDimensions Method
 * 
 * Test that the getDimensions() method works on the Image class
 */

import { Image } from './src/media/assets/roles';

async function testImageDimensions() {
  console.log('📐 Testing Image getDimensions method...\n');

  try {
    // Create test PNG buffer with some metadata
    const testPngBuffer = Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
      0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222,
      0, 0, 0, 12, 73, 68, 65, 84, 8, 215, 99, 248, 15, 0, 0, 1,
      0, 1, 255, 255, 255, 255, 0, 0, 0, 2, 0, 0, 1, 218, 202, 218, 218
    ]);

    console.log('1️⃣ Creating Image with metadata...');
    const image = new Image(testPngBuffer, 'png', {
      width: 1024,
      height: 768,
      format: 'png'
    });

    console.log('2️⃣ Testing getDimensions() method...');
    const dimensions = image.getDimensions();
    console.log(`✅ getDimensions() returned: ${JSON.stringify(dimensions)}`);

    console.log('3️⃣ Testing other methods...');
    console.log(`   getWidth(): ${image.getWidth()}`);
    console.log(`   getHeight(): ${image.getHeight()}`);
    console.log(`   getSize(): ${image.getSize()}`);
    console.log(`   getFileSize(): ${image.getFileSize()}`);
    console.log(`   isValid(): ${image.isValid()}`);

    console.log('4️⃣ Testing fromUrl method...');
    const urlImage = Image.fromUrl('https://example.com/image.png', 'png', {
      width: 512,
      height: 512
    });
    console.log(`✅ URL Image: ${urlImage.toString()}`);
    console.log(`   getDimensions(): ${JSON.stringify(urlImage.getDimensions())}`);

    console.log('\n🎉 Image getDimensions test completed successfully!');
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the test
if (require.main === module) {
  testImageDimensions().catch(console.error);
}

export { testImageDimensions };
