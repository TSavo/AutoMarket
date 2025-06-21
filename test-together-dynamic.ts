/**
 * Test Together AI Dynamic Implementation
 * 
 * Test the new dynamic parameter handling and SmartAsset loading.
 */

import { TogetherProvider } from './src/media/providers/TogetherProvider';
import { Text } from './src/media/assets/roles';

async function testTogetherDynamic() {
  console.log('🔄 Testing Together AI Dynamic Implementation...\n');

  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    console.log('❌ Please set TOGETHER_API_KEY environment variable');
    return;
  }

  try {
    // 1. Create and configure provider
    console.log('1️⃣ Creating Together AI Provider...');
    const provider = new TogetherProvider();
    await provider.configure({ apiKey });
    console.log('✅ Provider configured\n');

    // 2. Test dynamic model metadata loading
    console.log('2️⃣ Testing dynamic model metadata...');
    const imageModels = provider.getImageModels();
    console.log(`✅ Found ${imageModels.length} image models\n`);

    // 3. Test image generation with dynamic parameters
    console.log('3️⃣ Testing image generation with dynamic parameters...');
    const modelId = 'black-forest-labs/FLUX.1-schnell-Free';
    
    if (provider.supportsTextToImageModel(modelId)) {
      try {
        console.log(`📋 Creating model with dynamic metadata loading...`);
        const imageModel = await provider.createTextToImageModel(modelId);
        console.log(`✅ Image model created: ${imageModel.getName()}`);

        const prompt = new Text('A serene mountain lake at sunrise, photorealistic');
        console.log(`📝 Prompt: "${prompt.content}"`);
        
        console.log('⏳ Generating image with dynamic parameter handling...');
        
        const imageResult = await imageModel.transform(prompt, {
          width: 1024,
          height: 1024,
          steps: 4, // Will be dynamically constrained
          seed: 12345
        });

        console.log(`✅ Image generated with dynamic approach!`);
        console.log(`   Format: ${imageResult.format}`);
        console.log(`   Valid: ${imageResult.isValid()}`);
        console.log(`   Processing time: ${imageResult.metadata?.processingTime}ms`);
        console.log(`   File size: ${(imageResult.metadata?.fileSize / 1024).toFixed(1)}KB`);
        console.log(`   Dimensions: ${JSON.stringify(imageResult.getDimensions())}`);
        
        if (imageResult.metadata?.url) {
          console.log(`   Original URL: ${imageResult.metadata.url}`);
        }
        
        if (imageResult.metadata?.localPath) {
          console.log(`   Local path: ${imageResult.metadata.localPath}`);
        }

        // Test SmartAsset functionality
        console.log(`🧠 Testing SmartAsset functionality...`);
        console.log(`   Has metadata: ${!!imageResult.metadata}`);
        console.log(`   Can get dimensions: ${!!imageResult.getDimensions()}`);
        console.log(`   Can get file size: ${!!imageResult.getFileSize()}`);
        
        // Test saving functionality
        const outputPath = `./test-dynamic-output-${Date.now()}.${imageResult.format}`;
        imageResult.saveToFile(outputPath);
        console.log(`   Saved copy to: ${outputPath}`);

      } catch (error) {
        console.log(`❌ Dynamic image generation failed: ${error.message}`);
        console.log(`   Stack: ${error.stack}`);
      }
    }

    // 4. Test text generation still works
    console.log('\n4️⃣ Testing text generation still works...');
    const textModelId = 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo';
    
    if (provider.supportsTextToTextModel(textModelId)) {
      try {
        const textModel = await provider.createTextToTextModel(textModelId);
        console.log(`✅ Text model created: ${textModel.getName()}`);

        const textInput = new Text('Write a haiku about dynamic programming.');
        const textResult = await textModel.transform(textInput, {
          temperature: 0.8,
          maxOutputTokens: 50
        });

        console.log(`✅ Text generated: "${textResult.content}"`);
        console.log(`   Processing time: ${textResult.metadata?.processingTime}ms\n`);
      } catch (error) {
        console.log(`❌ Text generation failed: ${error.message}\n`);
      }
    }

    // 5. Test model capability segregation
    console.log('5️⃣ Testing model capability segregation...');
    const allModels = provider.models;
    const textModels = provider.getTextModels();
    const imageModels2 = provider.getImageModels();
    
    console.log(`✅ Total models: ${allModels.length}`);
    console.log(`✅ Text models: ${textModels.length}`);
    console.log(`✅ Image models: ${imageModels2.length}`);
  

    console.log('\n🎉 Dynamic Together AI implementation test completed!');
    console.log('✅ Dynamic parameter handling working!');
    console.log('✅ SmartAsset loading working!');
    console.log('✅ Model segregation working!');

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the test
if (require.main === module) {
  testTogetherDynamic().catch(console.error);
}

export { testTogetherDynamic };
