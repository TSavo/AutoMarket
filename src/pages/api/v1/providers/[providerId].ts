import type { NextApiRequest, NextApiResponse } from 'next';
import ProviderRegistry from '../ProviderRegistry';

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

        const isAvailable = await provider.isAvailable().catch(() => false);
        const health = await provider.getHealth().catch(() => ({
          status: 'unhealthy' as const,
          uptime: 0,
          activeJobs: 0,
          queuedJobs: 0,
          lastError: 'Health check failed'
        }));

        res.status(200).json({
          success: true,
          data: {
            id: provider.id,
            name: provider.name,
            type: provider.type,
            capabilities: provider.capabilities,
            models: provider.models,
            isAvailable,
            health
          }
        });
      } catch (error) {
        console.error(`Error fetching provider ${providerId}:`, error);
        res.status(500).json({
          success: false,
          error: `Failed to fetch provider ${providerId}`
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
