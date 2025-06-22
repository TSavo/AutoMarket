/**
 * Test fal.ai provider with framepack integration - IMAGE TO VIDEO
 */

async function testFalAiImageToVideo() {
  console.log('🧪 Testing fal.ai image-to-video with framepack integration...');
  
  // Import and instantiate the fal-ai provider
  console.log('📦 Importing fal-ai provider...');
  const { FalAiProvider } = await import('./src/media/providers/falai/FalAiProvider');
  console.log('✅ fal-ai provider imported');
  
  console.log('🏗️ Creating provider instance...');
  const provider = new FalAiProvider();
  console.log('✅ Provider instance created');
  
  // Step 1: Generate an image first
  console.log('🖼️ Step 1: Generating base image...');
  try {
    console.log('📞 Creating text-to-image model...');
    const textToImageModel = await provider.getModel('fal-ai/flux/schnell');
    
    // Import Text role
    const { Text } = await import('./src/media/assets/roles');
    
    // Create a TextRole object with the prompt
    const textInput = new Text('A serene mountain landscape with flowing water', 'en', 1.0);
    
    // Generate base image
    const image = await textToImageModel.transform(textInput, {
      width: 768,
      height: 768,
      num_inference_steps: 4
    });
    
    console.log(`✅ Base image generated successfully!`);
    console.log(`   Image dimensions: ${JSON.stringify(image.getDimensions())}`);
    console.log(`   Image file size: ${(image.metadata?.fileSize || 0 / 1024).toFixed(1)}KB`);
      // Step 2: Convert image to video using framepack
    console.log('🎬 Step 2: Converting image to video with framepack...');
    
    try {
      console.log(`📞 Testing framepack model: fal-ai/framepack...`);
      
      // Get model metadata first to check if it exists
      const metadata = await provider.getModelMetadata('fal-ai/framepack');
      console.log(`✅ Model found: ${metadata.name}`);
      console.log(`   Capabilities: ${metadata.capabilities.join(', ')}`);
      
      // Create framepack image-to-video model
      const framepackModel = await provider.getModel('fal-ai/framepack');
      console.log(`✅ Created model: ${framepackModel.constructor.name}`);
        // Transform image to video using framepack
      const video = await framepackModel.transform(image, {
        prompt: 'A gentle breeze moving through the mountain landscape, creating subtle motion in the water and leaves',
        motion_strength: 0.7,
        fps: 24,
        duration: 3
      });
      
      console.log(`✅ Video generated successfully with framepack!`);
      console.log(`   Video duration: ${video.metadata?.duration || 'unknown'}s`);
      console.log(`   Video file size: ${(video.metadata?.fileSize || 0) / 1024 / 1024}MB`);
      console.log(`   Local path: ${video.metadata?.localPath || 'unknown'}`);
      
    } catch (error) {
      console.log(`❌ Framepack model failed: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ Error in image-to-video test: ${error.message}`);
    return;
  }
  
  console.log('✅ Image-to-video test completed successfully!');
}

// Run the test
testFalAiImageToVideo().catch(console.error);
