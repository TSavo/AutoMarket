/**
 * Pipeline Orchestrator
 *
 * Main coordinator for the pipeline, managing state transitions and handlers.
 * This class acts as the facade for the entire pipeline, providing a unified interface.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  BlogPost,
  PipelineAction,
  PipelineContext,
  PipelineState,
  StateHandler
} from './types';
import { PipelineStateMachine } from './PipelineStateMachine';
import { PipelineStateStore } from './storage/PipelineStateStore';
import { ServerPipelineStore } from './storage/ServerPipelineStore';
import { StateHistoryManager } from './storage/StateHistoryManager';
import { getPipelineEnvironment, isCreatifyAvailable } from './config/environment';
import { ScriptGeneratorStateHandler } from './state-handlers/ScriptGeneratorStateHandler';
// Import mock handlers for production builds where real handlers are excluded
import { MockAvatarGeneratorStateHandler } from './state-handlers/MockAvatarGeneratorStateHandler';

// Try to import real handlers, fall back to mocks if not available
let AvatarGeneratorStateHandler: any;
let AutoCompositionStateHandler: any;

try {
  AvatarGeneratorStateHandler = require('./state-handlers/AvatarGeneratorStateHandler').AvatarGeneratorStateHandler;
} catch (e) {
  console.warn('AvatarGeneratorStateHandler not available, using mock');
  AvatarGeneratorStateHandler = MockAvatarGeneratorStateHandler;
}

try {
  AutoCompositionStateHandler = require('./state-handlers/AutoCompositionStateHandler').AutoCompositionStateHandler;
} catch (e) {
  console.warn('AutoCompositionStateHandler not available, using mock');
  // For now, we'll skip auto composition if not available
  AutoCompositionStateHandler = null;
}


export class PipelineOrchestrator {
  private stateMachine: PipelineStateMachine;
  private stateStore: PipelineStateStore;
  private serverStore: ServerPipelineStore;
  private historyManager: StateHistoryManager;
  private stateHandlers: StateHandler[] = [];

  /**
   * Create a new PipelineOrchestrator
   * @param creatifyApiId Creatify API ID
   * @param creatifyApiKey Creatify API Key
   * @param pipelineId Optional pipeline ID (for restoring an existing pipeline)
   */
  constructor(
    creatifyApiId?: string,
    creatifyApiKey?: string,
    pipelineId?: string
  ) {
    // Initialize storage components
    this.stateStore = new PipelineStateStore();
    this.serverStore = new ServerPipelineStore();
    this.historyManager = new StateHistoryManager();

    // Initialize state machine with empty context for now
    // We'll load the actual context in the initialize method
    this.stateMachine = new PipelineStateMachine();

    // Initialize state handlers with environment validation
    const environment = getPipelineEnvironment();
    this.initializeStateHandlers(
      creatifyApiId || environment.creatifyApiId || '',
      creatifyApiKey || environment.creatifyApiKey || ''
    );

    // Set up listeners
    this.setupListeners();
  }

  /**
   * Initialize the orchestrator (async operations)
   * @param pipelineId Optional pipeline ID to restore
   */
  async initialize(pipelineId?: string): Promise<void> {
    if (pipelineId) {
      const savedContext = await this.serverStore.getPipeline(pipelineId);
      if (!savedContext) {
        throw new Error(`Pipeline with ID ${pipelineId} not found`);
      }
      this.stateMachine = new PipelineStateMachine(savedContext);
    }
  }

  /**
   * Initialize all state handlers
   * @param creatifyApiId Creatify API ID
   * @param creatifyApiKey Creatify API Key
   */
  private initializeStateHandlers(creatifyApiId: string, creatifyApiKey: string): void {
    // Script generation handler
    this.stateHandlers.push(new ScriptGeneratorStateHandler());

    // Avatar generation handler
    if (isCreatifyAvailable() && creatifyApiId && creatifyApiKey && AvatarGeneratorStateHandler !== MockAvatarGeneratorStateHandler) {
      // Use real handler with API credentials
      console.log('Initializing real avatar generation handler');
      this.stateHandlers.push(new AvatarGeneratorStateHandler(
        creatifyApiId,
        creatifyApiKey
      ));
    } else {
      // Use mock handler (either no credentials or real handler not available)
      console.warn('Using mock avatar generation handler');
      this.stateHandlers.push(new MockAvatarGeneratorStateHandler());
    }

    // Auto composition handler (optional)
    if (AutoCompositionStateHandler) {
      try {
        this.stateHandlers.push(new AutoCompositionStateHandler());
      } catch (error) {
        console.warn('AutoCompositionStateHandler failed to initialize:', error);
      }
    } else {
      console.warn('AutoCompositionStateHandler not available');
    }
  }

  /**
   * Set up state transition listeners
   */
  private setupListeners(): void {
    // Save state on every transition
    this.stateMachine.onTransition((event) => {
      this.stateStore.savePipeline(event.context);
    });
  }

  /**
   * Start a new pipeline with a blog post
   * @param blog Blog post to process
   * @returns The pipeline context
   */
  async startPipeline(blog: BlogPost): Promise<PipelineContext> {
    // Create initial context with the blog
    const context = this.stateMachine.getContext();

    // Update context with blog
    const updatedContext = {
      ...context,
      blog
    };

    // Update the state machine with the blog
    this.stateMachine = new PipelineStateMachine(updatedContext);

    // Save initial state to both client and server storage
    const initialContext = this.stateMachine.getContext();
    this.stateStore.savePipeline(initialContext);
    await this.serverStore.savePipeline(initialContext);

    return initialContext;
  }

  /**
   * Execute a specific action in the pipeline
   * @param action Action to execute
   * @param payload Additional payload for the action
   * @returns Updated pipeline context
   */
  async executeAction(
    action: PipelineAction,
    payload: any = {}
  ): Promise<PipelineContext> {
    const currentState = this.stateMachine.getCurrentState();

    // Find the appropriate handler for the current state
    const handler = this.findHandlerForState(currentState);
    if (!handler) {
      throw new Error(`No handler found for state ${currentState}`);
    }

    try {
      // Execute the action using the handler
      const context = this.stateMachine.getContext();
      const updatedContext = await handler.handleTransition(action, {
        ...context,
        ...payload
      });

      // Transition the state machine based on the action
      const finalContext = await this.stateMachine.transition(action, updatedContext);

      // Save the updated context to both client and server storage
      this.stateStore.savePipeline(finalContext);
      await this.serverStore.savePipeline(finalContext);

      return finalContext;
    } catch (error) {
      // Handle error by transitioning to error state
      console.error(`Error executing action ${action}:`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const errorContext = await this.stateMachine.transition(
        PipelineAction.HANDLE_ERROR,
        {
          error: {
            message: errorMessage,
            state: currentState,
            action,
            timestamp: new Date().toISOString()
          }
        }
      );

      // Save the error state to both client and server storage
      this.stateStore.savePipeline(errorContext);
      await this.serverStore.savePipeline(errorContext);

      throw error;
    }
  }

  /**
   * Go back to a previous state in the pipeline
   * @param targetState State to go back to
   * @returns Updated pipeline context
   */
  async restartFromState(targetState: PipelineState): Promise<PipelineContext> {
    const updatedContext = await this.stateMachine.goBackToState(targetState);

    // Save the updated context to both client and server storage
    this.stateStore.savePipeline(updatedContext);
    await this.serverStore.savePipeline(updatedContext);

    return updatedContext;
  }

  /**
   * Get the current pipeline context
   * @returns Current pipeline context
   */
  getContext(): PipelineContext {
    return this.stateMachine.getContext();
  }

  /**
   * Get all valid actions from the current state
   * @returns Array of valid actions
   */
  getValidActions(): PipelineAction[] {
    return this.stateMachine.getValidActions();
  }

  /**
   * Get the audit trail for the pipeline
   * @returns Array of audit trail entries
   */
  getAuditTrail(): string[] {
    return this.historyManager.getAuditTrail(this.stateMachine.getContext());
  }

  /**
   * Get all pipelines from server storage
   * @returns Array of pipeline contexts
   */
  async getAllPipelines(): Promise<PipelineContext[]> {
    return await this.serverStore.getAllPipelines();
  }

  /**
   * Delete a pipeline from server storage
   * @param id Pipeline ID
   * @returns True if deleted successfully
   */
  async deletePipeline(id: string): Promise<boolean> {
    return await this.serverStore.deletePipeline(id);
  }

  /**
   * Get pipeline summaries for management UI
   * @returns Array of pipeline summaries
   */
  async getPipelineSummaries(): Promise<Array<{
    id: string;
    blogTitle: string;
    currentState: string;
    createdAt: string;
    updatedAt: string;
  }>> {
    return await this.serverStore.getPipelineSummaries();
  }

  /**
   * Find the appropriate handler for a state
   * @param state State to find handler for
   * @returns State handler or undefined if not found
   */
  private findHandlerForState(state: PipelineState): StateHandler | undefined {
    return this.stateHandlers.find(handler => handler.canHandle(state));
  }
}
