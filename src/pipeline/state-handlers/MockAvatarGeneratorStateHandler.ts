/**
 * Mock Avatar Generator State Handler
 *
 * Provides a mock implementation for avatar generation when the full
 * AvatarGeneratorStateHandler is excluded from production builds.
 */

import {
  PipelineAction,
  PipelineContext,
  PipelineState,
  AvatarVideo,
  StateHandler
} from '../types';
import { AspectRatio, DEFAULT_ASPECT_RATIO } from '../../common/aspect-ratio';

export class MockAvatarGeneratorStateHandler implements StateHandler {
  /**
   * Check if this handler can handle the given state
   * @param state Current pipeline state
   * @returns True if this handler can handle the state
   */
  canHandle(state: PipelineState): boolean {
    return [
      PipelineState.SCRIPT_APPROVED,
      PipelineState.AVATAR_GENERATING,
      PipelineState.AVATAR_GENERATED
    ].includes(state);
  }

  /**
   * Handle a state transition (mock implementation)
   * @param action Action being performed
   * @param context Current pipeline context
   * @returns Updated context after handling the action
   */
  async handleTransition(
    action: PipelineAction,
    context: PipelineContext
  ): Promise<PipelineContext> {
    switch (action) {
      case PipelineAction.GENERATE_AVATAR:
        return this.generateMockAvatar(context);

      case PipelineAction.REGENERATE_AVATAR:
        return this.regenerateMockAvatar(context);

      default:
        // For unsupported actions, just return the unchanged context
        return context;
    }
  }

  /**
   * Generate a mock avatar video
   * @param context Current pipeline context
   * @returns Updated context with mock avatar video
   */
  private async generateMockAvatar(context: PipelineContext): Promise<PipelineContext> {
    if (!context.script) {
      throw new Error('Cannot generate avatar: No script available');
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create mock avatar video
    const mockAvatar: AvatarVideo = {
      id: `mock-avatar-${Date.now()}`,
      status: 'complete',
      url: 'https://example.com/mock-avatar-video.mp4',
      avatarId: 'mock-avatar-id',
      voiceId: 'mock-voice-id',
      generatedAt: new Date().toISOString(),
      regenerated: false
    };

    return {
      ...context,
      currentState: PipelineState.AVATAR_GENERATED,
      avatarVideo: mockAvatar as AvatarVideo & { status: 'complete' },
      metadata: {
        ...context.metadata,
        updatedAt: new Date().toISOString()
      }
    } as PipelineContext;
  }

  /**
   * Regenerate a mock avatar video
   * @param context Current pipeline context
   * @returns Updated context with regenerated mock avatar video
   */
  private async regenerateMockAvatar(context: PipelineContext): Promise<PipelineContext> {
    if (!context.script) {
      throw new Error('Cannot regenerate avatar: No script available');
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create regenerated mock avatar video
    const mockAvatar: AvatarVideo = {
      id: `mock-avatar-regen-${Date.now()}`,
      status: 'complete',
      url: 'https://example.com/mock-avatar-video-regen.mp4',
      avatarId: 'mock-avatar-id',
      voiceId: 'mock-voice-id',
      generatedAt: new Date().toISOString(),
      regenerated: true
    };

    return {
      ...context,
      currentState: PipelineState.AVATAR_GENERATED,
      avatarVideo: mockAvatar as AvatarVideo & { status: 'complete' },
      metadata: {
        ...context.metadata,
        updatedAt: new Date().toISOString()
      }
    } as PipelineContext;
  }
}
