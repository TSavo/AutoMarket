import { NextRequest, NextResponse } from 'next/server';
import JobManager from '../JobManager';
import { JobStatus } from '../../../../../media/types/provider';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  
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
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        updatedAt: job.updatedAt,
        processingTime: job.processingTime,
        providerId: job.providerId,
        modelId: job.modelId,
        capability: job.capability,
        
        // Input specification (for debugging/tracing)
        input_type: job.input?.constructor?.name,
        options: job.options,
        
        // Output data (inline for text, URLs for binary)
        output: job.output?.constructor?.name === 'Text' ? {
          type: 'text',
          content: job.output.content,
          metadata: job.output.metadata
        } : job.output ? {
          type: job.output.constructor.name.toLowerCase(),
          format: job.output.format,
          metadata: {
            fileSize: job.output.metadata?.fileSize,
            duration: job.output.metadata?.duration,
            dimensions: job.output.metadata?.dimensions
          }
        } : undefined,
        
        // URLs for binary assets
        urls: job.urls,
        
        // Flattened generation chain for easy consumption
        generation_chain: job.generation_chain,
        
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
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  
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
