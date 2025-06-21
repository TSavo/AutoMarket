/**
 * Text Class
 * 
 * Represents text data with language and confidence information.
 * Implements TextRole to be compatible with model interfaces.
 */

import { TextMetadata } from '../types';
import { TextRole } from '../interfaces/TextRole';

export class Text implements TextRole {
  constructor(
    public readonly content: string,
    public readonly language?: string,
    public readonly confidence?: number,
    public readonly metadata?: TextMetadata,
    public readonly sourceAsset?: any
  ) {}

  isValid(): boolean {
    return !!(this.content && this.content.length > 0);
  }

  toString(): string {
    return `Text(${this.content.length} chars${this.language ? `, ${this.language}` : ''})`;
  }

  // TextRole interface implementation
  async asText(): Promise<Text> {
    return this;
  }

  getTextMetadata(): TextMetadata {
    return this.metadata || {
      format: 'text/plain',
      encoding: 'utf-8'
    };
  }

  canPlayTextRole(): boolean {
    return this.isValid();
  }
}
