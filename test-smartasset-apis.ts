/**
 * Demo of both SmartAssetFactory APIs
 */

import { SmartAssetFactory } from './src/media/assets/SmartAssetFactory';
import { VideoAsset, AudioAsset, ImageAsset, TextAsset } from './src/media/assets/types';
import * as path from 'path';

async function testBothAPIs() {
  const videoPath = path.join(__dirname, 'test-videos', 'base.mp4');
  
  console.log('🔥 Testing improved SmartAssetFactory APIs...\n');
  
  // OPTION 1: Smart auto-detection (returns union type)
  console.log('📦 OPTION 1: Auto-detection API');
  const autoAsset = await SmartAssetFactory.load(videoPath);
  console.log(`Auto-detected: ${autoAsset.constructor.name}`);
  
  // Type checking needed with auto-detection
  if (autoAsset instanceof VideoAsset) {
    console.log(`✅ Confirmed VideoAsset: ${autoAsset.toString()}`);
  }
  
  console.log('\n📦 OPTION 2: Explicit type-safe API');
  // OPTION 2: Explicit type specification (fully type-safe)
  const explicitAsset = await SmartAssetFactory.load(videoPath) as VideoAsset;
  console.log(`✅ Explicit VideoAsset: ${explicitAsset.toString()}`);
  
  console.log('\n🎯 Key Differences:');
  console.log('  - Auto API: Convenient, but requires instanceof checks');
  console.log('  - Explicit API: Fully type-safe, no runtime checks needed');
  console.log('  - Both are clean - no weird casting or complex generics!');
}

if (require.main === module) {
  testBothAPIs().catch(console.error);
}

export { testBothAPIs };
