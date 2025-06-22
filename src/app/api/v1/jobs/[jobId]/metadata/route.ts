import { NextRequest, NextResponse } from 'next/server';
import JobManager from '../../JobManager';
import { JobStatus } from '../../../../../../media/types/provider';

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

    if (job.status !== JobStatus.COMPLETED || !job.output) {
      return NextResponse.json(
        {
          success: false,
          error: `Job '${jobId}' is not completed or has no output`
        },
        { status: 400 }
      );
    }

    // Return the complete metadata including the full generation_prompt
    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        asset_type: job.output.constructor.name,
        format: job.output.format,
        
        // Complete metadata with full generation_prompt chain
        metadata: job.output.metadata,
        
        // Flattened chain for convenience
        generation_chain: job.generation_chain,
        
        // Job execution details
        execution: {
          providerId: job.providerId,
          modelId: job.modelId,
          capability: job.capability,
          processingTime: job.processingTime,
          createdAt: job.createdAt,
          completedAt: job.completedAt
        }
      }
    });

  } catch (error) {
    console.error('Metadata endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
