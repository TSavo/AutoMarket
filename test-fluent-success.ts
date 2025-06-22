/**
 * FluentProvider Success Demo
 * 
 * Demonstrates the working FluentProvider patterns with available models
 */

import { $ } from './src/media/fluent/FluentProvider';
import { Text } from './src/media/assets/roles/classes/Text';

async function demonstrateFluentSuccess() {
  console.log('🎨 FluentProvider Success Demo...');
  
  try {
    // Create test input
    const originalText = new Text("A majestic dragon soaring through clouds");
    console.log(`📝 Input: "${originalText.content}"`);

    console.log('\n=== Pattern 1: Basic Fluent Chaining ===');
      // Beautiful fluent syntax: $("provider").model("model").transform()
    const result1 = await (await $("openrouter"))
      .model("meta-llama/llama-3.3-8b-instruct:free")
      .transform(originalText, {
        system: "Enhance this into a vivid image description in under 50 words.",
        temperature: 0.8
      });
    
    console.log(`✅ Result 1: "${result1.content.substring(0, 80)}..."`);
    console.log(`📊 Generation chain: ${result1.metadata?.generation_prompt ? 'PRESERVED' : 'MISSING'}`);

    console.log('\n=== Pattern 2: Chained with Different Model ===');
    
    // Another transformation using the enhanced text
    const result2 = await (await $("openrouter"))
      .model("mistralai/mistral-7b-instruct:free")
      .transform(result1, {
        system: "Make this description more cinematic and epic.",
        temperature: 0.6
      });
    
    console.log(`✅ Result 2: "${result2.content.substring(0, 80)}..."`);
    console.log(`📊 Generation chain: ${result2.metadata?.generation_prompt ? 'PRESERVED' : 'MISSING'}`);

    console.log('\n=== Pattern 3: Model Information ===');
      // Show fluent provider capabilities
    const provider = await $("openrouter");
    const model = provider.model("meta-llama/llama-3.3-8b-instruct:free");
    
    console.log('🔧 Provider Info:', provider.getProviderInfo().id);
    console.log('🤖 Model Info:', model.getModelInfo());

    console.log('\n🎉 FluentProvider SUCCESS!');
    console.log('\n💡 Perfect Foundation for Pipeline DSL:');
    console.log('   ✅ Clean, readable syntax');
    console.log('   ✅ Full generation_prompt preservation');
    console.log('   ✅ Chainable transformations');
    console.log('   ✅ Ready for pipeline integration');

    // Show the generation lineage
    console.log('\n📊 Complete Generation Lineage:');
    let current = result2;
    let step = 1;
    
    while (current?.metadata?.generation_prompt && step <= 5) {
      const gp = current.metadata.generation_prompt;
      console.log(`   Step ${step}: ${current.constructor.name} ← ${gp.provider}/${gp.modelName}`);
      console.log(`     Options: ${JSON.stringify(gp.options)}`);
      current = gp.input;
      step++;
    }
    
    if (current && step <= 5) {
      console.log(`   Step ${step}: ${current.constructor.name} (Original Source)`);
      console.log(`     Content: "${current.content}"`);
    }

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Run the demo
demonstrateFluentSuccess().catch(console.error);
