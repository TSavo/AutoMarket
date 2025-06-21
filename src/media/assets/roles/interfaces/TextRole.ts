/**
 * TextRole Interface
 * 
 * Interface for assets that can provide text data.
 */

import { Text } from '../classes';
import { TextMetadata } from '../types';

export interface TextRole {
  asText(): Promise<Text>;
  getTextMetadata(): TextMetadata;
  canPlayTextRole(): boolean;
}
