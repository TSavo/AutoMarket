"use strict";
/**
 * Image Class
 *
 * Represents image data with format and metadata information.
 * Serves as both DTO and rich interface for image assets.
 * Implements ImageRole to be compatible with model interfaces.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Image = void 0;
class Image {
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
        return `Image(${this.format}, ${this.data.length} bytes)`;
    }
    // ImageRole interface implementation
    async asImage() {
        return this;
    }
    getImageMetadata() {
        return this.metadata;
    }
    canPlayImageRole() {
        return this.isValid();
    }
    // Rich interface methods for compatibility
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
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } // Static factory methods for compatibility
    static fromUrl(url, format, metadata) {
        // This would need actual implementation to fetch from URL
        throw new Error('Image.fromUrl not implemented - use SmartAssetFactory instead');
    }
    static fromFile(filePath) {
        // This would need actual implementation to read file
        throw new Error('Image.fromFile not implemented - use SmartAssetFactory instead');
    }
    // Instance methods
    saveToFile(filePath) {
        // This would need actual implementation to save file
        throw new Error('Image.saveToFile not implemented - use SmartAssetFactory instead');
    }
}
exports.Image = Image;
