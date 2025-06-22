import type { NextApiRequest, NextApiResponse } from 'next';
import ProviderRegistry from '../../ProviderRegistry';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { providerId } = req.query;
  
  if (typeof providerId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Provider ID must be a string'
    });
  }

  const registry = ProviderRegistry.getInstance();

  switch (req.method) {
    case 'GET':
      try {
        const provider = registry.getProvider(providerId);
        
        if (!provider) {
          return res.status(404).json({
            success: false,
            error: `Provider '${providerId}' not found`
          });
        }

        // Optional capability filter
        const { capability } = req.query;
        
        let models = provider.models;
        
        if (capability && typeof capability === 'string') {
          models = provider.getModelsForCapability(capability as any);
        }

        res.status(200).json({
          success: true,
          data: {
            providerId: provider.id,
            providerName: provider.name,
            models: models.map(model => ({
              id: model.id,
              name: model.name,
              description: model.description,
              capabilities: model.capabilities,
              parameters: model.parameters,
              pricing: model.pricing,
              limits: model.limits
            })),
            total: models.length
          }
        });
      } catch (error) {
        console.error(`Error fetching models for provider ${providerId}:`, error);
        res.status(500).json({
          success: false,
          error: `Failed to fetch models for provider ${providerId}`
        });
      }
      break;

    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).json({
        success: false,
        error: `Method ${req.method} not allowed`
      });
  }
}
