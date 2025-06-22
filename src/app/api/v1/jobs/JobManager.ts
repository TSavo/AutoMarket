/**
 * Job Manager for Async Operations
 * Manages generation jobs and their status with full generation_prompt lineage
 */

import { GenerationResult, JobStatus } from '../../../../media/types/provider';
import { GenerationPrompt } from '../../../../media/assets/Asset';

export interface GenerationChainStep {
  step: number;
  asset_type: string;
  model?: string;
  provider?: string;
  timestamp: Date;
  options?: any;
  content?: string; // For original sources (text content)
}

export interface JobAssetUrls {
  primary?: string;           // Main asset download URL
  thumbnails?: string[];      // Different thumbnail sizes
  previews?: string[];        // Different preview formats  
  metadata?: string;          // Full metadata endpoint
}

export interface Job {
  id: string;
  providerId: string;
  modelId: string;
  capability: string;
  status: JobStatus;
  
  // Transform specification - matches model.transform() signature exactly
  input: any;                 // RAW Role object(s) with generation_prompt chains
  options?: any;              // Transform parameters
  
  // Execution tracking
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  updatedAt: Date;
  processingTime?: number;
  
  // Results with full lineage
  output?: any;               // Role object with embedded generation_prompt
  generation_chain?: GenerationChainStep[]; // Flattened lineage for API consumption
  
  // Binary asset URLs (for non-text outputs)
  urls?: JobAssetUrls;
  
  // Error handling
  error?: string;
  progress?: number;
}

class JobManager {
  private static instance: JobManager;
  private jobs = new Map<string, Job>();

  static getInstance(): JobManager {
    if (!JobManager.instance) {
      JobManager.instance = new JobManager();
    }
    return JobManager.instance;
  }

  createJob(
    id: string,
    providerId: string,
    modelId: string,
    capability: string,
    input: any,
    options?: any
  ): Job {
    const job: Job = {
      id,
      providerId,
      modelId,
      capability,
      input,
      options,
      status: JobStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.jobs.set(id, job);
    return job;
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  updateJob(id: string, updates: Partial<Job>): Job | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    const updatedJob = {
      ...job,
      ...updates,
      updatedAt: new Date()
    };

    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }

  getJobsByStatus(status: JobStatus): Job[] {
    return this.getAllJobs().filter(job => job.status === status);
  }

  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - maxAge);
    for (const [id, job] of this.jobs.entries()) {
      if (job.updatedAt < cutoff && job.status !== JobStatus.RUNNING) {
        this.jobs.delete(id);
      }
    }
  }

  /**
   * Flatten the generation_prompt chain from an asset into a consumable array
   */
  extractGenerationChain(asset: any): GenerationChainStep[] {
    const chain: GenerationChainStep[] = [];
    let currentAsset = asset;
    let stepNumber = 1;
    const maxDepth = 20; // Prevent infinite loops

    while (currentAsset?.metadata?.generation_prompt && stepNumber <= maxDepth) {
      const gp = currentAsset.metadata.generation_prompt;
      
      chain.push({
        step: stepNumber,
        asset_type: currentAsset.constructor.name,
        model: gp.modelName || gp.modelId,
        provider: gp.provider,
        timestamp: new Date(gp.timestamp),
        options: gp.options
      });

      currentAsset = gp.input;
      stepNumber++;
    }

    // Add the original source (no generation_prompt)
    if (currentAsset && stepNumber <= maxDepth) {
      chain.push({
        step: stepNumber,
        asset_type: currentAsset.constructor?.name || 'Unknown',
        timestamp: currentAsset.metadata?.createdAt || new Date(),
        content: typeof currentAsset.content === 'string' ? 
          currentAsset.content.substring(0, 100) + (currentAsset.content.length > 100 ? '...' : '') : 
          '[Binary data]'
      });
    }

    return chain;
  }

  /**
   * Generate URLs for binary assets
   */
  generateAssetUrls(jobId: string, asset: any): JobAssetUrls | undefined {
    // Only generate URLs for binary assets (not text)
    if (asset.constructor.name === 'Text') {
      return undefined;
    }

    const urls: JobAssetUrls = {
      primary: `/api/v1/jobs/${jobId}/download`,
      metadata: `/api/v1/jobs/${jobId}/metadata`
    };

    // Add format-specific URLs based on asset type
    if (asset.constructor.name === 'Image') {
      urls.thumbnails = [
        `/api/v1/jobs/${jobId}/thumbnails/small`,
        `/api/v1/jobs/${jobId}/thumbnails/medium`
      ];
      urls.previews = [
        `/api/v1/jobs/${jobId}/previews/jpeg`,
        `/api/v1/jobs/${jobId}/previews/png`
      ];
    } else if (asset.constructor.name === 'Audio') {
      urls.previews = [
        `/api/v1/jobs/${jobId}/previews/mp3`,
        `/api/v1/jobs/${jobId}/previews/wav`
      ];
    } else if (asset.constructor.name === 'Video') {
      urls.thumbnails = [
        `/api/v1/jobs/${jobId}/thumbnails/small`,
        `/api/v1/jobs/${jobId}/thumbnails/large`
      ];
      urls.previews = [
        `/api/v1/jobs/${jobId}/previews/mp4`,
        `/api/v1/jobs/${jobId}/previews/webm`
      ];
    }

    return urls;
  }

  /**
   * Complete a job with the output asset and automatic chain/URL generation
   */
  completeJobWithAsset(jobId: string, output: any, processingTime?: number): Job | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;

    const generation_chain = this.extractGenerationChain(output);
    const urls = this.generateAssetUrls(jobId, output);

    const updatedJob = {
      ...job,
      status: JobStatus.COMPLETED,
      output,
      generation_chain,
      urls,
      processingTime,
      completedAt: new Date(),
      updatedAt: new Date()
    };

    this.jobs.set(jobId, updatedJob);
    return updatedJob;
  }
}

export default JobManager;
