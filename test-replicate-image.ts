/**
 * Test Replicate Text-to-Image Model with Generation Prompt Metadata
 * 
 * This test demonstrates:
 * - Text-to-image generation using Replicate models
 * - The new generation_prompt metadata feature that captures:
 *   - Original input text
 *   - Transform options used
 *   - Model information
 *   - Generation timestamp
 *   - Provider-specific metadata
 */

import { initializeProviders, getProvider } from './src/media/registry/bootstrap';
import { Text } from './src/media/assets/roles/classes/Text';

async function testReplicateTextToImage() {
  console.log('🎨 Testing Replicate Text-to-Image Generation...');
  
  try {
    // Initialize providers
    await initializeProviders();
    
    // Get Replicate provider
    const provider = await getProvider('replicate');
    console.log(`✅ Got provider: ${provider.name}`);
      // Get a text-to-image model (using a known working Replicate model)
    const modelId = 'black-forest-labs/flux-schnell';
    console.log(`🔍 Getting model: ${modelId}`);
    
    const model = await provider.getModel(modelId);
    console.log(`✅ Got model: ${model.getId()}`);
    
    // Create text input
    const prompt = "A beautiful sunset over mountains, digital art style";
    const textInput = new Text(prompt);
    console.log(`📝 Created text input: "${prompt}"`);
    
    // Test transformation
    console.log('🚀 Starting image generation...');
    const startTime = Date.now();    const image = await model.transform(textInput, {
      aspect_ratio: "16:9",
      steps: 4,
      megapixels: "1"
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ Image generated in ${duration}ms`);
      // Show image info
    console.log('📊 Image Information:');
    console.log(`   Format: ${image.format}`);
    console.log(`   Size: ${image.data.length} bytes`);
    
    // Show generation prompt metadata
    if (image.metadata.generation_prompt) {
      console.log('🎯 Generation Prompt Metadata:');
      console.log(`   Input: "${image.metadata.generation_prompt.input}"`);
      console.log(`   Model: ${image.metadata.generation_prompt.modelName} (${image.metadata.generation_prompt.modelId})`);
      console.log(`   Provider: ${image.metadata.generation_prompt.provider}`);
      console.log(`   Type: ${image.metadata.generation_prompt.transformationType}`);
      console.log(`   Timestamp: ${image.metadata.generation_prompt.timestamp}`);
      console.log(`   Options:`, image.metadata.generation_prompt.options);
      
      if (image.metadata.generation_prompt.metadata) {
        console.log(`   Model Metadata:`, image.metadata.generation_prompt.metadata);
      }
    } else {
      console.log('⚠️  No generation_prompt found in metadata');
    }
    
    console.log('📋 Full Metadata:');
    console.log(JSON.stringify(image.metadata, null, 2));
    
    if (image.metadata.localPath) {
      console.log(`   💾 Saved to: ${image.metadata.localPath}`);
    }
    
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testReplicateTextToImage().catch(console.error);
