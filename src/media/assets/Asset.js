"use strict";
/**
 * Asset - Base Class for Media Assets
 *
 * Base class for all media assets that can play different roles through TypeScript mixins.
 * Replaces the previous Audio class with a more flexible, role-based system.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAsset = exports.Asset = void 0;
exports.detectAssetTypeFromPath = detectAssetTypeFromPath;
exports.validateAssetFile = validateAssetFile;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Base Asset class - container for media data that can play different roles
 */
class Asset {
    constructor(data, metadata = {}) {
        this.data = data;
        this.metadata = { ...metadata };
    }
    /**
     * Create Asset from file path - must be implemented by concrete classes
     */
    static fromFile(filePath) {
        throw new Error('fromFile must be implemented by concrete Asset classes');
    }
    /**
     * Create Asset from Buffer - must be implemented by concrete classes
     */
    static fromBuffer(buffer, metadata) {
        throw new Error('fromBuffer must be implemented by concrete Asset classes');
    }
    /**
     * Create Asset from base64 string - must be implemented by concrete classes
     */
    static fromBase64(base64, metadata) {
        throw new Error('fromBase64 must be implemented by concrete Asset classes');
    }
    /**
     * Save asset to file
     */
    async toFile(outputPath) {
        // Ensure output directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(outputPath, this.data);
    }
    /**
     * Get asset data as Buffer
     */
    toBuffer() {
        return Buffer.from(this.data);
    }
    /**
     * Get asset data as base64 string
     */
    toBase64() {
        return this.data.toString('base64');
    }
    /**
     * Get asset data as data URL
     */
    toDataURL() {
        const mimeType = this.getMimeType();
        return `data:${mimeType};base64,${this.toBase64()}`;
    }
    /**
     * Get asset size in bytes
     */
    getSize() {
        return this.data.length;
    }
    /**
     * Get human-readable size
     */
    getHumanSize() {
        const bytes = this.getSize();
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }
    /**
     * Get duration in seconds (if available in metadata)
     */
    getDuration() {
        return this.metadata.duration;
    }
    /**
     * Get human-readable duration
     */
    getHumanDuration() {
        const duration = this.getDuration();
        if (duration === undefined)
            return undefined;
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    /**
     * Clone the asset with new metadata
     */
    withMetadata(newMetadata) {
        // Must be implemented by concrete classes to return correct type
        throw new Error('withMetadata must be implemented by concrete Asset classes');
    }
    /**
     * Check if asset has valid data
     */
    isValid() {
        return this.data.length > 0;
    }
    /**
     * Get a string representation
     */
    toString() {
        const type = this.constructor.name;
        const duration = this.getHumanDuration();
        const size = this.getHumanSize();
        return `${type}(${size}${duration ? `, ${duration}` : ''})`;
    }
    /**
     * Get JSON representation
     */
    toJSON() {
        return {
            type: this.constructor.name,
            size: this.getSize(),
            metadata: this.metadata
        };
    }
    /**
     * Create a copy of the asset
     */
    clone() {
        // Must be implemented by concrete classes to return correct type
        throw new Error('clone must be implemented by concrete Asset classes');
    }
    /**
     * Check if this asset can play a specific role
     */
    canPlayRole(role) {
        // This will be enhanced by mixins
        return false;
    }
    /**
     * Get list of roles this asset can play
     */
    getRoles() {
        // This will be enhanced by mixins
        return [];
    }
    /**
     * Validate asset data and metadata
     */
    validate() {
        const errors = [];
        if (!this.isValid()) {
            errors.push('Asset data is invalid or empty');
        }
        // Additional validation can be added by concrete classes
        return {
            valid: errors.length === 0,
            errors
        };
    }
}
exports.Asset = Asset;
/**
 * Concrete base Asset class that can be used with mixins
 * This provides default implementations for abstract methods
 */
class BaseAsset extends Asset {
    constructor(data, metadata = {}, mimeType = 'application/octet-stream', fileExtension = 'bin') {
        super(data, metadata);
        this._mimeType = mimeType;
        this._fileExtension = fileExtension;
    }
    /**
     * Create BaseAsset from file
     */
    static fromFile(filePath) {
        if (!validateAssetFile(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        const data = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase().slice(1);
        const metadata = {
            sourceFile: filePath,
            fileSize: data.length,
            format: ext
        };
        return new BaseAsset(data, metadata, 'application/octet-stream', ext);
    }
    /**
     * Create BaseAsset from Buffer
     */
    static fromBuffer(buffer, metadata = {}) {
        return new BaseAsset(buffer, {
            fileSize: buffer.length,
            ...metadata
        });
    }
    /**
     * Create BaseAsset from base64
     */
    static fromBase64(base64, metadata = {}) {
        const buffer = Buffer.from(base64, 'base64');
        return BaseAsset.fromBuffer(buffer, metadata);
    }
    /**
     * Get MIME type
     */
    getMimeType() {
        return this._mimeType;
    }
    /**
     * Get file extension
     */
    getFileExtension() {
        return this._fileExtension;
    }
    /**
     * Clone with new metadata
     */
    withMetadata(newMetadata) {
        return new BaseAsset(this.data, {
            ...this.metadata,
            ...newMetadata
        }, this._mimeType, this._fileExtension);
    }
    /**
     * Clone the asset
     */
    clone() {
        return new BaseAsset(Buffer.from(this.data), { ...this.metadata }, this._mimeType, this._fileExtension);
    }
}
exports.BaseAsset = BaseAsset;
/**
 * Utility function to detect asset type from file extension
 */
function detectAssetTypeFromPath(filePath) {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const typeMap = {
        // Audio formats
        'mp3': 'audio',
        'wav': 'audio',
        'wave': 'audio',
        'flac': 'audio',
        'm4a': 'audio',
        'aac': 'audio',
        'ogg': 'audio',
        'opus': 'audio',
        'wma': 'audio',
        // Video formats
        'mp4': 'video',
        'avi': 'video',
        'mov': 'video',
        'wmv': 'video',
        'flv': 'video',
        'webm': 'video',
        'mkv': 'video',
        // Text formats
        'txt': 'text',
        'md': 'text',
        'json': 'text',
        'xml': 'text',
        'html': 'text',
        // Image formats
        'jpg': 'image',
        'jpeg': 'image',
        'png': 'image',
        'gif': 'image',
        'bmp': 'image',
        'svg': 'image',
        'webp': 'image'
    };
    return typeMap[ext] || 'unknown';
}
/**
 * Utility function to validate file exists
 */
function validateAssetFile(filePath) {
    return fs.existsSync(filePath);
}
