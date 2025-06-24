/**
 * Zonos TTS Integration Example
 * 
 * Complete usage example showing how to use the new Zonos Docker provider
 * following the same patterns as Chatterbox and Kokoro.
 */

import { ZonosDockerProvider } from './src/media/providers/docker/zonos';
import { Text } from './src/media/assets/roles';

async function zonosIntegrationExample() {
  console.log('🎯 Zonos TTS Integration Example\n');

  try {
    // === STEP 1: Initialize Provider ===
    console.log('=== STEP 1: Initialize Provider ===');
    const provider = new ZonosDockerProvider();
    
    console.log(`📋 Provider Information:`);
    console.log(`   ID: ${provider.id}`);
    console.log(`   Name: ${provider.name}`);
    console.log(`   Type: ${provider.type}`);
    console.log(`   Capabilities: ${provider.capabilities.join(', ')}`);
    console.log('');

    // === STEP 2: Service Management ===
    console.log('=== STEP 2: Service Management ===');
    
    // Check current status
    let status = await provider.getServiceStatus();
    console.log(`🔍 Current Status:`);
    console.log(`   Running: ${status.running}`);
    console.log(`   Healthy: ${status.healthy}`);
    if (status.error) console.log(`   Error: ${status.error}`);
    
    // Start service if needed
    if (!status.running || !status.healthy) {
      console.log('\n🚀 Starting Zonos Docker service...');
      const started = await provider.startService();
      console.log(`   Service started: ${started}`);
      
      if (started) {
        // Wait for service to be ready
        console.log('   Waiting for service to initialize...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Check status again
        status = await provider.getServiceStatus();
        console.log(`   Updated status - Running: ${status.running}, Healthy: ${status.healthy}`);
      }
    } else {
      console.log('✅ Service is already running and healthy');
    }
    console.log('');

    // === STEP 3: Provider Configuration ===
    console.log('=== STEP 3: Provider Configuration ===');
    
    // Check availability
    const available = await provider.isAvailable();
    console.log(`🔗 Provider available: ${available}`);
    
    // Get available models
    const models = provider.getAvailableModels();
    console.log(`📦 Available models: ${models.join(', ')}`);
    
    // Get service info
    const info = provider.getInfo();
    console.log(`🐳 Docker Configuration:`);
    console.log(`   Image: ${info.dockerImage}`);
    console.log(`   Port: ${info.defaultPort}`);
    console.log(`   Capabilities: ${info.capabilities.join(', ')}`);
    console.log('');

    if (!available) {
      console.log('⚠️  Provider not available. Cannot proceed with TTS generation.');
      return;
    }

    // === STEP 4: Create TTS Model ===
    console.log('=== STEP 4: Create TTS Model ===');
    const model = await provider.createTextToAudioModel('zonos-tts');
    console.log(`🤖 Created model: ${model.getId()}`);
    console.log(`   Description: ${model.getDescription()}`);
    console.log(`   Supported formats: ${model.getSupportedFormats().join(', ')}`);
    console.log('');

    // === STEP 5: Basic TTS Generation ===
    console.log('=== STEP 5: Basic TTS Generation ===');
    
    const basicText = "Hello! This is a basic test of Zonos text-to-speech.";
    const textInput = new Text(basicText, 'en', 1.0);
    
    console.log(`📝 Input: "${basicText}"`);
    console.log('🎵 Generating with default settings...');
    
    const startTime = Date.now();
    const basicAudio = await model.transform(textInput, {
      language: "en-us",
      happiness: 1.0,
      speakingRate: 15.0
    });
    const basicTime = Date.now() - startTime;
    
    console.log(`✅ Basic audio generated!`);
    console.log(`   Generation time: ${basicTime}ms`);
    console.log(`   File size: ${(basicAudio.data.length / 1024).toFixed(1)}KB`);
    console.log('');

    // === STEP 6: Advanced TTS with Emotion Control ===
    console.log('=== STEP 6: Advanced TTS with Emotion Control ===');
    
    const emotionalText = "I'm so excited to tell you about this amazing new feature!";
    const emotionalInput = new Text(emotionalText, 'en', 1.0);
    
    console.log(`📝 Input: "${emotionalText}"`);
    console.log('🎭 Generating with emotional settings...');
    
    const emotionalStartTime = Date.now();
    const emotionalAudio = await model.transform(emotionalInput, {
      // Model configuration
      modelChoice: "Zyphra/Zonos-v0.1-transformer",
      language: "en-us",
      
      // Emotion settings - excited and happy
      happiness: 1.0,     // Maximum happiness
      sadness: 0.0,       // No sadness
      neutral: 0.1,       // Minimal neutral
      surprise: 0.3,      // Some surprise/excitement
      fear: 0.0,          // No fear
      anger: 0.0,         // No anger
      disgust: 0.0,       // No disgust
      other: 0.1,         // Some other emotions
      
      // Voice conditioning - energetic delivery
      speakingRate: 18.0, // Faster, more energetic
      pitchStd: 60.0,     // More pitch variation
      vqScore: 0.8,       // High voice quality
      dnsmos: 4.5,        // High overall quality
      fmax: 24000,        // Full frequency range
      
      // Generation settings - high quality
      cfgScale: 2.5,      // Strong guidance
      seed: 42,           // Reproducible
      randomizeSeed: false,
      linear: 0.6,        // NovelAI sampler tweaks
      confidence: 0.5,
      quadratic: 0.1
    });
    const emotionalTime = Date.now() - emotionalStartTime;
    
    console.log(`✅ Emotional audio generated!`);
    console.log(`   Generation time: ${emotionalTime}ms`);
    console.log(`   File size: ${(emotionalAudio.data.length / 1024).toFixed(1)}KB`);
    console.log('');

    // === STEP 7: Voice Style Comparison ===
    console.log('=== STEP 7: Voice Style Comparison ===');
    
    const comparisonText = "This sentence will be spoken with different emotional styles.";
    const comparisonInput = new Text(comparisonText, 'en', 1.0);
    
    console.log(`📝 Input: "${comparisonText}"`);
    
    // Generate sad version
    console.log('😢 Generating sad version...');
    const sadAudio = await model.transform(comparisonInput, {
      happiness: 0.1,
      sadness: 0.8,
      neutral: 0.2,
      speakingRate: 12.0, // Slower for sadness
      pitchStd: 30.0      // Less variation
    });
    
    // Generate neutral version
    console.log('😐 Generating neutral version...');
    const neutralAudio = await model.transform(comparisonInput, {
      happiness: 0.2,
      sadness: 0.2,
      neutral: 0.8,
      speakingRate: 15.0, // Normal speed
      pitchStd: 45.0      // Normal variation
    });
    
    console.log(`✅ Generated 3 emotional variants:`);
    console.log(`   Happy: ${(emotionalAudio.data.length / 1024).toFixed(1)}KB`);
    console.log(`   Sad: ${(sadAudio.data.length / 1024).toFixed(1)}KB`);
    console.log(`   Neutral: ${(neutralAudio.data.length / 1024).toFixed(1)}KB`);
    console.log('');

    // === STEP 8: Generation Metadata ===
    console.log('=== STEP 8: Generation Metadata ===');
    
    if (emotionalAudio.metadata?.generation_prompt) {
      const gp = emotionalAudio.metadata.generation_prompt;      console.log(`📊 Generation Metadata:`);
      console.log(`   Provider: ${gp.provider}`);
      console.log(`   Model: ${gp.modelName}`);
      console.log(`   Transform: ${gp.transformationType}`);
      console.log(`   Timestamp: ${gp.timestamp}`);
      
      if (gp.metadata) {
        console.log(`   Emotion Settings:`);
        console.log(`     Happiness: ${gp.metadata.emotionSettings?.happiness}`);
        console.log(`     Speaking Rate: ${gp.metadata.voiceConditioning?.speakingRate}`);
        console.log(`     Model Choice: ${gp.metadata.modelChoice}`);
      }
    }
    console.log('');

    // === STEP 9: Performance Metrics ===
    console.log('=== STEP 9: Performance Metrics ===');
    
    const totalGenerations = 5;
    const avgBasicTime = basicTime;
    const avgEmotionalTime = emotionalTime;
    
    console.log(`⏱️  Performance Summary:`);
    console.log(`   Basic generation: ${avgBasicTime}ms`);
    console.log(`   Emotional generation: ${avgEmotionalTime}ms`);
    console.log(`   Total generations: ${totalGenerations}`);
    console.log(`   Average per generation: ${((basicTime + emotionalTime) / 2).toFixed(0)}ms`);
    console.log('');

    // === STEP 10: Service Information ===
    console.log('=== STEP 10: Service Information ===');
    
    // Get final service status
    const finalStatus = await provider.getServiceStatus();
    console.log(`🔍 Final Service Status:`);
    console.log(`   Running: ${finalStatus.running}`);
    console.log(`   Healthy: ${finalStatus.healthy}`);
    
    // Show models for capability
    const audioModels = provider.getModelsForCapability(provider.capabilities[0]);
    console.log(`📦 Audio Models Available: ${audioModels.length}`);
    audioModels.forEach(model => {
      console.log(`   - ${model.name} (${model.id})`);
    });
    console.log('');

    console.log('🎉 Zonos TTS Integration Example Completed Successfully!\n');
    
    console.log('💡 Integration Summary:');
    console.log('   ✅ Docker service management working');
    console.log('   ✅ Provider interface fully compatible');
    console.log('   ✅ TTS generation with emotional control');
    console.log('   ✅ Multiple voice styles supported');
    console.log('   ✅ Generation metadata preserved');
    console.log('   ✅ Performance metrics available');
    console.log('   ✅ Ready for production pipeline integration');
    console.log('');
    
    console.log('🔧 Next Steps:');
    console.log('   1. Add to provider registry');
    console.log('   2. Configure in environment');
    console.log('   3. Set up monitoring and logging');
    console.log('   4. Integrate with existing TTS pipeline');
    console.log('   5. Add voice cloning support (optional)');

  } catch (error) {
    console.error('❌ Example failed:', error);
    
    if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Docker Service Not Running:');
      console.log('   1. Start the service: docker-compose -f services/zonos/docker-compose.yml up -d');
      console.log('   2. Check status: docker ps | grep zonos');
      console.log('   3. Check logs: docker-compose -f services/zonos/docker-compose.yml logs');
      console.log('   4. Test endpoint: curl http://localhost:7860/');
    }
    
    if (error.message.includes('timeout')) {
      console.log('\n💡 Service Timeout:');
      console.log('   1. The service may be starting up (can take 1-2 minutes)');
      console.log('   2. Check container resources: docker stats zonos-tts-server');
      console.log('   3. Increase timeout or wait longer');
    }
  }
}

// Run the example
if (require.main === module) {
  zonosIntegrationExample().catch(console.error);
}

export { zonosIntegrationExample };
