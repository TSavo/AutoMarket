/**
 * Test Together AI Full Model Discovery
 * 
 * Test the full model discovery with 30,000+ models
 */

import { TogetherProvider } from './src/media/providers/TogetherProvider';

async function testTogetherFullDiscovery() {
  console.log('🔍 Testing Together AI Full Model Discovery...\n');

  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    console.log('❌ Please set TOGETHER_API_KEY environment variable');
    return;
  }

  try {
    // 1. Create and configure provider
    console.log('1️⃣ Creating Together AI Provider with full discovery...');
    const provider = new TogetherProvider();
    
    const startTime = Date.now();
    await provider.configure({ apiKey });
    const configTime = Date.now() - startTime;
    
    console.log(`✅ Provider configured in ${configTime}ms\n`);

    // 2. Check total model count
    console.log('2️⃣ Checking total model count...');
    const allModels = provider.models;
    const textModels = provider.getTextModels();
    const imageModels = provider.getImageModels();
    
    console.log(`✅ Total models discovered: ${allModels.length}`);
    console.log(`   - Text models: ${textModels.length}`);
    console.log(`   - Image models: ${imageModels.length}`);
    console.log(`   - Other models: ${allModels.length - textModels.length - imageModels.length}\n`);

    // 3. Analyze model distribution
    console.log('3️⃣ Analyzing model distribution...');
    
    // Group by organization
    const orgCounts = new Map<string, number>();
    allModels.forEach(model => {
      const org = model.id.split('/')[0] || 'unknown';
      orgCounts.set(org, (orgCounts.get(org) || 0) + 1);
    });
    
    console.log('🏢 Top organizations by model count:');
    Array.from(orgCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([org, count]) => {
        console.log(`   ${org}: ${count} models`);
      });

    // 4. Show sample models from different categories
    console.log('\n4️⃣ Sample models by category...');
    
    console.log('📝 Sample text models:');
    textModels.slice(0, 5).forEach(model => {
      console.log(`   - ${model.id} (${model.name})`);
    });
    
    console.log('\n🎨 Sample image models:');
    imageModels.slice(0, 5).forEach(model => {
      console.log(`   - ${model.id} (${model.name})`);
    });

    // 5. Look for specific model families
    console.log('\n5️⃣ Searching for specific model families...');
    
    const families = {
      'Llama': allModels.filter(m => m.id.toLowerCase().includes('llama')),
      'Mistral': allModels.filter(m => m.id.toLowerCase().includes('mistral')),
      'Qwen': allModels.filter(m => m.id.toLowerCase().includes('qwen')),
      'FLUX': allModels.filter(m => m.id.toLowerCase().includes('flux')),
      'DeepSeek': allModels.filter(m => m.id.toLowerCase().includes('deepseek')),
      'Gemma': allModels.filter(m => m.id.toLowerCase().includes('gemma'))
    };
    
    Object.entries(families).forEach(([family, models]) => {
      console.log(`   ${family}: ${models.length} models`);
    });

    // 6. Check for free models
    console.log('\n6️⃣ Analyzing free models...');
    const freeModels = allModels.filter(model => 
      model.pricing?.inputCost === 0 && model.pricing?.outputCost === 0
    );
    
    console.log(`✅ Found ${freeModels.length} free models`);


    // 7. Test model creation with a popular model
    console.log('\n7️⃣ Testing model creation...');
    
    // Find a popular text model
    const popularTextModel = textModels.find(m => 
      m.id.includes('llama') || m.id.includes('mistral')
    );
    
    if (popularTextModel) {
      console.log(`🧪 Testing text model creation: ${popularTextModel.id}`);
      try {
        const model = await provider.createTextToTextModel(popularTextModel.id);
        console.log(`✅ Text model created: ${model.getName()}`);
      } catch (error) {
        console.log(`❌ Text model creation failed: ${error.message}`);
      }
    }

    // Find a FLUX image model
    const fluxModel = imageModels.find(m => m.id.includes('FLUX'));
    
    if (fluxModel) {
      console.log(`🧪 Testing image model creation: ${fluxModel.id}`);
      try {
        const model = await provider.createTextToImageModel(fluxModel.id);
        console.log(`✅ Image model created: ${model.getName()}`);
      } catch (error) {
        console.log(`❌ Image model creation failed: ${error.message}`);
      }
    }

    console.log('\n🎉 Full model discovery test completed!');
    console.log(`📊 Summary: ${allModels.length} total models discovered and classified`);

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the test
if (require.main === module) {
  testTogetherFullDiscovery().catch(console.error);
}

export { testTogetherFullDiscovery };
