/**
 * Test Together AI Audio Generation - Real Test
 * 
 * Actually generate and download audio with Cartesia Sonic
 */

import { TogetherProvider } from './src/media/providers/together/TogetherProvider';

async function testTogetherAudioGeneration() {
  console.log('🎵 Testing Together AI Audio Generation - Real Test...\n');

  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    console.log('❌ Please set TOGETHER_API_KEY environment variable');
    return;
  }

  try {
    // 1. Create and configure provider
    console.log('1️⃣ Setting up Together AI Provider...');
    const provider = new TogetherProvider();
    await provider.configure({ apiKey });
    
    console.log('✅ Provider configured\n');

    // 2. Check available audio models
    console.log('2️⃣ Checking available audio models...');
    const audioModels = provider.getAudioModels();
    
    if (audioModels.length === 0) {
      console.log('❌ No audio models found');
      return;
    }

    console.log(`✅ Found ${audioModels.length} audio models:`);
    audioModels.forEach(model => {
      console.log(`   - ${model.id}`);
    });
    console.log();

    // 3. Create audio model
    console.log('3️⃣ Creating audio model...');
    const modelId = 'cartesia/sonic'; // Use the base Sonic model
    const audioModel = await provider.createTextToAudioModel(modelId);
    
    console.log(`✅ Audio model created: ${audioModel.getName()}\n`);

    // 4. Test text and cost estimation
    const testText = "Hello! This is a test of Together AI audio generation using Cartesia Sonic.";
    console.log('4️⃣ Preparing audio generation...');
    console.log(`📝 Text to generate: "${testText}"`);
    console.log(`📏 Text length: ${testText.length} characters`);
    
    // Get cost estimation
    const costEstimate = (audioModel as any).getEstimatedCost?.(testText);
    if (costEstimate) {
      console.log(`💰 Estimated cost: $${costEstimate.estimatedCost.toFixed(4)} USD`);
    }
    console.log();

    // 5. Generate audio
    console.log('5️⃣ Generating audio...');
    console.log('🎤 Starting audio generation...');
    
    const startTime = Date.now();
    
    try {
      const audio = await audioModel.transform(testText as any, {
        voice: 'default',
        speed: 1.0,
        format: 'mp3'
      } as any);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      console.log(`✅ Audio generation completed in ${processingTime}ms!`);
      console.log();
      
      // 6. Show audio details
      console.log('6️⃣ Audio details...');
      console.log(`🎵 Audio file created successfully!`);
      
      if (audio.metadata) {
        console.log(`📊 Audio metadata:`);
        console.log(`   - Duration: ${audio.metadata.duration || 'unknown'}s`);
        console.log(`   - File size: ${audio.metadata.fileSize ? (audio.metadata.fileSize / 1024).toFixed(1) + 'KB' : 'unknown'}`);
        console.log(`   - Local path: ${audio.metadata.localPath || 'unknown'}`);
        console.log(`   - Format: ${audio.metadata.format || 'unknown'}`);
        console.log(`   - Sample rate: ${audio.metadata.sampleRate || 'unknown'}Hz`);
        console.log(`   - Channels: ${audio.metadata.channels || 'unknown'}`);
        console.log(`   - Processing time: ${processingTime}ms`);
        
        if (audio.metadata.model) {
          console.log(`   - Model used: ${audio.metadata.model}`);
        }
        if (audio.metadata.voice) {
          console.log(`   - Voice: ${audio.metadata.voice}`);
        }
        if (audio.metadata.speed) {
          console.log(`   - Speed: ${audio.metadata.speed}x`);
        }
      }
      
      // 7. File location info
      console.log();
      console.log('7️⃣ File location...');
      const filePath = audio.metadata?.localPath;
      if (filePath) {
        console.log(`🎧 Audio file saved to: ${filePath}`);
        console.log(`🎧 You can now play this file to hear the generated audio!`);
        
        // Check if file exists
        const fs = require('fs');
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          console.log(`✅ File confirmed: ${(stats.size / 1024).toFixed(1)}KB`);
        } else {
          console.log(`❌ File not found at expected location`);
        }
      } else {
        console.log(`❌ No file path available`);
      }
      
      console.log();
      console.log('🎉 Audio generation test completed successfully!');
      console.log('📊 Summary:');
      console.log(`   - Text: "${testText}"`);
      console.log(`   - Characters: ${testText.length}`);
      console.log(`   - Processing time: ${processingTime}ms`);
      console.log(`   - File: ${filePath || 'unknown'}`);
      if (costEstimate) {
        console.log(`   - Estimated cost: $${costEstimate.estimatedCost.toFixed(4)}`);
      }
      
    } catch (audioError) {
      console.log(`❌ Audio generation failed: ${audioError.message}`);
      console.log(`   Error details: ${audioError.stack}`);
      
      // Check if it's an API error
      if (audioError.message.includes('API error')) {
        console.log(`💡 This might be an API endpoint or authentication issue`);
      }
      if (audioError.message.includes('timeout')) {
        console.log(`💡 This might be a timeout issue - audio generation can take time`);
      }
    }

  } catch (error) {
    console.log(`❌ Test setup failed: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the test
if (require.main === module) {
  testTogetherAudioGeneration().catch(console.error);
}

export { testTogetherAudioGeneration };
