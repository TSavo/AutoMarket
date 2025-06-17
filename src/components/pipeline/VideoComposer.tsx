/**
 * Video Composer Component
 *
 * Displays the auto-composed video with branding and allows the user to approve
 * the final video or regenerate the composition.
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
  Skeleton,
  Icon,
  Separator
} from '@chakra-ui/react';
// Temporary mock imports until Chakra UI v3 is properly installed
const Card = {
  Root: ({ children, ...props }) => <div {...props}>{children}</div>,
  Body: ({ children, ...props }) => <div {...props}>{children}</div>
};

const Alert = {
  Root: ({ children, ...props }) => <div {...props}>{children}</div>,
  Icon: () => null,
  Title: ({ children, ...props }) => <div {...props}>{children}</div>,
  Description: ({ children, ...props }) => <div {...props}>{children}</div>
};
import { ComposedVideo } from '../../pipeline/types';
import { FiPlay, FiCheck, FiRefreshCw } from 'react-icons/fi';

interface VideoComposerProps {
  composedVideo: ComposedVideo | undefined;
  onApproveFinal: () => void;
  onRegenerateComposition: () => void;
  loading: boolean;
}

export default function VideoComposer({
  composedVideo,
  onApproveFinal,
  onRegenerateComposition,
  loading
}: VideoComposerProps) {
  if (!composedVideo) {
    return (
      <Box p={4} textAlign="center">
        <Text>No composed video available. Please generate one first.</Text>
      </Box>
    );
  }

  // Handle still processing state
  if (composedVideo.status === 'pending' || composedVideo.status === 'processing') {
    return (
      <Box>
        <Stack gap={6}>
          <Heading size="md">Composing Marketing Video</Heading>

          <Alert.Root status="info">
            <Alert.Icon />
            <Box>
              <Alert.Title>Processing</Alert.Title>
              <Alert.Description>
                Your marketing video is being assembled. Adding intro, outro, and branding elements.
                This typically takes 1-2 minutes.
              </Alert.Description>
            </Box>
          </Alert.Root>

          <Card.Root>
            <Card.Body>
              <AspectRatio ratio={16/9} width="100%">
                <Skeleton
                  height="100%"
                  width="100%"
                  css={{
                    "--start-color": "colors.purple.100",
                    "--end-color": "colors.purple.300",
                  }}
                />
              </AspectRatio>
            </Card.Body>
          </Card.Root>

          {/* Status badge */}
          <Box textAlign="center">
            <Badge colorPalette="orange" fontSize="md" p={2}>
              Status: Processing
            </Badge>
          </Box>
        </Stack>
      </Box>
    );
  }

  // Handle error state
  if (composedVideo.status === 'error' || !composedVideo.url) {
    return (
      <Box>
        <Stack gap={6}>
          <Heading size="md">Composition Failed</Heading>

          <Alert.Root status="error">
            <Alert.Icon />
            <Box>
              <Alert.Title>Error</Alert.Title>
              <Alert.Description>
                {composedVideo.error || 'Something went wrong while composing the final video.'}
              </Alert.Description>
            </Box>
          </Alert.Root>

          {/* Action buttons */}
          <HStack gap={4} justify="center" mt={4}>
            <Button
              colorPalette="purple"
              onClick={onRegenerateComposition}
              disabled={loading}
              loading={loading}
            >
              <Icon as={FiRefreshCw} style={{ marginRight: '8px' }} />
              Regenerate Composition
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
          Marketing Video
          {composedVideo.regenerated && (
            <Badge ml={2} colorPalette="green">Regenerated</Badge>
          )}
        </Heading>

        <Card.Root>
          <Card.Body>
            <AspectRatio ratio={16/9} width="100%">
              <video
                controls
                src={composedVideo.url}
                style={{ width: '100%', borderRadius: '0.375rem' }}
              />
            </AspectRatio>
          </Card.Body>
        </Card.Root>

        {/* Composition details */}
        <Box p={4} bg="gray.50" borderRadius="md">
          <Heading size="sm" mb={3}>Composition Details</Heading>
          <Stack>
            <HStack justify="space-between">
              <Text fontWeight="medium">Intro Animation</Text>
              <Badge colorPalette="green">Added</Badge>
            </HStack>
            <Separator />
            <HStack justify="space-between">
              <Text fontWeight="medium">Brand Overlay</Text>
              <Badge colorPalette="green">Added</Badge>
            </HStack>
            <Separator />
            <HStack justify="space-between">
              <Text fontWeight="medium">Outro Animation</Text>
              <Badge colorPalette="green">Added</Badge>
            </HStack>
            <Separator />
            <HStack justify="space-between">
              <Text fontWeight="medium">Background Music</Text>
              <Badge colorPalette="green">Added</Badge>
            </HStack>
          </Stack>
        </Box>

        {/* Action buttons */}
        <HStack gap={4} justify="center" mt={4}>
          <Button
            colorPalette="purple"
            onClick={onApproveFinal}
            disabled={loading}
            loading={loading}
            size="lg"
          >
            <Icon as={FiCheck} style={{ marginRight: '8px' }} />
            Approve Final Video
          </Button>
          <Button
            variant="outline"
            onClick={onRegenerateComposition}
            disabled={loading}
          >
            <Icon as={FiRefreshCw} style={{ marginRight: '8px' }} />
            Regenerate Composition
          </Button>
        </HStack>

        {/* Preview note */}
        <Box mt={4} p={4} bg="purple.50" borderRadius="md">
          <HStack gap={2} mb={2}>
            <Icon as={FiPlay} />
            <Text fontWeight="bold">Preview Tip</Text>
          </HStack>
          <Text fontSize="sm" color="purple.700">
            Play the video to verify the intro animation, brand overlay, background music, and outro
            are all present and working correctly. If any elements are missing or not aligned correctly,
            click "Regenerate Composition" to try again.
          </Text>
        </Box>
      </Stack>
    </Box>
  );
}
