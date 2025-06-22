import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import ProviderRegistry from '../../../providers/ProviderRegistry';
import JobManager from '../../../jobs/JobManager';
import { GenerationRequestSchema, MediaCapability, JobStatus } from '../../../../../../media/types/provider';

export async function POST(
  request: NextRequest,
  { params }: { params: { providerId: string; modelId: string } }
) {
  const { providerId, modelId } = params;
  
  if (!providerId || !modelId || typeof providerId !== 'string' || typeof modelId !== 'string') {
    return NextResponse.json(
      {
        success: false,
        error: 'Provider ID and Model ID must be strings'
      },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = GenerationRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const generationRequest = validationResult.data;

    // Get provider
    const registry = ProviderRegistry.getInstance();
    const provider = registry.getProvider(providerId);
    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          error: `Provider '${providerId}' not found`
        },
        { status: 404 }
      );
    }

    // Check if provider is available
    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      return NextResponse.json(
        {
          success: false,
          error: `Provider '${providerId}' is not available`
        },
        { status: 503 }
      );
    }

    // Get model
    const model = provider.models.find(m => m.id === modelId);
    if (!model) {
      return NextResponse.json(
        {
          success: false,
          error: `Model '${modelId}' not found in provider '${providerId}'`
        },
        { status: 404 }
      );
    }

    // Check if model supports the requested capability
    if (!model.capabilities.includes(generationRequest.capability)) {
      return NextResponse.json(
        {
          success: false,
          error: `Model '${modelId}' does not support capability '${generationRequest.capability}'`
        },
        { status: 400 }
      );
    }

    // Create job
    const jobManager = JobManager.getInstance();
    const jobId = uuidv4();
    const job = jobManager.createJob(jobId, providerId, modelId, generationRequest.capability);

    // Start transformation (async)
    processTransformation(provider, model, generationRequest, jobId, jobManager)
      .catch(error => {
        console.error(`Transformation job ${jobId} failed:`, error);
        jobManager.updateJob(jobId, {
          status: JobStatus.FAILED,
          error: error.message
        });
      });

    return NextResponse.json(
      {
        success: true,
        data: {
          jobId,
          status: job.status,
          message: 'Transformation started',
          statusUrl: `/api/v1/jobs/${jobId}`
        }
      },
      { status: 202 }
    );

  } catch (error) {
    console.error('Transform endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

async function processTransformation(
  provider: any,
  model: any,
  request: any,
  jobId: string,
  jobManager: JobManager
) {
  try {
    // Update job status to running
    jobManager.updateJob(jobId, { status: JobStatus.RUNNING });
    
    // TODO: Implement actual transformation logic here
    throw new Error('Transformation logic not yet implemented');

  } catch (error) {
    jobManager.updateJob(jobId, {
      status: JobStatus.FAILED,
      error: error.message
    });
    throw error;
  }
}
