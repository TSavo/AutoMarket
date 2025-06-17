/**
 * ProcessingQueue.ts
 * 
 * Manages video processing tasks to prevent resource overload
 */

import { EventEmitter } from 'events';

/**
 * Status of a job in the queue
 */
export enum JobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Processing job interface
 */
export interface ProcessingJob<T = any> {
  id: string;
  status: JobStatus;
  progress: number;
  startTime?: number;
  endTime?: number;
  data: T;
  result?: any;
  error?: Error;
}

/**
 * Processing task function
 */
export type ProcessingTask<T = any, R = any> = (
  job: ProcessingJob<T>, 
  updateProgress: (progress: number) => void
) => Promise<R>;

/**
 * Processing queue options
 */
export interface ProcessingQueueOptions {
  maxConcurrent: number;
  autoStart: boolean;
  onJobStatusChange?: (job: ProcessingJob) => void;
  jobTimeoutMs?: number;
}

/**
 * Processing queue for managing video processing tasks
 */
export class ProcessingQueue extends EventEmitter {
  private jobs: Map<string, ProcessingJob> = new Map();
  private queue: string[] = [];
  private processing: Set<string> = new Set();
  private tasks: Map<string, ProcessingTask> = new Map();
  private options: ProcessingQueueOptions;
  private running: boolean = false;
  private jobTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create a new processing queue
   */
  constructor(options: Partial<ProcessingQueueOptions> = {}) {
    super();
    this.options = {
      maxConcurrent: options.maxConcurrent || 2,
      autoStart: options.autoStart !== undefined ? options.autoStart : true,
      onJobStatusChange: options.onJobStatusChange,
      jobTimeoutMs: options.jobTimeoutMs || 600000 // Default to 10 minutes
    };

    if (this.options.autoStart) {
      this.start();
    }
  }

  /**
   * Add a job to the queue
   */
  public addJob<T = any, R = any>(
    id: string,
    data: T,
    task: ProcessingTask<T, R>
  ): ProcessingJob<T> {
    // Create the job
    const job: ProcessingJob<T> = {
      id,
      status: JobStatus.QUEUED,
      progress: 0,
      data
    };

    // Store the job and task
    this.jobs.set(id, job);
    this.tasks.set(id, task as ProcessingTask);

    // Add to queue
    this.queue.push(id);

    // Notify listeners
    this.emit('jobAdded', job);
    this.updateJobStatus(id, JobStatus.QUEUED);

    // Process the queue if running
    if (this.running) {
      this.processQueue();
    }

    return job;
  }

  /**
   * Get a job by ID
   */
  public getJob<T = any>(id: string): ProcessingJob<T> | undefined {
    return this.jobs.get(id) as ProcessingJob<T>;
  }

  /**
   * Get all jobs
   */
  public getAllJobs(): ProcessingJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Start processing the queue
   */
  public start(): void {
    if (!this.running) {
      this.running = true;
      this.processQueue();
    }
  }

  /**
   * Stop processing the queue
   */
  public stop(): void {
    this.running = false;
  }

  /**
   * Cancel a job
   */
  public cancelJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) {
      return false;
    }

    if (job.status === JobStatus.QUEUED) {
      // Remove from queue
      const index = this.queue.indexOf(id);
      if (index !== -1) {
        this.queue.splice(index, 1);
      }
      this.updateJobStatus(id, JobStatus.CANCELLED);
      return true;
    }

    if (job.status === JobStatus.PROCESSING) {
      // Cancel timeout
      const timeout = this.jobTimeouts.get(id);
      if (timeout) {
        clearTimeout(timeout);
        this.jobTimeouts.delete(id);
      }
      
      // Mark as cancelled
      this.processing.delete(id);
      this.updateJobStatus(id, JobStatus.CANCELLED);

      // Process next job
      this.processQueue();
      return true;
    }

    return false;
  }

  /**
   * Clear job history to prevent memory leaks
   * Retains active and recent jobs
   */
  public cleanupJobs(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [id, job] of this.jobs.entries()) {
      // Skip active jobs
      if (job.status === JobStatus.QUEUED || job.status === JobStatus.PROCESSING) {
        continue;
      }
      
      // Remove old completed/failed/cancelled jobs
      if (job.endTime && (now - job.endTime > maxAge)) {
        // Remove task
        this.tasks.delete(id);
        this.jobs.delete(id);

        // Remove timeout if exists
        const timeout = this.jobTimeouts.get(id);
        if (timeout) {
          clearTimeout(timeout);
          this.jobTimeouts.delete(id);
        }
      }
    }
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (!this.running) {
      return;
    }

    // Process jobs if slots available
    while (this.running && this.processing.size < this.options.maxConcurrent && this.queue.length > 0) {
      const jobId = this.queue.shift();
      if (!jobId) {
        break;
      }

      // Get the job and task
      const job = this.jobs.get(jobId);
      const task = this.tasks.get(jobId);

      if (!job || !task) {
        continue;
      }

      // Mark as processing
      this.processing.add(jobId);
      job.startTime = Date.now();
      this.updateJobStatus(jobId, JobStatus.PROCESSING);

      // Create progress updater
      const updateProgress = (progress: number) => {
        job.progress = Math.max(0, Math.min(100, progress));
        this.emit('jobProgress', job);
      };

      // Set timeout
      const timeout = setTimeout(() => {
        this.handleJobError(jobId, new Error(`Job timed out after ${this.options.jobTimeoutMs}ms`));
      }, this.options.jobTimeoutMs);
      this.jobTimeouts.set(jobId, timeout);

      // Execute the task
      this.executeTask(jobId, job, task, updateProgress);
    }
  }

  /**
   * Execute a task
   */
  private async executeTask(
    id: string,
    job: ProcessingJob,
    task: ProcessingTask,
    updateProgress: (progress: number) => void
  ): Promise<void> {
    try {
      // Execute the task
      const result = await task(job, updateProgress);
      
      // Clear timeout
      const timeout = this.jobTimeouts.get(id);
      if (timeout) {
        clearTimeout(timeout);
        this.jobTimeouts.delete(id);
      }
      
      // Handle completion
      this.handleJobCompletion(id, result);
    } catch (error) {
      // Handle error
      this.handleJobError(id, error);
    }
  }

  /**
   * Handle job completion
   */
  private handleJobCompletion(id: string, result: any): void {
    const job = this.jobs.get(id);
    if (!job) {
      return;
    }

    // Update job
    job.result = result;
    job.endTime = Date.now();
    job.progress = 100;
    
    // Remove from processing
    this.processing.delete(id);
    
    // Update status
    this.updateJobStatus(id, JobStatus.COMPLETED);

    // Process next job
    this.processQueue();
  }

  /**
   * Handle job error
   */
  private handleJobError(id: string, error: any): void {
    const job = this.jobs.get(id);
    if (!job) {
      return;
    }

    // Update job
    job.error = error;
    job.endTime = Date.now();
    
    // Remove from processing
    this.processing.delete(id);
    
    // Update status
    this.updateJobStatus(id, JobStatus.FAILED);

    // Process next job
    this.processQueue();
  }

  /**
   * Update job status
   */
  private updateJobStatus(id: string, status: JobStatus): void {
    const job = this.jobs.get(id);
    if (job) {
      job.status = status;
      
      // Emit event
      this.emit('jobStatusChanged', job);
      
      // Call callback if provided
      if (this.options.onJobStatusChange) {
        this.options.onJobStatusChange(job);
      }
    }
  }
}
