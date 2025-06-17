/**
 * State History Manager
 * 
 * Manages the history of state transitions for pipelines.
 * Provides functionality for tracking, querying, and analyzing state history.
 */

import { 
  PipelineContext, 
  PipelineState, 
  PipelineAction,
  StateHistoryEntry,
  StateTransitionEvent
} from '../types';

export class StateHistoryManager {
  /**
   * Get the entire history for a pipeline
   * @param context Pipeline context
   * @returns Array of history entries
   */
  getHistory(context: PipelineContext): StateHistoryEntry[] {
    return [...context.history];
  }
  
  /**
   * Get a filtered history for a pipeline
   * @param context Pipeline context
   * @param filterState Optional state to filter by
   * @param filterAction Optional action to filter by
   * @returns Filtered array of history entries
   */
  getFilteredHistory(
    context: PipelineContext,
    filterState?: PipelineState,
    filterAction?: PipelineAction
  ): StateHistoryEntry[] {
    return context.history.filter(entry => {
      if (filterState && entry.state !== filterState) {
        return false;
      }
      if (filterAction && entry.action !== filterAction) {
        return false;
      }
      return true;
    });
  }
  
  /**
   * Get history entries within a specific time range
   * @param context Pipeline context
   * @param startTime Start time (ISO string or Date)
   * @param endTime End time (ISO string or Date)
   * @returns Filtered array of history entries within the time range
   */
  getHistoryInTimeRange(
    context: PipelineContext,
    startTime: string | Date,
    endTime: string | Date
  ): StateHistoryEntry[] {
    const startTimestamp = typeof startTime === 'string' 
      ? new Date(startTime).getTime() 
      : startTime.getTime();
      
    const endTimestamp = typeof endTime === 'string'
      ? new Date(endTime).getTime()
      : endTime.getTime();
      
    return context.history.filter(entry => {
      const entryTimestamp = new Date(entry.timestamp).getTime();
      return entryTimestamp >= startTimestamp && entryTimestamp <= endTimestamp;
    });
  }
  
  /**
   * Get the last occurrence of a specific state in the history
   * @param context Pipeline context
   * @param state State to find
   * @returns History entry or undefined if not found
   */
  getLastOccurrenceOfState(
    context: PipelineContext,
    state: PipelineState
  ): StateHistoryEntry | undefined {
    // Search backward through the history for the specified state
    for (let i = context.history.length - 1; i >= 0; i--) {
      const entry = context.history[i];
      if (entry.state === state || entry.metadata?.to === state) {
        return entry;
      }
    }
    
    return undefined;
  }
  
  /**
   * Add a new history entry to the context
   * @param context Pipeline context
   * @param event State transition event
   * @returns Updated context with new history entry
   */
  addHistoryEntry(
    context: PipelineContext,
    event: StateTransitionEvent
  ): PipelineContext {
    const historyEntry: StateHistoryEntry = {
      state: event.from,
      action: event.action,
      timestamp: event.timestamp,
      metadata: { to: event.to }
    };
    
    return {
      ...context,
      history: [...context.history, historyEntry]
    };
  }
  
  /**
   * Calculate total time spent in each state
   * @param context Pipeline context
   * @returns Map of states to milliseconds spent
   */
  calculateTimeInStates(context: PipelineContext): Map<PipelineState, number> {
    const result = new Map<PipelineState, number>();
    const history = [...context.history];
    
    // Add current state as the final entry
    const now = new Date().toISOString();
    history.push({
      state: context.currentState,
      action: PipelineAction.RESTART_FROM_STATE, // Placeholder action
      timestamp: now
    });
    
    // Initialize all states to 0
    Object.values(PipelineState).forEach(state => {
      result.set(state as PipelineState, 0);
    });
    
    // Calculate time between consecutive entries
    for (let i = 1; i < history.length; i++) {
      const prevEntry = history[i - 1];
      const currentEntry = history[i];
      
      const prevState = prevEntry.state;
      const prevTime = new Date(prevEntry.timestamp).getTime();
      const currentTime = new Date(currentEntry.timestamp).getTime();
      
      const timeSpent = currentTime - prevTime;
      
      // Add time to the state
      const currentTotal = result.get(prevState) || 0;
      result.set(prevState, currentTotal + timeSpent);
    }
    
    return result;
  }
  
  /**
   * Get the audit trail in a human-readable format
   * @param context Pipeline context
   * @returns Array of human-readable audit entries
   */
  getAuditTrail(context: PipelineContext): string[] {
    return context.history.map(entry => {
      const timestamp = new Date(entry.timestamp).toLocaleString();
      const to = entry.metadata?.to || '';
      
      return `[${timestamp}] ${entry.state} → ${to || 'same'} (Action: ${entry.action})`;
    });
  }
  
  /**
   * Clear the history from a specific point
   * @param context Pipeline context
   * @param fromTimestamp Timestamp to clear from
   * @returns Updated context with trimmed history
   */
  clearHistoryFrom(
    context: PipelineContext,
    fromTimestamp: string
  ): PipelineContext {
    const timestamp = new Date(fromTimestamp).getTime();
    
    const newHistory = context.history.filter(entry => 
      new Date(entry.timestamp).getTime() < timestamp
    );
    
    return {
      ...context,
      history: newHistory
    };
  }
}
