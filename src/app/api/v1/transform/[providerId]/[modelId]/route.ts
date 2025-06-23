import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { initializeProviders, ProviderRegistry } from '../../../../../../media/registry/bootstrap';
import JobManager from '../../../jobs/JobManager';
import { MediaCapability, JobStatus } from '../../../../../../media/types/provider';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string; modelId: string }> }
) {
  const { providerId, modelId } = await params;
  
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
    
    // Simple validation - we only need input, capability, and optional options
    if (!body.input || !body.capability) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: input and capability'
        },
        { status: 400 }
      );
    }

    const generationRequest = {
      input: body.input,
      capability: body.capability,
      options: body.options || {}
    };

    // Ensure providers are initialized
    const registry = ProviderRegistry.getInstance();
    if (!registry.getAvailableProviders().length) {
      await initializeProviders();
    }
    
    // Get provider
    if (!registry.hasProvider(providerId)) {
      return NextResponse.json(
        {
          success: false,
          error: `Provider '${providerId}' not found`
        },
        { status: 404 }
      );
    }
    
    const provider = await registry.getProvider(providerId);

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

    // Create job with deserialized input and options
    const jobManager = JobManager.getInstance();
    const jobId = uuidv4();
    
    // Convert input to proper Role objects
    let deserializedInput = generationRequest.input;
    
    // If input has content and is a plain object, convert to Text
    if (deserializedInput && typeof deserializedInput === 'object' && !deserializedInput.asText) {
      try {
        const { Text } = await import('../../../../../../media/assets/roles/classes/Text');
        
        // Handle text input
        if (typeof deserializedInput.content === 'string') {
          deserializedInput = new Text(
            deserializedInput.content,
            deserializedInput.language,
            deserializedInput.confidence,
            deserializedInput.metadata || {}
          );
          console.log(`Input converted to Text object: "${deserializedInput.content.substring(0, 50)}..."`);
        }
        // If it's just a string, wrap it in Text
        else if (typeof deserializedInput === 'string') {
          deserializedInput = new Text(deserializedInput);
          console.log(`String input converted to Text object: "${deserializedInput.content.substring(0, 50)}..."`);
        }
      } catch (error) {
        console.warn('Failed to deserialize input, using as-is:', error.message);
      }
    }
    
    const job = jobManager.createJob(
      jobId, 
      providerId, 
      modelId, 
      generationRequest.capability,
      deserializedInput,
      generationRequest.options
    );

    // Start transformation (async)
    processTransformation(provider, model, generationRequest.capability, deserializedInput, generationRequest.options, jobId, jobManager)
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
  capability: string,
  input: any,
  options: any,
  jobId: string,
  jobManager: JobManager
) {
  const startTime = Date.now();

  try {
    // Update job status to running
    jobManager.updateJob(jobId, { 
      status: JobStatus.RUNNING,
      startedAt: new Date()
    });

    console.log(`[Job ${jobId}] Starting transformation with model: ${model.id}`);
    console.log(`[Job ${jobId}] Input type: ${input?.constructor?.name}`);
    console.log(`[Job ${jobId}] Options:`, options);

    // Get the actual model instance from the provider
    const modelInstance = await provider.getModel(model.id);
    if (!modelInstance) {
      throw new Error(`Failed to get model instance for ${model.id}`);
    }

    // Call the model's transform method with deserialized input
    const output = await modelInstance.transform(input, options);
    
    const processingTime = Date.now() - startTime;
    console.log(`[Job ${jobId}] Transformation completed in ${processingTime}ms`);
    console.log(`[Job ${jobId}] Output type: ${output.constructor.name}`);

    // Complete the job with automatic generation chain and URL extraction
    jobManager.completeJobWithAsset(jobId, output, processingTime);

    console.log(`[Job ${jobId}] Job completed successfully`);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[Job ${jobId}] Transformation failed after ${processingTime}ms:`, error);
    
    jobManager.updateJob(jobId, {
      status: JobStatus.FAILED,
      error: error.message,
      processingTime
    });
    throw error;
  }
}
