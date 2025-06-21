/**
 * Debug FFmpeg command arguments
 */

import { FFMPEGLocalClient } from './src/media/providers/docker/ffmpeg/FFMPEGLocalClient';
import { SmartAssetFactory } from './src/media/assets/SmartAssetFactory';
import { hasVideoRole } from './src/media/assets/roles';
import fs from 'fs';
import path from 'path';

// Mock the executeFFmpeg method to see the arguments
class DebugFFMPEGLocalClient extends FFMPEGLocalClient {
  async executeFFmpeg(args: string[]): Promise<string> {
    console.log('🔧 FFmpeg command arguments:');
    console.log('ffmpeg', args.join(' '));
    console.log('\n🔧 Arguments breakdown:');
    
    let i = 0;
    while (i < args.length) {
      const arg = args[i];
      if (arg.startsWith('-')) {
        const nextArg = i + 1 < args.length ? args[i + 1] : '';
        if (nextArg && !nextArg.startsWith('-')) {
          console.log(`  ${arg} ${nextArg}`);
          i += 2;
        } else {
          console.log(`  ${arg}`);
          i += 1;
        }
      } else {
        console.log(`  ${arg}`);
        i += 1;
      }
    }
    
    // Don't actually execute, just throw an error to see the args
    throw new Error('Debug mode - not executing FFmpeg');
  }
}

async function debugFFmpegArgs() {
  console.log('🔧 Debugging FFmpeg arguments...\n');

  try {
    const testVideoDir = path.join(process.cwd(), 'test-videos');
    const baseVideoPath = path.join(testVideoDir, 'base.mp4');
    const overlayVideoPath = path.join(testVideoDir, 'overlay1.webm');
    const introVideoPath = path.join(testVideoDir, 'intro.mp4');

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

    // Use debug client
    const debugClient = new DebugFFMPEGLocalClient({ timeout: 120000 });
    
    // Prepare filter complex
    const filterComplex = `[0:v]format=yuv420p,scale=1920:1080[v0];
[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a0];
[1:v]format=yuv420p,scale=1920:1080[v1];
[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a1];
[v0][v1][a0][a1]concat=n=2:v=1:a=1[concatenated_video][concatenated_audio];
[2:v]tpad=start_duration=2:start_mode=add:color=black@0.0,setpts=PTS-STARTPTS,colorkey=#00FF00:0.3:0.1,scale=iw*0.25:ih[ov0];
[concatenated_video][ov0]overlay=format=auto:x=W-w-10:y=10:alpha=0.8[final_video];
[concatenated_audio]copy[mixed_audio]`;

    console.log('🎯 Filter complex to be used:');
    console.log(filterComplex);
    
    // Call the client method
    const videoBuffers = [introVideo.data, baseVideo.data, overlayVideo.data];
    
    try {
      await debugClient.filterMultipleVideos(videoBuffers, {
        filterComplex,
        videoOutputLabel: 'final_video',
        audioOutputLabel: 'mixed_audio',
        customAudioMapping: true
      });
    } catch (error) {
      if (error.message === 'Debug mode - not executing FFmpeg') {
        console.log('\n✅ Debug completed successfully');
      } else {
        console.error('❌ Unexpected error:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugFFmpegArgs().catch(console.error);
