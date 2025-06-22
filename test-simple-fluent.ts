/**
 * Simple Working Demo of Enhanced FluentProvider
 * 
 * Shows the beautiful syntax that works right now
 */

import { $ } from './src/media/fluent/FluentProvider';
import { Text } from './src/media/assets/roles/classes/Text';

async function simpleWorkingDemo() {
  console.log('🎯 Simple Enhanced FluentProvider Demo...');
  
  try {
    // Create test input
    const originalText = new Text("A majestic dragon soaring through clouds");
    console.log(`📝 Input: "${originalText.content}"`);

    console.log('\n=== Pattern 1: Traditional Syntax (Working) ===');
    
    // Traditional working syntax
    const provider = await $("openrouter");
    const model = provider.model("meta-llama/llama-3.3-8b-instruct:free");
    const result1 = await model.transform(originalText, {
      system: "Enhance this into a vivid image description in under 50 words.",
      temperature: 0.8
    });
    
    console.log(`✅ Result 1: "${result1.content.substring(0, 80)}..."`);
    console.log(`📊 Generation chain: ${result1.metadata?.generation_prompt ? 'PRESERVED' : 'MISSING'}`);    console.log('\n=== Pattern 2: Direct Function Calls (New!) ===');
    
    // New direct function syntax
    setTimeout(async () => {
      try {
        // This should work now: provider("model-id") returns a callable model
        console.log('🔧 Testing direct function call syntax...');
        const directModel = provider("mistralai/mistral-7b-instruct:free");
        console.log('✅ Model proxy created:', typeof directModel);
        
        // Check if it's callable
        if (typeof directModel === 'function') {
          const result2 = await directModel(result1, {
            system: "Make this description more cinematic and epic.",
            temperature: 0.6
          });
          
          console.log(`✅ Result 2: "${result2.content.substring(0, 80)}..."`);
          console.log(`📊 Generation chain: ${result2.metadata?.generation_prompt ? 'PRESERVED' : 'MISSING'}`);
        } else {
          console.log('⚠️  Model proxy is not directly callable, but proxy created successfully');
          console.log('   Available methods:', Object.getOwnPropertyNames(directModel));
          
          // Try the transform method instead
          const result2 = await directModel.transform(result1, {
            system: "Make this description more cinematic and epic.",
            temperature: 0.6
          });
          
          console.log(`✅ Result 2 (via transform): "${result2.content.substring(0, 80)}..."`);
          console.log(`📊 Generation chain: ${result2.metadata?.generation_prompt ? 'PRESERVED' : 'MISSING'}`);
        }
        
        console.log('\n🎉 Enhanced FluentProvider Working!');
        console.log('\n💡 Available Syntax Patterns:');
        console.log('   ✅ Traditional: provider.model("model").transform(input, options)');
        console.log('   ✅ Function-style: provider("model").transform(input, options)');
        console.log('   🔄 Working on: provider("model")(input, options) [direct callable]');
        
      } catch (error) {
        console.error('❌ Direct function call failed:', error.message);
        console.error('Stack trace:', error.stack);
      }
    }, 3000); // Wait for model discovery to complete

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the demo
simpleWorkingDemo().catch(console.error);
