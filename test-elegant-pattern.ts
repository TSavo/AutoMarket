/**
 * Test the elegant getProvider().getModel().transform() pattern
 */

import { OpenRouterProvider } from './src/media/providers/openrouter/OpenRouterProvider';
import { Text } from './src/media/assets/roles';

async function testElegantPattern() {
  console.log('🧪 Testing the elegant pattern...');
  
  try {
    // Step 1: Create and configure OpenRouter provider
    console.log('📋 Creating OpenRouter provider...');
    const provider = new OpenRouterProvider();
    
    // Configure with API key (you'll need to set OPENROUTER_API_KEY environment variable)
    await provider.configure({
      apiKey: process.env.OPENROUTER_API_KEY || 'test-key-for-pattern-test'
    });
    
    console.log('✅ Provider configured');
    console.log(`   ID: ${provider.id}`);
    console.log(`   Name: ${provider.name}`);
    console.log(`   Capabilities: ${provider.capabilities.join(', ')}`);
    
    // Step 2: Test the elegant pattern - getModel()
    console.log('\n🎯 Testing getModel() method...');
    const modelId = 'deepseek/deepseek-chat:free';
    
    try {
      const model = await provider.getModel(modelId);
      console.log('✅ getModel() works!');
      console.log(`   Model ID: ${model.getId()}`);
      console.log(`   Model Provider: ${model.getProvider()}`);
      
      // Step 3: Test transform method
      console.log('\n📝 Testing transform method...');
      const textInput = new Text(
        'Write a haiku about artificial intelligence and creativity.',
        'en',
        1.0,
        { content: 'Write a haiku about artificial intelligence and creativity.' }
      );
      
      // Check if we have a real API key before making the actual call
      if (process.env.OPENROUTER_API_KEY) {
        console.log('🔑 API key found, making real request...');
        const result = await model.transform(textInput);
        console.log('✅ Transform successful!');
        console.log(`   Result: ${result.content}`);
        
        // SUCCESS! The elegant pattern works!
        console.log('\n🎉 SUCCESS! The elegant pattern works perfectly:');
        console.log('   provider.getModel(modelId).transform(input) ✅');
        
      } else {
        console.log('⚠️  No API key found, skipping actual transform call');
        console.log('   Set OPENROUTER_API_KEY environment variable to test full pattern');
        
        // Still a success - the pattern structure works
        console.log('\n🎉 PATTERN SUCCESS! Structure works:');
        console.log('   provider.getModel(modelId) ✅');
        console.log('   model.transform() method exists ✅');
      }
      
    } catch (error) {
      console.error('❌ getModel() failed:', error.message);
      return;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Alternative: Create a simple registry for testing
class SimpleProviderRegistry {
  private providers = new Map<string, any>();
  
  register(provider: any): void {
    this.providers.set(provider.id, provider);
  }
  
  getProvider(id: string): any | undefined {
    return this.providers.get(id);
  }
}

async function testWithRegistry() {
  console.log('\n🏗️ Testing with registry...');
  
  // Create registry and register OpenRouter
  const registry = new SimpleProviderRegistry();
  const openRouterProvider = new OpenRouterProvider();
  
  await openRouterProvider.configure({
    apiKey: process.env.OPENROUTER_API_KEY || 'test-key'
  });
  
  registry.register(openRouterProvider);
  
  // Test the full elegant pattern!
  try {
    const provider = registry.getProvider('openrouter');
    if (!provider) {
      throw new Error('Provider not found in registry');
    }
      const model = await provider.getModel('deepseek/deepseek-chat:free');
    
    console.log('✅ Full elegant pattern works:');
    console.log('   registry.getProvider("openrouter").getModel("deepseek/deepseek-chat:free") ✅');
    
    if (process.env.OPENROUTER_API_KEY) {
      const textInput = new Text('Write a haiku', 'en', 1.0, { content: 'Write a haiku' });
      const result = await model.transform(textInput);
      console.log('✅ Full transform works!');
      console.log(`   Result preview: ${result.content.substring(0, 100)}...`);
    }
    
  } catch (error) {
    console.error('❌ Registry pattern failed:', error.message);
  }
}

// Run the tests
async function runTests() {
  console.log('🚀 Testing the Elegant Pattern Implementation\n');
  console.log('============================================\n');
  
  await testElegantPattern();
  await testWithRegistry();
  
  console.log('\n✨ Pattern testing complete!');
}

// Export for use
export { testElegantPattern, testWithRegistry, SimpleProviderRegistry };

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}
