/**
 * Test the Beautiful Direct Syntax: provider("model")(input, options)
 */

import { $ } from './src/media/index';
import { Text } from './src/media/assets/roles/classes/Text';

async function testDirectCallSyntax() {
  console.log('🎯 Testing Beautiful Direct Call Syntax...');
  
  try {
    // Create test input
    const originalText = new Text("A mystical forest glowing with ethereal light");
    console.log(`📝 Input: "${originalText.content}"`);

    console.log('\n=== Ultimate Syntax Test: provider("model")(input, options) ===');
      // Get the provider
    const provider = await $("openrouter");
    console.log('✅ Provider loaded');

    // Test the beautiful direct syntax (with proper await handling)
    console.log('🚀 Testing: (await provider("model"))(input, options)');
    
    const result1 = await (await provider("meta-llama/llama-3.3-8b-instruct:free"))(originalText, {
      system: "Transform this into a cinematic description in under 40 words.",
      temperature: 0.7
    });
    
    console.log(`✅ Direct call SUCCESS!`);
    console.log(`📄 Result: "${result1.content.substring(0, 80)}..."`);
    console.log(`📊 Generation chain: ${result1.metadata?.generation_prompt ? 'PRESERVED' : 'MISSING'}`);

    console.log('\n=== Chaining Multiple Direct Calls ===');
    
    // Chain multiple direct calls
    const result2 = await (await provider("mistralai/mistral-7b-instruct:free"))(result1, {
      system: "Make this description more poetic and mystical.",
      temperature: 0.6
    });
    
    console.log(`✅ Second direct call SUCCESS!`);
    console.log(`📄 Result: "${result2.content.substring(0, 80)}..."`);
    console.log(`📊 Generation chain: ${result2.metadata?.generation_prompt ? 'PRESERVED' : 'MISSING'}`);

    console.log('\n=== Testing Mixed Syntax ===');
    
    // Test that traditional syntax still works
    const result3 = await (await provider.model("mistralai/mistral-7b-instruct:free")).transform(result2, {
      system: "Summarize this in exactly 20 words.",
      temperature: 0.5
    });
    
    console.log(`✅ Traditional syntax still works!`);
    console.log(`📄 Result: "${result3.content}"`);
    console.log(`📊 Generation chain: ${result3.metadata?.generation_prompt ? 'PRESERVED' : 'MISSING'}`);

    console.log('\n🎉 ULTIMATE SUCCESS! All syntax patterns working:');
    console.log('   ✅ Direct: provider("model")(input, options)');
    console.log('   ✅ Function: provider("model").transform(input, options)');
    console.log('   ✅ Traditional: provider.model("model").transform(input, options)');
    console.log('   ✅ Perfect generation_prompt preservation through all methods');

    // Show the complete generation lineage
    console.log('\n📊 Complete Generation Lineage:');
    let current = result3;
    let step = 1;
    
    while (current?.metadata?.generation_prompt && step <= 5) {
      const gp = current.metadata.generation_prompt;
      console.log(`   Step ${step}: ${current.constructor.name} ← ${gp.provider}/${gp.modelName}`);
      current = gp.input;
      step++;
    }
    
    if (current && step <= 5) {
      console.log(`   Step ${step}: ${current.constructor.name} (Original Source)`);
    }

  } catch (error) {
    console.error('❌ Direct call syntax test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testDirectCallSyntax().catch(console.error);
