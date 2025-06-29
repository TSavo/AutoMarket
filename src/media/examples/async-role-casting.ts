/**
 * Example usage of the enhanced async role casting system
 * 
 * This demonstrates how video assets can now intelligently extract audio
 * using FFmpeg when cast to Speech or Audio roles.
 */

import { VideoAsset } from '../assets/types';
import { Audio, Video, Text, Image } from '../assets/roles';

async function demonstrateAsyncRoleCasting() {
  // Assuming we have a video file
  const videoData = Buffer.from('mock video data'); // In real usage, this would be actual video data
  
  // Create a Video asset (which supports Video, Audio, and Speech roles)
  const videoAsset = new VideoAsset(videoData, { 
    format: 'mp4', 
    duration: 120,
    hasAudio: true 
  });
  try {
    console.log('Converting video to audio...');
    
    // This will extract audio using FFmpeg
    const audioData = await videoAsset.asRole(Audio);
    console.log('✅ Successfully extracted audio from video:', audioData.toString());

    // Check capabilities
    console.log('Video can play audio role:', videoAsset.canPlayRole(Audio));

  } catch (error) {
    console.error('❌ Error during role casting:', error.message);
  }
}

// Example of how you might use this in practice
async function processVideoContent(videoAsset: VideoAsset) {
  // Extract audio for analysis
  if (videoAsset.canPlayRole(Audio)) {
    const audio = await videoAsset.asRole(Audio);
    console.log('Audio extracted for analysis:', audio.getFormat());
  }
}

export { demonstrateAsyncRoleCasting, processVideoContent };
