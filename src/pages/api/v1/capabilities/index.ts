import type { NextApiRequest, NextApiResponse } from 'next';
import { MediaCapability } from '../../../media/types/provider';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case 'GET':
      try {
        const capabilities = Object.values(MediaCapability).map(capability => ({
          id: capability,
          name: capability.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: getCapabilityDescription(capability)
        }));

        res.status(200).json({
          success: true,
          data: {
            capabilities,
            total: capabilities.length
          }
        });
      } catch (error) {
        console.error('Error fetching capabilities:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch capabilities'
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

function getCapabilityDescription(capability: MediaCapability): string {
  const descriptions: Record<MediaCapability, string> = {
    [MediaCapability.TEXT_GENERATION]: 'Generate text content from text inputs',
    [MediaCapability.TEXT_TO_TEXT]: 'Transform text from one format to another',
    [MediaCapability.IMAGE_GENERATION]: 'Generate images from text descriptions',
    [MediaCapability.IMAGE_UPSCALING]: 'Increase image resolution and quality',
    [MediaCapability.IMAGE_ENHANCEMENT]: 'Improve image quality and details',
    [MediaCapability.IMAGE_STYLE_TRANSFER]: 'Apply artistic styles to images',
    [MediaCapability.IMAGE_INPAINTING]: 'Fill in missing parts of images',
    [MediaCapability.IMAGE_OUTPAINTING]: 'Extend images beyond their boundaries',
    [MediaCapability.VIDEO_GENERATION]: 'Generate videos from text descriptions',
    [MediaCapability.VIDEO_ANIMATION]: 'Animate static images into videos',
    [MediaCapability.VIDEO_UPSCALING]: 'Increase video resolution and quality',
    [MediaCapability.VIDEO_STYLE_TRANSFER]: 'Apply artistic styles to videos',
    [MediaCapability.VIDEO_FACE_SWAP]: 'Replace faces in videos with other faces',
    [MediaCapability.VIDEO_LIP_SYNC]: 'Synchronize lip movements with audio',
    [MediaCapability.AUDIO_GENERATION]: 'Generate audio from text or other inputs',
    [MediaCapability.TEXT_TO_SPEECH]: 'Convert text to natural speech',
    [MediaCapability.VOICE_CLONING]: 'Clone voices for speech synthesis',
    [MediaCapability.AUDIO_ENHANCEMENT]: 'Improve audio quality and clarity',
    [MediaCapability.MUSIC_GENERATION]: 'Generate musical compositions',
    [MediaCapability.AVATAR_GENERATION]: 'Create avatars from descriptions',
    [MediaCapability.AVATAR_ANIMATION]: 'Animate avatar characters',
    [MediaCapability.MODEL_3D_GENERATION]: 'Generate 3D models from descriptions',
    [MediaCapability.MODEL_3D_ANIMATION]: 'Animate 3D models and scenes'
  };

  return descriptions[capability] || `Capability: ${capability}`;
}
