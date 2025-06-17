/**
 * Test script for TTS generation module
 * 
 * Usage: ts-node test-tts-generation.ts [test-type]
 * 
 * Test types:
 * - availability: Check if TTS is available
 * - sample: Generate TTS for sample text
 * - blog: Generate TTS for a blog post
 */

import path from 'path';
import { generateTTS, checkTTSAvailability, TTSProgress } from './generate-tts';
import { sanitizeBlogPostFile } from './text-sanitizer';

/**
 * Test TTS availability
 */
async function testAvailability() {
  console.log('🔍 Checking TTS availability...\n');
  
  const availability = await checkTTSAvailability();
  
  console.log('Results:');
  console.log(`✅ Available: ${availability.available}`);
  console.log(`🐍 Python Path: ${availability.pythonPath}`);

  console.log('\n🎤 TTS Providers:');
  console.log(`📦 Chatterbox: ${availability.providers.chatterbox.available ? '✅ Available' : '❌ Not Available'}`);
  if (availability.providers.chatterbox.error) {
    console.log(`   Error: ${availability.providers.chatterbox.error}`);
  }

  console.log(`🌐 Creatify: ${availability.providers.creatify.available ? '✅ Available' : '❌ Not Available'}`);
  if (availability.providers.creatify.error) {
    console.log(`   Error: ${availability.providers.creatify.error}`);
  }

  if (!availability.available) {
    console.log('\n📋 Setup Instructions:');
    console.log('\n🔧 For Chatterbox TTS (Local GPU):');
    console.log('1. Install Python 3.8+ if not available');
    console.log('2. Install Chatterbox TTS: pip install chatterbox-tts');
    console.log('3. Install ffmpeg for audio processing');

    console.log('\n🌐 For Creatify TTS (Cloud API):');
    console.log('1. Set CREATIFY_API_ID environment variable');
    console.log('2. Set CREATIFY_API_KEY environment variable');
    console.log('3. No local installation required');
  }
  
  return availability.available;
}

/**
 * Test TTS generation with sample text
 */
async function testSampleGeneration() {
  console.log('🎵 Testing TTS generation with sample text...\n');
  
  const sampleText = `Neural Heist: The Corporate Data Grab Inside Your Skull.

Hey chummer,

The rain's falling harder now, each drop carrying trace particles of environmental collapse and failed regulations. But that's nothing compared to what's seeping into your cerebral cortex.

This post is part of the I Hate It Here series. For more like it, visit horizon dash city dot com`;

  const outputPath = path.join(process.cwd(), 'public', 'audio', 'blog', 'test-sample.mp3');
  
  console.log(`📝 Text length: ${sampleText.length} characters`);
  console.log(`💾 Output path: ${outputPath}`);
  console.log('');
  
  // Progress callback
  const onProgress = (progress: TTSProgress) => {
    const progressBar = '█'.repeat(Math.floor(progress.progress / 5)) + 
                       '░'.repeat(20 - Math.floor(progress.progress / 5));
    console.log(`[${progressBar}] ${progress.progress}% - ${progress.message}`);
  };

  try {
    const result = await generateTTS(sampleText, outputPath, {
      force: true, // Force regeneration for testing
      provider: 'auto', // Auto-select best available provider
      exaggeration: 0.5,
      cfg_weight: 0.5,
      creatifyAccent: '3480f048-8883-4bdc-b57f-4e7078e94b18'
    }, onProgress);
    
    console.log('\n✅ TTS Generation Results:');
    console.log(`Success: ${result.success}`);
    console.log(`Audio Path: ${result.audioPath}`);
    console.log(`Web Path: ${result.webPath}`);
    console.log(`Duration: ${result.duration} seconds`);
    console.log(`File Size: ${(result.fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Generation Time: ${(result.generationTime! / 1000).toFixed(1)} seconds`);
    
    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
    }
    
    return result.success;
    
  } catch (error) {
    console.error('❌ TTS generation failed:', error);
    return false;
  }
}

/**
 * Test TTS generation for a blog post
 */
async function testBlogPostGeneration(slug: string) {
  console.log(`📖 Testing TTS generation for blog post: ${slug}\n`);
  
  const blogPostPath = path.join(process.cwd(), '..', '..', 'content', 'blog', 'posts', `${slug}.mdx`);
  const outputPath = path.join(process.cwd(), '..', '..', 'public', 'audio', 'blog', `${slug}.mp3`);
  
  try {
    // First, sanitize the blog post content
    console.log('🧹 Sanitizing blog post content...');
    const sanitized = sanitizeBlogPostFile(blogPostPath, {
      includeTitle: true,
      preserveGreetings: true,
      cleanupSignature: true,
      addSeriesOutro: true,
      addPauses: true
    });
    
    console.log(`📝 Sanitized text: ${sanitized.wordCount} words, ${sanitized.cleanText.length} characters`);
    console.log(`⏱️  Estimated duration: ${Math.floor(sanitized.estimatedDuration / 60)}:${(sanitized.estimatedDuration % 60).toString().padStart(2, '0')}`);
    console.log('');
    
    // Progress callback
    const onProgress = (progress: TTSProgress) => {
      const progressBar = '█'.repeat(Math.floor(progress.progress / 5)) + 
                         '░'.repeat(20 - Math.floor(progress.progress / 5));
      console.log(`[${progressBar}] ${progress.progress}% - ${progress.message}`);
    };
    
    // Generate TTS
    const result = await generateTTS(sanitized.cleanText, outputPath, {
      force: true, // Force regeneration for testing
      provider: 'auto', // Auto-select best available provider
      exaggeration: 0.5,
      cfg_weight: 0.5,
      creatifyAccent: '3480f048-8883-4bdc-b57f-4e7078e94b18'
    }, onProgress);
    
    console.log('\n✅ TTS Generation Results:');
    console.log(`Success: ${result.success}`);
    console.log(`Audio Path: ${result.audioPath}`);
    console.log(`Web Path: ${result.webPath}`);
    console.log(`Duration: ${result.duration} seconds`);
    console.log(`File Size: ${(result.fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Generation Time: ${(result.generationTime! / 1000).toFixed(1)} seconds`);
    
    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
    }
    
    return result.success;
    
  } catch (error) {
    console.error('❌ Blog post TTS generation failed:', error);
    return false;
  }
}

/**
 * Test Creatify TTS specifically
 */
async function testCreatifyGeneration() {
  console.log('🌐 Testing Creatify TTS specifically...\n');

  const sampleText = `Neural Heist: The Corporate Data Grab Inside Your Skull.

Hey chummer,

The rain's falling harder now, each drop carrying trace particles of environmental collapse and failed regulations.

This post is part of the I Hate It Here series. For more like it, visit horizon dash city dot com`;

  const outputPath = path.join(process.cwd(), 'public', 'audio', 'blog', 'test-creatify.mp3');

  console.log(`📝 Text length: ${sampleText.length} characters`);
  console.log(`💾 Output path: ${outputPath}`);
  console.log('🌐 Provider: Creatify TTS');
  console.log('');

  // Progress callback
  const onProgress = (progress: TTSProgress) => {
    const progressBar = '█'.repeat(Math.floor(progress.progress / 5)) +
                       '░'.repeat(20 - Math.floor(progress.progress / 5));
    console.log(`[${progressBar}] ${progress.progress}% - ${progress.message}`);
  };

  try {
    const result = await generateTTS(sampleText, outputPath, {
      force: true,
      provider: 'creatify',
      creatifyAccent: '3480f048-8883-4bdc-b57f-4e7078e94b18'
    }, onProgress);

    console.log('\n✅ Creatify TTS Results:');
    console.log(`Success: ${result.success}`);
    console.log(`Audio Path: ${result.audioPath}`);
    console.log(`Web Path: ${result.webPath}`);
    console.log(`Duration: ${result.duration} seconds`);
    console.log(`File Size: ${(result.fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Generation Time: ${(result.generationTime! / 1000).toFixed(1)} seconds`);

    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
    }

    return result.success;

  } catch (error) {
    console.error('❌ Creatify TTS generation failed:', error);
    return false;
  }
}

/**
 * Test Chatterbox TTS specifically
 */
async function testChatterboxGeneration() {
  console.log('📦 Testing Chatterbox TTS specifically...\n');

  const sampleText = `Neural Heist: The Corporate Data Grab Inside Your Skull.

Hey chummer,

The rain's falling harder now, each drop carrying trace particles of environmental collapse and failed regulations.

This post is part of the I Hate It Here series. For more like it, visit horizon dash city dot com`;

  const outputPath = path.join(process.cwd(), 'public', 'audio', 'blog', 'test-chatterbox.mp3');

  console.log(`📝 Text length: ${sampleText.length} characters`);
  console.log(`💾 Output path: ${outputPath}`);
  console.log('📦 Provider: Chatterbox TTS');
  console.log('');

  // Progress callback
  const onProgress = (progress: TTSProgress) => {
    const progressBar = '█'.repeat(Math.floor(progress.progress / 5)) +
                       '░'.repeat(20 - Math.floor(progress.progress / 5));
    console.log(`[${progressBar}] ${progress.progress}% - ${progress.message}`);
  };

  try {
    const result = await generateTTS(sampleText, outputPath, {
      force: true,
      provider: 'chatterbox',
      exaggeration: 0.5,
      cfg_weight: 0.5
    }, onProgress);

    console.log('\n✅ Chatterbox TTS Results:');
    console.log(`Success: ${result.success}`);
    console.log(`Audio Path: ${result.audioPath}`);
    console.log(`Web Path: ${result.webPath}`);
    console.log(`Duration: ${result.duration} seconds`);
    console.log(`File Size: ${(result.fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Generation Time: ${(result.generationTime! / 1000).toFixed(1)} seconds`);

    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
    }

    return result.success;

  } catch (error) {
    console.error('❌ Chatterbox TTS generation failed:', error);
    return false;
  }
}

/**
 * Test Chatterbox Docker TTS specifically
 */
async function testChatterboxDockerGeneration() {
  console.log('🐳 Testing Chatterbox Docker TTS specifically...\n');

  const sampleText = `Neural Heist: The Corporate Data Grab Inside Your Skull.

Hey chummer,

The rain's falling harder now, each drop carrying trace particles of environmental collapse and failed regulations.

This post is part of the I Hate It Here series. For more like it, visit horizon dash city dot com`;

  const outputPath = path.join(process.cwd(), 'public', 'audio', 'blog', 'test-chatterbox-docker.mp3');
  const voiceCloneFile = path.join(process.cwd(), 'confusion.wav');

  console.log(`📝 Text length: ${sampleText.length} characters`);
  console.log(`💾 Output path: ${outputPath}`);
  console.log(`🎤 Voice clone file: ${voiceCloneFile}`);
  console.log('🐳 Provider: Chatterbox Docker TTS');
  console.log('');

  // Progress callback
  const onProgress = (progress: TTSProgress) => {
    const progressBar = '█'.repeat(Math.floor(progress.progress / 5)) +
                       '░'.repeat(20 - Math.floor(progress.progress / 5));
    console.log(`[${progressBar}] ${progress.progress}% - ${progress.message}`);
  };

  try {
    const result = await generateTTS(sampleText, outputPath, {
      force: true,
      provider: 'chatterbox-docker',
      voiceCloneFile: voiceCloneFile
    }, onProgress);

    console.log('\n✅ Chatterbox Docker TTS Results:');
    console.log(`Success: ${result.success}`);
    console.log(`Audio Path: ${result.audioPath}`);
    console.log(`Web Path: ${result.webPath}`);
    console.log(`Duration: ${result.duration} seconds`);
    console.log(`File Size: ${(result.fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Generation Time: ${(result.generationTime! / 1000).toFixed(1)} seconds`);

    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
    }

    return result.success;

  } catch (error) {
    console.error('❌ Chatterbox Docker TTS generation failed:', error);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'availability';
  
  console.log('🎤 TTS Generation Module Test\n');
  console.log('=' .repeat(50));
  
  switch (testType) {
    case 'availability':
      await testAvailability();
      break;
      
    case 'sample':
      const available = await testAvailability();
      if (available) {
        console.log('\n' + '=' .repeat(50));
        await testSampleGeneration();
      }
      break;
      
    case 'blog':
      const blogSlug = args[1] || 'neural-heist';
      const isAvailable = await testAvailability();
      if (isAvailable) {
        console.log('\n' + '=' .repeat(50));
        await testBlogPostGeneration(blogSlug);
      }
      break;

    case 'creatify':
      console.log('\n' + '=' .repeat(50));
      await testCreatifyGeneration();
      break;

    case 'chatterbox':
      console.log('\n' + '=' .repeat(50));
      await testChatterboxGeneration();
      break;

    case 'chatterbox-docker':
      console.log('\n' + '=' .repeat(50));
      await testChatterboxDockerGeneration();
      break;

    default:
      console.log('❌ Unknown test type. Available options:');
      console.log('  - availability: Check if TTS is available');
      console.log('  - sample: Generate TTS for sample text (auto-select provider)');
      console.log('  - blog [slug]: Generate TTS for a blog post');
      console.log('  - creatify: Test Creatify TTS specifically');
      console.log('  - chatterbox: Test Chatterbox TTS specifically');
      console.log('  - chatterbox-docker: Test Chatterbox Docker TTS specifically');
      console.log('\nExamples:');
      console.log('  ts-node test-tts-generation.ts availability');
      console.log('  ts-node test-tts-generation.ts sample');
      console.log('  ts-node test-tts-generation.ts blog neural-heist');
      console.log('  ts-node test-tts-generation.ts creatify');
      console.log('  ts-node test-tts-generation.ts chatterbox');
      console.log('  ts-node test-tts-generation.ts chatterbox-docker');
  }
}

// Run the test
main().catch(console.error);
