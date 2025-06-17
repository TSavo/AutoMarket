/**
 * FFMPEGAudioDiscovery
 *
 * Audio metadata discovery implementation using FFMPEG (ffprobe).
 * This class extracts metadata from audio files using the ffprobe command-line tool.
 */

import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { MediaType } from '../types';
import { AudioAsset, AudioFormat } from '../audio';
import { AudioAssetClass } from '../audio/AudioAssetClass';
import { MediaIngestOptions, MediaIngestResult, AudioMediaDiscovery } from './types';
import { BaseMediaDiscovery } from './BaseMediaDiscovery';
// Potentially import music-metadata for richer tag extraction if ffprobe is insufficient
// import * as mm from 'music-metadata';

const execAsync = promisify(exec);

export class FFMPEGAudioDiscovery extends BaseMediaDiscovery<AudioAsset> implements AudioMediaDiscovery {
  private ffprobeCache: Map<string, any> = new Map();

  constructor() {
    super();
  }

  public getId(): string {
    return 'ffmpeg-audio-discovery';
  }

  public getName(): string {
    return 'FFMPEG Audio Discovery';
  }

  public getSupportedMediaType(): MediaType {
    return MediaType.AUDIO;
  }

  public getPriority(): number {
    return 100; // High priority for a reliable method
  }

  public getSupportedFormats(): AudioFormat[] {
    return Object.values(AudioFormat);
  }

  public async canHandle(filePath: string): Promise<boolean> {
    const ext = path.extname(filePath).toLowerCase();
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.aac', '.m4a', '.flac', '.opus'];
    if (audioExtensions.includes(ext)) {
      try {
        await this.getFFProbeInfo(filePath); // Verify it's a valid audio file
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  public async discoverMetadata(filePath: string, options: MediaIngestOptions): Promise<MediaIngestResult<AudioAsset>> {
    try {
      const baseAsset = this.createBaseAsset(filePath, options);
      const ffprobeInfo = await this.getFFProbeInfo(filePath);

      const audioStream = ffprobeInfo.streams.find((s: any) => s.codec_type === 'audio');
      if (!audioStream) {
        return this.createErrorResult('No audio stream found in the file.');
      }

      const format = this.mapFormat(audioStream.codec_name, filePath);
      const duration = parseFloat(audioStream.duration || ffprobeInfo.format.duration || 0);
      const bitrate = parseInt(audioStream.bit_rate || ffprobeInfo.format.bit_rate || 0);
      const channels = parseInt(audioStream.channels || 0);
      const sampleRate = parseInt(audioStream.sample_rate || 0);

      // Mood inference
      let mood: string | undefined = (options as any).defaultMood; // Type assertion for now
      if (!mood && ffprobeInfo.format.tags) {
        const tags = ffprobeInfo.format.tags;
        mood = tags.genre || tags.comment || tags.mood; // Prioritize genre, then comment, then specific mood tag
        if (tags.title && !mood) { // If no mood yet, try to infer from title
            mood = this.inferMoodFromText(tags.title);
        }
      }
      if (!mood) {
        mood = this.inferMoodFromText(baseAsset.title);
      }
      
      // Transcript (basic check for now)
      const transcriptInfo = await this.hasTranscript(filePath);

      const audioAssetData: AudioAsset = {
        ...baseAsset,
        type: MediaType.AUDIO,
        format,
        duration,
        bitrate: Math.round(bitrate / 1000), // Convert to kbps
        channels,
        sampleRate,
        hasTranscript: transcriptInfo.hasTranscript,
        transcriptPath: transcriptInfo.transcriptPath,
        mood: mood?.toLowerCase(),
      };

      const audioAsset = new AudioAssetClass(audioAssetData);
      audioAsset.addTag('audio');
      if (mood) {
        audioAsset.addTag(`mood:${mood.toLowerCase().replace(/\s+/g, '-')}`);
      }

      return this.createSuccessResult(audioAsset);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error discovering audio metadata for ${filePath}:`, errorMessage);
      return this.createErrorResult(`Error discovering audio metadata: ${errorMessage}`);
    }
  }

  private inferMoodFromText(text: string): string | undefined {
    if (!text) return undefined;
    const lowerText = text.toLowerCase();
    // Simple keyword-based inference, can be expanded
    if (lowerText.includes('upbeat') || lowerText.includes('happy')) return 'happy';
    if (lowerText.includes('sad') || lowerText.includes('emotional')) return 'sad';
    if (lowerText.includes('epic') || lowerText.includes('dramatic')) return 'epic';
    if (lowerText.includes('calm') || lowerText.includes('relaxing')) return 'calm';
    if (lowerText.includes('energetic') || lowerText.includes('driving')) return 'energetic';
    return undefined;
  }

  private mapFormat(codecName: string, filePath: string): AudioFormat {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.mp3') return AudioFormat.MP3;
    if (ext === '.wav') return AudioFormat.WAV;
    if (ext === '.ogg') return AudioFormat.OGG;
    // Fallback based on codec name if extension is not specific enough or missing
    if (codecName) {
        const lowerCodec = codecName.toLowerCase();
        if (lowerCodec.includes('mp3')) return AudioFormat.MP3;
        if (lowerCodec.includes('pcm')) return AudioFormat.WAV; // WAV often uses PCM
        if (lowerCodec.includes('vorbis')) return AudioFormat.OGG; // OGG uses Vorbis
    }
    // Default or throw error if format cannot be determined
    console.warn(`Could not reliably determine audio format for ${filePath} with codec ${codecName}. Defaulting to MP3 based on commonality.`);
    return AudioFormat.MP3; 
  }

  public async getAudioFormat(filePath: string): Promise<AudioFormat> {
    const info = await this.getFFProbeInfo(filePath);
    const audioStream = info.streams.find((s: any) => s.codec_type === 'audio');
    if (!audioStream || !audioStream.codec_name) throw new Error('No audio stream or codec name found');
    return this.mapFormat(audioStream.codec_name, filePath);
  }

  public async getAudioDuration(filePath: string): Promise<number> {
    const info = await this.getFFProbeInfo(filePath);
    const stream = info.streams.find((s: any) => s.codec_type === 'audio');
    return parseFloat(stream?.duration || info.format?.duration || 0);
  }

  public async getAudioBitrate(filePath: string): Promise<number> { // in kbps
    const info = await this.getFFProbeInfo(filePath);
    const stream = info.streams.find((s: any) => s.codec_type === 'audio');
    const bitrateBps = parseInt(stream?.bit_rate || info.format?.bit_rate || 0);
    return Math.round(bitrateBps / 1000);
  }

  public async getAudioChannels(filePath: string): Promise<number> {
    const info = await this.getFFProbeInfo(filePath);
    const stream = info.streams.find((s: any) => s.codec_type === 'audio');
    return parseInt(stream?.channels || 0);
  }

  public async getAudioSampleRate(filePath: string): Promise<number> {
    const info = await this.getFFProbeInfo(filePath);
    const stream = info.streams.find((s: any) => s.codec_type === 'audio');
    return parseInt(stream?.sample_rate || 0);
  }

  public async hasTranscript(filePath: string): Promise<{ hasTranscript: boolean; transcriptPath?: string }> {
    const baseFilePath = filePath.substring(0, filePath.lastIndexOf('.'));
    const transcriptExtensions = ['.txt', '.vtt', '.srt']; // Common transcript/caption formats
    for (const ext of transcriptExtensions) {
      const transcriptPath = baseFilePath + ext;
      if (require('fs').existsSync(transcriptPath)) {
        return { hasTranscript: true, transcriptPath: this.getRelativePath(transcriptPath) };
      }
    }
    return { hasTranscript: false };
  }

  public async generateWaveform(filePath: string): Promise<{ success: boolean; waveformImagePath?: string }> {
    // Placeholder: Waveform generation would typically use ffmpeg's showwavespic filter
    // or a library like audiowaveform. For now, this is a basic placeholder.
    console.warn(`Waveform generation for ${filePath} is not fully implemented yet.`);
    const waveformPath = filePath.substring(0, filePath.lastIndexOf('.')) + '_waveform.png';
    // const command = `ffmpeg -i "${filePath}" -filter_complex "showwavespic=s=640x120" -frames:v 1 "${waveformPath}"`;
    // try {
    //   await execAsync(command);
    //   return { success: true, waveformImagePath: this.getRelativePath(waveformPath) };
    // } catch (error) {
    //   console.error('Error generating waveform:', error);
    //   return { success: false };
    // }
    return { success: false, waveformImagePath: undefined }; // Default to not successful
  }

  private async getFFProbeInfo(filePath: string): Promise<any> {
    if (this.ffprobeCache.has(filePath)) {
      return this.ffprobeCache.get(filePath);
    }
    const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`);
    const info = JSON.parse(stdout);
    this.ffprobeCache.set(filePath, info);
    return info;
  }
}
