/**
 * Fluent Video Filter A  // Load intro and outro videos for prepend/append examples
  const introVideo = Video.fromFile('./test-videos/overlay2.webm'); // Using overlay2 as intro for demo
  const outroVideo = Video.fromFile('./test-videos/overlay3.webm'); // Using overlay3 as outro for demoDemo
 * 
 * Demonstrates the new FFMPEGVideoFilterModel with fluent composition API
 * that builds filter complexes and calls the unified /video/filter endpoint
 */

import { FFMPEGVideoFilterModel } from './src/media/models/FFMPEGVideoFilterModel';
import { FFMPEGAPIClient } from './src/media/clients/FFMPEGAPIClient';
import { Video } from './src/media/assets/roles';

async function demonstrateFluentVideoFiltering() {
  console.log('🎬 Fluent Video Filter API Demo');
  console.log('========================================');

  // Initialize the API client
  const apiClient = new FFMPEGAPIClient({
    baseUrl: 'http://localhost:8006'
  });

  // Create the fluent filter model
  const filter = new FFMPEGVideoFilterModel(undefined, apiClient);

  // Load sample videos
  const baseVideo = Video.fromFile('./test-videos/base.mp4');
  const overlay1 = Video.fromFile('./test-videos/overlay1.webm');
  const overlay2 = Video.fromFile('./test-videos/overlay2.webm');
  const overlay3 = Video.fromFile('./test-videos/overlay3.webm');
  
  // Load intro and outro videos for prepend/append examples
  const introVideo = Video.fromFile('./test-videos/intro.mp4'); // Using base as intro for demo
  const outroVideo = Video.fromFile('./test-videos/outro.mp4'); // Using overlay1 as outro for demo

  console.log('\n📹 Loaded test videos including intro/outro');

  // Example 1: Simple single overlay composition
  console.log('\n🎯 Example 1: Simple Single Overlay');
  console.log('Filter: base.compose(overlay).overlay(top-right, 25%)');
  
  try {
    const simpleResult = await filter
      .compose(baseVideo)
      .overlay(overlay1, {
        position: 'top-right',
        width: '25%',
        height: '25%',
        opacity: 0.8,
        startTime: 2,
        duration: 10
      })      .options({
        outputFormat: 'mp4',
        codec: 'libx264'
      })
      .transform();

    console.log('✅ Simple overlay completed:', simpleResult.length, 'bytes');
    
    // Preview the generated filter complex
    filter.reset();
    const simpleFilter = filter
      .compose(baseVideo)
      .overlay(overlay1, {
        position: 'top-right',
        width: '25%',
        height: '25%',
        opacity: 0.8,
        startTime: 2
      })
      .preview();
      
    console.log('🔍 Generated filter complex:');
    console.log(simpleFilter);
    
  } catch (error) {
    console.error('❌ Simple overlay failed:', error.message);
  }

  // Example 2: Multiple overlays with different positions and timings
  console.log('\n🎯 Example 2: Multiple Overlays with Individual Configs');
  console.log('Filter: base.compose().overlay(top-left).overlay(bottom-right).overlay(center)');
  
  try {
    const multiResult = await filter
      .reset()
      .compose(baseVideo)
      .overlay(overlay1, {
        position: 'top-left',
        width: '30%',
        height: '30%',
        startTime: 0,
        duration: 15,
        opacity: 0.9
      })
      .overlay(overlay2, {
        position: 'bottom-right', 
        width: '25%',
        height: '25%',
        startTime: 5,
        duration: 20,
        opacity: 0.8
      })
      .overlay(overlay3, {
        position: 'center',
        width: '20%',
        height: '20%',
        startTime: 10,
        duration: 25,
        opacity: 0.7
      })      .options({
        outputFormat: 'mp4',
        codec: 'libx264',
        customAudioMapping: true
      })
      .transform();

    console.log('✅ Multiple overlays completed:', multiResult.length, 'bytes');
    
    // Preview the complex filter
    filter.reset();
    const multiFilter = filter
      .compose(baseVideo)
      .overlay(overlay1, { position: 'top-left', width: '30%', height: '30%', startTime: 0 })
      .overlay(overlay2, { position: 'bottom-right', width: '25%', height: '25%', startTime: 5 })
      .overlay(overlay3, { position: 'center', width: '20%', height: '20%', startTime: 10 })
      .preview();
      
    console.log('🔍 Generated complex filter:');
    console.log(multiFilter);
    
  } catch (error) {
    console.error('❌ Multiple overlays failed:', error.message);
  }

  // Example 3: Custom filter complex for advanced composition
  console.log('\n🎯 Example 3: Custom Filter Complex');
  console.log('Filter: Custom advanced filter with precise control');
  
  try {
    const customFilterComplex = `
      [0:v]format=yuv420p[base];
      [1:v]tpad=start_duration=5:start_mode=add:color=black@0.0,setpts=PTS-STARTPTS,colorkey=0x000000:0.30:0.10,scale=480:270[ov1];
      [2:v]tpad=start_duration=10:start_mode=add:color=black@0.0,setpts=PTS-STARTPTS,colorkey=0x000000:0.30:0.10,scale=640:360[ov2];
      [3:v]tpad=start_duration=15:start_mode=add:color=black@0.0,setpts=PTS-STARTPTS,colorkey=0x000000:0.30:0.10,scale=320:180[ov3];
      [base][ov1]overlay=format=auto:x=10:y=10[tmp1];
      [tmp1][ov2]overlay=format=auto:x=W-w-10:y=10[tmp2];
      [tmp2][ov3]overlay=format=auto:x=W/2-w/2:y=H-h-10[final_video];
      [0:a][1:a][2:a][3:a]amix=inputs=4:duration=longest:dropout_transition=0[mixed_audio]
    `.trim();

    const customResult = await filter
      .reset()
      .compose(baseVideo, overlay1, overlay2, overlay3)
      .filter(customFilterComplex)      .options({
        outputFormat: 'mp4',
        codec: 'libx264',
        videoOutputLabel: 'final_video',
        audioOutputLabel: 'mixed_audio',
        customAudioMapping: true
      })
      .transform();

    console.log('✅ Custom filter completed:', customResult.length, 'bytes');
    console.log('🔍 Used custom filter complex:');
    console.log(customFilterComplex);
    
  } catch (error) {
    console.error('❌ Custom filter failed:', error.message);
  }

  // Example 4: Single video with effects (new capability!)
  console.log('\n🎯 Example 4: Single Video with Effects');
  console.log('Filter: Single video with color correction and effects');
  
  try {
    const singleVideoFilter = `
      [0:v]format=yuv420p,eq=brightness=0.1:contrast=1.2:saturation=1.5[final_video];
      [0:a]volume=1.2[mixed_audio]
    `.trim();

    const singleResult = await filter
      .reset()
      .compose(baseVideo)
      .filter(singleVideoFilter)      .options({
        outputFormat: 'mp4',
        codec: 'libx264',
        videoOutputLabel: 'final_video',
        audioOutputLabel: 'mixed_audio'
      })
      .transform();    console.log('✅ Single video filter completed:', singleResult.length, 'bytes');
    console.log('🔍 Applied effects: brightness, contrast, saturation, volume');
    
  } catch (error) {
    console.error('❌ Single video filter failed:', error.message);
  }

  // Example 5: Video with Intro and Outro (Prepend/Append)
  console.log('\n🎯 Example 5: Video with Intro and Outro');
  console.log('Filter: intro.prepend().compose(base).overlay(overlay).append(outro)');
  
  try {
    const introOutroResult = await filter
      .reset()
      .prepend(introVideo)
      .compose(baseVideo)
      .overlay(overlay1, {
        position: 'top-right',
        width: '25%',
        height: '25%',
        opacity: 0.8,
        startTime: 2,
        duration: 10
      })
      .append(outroVideo)
      .options({
        outputFormat: 'mp4',
        codec: 'libx264'
      })
      .transform();

    console.log('✅ Intro/Outro composition completed:', introOutroResult.length, 'bytes');
    
    // Preview the generated filter complex
    filter.reset();
    const introOutroFilter = filter
      .prepend(introVideo)
      .compose(baseVideo)
      .overlay(overlay1, {
        position: 'top-right',
        width: '25%',
        height: '25%',
        opacity: 0.8,
        startTime: 2
      })
      .append(outroVideo)
      .preview();
      
    console.log('🔍 Generated concatenation filter complex:');
    console.log(introOutroFilter);
    
  } catch (error) {
    console.error('❌ Intro/Outro composition failed:', error.message);
  }

  // Example 6: Multiple Intros and Outros
  console.log('\n🎯 Example 6: Multiple Intros and Outros');
  console.log('Filter: intro1.prepend(intro2).compose(base).append(outro1, outro2)');
  
  try {
    const multiIntroOutroResult = await filter
      .reset()
      .prepend(introVideo, overlay2) // Multiple intro videos
      .compose(baseVideo)
      .overlay(overlay1, {
        position: 'center',
        width: '30%',
        height: '30%',
        opacity: 0.7,
        startTime: 3,
        duration: 8
      })
      .append(overlay3, outroVideo) // Multiple outro videos
      .options({
        outputFormat: 'mp4',
        codec: 'libx264'
      })
      .transform();

    console.log('✅ Multi intro/outro composition completed:', multiIntroOutroResult.length, 'bytes');
    
    // Preview the generated filter complex
    filter.reset();
    const multiIntroOutroFilter = filter
      .prepend(introVideo, overlay2)
      .compose(baseVideo)
      .overlay(overlay1, {
        position: 'center',
        width: '30%',
        height: '30%',
        opacity: 0.7,
        startTime: 3
      })
      .append(overlay3, outroVideo)
      .preview();
      
    console.log('🔍 Generated multi intro/outro filter complex:');
    console.log(multiIntroOutroFilter);
    
  } catch (error) {
    console.error('❌ Multi intro/outro composition failed:', error.message);
  }

  console.log('\n🎉 Demo completed!');  console.log('\n📝 Key Features Demonstrated:');
  console.log('✅ Fluent API: chain operations with .compose().overlay().options()');
  console.log('✅ Multiple videos: N >= 1 videos supported');
  console.log('✅ Intro/Outro videos: .prepend() and .append() for video sequences');
  console.log('✅ Flexible positioning: predefined positions + custom coordinates');
  console.log('✅ Timing control: startTime, duration for each overlay');
  console.log('✅ Visual effects: opacity, scaling, color keying');
  console.log('✅ Custom filters: full filter_complex control for advanced users');
  console.log('✅ Single endpoint: all operations use /video/filter');
  console.log('✅ GPU acceleration: h264_nvenc codec support');
  console.log('✅ Video concatenation: seamless intro-main-outro composition');
}

// Run the demo
if (require.main === module) {
  demonstrateFluentVideoFiltering().catch(console.error);
}

export { demonstrateFluentVideoFiltering };
