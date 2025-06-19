/**
 * Test Prepend/Append Video Filter API
 * 
 * Focused test for the new .prepend() and .append() functionality
 */

import { FFMPEGVideoFilterModel } from './src/media/models/FFMPEGVideoFilterModel';
import { FFMPEGAPIClient } from './src/media/clients/FFMPEGAPIClient';
import { Video } from './src/media/assets/roles';

async function testPrependAppend() {
  console.log('🎬 Testing Prepend/Append Video Functionality');
  console.log('=============================================');

  // Initialize the API client
  const apiClient = new FFMPEGAPIClient({
    baseUrl: 'http://localhost:8006'
  });

  // Create the fluent filter model
  const filter = new FFMPEGVideoFilterModel(undefined, apiClient);

  // Load sample videos
  const baseVideo = Video.fromFile('./test-videos/base.mp4');
  const overlay1 = Video.fromFile('./test-videos/overlay1.webm');
  const introVideo = Video.fromFile('./test-videos/base.mp4'); // Using base as intro for demo
  const outroVideo = Video.fromFile('./test-videos/overlay1.webm'); // Using overlay1 as outro for demo

  console.log('\n📹 Loaded test videos');

  // Test 1: Preview the filter complex for intro/outro
  console.log('\n🎯 Test 1: Preview Intro/Outro Filter Complex');
  
  try {
    const previewFilter = filter
      .reset()
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
    console.log(previewFilter);
    console.log('✅ Preview completed successfully');
    
  } catch (error) {
    console.error('❌ Preview failed:', error.message);
  }

  // Test 2: Simple intro/outro without overlays
  console.log('\n🎯 Test 2: Simple Intro-Main-Outro (no overlays)');
  
  try {
    const simplePreview = filter
      .reset()
      .prepend(introVideo)
      .compose(baseVideo)
      .append(outroVideo)
      .preview();
      
    console.log('🔍 Simple concatenation filter:');
    console.log(simplePreview);
    console.log('✅ Simple preview completed successfully');
    
  } catch (error) {
    console.error('❌ Simple preview failed:', error.message);
  }

  console.log('\n🎉 Test completed!');
}

// Run the test
if (require.main === module) {
  testPrependAppend().catch(console.error);
}

export { testPrependAppend };
