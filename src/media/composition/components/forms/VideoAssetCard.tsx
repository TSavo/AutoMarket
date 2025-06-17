import React from 'react';
import {
  Badge,
  Box,
  Flex,
  Text,
  Image
} from '@chakra-ui/react';
import { ContentPurpose } from '../../../../media/types';
import { VideoAssetCardProps } from './types';

/**
 * Format seconds to mm:ss display
 */
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Get color for content purpose badge
 */
const getPurposeColor = (purpose: ContentPurpose): string => {
  switch (purpose) {
    case ContentPurpose.INTRO: return 'green';
    case ContentPurpose.OUTRO: return 'purple';
    case ContentPurpose.OVERLAY: return 'orange';
    case ContentPurpose.CONTENT: return 'blue';
    default: return 'gray';
  }
};

/**
 * Displays a video asset as a selectable card
 */
const VideoAssetCard: React.FC<VideoAssetCardProps> = ({ asset, selected, onClick }) => {
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      cursor="pointer"
      onClick={onClick}
      borderColor={selected ? 'blue.500' : 'gray.200'}
      _hover={{ borderColor: 'blue.300' }}
      transition="all 0.2s"
      bg={selected ? 'blue.50' : 'white'}
    >
      <Box position="relative">
        {asset.thumbnailPath ? (
          <Image 
            src={asset.thumbnailPath} 
            alt={asset.title}
            width="100%"
            height="120px"
            objectFit="cover"
          />
        ) : (          <Box 
            height="120px" 
            bg="gray.100" 
            display="flex" 
            alignItems="center" 
            justifyContent="center"
          >
            <Text color="gray.500">No Preview</Text>
          </Box>
        )}
      </Box>
      <Box p={3}>
        <Text fontWeight="semibold" maxLines={1}>{asset.title}</Text>
        <Text fontSize="sm" color="gray.500">
          {asset.width}x{asset.height} - {formatDuration(asset.duration)}
        </Text>
        <Flex mt={1} wrap="wrap" gap={1}>
          {asset.contentPurpose.map(purpose => (
            <Badge key={purpose} colorScheme={getPurposeColor(purpose)} size="sm">
              {purpose}
            </Badge>
          ))}
        </Flex>
      </Box>
    </Box>
  );
};

export default VideoAssetCard;