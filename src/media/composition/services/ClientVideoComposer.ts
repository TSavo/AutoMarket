/**
 * ClientVideoComposer.ts
 * 
 * This is a client-side wrapper for the VideoComposer service.
 * It uses API calls instead of direct file system access.
 */

import { CompositionOptions } from './VideoComposer';

export interface CompositionJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: {
    url: string;
    thumbnailUrl?: string;
  };
  error?: string;
}

export class ClientVideoComposer {
  /**
   * Start a video composition job
   */
  async composeVideo(options: CompositionOptions): Promise<CompositionJob> {
    try {
      const response = await fetch('/api/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'compose',
          options,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start composition');
      }

      const data = await response.json();
      return {
        jobId: data.jobId,
        status: 'pending',
      };
    } catch (error) {
      console.error('Error starting composition:', error);
      return {
        jobId: 'error',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the status of a composition job
   */
  async getJobStatus(jobId: string): Promise<CompositionJob> {
    try {
      const response = await fetch(`/api/media/jobs/${jobId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get job status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting job status:', error);
      return {
        jobId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cancel a composition job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/media/jobs/${jobId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel job');
      }

      return true;
    } catch (error) {
      console.error('Error canceling job:', error);
      return false;
    }
  }
}
