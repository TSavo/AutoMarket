/**
 * Avatar Generator Component
 *
 * Displays the generated avatar video and allows the user to proceed to auto-composition
 * or regenerate the avatar.
 */

'use client';

import React from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  Stack,
  AspectRatio,
  HStack,
  Badge,
  Skeleton
} from '@chakra-ui/react';
import { AvatarVideo } from '../../pipeline/types';

interface AvatarGeneratorProps {
  avatarVideo: AvatarVideo | undefined;
  onAutoCompose: () => void;
  onRegenerateAvatar: () => void;
  loading: boolean;
}

export default function AvatarGenerator({
  avatarVideo,
  onAutoCompose,
  onRegenerateAvatar,
  loading
}: AvatarGeneratorProps) {
  if (!avatarVideo) {
    return (
      <Box p={4} textAlign="center">
        <Text>No avatar video available. Please generate one first.</Text>
      </Box>
    );
  }

  // Handle still processing state
  if (avatarVideo.status === 'pending' || avatarVideo.status === 'processing') {
    return (
      <Box>
        <Stack gap={6}>
          <Heading size="md">Avatar Video</Heading>

          <Box p={4} bg="blue.50" borderRadius="md" borderLeft="4px solid" borderColor="blue.400">
            <Text fontWeight="bold" color="blue.700">Processing</Text>
            <Text color="blue.600">
              Your avatar video is still being generated. This typically takes 2-3 minutes.
            </Text>
          </Box>

          <Box p={4} borderWidth={1} borderRadius="md" bg="white">
            <AspectRatio ratio={16/9} width="100%">
              <Skeleton height="100%" width="100%" />
            </AspectRatio>
          </Box>

          {/* Stats */}
          <HStack gap={4}>
            <Badge colorPalette="purple">Avatar ID: {avatarVideo.avatarId}</Badge>
            <Badge colorPalette="blue">Voice ID: {avatarVideo.voiceId}</Badge>
            <Badge colorPalette="orange">Status: Processing</Badge>
          </HStack>

          {/* Action buttons */}
          <HStack gap={4} justify="center" mt={4}>
            <Button
              colorPalette="purple"
              onClick={onAutoCompose}
              disabled={true}
            >
              Waiting for Completion...
            </Button>
            <Button
              variant="outline"
              onClick={onRegenerateAvatar}
              disabled={loading}
              loading={loading}
            >
              Regenerate
            </Button>
          </HStack>
        </Stack>
      </Box>
    );
  }

  // Handle error state
  if (avatarVideo.status === 'error' || !avatarVideo.url) {
    return (
      <Box>
        <Stack gap={6}>
          <Heading size="md">Avatar Video</Heading>

          <Box p={4} bg="red.50" borderRadius="md" borderLeft="4px solid" borderColor="red.400">
            <Text fontWeight="bold" color="red.700">Error</Text>
            <Text color="red.600">
              {avatarVideo.error || 'Something went wrong while generating the avatar video.'}
            </Text>
          </Box>

          {/* Action buttons */}
          <HStack gap={4} justify="center" mt={4}>
            <Button
              colorPalette="purple"
              onClick={onRegenerateAvatar}
              disabled={loading}
              loading={loading}
            >
              Regenerate Avatar
            </Button>
          </HStack>
        </Stack>
      </Box>
    );
  }

  // Complete state with video
  return (
    <Box>
      <Stack gap={6}>
        <Heading size="md">
          Avatar Video
          {avatarVideo.regenerated && (
            <Badge ml={2} colorPalette="green">Regenerated</Badge>
          )}
        </Heading>

        <Box p={4} borderWidth={1} borderRadius="md" bg="white">
          <AspectRatio ratio={16/9} width="100%">
            <video
              controls
              src={avatarVideo.url}
              style={{ width: '100%', borderRadius: '0.375rem' }}
            />
          </AspectRatio>
        </Box>

        {/* Stats */}
        <HStack gap={4}>
          <Badge colorPalette="purple">Avatar ID: {avatarVideo.avatarId}</Badge>
          <Badge colorPalette="blue">Voice ID: {avatarVideo.voiceId}</Badge>
          <Badge colorPalette="green">Status: Complete</Badge>
        </HStack>

        {/* Action buttons */}
        <HStack gap={4} justify="center" mt={4}>
          <Button
            colorPalette="purple"
            onClick={onAutoCompose}
            disabled={loading}
            loading={loading}
          >
            Add Branding & Effects
          </Button>
          <Button
            variant="outline"
            onClick={onRegenerateAvatar}
            disabled={loading}
          >
            Regenerate Avatar
          </Button>
        </HStack>

        {/* Guidance text */}
        <Box mt={4} p={4} bg="purple.50" borderRadius="md">
          <Text fontSize="sm" color="purple.700">
            <strong>Next Step:</strong> Click "Add Branding & Effects" to automatically add intro/outro sequences
            and Horizon City branding to your avatar video. This will create a complete marketing video
            ready for publishing.
          </Text>
        </Box>
      </Stack>
    </Box>
  );
}
