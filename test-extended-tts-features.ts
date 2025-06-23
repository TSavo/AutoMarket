/**
 * Extended SpeechT5 TTS Tests
 * 
 * Tests various features of SpeechT5 and other TTS models:
 * - Different voices/speaker embeddings
 * - Different languages
 * - Other supported TTS models
 * - Audio parameters (speed, pitch, volume)
 */

import { initializeProviders, getProvider } from './src/media/registry/bootstrap';
import { MediaCapability } from './src/media/types/provider';
import { Text } from './src/media/assets/roles';
import { HuggingFaceDockerProvider } from './src/media/providers/docker/huggingface/HuggingFaceDockerProvider';

async function testExtendedTTSFeatures() {
  console.log('🎙️  Testing Extended TTS Features...\n');

  try {
    // Initialize providers
    await initializeProviders();
    const provider = await getProvider('huggingface-docker') as unknown as HuggingFaceDockerProvider;
    
    if (!provider || !await provider.isAvailable()) {
      throw new Error('HuggingFace provider not available');
    }

    console.log('✅ Provider ready\n');

    // Test 1: Different voice characteristics with SpeechT5
    console.log('🎭 Test 1: Different Voice Parameters with SpeechT5');
    const speechT5Model = await provider.getModel('microsoft/speecht5_tts');
    
    const testCases = [
      {
        name: 'Normal Speed',
        text: 'This is normal speaking speed.',
        options: { voice: 'default', speed: 1.0, pitch: 0.0, volume: 1.0 }
      },
      {
        name: 'Fast Speech',
        text: 'This is fast speaking speed.',
        options: { voice: 'default', speed: 1.5, pitch: 0.0, volume: 1.0 }
      },
      {
        name: 'Slow Speech',
        text: 'This is slow speaking speed.',
        options: { voice: 'default', speed: 0.7, pitch: 0.0, volume: 1.0 }
      },
      {
        name: 'Higher Pitch',
        text: 'This is higher pitch speaking.',
        options: { voice: 'default', speed: 1.0, pitch: 0.3, volume: 1.0 }
      },
      {
        name: 'Lower Pitch',
        text: 'This is lower pitch speaking.',
        options: { voice: 'default', speed: 1.0, pitch: -0.3, volume: 1.0 }
      }
    ];

    for (const testCase of testCases) {
      try {
        console.log(`   Testing: ${testCase.name}`);
        const textInput = new Text(testCase.text, 'en', 1.0);
        const startTime = Date.now();
        
        const audio = await speechT5Model.transform(textInput, testCase.options);
        const duration = Date.now() - startTime;
        
        console.log(`   ✅ Generated in ${duration}ms - ${audio.getHumanSize()}`);
        
        // Get file path if available
        if (audio.metadata) {
          const filePath = audio.metadata.filePath || audio.metadata.sourceUrl;
          if (filePath) {
            console.log(`      File: ${filePath}`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Test 2: Different Languages (if supported)
    console.log('\n🌍 Test 2: Different Languages');
    const languageTests = [
      { lang: 'en', text: 'Hello, how are you today?', name: 'English' },
      { lang: 'es', text: 'Hola, ¿cómo estás hoy?', name: 'Spanish' },
      { lang: 'fr', text: 'Bonjour, comment allez-vous?', name: 'French' },
      { lang: 'de', text: 'Hallo, wie geht es dir heute?', name: 'German' }
    ];

    for (const langTest of languageTests) {
      try {
        console.log(`   Testing: ${langTest.name} (${langTest.lang})`);
        const textInput = new Text(langTest.text, langTest.lang, 1.0);
        const startTime = Date.now();
        
        const audio = await speechT5Model.transform(textInput, {
          voice: 'default',
          language: langTest.lang
        });
        const duration = Date.now() - startTime;
        
        console.log(`   ✅ Generated in ${duration}ms - ${audio.getHumanSize()}`);
      } catch (error) {
        console.log(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Test 3: Other TTS Models
    console.log('\n🎵 Test 3: Other TTS Models');
    const supportedModels = provider.getSupportedTextToAudioModels();
    console.log(`   Available models: ${supportedModels.length}`);
    
    // Test a few different models
    const modelsToTest = [
      'facebook/mms-tts-eng',
      'espnet/kan-bayashi_ljspeech_vits',
      'facebook/musicgen-small'
    ].filter(modelId => supportedModels.includes(modelId));

    console.log(`   Testing models: ${modelsToTest.join(', ')}`);

    for (const modelId of modelsToTest) {
      try {
        console.log(`   Testing model: ${modelId}`);
        const model = await provider.getModel(modelId);
        
        const isAvailable = await model.isAvailable();
        if (!isAvailable) {
          console.log(`   ⚠️  Model not available: ${modelId}`);
          continue;
        }

        let testText: string;
        let testOptions: any = {};

        // Customize test based on model type
        if (modelId.includes('musicgen')) {
          testText = 'upbeat electronic music with drums';
          testOptions = { duration: 5 }; // 5 seconds of music
        } else {
          testText = 'Hello, this is a test of the text to speech model.';
          testOptions = { voice: 'default' };
        }

        const textInput = new Text(testText, 'en', 1.0);
        const startTime = Date.now();
        
        const audio = await model.transform(textInput, testOptions);
        const duration = Date.now() - startTime;
        
        console.log(`   ✅ Generated in ${duration}ms - ${audio.getHumanSize()}`);
        
        const audioResult = audio as any;
        if (audioResult.duration !== undefined) {
          console.log(`      Duration: ${audioResult.duration}s`);
        }
        if (audioResult.sampleRate !== undefined) {
          console.log(`      Sample rate: ${audioResult.sampleRate}Hz`);
        }

      } catch (error) {
        console.log(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Test 4: Long Text Generation
    console.log('\n📖 Test 4: Long Text Generation');
    const longText = `
      Artificial intelligence has revolutionized the way we interact with technology. 
      From voice assistants to autonomous vehicles, AI systems are becoming increasingly 
      sophisticated and capable. Text-to-speech technology, in particular, has made 
      significant strides in recent years, with models like SpeechT5 producing 
      remarkably natural-sounding speech. These advances enable new applications 
      in accessibility, entertainment, and human-computer interaction.
    `.trim();

    try {
      console.log(`   Testing long text (${longText.length} characters)`);
      const textInput = new Text(longText, 'en', 1.0);
      const startTime = Date.now();
      
      const audio = await speechT5Model.transform(textInput, {
        voice: 'default',
        speed: 1.0
      });
      const duration = Date.now() - startTime;
      
      console.log(`   ✅ Generated in ${duration}ms - ${audio.getHumanSize()}`);
      
      const audioResult = audio as any;
      if (audioResult.duration !== undefined) {
        console.log(`      Audio duration: ${audioResult.duration}s`);
        const wordsPerMinute = (longText.split(' ').length / audioResult.duration) * 60;
        console.log(`      Speaking rate: ~${Math.round(wordsPerMinute)} words/minute`);
      }

    } catch (error) {
      console.log(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test 5: Batch Generation
    console.log('\n🔄 Test 5: Batch Generation Performance');
    const batchTexts = [
      'First sentence for batch testing.',
      'Second sentence with different content.',
      'Third sentence to complete the batch.',
      'Fourth and final sentence in this test.'
    ];    console.log(`   Testing batch of ${batchTexts.length} sentences`);
    const batchStartTime = Date.now();
    const batchResults: Array<{index: number, success: boolean, size?: string, error?: string}> = [];

    for (let i = 0; i < batchTexts.length; i++) {
      try {
        const textInput = new Text(batchTexts[i], 'en', 1.0);
        const audio = await speechT5Model.transform(textInput, { voice: 'default' });
        batchResults.push({
          index: i + 1,
          success: true,
          size: audio.getHumanSize()
        });
        console.log(`     ${i + 1}/${batchTexts.length} ✅ ${audio.getHumanSize()}`);
      } catch (error) {
        batchResults.push({
          index: i + 1,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log(`     ${i + 1}/${batchTexts.length} ❌ Failed`);
      }
    }

    const batchDuration = Date.now() - batchStartTime;
    const successCount = batchResults.filter(r => r.success).length;
    console.log(`   Batch completed: ${successCount}/${batchTexts.length} successful in ${batchDuration}ms`);
    console.log(`   Average per sentence: ${Math.round(batchDuration / batchTexts.length)}ms`);

    // Test 6: Service Stress Test
    console.log('\n⚡ Test 6: Service Performance');
    try {
      const health = await provider.getServiceHealth();
      console.log(`   Service status: ${health.status}`);
      console.log(`   Loaded models: ${health.loadedModels?.length || 0}`);
      
      if (health.loadedModels && health.loadedModels.length > 0) {
        console.log('   Model details:');
        for (const modelInfo of health.loadedModels) {
          console.log(`     - ${modelInfo.modelId}: ${modelInfo.memoryUsage}MB`);
        }
      }

      // Test multiple concurrent requests
      console.log('   Testing concurrent requests...');
      const concurrentTexts = [
        'Concurrent request one.',
        'Concurrent request two.',
        'Concurrent request three.'
      ];

      const concurrentStartTime = Date.now();
      const concurrentPromises = concurrentTexts.map(async (text, index) => {
        try {
          const textInput = new Text(text, 'en', 1.0);
          const audio = await speechT5Model.transform(textInput, { voice: 'default' });
          return { index: index + 1, success: true, size: audio.getHumanSize() };
        } catch (error) {
          return { index: index + 1, success: false, error: error instanceof Error ? error.message : 'Unknown' };
        }
      });

      const concurrentResults = await Promise.all(concurrentPromises);
      const concurrentDuration = Date.now() - concurrentStartTime;
      const concurrentSuccessCount = concurrentResults.filter(r => r.success).length;

      console.log(`   Concurrent test: ${concurrentSuccessCount}/${concurrentTexts.length} successful in ${concurrentDuration}ms`);
      console.log(`   Concurrent speedup: ${Math.round((batchDuration / batchTexts.length * concurrentTexts.length) / concurrentDuration * 100)}% faster than sequential`);

    } catch (error) {
      console.log(`   ❌ Performance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('\n🎉 Extended TTS testing completed!');
    console.log('\nSummary:');
    console.log('✅ Voice parameter variations tested');
    console.log('✅ Language support tested');
    console.log('✅ Multiple TTS models tested');
    console.log('✅ Long text generation tested');
    console.log('✅ Batch processing tested');
    console.log('✅ Concurrent request performance tested');

  } catch (error) {
    console.error('\n❌ Extended TTS test failed:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the extended tests
if (require.main === module) {
  testExtendedTTSFeatures().catch(console.error);
}

export { testExtendedTTSFeatures };
