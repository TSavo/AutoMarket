/**
 * Server-side Pipeline Storage
 *
 * Provides persistent storage for pipeline state on the server side.
 * Uses file system for now, but can be easily adapted to use a database.
 */

import fs from 'fs';
import path from 'path';
import { PipelineContext } from '../types';
import { MemoryPipelineStore } from './MemoryPipelineStore';

export class ServerPipelineStore {
  private readonly storageDir: string;
  private readonly memoryStore: MemoryPipelineStore;
  private useFileSystem: boolean;

  constructor() {
    // Store pipelines in a data directory
    this.storageDir = path.join(process.cwd(), 'data', 'pipelines');
    this.memoryStore = MemoryPipelineStore.getInstance();

    // Try to use file system, fall back to memory if not available
    try {
      this.ensureStorageDir();
      this.useFileSystem = true;
      console.log('Using file system storage for pipelines');
    } catch (error) {
      console.warn('File system not available, using memory storage:', error);
      this.useFileSystem = false;
    }
  }

  /**
   * Ensure the storage directory exists
   */
  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Get the file path for a pipeline
   * @param id Pipeline ID
   * @returns File path for the pipeline
   */
  private getPipelineFilePath(id: string): string {
    return path.join(this.storageDir, `${id}.json`);
  }

  /**
   * Save a pipeline context to storage
   * @param context Pipeline context to save
   */
  async savePipeline(context: PipelineContext): Promise<void> {
    if (this.useFileSystem) {
      try {
        const filePath = this.getPipelineFilePath(context.id);
        const data = JSON.stringify(context, null, 2);
        await fs.promises.writeFile(filePath, data, 'utf8');
        return;
      } catch (error) {
        console.warn('File system save failed, falling back to memory:', error);
        this.useFileSystem = false;
      }
    }

    // Use memory storage as fallback
    await this.memoryStore.savePipeline(context);
  }

  /**
   * Get a pipeline context by ID
   * @param id Pipeline ID
   * @returns Pipeline context or null if not found
   */
  async getPipeline(id: string): Promise<PipelineContext | null> {
    if (this.useFileSystem) {
      try {
        const filePath = this.getPipelineFilePath(id);

        if (!fs.existsSync(filePath)) {
          return null;
        }

        const data = await fs.promises.readFile(filePath, 'utf8');
        return JSON.parse(data) as PipelineContext;
      } catch (error) {
        console.warn('File system read failed, falling back to memory:', error);
        this.useFileSystem = false;
      }
    }

    // Use memory storage as fallback
    return await this.memoryStore.getPipeline(id);
  }

  /**
   * Get all pipeline contexts
   * @returns Array of pipeline contexts
   */
  async getAllPipelines(): Promise<PipelineContext[]> {
    if (this.useFileSystem) {
      try {
        const files = await fs.promises.readdir(this.storageDir);
        const pipelineFiles = files.filter(file => file.endsWith('.json'));

        const pipelines: PipelineContext[] = [];

        for (const file of pipelineFiles) {
          try {
            const filePath = path.join(this.storageDir, file);
            const data = await fs.promises.readFile(filePath, 'utf8');
            const pipeline = JSON.parse(data) as PipelineContext;
            pipelines.push(pipeline);
          } catch (error) {
            console.error(`Error loading pipeline file ${file}:`, error);
            // Continue with other files
          }
        }

        // Sort by creation date (newest first)
        return pipelines.sort((a, b) =>
          new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime()
        );
      } catch (error) {
        console.warn('File system read failed, falling back to memory:', error);
        this.useFileSystem = false;
      }
    }

    // Use memory storage as fallback
    return await this.memoryStore.getAllPipelines();
  }

  /**
   * Delete a pipeline by ID
   * @param id Pipeline ID
   * @returns True if deleted, false if not found
   */
  async deletePipeline(id: string): Promise<boolean> {
    try {
      const filePath = this.getPipelineFilePath(id);

      if (!fs.existsSync(filePath)) {
        return false;
      }

      await fs.promises.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting pipeline:', error);
      return false;
    }
  }

  /**
   * Check if a pipeline exists
   * @param id Pipeline ID
   * @returns True if pipeline exists
   */
  async pipelineExists(id: string): Promise<boolean> {
    const filePath = this.getPipelineFilePath(id);
    return fs.existsSync(filePath);
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
    try {
      const pipelines = await this.getAllPipelines();

      return pipelines.map(pipeline => ({
        id: pipeline.id,
        blogTitle: pipeline.blog?.title || 'Unknown Blog',
        currentState: pipeline.currentState,
        createdAt: pipeline.metadata.createdAt,
        updatedAt: pipeline.metadata.updatedAt
      }));
    } catch (error) {
      console.error('Error getting pipeline summaries:', error);
      return [];
    }
  }
}
