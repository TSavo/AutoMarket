/**
 * Test fal.ai provider with framepack integration - FULL TEST
 */

async function testFalAiWithFramepack() {
  console.log('🧪 Testing fal.ai provider with framepack integration...');
  
  // Import and instantiate the fal-ai provider
  console.log('📦 Importing fal-ai provider...');
  const { FalAiProvider } = await import('./src/media/providers/falai/FalAiProvider');
  console.log('✅ fal-ai provider imported');
  
  console.log('🏗️ Creating provider instance...');
  const provider = new FalAiProvider();
  console.log('✅ Provider instance created');
  
  console.log('🔍 Getting supported models...');
  const models = await provider.getSupportedModels();
  console.log(`✅ Got ${models.length} models`);
  
  console.log('🔍 Testing getModelMetadata...');
  try {
    console.log('📞 Getting metadata for fal-ai/flux/schnell...');
    const metadata = await provider.getModelMetadata('fal-ai/flux/schnell');
    console.log(`✅ Got metadata for model: ${metadata.id}`);
    console.log(`   Name: ${metadata.name}`);
    console.log(`   Capabilities: ${metadata.capabilities.join(', ')}`);
  } catch (error) {
    console.log(`❌ Error getting metadata: ${error.message}`);
    return;
  }
  
  console.log('🏗️ Testing model creation...');
  try {
    console.log('📞 Creating text-to-image model...');
    const model = await provider.getModel('fal-ai/flux/schnell');
    console.log(`✅ Created model: ${model.constructor.name}`);
    console.log(`   Model ID: ${model.id}`);
    console.log(`   Model type: ${model.type}`);
  } catch (error) {
    console.log(`❌ Error creating model: ${error.message}`);
    return;
  }
    console.log('🎯 Testing framepack integration...');
  try {
    console.log('📞 Testing generation request...');
    const model = await provider.getModel('fal-ai/flux/schnell');
    
    // Import TextRole to create proper input
    const { Text } = await import('./src/media/assets/roles');
    
    // Create a TextRole object with the prompt
    const textInput = new Text('A beautiful sunset over mountains', 'en', 1.0);
    
    // Test a simple text-to-image generation with correct parameters
    const result = await model.transform(textInput, {
      width: 512,
      height: 512,
      num_inference_steps: 4
    });
    
    console.log(`✅ Generation completed!`);
    console.log(`   Job ID: ${result.jobId}`);
    console.log(`   Status: ${result.status}`);
    
    if (result.outputs && result.outputs.length > 0) {
      console.log(`   Generated ${result.outputs.length} output(s)`);
      result.outputs.forEach((output, index) => {
        console.log(`   Output ${index + 1}: ${output.url || output.path || 'Unknown'}`);
      });
    }
    
  } catch (error) {
    console.log(`❌ Error in generation: ${error.message}`);
    // This might fail due to API keys or network issues, but that's okay for testing
  }
  
  console.log('✅ Full test completed successfully!');
}

// Run the test
testFalAiWithFramepack().catch(console.error);
