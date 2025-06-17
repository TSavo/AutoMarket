/**
 * TTS Generation Module using Chatterbox TTS
 * 
 * This module provides high-quality text-to-speech generation using the
 * recently released Chatterbox TTS model by Resemble AI.
 * 
 * Features:
 * - Chatterbox TTS integration with optimal settings
 * - Audio file caching and management
 * - Voice customization options
 * - Error handling and retry logic
 * - Progress reporting for long content
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { Creatify } from '@tsavo/creatify-api-ts';
import { ChatterboxTTSService } from '../../src/media/tts/ChatterboxTTSService';
import { ChatterboxTTSDockerService } from '../../src/media/ChatterboxTTSDockerService';

export interface TTSOptions {
  voice?: string;
  speed?: number;
  exaggeration?: number;
  cfg_weight?: number;
  force?: boolean; // Force regeneration
  model?: string; // Model variant
  outputFormat?: 'mp3' | 'wav';
  sampleRate?: number;
  bitrate?: string;
  provider?: 'chatterbox' | 'chatterbox-docker' | 'creatify' | 'auto'; // TTS provider
  creatifyAccent?: string; // Creatify voice accent ID
  voiceCloneFile?: string; // Path to voice clone audio file for Chatterbox Docker
}

export interface TTSResult {
  audioPath: string;
  webPath: string;
  duration: number;
  fileSize: number;
  success: boolean;
  error?: string;
  generationTime?: number;
}

export interface TTSProgress {
  stage: 'initializing' | 'generating' | 'processing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  timeElapsed?: number;
  currentChunk?: number;
  totalChunks?: number;
  estimatedTimeRemaining?: number; // seconds
}

// Default configuration
const DEFAULT_TTS_OPTIONS: Required<Omit<TTSOptions, 'force' | 'voiceCloneFile'>> = {
  voice: 'default',
  speed: 1.0,
  exaggeration: 0.5,
  cfg_weight: 0.5,
  model: 'chatterbox',
  outputFormat: 'mp3',
  sampleRate: 44100,
  bitrate: '128k',
  provider: 'auto',
  creatifyAccent: '3480f048-8883-4bdc-b57f-4e7078e94b18' // Default Creatify voice
};

// Environment configuration
const TTS_CONFIG = {
  enabled: process.env.TTS_ENABLED !== 'false',
  voice: process.env.TTS_VOICE || DEFAULT_TTS_OPTIONS.voice,
  speed: parseFloat(process.env.TTS_SPEED || '1.0'),
  exaggeration: parseFloat(process.env.TTS_EXAGGERATION || '0.5'),
  cfg_weight: parseFloat(process.env.TTS_CFG_WEIGHT || '0.5'),
  maxLength: parseInt(process.env.TTS_MAX_LENGTH || '50000'),
  audioDir: path.join(process.cwd(), 'public', 'audio', 'blog'),
  pythonPath: process.env.PYTHON_PATH || 'python3',
  // Creatify configuration
  creatifyApiId: process.env.CREATIFY_API_ID,
  creatifyApiKey: process.env.CREATIFY_API_KEY,
  creatifyAccent: process.env.CREATIFY_ACCENT || DEFAULT_TTS_OPTIONS.creatifyAccent,
  // Chatterbox Docker configuration
  chatterboxDockerUrl: process.env.CHATTERBOX_DOCKER_URL || 'http://localhost:8004',
  provider: (process.env.TTS_PROVIDER as 'chatterbox' | 'chatterbox-docker' | 'creatify' | 'auto') || DEFAULT_TTS_OPTIONS.provider
};

/**
 * Main function to generate TTS audio from text
 */
export async function generateTTS(
  text: string,
  outputPath: string,
  options: TTSOptions = {},
  onProgress?: (progress: TTSProgress) => void
): Promise<TTSResult> {
  const startTime = Date.now();
  
  try {
    // Validate inputs
    if (!text || text.trim().length === 0) {
      throw new Error('Text content is required for TTS generation');
    }

    if (text.length > TTS_CONFIG.maxLength) {
      throw new Error(`Text too long: ${text.length} characters (max: ${TTS_CONFIG.maxLength})`);
    }

    // Merge options with defaults
    const finalOptions = { ...DEFAULT_TTS_OPTIONS, ...TTS_CONFIG, ...options };

    // Report progress
    onProgress?.({
      stage: 'initializing',
      progress: 0,
      message: 'Initializing TTS generation...'
    });

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Check if file already exists and force flag is not set
    if (fs.existsSync(outputPath) && !finalOptions.force) {
      const stats = fs.statSync(outputPath);
      const webPath = outputPath.replace(path.join(process.cwd(), 'public'), '');
      
      return {
        audioPath: outputPath,
        webPath,
        duration: await getAudioDuration(outputPath),
        fileSize: stats.size,
        success: true,
        generationTime: 0
      };
    }

    // Determine which TTS provider to use
    const provider = await selectTTSProvider(finalOptions.provider);

    onProgress?.({
      stage: 'generating',
      progress: 10,
      message: `Using ${provider} TTS provider...`
    });

    // Generate audio using selected provider
    let result: Omit<TTSResult, 'generationTime'>;
    
    if (provider === 'chatterbox') {
      result = await generateWithChatterbox(text, outputPath, finalOptions, onProgress);
    } else if (provider === 'chatterbox-docker') {
      result = await generateWithChatterboxDocker(text, outputPath, finalOptions, onProgress);
    } else {
      result = await generateWithCreatify(text, outputPath, finalOptions, onProgress);
    }
    
    const endTime = Date.now();
    const generationTime = endTime - startTime;

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: `TTS generation completed in ${(generationTime / 1000).toFixed(1)}s`,
      timeElapsed: generationTime
    });

    return {
      ...result,
      generationTime
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    onProgress?.({
      stage: 'error',
      progress: 0,
      message: `TTS generation failed: ${errorMessage}`
    });

    return {
      audioPath: outputPath,
      webPath: '',
      duration: 0,
      fileSize: 0,
      success: false,
      error: errorMessage,
      generationTime: Date.now() - startTime
    };
  }
}

/**
 * Generate audio using Chatterbox TTS Python package
 */
async function generateWithChatterbox(
  text: string,
  outputPath: string,
  options: Required<Omit<TTSOptions, 'force' | 'voiceCloneFile'>>,
  onProgress?: (progress: TTSProgress) => void
): Promise<Omit<TTSResult, 'generationTime'>> {
  
  return new Promise((resolve, reject) => {
    onProgress?.({
      stage: 'generating',
      progress: 20,
      message: 'Starting Chatterbox TTS generation...'
    });

    // Create Python script content
    const pythonScript = createPythonScript(text, outputPath, options);
    const tempScriptPath = path.join(process.cwd(), 'temp_tts_script.py');
    
    try {
      // Write temporary Python script
      fs.writeFileSync(tempScriptPath, pythonScript);

      // Execute Python script
      const pythonProcess = spawn(TTS_CONFIG.pythonPath, [tempScriptPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        
        // Parse progress if available
        const progressMatch = stdout.match(/Progress: (\d+)%/);
        if (progressMatch) {
          const progress = parseInt(progressMatch[1]);
          onProgress?.({
            stage: 'generating',
            progress: Math.min(20 + (progress * 0.6), 80),
            message: `Generating audio... ${progress}%`
          });
        }
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        // Clean up temporary script
        try {
          fs.unlinkSync(tempScriptPath);
        } catch (e) {
          // Ignore cleanup errors
        }

        if (code !== 0) {
          reject(new Error(`Python TTS process failed: ${stderr || stdout}`));
          return;
        }

        onProgress?.({
          stage: 'processing',
          progress: 90,
          message: 'Processing audio file...'
        });

        // Verify output file was created
        if (!fs.existsSync(outputPath)) {
          reject(new Error('Audio file was not generated'));
          return;
        }

        // Get file stats
        const stats = fs.statSync(outputPath);
        const webPath = outputPath.replace(path.join(process.cwd(), 'public'), '');

        // Get audio duration
        getAudioDuration(outputPath)
          .then(duration => {
            resolve({
              audioPath: outputPath,
              webPath,
              duration,
              fileSize: stats.size,
              success: true
            });
          })
          .catch(err => {
            // If duration detection fails, still return success but with 0 duration
            console.warn('Could not detect audio duration:', err.message);
            resolve({
              audioPath: outputPath,
              webPath,
              duration: 0,
              fileSize: stats.size,
              success: true
            });
          });
      });

      pythonProcess.on('error', (error) => {
        // Clean up temporary script
        try {
          fs.unlinkSync(tempScriptPath);
        } catch (e) {
          // Ignore cleanup errors
        }
        
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });

    } catch (error) {
      // Clean up temporary script
      try {
        fs.unlinkSync(tempScriptPath);
      } catch (e) {
        // Ignore cleanup errors
      }
      
      reject(error);
    }
  });
}

/**
 * Generate audio using Chatterbox Docker TTS service
 */
async function generateWithChatterboxDocker(
  text: string,
  outputPath: string,
  options: TTSOptions & Required<Omit<TTSOptions, 'force' | 'voiceCloneFile'>>,
  onProgress?: (progress: TTSProgress) => void
): Promise<Omit<TTSResult, 'generationTime'>> {
  
  onProgress?.({
    stage: 'generating',
    progress: 20,
    message: 'Starting Chatterbox Docker TTS generation...'
  });

  try {
    const chatterboxService = new ChatterboxTTSDockerService();

    // Check if service is available, try to start container if needed
    const availability = await checkChatterboxDockerAvailability();
    if (!availability.available) {
      throw new Error(`Chatterbox Docker service not available: ${availability.error}`);
    }

    onProgress?.({
      stage: 'generating',
      progress: 30,
      message: 'Generating speech with Chatterbox Docker...'
    });

    // Convert options to ChatterboxTTSDockerService format
    const ttsOptions: any = {
      voice: options.voice || 'Abigail.wav',
      speed: options.speed || 1.0,
      outputFormat: options.outputFormat || 'mp3', // Pass through output format
      onProgress: onProgress // Pass the progress callback to the service
    };

    // Add voice cloning file if provided
    if (options.voiceCloneFile) {
      ttsOptions.voiceFile = options.voiceCloneFile;
    }

    // Generate speech using the Docker service
    const result = await chatterboxService.generateTTS(text, outputPath, ttsOptions);

    if (!result.success) {
      throw new Error(result.error || 'TTS generation failed');
    }

    onProgress?.({
      stage: 'processing',
      progress: 90,
      message: 'Processing audio file...'
    });

    // Get file stats for additional info
    const stats = fs.statSync(outputPath);
    const webPath = outputPath.replace(path.join(process.cwd(), 'public'), '');

    return {
      audioPath: result.audioPath || outputPath,
      webPath,
      duration: result.duration || 0,
      fileSize: stats.size,
      success: true
    };

  } catch (error) {
    throw new Error(`Chatterbox Docker TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Select the appropriate TTS provider based on availability
 */
async function selectTTSProvider(preferredProvider: 'chatterbox' | 'chatterbox-docker' | 'creatify' | 'auto'): Promise<'chatterbox' | 'chatterbox-docker' | 'creatify'> {
  if (preferredProvider === 'chatterbox') {
    const availability = await checkChatterboxAvailability();
    if (availability.available) {
      return 'chatterbox';
    }
    console.warn('Chatterbox TTS not available, falling back to Creatify');
    return 'creatify';
  }

  if (preferredProvider === 'chatterbox-docker') {
    const availability = await checkChatterboxDockerAvailability();
    if (availability.available) {
      return 'chatterbox-docker';
    }
    console.warn('Chatterbox Docker TTS not available, falling back to Creatify');
    return 'creatify';
  }

  if (preferredProvider === 'creatify') {
    return 'creatify';
  }

  // Auto selection: prefer Chatterbox Docker, then Chatterbox, fallback to Creatify
  const chatterboxDockerAvailable = await checkChatterboxDockerAvailability();
  if (chatterboxDockerAvailable.available) {
    return 'chatterbox-docker';
  }

  const chatterboxAvailable = await checkChatterboxAvailability();
  if (chatterboxAvailable.available) {
    return 'chatterbox';
  }

  return 'creatify';
}

/**
 * Check if Chatterbox TTS is available
 */
async function checkChatterboxAvailability(): Promise<{ available: boolean; error?: string }> {
  try {
    const pythonCheck = spawn(TTS_CONFIG.pythonPath, ['-c', 'import chatterbox.tts']);

    return new Promise((resolve) => {
      pythonCheck.on('close', (code) => {
        resolve({
          available: code === 0,
          error: code !== 0 ? 'chatterbox-tts not installed' : undefined
        });
      });

      pythonCheck.on('error', () => {
        resolve({
          available: false,
          error: 'Python not found'
        });
      });
    });
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if Chatterbox Docker TTS is available
 */
async function checkChatterboxDockerAvailability(): Promise<{ available: boolean; error?: string }> {
  try {
    const chatterboxService = new ChatterboxTTSDockerService();
    const isAvailable = await chatterboxService.isAvailable();

    if (isAvailable) {
      return { available: true };
    }

    // Try to ensure container is running
    const containerReady = await chatterboxService.ensureContainerRunning();

    if (containerReady) {
      // Wait a bit for service to be ready
      await new Promise(resolve => setTimeout(resolve, 3000));
      const isAvailableAfterStart = await chatterboxService.isAvailable();

      return {
        available: isAvailableAfterStart,
        error: isAvailableAfterStart ? undefined : 'Service not ready after container start'
      };
    }

    return {
      available: false,
      error: 'Docker container not available'
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate audio using Creatify TTS API
 */
async function generateWithCreatify(
  text: string,
  outputPath: string,
  options: Required<Omit<TTSOptions, 'force' | 'voiceCloneFile'>>,
  onProgress?: (progress: TTSProgress) => void
): Promise<Omit<TTSResult, 'generationTime'>> {

  if (!TTS_CONFIG.creatifyApiId || !TTS_CONFIG.creatifyApiKey) {
    throw new Error('Creatify API credentials not configured. Set CREATIFY_API_ID and CREATIFY_API_KEY environment variables.');
  }

  onProgress?.({
    stage: 'generating',
    progress: 20,
    message: 'Starting Creatify TTS generation...'
  });

  try {
    // Initialize Creatify client
    const creatify = new Creatify({
      apiId: TTS_CONFIG.creatifyApiId,
      apiKey: TTS_CONFIG.creatifyApiKey
    });

    onProgress?.({
      stage: 'generating',
      progress: 30,
      message: 'Submitting TTS request to Creatify...'
    });

    // Create TTS task
    const ttsResult = await creatify.textToSpeech.createAndWaitForTextToSpeech({
      script: text,
      accent: options.creatifyAccent
    });

    if (ttsResult.status !== 'done' || !ttsResult.output) {
      throw new Error(`Creatify TTS failed: ${ttsResult.failed_reason || 'Unknown error'}`);
    }

    onProgress?.({
      stage: 'processing',
      progress: 80,
      message: 'Downloading audio file...'
    });

    // Download the audio file
    await downloadFile(ttsResult.output, outputPath);

    onProgress?.({
      stage: 'processing',
      progress: 90,
      message: 'Processing audio file...'
    });

    // Get file stats
    const stats = fs.statSync(outputPath);
    const webPath = outputPath.replace(path.join(process.cwd(), 'public'), '');

    // Get audio duration
    const duration = await getAudioDuration(outputPath).catch(() => 0);

    return {
      audioPath: outputPath,
      webPath,
      duration,
      fileSize: stats.size,
      success: true
    };

  } catch (error) {
    throw new Error(`Creatify TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Download a file from URL to local path
 */
async function downloadFile(url: string, outputPath: string): Promise<void> {
  const https = require('https');
  const http = require('http');

  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;

    const request = client.get(url, (response: any) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(outputPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', reject);
    });

    request.on('error', reject);
  });
}

/**
 * Create Python script for Chatterbox TTS generation
 */
function createPythonScript(text: string, outputPath: string, options: Required<Omit<TTSOptions, 'force' | 'voiceCloneFile'>>): string {
  // Escape text for Python string
  const escapedText = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  
  return `#!/usr/bin/env python3
"""
Temporary TTS generation script using Chatterbox TTS
Generated automatically - do not edit manually
"""

import sys
import os
import torchaudio as ta
from chatterbox.tts import ChatterboxTTS

def main():
    try:
        print("Loading Chatterbox TTS model...")
        
        # Initialize model
        model = ChatterboxTTS.from_pretrained(device="cuda" if ta.cuda.is_available() else "cpu")
        
        print("Progress: 10%")
        
        # Text to generate
        text = "${escapedText}"
        
        print("Progress: 20%")
        print("Generating audio...")
        
        # Generate audio with specified options
        wav = model.generate(
            text,
            exaggeration=${options.exaggeration},
            cfg_weight=${options.cfg_weight}
        );
        
        print("Progress: 80%")
        print("Saving audio file...")
        
        # Save audio file
        output_path = "${outputPath.replace(/\\/g, '\\\\')}"
        ta.save(output_path, wav, model.sr)
        
        print("Progress: 100%")
        print(f"Audio saved to: {output_path}");
        
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr);
        sys.exit(1);

if __name__ == "__main__":
    main();
`;
}

/**
 * Get audio duration in seconds
 */
async function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    // Use ffprobe to get audio duration
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      audioPath
    ]);

    let output = '';
    
    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Failed to get audio duration'));
        return;
      }

      const duration = parseFloat(output.trim());
      if (isNaN(duration)) {
        reject(new Error('Invalid duration value'));
        return;
      }

      resolve(duration);
    });

    ffprobe.on('error', (error) => {
      reject(new Error(`ffprobe error: ${error.message}`));
    });
  });
}

/**
 * Utility function to generate TTS for a blog post slug
 */
export async function generateTTSForBlogPost(
  slug: string,
  options: TTSOptions = {},
  onProgress?: (progress: TTSProgress) => void
): Promise<TTSResult> {
  const outputPath = path.join(TTS_CONFIG.audioDir, `${slug}.mp3`);
  
  // This would typically get the sanitized text from the blog post
  // For now, we'll need to integrate with the text sanitizer
  throw new Error('generateTTSForBlogPost not yet implemented - use generateTTS directly');
}

/**
 * Check if TTS is available and properly configured
 */
export async function checkTTSAvailability(): Promise<{
  available: boolean;
  error?: string;
  pythonPath?: string;
  chatterboxInstalled?: boolean;
  chatterboxDockerAvailable?: boolean;
  creatifyConfigured?: boolean;
  providers: {
    chatterbox: { available: boolean; error?: string };
    'chatterbox-docker': { available: boolean; error?: string };
    creatify: { available: boolean; error?: string };
  };
}> {
  try {
    // Check Chatterbox availability
    const chatterboxAvailability = await checkChatterboxAvailability();
    
    // Check Chatterbox Docker availability
    const chatterboxDockerAvailability = await checkChatterboxDockerAvailability();

    // Check Creatify availability
    const creatifyAvailable = !!(TTS_CONFIG.creatifyApiId && TTS_CONFIG.creatifyApiKey);
    const creatifyError = creatifyAvailable ? undefined : 'Creatify API credentials not configured';

    const anyProviderAvailable = chatterboxAvailability.available || chatterboxDockerAvailability.available || creatifyAvailable;

    return {
      available: anyProviderAvailable,
      error: anyProviderAvailable ? undefined : 'No TTS providers available',
      pythonPath: TTS_CONFIG.pythonPath,
      chatterboxInstalled: chatterboxAvailability.available,
      chatterboxDockerAvailable: chatterboxDockerAvailability.available,
      creatifyConfigured: creatifyAvailable,
      providers: {
        chatterbox: chatterboxAvailability,
        'chatterbox-docker': chatterboxDockerAvailability,
        creatify: { available: creatifyAvailable, error: creatifyError }
      }
    };

  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      pythonPath: TTS_CONFIG.pythonPath,
      chatterboxInstalled: false,
      chatterboxDockerAvailable: false,
      creatifyConfigured: false,
      providers: {
        chatterbox: { available: false, error: 'Check failed' },
        'chatterbox-docker': { available: false, error: 'Check failed' },
        creatify: { available: false, error: 'Check failed' }
      }
    };
  }
}
