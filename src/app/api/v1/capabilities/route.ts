import { NextRequest, NextResponse } from 'next/server';
import { MediaCapability } from '../../../../media/types/provider';

export async function GET(request: NextRequest) {
  try {
    const capabilities = Object.values(MediaCapability).map((capability: MediaCapability) => ({
      id: capability,
      name: capability.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: getCapabilityDescription(capability)
    }));

    return NextResponse.json({
      success: true,
      data: {
        capabilities,
        total: capabilities.length
      }
    });
  } catch (error) {
    console.error('Error fetching capabilities:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch capabilities'
      },
      { status: 500 }
    );
  }
}

function getCapabilityDescription(capability: MediaCapability): string {
  const descriptions: Record<MediaCapability, string> = {
    [MediaCapability.TEXT_TO_TEXT]: 'Transform text from one format to another',
    [MediaCapability.TEXT_TO_IMAGE]: 'Generate images from text descriptions',
    [MediaCapability.IMAGE_TO_IMAGE]: 'Transform and enhance images',
    [MediaCapability.IMAGE_TO_TEXT]: 'Extract text or descriptions from images',
    [MediaCapability.TEXT_TO_VIDEO]: 'Generate videos from text descriptions',
    [MediaCapability.IMAGE_TO_VIDEO]: 'Animate static images into videos',
    [MediaCapability.VIDEO_TO_VIDEO]: 'Transform and enhance videos',
    [MediaCapability.VIDEO_TO_IMAGE]: 'Extract frames or images from videos',
    [MediaCapability.VIDEO_TO_AUDIO]: 'Extract audio from video content',
    [MediaCapability.TEXT_TO_AUDIO]: 'Generate audio from text descriptions',
    [MediaCapability.AUDIO_TO_TEXT]: 'Convert speech or audio to text',
    [MediaCapability.AUDIO_TO_AUDIO]: 'Transform and enhance audio',
    [MediaCapability.TEXT_TO_3D]: 'Generate 3D models from text descriptions',
    [MediaCapability.IMAGE_TO_3D]: 'Convert images to 3D models'
  };

  return descriptions[capability] || `Capability: ${capability}`;
}
