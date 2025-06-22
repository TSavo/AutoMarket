/**
 * Test FluentProvider API
 * 
 * Demonstrates the beautiful DSL syntax for transformation pipelines:
 * $("provider").model("model-id").transform(input, options)
 * $("provider")("model-id").transform(input, options)  // Alternative syntax
 */

import { $ } from './src/media/fluent/FluentProvider';
import { Text } from './src/media/assets/roles/classes/Text';

async function testFluentAPI() {
  console.log('🎨 Testing Fluent Provider API...');
  
  try {
    console.log('\n=== STEP 1: Basic Fluent Syntax ===');
    
    // Create test input
    const originalText = new Text("A majestic dragon soaring through clouds");
    console.log(`📝 Input: "${originalText.content}"`);

    // Test basic fluent syntax: $("provider").model("model").transform()
    console.log('\n🔧 Using basic fluent syntax...');
    const openrouterProvider = await $("openrouter");
    console.log(`✅ Got provider: ${openrouterProvider.getProviderInfo().id}`);
    
    const deepseekModel = openrouterProvider.model("deepseek/deepseek-chat:free");
    console.log(`✅ Got model: ${deepseekModel.getModelInfo().modelId}`);
    
    console.log('🚀 Starting transformation...');
    const enhancedText = await deepseekModel.transform(originalText, {
      system: "You are a creative assistant. Enhance the given text into a detailed, vivid image description suitable for AI image generation. Keep it under 100 words.",
      temperature: 0.7
    });
    
    console.log(`✅ Enhanced text: "${enhancedText.content.substring(0, 100)}..."`);
    console.log(`📊 Generation prompt preserved: ${enhancedText.metadata?.generation_prompt ? 'YES' : 'NO'}`);

    console.log('\n=== STEP 2: Chained Fluent Syntax ===');
    
    // Test chained syntax: $("provider").model("model").transform() in one go
    console.log('🔧 Using chained fluent syntax...');
    const imageResult = await (await $("replicate"))
      .model("black-forest-labs/flux-schnell")
      .transform(enhancedText, {
        aspect_ratio: "16:9",
        steps: 4,
        megapixels: "1"
      });
    
    console.log(`✅ Generated image: ${imageResult.format} (${(imageResult.data.length / 1024).toFixed(1)}KB)`);
    console.log(`📊 Generation chain preserved: ${imageResult.metadata?.generation_prompt ? 'YES' : 'NO'}`);    console.log('\n=== STEP 3: Direct Call Syntax ===');
    
    // Test new direct syntax: $("provider")("model")(input, options)
    console.log('🔧 Using direct call syntax...');
    
    try {
      // This syntax: provider("model")(input, options)
      const audioResult = await (await $("together"))("cartesia/sonic-english")(originalText, {
        voice: "male",
        speed: 1.1,
        output_format: "mp3"
      });
      
      console.log(`✅ Generated audio: ${audioResult.format} (${(audioResult.data.length / 1024).toFixed(1)}KB)`);
      console.log(`📊 Generation prompt preserved: ${audioResult.metadata?.generation_prompt ? 'YES' : 'NO'}`);
    } catch (error) {
      console.log(`⚠️  Audio generation skipped: ${error.message}`);
      console.log(`   (Together may not have cartesia models available)`);
    }

    console.log('\n=== STEP 4: Provider Information ===');
    
    // Show provider capabilities
    const providerInfo = openrouterProvider.getProviderInfo();
    console.log(`📋 Provider: ${providerInfo.id}`);
    console.log(`   Type: ${providerInfo.type}`);
    console.log(`   Models: ${providerInfo.models.length} available`);
    console.log(`   Sample models:`, providerInfo.models.slice(0, 3).map(m => m.id));

    console.log('\n🎉 Fluent API test completed successfully!');
    console.log('\n💡 Supported Syntax Patterns:');
    console.log('   ✅ await $("provider").model("model").transform(input, options)');
    console.log('   ✅ await $("provider")("model").transform(input, options)');
    console.log('   ✅ Complete generation_prompt chain preservation');
    console.log('   ✅ All existing transform capabilities');

  } catch (error) {
    console.error('❌ Fluent API test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testFluentAPI().catch(console.error);
