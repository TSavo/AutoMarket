/**
 * ACTUAL EXECUTION TEST - Run the complex filter with FFmpeg
 * 
 * This will actually execute your requirements:
 * - Intro prepended
 * - Base video  
 * - Overlays with color keying, scaling, timing
 * - Outro appended
 */

import { FFMPEGLocalClient } from './src/media/providers/docker/ffmpeg/FFMPEGLocalClient';
import { FFMPEGVideoFilterModel } from './src/media/providers/docker/ffmpeg/FFMPEGVideoFilterModel';
import { FFMPEGCompositionBuilder } from './src/media/providers/docker/ffmpeg/FFMPEGCompositionBuilder';
import { SmartAssetFactory } from './src/media/assets/SmartAssetFactory';
import { hasVideoRole } from './src/media/assets/roles';
import fs from 'fs';
import path from 'path';

async function executeComplexComposition() {
  console.log('🎬 EXECUTING COMPLEX COMPOSITION WITH FFMPEG...\n');

  const testVideoDir = path.join(process.cwd(), 'test-videos');
  const localClient = new FFMPEGLocalClient({ timeout: 300000 });

  // Load videos
  const requiredFiles = {
    base: path.join(testVideoDir, 'base.mp4'),
    intro: path.join(testVideoDir, 'intro.mp4'), 
    outro: path.join(testVideoDir, 'outro.mp4'),
    overlay1: path.join(testVideoDir, 'overlay1.webm')
  };

  console.log('📁 Loading videos...');
  const videos: any = {};
  const videoBuffers: Buffer[] = [];
  
  for (const [name, filePath] of Object.entries(requiredFiles)) {
    if (fs.existsSync(filePath)) {
      try {
        const asset = SmartAssetFactory.load(filePath);
        if (hasVideoRole(asset)) {
          videos[name] = await asset.asVideo();
          videoBuffers.push(videos[name].data);
          console.log(`✅ ${name}: ${filePath} (${videos[name].data.length} bytes)`);
        }
      } catch (error) {
        console.log(`❌ Failed to load ${name}: ${error.message}`);
      }
    } else {
      console.log(`⚠️ Missing ${name}: ${filePath}`);
    }
  }

  if (!videos.base) {
    console.log('❌ Base video required');
    return;
  }

  // Build the composition
  console.log('\n🏗️ Building complex composition...');
  const composer = new FFMPEGCompositionBuilder()
    .compose(videos.base);

  if (videos.intro) {
    composer.prepend(videos.intro);
    console.log('✅ Intro prepended');
  }

  if (videos.outro) {
    composer.append(videos.outro);
    console.log('✅ Outro appended');
  }

  if (videos.overlay1) {
    composer.addOverlay(videos.overlay1, {
      position: 'top-right',
      width: '25%',           // 25% scale
      height: '25%',          // 25% scale
      startTime: 10,           // Start at 2 seconds
      opacity: 0.8,
      colorKey: '#000000',    // Remove black background
      colorKeySimilarity: 0.3,
      colorKeyBlend: 0.1
    });
      composer.addOverlay(videos.overlay1, {
      position: 'top-right',
      width: '25%',           // 25% scale
      height: '25%',          // 25% scale
      startTime: 20,           // Start at 2 seconds
      opacity: 0.8,
      colorKey: '#000000',    // Remove black background
      colorKeySimilarity: 0.3,
      colorKeyBlend: 0.1
    });
    console.log('✅ Overlay added with color keying and 25% scale');
  }

  // Get the filter complex
  const filterComplex = composer.buildFilterComplex();
  console.log('\n🔧 Filter Complex:');
  console.log('='.repeat(80));
  console.log(filterComplex);
  console.log('='.repeat(80));  // NOW ACTUALLY EXECUTE WITH THE KICKER - composer.transform(model)!
  console.log('\n🚀 EXECUTING WITH COMPOSER.TRANSFORM()...');
  
  try {
    // Create the FFMPEGVideoFilterModel instance
    const model = new FFMPEGVideoFilterModel(undefined, localClient);
    
    // THE KICKER: super clean interface!
    const result = await composer.transform(model);

    console.log('\n🎉 COMPOSER.TRANSFORM() SUCCESS!');
    console.log(`📄 Result: ${result.data.length} bytes`);
    console.log(`⏱️ Duration: ${result.getDuration()}s`);
    console.log(`📺 Dimensions: ${result.getDimensions()?.width}x${result.getDimensions()?.height}`);

    // Save the result
    const outputPath = path.join(process.cwd(), 'test-complex-composition-EXECUTED.mp4');
    fs.writeFileSync(outputPath, result.data);
    console.log(`💾 Saved to: ${outputPath}`);console.log('\n✅ VERIFICATION:');
    console.log('   → Check the output video to verify:');
    console.log('   → 1. Intro plays first');
    console.log('   → 2. Base video plays in middle');  
    console.log('   → 3. Overlay appears at 10s with 25% size in top-right');
    console.log('   → 4. Overlay has black background removed (color keyed)');
    console.log('   → 5. Outro plays at the end');

  } catch (error) {
    console.error('❌ Model.transform() execution failed:', error.message);
    console.error(error.stack);
      // Show debug info
    console.log('\n🔧 DEBUG INFO:');
    console.log('Filter Complex built by composer:');
    console.log(filterComplex);
    console.log('\nLoaded video count:', Object.keys(videos).length);
  }
}

executeComplexComposition().catch(console.error);
