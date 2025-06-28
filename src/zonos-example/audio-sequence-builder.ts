import { ZonosClient } from "./zonos-client.js";
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

export interface SequenceOptions {
  speakerAudio: string;
  maxChunkLength?: number; // Maximum characters per chunk
  pauseAtParagraphs?: boolean; // Insert pauses at paragraph breaks
  pauseDuration?: number; // Pause duration in milliseconds for paragraph breaks
  pauseBetweenChunks?: boolean; // Insert pauses between all chunks
  chunkPauseDuration?: number; // Pause duration in milliseconds between regular chunks
  outputFormat?: 'wav' | 'mp3'; // Output audio format
  mp3Quality?: number; // MP3 quality (0-9, lower is better quality)
  voice?: {
    conditioning?: {
      dnsmos?: number;
      fmax?: number;
      speakingRate?: number;
      pitchStd?: number;
      vqScore?: number;
    };
    generation?: {
      cfgScale?: number;
      randomizeSeed?: boolean;
      baseSeed?: number;
    };
    emotion?: Record<string, number>;
  };
}

export interface ChunkInfo {
  text: string;
  index: number;
  isParagraphBreak: boolean;
  seed: number;
}

export class AudioSequenceBuilder {
  private client: ZonosClient;  private options: SequenceOptions & {
    maxChunkLength: number;
    pauseAtParagraphs: boolean;
    pauseDuration: number;
    pauseBetweenChunks: boolean;
    chunkPauseDuration: number;
    outputFormat: 'wav' | 'mp3';
    mp3Quality: number;
    voice: {
      conditioning: {
        dnsmos: number;
        fmax: number;
        speakingRate: number;
        pitchStd: number;
        vqScore: number;
      };
      generation: {
        cfgScale: number;
        randomizeSeed: boolean;
        baseSeed: number;
      };
      emotion: Record<string, number>;
    };
  };
  
  constructor(gradioUrl: string, options: SequenceOptions) {
    this.client = new ZonosClient(gradioUrl);    // Set defaults
    this.options = {
      speakerAudio: options.speakerAudio,
      maxChunkLength: options.maxChunkLength || 200,
      pauseAtParagraphs: options.pauseAtParagraphs ?? true,
      pauseDuration: options.pauseDuration || 400, // Paragraph breaks
      pauseBetweenChunks: options.pauseBetweenChunks ?? true,
      chunkPauseDuration: options.chunkPauseDuration || 150, // Regular chunk breaks
      outputFormat: options.outputFormat || 'mp3',
      mp3Quality: options.mp3Quality || 2, // High quality MP3
      voice: {
        conditioning: {
          dnsmos: 4.5,
          fmax: 24000,
          speakingRate: 15.0,
          pitchStd: 45.0,
          vqScore: 0.75,
          ...options.voice?.conditioning
        },        generation: {
          cfgScale: 2.0,
          randomizeSeed: true,
          baseSeed: 90000,
          ...options.voice?.generation
        },emotion: {
          happiness: 1.0,
          sadness: 0.3,
          disgust: 0.13,
          fear: 0.05,
          surprise: 0.05,
          anger: 0.29,
          other: 0.1,
          neutral: 0.2,
          ...options.voice?.emotion
        }
      }
    };
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }
  /**
   * Breaks text into natural chunks at sentence boundaries
   */
  private breakIntoChunks(script: string): ChunkInfo[] {
    const chunks: ChunkInfo[] = [];
    const baseSeed = this.options.voice.generation.baseSeed || 90000;
    
    // First, split by paragraphs (double newlines or single newlines)
    const paragraphs = script.split(/\n\s*\n|\n/).filter(p => p.trim().length > 0);
    
    for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex++) {
      const paragraph = paragraphs[paragraphIndex].trim();
      const isLastParagraph = paragraphIndex === paragraphs.length - 1;
      
      // Split paragraph into sentences
      const sentences = this.splitIntoSentences(paragraph);
      
      let currentChunk = "";
      let paragraphChunks: ChunkInfo[] = [];
      
      for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) continue;
        
        // Check if adding this sentence would exceed max length
        const potentialChunk = currentChunk + (currentChunk ? " " : "") + trimmedSentence;
        
        if (potentialChunk.length <= this.options.maxChunkLength) {
          // Add to current chunk
          currentChunk = potentialChunk;
        } else {
          // Save current chunk if it has content
          if (currentChunk) {
            paragraphChunks.push({
              text: currentChunk,
              index: chunks.length + paragraphChunks.length,
              isParagraphBreak: false, // Will be set later for the last chunk in paragraph
              seed: baseSeed + Math.floor(Math.random() * 10000)
            });
          }
          
          // Start new chunk with current sentence
          currentChunk = trimmedSentence;
        }
      }
      
      // Save final chunk of paragraph
      if (currentChunk) {
        paragraphChunks.push({
          text: currentChunk,
          index: chunks.length + paragraphChunks.length,
          isParagraphBreak: false, // Will be set below
          seed: baseSeed + Math.floor(Math.random() * 10000)
        });
      }
      
      // Mark only the last chunk of each paragraph (except the very last paragraph) as a paragraph break
      if (paragraphChunks.length > 0 && !isLastParagraph) {
        paragraphChunks[paragraphChunks.length - 1].isParagraphBreak = true;
      }
      
      // Add all chunks from this paragraph to the main chunks array
      chunks.push(...paragraphChunks);
    }
    
    return chunks;
  }

  /**
   * Split text into sentences using multiple delimiters
   */
  private splitIntoSentences(text: string): string[] {
    // Split on sentence-ending punctuation followed by whitespace or end of string
    return text.split(/([.!?]+\s+|[.!?]+$)/)
      .reduce((sentences: string[], part: string, index: number, array: string[]) => {
        if (index % 2 === 0) {
          // This is sentence content
          const nextPart = array[index + 1] || "";
          const fullSentence = (part + nextPart).trim();
          if (fullSentence) {
            sentences.push(fullSentence);
          }
        }
        return sentences;
      }, []);
  }

  /**
   * Generate audio for all chunks
   */
  async generateChunks(script: string, outputPrefix: string = "chunk"): Promise<string[]> {
    console.log("🔄 Breaking script into natural chunks...");
    const chunks = this.breakIntoChunks(script);
    
    console.log(`📝 Created ${chunks.length} chunks:`);
    chunks.forEach(chunk => {
      console.log(`  ${chunk.index + 1}. "${chunk.text.substring(0, 50)}${chunk.text.length > 50 ? '...' : ''}" ${chunk.isParagraphBreak ? '(paragraph break)' : ''}`);
    });
    
    console.log("\n🎵 Generating audio for each chunk...");
    const audioFiles: string[] = [];
    
    for (const chunk of chunks) {
      const filename = `${outputPrefix}_${String(chunk.index + 1).padStart(2, '0')}.wav`;
      
      console.log(`  Generating ${filename}...`);
      
      const result = await this.client.generateSpeech({
        text: chunk.text,
        speakerAudio: this.options.speakerAudio,
        conditioning: this.options.voice.conditioning,
        generation: {
          ...this.options.voice.generation,
          seed: chunk.seed
        },
        emotion: this.options.voice.emotion,
        unconditional: {
          emotion: false
        }
      });
      
      await this.client.saveAudio(result, filename);
      audioFiles.push(filename);
      
      console.log(`    ✅ ${filename} (seed: ${chunk.seed})`);
    }
    
    return audioFiles;
  }

  /**
   * Create silence audio file
   */
  private async createSilence(durationMs: number, filename: string): Promise<void> {
    // Create a simple silence WAV file
    const sampleRate = 24000; // Match Zonos output
    const samples = Math.floor((durationMs / 1000) * sampleRate);
    
    // WAV header + silence
    const buffer = Buffer.alloc(44 + samples * 2); // 16-bit samples
    
    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + samples * 2, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // PCM header size
    buffer.writeUInt16LE(1, 20);  // PCM format
    buffer.writeUInt16LE(1, 22);  // Mono
    buffer.writeUInt32LE(sampleRate, 24); // Sample rate
    buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate
    buffer.writeUInt16LE(2, 32);  // Block align
    buffer.writeUInt16LE(16, 34); // Bits per sample
    buffer.write('data', 36);
    buffer.writeUInt32LE(samples * 2, 40);
    
    // Silence data (already zeros from Buffer.alloc)
    
    fs.writeFileSync(filename, buffer);
  }

  /**
   * Stitch audio files together with pauses at paragraph breaks
   */
  async stitchTogether(script: string, audioFiles: string[], outputFilename: string): Promise<void> {
    console.log("\n🔗 Stitching audio files together...");
    
    const chunks = this.breakIntoChunks(script);
    const tempFiles: string[] = [];
      try {
      // Create silence files if needed
      let chunkSilenceFile: string | null = null;
      let paragraphSilenceFile: string | null = null;
      
      if (this.options.pauseBetweenChunks) {
        chunkSilenceFile = "temp_chunk_silence.wav";
        await this.createSilence(this.options.chunkPauseDuration, chunkSilenceFile);
        tempFiles.push(chunkSilenceFile);
        console.log(`  📄 Created ${this.options.chunkPauseDuration}ms chunk silence file`);
      }
      
      if (this.options.pauseAtParagraphs && chunks.some(c => c.isParagraphBreak)) {
        paragraphSilenceFile = "temp_paragraph_silence.wav";
        await this.createSilence(this.options.pauseDuration, paragraphSilenceFile);
        tempFiles.push(paragraphSilenceFile);
        console.log(`  📄 Created ${this.options.pauseDuration}ms paragraph silence file`);
      }      // Build ffmpeg command with volume normalization
      const inputs: string[] = [];
      const filterParts: string[] = [];
      const volumeFilters: string[] = [];
      
      let filterIndex = 0;
      for (let i = 0; i < audioFiles.length; i++) {
        inputs.push('-i', audioFiles[i]);
        
        // Apply volume normalization to each audio input
        const normalizedTag = `norm${filterIndex}`;
        volumeFilters.push(`[${filterIndex}:0]loudnorm=I=-16:TP=-1.5:LRA=11[${normalizedTag}]`);
        filterParts.push(`[${normalizedTag}]`);
        filterIndex++;
        
        // Add appropriate pause after each chunk (except the last)
        if (i < audioFiles.length - 1) {
          if (chunks[i]?.isParagraphBreak && paragraphSilenceFile) {
            // Use paragraph pause for paragraph breaks
            inputs.push('-i', paragraphSilenceFile);
            filterParts.push(`[${filterIndex}:0]`);
            filterIndex++;
          } else if (chunkSilenceFile) {
            // Use regular chunk pause for normal breaks
            inputs.push('-i', chunkSilenceFile);
            filterParts.push(`[${filterIndex}:0]`);
            filterIndex++;
          }
        }
      }
        // Combine volume normalization and concatenation filters
      const allFilters = [...volumeFilters, `${filterParts.join('')}concat=n=${filterParts.length}:v=0:a=1[out]`];
      const complexFilter = allFilters.join(';');
      
      // Build output arguments based on format
      const outputArgs: string[] = [];
      if (this.options.outputFormat === 'mp3') {
        outputArgs.push('-codec:a', 'libmp3lame', '-q:a', this.options.mp3Quality.toString());
      }
      
      // Build complete ffmpeg command
      const ffmpegCmd = [
        'ffmpeg', '-y', // Overwrite output
        ...inputs,
        '-filter_complex', complexFilter,
        '-map', '[out]',
        ...outputArgs,
        outputFilename
      ].join(' ');
      console.log(`  🎬 Running: ${ffmpegCmd}`);
      
      // Execute ffmpeg  
      const process = spawn('ffmpeg', [
        '-y',
        ...inputs,
        '-filter_complex', complexFilter,
        '-map', '[out]',
        ...outputArgs,
        outputFilename
      ], { stdio: 'pipe' });
      
      await new Promise<void>((resolve, reject) => {
        process.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`ffmpeg exited with code ${code}`));
          }
        });
        
        process.on('error', reject);
      });
      
      console.log(`  ✅ Combined audio saved: ${outputFilename}`);
      
    } finally {
      // Clean up temporary files
      for (const tempFile of tempFiles) {
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Complete workflow: break script -> generate chunks -> stitch together
   */
  async buildSequence(script: string, outputFilename: string, chunkPrefix: string = "seq"): Promise<void> {
    console.log("🎯 Building Complete Audio Sequence");
    console.log("=" .repeat(60));
    console.log(`📝 Script length: ${script.length} characters`);
    console.log(`🎭 Speaker: ${this.options.speakerAudio}`);    console.log(`📏 Max chunk length: ${this.options.maxChunkLength} characters`);
    console.log(`⏸️  Chunk pauses: ${this.options.pauseBetweenChunks ? this.options.chunkPauseDuration + 'ms' : 'disabled'}`);
    console.log(`📄 Paragraph pauses: ${this.options.pauseAtParagraphs ? this.options.pauseDuration + 'ms' : 'disabled'}`);
    console.log(`🎵 Output format: ${this.options.outputFormat.toUpperCase()}${this.options.outputFormat === 'mp3' ? ` (quality: ${this.options.mp3Quality})` : ''}`);
    console.log("");
    
    // Generate all chunks
    const audioFiles = await this.generateChunks(script, chunkPrefix);
    
    // Stitch them together
    await this.stitchTogether(script, audioFiles, outputFilename);
    
    console.log("\n🎊 Sequence Complete!");
    console.log(`📄 Individual chunks: ${audioFiles.join(', ')}`);
    console.log(`🎵 Final combined audio: ${outputFilename}`);
    console.log(`🎧 Play ${outputFilename} to hear the complete sequence!`);
  }

  /**
   * Preview how the script will be chunked without generating audio
   */
  previewChunks(script: string): ChunkInfo[] {
    return this.breakIntoChunks(script);
  }
}
