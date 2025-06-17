/**
 * Shared progress tracking store for FFMPEG operations
 * Used by both preview API and progress API
 */

export interface ProgressData {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  message?: string;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  estimatedTimeRemaining?: number;
}

// In-memory store for progress tracking (in production, use Redis or similar)
const progressStore = new Map<string, ProgressData>();

// Cleanup old entries periodically (prevent memory leaks)
setInterval(() => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  for (const [jobId, data] of progressStore.entries()) {
    if (data.endTime && data.endTime < oneHourAgo) {
      progressStore.delete(jobId);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

/**
 * Update progress for a job
 */
export function updateProgress(jobId: string, updates: Partial<ProgressData>): void {
  const existingData = progressStore.get(jobId) || {
    status: 'pending' as const,
    progress: 0
  };
  
  const updatedData: ProgressData = {
    ...existingData,
    ...updates
  };

  // Set timestamps
  if (updates.status === 'processing' && !existingData.startTime) {
    updatedData.startTime = new Date();
  }
  if (updates.status === 'completed' || updates.status === 'failed') {
    updatedData.endTime = new Date();
  }

  progressStore.set(jobId, updatedData);
}

/**
 * Get progress for a job
 */
export function getProgress(jobId: string): ProgressData | undefined {
  return progressStore.get(jobId);
}

/**
 * Check if job exists
 */
export function hasJob(jobId: string): boolean {
  return progressStore.has(jobId);
}

/**
 * Delete a job
 */
export function deleteJob(jobId: string): boolean {
  return progressStore.delete(jobId);
}
