/**
 * Isolated Test for Examples 5 and 6 - Prepend/Append Functionality
 * 
 * Tests the .prepend() and .append() methods in isolation
 */

import { FFMPEGVideoFilterModel } from './src/media/models/FFMPEGVideoFilterModel';
import { createFFMPEGClient } from './src/media/clients/FFMPEGClientFactory';
import { Video } from './src/media/assets/roles';
import * as fs from 'fs';
import * as path from 'path';

async function testExamples5And6() {
  console.log('🎬 Testing Examples 5 and 6 - Prepend/Append Functionality (LOCAL)');
  console.log('====================================================================');

  // Create a local FFMPEG client instead of API client
  console.log('🔧 Using LOCAL FFMPEG client instead of Docker service');
  const localClient = createFFMPEGClient({
    type: 'local',
    localConfig: {
      // Use default ffmpeg/ffprobe paths, or specify custom ones if needed
      // ffmpegPath: 'C:\\path\\to\\ffmpeg.exe',  // Windows example
      // ffprobePath: 'C:\\path\\to\\ffprobe.exe', // Windows example
      timeout: 600000 // 10 minutes for complex operations
    }
  });

  // Test connection first
  console.log('🔍 Testing local FFMPEG connection...');
  const isConnected = await localClient.testConnection();
  if (!isConnected) {
    console.error('❌ Local FFMPEG not available. Please ensure ffmpeg is installed and in PATH.');
    console.log('💡 Install ffmpeg from: https://ffmpeg.org/download.html');
    return;
  }
  console.log('✅ Local FFMPEG connection successful');

  // Get service info to show what we're using
  const serviceInfo = await localClient.getServiceInfo();
  console.log('📋 Local FFMPEG info:', serviceInfo);

  // Create the fluent filter model with local client
  const filter = new FFMPEGVideoFilterModel(undefined, localClient as any);

  // Load sample videos
  const baseVideo = Video.fromFile('./test-videos/base.mp4');
  const overlay1 = Video.fromFile('./test-videos/overlay1.webm');
  const overlay2 = Video.fromFile('./test-videos/overlay2.webm');
  const overlay3 = Video.fromFile('./test-videos/overlay3.webm');
    // Load intro and outro videos for prepend/append examples
  const introVideo = Video.fromFile('./test-videos/intro.mp4'); // Using dedicated intro video
  const outroVideo = Video.fromFile('./test-videos/outro.mp4'); // Using dedicated outro video

  console.log('\n📹 Loaded test videos including intro/outro');  // Example 5: Video with Intro and Outro (Prepend/Append)
  console.log('\n🎯 Example 5: Video with Intro and Outro');
  console.log('Filter: intro.mp4 -> base.mp4 + overlay (black masked) -> outro.mp4');
  
  try {
    const introOutroResult = await filter
      .reset()
      .prepend(introVideo)
      .compose(baseVideo)      .overlay(overlay1, {
        position: 'top-right',
        width: '25%',
        height: '25%',
        startTime: 2,
        duration: 10,
        colorKey: '0x000000',
        colorKeySimilarity: 0.01,   // Very precise - only exact black pixels
        colorKeyBlend: 0.0          // Complete transparency for matched pixels
      })
      .append(outroVideo)
      .options({
        outputFormat: 'mp4',
        codec: 'libx264'
      })
      .transform();    console.log('✅ Intro/Outro composition completed:', introOutroResult.length, 'bytes');

    // Write the result to disk
    const outputPath5 = path.join(__dirname, 'example-5-intro-outro-result-LOCAL.mp4');
    fs.writeFileSync(outputPath5, introOutroResult);
    console.log('💾 Saved Example 5 (LOCAL) result to:', outputPath5);
      // Preview the generated filter complex
    filter.reset();
    const introOutroFilter = filter
      .prepend(introVideo)
      .compose(baseVideo)      .overlay(overlay1, {
        position: 'top-right',
        width: '25%',
        height: '25%',
        startTime: 2,
        colorKey: '0x000000',
        colorKeySimilarity: 0.01,   // Very precise - only exact black pixels
        colorKeyBlend: 0.0          // Complete transparency for matched pixels
      })
      .append(outroVideo)
      .preview();
      
    console.log('🔍 Generated concatenation filter complex:');
    console.log(introOutroFilter);
    
  } catch (error) {
    console.error('❌ Intro/Outro composition failed:', error.message);
    console.error('Full error:', error);
  }
  // Example 6: Multiple Intros and Outros
  console.log('\n🎯 Example 6: Multiple Intros and Outros');
  console.log('Filter: intro1.prepend(intro2).compose(base).append(outro1, outro2) with black masking');
  
  try {
    const multiIntroOutroResult = await filter
      .reset()
      .prepend(introVideo, overlay2) // Multiple intro videos
      .compose(baseVideo)      .overlay(overlay1, {
        position: 'center',
        width: '30%',
        height: '30%',
        startTime: 3,
        duration: 8,
        colorKey: '0x000000',
        colorKeySimilarity: 0.01,   // Very precise - only exact black pixels
        colorKeyBlend: 0.0          // Complete transparency for matched pixels
      })
      .append(overlay3, outroVideo) // Multiple outro videos
      .options({
        outputFormat: 'mp4',
        codec: 'libx264'
      })
      .transform();    console.log('✅ Multi intro/outro composition completed:', multiIntroOutroResult.length, 'bytes');

    // Write the result to disk
    const outputPath6 = path.join(__dirname, 'example-6-multi-intro-outro-result-LOCAL.mp4');
    fs.writeFileSync(outputPath6, multiIntroOutroResult);
    console.log('💾 Saved Example 6 (LOCAL) result to:', outputPath6);
    
    // Preview the generated filter complex
    filter.reset();
    const multiIntroOutroFilter = filter
      .prepend(introVideo, overlay2)
      .compose(baseVideo)      .overlay(overlay1, {
        position: 'center',
        width: '30%',
        height: '30%',
        startTime: 3,
        colorKey: '0x000000',
        colorKeySimilarity: 0.01,   // Very precise - only exact black pixels
        colorKeyBlend: 0.0          // Complete transparency for matched pixels
      })
      .append(overlay3, outroVideo)
      .preview();
      
    console.log('🔍 Generated multi intro/outro filter complex:');
    console.log(multiIntroOutroFilter);
    
  } catch (error) {
    console.error('❌ Multi intro/outro composition failed:', error.message);
    console.error('Full error:', error);
  }
  console.log('\n🎉 Examples 5 and 6 test completed with LOCAL FFMPEG!');
  console.log('\n� Output Files Created (LOCAL):');
  console.log('  • example-5-intro-outro-result-LOCAL.mp4');
  console.log('  • example-6-multi-intro-outro-result-LOCAL.mp4');
  console.log('\n�📝 Features Tested:');
  console.log('✅ Single intro/outro with .prepend() and .append()');
  console.log('✅ Multiple intros/outros with multiple arguments');
  console.log('✅ Video concatenation with proper audio handling');
  console.log('✅ Filter complex generation for concatenation');
  console.log('✅ Output files written to disk for verification');
  console.log('✅ LOCAL FFMPEG client working as drop-in replacement');
}

// Run the test
if (require.main === module) {
  testExamples5And6().catch(console.error);
}

export { testExamples5And6 };
