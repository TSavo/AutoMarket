"use strict";
/**
 * Video Class
 *
 * Represents video data with format and metadata information.
 * Serves as both DTO and rich interface for video assets.
 * Implements VideoRole to be compatible with model interfaces.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Video = void 0;
class Video {
    constructor(data, format, metadata, sourceAsset) {
        this.data = data;
        this.format = format;
        this.metadata = metadata;
        this.sourceAsset = sourceAsset;
    }
    isValid() {
        return this.data && this.data.length > 0;
    }
    toString() {
        return `Video(${this.format}, ${this.data.length} bytes)`;
    }
    // VideoRole interface implementation
    async asVideo() {
        return this;
    }
    getVideoMetadata() {
        return this.metadata;
    }
    canPlayVideoRole() {
        return this.isValid();
    }
    // Rich interface methods for compatibility
    getDuration() {
        return this.metadata.duration;
    }
    getDimensions() {
        if (this.metadata.width && this.metadata.height) {
            return { width: this.metadata.width, height: this.metadata.height };
        }
        return undefined;
    }
    getWidth() {
        return this.metadata.width;
    }
    getHeight() {
        return this.metadata.height;
    }
    getSize() {
        return this.data.length;
    }
    getFileSize() {
        return this.metadata.fileSize || this.data.length;
    }
    getHumanSize() {
        const bytes = this.data.length;
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024)
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    getHumanDuration() {
        const duration = this.getDuration();
        if (!duration)
            return 'unknown';
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        const seconds = Math.floor(duration % 60);
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    getFrameRate() {
        return this.metadata.frameRate;
    }
    hasAudio() {
        return this.metadata.hasAudio || false;
    }
    // Static factory methods for compatibility
    static fromFile(filePath) {
        // This would need actual implementation to read file
        throw new Error('Video.fromFile not implemented - use SmartAssetFactory instead');
    }
}
exports.Video = Video;
