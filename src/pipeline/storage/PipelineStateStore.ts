/**
 * Pipeline State Store
 * 
 * Provides persistent storage for pipeline state across browser sessions.
 * Uses localStorage for client-side persistence and provides methods for
 * saving, loading, and managing pipeline state.
 */

import { PipelineContext, PipelineState } from '../types';

export class PipelineStateStore {
  private readonly storageKey = 'horizon-blog-to-video-pipelines';
  
  /**
   * Save a pipeline context to storage
   * @param context Pipeline context to save
   */
  savePipeline(context: PipelineContext): void {
    // Get existing pipelines
    const pipelines = this.getAllPipelines();
    
    // Update or add the pipeline
    const existingIndex = pipelines.findIndex(p => p.id === context.id);
    if (existingIndex >= 0) {
      pipelines[existingIndex] = context;
    } else {
      pipelines.push(context);
    }
    
    // Save back to storage
    this.savePipelines(pipelines);
  }
  
  /**
   * Get a pipeline context by ID
   * @param id Pipeline ID
   * @returns Pipeline context or undefined if not found
   */
  getPipeline(id: string): PipelineContext | undefined {
    const pipelines = this.getAllPipelines();
    return pipelines.find(p => p.id === id);
  }
  
  /**
   * Get all pipeline contexts
   * @returns Array of pipeline contexts
   */
  getAllPipelines(): PipelineContext[] {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      
      return parsed as PipelineContext[];
    } catch (error) {
      console.error('Error loading pipelines from storage:', error);
      return [];
    }
  }
  
  /**
   * Delete a pipeline by ID
   * @param id Pipeline ID
   * @returns True if deleted, false if not found
   */
  deletePipeline(id: string): boolean {
    const pipelines = this.getAllPipelines();
    const initialLength = pipelines.length;
    
    const filtered = pipelines.filter(p => p.id !== id);
    if (filtered.length !== initialLength) {
      this.savePipelines(filtered);
      return true;
    }
    
    return false;
  }
  
  /**
   * Get all active pipelines (not in READY_FOR_PUBLISHING or ERROR state)
   * @returns Array of active pipeline contexts
   */
  getActivePipelines(): PipelineContext[] {
    const pipelines = this.getAllPipelines();
    return pipelines.filter(p => 
      p.currentState !== PipelineState.READY_FOR_PUBLISHING && 
      p.currentState !== PipelineState.ERROR
    );
  }
  
  /**
   * Get all completed pipelines (in READY_FOR_PUBLISHING state)
   * @returns Array of completed pipeline contexts
   */
  getCompletedPipelines(): PipelineContext[] {
    const pipelines = this.getAllPipelines();
    return pipelines.filter(p => p.currentState === PipelineState.READY_FOR_PUBLISHING);
  }
  
  /**
   * Get all pipelines in error state
   * @returns Array of pipeline contexts in error state
   */
  getErrorPipelines(): PipelineContext[] {
    const pipelines = this.getAllPipelines();
    return pipelines.filter(p => p.currentState === PipelineState.ERROR);
  }
  
  /**
   * Clean up old pipelines (keep only recent 50)
   * @param maxToKeep Maximum number of pipelines to keep (default 50)
   * @returns Number of pipelines removed
   */
  cleanupOldPipelines(maxToKeep: number = 50): number {
    const pipelines = this.getAllPipelines();
    if (pipelines.length <= maxToKeep) {
      return 0;
    }
    
    // Sort by updatedAt timestamp (newest first)
    const sorted = [...pipelines].sort((a, b) => 
      new Date(b.metadata.updatedAt).getTime() - 
      new Date(a.metadata.updatedAt).getTime()
    );
    
    // Keep only the most recent pipelines
    const toKeep = sorted.slice(0, maxToKeep);
    this.savePipelines(toKeep);
    
    return pipelines.length - toKeep.length;
  }
  
  /**
   * Save pipelines to storage
   * @param pipelines Array of pipeline contexts to save
   * @private
   */
  private savePipelines(pipelines: PipelineContext[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(pipelines));
    } catch (error) {
      console.error('Error saving pipelines to storage:', error);
    }
  }
}
