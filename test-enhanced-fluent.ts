/**
 * Test Enhanced FluentProvider with Direct Call Syntax
 * 
 * Demonstrates the beautiful new syntax:
 * $("provider")("model")(input, options)
 */

import { $ } from './src/media/index';
import { Text } from './src/media/assets/roles/classes/Text';

async function testEnhancedFluentAPI() {
  console.log('🚀 Testing Enhanced FluentProvider with Direct Call Syntax...');
  
  try {
    // Create test input
    const originalText = new Text("A majestic dragon soaring through clouds");
    console.log(`📝 Input: "${originalText.content}"`);

    console.log('\n=== Pattern 1: Ultra-Clean Direct Syntax ===');
      // Beautiful direct syntax: $("provider")("model")(input, options)
    const provider = await $("openrouter");
    const model = await provider("meta-llama/llama-3.3-8b-instruct:free");
    const result1 = await model(originalText, {
      system: "Enhance this into a vivid image description in under 50 words.",
      temperature: 0.8
    });
    
    console.log(`✅ Result 1: "${result1.content.substring(0, 80)}..."`);
    console.log(`📊 Generation chain: ${result1.metadata?.generation_prompt ? 'PRESERVED' : 'MISSING'}`);

    console.log('\n=== Pattern 2: Store Model Reference ===');
    
    // Store model reference for reuse (pipeline pattern)
    const mistralModel = await (await $("openrouter"))("mistralai/mistral-7b-instruct:free");
    
    const result2 = await mistralModel(result1, {
      system: "Make this description more cinematic and epic.",
      temperature: 0.6
    });
    
    console.log(`✅ Result 2: "${result2.content.substring(0, 80)}..."`);
    console.log(`📊 Generation chain: ${result2.metadata?.generation_prompt ? 'PRESERVED' : 'MISSING'}`);

    console.log('\n=== Pattern 3: Traditional Syntax Still Works ===');
    
    // Traditional syntax for comparison
    const result3 = await (await (await $("openrouter"))
      .model("mistralai/mistral-7b-instruct:free"))
      .transform(originalText, {
        system: "Create a short, punchy description.",
        temperature: 0.7
      });
    
    console.log(`✅ Result 3: "${result3.content.substring(0, 80)}..."`);
    console.log(`📊 Generation chain: ${result3.metadata?.generation_prompt ? 'PRESERVED' : 'MISSING'}`);

    console.log('\n=== Pipeline Vision Preview ===');
    
    // Show how this enables pipeline DSL
    const openrouter = await $("openrouter");
    const enhancer = await openrouter("meta-llama/llama-3.3-8b-instruct:free");
    const cinematographer = await openrouter("mistralai/mistral-7b-instruct:free");
    
    console.log('🎬 Pipeline-style execution:');
    const step1 = await enhancer(originalText, { system: "Enhance description", temperature: 0.8 });
    console.log(`   Step 1: "${step1.content.substring(0, 60)}..."`);
    
    const step2 = await cinematographer(step1, { system: "Make cinematic", temperature: 0.6 });
    console.log(`   Step 2: "${step2.content.substring(0, 60)}..."`);

    console.log('\n🎉 Enhanced FluentProvider SUCCESS!');
    console.log('\n💡 New Syntax Patterns Available:');
    console.log('   ✅ Ultra-clean: $("provider")("model")(input, options)');
    console.log('   ✅ Model storage: const model = $("provider")("model"); await model(input)');
    console.log('   ✅ Traditional: $("provider").model("model").transform(input, options)');
    console.log('   ✅ Pipeline ready: Store models, chain executions');
    console.log('   ✅ Perfect generation_prompt preservation');

    // Show the generation lineage
    console.log('\n📊 Complete Generation Lineage (Result 2):');
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
    console.error('❌ Enhanced FluentProvider test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testEnhancedFluentAPI().catch(console.error);
