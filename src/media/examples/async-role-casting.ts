/**
 * Example usage of the enhanced async role casting system
 * 
 * This demonstrates how video assets can now intelligently extract audio
 * using FFmpeg when cast to Speech or Audio roles.
 */

import { MP4Asset } from '../assets/types';

async function demonstrateAsyncRoleCasting() {
  // Assuming we have a video file
  const videoData = Buffer.from('mock video data'); // In real usage, this would be actual video data
  
  // Create an MP4 asset (which supports Video, Audio, and Speech roles)
  const videoAsset = new MP4Asset(videoData, { 
    format: 'mp4', 
    duration: 120,
    hasAudio: true 
  });
  try {
    console.log('Converting video to audio...');
    
    // This will extract audio using FFmpeg
    const audioData = await videoAsset.asAudio();
    console.log('✅ Successfully extracted audio from video:', audioData.toString());

    // Check capabilities
    console.log('Video can play audio role:', videoAsset.canPlayAudioRole());

  } catch (error) {
    console.error('❌ Error during role casting:', error.message);
  }
}

// Example of how you might use this in practice
async function processVideoContent(videoAsset: MP4Asset) {
  // Extract audio for analysis
  if (videoAsset.canPlayAudioRole()) {
    const audio = await videoAsset.asAudio();
    console.log('Audio extracted for analysis:', audio.getFormat());
  }
}

export { demonstrateAsyncRoleCasting, processVideoContent };
