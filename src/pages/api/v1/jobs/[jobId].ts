import type { NextApiRequest, NextApiResponse } from 'next';
import JobManager from '../JobManager';
import { JobStatus } from '../../../media/types/provider';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { jobId } = req.query;
  
  if (typeof jobId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Job ID must be a string'
    });
  }

  const jobManager = JobManager.getInstance();

  switch (req.method) {
    case 'GET':
      try {
        const job = jobManager.getJob(jobId);
        
        if (!job) {
          return res.status(404).json({
            success: false,
            error: `Job '${jobId}' not found`
          });
        }

        res.status(200).json({
          success: true,
          data: {
            jobId: job.id,
            status: job.status,
            progress: job.progress,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            providerId: job.providerId,
            modelId: job.modelId,
            capability: job.capability,
            result: job.result,
            error: job.error
          }
        });
      } catch (error) {
        console.error(`Error fetching job ${jobId}:`, error);
        res.status(500).json({
          success: false,
          error: `Failed to fetch job ${jobId}`
        });
      }
      break;

    case 'DELETE':
      try {
        const job = jobManager.getJob(jobId);
        
        if (!job) {
          return res.status(404).json({
            success: false,
            error: `Job '${jobId}' not found`
          });
        }

        if (job.status === 'running') {
          // Update to cancelled status
          jobManager.updateJob(jobId, { status: JobStatus.CANCELLED });
        }

        res.status(200).json({
          success: true,
          message: `Job '${jobId}' cancelled`
        });
      } catch (error) {
        console.error(`Error cancelling job ${jobId}:`, error);
        res.status(500).json({
          success: false,
          error: `Failed to cancel job ${jobId}`
        });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'DELETE']);
      res.status(405).json({
        success: false,
        error: `Method ${req.method} not allowed`
      });
  }
}
