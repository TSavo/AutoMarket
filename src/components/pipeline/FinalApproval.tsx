/**
 * Final Approval Component
 *
 * Displays the final approved video and provides options for sharing and publishing.
 */

'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  Stack,
  AspectRatio,
  HStack,
  VStack,
  Badge,
  Icon,
  Input,
  InputGroup
} from '@chakra-ui/react';
// Temporary mock imports until Chakra UI v3 is properly installed
const Card = {
  Root: ({ children, ...props }) => <div {...props}>{children}</div>,
  Body: ({ children, ...props }) => <div {...props}>{children}</div>
};

const Table = {
  Root: ({ children, ...props }) => <table {...props}>{children}</table>,
  Body: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
  Row: ({ children, ...props }) => <tr {...props}>{children}</tr>,
  Cell: ({ children, ...props }) => <td {...props}>{children}</td>,
  HeaderCell: ({ children, ...props }) => <th {...props}>{children}</th>
};

// Mock toast function
const useToast = () => {
  return (props) => console.log('Toast:', props);
};
import { PipelineContext } from '../../pipeline/types';
import {
  FiVideo,
  FiEdit,
  FiCheck,
  FiClock,
  FiCalendar,
  FiUser,
  FiCopy,
  FiShare2,
  FiDownload
} from 'react-icons/fi';

interface FinalApprovalProps {
  context: PipelineContext;
  loading: boolean;
}

export default function FinalApproval({
  context,
  loading
}: FinalApprovalProps) {
  const [copying, setCopying] = useState(false);
  const toast = useToast();

  if (!context.composedVideo?.url) {
    return (
      <Box p={4} textAlign="center">
        <Text>No final video available.</Text>
      </Box>
    );
  }

  // Format video details
  const videoDetails = {
    title: context.blog?.title || 'Horizon City Marketing Video',
    author: context.blog?.author || 'Unknown Author',
    createdDate: new Date(context.metadata.createdAt).toLocaleDateString(),
    completedDate: new Date().toLocaleDateString(),
    duration: context.script ? `~${Math.round(context.script.estimatedDuration)} seconds` : 'Unknown',
    videoUrl: context.composedVideo.url
  };

  // Handle copy to clipboard
  const handleCopyLink = () => {
    setCopying(true);

    // Get the full URL (in a real app, this would be an absolute URL)
    // For demo, we'll just use the relative path
    const videoUrl = videoDetails.videoUrl;

    // Copy to clipboard
    navigator.clipboard.writeText(videoUrl)
      .then(() => {
        toast({
          title: 'Link copied',
          description: 'Video link copied to clipboard',
          status: 'success',
          duration: 3000,
          isClosable: true
        });
      })
      .catch(err => {
        toast({
          title: 'Copy failed',
          description: 'Failed to copy link to clipboard',
          status: 'error',
          duration: 3000,
          isClosable: true
        });
      })
      .finally(() => {
        setCopying(false);
      });
  };

  // Handle download button
  const handleDownload = () => {
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = videoDetails.videoUrl;
    link.download = `horizon-city-${context.id}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Download started',
      description: 'Your video is being downloaded',
      status: 'success',
      duration: 3000,
      isClosable: true
    });
  };

  return (
    <Box>
      <Stack gap={6}>
        <HStack justify="space-between" align="center">
          <Heading size="md">
            Final Marketing Video
            <Badge ml={2} colorPalette="green">Ready</Badge>
          </Heading>

          <HStack>
            <Badge colorPalette="purple" p={1} fontSize="xs">
              <Icon as={FiCheck} mr={1} />
              Approved
            </Badge>
          </HStack>
        </HStack>

        {/* Video player */}
        <Card.Root>
          <Card.Body>
            <AspectRatio ratio={16/9} width="100%">
              <video
                controls
                src={videoDetails.videoUrl}
                style={{ width: '100%', borderRadius: '0.375rem' }}
              />
            </AspectRatio>
          </Card.Body>
        </Card.Root>

        {/* Video details */}
        <Box p={4} bg="gray.50" borderRadius="md">
          <Table.Root size="sm" variant="simple">
            <Table.Body>
              <Table.Row>
                <Table.HeaderCell width="30%"><Icon as={FiVideo} mr={2} />Title</Table.HeaderCell>
                <Table.Cell>{videoDetails.title}</Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.HeaderCell><Icon as={FiUser} mr={2} />Author</Table.HeaderCell>
                <Table.Cell>{videoDetails.author}</Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.HeaderCell><Icon as={FiCalendar} mr={2} />Created</Table.HeaderCell>
                <Table.Cell>{videoDetails.createdDate}</Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.HeaderCell><Icon as={FiClock} mr={2} />Duration</Table.HeaderCell>
                <Table.Cell>{videoDetails.duration}</Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table.Root>
        </Box>

        {/* Copy link section */}
        <Card.Root>
          <Card.Body>
            <Heading size="sm" mb={3}>
              <Icon as={FiShare2} mr={2} />
              Share Your Video
            </Heading>

            <VStack gap={4} align="stretch">
              <Box position="relative">
                <Input
                  value={videoDetails.videoUrl}
                  readOnly
                  pr="4.5rem"
                />
                <Box position="absolute" right="0" top="0" height="100%" width="4.5rem" display="flex" alignItems="center" justifyContent="center">
                  <Button
                    h="1.75rem"
                    size="sm"
                    onClick={handleCopyLink}
                    loading={copying}
                    colorPalette="purple"
                  >
                    <Icon as={FiCopy} mr={1} />
                    Copy
                  </Button>
                </Box>
              </Box>

              <hr style={{ margin: '1rem 0', borderColor: 'var(--chakra-colors-gray-200)' }} />

              <HStack justify="space-between">
                <Button
                  onClick={handleDownload}
                  colorPalette="purple"
                  variant="outline"
                >
                  <Icon as={FiDownload} style={{ marginRight: '8px' }} />
                  Download
                </Button>

                <Button
                  onClick={() => {
                    toast({
                      title: 'Publishing feature',
                      description: 'Publishing integration coming soon',
                      status: 'info',
                      duration: 3000,
                      isClosable: true
                    });
                  }}
                >
                  <Icon as={FiEdit} style={{ marginRight: '8px' }} />
                  Publish to Platform
                </Button>
              </HStack>
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Next steps */}
        <Box p={4} bg="purple.50" borderRadius="md">
          <Heading size="sm" mb={2}>Next Steps</Heading>
          <Text fontSize="sm" color="purple.700">
            Your marketing video is ready! You can download it, share the link, or publish directly to your marketing platforms.
            The video includes the standard Horizon City branding, intro animation, and outro call-to-action.
          </Text>
        </Box>
      </Stack>
    </Box>
  );
}
