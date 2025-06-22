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

        const isAvailable = await provider.isAvailable();
        
        if (!isAvailable) {
          return res.status(503).json({
            success: false,
            error: `Provider '${providerId}' is not available`
          });
        }

        const health = await provider.getHealth();

        res.status(200).json({
          success: true,
          data: {
            providerId: provider.id,
            providerName: provider.name,
            health
          }
        });
      } catch (error) {
        console.error(`Error checking health for provider ${providerId}:`, error);
        res.status(500).json({
          success: false,
          error: `Failed to check health for provider ${providerId}`
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
