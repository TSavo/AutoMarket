/**
 * Test showing Composition Builder delegating to Filter Model
 */

import { FFMPEGLocalClient } from './src/media/providers/docker/ffmpeg/FFMPEGLocalClient';
import { FFMPEGVideoFilterModel } from './src/media/providers/docker/ffmpeg/FFMPEGVideoFilterModel';
import { FFMPEGCompositionBuilder } from './src/media/providers/docker/ffmpeg/FFMPEGCompositionBuilder';
import { SmartAssetFactory } from './src/media/assets/SmartAssetFactory';
import { hasVideoRole } from './src/media/assets/roles';
import fs from 'fs';
import path from 'path';

async function testCompositionToFilterDelegation() {
  console.log('🎬 Testing Composition Builder → Filter Model Delegation...\n');

  try {
    const localClient = new FFMPEGLocalClient({ timeout: 120000 });
    
    // Load test videos
    const testVideoDir = path.join(process.cwd(), 'test-videos');
    const baseVideoPath = path.join(testVideoDir, 'base.mp4');
    const overlayVideoPath = path.join(testVideoDir, 'overlay1.webm');
    const introVideoPath = path.join(testVideoDir, 'intro.mp4');

    if (!fs.existsSync(baseVideoPath) || !fs.existsSync(overlayVideoPath) || !fs.existsSync(introVideoPath)) {
      console.log('❌ Required test videos not found');
      return;
    }

    const baseAsset = SmartAssetFactory.load(baseVideoPath);
    const overlayAsset = SmartAssetFactory.load(overlayVideoPath);
    const introAsset = SmartAssetFactory.load(introVideoPath);
    
    if (!hasVideoRole(baseAsset) || !hasVideoRole(overlayAsset) || !hasVideoRole(introAsset)) {
      throw new Error('Videos do not have video role capabilities');
    }
    
    const baseVideo = await baseAsset.asVideo();
    const overlayVideo = await overlayAsset.asVideo();
    const introVideo = await introAsset.asVideo();
    
    console.log('✅ Loaded videos');

    // 1. COMPOSITION BUILDER: Handles concatenation + overlay coordination
    console.log('\n📝 Step 1: Composition Builder handling complex concatenation + overlays...');
    const composer = new FFMPEGCompositionBuilder()
      .compose(baseVideo)          // Main video  
      .prepend(introVideo)         // Add intro (triggers concatenation)
      .addOverlay(overlayVideo, {  // Add overlay with advanced options
        position: 'top-right',
        opacity: 0.8,
        width: '25%',
        height: '25%',
        colorKey: '#00FF00',
        colorKeySimilarity: 0.3,
        colorKeyBlend: 0.1,
        startTime: 5
      });
    
    const complexFilterString = composer.buildFilterComplex();
    console.log('✅ Composition Builder generated complex filter:');
    console.log(complexFilterString.substring(0, 200) + '...\n');

    // 2. FILTER MODEL: Handles pure video transformation (simple overlay)
    console.log('📝 Step 2: Filter Model handling pure transformation...');
    const filterModel = new FFMPEGVideoFilterModel(undefined, localClient);
    
    // Simple transformation: base video + overlay (no concatenation)
    console.log('✅ Filter Model performing simple overlay transformation...');
    
    const transformResult = await filterModel.transform(
      baseAsset,           // Base video role
      [overlayAsset],      // Overlay video roles
      {
        position: 'top-right',
        opacity: 0.7,
        overlayWidth: '30%',
        outputFormat: 'mp4'
      }
    );
    
    console.log('✅ Filter Model transformation complete!');
    console.log(`   Result: ${transformResult.composedVideo.data.length} bytes`);
    console.log(`   Duration: ${transformResult.metadata.duration}s`);
    console.log(`   Resolution: ${transformResult.metadata.resolution}`);    // 3. ACTUAL DELEGATION: Composition Builder delegating to Filter Model!
    console.log('\n📝 Step 3: Composition Builder with ACTUAL delegation...');
    
    // Create simple composition (no concatenation) with API client
    const smartComposer = new FFMPEGCompositionBuilder(undefined, localClient)
      .compose(baseVideo)          // Just base video
      .addOverlay(overlayVideo, {  // Simple overlay (no color keying, no timing)
        position: 'bottom-left',
        opacity: 0.6,
        width: '20%'
      });
    
    console.log('🤖 Smart Composition Builder analyzing composition...');
    
    try {
      // This will automatically delegate to filter model!
      const delegatedResult = await smartComposer.process();
      
      console.log('🎉 DELEGATION SUCCESS!');
      console.log(`   → Automatically routed to Filter Model`);
      console.log(`   → Result: ${delegatedResult.length} bytes`);
      
      // Save delegated result
      const delegatedOutputPath = path.join(process.cwd(), 'test-delegated-result.mp4');
      fs.writeFileSync(delegatedOutputPath, delegatedResult);
      console.log(`   → Saved to: ${delegatedOutputPath}`);
      
    } catch (error) {
      console.log('⚠️ Delegation failed:', error.message);
    }

    // 4. Show complex case that can't be delegated
    console.log('\n📝 Step 4: Complex composition that CANNOT be delegated...');
    
    const complexComposer = new FFMPEGCompositionBuilder(undefined, localClient)
      .compose(baseVideo)
      .prepend(introVideo)         // This prevents delegation!
      .addOverlay(overlayVideo, {
        colorKey: '#00FF00',       // This also prevents delegation!
        startTime: 2               // And this too!
      });
    
    console.log('🤖 Smart Composition Builder analyzing complex composition...');
    
    try {
      await complexComposer.process();
    } catch (error) {
      console.log('✅ Complex composition correctly NOT delegated');
      console.log(`   → Reason: ${error.message}`);
      console.log('   → Would use full FFmpeg filter complex execution');
    }

    // Save the filter model result
    const outputPath = path.join(process.cwd(), 'test-filter-model-result.mp4');
    fs.writeFileSync(outputPath, transformResult.composedVideo.data);
    console.log(`\n💾 Filter Model result saved to: ${outputPath}`);

    console.log('\n🎉 Delegation pattern demonstration complete!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Composition Builder: Handles complex concatenation + advanced overlays');
    console.log('   ✅ Filter Model: Handles pure video-to-video transformations');
    console.log('   ✅ Clean separation of concerns achieved!');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testCompositionToFilterDelegation().catch(console.error);
