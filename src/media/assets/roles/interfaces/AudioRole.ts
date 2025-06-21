/**
 * AudioRole Interface
 * 
 * Interface for assets that can provide audio data.
 */

import { Audio } from '../classes';

export interface AudioRole {
  asAudio(): Promise<Audio>;
  canPlayAudioRole(): boolean;
}
