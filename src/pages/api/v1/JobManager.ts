/**
 * Job Manager for Async Operations
 * Manages generation jobs and their status
 */

import { GenerationResult, JobStatus } from '../../../media/types/provider';

export interface Job {
  id: string;
  providerId: string;
  modelId: string;
  capability: string;
  status: JobStatus;
  createdAt: Date;
  updatedAt: Date;
  result?: GenerationResult;
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
    capability: string
  ): Job {
    const job: Job = {
      id,
      providerId,
      modelId,
      capability,
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
}

export default JobManager;
