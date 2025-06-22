"use strict";
/**
 * Asset Role Mixins
 *
 * TypeScript mixin functions that add role capabilities to Asset classes.
 * These mixins enable Assets to play different roles (Audio, Video, Text).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withAudioRole = withAudioRole;
exports.withVideoRole = withVideoRole;
exports.withTextRole = withTextRole;
exports.withImageRole = withImageRole;
const roles_1 = require("../roles");
// ============================================================================
// AUDIO ROLE MIXIN
// ============================================================================
/**
 * Mixin that adds AudioRole capabilities to an Asset
 */
function withAudioRole(Base) {
    return class extends Base {
        /**
         * Convert this Asset to Audio data
         * For video assets, extracts audio using FFmpeg
         */
        async asAudio() {
            // Check if this is a video format that needs audio extraction
            if (this.isVideoFormatForAudio()) {
                return await this.extractAudioFromVideo();
            }
            // For audio formats, return as-is
            return new roles_1.Audio(this.data, this);
        }
        /**
         * Extract audio from video using Smart FFMPEG Provider (placeholder)
         */
        async extractAudioFromVideo() {
            console.log('[AudioRole Mixin] Video to audio extraction not implemented yet');
            // Fallback to original data
            return new roles_1.Audio(this.data, this);
        }
        /**
         * Check if this Asset represents a video format (for audio extraction)
         */
        isVideoFormatForAudio() {
            const videoFormats = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
            return videoFormats.includes(this.metadata.format?.toLowerCase() || '');
        }
        /**
         * Check if this Asset can play the Audio role
         */
        canPlayAudioRole() {
            return this.isValid() && this.isAudioFormat();
        }
        /**
         * Check if this Asset represents an audio format
         */
        isAudioFormat() {
            const audioFormats = ['mp3', 'wav', 'flac', 'm4a', 'ogg', 'webm', 'aac', 'opus', 'wma'];
            const format = this.metadata.format?.toLowerCase() || '';
            // Direct audio formats
            if (audioFormats.includes(format)) {
                return true;
            }
            // Video formats that contain audio
            const videoWithAudio = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'];
            return videoWithAudio.includes(format);
        }
        /**
         * Override getRoles to include Audio
         */
        getRoles() {
            const baseRoles = super.getRoles();
            return [...baseRoles, 'audio'];
        }
        /**
         * Override canPlayRole to include Audio
         */
        canPlayRole(role) {
            if (role === 'audio') {
                return this.canPlayAudioRole();
            }
            return super.canPlayRole(role);
        }
    };
}
// ============================================================================
// VIDEO ROLE MIXIN
// ============================================================================
/**
 * Mixin that adds VideoRole capabilities to an Asset
 */
function withVideoRole(Base) {
    return class extends Base {
        /**
         * Convert this Asset to Video data
         */
        async asVideo() {
            const videoMetadata = this.getVideoMetadata();
            const format = videoMetadata.format || this.detectVideoFormat();
            return new roles_1.Video(this.data, format, videoMetadata, this); // Pass reference to source Asset
        }
        /**
         * Get video-specific metadata
         */
        getVideoMetadata() {
            const format = this.metadata.format || this.detectVideoFormat();
            return {
                format,
                duration: this.metadata.duration,
                width: this.metadata.width,
                height: this.metadata.height,
                frameRate: this.metadata.frameRate,
                codec: this.metadata.codec,
                hasAudio: this.metadata.hasAudio,
                ...this.metadata.video
            };
        }
        /**
         * Check if this Asset can play the Video role
         */
        canPlayVideoRole() {
            return this.isValid() && this.isVideoFormat();
        }
        /**
         * Detect video format from metadata or file extension
         */
        detectVideoFormat() {
            // Try to get format from metadata first
            if (this.metadata.format) {
                const format = this.metadata.format.toLowerCase();
                if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(format)) {
                    return format;
                }
            }
            // Try to get from source file extension
            if (this.metadata.sourceFile) {
                const ext = this.metadata.sourceFile.split('.').pop()?.toLowerCase();
                if (ext && ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext)) {
                    return ext;
                }
            }
            // Default fallback
            return 'mp4';
        }
        /**
         * Check if this Asset represents a video format
         */
        isVideoFormat() {
            const videoFormats = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
            return videoFormats.includes(this.metadata.format?.toLowerCase() || '');
        }
        /**
         * Override getRoles to include Video
         */
        getRoles() {
            const baseRoles = super.getRoles();
            return [...baseRoles, 'video'];
        }
        /**
         * Override canPlayRole to include Video
         */
        canPlayRole(role) {
            if (role === 'video') {
                return this.canPlayVideoRole();
            }
            return super.canPlayRole(role);
        }
    };
}
// ============================================================================
// TEXT ROLE MIXIN
// ============================================================================
/**
 * Mixin that adds TextRole capabilities to an Asset
 */
function withTextRole(Base) {
    return class extends Base {
        /**
         * Convert this Asset to Text data
         */
        async asText() {
            const textMetadata = this.getTextMetadata();
            const content = this.extractTextContent();
            return new roles_1.Text(content, textMetadata.language || this.metadata.language, textMetadata.confidence || this.metadata.confidence, textMetadata, this // Pass reference to source Asset
            );
        }
        /**
         * Get text-specific metadata
         */
        getTextMetadata() {
            return {
                language: this.metadata.language,
                confidence: this.metadata.confidence,
                encoding: this.metadata.encoding || 'utf-8',
                wordCount: this.metadata.wordCount,
                ...this.metadata.text
            };
        }
        /**
         * Check if this Asset can play the Text role
         */
        canPlayTextRole() {
            return this.isValid() && this.isTextFormat();
        }
        /**
         * Extract text content from the Asset data
         */
        extractTextContent() {
            try {
                // Assume UTF-8 encoding by default
                const encoding = this.metadata.encoding || 'utf-8';
                return this.data.toString(encoding);
            }
            catch (error) {
                // Fallback to binary string if UTF-8 fails
                return this.data.toString('binary');
            }
        }
        /**
         * Check if this Asset represents a text format
         */
        isTextFormat() {
            const textFormats = ['txt', 'md', 'json', 'xml', 'html', 'csv'];
            return textFormats.includes(this.metadata.format?.toLowerCase() || '');
        }
        /**
         * Override getRoles to include Text
         */
        getRoles() {
            const baseRoles = super.getRoles();
            return [...baseRoles, 'text'];
        }
        /**
         * Override canPlayRole to include Text
         */
        canPlayRole(role) {
            if (role === 'text') {
                return this.canPlayTextRole();
            }
            return super.canPlayRole(role);
        }
    };
}
// ============================================================================
// IMAGE ROLE MIXIN
// ============================================================================
/**
 * Mixin that adds ImageRole capabilities to an Asset
 */
function withImageRole(Base) {
    return class extends Base {
        /**
         * Convert this Asset to Image data
         * For already image assets, returns the data as-is
         */
        async asImage() {
            // For image assets, return the data directly
            const format = this.getImageFormat();
            return new roles_1.Image(this.data, format, {
                format,
                fileSize: this.data.length,
                sourceFile: this.metadata.sourceFile
            }, this);
        } /**
         * Get image metadata
         */
        getImageMetadata() {
            return {
                format: this.getImageFormat(),
                fileSize: this.data.length,
                sourceFile: this.metadata.sourceFile,
                ...this.metadata
            };
        }
        /**
         * Check if this Asset can play the Image role
         */
        canPlayImageRole() {
            const format = this.metadata.format?.toLowerCase();
            const imageFormats = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff'];
            return imageFormats.includes(format || '');
        }
        /**
         * Get the image format from metadata or file extension
         */
        getImageFormat() {
            const format = this.metadata.format?.toLowerCase();
            const validFormats = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff'];
            if (format && validFormats.includes(format)) {
                return format;
            }
            // Default to png if unknown
            return 'png';
        }
    };
}
