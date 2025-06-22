"use strict";
/**
 * Smart Asset Factory
 *
 * Provides intelligent asset loading that automatically detects format
 * and applies appropriate role mixins for maximum functionality.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FORMAT_REGISTRY = exports.AssetLoader = exports.SmartAssetFactory = void 0;
exports.detectFormat = detectFormat;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const Asset_1 = require("./Asset");
const mixins_1 = require("./mixins");
/**
 * Registry of supported formats with their capabilities
 */
const FORMAT_REGISTRY = {
    // Audio formats
    mp3: { extension: 'mp3', mimeType: 'audio/mpeg', category: 'audio', roles: ['speech', 'audio'] },
    wav: { extension: 'wav', mimeType: 'audio/wav', category: 'audio', roles: ['speech', 'audio'] },
    wave: { extension: 'wave', mimeType: 'audio/wav', category: 'audio', roles: ['speech', 'audio'] },
    flac: { extension: 'flac', mimeType: 'audio/flac', category: 'audio', roles: ['speech', 'audio'] },
    ogg: { extension: 'ogg', mimeType: 'audio/ogg', category: 'audio', roles: ['speech', 'audio'] },
    // Video formats - can play video, audio, and speech roles
    mp4: { extension: 'mp4', mimeType: 'video/mp4', category: 'video', roles: ['video', 'speech', 'audio'] },
    avi: { extension: 'avi', mimeType: 'video/x-msvideo', category: 'video', roles: ['video', 'speech', 'audio'] },
    mov: { extension: 'mov', mimeType: 'video/quicktime', category: 'video', roles: ['video', 'speech', 'audio'] },
    wmv: { extension: 'wmv', mimeType: 'video/x-ms-wmv', category: 'video', roles: ['video', 'speech', 'audio'] },
    flv: { extension: 'flv', mimeType: 'video/x-flv', category: 'video', roles: ['video', 'speech', 'audio'] },
    webm: { extension: 'webm', mimeType: 'video/webm', category: 'video', roles: ['video', 'speech', 'audio'] },
    mkv: { extension: 'mkv', mimeType: 'video/x-matroska', category: 'video', roles: ['video', 'speech', 'audio'] },
    // Image formats
    png: { extension: 'png', mimeType: 'image/png', category: 'image', roles: ['image'] },
    jpg: { extension: 'jpg', mimeType: 'image/jpeg', category: 'image', roles: ['image'] },
    jpeg: { extension: 'jpeg', mimeType: 'image/jpeg', category: 'image', roles: ['image'] },
    gif: { extension: 'gif', mimeType: 'image/gif', category: 'image', roles: ['image'] },
    webp: { extension: 'webp', mimeType: 'image/webp', category: 'image', roles: ['image'] },
    svg: { extension: 'svg', mimeType: 'image/svg+xml', category: 'image', roles: ['image'] },
    bmp: { extension: 'bmp', mimeType: 'image/bmp', category: 'image', roles: ['image'] },
    tiff: { extension: 'tiff', mimeType: 'image/tiff', category: 'image', roles: ['image'] },
    // Text formats
    txt: { extension: 'txt', mimeType: 'text/plain', category: 'text', roles: ['text'] },
    md: { extension: 'md', mimeType: 'text/markdown', category: 'text', roles: ['text'] },
    json: { extension: 'json', mimeType: 'application/json', category: 'text', roles: ['text'] },
    xml: { extension: 'xml', mimeType: 'application/xml', category: 'text', roles: ['text'] },
    html: { extension: 'html', mimeType: 'text/html', category: 'text', roles: ['text'] },
    css: { extension: 'css', mimeType: 'text/css', category: 'text', roles: ['text'] },
    js: { extension: 'js', mimeType: 'application/javascript', category: 'text', roles: ['text'] },
    ts: { extension: 'ts', mimeType: 'application/typescript', category: 'text', roles: ['text'] },
};
exports.FORMAT_REGISTRY = FORMAT_REGISTRY;
/**
 * Detect format information from file extension
 */
function detectFormat(filePath) {
    const ext = path_1.default.extname(filePath).toLowerCase().slice(1);
    return FORMAT_REGISTRY[ext] || null;
}
/**
 * Create a dynamic asset class with the appropriate role mixins
 */
function createDynamicAssetClass(formatInfo) {
    // Start with BaseAsset
    let AssetClass = Asset_1.BaseAsset;
    // Apply role mixins based on format capabilities
    if (formatInfo.roles.includes('audio')) {
        AssetClass = (0, mixins_1.withAudioRole)(AssetClass);
    }
    if (formatInfo.roles.includes('video')) {
        AssetClass = (0, mixins_1.withVideoRole)(AssetClass);
    }
    if (formatInfo.roles.includes('text')) {
        AssetClass = (0, mixins_1.withTextRole)(AssetClass);
    }
    if (formatInfo.roles.includes('image')) {
        AssetClass = (0, mixins_1.withImageRole)(AssetClass);
    }
    return AssetClass;
}
/**
 * Smart Asset Factory Class
 */
class SmartAssetFactory {
    /**
     * Load an asset from file with automatic format detection and role assignment
     */
    static load(filePath) {
        if (!fs_1.default.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        const formatInfo = detectFormat(filePath);
        if (!formatInfo) {
            throw new Error(`Unsupported file format: ${path_1.default.extname(filePath)}`);
        }
        // Create dynamic asset class with appropriate mixins
        const AssetClass = createDynamicAssetClass(formatInfo);
        // Load file data
        const data = fs_1.default.readFileSync(filePath);
        const metadata = {
            sourceFile: filePath,
            fileSize: data.length,
            format: formatInfo.extension
        };
        // Create asset instance
        return new AssetClass(data, metadata, formatInfo.mimeType, formatInfo.extension);
    }
    /**
     * Create asset from buffer with format specification
     */
    static fromBuffer(buffer, format, metadata = {}) {
        const formatInfo = FORMAT_REGISTRY[format.toLowerCase()];
        if (!formatInfo) {
            throw new Error(`Unsupported format: ${format}`);
        }
        // Create dynamic asset class with appropriate mixins
        const AssetClass = createDynamicAssetClass(formatInfo);
        // Create asset instance
        return new AssetClass(buffer, { format, ...metadata }, formatInfo.mimeType, formatInfo.extension);
    }
    /**
     * Type-safe factory method for creating assets with specific role guarantees
     */
    static fromFile(filePath) {
        return SmartAssetFactory.load(filePath);
    }
    /**
     * Get format information for a file
     */
    static getFormatInfo(filePath) {
        return detectFormat(filePath);
    }
    /**
     * Check if a file format supports specific roles
     */
    static supportsRoles(filePath, roles) {
        const formatInfo = detectFormat(filePath);
        if (!formatInfo)
            return false;
        return roles.every(role => formatInfo.roles.includes(role));
    }
}
exports.SmartAssetFactory = SmartAssetFactory;
/**
 * Convenience exports for easy use
 */
exports.AssetLoader = {
    /**
     * Smart asset loader with automatic format detection
     */
    load: SmartAssetFactory.load,
    /**
     * Type-safe factory method
     */
    fromFile: SmartAssetFactory.fromFile,
    /**
     * Create asset from buffer
     */
    fromBuffer: SmartAssetFactory.fromBuffer,
    /**
     * Get format information
     */
    getFormatInfo: SmartAssetFactory.getFormatInfo,
    /**
     * Check role support
     */
    supportsRoles: SmartAssetFactory.supportsRoles
};
