/**
 * AudioProcessing.ts
 * 
 * Provides audio processing functionality for FFMPEG video composition
 */

/**
 * Audio effect types
 */
export enum AudioEffectType {
  FADE_IN = 'fade_in',
  FADE_OUT = 'fade_out',
  VOLUME = 'volume',
  EQUALIZER = 'equalizer',
  COMPRESSOR = 'compressor',
  REVERB = 'reverb',
  ECHO = 'echo',
  HIGHPASS = 'highpass',
  LOWPASS = 'lowpass',
  NORMALIZE = 'normalize',
  PITCH = 'pitch',
  TEMPO = 'tempo',
  BASS_BOOST = 'bass_boost',
  TREBLE_BOOST = 'treble_boost'
}

/**
 * Audio effect options
 */
export interface AudioEffectOptions {
  type: AudioEffectType;
  startTime?: number;
  duration?: number;
  // Effect-specific parameters
  fadeInDuration?: number;
  fadeOutDuration?: number;
  volume?: number; // 0.0 to 1.0
  gain?: number; // dB
  frequency?: number; // Hz
  width?: number; // Q factor
  delay?: number; // ms
  decay?: number; // 0.0 to 1.0
  feedback?: number; // 0.0 to 1.0
  wetLevel?: number; // 0.0 to 1.0
  dryLevel?: number; // 0.0 to 1.0
  cutoff?: number; // Hz
  resonance?: number; // 0.0 to 30.0
  ratio?: number; // Compression ratio
  threshold?: number; // dB
  attack?: number; // ms
  release?: number; // ms
  pitchShift?: number; // semitones
  tempoChange?: number; // percentage (e.g., 0.8 = 80% speed)
  bassGain?: number; // dB
  trebleGain?: number; // dB
}

/**
 * Audio track options
 */
export interface AudioTrackOptions {
  path: string;
  startTime?: number;
  duration?: number;
  volume?: number; // 0.0 to 1.0
  loop?: boolean;
  effects?: AudioEffectOptions[];
  mute?: boolean;
  trim?: { start: number; duration: number };
  speed?: number; // 0.5 to 2.0
}

/**
 * Create a volume filter
 * @param volume Volume level (0.0 to 1.0)
 * @returns FFMPEG filter string
 */
export function createVolumeFilter(volume: number): string {
  // Convert 0.0-1.0 scale to dB (0.0 = -inf dB, 1.0 = 0dB)
  if (volume <= 0) {
    return 'volume=0';
  }
  
  // Linear to dB conversion (approximate)
  const dB = 20 * Math.log10(volume);
  return `volume=${dB}dB`;
}

/**
 * Create a fade filter
 * @param type 'in' or 'out'
 * @param duration Duration in seconds
 * @param startTime Start time in seconds (for fade out)
 * @returns FFMPEG filter string
 */
export function createAudioFadeFilter(
  type: 'in' | 'out',
  duration: number,
  startTime?: number
): string {
  if (type === 'in') {
    return `afade=t=in:st=0:d=${duration}`;
  } else {
    return `afade=t=out:st=${startTime || 0}:d=${duration}`;
  }
}

/**
 * Create an equalizer filter
 * @param frequency Center frequency in Hz
 * @param gain Gain in dB
 * @param width Q factor
 * @returns FFMPEG filter string
 */
export function createEqualizerFilter(
  frequency: number,
  gain: number,
  width: number = 1.0
): string {
  return `equalizer=f=${frequency}:width_type=q:width=${width}:g=${gain}`;
}

/**
 * Create a compressor filter
 * @param threshold Threshold in dB
 * @param ratio Compression ratio
 * @param attack Attack time in ms
 * @param release Release time in ms
 * @returns FFMPEG filter string
 */
export function createCompressorFilter(
  threshold: number = -20,
  ratio: number = 4,
  attack: number = 20,
  release: number = 100
): string {
  return `acompressor=threshold=${threshold}dB:ratio=${ratio}:attack=${attack}:release=${release}`;
}

/**
 * Create a reverb filter
 * @param delay Delay in ms
 * @param decay Decay factor (0.0 to 1.0)
 * @returns FFMPEG filter string
 */
export function createReverbFilter(
  delay: number = 10,
  decay: number = 0.5
): string {
  return `aecho=0.8:0.9:${delay}:${decay}`;
}

/**
 * Create an echo filter
 * @param delay Delay in ms
 * @param decay Decay factor (0.0 to 1.0)
 * @returns FFMPEG filter string
 */
export function createEchoFilter(
  delay: number = 1000,
  decay: number = 0.5
): string {
  return `aecho=0.8:0.9:${delay}:${decay}`;
}

/**
 * Create a highpass filter
 * @param frequency Cutoff frequency in Hz
 * @returns FFMPEG filter string
 */
export function createHighpassFilter(frequency: number = 200): string {
  return `highpass=f=${frequency}`;
}

/**
 * Create a lowpass filter
 * @param frequency Cutoff frequency in Hz
 * @returns FFMPEG filter string
 */
export function createLowpassFilter(frequency: number = 1000): string {
  return `lowpass=f=${frequency}`;
}

/**
 * Create a normalize filter
 * @returns FFMPEG filter string
 */
export function createNormalizeFilter(): string {
  return 'loudnorm';
}

/**
 * Create a pitch shift filter
 * @param semitones Number of semitones to shift (-12 to 12)
 * @returns FFMPEG filter string
 */
export function createPitchShiftFilter(semitones: number): string {
  return `rubberband=pitch=${semitones}`;
}

/**
 * Create a tempo change filter
 * @param tempo Tempo factor (0.5 to 2.0)
 * @returns FFMPEG filter string
 */
export function createTempoFilter(tempo: number): string {
  return `atempo=${tempo}`;
}

/**
 * Create a bass boost filter
 * @param gain Gain in dB
 * @returns FFMPEG filter string
 */
export function createBassBoostFilter(gain: number = 10): string {
  return `equalizer=f=100:width_type=h:width=200:g=${gain}`;
}

/**
 * Create a treble boost filter
 * @param gain Gain in dB
 * @returns FFMPEG filter string
 */
export function createTrebleBoostFilter(gain: number = 10): string {
  return `equalizer=f=10000:width_type=h:width=5000:g=${gain}`;
}

/**
 * Create an audio effect filter based on options
 * @param options Audio effect options
 * @param clipDuration Total duration of the clip
 * @returns FFMPEG filter string
 */
export function createAudioEffectFilter(
  options: AudioEffectOptions,
  clipDuration: number
): string {
  const { type } = options;
  
  switch (type) {
    case AudioEffectType.FADE_IN:
      return createAudioFadeFilter('in', options.fadeInDuration || 1.0);
    
    case AudioEffectType.FADE_OUT:
      const fadeOutStart = clipDuration - (options.fadeOutDuration || 1.0);
      return createAudioFadeFilter('out', options.fadeOutDuration || 1.0, fadeOutStart);
    
    case AudioEffectType.VOLUME:
      return createVolumeFilter(options.volume || 1.0);
    
    case AudioEffectType.EQUALIZER:
      return createEqualizerFilter(
        options.frequency || 1000,
        options.gain || 0,
        options.width || 1.0
      );
    
    case AudioEffectType.COMPRESSOR:
      return createCompressorFilter(
        options.threshold || -20,
        options.ratio || 4,
        options.attack || 20,
        options.release || 100
      );
    
    case AudioEffectType.REVERB:
      return createReverbFilter(options.delay || 10, options.decay || 0.5);
    
    case AudioEffectType.ECHO:
      return createEchoFilter(options.delay || 1000, options.decay || 0.5);
    
    case AudioEffectType.HIGHPASS:
      return createHighpassFilter(options.cutoff || 200);
    
    case AudioEffectType.LOWPASS:
      return createLowpassFilter(options.cutoff || 1000);
    
    case AudioEffectType.NORMALIZE:
      return createNormalizeFilter();
    
    case AudioEffectType.PITCH:
      return createPitchShiftFilter(options.pitchShift || 0);
    
    case AudioEffectType.TEMPO:
      return createTempoFilter(options.tempoChange || 1.0);
    
    case AudioEffectType.BASS_BOOST:
      return createBassBoostFilter(options.bassGain || 10);
    
    case AudioEffectType.TREBLE_BOOST:
      return createTrebleBoostFilter(options.trebleGain || 10);
    
    default:
      return '';
  }
}

/**
 * Create a complete audio processing filter chain for a track
 * @param options Audio track options
 * @returns FFMPEG filter string
 */
export function createAudioProcessingChain(options: AudioTrackOptions): string {
  const {
    duration = 0,
    volume = 1.0,
    effects = [],
    mute = false,
    trim,
    speed
  } = options;
  
  // If muted, return a silent audio stream
  if (mute) {
    return 'anullsrc=r=44100:cl=stereo';
  }
  
  const filters: string[] = [];
  
  // Apply trim if specified
  if (trim) {
    filters.push(`atrim=start=${trim.start}:duration=${trim.duration}`);
    filters.push('asetpts=PTS-STARTPTS');
  }
  
  // Apply speed change if specified
  if (speed && speed !== 1.0) {
    // For extreme speed changes, chain multiple atempo filters
    // (atempo only supports 0.5 to 2.0 range)
    if (speed < 0.5) {
      // For speeds below 0.5, chain multiple 0.5 filters
      const iterations = Math.ceil(Math.log(speed) / Math.log(0.5));
      for (let i = 0; i < iterations; i++) {
        filters.push('atempo=0.5');
      }
      // Apply final adjustment if needed
      const finalFactor = speed / Math.pow(0.5, iterations);
      if (finalFactor > 0.5) {
        filters.push(`atempo=${finalFactor}`);
      }
    } else if (speed > 2.0) {
      // For speeds above 2.0, chain multiple 2.0 filters
      const iterations = Math.ceil(Math.log(speed) / Math.log(2.0));
      for (let i = 0; i < iterations; i++) {
        filters.push('atempo=2.0');
      }
      // Apply final adjustment if needed
      const finalFactor = speed / Math.pow(2.0, iterations);
      if (finalFactor < 2.0) {
        filters.push(`atempo=${finalFactor}`);
      }
    } else {
      // For speeds within the supported range
      filters.push(`atempo=${speed}`);
    }
  }
  
  // Apply volume adjustment if not default
  if (volume !== 1.0) {
    filters.push(createVolumeFilter(volume));
  }
  
  // Apply all effects
  for (const effect of effects) {
    filters.push(createAudioEffectFilter(effect, duration));
  }
  
  return filters.join(',');
}
