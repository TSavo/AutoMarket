"use strict";
/**
 * Audio Class
 *
 * Represents audio data with validation and utility methods.
 * Serves as both DTO and rich interface for audio assets.
 * Implements AudioRole to be compatible with model interfaces.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Audio = void 0;
class Audio {
    constructor(data, sourceAsset, metadata) {
        this.data = data;
        this.sourceAsset = sourceAsset;
        this.metadata = metadata;
    }
    isValid() {
        return this.data && this.data.length > 0;
    }
    toString() {
        return `Audio(${this.data.length} bytes)`;
    }
    // AudioRole interface implementation
    async asAudio() {
        return this;
    }
    getAudioMetadata() {
        return this.metadata || {
            format: this.getFormat(),
            duration: this.getDuration(),
            sampleRate: 44100,
            channels: 2
        };
    }
    canPlayAudioRole() {
        return this.isValid();
    }
    // Rich interface methods for compatibility
    getFormat() {
        // Try to get format from source asset metadata
        if (this.sourceAsset?.metadata?.format) {
            return this.sourceAsset.metadata.format;
        }
        // Default fallback
        return 'mp3';
    }
    getDuration() {
        // Try to get duration from source asset metadata  
        return this.sourceAsset?.metadata?.duration;
    }
    getSize() {
        return this.data.length;
    }
    getHumanSize() {
        const bytes = this.data.length;
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    getHumanDuration() {
        const duration = this.getDuration();
        if (!duration)
            return 'unknown';
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    // Property compatibility
    get format() {
        return this.getFormat();
    }
}
exports.Audio = Audio;
