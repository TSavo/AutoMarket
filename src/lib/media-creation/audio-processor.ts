/**
 * Audio processing functionality for blog posts
 */

import fs from 'fs';
import path from 'path';
import { generateTTS, checkTTSAvailability } from './generate-tts';
import { sanitizeBlogPostFile } from './text-sanitizer';
import { AudioSilenceRemover } from '../../src/media/audio-silence-remover-fixed';
import { AUDIO_PATH } from './config';
import type { ProcessingOptions } from './types';

/**
 * Audio metadata interface
 */
export interface AudioMetadata {
  src: string;
  duration: number;
  fileSize: number;
  generated: string;
  provider: string;
  voice: string;
}

/**
 * Process TTS audio generation for a blog post
 */
export async function processAudio(
  slug: string,
  mdxPath: string,
  options: ProcessingOptions = {}
): Promise<AudioMetadata | null> {
  console.log('\n=== TTS Audio Generation ===');
  
  const audioFileName = `${slug}.mp3`;
  const audioPath = path.join(AUDIO_PATH, audioFileName);
  const audioWebPath = `/audio/blog/${audioFileName}`;
  
  // Check if audio already exists and if we should regenerate
  const shouldGenerateAudio = !fs.existsSync(audioPath) || options.force;
  
  if (shouldGenerateAudio) {
    console.log('🎤 Generating TTS audio...');
    
    try {
      // Check TTS availability first
      const ttsAvailability = await checkTTSAvailability();
      
      if (!ttsAvailability.available) {
        console.warn('⚠️ TTS not available, skipping audio generation');
        console.warn(`Error: ${ttsAvailability.error}`);
        return null;
      }

      console.log('✅ TTS available, proceeding with audio generation');
      
      // Sanitize the blog post content for TTS
      const sanitized = sanitizeBlogPostFile(mdxPath, {
        includeTitle: true,
        preserveGreetings: true,
        cleanupSignature: true,
        addSeriesOutro: true,
        addPauses: true
      });
      
      console.log(`📝 Sanitized content: ${sanitized.wordCount} words, estimated ${Math.floor(sanitized.estimatedDuration / 60)}:${(sanitized.estimatedDuration % 60).toString().padStart(2, '0')}`);
      
      // Step 1: Generate TTS audio as WAV first
      const tempWavPath = path.join(AUDIO_PATH, `${slug}_temp.wav`);
      console.log('🎵 Generating TTS as WAV for silence processing...');
      
      const ttsResult = await generateTTS(sanitized.cleanText, tempWavPath, {
        force: options.force,
        provider: 'chatterbox-docker', // Use Docker provider with voice cloning
        voiceCloneFile: path.join(__dirname, 'confusion.wav'), // Use your voice sample
        outputFormat: 'wav', // Generate as WAV first
        exaggeration: 0.5,
        cfg_weight: 0.5,
        speed: 1.0
      }, (progress) => {
        // Display progress updates
        const progressBar = '█'.repeat(Math.floor(progress.progress / 5)) + '░'.repeat(20 - Math.floor(progress.progress / 5));
        const timeRemaining = progress.estimatedTimeRemaining
          ? ` (${Math.floor(progress.estimatedTimeRemaining / 60)}:${(progress.estimatedTimeRemaining % 60).toString().padStart(2, '0')} remaining)`
          : '';

        if (progress.currentChunk && progress.totalChunks) {
          console.log(`🎤 [${progressBar}] ${progress.progress}% - ${progress.message} [${progress.currentChunk}/${progress.totalChunks}]${timeRemaining}`);
        } else {
          console.log(`🎤 [${progressBar}] ${progress.progress}% - ${progress.message}${timeRemaining}`);
        }
      });
      
      if (!ttsResult.success) {
        console.error('❌ TTS generation failed:', ttsResult.error);
        return null;
      }
      
      console.log('✅ TTS WAV generated successfully');
      
      // Step 2: Remove silence using your proven settings (-13dB, 2.5 seconds)
      console.log('🔇 Removing silence from audio...');
      const silenceRemover = new AudioSilenceRemover({
        silenceThreshold: '-13dB',      // Your proven threshold
        silenceDuration: 2.5,           // Your proven duration
        outputDir: AUDIO_PATH,
        createBackup: false,            // Don't need backup for temp file
        outputSuffix: '_no_silence'
      });
      
      const silenceResult = await silenceRemover.removeSilence(tempWavPath);
      console.log(`✅ Silence removal complete - saved ${silenceResult.timeSaved.toFixed(2)}s (${((silenceResult.timeSaved / silenceResult.originalDuration) * 100).toFixed(1)}%)`);
      
      // Step 3: Convert processed WAV to MP3
      console.log('🎵 Converting processed WAV to MP3...');
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      await execAsync(`ffmpeg -i "${silenceResult.outputFile}" -codec:a libmp3lame -b:a 192k -y "${audioPath}"`);
      
      // Clean up temporary files
      if (fs.existsSync(tempWavPath)) {
        fs.unlinkSync(tempWavPath);
      }
      if (fs.existsSync(silenceResult.outputFile)) {
        fs.unlinkSync(silenceResult.outputFile);
      }
      
      // Get final MP3 file stats
      const finalStats = fs.statSync(audioPath);
      
      console.log('✅ Audio processing complete!');
      console.log(`📁 Final audio file: ${audioPath}`);
      console.log(`🌐 Web path: ${audioWebPath}`);
      console.log(`⏱️ Original duration: ${ttsResult.duration}s, Final duration: ${silenceResult.processedDuration}s`);
      console.log(`� Time saved by silence removal: ${silenceResult.timeSaved.toFixed(2)}s`);
      console.log(`📊 Final file size: ${(finalStats.size / 1024 / 1024).toFixed(2)} MB`);
      
      // Return audio metadata
      return {
        src: audioWebPath,
        duration: Math.round(silenceResult.processedDuration),
        fileSize: finalStats.size,
        generated: new Date().toISOString(),
        provider: 'chatterbox-docker',
        voice: 'confusion' // Using your voice clone
      };
      
    } catch (error) {
      console.error('❌ Error during audio processing:', error);
      
      // Clean up any temporary files on error
      const tempWavPath = path.join(AUDIO_PATH, `${slug}_temp.wav`);
      if (fs.existsSync(tempWavPath)) {
        fs.unlinkSync(tempWavPath);
      }
      
      return null;
    }
  } else {
    console.log('⏭️ Audio file already exists, skipping TTS generation');
    
    // Return existing audio metadata if file exists
    if (fs.existsSync(audioPath)) {
      const stats = fs.statSync(audioPath);
      return {
        src: audioWebPath,
        duration: 0, // Would need to detect from file
        fileSize: stats.size,
        generated: stats.mtime.toISOString(),
        provider: 'chatterbox-docker',
        voice: 'confusion'
      };
    }
    
    return null;
  }
}
