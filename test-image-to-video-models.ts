/**
 * Simple test to check image-to-video model availability
 */

async function testImageToVideoModels() {
  console.log('🧪 Testing image-to-video model discovery...');
  
  try {
    console.log('📦 Importing fal-ai provider...');
    const { FalAiProvider } = await import('./src/media/providers/falai/FalAiProvider');
    console.log('✅ Provider imported');
    
    const provider = new FalAiProvider();
    console.log('✅ Provider created');
      // Test different image-to-video model IDs
    const imageToVideoModels = [
      'fal-ai/svd', // Stable Video Diffusion
      'fal-ai/svd-xt', // SVD XT
      'fal-ai/animate-diff',
      'fal-ai/cogvideox-5b',
      'fal-ai/ltx-video',
      'fal-ai/hunyuan-video'
    ];
    
    for (const modelId of imageToVideoModels) {
      try {
        console.log(`🔍 Testing model: ${modelId}...`);
        const metadata = await provider.getModelMetadata(modelId);
        console.log(`✅ Found: ${metadata.name} - ${metadata.capabilities.join(', ')}`);
      } catch (error) {
        console.log(`❌ ${modelId}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  console.log('✅ Model discovery test completed!');
}

testImageToVideoModels().catch(console.error);
