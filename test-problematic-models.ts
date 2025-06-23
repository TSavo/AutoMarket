/**
 * Test Problematic Models with Improved Handlers
 * 
 * Tests the new specialized handlers for models that were failing.
 */

import { initializeProviders, getProvider } from './src/media/registry/bootstrap';
import { HuggingFaceDockerProvider } from './src/media/providers/docker/huggingface/HuggingFaceDockerProvider';
import { Text } from './src/media/assets/roles';

async function testProblematicModels() {
    console.log('🔍 Testing Problematic Models with Improved Handlers...');
    
    try {        
        // Initialize providers
        console.log('🏗️ Initializing provider registry...');
        await initializeProviders();
        const provider = await getProvider('huggingface-docker') as unknown as HuggingFaceDockerProvider;
        
        if (!provider || !await provider.isAvailable()) {
            throw new Error('HuggingFace provider not available');
        }

        console.log('✅ Provider ready');
          // Test problematic models
        const problematicModels = [
            {
                id: 'facebook/mms-tts-eng',
                name: 'Facebook MMS-TTS English',
                expectedHandler: 'FacebookMMSTTSHandler',
                expectSuccess: true // Now working
            },
            {
                id: 'espnet/kan-bayashi_ljspeech_vits', 
                name: 'ESPnet VITS',
                expectedHandler: 'ESPnetVITSHandler',
                expectSuccess: true // Fixed with proper ESPnet integration
            }
        ];

        for (const modelInfo of problematicModels) {
            console.log(`\n🎯 Testing: ${modelInfo.name} (${modelInfo.id})`);
            console.log(`   Expected handler: ${modelInfo.expectedHandler}`);
              try {
                // Create model instance
                console.log('   Creating model instance...');
                const model = await provider.createTextToAudioModel(modelInfo.id);
                
                // Test generation
                console.log('   Testing generation...');
                const textInput = new Text('Hello, this is a test.', 'en', 1.0);
                
                const result = await model.transform(textInput, {
                    sampleRate: 22050,
                    format: 'wav'
                });
                
                if (modelInfo.expectSuccess) {
                    console.log(`   ✅ Successfully generated: ${result.getHumanSize()}`);
                } else {
                    console.log(`   ⚠️  Unexpectedly succeeded: ${result.getHumanSize()}`);
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                
                if (modelInfo.expectSuccess) {
                    console.log(`   ❌ Unexpected failure: ${errorMsg}`);
                } else {
                    console.log(`   ✅ Failed as expected: ${errorMsg}`);
                }
                
                // Check for specific error types and extract more details
                if (error instanceof Error && error.message.includes('text-to-audio generation failed')) {
                    console.log(`   🔍 Full error chain detected`);
                    // Check if error message contains our specialized handler messages
                    if (errorMsg.includes('ESPnet VITS model') && errorMsg.includes('not compatible')) {
                        console.log(`   ⚠️  ESPnet VITS compatibility error (should be fixed now)`);
                    } else if (errorMsg.includes('ESPnet is required') || errorMsg.includes('espnet')) {
                        console.log(`   ⚠️  ESPnet installation required - rebuild Docker service`);
                    } else if (errorMsg.includes('Facebook MMS-TTS') && errorMsg.includes('parameter incompatibility')) {
                        console.log(`   ✅ Facebook MMS-TTS specialized handler working!`);
                    } else if (errorMsg.includes('TextToAudioPipeline._sanitize_parameters') && errorMsg.includes('sample_rate')) {
                        console.log(`   ✅ Facebook MMS-TTS parameter compatibility issue detected!`);
                    } else if (errorMsg.includes('compatibility issues') || errorMsg.includes('model format incompatibility')) {
                        console.log(`   ✅ Specialized compatibility error detected`);
                    } else {
                        console.log(`   ⚠️  Generic error - checking if specialized info is buried:`);
                        console.log(`       Full message: ${errorMsg.substring(0, 200)}...`);
                    }
                } else {
                    console.log(`   ⚠️  Unexpected error type - handler may not be working correctly`);
                    console.log(`       Error: ${errorMsg.substring(0, 200)}...`);
                }
            }
        }
        
        // Test that working models still work
        console.log(`\n✅ Testing that working models still function...`);
        
        try {
            const speechT5Model = await provider.createTextToAudioModel('microsoft/speecht5_tts');
            const textInput = new Text('Quick test of working model.', 'en', 1.0);
            
            const result = await speechT5Model.transform(textInput, {
                sampleRate: 22050,
                format: 'wav'
            });
            
            console.log(`   ✅ SpeechT5 still working: ${result.getHumanSize()}`);
        } catch (error) {
            console.log(`   ❌ SpeechT5 regression: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        console.log(`\n🎉 Problematic model testing completed!`);
        
    } catch (error) {
        console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
        console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    }
}

// Run the test
testProblematicModels();
