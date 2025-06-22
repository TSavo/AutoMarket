import type { NextApiRequest, NextApiResponse } from 'next';
import ProviderRegistry from '../ProviderRegistry';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const registry = ProviderRegistry.getInstance();

  switch (req.method) {
    case 'GET':
      try {
        const providers = registry.getProviders();
        const providersData = await Promise.all(
          providers.map(async (provider) => {
            const isAvailable = await provider.isAvailable().catch(() => false);
            const health = await provider.getHealth().catch(() => ({
              status: 'unhealthy' as const,
              uptime: 0,
              activeJobs: 0,
              queuedJobs: 0,
              lastError: 'Health check failed'
            }));

            return {
              id: provider.id,
              name: provider.name,
              type: provider.type,
              capabilities: provider.capabilities,
              modelCount: provider.models.length,
              isAvailable,
              health
            };
          })
        );

        res.status(200).json({
          success: true,
          data: {
            providers: providersData,
            total: providersData.length
          }
        });
      } catch (error) {
        console.error('Error fetching providers:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch providers'
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
