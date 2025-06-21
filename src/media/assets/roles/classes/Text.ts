/**
 * Text Class
 * 
 * Represents text data with language and confidence information.
 */

import { TextMetadata } from '../types';

export class Text {
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
}
