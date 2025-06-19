/**
 * CommandBuilder.ts
 *
 * Builds FFMPEG commands for video composition
 */

import { Clip, ClipType } from '../models/Clip';
import { Composition, CompositionOutputSettings } from '../models/Composition';
import { VideoAsset, isVideoAsset } from '../../video';
import { isImageAsset } from '../../image';
import {
  createScalePadFilter,
  createOverlayFilter,
  createFadeFilter,
  createFrameRateFilter,
  createSetptsFilter,
  createAlphaColorChannelMixerFilter,
  createTrimFilter
} from './Filters';
import { TransitionType, createTransitionFilter, createRandomTransitionFilter } from './AdvancedTransitions';
import { TextOverlayOptions, createTextOverlayFilter } from './TextOverlays';
import { AudioTrackOptions, createAudioProcessingChain } from './AudioProcessing';
import { ProgressTracker, ProgressInfo } from './ProgressTracker';

/**
 * Builds an FFMPEG command for video composition
 */
/**
 * Options for the FFMPEG command builder
 */
export interface CommandBuilderOptions {
  useAdvancedTransitions?: boolean;
  transitionType?: TransitionType;
  textOverlays?: TextOverlayOptions[];
  audioTracks?: AudioTrackOptions[];
  enableProgressTracking?: boolean;
  progressCallback?: (progress: ProgressInfo) => void;
  useHardwareAcceleration?: boolean;
  hardwareAccelerationType?: 'nvidia' | 'intel' | 'amd' | 'auto';
  timeoutSeconds?: number;
}

export class FFMPEGCommandBuilder {
  private composition: Composition;
  private inputCount: number = 0;
  private filterComplex: string[] = [];
  private inputs: string[] = [];
  private outputLabels: string[] = [];
  private options: CommandBuilderOptions;
  private progressTracker: ProgressTracker | null = null;

  /**
   * Create a new FFMPEGCommandBuilder
   * @param composition The composition to build a command for
   * @param options Command builder options
   */
  constructor(composition: Composition, options: CommandBuilderOptions = {}) {
    this.composition = composition;
    this.options = options;

    // Initialize progress tracker if enabled
    if (options.enableProgressTracking) {
      this.progressTracker = new ProgressTracker({
        totalDuration: this.calculateTotalDuration(),
        logLevel: 'info'
      });

      // Set up progress callback if provided
      if (options.progressCallback) {
        this.progressTracker.on('progress', options.progressCallback);
      }
    }
  }

  /**
   * Add an input file to the command
   * @param filePath Path to the input file
   * @returns Label for the input stream
   */
  private addInput(filePath: string): string {
    const inputIndex = this.inputCount++;
    this.inputs.push(`-i "${filePath}"`);
    return `[${inputIndex}:v]`;
  }

  /**
   * Add a filter to the complex filter chain
   * @param inputLabel Input stream label
   * @param filter Filter string
   * @param outputLabel Optional output label, generated if not provided
   * @returns Output stream label
   */
  private addFilter(inputLabel: string, filter: string, outputLabel?: string): string {
    const outLabel = outputLabel || `v${this.filterComplex.length}`;
    this.filterComplex.push(`${inputLabel}${filter}[${outLabel}]`);
    return `[${outLabel}]`;
  }

  /**
   * Process a content clip
   * @param clip The content clip to process
   * @returns Output stream label
   */  private processContentClip(clip: Clip): string {
    const { asset } = clip;

    if (!isVideoAsset(asset) && !isImageAsset(asset)) {
      console.warn(`Content clip has an invalid asset type. Skipping.`);
      return '';
    }

    const { fadeIn, fadeOut } = clip;
    let streamLabel: string;

    if (isImageAsset(asset)) {
      // Process image asset as content (add a still image for the duration)
      const imageInputIndex = this.inputCount;
      this.inputs.push(`-loop 1 -i "${asset.path}"`);
      streamLabel = `[${imageInputIndex}:v]`;
      streamLabel = this.addFilter(streamLabel, createTrimFilter(clip.duration));
      streamLabel = this.addFilter(streamLabel, createSetptsFilter());

      // Images have no audio, so mark as muted
      (clip as any)._ffmpegMute = true;
    } else {
      // Process video asset
      const videoAsset = asset as VideoAsset;
      streamLabel = this.addInput(videoAsset.path);

      // If mute is true, mark this input as muted for audio mapping
      if (clip.mute) {
        (clip as any)._ffmpegMute = true;
      }
    }

    // Common processing for both video and image assets
    if (clip.resizeToFit) {
      streamLabel = this.addFilter(
        streamLabel,
        createScalePadFilter(
          asset.width,
          asset.height,
          this.composition.outputSettings.width,
          this.composition.outputSettings.height
        )
      );
    }

    streamLabel = this.addFilter(
      streamLabel,
      createFrameRateFilter(this.composition.outputSettings.frameRate)
    );
    streamLabel = this.addFilter(streamLabel, createSetptsFilter());

    if (fadeIn && fadeIn > 0) {
      streamLabel = this.addFilter(streamLabel, createFadeFilter('in', 0, fadeIn));
    }

    if (fadeOut && fadeOut > 0) {
      streamLabel = this.addFilter(
        streamLabel,
        createFadeFilter('out', Math.max(0, clip.duration - fadeOut), fadeOut) // Ensure start time is not negative
      );
    }

    // --- Per-clip audio support ---
    if ((clip as any).audioPath) {
      // Add audio input
      const audioInputIndex = this.inputCount++;
      this.inputs.push(`-i "${(clip as any).audioPath}"`);
      // Trim audio to clip duration
      // Use atrim to ensure audio does not exceed clip duration
      const audioFilterLabel = `[${audioInputIndex}:a]`;
      const trimmedAudioLabel = `a${audioInputIndex}_trimmed`;
      this.filterComplex.push(`${audioFilterLabel}atrim=duration=${clip.duration},asetpts=PTS-STARTPTS[${trimmedAudioLabel}]`);
      // Mix audio with video for this segment
      // The actual mapping will be handled in processAudioTracks or buildCommand
      // Store the trimmed audio label for later mapping
      (clip as any)._ffmpegAudioLabel = trimmedAudioLabel;
    }

    return streamLabel;
  }

  private processOverlayClip(clip: Clip): string {
    const { asset } = clip;
    let overlayStreamLabel: string;
    let overlayAudioInputIndex: number | undefined = undefined;

    if (isImageAsset(asset)) {
      const imageInputIndex = this.inputCount;
      this.inputs.push(`-loop 1 -i "${asset.path}"`);
      overlayStreamLabel = `[${imageInputIndex}:v]`;
      overlayStreamLabel = this.addFilter(overlayStreamLabel, createTrimFilter(clip.duration));
      overlayStreamLabel = this.addFilter(overlayStreamLabel, createSetptsFilter());
    } else if (isVideoAsset(asset)) {
      overlayStreamLabel = this.addInput(asset.path);
      overlayAudioInputIndex = this.inputCount - 1; // The just-added input index
      if (clip.duration < asset.duration) {
        overlayStreamLabel = this.addFilter(overlayStreamLabel, createTrimFilter(clip.duration));
        overlayStreamLabel = this.addFilter(overlayStreamLabel, createSetptsFilter());
      }
    } else {
      // This case should ideally not be reached if VideoComposer validates assets
      // If asset is 'never', it means it didn't match isImageAsset or isVideoAsset.
      // We can log the clip.id or a generic message if asset properties are unsafe to access.
      console.warn(`Overlay clip (ID: ${clip.id || 'unknown'}) has an invalid asset type. Skipping.`);
      return '';
    }

    // --- Overlay audio muting logic ---
    if (overlayAudioInputIndex !== undefined) {
      if (clip.mute) {
        // Mark this overlay's audio as muted for processAudioTracks
        (clip as any)._ffmpegMute = true;
      } else {
        // Mark this overlay's audio input index for processAudioTracks
        (clip as any)._ffmpegOverlayAudioInputIndex = overlayAudioInputIndex;
        (clip as any)._ffmpegOverlayAudioDuration = clip.duration;
      }
    }

    if (clip.scale && clip.scale !== 1.0) {
      const scaledWidth = Math.round(asset.width * clip.scale);
      const scaledHeight = Math.round(asset.height * clip.scale);
      // Preserve alpha channel during scaling by explicitly setting flags for proper alpha handling
      overlayStreamLabel = this.addFilter(overlayStreamLabel, `scale=${scaledWidth}:${scaledHeight}:flags=+accurate_rnd+full_chroma_inp`);
    }

    overlayStreamLabel = this.addFilter(
      overlayStreamLabel,
      createFrameRateFilter(this.composition.outputSettings.frameRate)
    );

    if (clip.opacity !== undefined && clip.opacity < 1.0) {
      overlayStreamLabel = this.addFilter(overlayStreamLabel, createAlphaColorChannelMixerFilter(clip.opacity));
    }

    if (clip.fadeIn && clip.fadeIn > 0) {
      overlayStreamLabel = this.addFilter(overlayStreamLabel, createFadeFilter('in', 0, clip.fadeIn));
    }

    if (clip.fadeOut && clip.fadeOut > 0) {
      overlayStreamLabel = this.addFilter(
        overlayStreamLabel,
        createFadeFilter('out', Math.max(0, clip.duration - clip.fadeOut), clip.fadeOut)
      );
    }
    return overlayStreamLabel;
  }

  // Add a helper to get default output settings if not fully defined
  private getOutputSettings(): Required<CompositionOutputSettings> {
      const defaults = {
          codec: 'libx264',
          bitrate: '2000k',
          audioCodec: 'aac',
          audioBitrate: '128k',
          format: 'mp4',
          defaultDuration: 10, // Default duration if no clips
          // width, height, frameRate must be set by VideoComposer based on content or defaults
      };
      return { ...defaults, ...this.composition.outputSettings } as Required<CompositionOutputSettings>;
  }

  /**
   * Build the FFMPEG command
   * @returns The complete FFMPEG command string
   */
  public buildCommand(): string {
    const outputSettings = this.getOutputSettings();

    const mainSequenceClips = this.composition.clips
      .filter(clip => clip.type === ClipType.INTRO || clip.type === ClipType.CONTENT || clip.type === ClipType.OUTRO)
      .sort((a, b) => a.startTime - b.startTime); // Should be sorted by intended sequence

    const overlayClipsData = this.composition.clips
      .filter(clip => clip.type === ClipType.OVERLAY)
      .sort((a, b) => a.startTime - b.startTime); // Sort overlays by their start time

    // 1. Process all main sequence clips first
    const processedMainClipLabels: string[] = [];
    for (const clip of mainSequenceClips) {
      const processedLabel = this.processContentClip(clip);
      if (processedLabel) {
        processedMainClipLabels.push(processedLabel);
      }
    }

    // 2. Concatenate main sequence clips
    let currentTimelineLabel: string;

    // Use advanced transitions if enabled
    if (this.options.useAdvancedTransitions && processedMainClipLabels.length > 1) {
      currentTimelineLabel = this.processAdvancedTransitions(processedMainClipLabels);
    } else if (processedMainClipLabels.length > 1) {
      // Use standard concatenation
      const concatFilterInput = processedMainClipLabels.join('');
      const numClips = processedMainClipLabels.length;
      // Assuming main clips are video only for now, audio handled separately
      currentTimelineLabel = this.addFilter(concatFilterInput, `concat=n=${numClips}:v=1:a=0[main_timeline]`, 'main_timeline');
    } else if (processedMainClipLabels.length === 1) {
      currentTimelineLabel = processedMainClipLabels[0];
    } else {
      // Create a black canvas if no main clips
      const blackInputIndex = this.inputCount;
      this.inputs.push(`-f lavfi -i color=c=black:s=${outputSettings.width}x${outputSettings.height}:d=${this.calculateTotalDuration()}`);
      currentTimelineLabel = `[${blackInputIndex}:v]`;
      currentTimelineLabel = this.addFilter(currentTimelineLabel, createFrameRateFilter(outputSettings.frameRate));
      currentTimelineLabel = this.addFilter(currentTimelineLabel, createSetptsFilter());
    }

    // 3. Process and Apply Overlays
    // Overlays are applied sequentially to the result of the previous operation.
    for (const overlayClip of overlayClipsData) {
      const preparedOverlayStreamLabel = this.processOverlayClip(overlayClip);
      if (!preparedOverlayStreamLabel || !currentTimelineLabel) continue;

      currentTimelineLabel = this.addFilter(
        `${currentTimelineLabel}${preparedOverlayStreamLabel}`,
        createOverlayFilter(
          overlayClip,
          outputSettings.width,
          outputSettings.height
        )
      );
    }

    // 4. Process and Apply Text Overlays
    currentTimelineLabel = this.processTextOverlays(currentTimelineLabel);

    this.outputLabels.push(currentTimelineLabel.slice(1, -1));

    const outputPath = this.composition.outputPath || `output_${Date.now()}.${outputSettings.format}`;
    const inputSection = this.inputs.join(' ');
    const filterComplexSection = this.filterComplex.length > 0
      ? `-filter_complex "${this.filterComplex.join(';')}"`
      : '';

    // Process audio tracks
    let audioMapping = this.processAudioTracks();

    const outputSectionParts = [
      `-map "[${this.outputLabels[0]}]"`, // Map the final video stream
    ];

    if (audioMapping) {
        outputSectionParts.push(audioMapping);
        outputSectionParts.push(`-c:a ${outputSettings.audioCodec}`);
        outputSectionParts.push(`-b:a ${outputSettings.audioBitrate}`);
    } else {
        outputSectionParts.push("-an"); // No audio
    }

    outputSectionParts.push(
      `-c:v ${outputSettings.codec}`,
      `-b:v ${outputSettings.bitrate}`,
      `-r ${outputSettings.frameRate}`,
      `-pix_fmt yuv420p`,
      `-t ${this.calculateTotalDuration()}`,
      `"${outputPath}"`
    );

    const outputSection = outputSectionParts.join(' ');

    const command = `ffmpeg -y ${inputSection} ${filterComplexSection} ${outputSection}`.trim();

    // Attach progress tracker if enabled
    if (this.progressTracker) {
      this.progressTracker.attachToProcess(command);
    }

    return command;
  }

  private findContentClipInputIndex(): number {
    let ffmpegInputIndex = 0;
    for (const inputStr of this.inputs) {
        if (inputStr.startsWith('-i ') || inputStr.startsWith('-loop 1 -i ')) {
            // Check if this input corresponds to a content clip
            for (const clip of this.composition.clips) {
                if (clip.type === ClipType.CONTENT && isVideoAsset(clip.asset) && inputStr.includes(clip.asset.path)) {
                    return ffmpegInputIndex;
                }
            }
            ffmpegInputIndex++;
        }
    }
    return -1;
  }

  /**
   * Process text overlays
   * @param currentTimelineLabel Current timeline label
   * @returns Updated timeline label
   */
  private processTextOverlays(currentTimelineLabel: string): string {
    if (!this.options.textOverlays || this.options.textOverlays.length === 0) {
      return currentTimelineLabel;
    }

    const outputSettings = this.getOutputSettings();

    for (const textOverlay of this.options.textOverlays) {
      const textFilter = createTextOverlayFilter(
        textOverlay,
        outputSettings.width,
        outputSettings.height
      );

      currentTimelineLabel = this.addFilter(
        currentTimelineLabel,
        textFilter
      );
    }

    return currentTimelineLabel;
  }

  /**
   * Process advanced transitions between clips
   * @param clipLabels Array of clip labels
   * @returns Timeline label with transitions applied
   */
  private processAdvancedTransitions(clipLabels: string[]): string {
    if (!this.options.useAdvancedTransitions || clipLabels.length <= 1) {
      return '';
    }

    const transitionType = this.options.transitionType || TransitionType.FADE;
    let currentLabel = clipLabels[0];

    for (let i = 1; i < clipLabels.length; i++) {
      const nextLabel = clipLabels[i];

      // Create transition filter
      let transitionFilter: string;

      if (transitionType === TransitionType.RANDOM) {
        transitionFilter = createRandomTransitionFilter(
          this.composition.crossfadeDuration || 0.5
        );
      } else {
        transitionFilter = createTransitionFilter({
          type: transitionType,
          duration: this.composition.crossfadeDuration || 0.5
        });
      }

      // Apply transition
      currentLabel = this.addFilter(
        `${currentLabel}${nextLabel}`,
        transitionFilter
      );
    }

    return currentLabel;
  }

  /**
   * Process audio tracks
   * @returns Audio mapping string
   */
  private processAudioTracks(): string {
    // --- Overlay audio support ---
    // Gather overlay audio segments that are not muted
    const overlayClips = this.composition.clips.filter(clip => clip.type === ClipType.OVERLAY);
    const overlayAudioSegments: string[] = [];
    for (const overlayClip of overlayClips) {
      const idx = (overlayClip as any)._ffmpegOverlayAudioInputIndex;
      const dur = (overlayClip as any)._ffmpegOverlayAudioDuration;
      if (typeof idx === 'number' && !overlayClip.mute) {
        // Trim overlay audio to its duration
        const trimmedLabel = `overlay_audio_${idx}`;
        this.filterComplex.push(`[${idx}:a]atrim=duration=${dur},asetpts=PTS-STARTPTS[${trimmedLabel}]`);
        overlayAudioSegments.push(`[${trimmedLabel}]`);
      }
    }

    // --- Per-clip audio mapping ---
    const mainSequenceClips = this.composition.clips
      .filter(clip => clip.type === ClipType.INTRO || clip.type === ClipType.CONTENT || clip.type === ClipType.OUTRO)
      .sort((a, b) => a.startTime - b.startTime);

    // If any main clip has a per-clip audio, map those; otherwise, fallback to global audioTracks or default
    // If any main clip has a per-clip audio, map those; otherwise, fallback to global audioTracks or default
    const perClipAudioLabels = mainSequenceClips.map(clip => (clip as any)._ffmpegAudioLabel).filter(Boolean);
    const muteFlags = mainSequenceClips.map(clip => (clip as any)._ffmpegMute === true);
    if (perClipAudioLabels.length > 0 || overlayAudioSegments.length > 0) {
      // If there are per-clip or overlay audio segments, mix them
      const allSegments = [...perClipAudioLabels.map(l => `[${l}]`), ...overlayAudioSegments];
      let audioMixLabel = 'main_audio_mix';
      if (allSegments.length === 1) {
        this.filterComplex.push(`${allSegments[0]}anull[${audioMixLabel}]`);
      } else if (allSegments.length > 1) {
        this.filterComplex.push(`${allSegments.join('')}amix=inputs=${allSegments.length}:duration=longest[${audioMixLabel}]`);
      }
      return `-map [${audioMixLabel}]`;
    }

    // If no per-clip audio, but some clips are muted, build a timeline with silence for muted clips
    if (muteFlags.some(Boolean)) {
      // For each main clip, if muted, use anullsrc for that duration; else, map the video audio
      const audioSegments: string[] = [];
      let videoInputIdx = 0;
      for (let i = 0; i < mainSequenceClips.length; i++) {
        const clip = mainSequenceClips[i];
        if ((clip as any)._ffmpegMute === true) {
          // Silence for this segment
          const silenceLabel = `mute_silence_${i}`;
          this.filterComplex.push(`anullsrc=r=44100:cl=stereo,duration=${clip.duration}[${silenceLabel}]`);
          audioSegments.push(`[${silenceLabel}]`);
        } else {
          // Map the video audio for this segment
          // Find the corresponding input index for this clip
          audioSegments.push(`[${videoInputIdx}:a]`);
        }
        videoInputIdx++;
      }
      // Concatenate all segments
      let audioConcatLabel = 'main_audio_concat';
      if (audioSegments.length === 1) {
        this.filterComplex.push(`${audioSegments[0]}anull[${audioConcatLabel}]`);
      } else {
        this.filterComplex.push(`${audioSegments.join('')}concat=n=${audioSegments.length}:v=0:a=1[${audioConcatLabel}]`);
      }
      return `-map [${audioConcatLabel}]`;
    }

    // Fallback to global audioTracks logic (unchanged)
    if (this.options.audioTracks && this.options.audioTracks.length > 0) {
      const audioFilters: string[] = [];
      const audioInputIndices: number[] = [];

      // Process each audio track
      for (const track of this.options.audioTracks) {
        // Add the audio input
        const audioInputIndex = this.inputCount++;
        this.inputs.push(`-i "${track.path}"`);
        audioInputIndices.push(audioInputIndex);

        // Create audio processing chain
        const processingChain = createAudioProcessingChain(track);

        if (processingChain) {
          audioFilters.push(`[${audioInputIndex}:a]${processingChain}[a${audioInputIndex}]`);
        }
      }

      // Mix audio tracks if there are multiple
      if (audioInputIndices.length > 1) {
        const mixInputs = audioInputIndices.map(idx =>
          audioFilters.some(f => f.includes(`[a${idx}]`)) ? `[a${idx}]` : `[${idx}:a]`
        ).join('');

        audioFilters.push(`${mixInputs}amix=inputs=${audioInputIndices.length}:duration=longest[aout]`);

        // Add the filter complex for audio
        if (audioFilters.length > 0) {
          this.filterComplex.push(...audioFilters);
        }

        return '-map [aout]';
      } else if (audioInputIndices.length === 1) {
        // Single audio track
        const idx = audioInputIndices[0];

        // Add the filter complex for audio if needed
        if (audioFilters.length > 0) {
          this.filterComplex.push(...audioFilters);
          return '-map [a0]';
        }

        return `-map ${idx}:a`;
      }
    }

    // Fallback to default audio handling
    const contentClipFfmpegInputIndex = this.findContentClipInputIndex();
    if (contentClipFfmpegInputIndex !== -1) {
      return `-map ${contentClipFfmpegInputIndex}:a?`;
    }
    return '-an'; // No audio
  }

  /**
   * Detect available hardware acceleration
   * @returns The detected hardware acceleration type or null if none available
   */
  private async detectHardwareAcceleration(): Promise<'nvidia' | 'intel' | 'amd' | null> {
    // Use child_process to check hardware
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    try {
      // Check for NVIDIA GPUs with NVENC support
      const { stdout: nvidiaOutput } = await execPromise('ffmpeg -hide_banner -hwaccels');
      if (nvidiaOutput.includes('cuda') || nvidiaOutput.includes('nvenc') || nvidiaOutput.includes('nvidia')) {
        console.log('NVIDIA hardware acceleration (NVENC) detected');
        return 'nvidia';
      }

      // Check for Intel QuickSync
      if (nvidiaOutput.includes('qsv') || nvidiaOutput.includes('vaapi')) {
        console.log('Intel hardware acceleration (QuickSync) detected');
        return 'intel';
      }

      // Check for AMD
      if (nvidiaOutput.includes('amf') || nvidiaOutput.includes('vaapi')) {
        console.log('AMD hardware acceleration detected');
        return 'amd';
      }

      console.log('No hardware acceleration detected, using software encoding');
      return null;
    } catch (error) {
      console.warn('Error detecting hardware acceleration:', error);
      return null;
    }
  }

  /**
   * Apply hardware acceleration parameters to command
   * @param command The FFMPEG command to modify
   * @returns The modified command with hardware acceleration
   */
  private applyHardwareAcceleration(command: string, accelType: 'nvidia' | 'intel' | 'amd'): string {
    switch (accelType) {
      case 'nvidia':
        // Replace software encoder with NVIDIA hardware encoder
        return command
          .replace('-c:v libx264', '-c:v h264_nvenc')
          .replace('-c:v h264', '-c:v h264_nvenc')
          .replace('-preset medium', '-preset p4')
          .replace('-preset slow', '-preset p6')
          .replace('-preset fast', '-preset p2');

      case 'intel':
        // Replace software encoder with Intel QuickSync encoder
        return command
          .replace('-c:v libx264', '-c:v h264_qsv')
          .replace('-c:v h264', '-c:v h264_qsv');

      case 'amd':
        // Replace software encoder with AMD encoder
        return command
          .replace('-c:v libx264', '-c:v h264_amf')
          .replace('-c:v h264', '-c:v h264_amf');

      default:
        return command;
    }
  }

  /**
   * Execute the FFMPEG command with progress streaming
   * @param jobId - Job ID for progress tracking
   * @returns Promise that resolves when the command completes
   */
  public async executeCommandWithProgress(jobId: string): Promise<void> {
    const { FFMPEGProgressStreamer } = require('./FFMPEGProgressStreamer');
    const streamer = new FFMPEGProgressStreamer(jobId);
    
    let command = this.buildCommand();
    const timeoutMs = (this.options.timeoutSeconds || 600) * 1000;

    // Apply hardware acceleration if enabled
    if (this.options.useHardwareAcceleration) {
      let accelType: 'nvidia' | 'intel' | 'amd' | null = null;

      if (this.options.hardwareAccelerationType && this.options.hardwareAccelerationType !== 'auto') {
        accelType = this.options.hardwareAccelerationType;
      } else {
        accelType = await this.detectHardwareAcceleration();
      }

      if (accelType) {
        command = this.applyHardwareAcceleration(command, accelType);
        console.log(`Applied ${accelType} hardware acceleration`);
      }
    }

    return streamer.executeWithProgressStream(command, timeoutMs);
  }

  /**
   * Cancel the FFMPEG process if it's running
   */
  public cancelExecution(): void {
    if (this.progressTracker) {
      this.progressTracker.cancel();
    }
  }

  private calculateTotalDuration(): number {
    const outputSettings = this.getOutputSettings();
    const mainClips = this.composition.clips
      .filter(clip => clip.type === ClipType.INTRO || clip.type === ClipType.CONTENT || clip.type === ClipType.OUTRO)
      .sort((a, b) => a.startTime - b.startTime);

    const defaultDurationIfNoClips = 10; // Local default

    if (mainClips.length === 0) return (outputSettings as any).defaultDuration || defaultDurationIfNoClips;

    let totalDuration = 0;
    // This simple sum assumes no overlaps or gaps are desired from the startTime property
    // and that clips are sequential. If crossfades are complex, this needs adjustment.
    for (const clip of mainClips) {
        totalDuration += clip.duration;
    }
    return totalDuration;
    // A more robust way if using explicit startTimes for a timeline:
    // const lastClip = mainClips[mainClips.length - 1];
    // return lastClip.startTime + lastClip.duration;
  }
}
