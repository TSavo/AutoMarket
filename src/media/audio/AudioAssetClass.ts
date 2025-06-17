import { BaseAssetClass } from '../BaseAssetClass';
import { AudioAsset, AudioFormat } from '../audio';
import { MediaType, ContentPurpose, BaseAsset } from '../types';

/**
 * AudioAssetClass
 *
 * Class representing an audio asset with specific properties and methods.
 */
export class AudioAssetClass extends BaseAssetClass implements AudioAsset {
  type: MediaType.AUDIO;
  format: AudioFormat;
  duration: number;
  bitrate: number;
  channels: number;
  sampleRate: number;
  hasTranscript: boolean;
  transcriptPath?: string;
  waveformImagePath?: string;
  mood?: string;

  /**
   * Create a new AudioAssetClass
   * @param asset The audio asset data to initialize with
   */
  constructor(asset: AudioAsset) {
    super(asset);
    this.type = MediaType.AUDIO;
    this.format = asset.format;
    this.duration = asset.duration;
    this.bitrate = asset.bitrate;
    this.channels = asset.channels;
    this.sampleRate = asset.sampleRate;
    this.hasTranscript = asset.hasTranscript;
    this.transcriptPath = asset.transcriptPath;
    this.waveformImagePath = asset.waveformImagePath;
    this.mood = asset.mood;
  }

  /**
   * Convert the AudioAssetClass instance to a plain AudioAsset object.
   * @returns A plain AudioAsset object.
   */
  public override toObject(): AudioAsset {
    return {
      ...super.toObject(),
      type: this.type,
      format: this.format,
      duration: this.duration,
      bitrate: this.bitrate,
      channels: this.channels,
      sampleRate: this.sampleRate,
      hasTranscript: this.hasTranscript,
      transcriptPath: this.transcriptPath,
      waveformImagePath: this.waveformImagePath,
      mood: this.mood,
    } as AudioAsset; // Cast to AudioAsset to ensure all BaseAsset fields are included via super.toObject()
  }
}
