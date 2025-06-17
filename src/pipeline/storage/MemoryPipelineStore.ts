/**
 * In-Memory Pipeline Storage
 * 
 * Provides in-memory storage for pipeline state as a fallback when
 * file system storage is not available (e.g., serverless environments).
 * This can be easily replaced with a database implementation.
 */

import { PipelineContext } from '../types';

class MemoryPipelineStore {
  private static instance: MemoryPipelineStore;
  private pipelines: Map<string, PipelineContext> = new Map();
  
  private constructor() {}
  
  static getInstance(): MemoryPipelineStore {
    if (!MemoryPipelineStore.instance) {
      MemoryPipelineStore.instance = new MemoryPipelineStore();
    }
    return MemoryPipelineStore.instance;
  }
  
  /**
   * Save a pipeline context to memory
   * @param context Pipeline context to save
   */
  async savePipeline(context: PipelineContext): Promise<void> {
    this.pipelines.set(context.id, { ...context });
    console.log(`Pipeline ${context.id} saved to memory store`);
  }
  
  /**
   * Get a pipeline context by ID
   * @param id Pipeline ID
   * @returns Pipeline context or null if not found
   */
  async getPipeline(id: string): Promise<PipelineContext | null> {
    const pipeline = this.pipelines.get(id);
    return pipeline ? { ...pipeline } : null;
  }
  
  /**
   * Get all pipeline contexts
   * @returns Array of pipeline contexts
   */
  async getAllPipelines(): Promise<PipelineContext[]> {
    const pipelines = Array.from(this.pipelines.values());
    
    // Sort by creation date (newest first)
    return pipelines
      .map(p => ({ ...p })) // Clone to prevent mutations
      .sort((a, b) => 
        new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime()
      );
  }
  
  /**
   * Delete a pipeline by ID
   * @param id Pipeline ID
   * @returns True if deleted, false if not found
   */
  async deletePipeline(id: string): Promise<boolean> {
    const existed = this.pipelines.has(id);
    this.pipelines.delete(id);
    
    if (existed) {
      console.log(`Pipeline ${id} deleted from memory store`);
    }
    
    return existed;
  }
  
  /**
   * Check if a pipeline exists
   * @param id Pipeline ID
   * @returns True if pipeline exists
   */
  async pipelineExists(id: string): Promise<boolean> {
    return this.pipelines.has(id);
  }
  
  /**
   * Get pipeline summary (without full content for performance)
   * @returns Array of pipeline summaries
   */
  async getPipelineSummaries(): Promise<Array<{
    id: string;
    blogTitle: string;
    currentState: string;
    createdAt: string;
    updatedAt: string;
  }>> {
    const pipelines = await this.getAllPipelines();
    
    return pipelines.map(pipeline => ({
      id: pipeline.id,
      blogTitle: pipeline.blog?.title || 'Unknown Blog',
      currentState: pipeline.currentState,
      createdAt: pipeline.metadata.createdAt,
      updatedAt: pipeline.metadata.updatedAt
    }));
  }
  
  /**
   * Clear all pipelines (useful for testing)
   */
  async clearAll(): Promise<void> {
    this.pipelines.clear();
    console.log('All pipelines cleared from memory store');
  }
  
  /**
   * Get storage statistics
   */
  getStats(): {
    totalPipelines: number;
    memoryUsage: string;
  } {
    const totalPipelines = this.pipelines.size;
    const memoryUsage = `${Math.round(JSON.stringify(Array.from(this.pipelines.values())).length / 1024)}KB`;
    
    return {
      totalPipelines,
      memoryUsage
    };
  }
}

export { MemoryPipelineStore };
