/**
 * Quick Kokoro Test - Direct Docker Run
 * 
 * This bypasses docker-compose for a direct test
 */

import { KokoroAPIClient } from './src/media/providers/docker/kokoro/KokoroAPIClient';

async function quickKokoroTest() {
  console.log('🧪 Quick Kokoro Test - Direct Docker Run...\n');

  try {
    // Step 1: Check if image exists
    console.log('📦 Checking for Kokoro Docker image...');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout } = await execAsync('docker images kprinssu/kokoro-fastapi:latest --format "{{.Repository}}:{{.Tag}}"');
      if (stdout.trim()) {
        console.log(`   ✅ Image found: ${stdout.trim()}`);
      } else {
        console.log('   ❌ Image not found');
        return;
      }
    } catch (error) {
      console.log('   ❌ Error checking image:', error.message);
      return;
    }

    // Step 2: Start container directly (skip if already running)
    console.log('\n🚀 Starting Kokoro container directly...');
    
    // Check if container is already running
    try {
      const { stdout: runningContainers } = await execAsync('docker ps --filter "ancestor=kprinssu/kokoro-fastapi:latest" --format "{{.Names}}"');
      if (runningContainers.trim()) {
        console.log(`   ✅ Container already running: ${runningContainers.trim()}`);
      } else {
        // Start new container
        console.log('   🔄 Starting new container...');
        const { stdout: containerId } = await execAsync(`
          docker run -d \
            --name kokoro-test-${Date.now()} \
            -p 8005:8005 \
            kprinssu/kokoro-fastapi:latest
        `);
        console.log(`   ✅ Container started: ${containerId.trim().substring(0, 12)}`);
      }
    } catch (error) {
      console.log('   ❌ Error starting container:', error.message);
      return;
    }

    // Step 3: Wait for service to be ready
    console.log('\n⏳ Waiting for service to be ready...');
    const apiClient = new KokoroAPIClient({ baseUrl: 'http://localhost:8005' });
    
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds
    let isReady = false;
    
    while (attempts < maxAttempts && !isReady) {
      try {
        isReady = await apiClient.isAvailable();
        if (isReady) {
          console.log(`   ✅ Service ready after ${attempts + 1} attempts`);
          break;
        }
      } catch (error) {
        // Expected during startup
      }
      
      attempts++;
      console.log(`   ⏳ Attempt ${attempts}/${maxAttempts}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!isReady) {
      console.log('   ❌ Service failed to become ready within 30 seconds');
      return;
    }

    // Step 4: Test basic API calls
    console.log('\n🧪 Testing API calls...');
    
    // Test health endpoint
    try {
      const available = await apiClient.isAvailable();
      console.log(`   Health check: ${available ? '✅ Healthy' : '❌ Unhealthy'}`);
    } catch (error) {
      console.log(`   Health check: ❌ Error - ${error.message}`);
    }

    // Test voices endpoint
    try {
      const voices = await apiClient.getVoices();
      console.log(`   Available voices: ${voices.join(', ')}`);
    } catch (error) {
      console.log(`   Voices: ❌ Error - ${error.message}`);
    }

    // Test service info
    try {
      const info = await apiClient.getServiceInfo();
      console.log(`   Service info: ${info ? '✅ Available' : '❌ Not available'}`);
      if (info) {
        console.log(`   Service details:`, JSON.stringify(info, null, 2));
      }
    } catch (error) {
      console.log(`   Service info: ❌ Error - ${error.message}`);
    }    // Step 5: Test TTS generation
    console.log('\n🎵 Testing TTS generation...');
    try {
      const result = await apiClient.generateTTS({
        text: 'Hello! This is a test of the Kokoro TTS system.',
        voice: 'af_bella',  // Use a valid voice
        speed: 1.0,
        alpha: 0.3,
        beta: 0.7
      });

      if (result.error) {
        console.log(`   TTS Generation: ❌ ${result.error}`);
      } else {
        console.log(`   ✅ TTS Generated successfully!`);
        if (result.audio_data) {
          const audioSize = Buffer.from(result.audio_data, 'base64').length;
          console.log(`   📁 Audio size: ${audioSize} bytes`);
        }
        if (result.duration) {
          console.log(`   ⏱️  Duration: ${result.duration} seconds`);
        }
        if (result.sample_rate) {
          console.log(`   🎛️  Sample rate: ${result.sample_rate} Hz`);
        }
      }
    } catch (error) {
      console.log(`   TTS Generation: ❌ Error - ${error.message}`);
    }

    console.log('\n🎉 Kokoro direct test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  quickKokoroTest().catch(console.error);
}

export { quickKokoroTest };
