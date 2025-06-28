/**
 * Test the new single-await fluent API
 */

import { $$ } from './src/media/index';

async function testSingleAwaitAPI() {
  console.log('🧪 Testing Single Await Fluent API...');
  
  try {
    // NEW SYNTAX: Single await for everything!
    console.log('\n=== Testing Single Await Pattern ===');
    
    const audio = await $$("elevenlabs")("voice-id")("Hello from single await API!");
    console.log(`✅ Single await success: ${audio.format || 'unknown format'}`);
    
    // Show different patterns
    console.log('\n=== Pattern Comparison ===');
    
    // Pattern 1: Single line, single await
    console.log('✅ Pattern 1: await $$("provider")("model")(input, options)');
    
    // Pattern 2: Store chain, single await
    const chain = $$("openrouter")("deepseek-chat");
    const result = await chain("Enhance this text: Hello world", { 
      system: "You are a creative writer" 
    });
    console.log(`✅ Pattern 2: const chain = $$(...); await chain(...)`);
    console.log(`   Result: "${result.content?.substring(0, 50)}..."`);
    
    console.log('\n🎉 Single Await API Test Complete!');
    console.log('\n💡 Now you can use either:');
    console.log('   ✅ OLD: await (await $("provider")("model"))(input) // Double await');
    console.log('   ✅ NEW: await $$("provider")("model")(input)        // Single await');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSingleAwaitAPI().catch(console.error);
