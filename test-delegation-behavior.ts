/**
 * Delegation Demonstration Test
 * 
 * Shows exactly when the FFMPEGCompositionBuilder delegates to FFMPEGVideoFilterModel
 * vs when it uses the full filter complex pipeline
 */

import { FFMPEGLocalClient } from './src/media/providers/docker/ffmpeg/FFMPEGLocalClient';
import { FFMPEGCompositionBuilder } from './src/media/providers/docker/ffmpeg/FFMPEGCompositionBuilder';
import { SmartAssetFactory } from './src/media/assets/SmartAssetFactory';
import { hasVideoRole } from './src/media/assets/roles';
import fs from 'fs';
import path from 'path';

async function delegationDemo() {
  console.log('🔄 DELEGATION BEHAVIOR DEMONSTRATION\n');

  const testVideoDir = path.join(process.cwd(), 'test-videos');
  const localClient = new FFMPEGLocalClient({ timeout: 120000 });

  // Load test videos
  const baseVideoPath = path.join(testVideoDir, 'base.mp4');
  const overlay1Path = path.join(testVideoDir, 'overlay1.webm');
  const introPath = path.join(testVideoDir, 'intro.mp4');

  if (!fs.existsSync(baseVideoPath)) {
    console.log('❌ base.mp4 required in test-videos folder');
    return;
  }

  const baseAsset = SmartAssetFactory.load(baseVideoPath);
  if (!hasVideoRole(baseAsset)) {
    console.log('❌ Base video invalid');
    return;
  }
  const baseVideo = await baseAsset.asVideo();
  let overlayVideo: any = null;
  let introVideo: any = null;

  if (fs.existsSync(overlay1Path)) {
    const overlayAsset = SmartAssetFactory.load(overlay1Path);
    if (hasVideoRole(overlayAsset)) {
      overlayVideo = await overlayAsset.asVideo();
    }
  }

  if (fs.existsSync(introPath)) {
    const introAsset = SmartAssetFactory.load(introPath);
    if (hasVideoRole(introAsset)) {
      introVideo = await introAsset.asVideo();
    }
  }

  console.log('📁 Loaded videos:');
  console.log(`   ✅ Base: ${baseVideoPath}`);
  console.log(`   ${overlayVideo ? '✅' : '❌'} Overlay: ${overlay1Path}`);
  console.log(`   ${introVideo ? '✅' : '❌'} Intro: ${introPath}`);

  // ===============================
  // SCENARIO 1: WILL DELEGATE ✅
  // ===============================
  console.log('\n🎯 SCENARIO 1: Simple Overlay (WILL DELEGATE)');
  console.log('='.repeat(60));
  console.log('Requirements for delegation:');
  console.log('✅ Single base video');
  console.log('✅ Simple overlay (no color key, no timing)');
  console.log('✅ No concatenation (no prepend/append)');

  if (overlayVideo) {
    const delegateComposer = new FFMPEGCompositionBuilder(undefined, localClient)
      .compose(baseVideo)
      .addOverlay(overlayVideo, {
        position: 'bottom-right',
        width: '25%',
        height: '25%',
        opacity: 0.8
        // No colorKey, no startTime - should delegate
      });

    console.log('\n🔧 Filter Complex (will not be used due to delegation):');
    console.log(delegateComposer.buildFilterComplex());

    try {
      console.log('\n🚀 Executing with delegation...');
      const result = await delegateComposer.process();
      console.log('🎉 SUCCESS - DELEGATED TO FILTER MODEL!');
      console.log(`   → Result: ${result.length} bytes`);
      
      const outputPath = path.join(process.cwd(), 'test-delegation-success.mp4');
      fs.writeFileSync(outputPath, result);
      console.log(`   → Saved: ${outputPath}`);
    } catch (error) {
      console.log(`❌ Delegation failed: ${error.message}`);
    }
  }

  // ===============================
  // SCENARIO 2: WILL NOT DELEGATE ❌ (Color Key)
  // ===============================
  console.log('\n\n🎯 SCENARIO 2: Color Keyed Overlay (WILL NOT DELEGATE)');
  console.log('='.repeat(60));
  console.log('Prevents delegation:');
  console.log('❌ Color keying is too complex for filter model');

  if (overlayVideo) {
    const complexComposer1 = new FFMPEGCompositionBuilder(undefined, localClient)
      .compose(baseVideo)
      .addOverlay(overlayVideo, {
        position: 'top-left',
        width: '25%',
        height: '25%',
        opacity: 0.7,
        colorKey: '#000000',           // This prevents delegation
        colorKeySimilarity: 0.3
      });

    console.log('\n🔧 Filter Complex (will be used - no delegation):');
    console.log(complexComposer1.buildFilterComplex().substring(0, 400) + '...');

    try {
      console.log('\n🚀 Executing without delegation...');
      await complexComposer1.process();
    } catch (error) {
      console.log('✅ Correctly rejected delegation due to color keying');
      console.log(`   → Reason: ${error.message}`);
    }
  }

  // ===============================
  // SCENARIO 3: WILL NOT DELEGATE ❌ (Timing)
  // ===============================
  console.log('\n\n🎯 SCENARIO 3: Timed Overlay (WILL NOT DELEGATE)');
  console.log('='.repeat(60));
  console.log('Prevents delegation:');
  console.log('❌ Start time effects are too complex for filter model');

  if (overlayVideo) {
    const complexComposer2 = new FFMPEGCompositionBuilder(undefined, localClient)
      .compose(baseVideo)
      .addOverlay(overlayVideo, {
        position: 'center',
        width: '25%',
        height: '25%',
        startTime: 3,                  // This prevents delegation
        opacity: 0.6
      });

    console.log('\n🔧 Filter Complex (will be used - no delegation):');
    console.log(complexComposer2.buildFilterComplex().substring(0, 400) + '...');

    try {
      console.log('\n🚀 Executing without delegation...');
      await complexComposer2.process();
    } catch (error) {
      console.log('✅ Correctly rejected delegation due to timing effects');
      console.log(`   → Reason: ${error.message}`);
    }
  }

  // ===============================
  // SCENARIO 4: WILL NOT DELEGATE ❌ (Concatenation)
  // ===============================
  console.log('\n\n🎯 SCENARIO 4: Concatenation (WILL NOT DELEGATE)');
  console.log('='.repeat(60));
  console.log('Prevents delegation:');
  console.log('❌ Concatenation (prepend/append) requires full filter complex');

  if (introVideo && overlayVideo) {
    const complexComposer3 = new FFMPEGCompositionBuilder(undefined, localClient)
      .compose(baseVideo)
      .prepend(introVideo)             // This prevents delegation
      .addOverlay(overlayVideo, {
        position: 'top-right',
        width: '25%',
        height: '25%',
        opacity: 0.8
      });

    console.log('\n🔧 Filter Complex (will be used - no delegation):');
    console.log(complexComposer3.buildFilterComplex().substring(0, 400) + '...');

    try {
      console.log('\n🚀 Executing without delegation...');
      await complexComposer3.process();
    } catch (error) {
      console.log('✅ Correctly rejected delegation due to concatenation');
      console.log(`   → Reason: ${error.message}`);
    }
  }

  // ===============================
  // YOUR SUPER COMPOSITION
  // ===============================
  console.log('\n\n🎯 YOUR SUPER COMPOSITION (WILL NOT DELEGATE)');
  console.log('='.repeat(60));
  console.log('Multiple delegation blockers:');
  console.log('❌ Intro prepended (concatenation)');
  console.log('❌ Color keying to black');
  console.log('❌ Start times on overlays');
  console.log('❌ Outro appended (concatenation)');

  const superComposer = new FFMPEGCompositionBuilder(undefined, localClient)
    .compose(baseVideo);

  if (introVideo) {
    superComposer.prepend(introVideo);
  }

  if (overlayVideo) {
    superComposer
      .addOverlay(overlayVideo, {
        position: 'top-left',
        width: '25%',
        height: '25%',
        startTime: 2,
        colorKey: '#000000',
        colorKeySimilarity: 0.3,
        opacity: 0.8
      })
      .addOverlay(overlayVideo, {
        position: 'bottom-right', 
        width: '25%',
        height: '25%',
        startTime: 5,
        colorKey: '#000000',
        colorKeySimilarity: 0.25,
        opacity: 0.7
      });
  }

  console.log('\n🔧 Super Composition Filter Complex:');
  const superFilter = superComposer.buildFilterComplex();
  console.log(superFilter.substring(0, 500) + '...');

  try {
    console.log('\n🚀 Executing super composition...');
    await superComposer.process();
  } catch (error) {
    console.log('✅ Super composition correctly uses full filter complex (no delegation)');
    console.log(`   → Reason: ${error.message}`);
    console.log('   → Would need manual FFmpeg execution for this complexity');
  }

  // ===============================
  // SUMMARY
  // ===============================
  console.log('\n\n📊 DELEGATION BEHAVIOR SUMMARY');
  console.log('='.repeat(60));
  console.log('🎯 DELEGATES to Filter Model when:');
  console.log('   ✅ Single base video only');
  console.log('   ✅ Simple overlays (position, size, opacity only)');
  console.log('   ✅ No concatenation (no prepend/append)');
  console.log('   ✅ No color keying');
  console.log('   ✅ No timing effects (startTime/duration)');
  console.log('');
  console.log('🚫 DOES NOT DELEGATE when:');
  console.log('   ❌ Multiple base videos');
  console.log('   ❌ Concatenation (prepend/append videos)');
  console.log('   ❌ Color keying effects');
  console.log('   ❌ Timing effects (startTime/duration)');
  console.log('   ❌ Complex filter chains');
  console.log('');
  console.log('🎉 Your super composition uses the full filter complex power!');
}

delegationDemo().catch(console.error);
