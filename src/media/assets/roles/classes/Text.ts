/**
 * Text Class
 * 
 * Represents text data with language and confidence information.
 * Implements TextRole to be compatible with model interfaces.
 */

import { TextMetadata } from '../types';
import { TextRole } from '../interfaces/TextRole';
import { Audio } from './Audio';
import { Video } from './Video';
import { Image } from './Image';

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
    return `TEXT(${this.content.length} chars${this.language ? `, ${this.language}` : ''})`;
  }

  // TextRole interface implementation
  async asRole<T extends Audio | Video | Text | Image>(
    targetType: new (...args: any[]) => T,
    modelId?: string
  ): Promise<T> {
    if (targetType === Text as any) {
      return this as any;
    }
    // For other roles, would need provider-based transformation
    throw new Error(`Cannot transform Text to ${targetType.name} without a provider`);
  }

  canPlayRole<T extends Audio | Video | Text | Image>(
    targetType: new (...args: any[]) => T
  ): boolean {
    // Use synchronous version for immediate checking
    const { canPlayRoleSync } = require('../../RoleTransformation');
    return canPlayRoleSync(this, targetType);
  }

  getTextMetadata(): TextMetadata {
    return this.metadata || {
      format: 'text/plain',
      encoding: 'utf-8'
    };
  }

  static fromString(
    content: string, 
    language?: string, 
    confidence?: number, 
    metadata: TextMetadata = {},
    sourceAsset?: any
  ): Text {
    return new Text(
      content, 
      language || metadata.language, 
      confidence || metadata.confidence, 
      metadata, 
      sourceAsset
    );
  }
}
