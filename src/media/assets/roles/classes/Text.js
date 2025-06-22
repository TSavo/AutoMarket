"use strict";
/**
 * Text Class
 *
 * Represents text data with language and confidence information.
 * Implements TextRole to be compatible with model interfaces.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Text = void 0;
class Text {
    constructor(content, language, confidence, metadata, sourceAsset) {
        this.content = content;
        this.language = language;
        this.confidence = confidence;
        this.metadata = metadata;
        this.sourceAsset = sourceAsset;
    }
    isValid() {
        return !!(this.content && this.content.length > 0);
    }
    toString() {
        return `Text(${this.content.length} chars${this.language ? `, ${this.language}` : ''})`;
    }
    // TextRole interface implementation
    async asText() {
        return this;
    }
    getTextMetadata() {
        return this.metadata || {
            format: 'text/plain',
            encoding: 'utf-8'
        };
    }
    canPlayTextRole() {
        return this.isValid();
    }
    static fromString(content, metadata = {}) {
        return new Text(content, metadata.language, metadata.confidence, metadata);
    }
}
exports.Text = Text;
