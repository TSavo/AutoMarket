import React from 'react';
import {
  Box,
  Text,
  Image,
  Stack,
  Flex,
  Badge,
} from '@chakra-ui/react';

// Define the VideoAsset interface
interface VideoAsset {
  id: string;
  title: string;
  duration: number;
  width: number;
  height: number;
  contentPurpose: string[];
  thumbnailPath: string | null;
}

interface VideoAssetCardProps {
  asset: VideoAsset;
  selected: boolean;
  onClick: () => void;
}

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
const getPurposeColor = (purpose: string): string => {
  switch (purpose) {
    case 'INTRO': return 'green';
    case 'OUTRO': return 'purple';
    case 'OVERLAY': return 'orange';
    case 'CONTENT': return 'blue';
    default: return 'gray';
  }
};

/**
 * Video asset card for selection
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
        ) : (
          <Flex 
            height="120px" 
            bg="gray.100" 
            alignItems="center" 
            justifyContent="center"
          >
            <Text color="fg.muted">No Preview</Text>
          </Flex>
        )}
      </Box>
      <Box p={3}>
        <Text fontWeight="semibold" truncate>{asset.title}</Text>
        <Text fontSize="sm" color="fg.muted">
          {asset.width}x{asset.height} - {formatDuration(asset.duration)}
        </Text>
        <Flex mt={1} wrap="wrap" gap={1}>
          {asset.contentPurpose.map(purpose => (
            <Badge key={purpose} colorPalette={getPurposeColor(purpose)} size="sm">
              {purpose}
            </Badge>
          ))}
        </Flex>
      </Box>
    </Box>
  );
};

export default VideoAssetCard;