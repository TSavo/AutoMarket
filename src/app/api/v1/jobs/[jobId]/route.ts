import { NextRequest, NextResponse } from 'next/server';
import JobManager from '../JobManager';
import { JobStatus } from '../../../../../media/types/provider';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  
  if (!jobId || typeof jobId !== 'string') {
    return NextResponse.json(
      {
        success: false,
        error: 'Job ID must be a string'
      },
      { status: 400 }
    );
  }

  try {
    const jobManager = JobManager.getInstance();
    const job = jobManager.getJob(jobId);
    
    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: `Job '${jobId}' not found`
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
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
    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch job ${jobId}`
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  
  if (!jobId || typeof jobId !== 'string') {
    return NextResponse.json(
      {
        success: false,
        error: 'Job ID must be a string'
      },
      { status: 400 }
    );
  }

  try {
    const jobManager = JobManager.getInstance();
    const job = jobManager.getJob(jobId);
    
    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: `Job '${jobId}' not found`
        },
        { status: 404 }
      );
    }

    if (job.status === 'running') {
      // Update to cancelled status
      jobManager.updateJob(jobId, { status: JobStatus.CANCELLED });
    }

    return NextResponse.json({
      success: true,
      message: `Job '${jobId}' cancelled`
    });
  } catch (error) {
    console.error(`Error cancelling job ${jobId}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to cancel job ${jobId}`
      },
      { status: 500 }
    );
  }
}
