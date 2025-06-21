/**
 * Test OpenRouter Implementation
 * 
 * Simple test to verify the OpenRouter provider and model work correctly.
 */

import { OpenRouterProvider } from './src/media/providers/openrouter/OpenRouterProvider';
import { Text } from './src/media/assets/roles';

async function testOpenRouterImplementation() {
  console.log('🧪 Testing OpenRouter Implementation...\n');

  // Test 1: Provider Creation
  console.log('1️⃣ Creating OpenRouter Provider...');
  const provider = new OpenRouterProvider();
  console.log(`✅ Provider created: ${provider.name} (${provider.id})`);
  console.log(`   Type: ${provider.type}`);
  console.log(`   Capabilities: ${provider.capabilities.join(', ')}\n`);

  // Test 2: Provider Configuration
  console.log('2️⃣ Configuring Provider...');
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OPENROUTER_API_KEY environment variable not set');
    console.log('   Set it with: export OPENROUTER_API_KEY="your-key-here"');
    return;
  }

  try {
    await provider.configure({
      apiKey: apiKey
    });
    console.log('✅ Provider configured successfully\n');
  } catch (error) {
    console.log(`❌ Configuration failed: ${error.message}`);
    return;
  }

  // Test 3: Check Availability
  console.log('3️⃣ Checking Provider Availability...');
  try {
    const isAvailable = await provider.isAvailable();
    console.log(`✅ Provider available: ${isAvailable}\n`);
    
    if (!isAvailable) {
      console.log('❌ Provider not available, skipping model tests');
      return;
    }
  } catch (error) {
    console.log(`❌ Availability check failed: ${error.message}`);
    return;
  }

  // Test 4: List Models
  console.log('4️⃣ Listing Available Models...');
  const models = provider.models;
  console.log(`✅ Found ${models.length} models:`);
  models.slice(0, 5).forEach((model, index) => {
    console.log(`   ${index + 1}. ${model.name} (${model.id})`);
  });
  if (models.length > 5) {
    console.log(`   ... and ${models.length - 5} more models`);
  }
  console.log();

  // Test 5: Create Model Instance
  console.log('5️⃣ Creating Text-to-Text Model...');
  const modelId = 'deepseek/deepseek-r1-distill-llama-70b'; // Free model
  
  try {
    const model = await provider.createTextToTextModel(modelId);
    console.log(`✅ Model created: ${model.getName()}`);
    console.log(`   ID: ${model.getId()}`);
    console.log(`   Provider: ${model.getProvider()}\n`);

    // Test 6: Text Generation
    console.log('6️⃣ Testing Text Generation...');
    const inputText = new Text('Hello! Please write a short poem about AI.');
    
    try {
      const result = await model.transform(inputText, {
        temperature: 0.7,
        maxOutputTokens: 100
      });
      
      console.log('✅ Text generation successful!');
      console.log(`   Input: "${inputText.content}"`);
      console.log(`   Output: "${result.content}"`);
      console.log(`   Language: ${result.language}`);
      console.log(`   Confidence: ${result.confidence}\n`);
      
    } catch (error) {
      console.log(`❌ Text generation failed: ${error.message}`);
    }

  } catch (error) {
    console.log(`❌ Model creation failed: ${error.message}`);
  }

  // Test 7: Service Management
  console.log('7️⃣ Testing Service Management...');
  try {
    const startResult = await provider.startService();
    console.log(`✅ Start service: ${startResult}`);
    
    const status = await provider.getServiceStatus();
    console.log(`✅ Service status: running=${status.running}, healthy=${status.healthy}`);
    
    const stopResult = await provider.stopService();
    console.log(`✅ Stop service: ${stopResult}\n`);
    
  } catch (error) {
    console.log(`❌ Service management failed: ${error.message}`);
  }

  console.log('🎉 OpenRouter implementation test completed!');
}

// Run the test
if (require.main === module) {
  testOpenRouterImplementation().catch(console.error);
}

export { testOpenRouterImplementation };
