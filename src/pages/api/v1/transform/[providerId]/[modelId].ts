import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import ProviderRegistry from '../../../ProviderRegistry';
import JobManager from '../../../JobManager';
import { GenerationRequestSchema, MediaCapability } from '../../../../../media/types/provider';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { providerId, modelId } = req.query;
  
  if (typeof providerId !== 'string' || typeof modelId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Provider ID and Model ID must be strings'
    });
  }

  const registry = ProviderRegistry.getInstance();
  const jobManager = JobManager.getInstance();

  switch (req.method) {
    case 'POST':
      try {
        // Validate request body
        const validationResult = GenerationRequestSchema.safeParse(req.body);
        if (!validationResult.success) {
          return res.status(400).json({
            success: false,
            error: 'Invalid request body',
            details: validationResult.error.issues
          });
        }

        const request = validationResult.data;

        // Get provider
        const provider = registry.getProvider(providerId);
        if (!provider) {
          return res.status(404).json({
            success: false,
            error: `Provider '${providerId}' not found`
          });
        }

        // Check if provider is available
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) {
          return res.status(503).json({
            success: false,
            error: `Provider '${providerId}' is not available`
          });
        }

        // Get model
        const model = provider.models.find(m => m.id === modelId);
        if (!model) {
          return res.status(404).json({
            success: false,
            error: `Model '${modelId}' not found in provider '${providerId}'`
          });
        }

        // Check if model supports the requested capability
        if (!model.capabilities.includes(request.capability)) {
          return res.status(400).json({
            success: false,
            error: `Model '${modelId}' does not support capability '${request.capability}'`
          });
        }

        // Create job
        const jobId = uuidv4();
        const job = jobManager.createJob(jobId, providerId, modelId, request.capability);

        // Start transformation (async)
        processTransformation(provider, model, request, jobId, jobManager)
          .catch(error => {
            console.error(`Transformation job ${jobId} failed:`, error);
            jobManager.updateJob(jobId, {
              status: 'failed',
              error: error.message
            });
          });

        res.status(202).json({
          success: true,
          data: {
            jobId,
            status: job.status,
            message: 'Transformation started',
            statusUrl: `/api/v1/jobs/${jobId}`
          }
        });

      } catch (error) {
        console.error('Transform endpoint error:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
      break;

    default:
      res.setHeader('Allow', ['POST']);
      res.status(405).json({
        success: false,
        error: `Method ${req.method} not allowed`
      });
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
    jobManager.updateJob(jobId, { status: 'running' });    // TODO: Implement actual transformation logic here
    throw new Error('Transformation logic not yet implemented');

  } catch (error) {
    jobManager.updateJob(jobId, {
      status: 'failed',
      error: error.message
    });
    throw error;
  }
}
