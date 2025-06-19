/**
 * N-Video Composition Demo
 * 
 * Demonstrates the new flexible video composition system that supports:
 * 1. Single overlay (legacy compatibility)
 * 2. Multiple overlays with individual configs
 * 3. Custom filter complex for advanced compositions
 */

import { FFMPEGVideoComposerModel } from './src/media/models/FFMPEGVideoComposerModel';
import { FFMPEGDockerService } from './src/media/services/FFMPEGDockerService';
import { FFMPEGAPIClient } from './src/media/clients/FFMPEGAPIClient';
import { Video } from './src/media/assets/roles';

async function demonstrateNVideoComposition() {  // Initialize the services
  // Note: In real usage, you'd configure these with actual Docker services
  // const dockerService = new FFMPEGDockerService({
  //   containerName: 'automarket-ffmpeg'
  // });

  // const apiClient = new FFMPEGAPIClient({
  //   baseUrl: 'http://localhost:3001'
  // });

  // const composer = new FFMPEGVideoComposerModel({
  //   dockerService,
  //   apiClient
  // });

  console.log('🎬 N-Video Composition System Demo');
  console.log('This would demonstrate the new flexible video composition system.');
  // Example 1: Legacy single overlay (still works)
  console.log('🎬 Example 1: Single Overlay (Legacy)');
  console.log(`
  const baseVideo = Video.fromFile('./test-videos/base.mp4');
  const overlay1 = Video.fromFile('./test-videos/overlay1.mp4');

  const singleResult = await composer.transform(baseVideo, overlay1, {
    position: 'bottom-right',
    overlayStartTime: 5,
    overlayDuration: 10,
    overlayWidth: '30%',
    overlayHeight: '30%'
  });
  `);

  // Example 2: Multiple overlays with individual configs
  console.log('🎬 Example 2: Multiple Overlays with Configs');
  console.log(`
  const overlay2 = Video.fromFile('./test-videos/overlay2.mp4');
  const overlay3 = Video.fromFile('./test-videos/overlay3.mp4');

  const multiResult = await composer.transform(baseVideo, [overlay1, overlay2, overlay3], {
    overlayConfigs: [
      {
        startTime: 0,
        duration: 15,
        position: 'top-left',
        width: '25%',
        height: '25%',
        opacity: 0.8
      },
      {
        startTime: 5,
        duration: 20,
        position: 'top-right',
        width: '30%',
        height: '30%',
        opacity: 0.9
      },
      {
        startTime: 10,
        duration: 25,
        position: 'bottom-center',
        width: '35%',
        height: '35%',
        opacity: 1.0
      }
    ],
    outputFormat: 'mp4',
    codec: 'h264_nvenc'
  });
  `);

  // Example 3: Custom filter complex for advanced composition
  console.log('🎬 Example 3: Custom Filter Complex');
  console.log(`
  const customFilterComplex = \`
    [0:v]format=yuv420p[base];
    [1:v]tpad=start_duration=5:start_mode=add:color=black@0.0,setpts=PTS-STARTPTS,colorkey=0x000000:0.30:0.10,scale=480:270[ov1];
    [2:v]tpad=start_duration=10:start_mode=add:color=black@0.0,setpts=PTS-STARTPTS,colorkey=0x000000:0.30:0.10,scale=640:360[ov2];
    [3:v]tpad=start_duration=15:start_mode=add:color=black@0.0,setpts=PTS-STARTPTS,colorkey=0x000000:0.30:0.10,scale=320:180[ov3];
    [base][ov1]overlay=format=auto:x=10:y=10[tmp1];
    [tmp1][ov2]overlay=format=auto:x=W-w-10:y=10[tmp2];
    [tmp2][ov3]overlay=format=auto:x=W/2-w/2:y=H-h-10[final_video];
    [0:a][1:a][2:a][3:a]amix=inputs=4:duration=longest:dropout_transition=0[mixed_audio]
  \`.trim();

  const customResult = await composer.transform(baseVideo, [overlay1, overlay2, overlay3], {
    customFilterComplex,
    outputFormat: 'mp4',
    codec: 'h264_nvenc'
  });
  `);

  // Example 4: Convenience method for quick multi-overlay
  console.log('🎬 Example 4: Convenience Multi-Overlay Method');
  console.log(`
  const quickResult = await composer.multiOverlay(
    baseVideo,
    [overlay1, overlay2],
    [
      { startTime: 0, position: 'top-left', width: '25%', height: '25%' },
      { startTime: 10, position: 'bottom-right', width: '30%', height: '30%' }
    ]
  );
  `);

  // Example 5: NEW FLUENT API - The Future of Video Composition
  console.log('🎬 Example 5: NEW FLUENT API');
  console.log(`
  // With the new FFMPEGVideoFilterModel, you can now use a fluent interface:

  import { FFMPEGVideoFilterModel } from './src/media/models/FFMPEGVideoFilterModel';

  const filter = new FFMPEGVideoFilterModel(dockerService, apiClient);

  // Simple overlay
  const result1 = await filter
    .compose(baseVideo)
    .overlay(overlay1, { position: 'top-right', width: '25%', opacity: 0.8 })
    .options({ codec: 'h264_nvenc', outputFormat: 'mp4' })
    .transform();

  // Multiple overlays with individual timing
  const result2 = await filter
    .reset()
    .compose(baseVideo)
    .overlay(overlay1, { position: 'top-left', startTime: 0, duration: 15 })
    .overlay(overlay2, { position: 'bottom-right', startTime: 5, duration: 20 })
    .overlay(overlay3, { position: 'center', startTime: 10, duration: 25 })
    .transform();

  // Custom filter for power users
  const result3 = await filter
    .reset()
    .compose(baseVideo, overlay1, overlay2)
    .filter('[0:v][1:v]overlay=x=10:y=10[tmp]; [tmp][2:v]overlay=x=W-w-10:y=H-h-10[final_video]')
    .options({ videoOutputLabel: 'final_video' })
    .transform();

  // Preview filter without executing
  const filterComplex = filter
    .compose(baseVideo)
    .overlay(overlay1, { position: 'top-right' })
    .preview(); // Returns the generated filter complex string

  ✨ Key Benefits:
  🔗 Fluent chaining: Readable, intuitive API
  🎯 Type safety: Full TypeScript support
  🏗️ Filter building: Automatic filter complex generation
  🎛️ Full control: Custom filters for advanced users
  🔄 Reusable: Reset and reuse the same filter instance
  👁️ Preview mode: See the generated filter before execution
  📞 Single endpoint: All operations call /video/filter

  This fluent API calls the unified /video/filter endpoint that supports N >= 1 videos!
  `);

  // Example 6: Backward Compatibility Bridge  
  console.log('🎬 Example 6: BACKWARD COMPATIBILITY');
  console.log(`
  // The old FFMPEGVideoComposerModel can be updated to use the new fluent API internally:

  class FFMPEGVideoComposerModel {
    constructor(services) {
      this.filter = new FFMPEGVideoFilterModel(services.dockerService, services.apiClient);
    }

    // Legacy method - still works!
    async transform(baseVideo, overlay, options) {
      return await this.filter
        .compose(baseVideo)
        .overlay(overlay, options)
        .options(options)
        .transform();
    }

    // New multi-overlay method
    async transform(baseVideo, overlays, options) {
      let filter = this.filter.reset().compose(baseVideo);
      
      if (Array.isArray(overlays)) {
        overlays.forEach((overlay, i) => {
          const overlayOptions = options.overlayConfigs?.[i] || {};
          filter = filter.overlay(overlay, overlayOptions);
        });
      } else {
        filter = filter.overlay(overlays, options);
      }
      
      return await filter.options(options).transform();
    }
  }

  🎯 Migration Path:
  1. ✅ Keep existing FFMPEGVideoComposerModel for compatibility
  2. ✅ Add new FFMPEGVideoFilterModel for fluent API
  3. ✅ Both use the same /video/filter endpoint under the hood
  4. ✅ Gradual migration: start using fluent API for new features
  5. ✅ No breaking changes: existing code continues to work
  `);
}

// Usage example that shows the power of the new system
async function showcaseFlexibility() {
  console.log('🌟 Showcasing System Flexibility');
  
  // You can now do things like:
  // transform(baseVideo, singleOverlay, options)          // Legacy: 1 base + 1 overlay
  // transform(baseVideo, [ov1, ov2, ov3], options)       // New: 1 base + N overlays
  // transform(baseVideo, overlays, { customFilterComplex }) // Advanced: Custom filter
  
  console.log(`
  🎯 New Capabilities Unlocked:
  
  ✅ Legacy Support: All existing single-overlay code still works
  ✅ Multiple Overlays: Easy array-based multiple video composition  
  ✅ Individual Configs: Each overlay can have different timing, position, size
  ✅ Custom Filters: Full FFMPEG filter complex support for power users
  ✅ Dynamic Generation: System builds filter complexes automatically
  ✅ Audio Mixing: Intelligent audio mixing for all video streams
  ✅ GPU Acceleration: Maintains codec preferences for performance
  ✅ Smart Positioning: Automatic positioning based on overlay count
  
  🚀 Example Use Cases:
  - News overlays with multiple lower-thirds at different times
  - Gaming highlights with multiple picture-in-picture streams
  - Educational content with multiple visual aids
  - Live stream compositions with multiple camera feeds
  - Complex video transitions and effects
  `);
}

if (require.main === module) {
  demonstrateNVideoComposition()
    .then(() => showcaseFlexibility())
    .catch(console.error);
}

export {
  demonstrateNVideoComposition,
  showcaseFlexibility
};
