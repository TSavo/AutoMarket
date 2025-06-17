/**
 * Blog-to-Video Pipeline State Machine
 *
 * Core state machine implementation for the blog-to-video marketing pipeline.
 * This class handles state transitions, validation, and event emission.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  PipelineState,
  PipelineAction,
  VALID_TRANSITIONS,
  PipelineContext,
  StateTransitionEvent,
  StateTransitionListener,
  StateHistoryEntry
} from './types';

export class PipelineStateMachine {
  private context: PipelineContext;
  private listeners: StateTransitionListener[] = [];

  /**
   * Create a new PipelineStateMachine instance
   * @param initialContext Optional initial context (used for restoring state)
   */
  constructor(initialContext?: Partial<PipelineContext>) {
    // Initialize with default context or restore from provided context
    this.context = {
      id: initialContext?.id || uuidv4(),
      currentState: initialContext?.currentState || PipelineState.BLOG_SELECTED,
      history: initialContext?.history || [],
      metadata: {
        createdAt: initialContext?.metadata?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      ...(initialContext || {})
    } as PipelineContext;
  }

  /**
   * Get the current context object
   * @returns The current pipeline context
   */
  getContext(): PipelineContext {
    return { ...this.context };
  }

  /**
   * Get the current state
   * @returns The current pipeline state
   */
  getCurrentState(): PipelineState {
    return this.context.currentState;
  }

  /**
   * Check if a state transition is valid
   * @param state Current state
   * @param action Action to perform
   * @returns True if the transition is valid, false otherwise
   */
  private isValidTransition(state: PipelineState, action: PipelineAction): boolean {
    // Special case: RESTART_FROM_STATE is always valid
    if (action === PipelineAction.RESTART_FROM_STATE) {
      return true;
    }

    // Check if the action is valid for the current state
    const validActions = VALID_TRANSITIONS[state] || [];
    return validActions.includes(action);
  }

  /**
   * Get all valid actions from the current state
   * @returns Array of valid actions from the current state
   */
  getValidActions(): PipelineAction[] {
    const actions = VALID_TRANSITIONS[this.context.currentState] || [];
    // Always add RESTART_FROM_STATE (if we have history to go back to)
    if (this.context.history.length > 0) {
      if (!actions.includes(PipelineAction.RESTART_FROM_STATE)) {
        actions.push(PipelineAction.RESTART_FROM_STATE);
      }
    }
    return [...actions];
  }

  /**
   * Update the context with a new state and add to history
   * @param newState New state to transition to
   * @param action Action that triggered the transition
   * @param additionalContextUpdates Additional updates to the context
   * @returns Updated context
   */
  private updateContextState(
    newState: PipelineState,
    action: PipelineAction,
    additionalContextUpdates: Partial<PipelineContext> = {}
  ): PipelineContext {
    const oldState = this.context.currentState;
    const timestamp = new Date().toISOString();

    // Create history entry
    const historyEntry: StateHistoryEntry = {
      state: oldState,
      action,
      timestamp,
      metadata: { to: newState }
    };

    // Update context with new state and add to history
    const updatedContext = {
      ...this.context,
      ...additionalContextUpdates,
      currentState: newState,
      history: [...this.context.history, historyEntry],
      metadata: {
        ...this.context.metadata,
        updatedAt: timestamp
      }
    };

    // Type assertion to handle the discriminated union
    this.context = updatedContext as PipelineContext;

    // Emit transition event
    const event: StateTransitionEvent = {
      from: oldState,
      to: newState,
      action,
      timestamp,
      context: { ...this.context }
    };

    this.emitTransition(event);

    return this.context;
  }

  /**
   * Perform a state transition
   * @param action Action to perform
   * @param additionalContextUpdates Additional updates to the context
   * @returns Updated context
   * @throws Error if the transition is invalid
   */
  async transition(
    action: PipelineAction,
    additionalContextUpdates: Partial<PipelineContext> = {}
  ): Promise<PipelineContext> {
    const currentState = this.context.currentState;

    // If the action is RESTART_FROM_STATE, handle it differently
    if (action === PipelineAction.RESTART_FROM_STATE && additionalContextUpdates.currentState) {
      return this.goBackToState(additionalContextUpdates.currentState as PipelineState);
    }

    // Validate the transition
    if (!this.isValidTransition(currentState, action)) {
      throw new Error(
        `Invalid transition: Cannot perform action ${action} from state ${currentState}`
      );
    }

    // Determine the new state based on the current state and action
    let newState: PipelineState;

    switch (currentState) {
      case PipelineState.BLOG_SELECTED:
        if (action === PipelineAction.GENERATE_SCRIPT) {
          newState = PipelineState.SCRIPT_GENERATING;
        } else {
          newState = currentState;
        }
        break;

      case PipelineState.SCRIPT_GENERATING:
        if (action === PipelineAction.HANDLE_ERROR) {
          newState = PipelineState.ERROR;
        } else {
          newState = PipelineState.SCRIPT_GENERATED;
        }
        break;

      case PipelineState.SCRIPT_GENERATED:
        if (action === PipelineAction.APPROVE_SCRIPT) {
          newState = PipelineState.SCRIPT_APPROVED;
        } else if (action === PipelineAction.REGENERATE_SCRIPT) {
          newState = PipelineState.SCRIPT_GENERATING;
        } else if (action === PipelineAction.HANDLE_ERROR) {
          newState = PipelineState.ERROR;
        } else {
          // EDIT_SCRIPT stays in same state
          newState = currentState;
        }
        break;

      case PipelineState.SCRIPT_APPROVED:
        if (action === PipelineAction.GENERATE_AVATAR) {
          newState = PipelineState.AVATAR_GENERATING;
        } else if (action === PipelineAction.EDIT_SCRIPT) {
          newState = PipelineState.SCRIPT_GENERATED;
        } else {
          newState = currentState;
        }
        break;

      case PipelineState.AVATAR_GENERATING:
        if (action === PipelineAction.HANDLE_ERROR) {
          newState = PipelineState.ERROR;
        } else {
          newState = PipelineState.AVATAR_GENERATED;
        }
        break;

      case PipelineState.AVATAR_GENERATED:
        if (action === PipelineAction.AUTO_COMPOSE) {
          newState = PipelineState.AUTO_COMPOSING;
        } else if (action === PipelineAction.REGENERATE_AVATAR) {
          newState = PipelineState.AVATAR_GENERATING;
        } else if (action === PipelineAction.HANDLE_ERROR) {
          newState = PipelineState.ERROR;
        } else {
          newState = currentState;
        }
        break;

      case PipelineState.AUTO_COMPOSING:
        if (action === PipelineAction.HANDLE_ERROR) {
          newState = PipelineState.ERROR;
        } else {
          newState = PipelineState.AUTO_COMPOSED;
        }
        break;

      case PipelineState.AUTO_COMPOSED:
        if (action === PipelineAction.APPROVE_FINAL) {
          newState = PipelineState.FINAL_APPROVED;
        } else if (action === PipelineAction.REGENERATE_COMPOSITION) {
          newState = PipelineState.AUTO_COMPOSING;
        } else if (action === PipelineAction.HANDLE_ERROR) {
          newState = PipelineState.ERROR;
        } else {
          newState = currentState;
        }
        break;

      case PipelineState.FINAL_APPROVED:
        newState = PipelineState.READY_FOR_PUBLISHING;
        break;

      default:
        newState = currentState;
        break;
    }

    // Update the context with the new state
    return this.updateContextState(newState, action, additionalContextUpdates);
  }

  /**
   * Go back to a previous state
   * @param targetState The state to go back to
   * @returns Updated context
   */
  async goBackToState(targetState: PipelineState): Promise<PipelineContext> {
    const currentState = this.context.currentState;

    // Don't need to go back if already in the target state
    if (currentState === targetState) {
      return this.context;
    }

    // Ensure the target state is valid (exists in history)
    const stateExists = this.context.history.some(entry =>
      entry.state === targetState || entry.metadata?.to === targetState
    );

    if (!stateExists && targetState !== PipelineState.BLOG_SELECTED) {
      throw new Error(`Cannot go back to state ${targetState} as it doesn't exist in history`);
    }

    // Create a cleaned context for the target state
    // This removes any data that would have been generated in later states
    const cleanedContext = this.getCleanContextForState(targetState);

    // Update the context with the new (old) state
    return this.updateContextState(
      targetState,
      PipelineAction.RESTART_FROM_STATE,
      cleanedContext
    );
  }

  /**
   * Clean the context for returning to a previous state
   * @param targetState The state to clean the context for
   * @returns Partial context with properties to reset
   */
  private getCleanContextForState(targetState: PipelineState): Partial<PipelineContext> {
    const cleanContext: Partial<PipelineContext> = {};

    // Remove data based on target state
    switch (targetState) {
      case PipelineState.BLOG_SELECTED:
        // Reset everything except blog
        cleanContext.script = undefined;
        cleanContext.avatarVideo = undefined;
        cleanContext.composedVideo = undefined;
        break;

      case PipelineState.SCRIPT_GENERATING:
      case PipelineState.SCRIPT_GENERATED:
        // Reset avatar and composed video data
        cleanContext.avatarVideo = undefined;
        cleanContext.composedVideo = undefined;
        break;

      case PipelineState.SCRIPT_APPROVED:
        // Reset avatar and composed video data
        cleanContext.avatarVideo = undefined;
        cleanContext.composedVideo = undefined;
        break;

      case PipelineState.AVATAR_GENERATING:
      case PipelineState.AVATAR_GENERATED:
        // Reset composed video data
        cleanContext.composedVideo = undefined;
        break;
    }

    // Always clear any error when going back
    cleanContext.error = undefined;

    return cleanContext;
  }

  /**
   * Add a state transition listener
   * @param listener The listener function to add
   * @returns Unsubscribe function
   */
  onTransition(listener: StateTransitionListener): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Emit a state transition event to all listeners
   * @param event The event to emit
   */
  private emitTransition(event: StateTransitionEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in state transition listener:', error);
      }
    });
  }
}
