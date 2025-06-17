import React, { useState } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  Heading,
  Slider,
  Field,
  Select,
  NumberInput,
  Icon,
  IconButton,
  Stack,
} from '@chakra-ui/react';
import { RiDeleteBin6Line, RiPencilLine } from 'react-icons/ri';

interface OverlayPositionConfig {
  preset: string;
  x: number;
  y: number;
  size: number;
}

interface OverlayTransitionConfig {
  fadeIn: number;
  fadeOut: number;
}

export interface OverlayConfig {
  assetId: string;
  startTime: number;
  duration: number;
  position: OverlayPositionConfig;
  opacity: number;
  transition: OverlayTransitionConfig;
}

interface OverlayConfigProps {
  configs: OverlayConfig[];
  assets: any[];
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  contentDuration: number;
}

/**
 * Component for displaying and editing overlay configurations
 */
const OverlayConfig: React.FC<OverlayConfigProps> = ({
  configs,
  assets,
  onEdit,
  onDelete,
  contentDuration
}) => {
  // Format time display (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get asset by ID
  const getAssetById = (id: string) => {
    return assets.find(asset => asset.id === id) || { title: 'Unknown Asset' };
  };

  return (
    <Box>
      <Heading size="md" mb={4}>Overlay Configuration</Heading>
      
      {configs.length === 0 ? (
        <Text color="fg.muted">No overlays configured</Text>
      ) : (
        <VStack gap={4} align="stretch">
          {configs.map((config, index) => {
            const asset = getAssetById(config.assetId);
            
            return (
              <Box 
                key={index}
                p={4}
                borderWidth="1px"
                borderRadius="md"
                borderColor="gray.200"
              >
                <Stack gap="3">
                  <Heading size="sm">{asset.title}</Heading>
                  
                  <HStack justify="space-between">
                    <VStack align="start" gap={1}>
                      <Text fontSize="sm">
                        Start: {formatTime(config.startTime)}
                      </Text>
                      <Text fontSize="sm">
                        Duration: {formatTime(config.duration)}
                      </Text>
                      <Text fontSize="sm">
                        Position: {config.position.preset} ({config.position.x}%, {config.position.y}%)
                      </Text>
                    </VStack>
                    
                    <HStack>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label="Edit overlay"
                        onClick={() => onEdit(index)}
                      >
                        <RiPencilLine />
                      </IconButton>
                      
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        aria-label="Delete overlay"
                        onClick={() => onDelete(index)}
                      >
                        <RiDeleteBin6Line />
                      </IconButton>
                    </HStack>
                  </HStack>
                </Stack>
              </Box>
            );
          })}
        </VStack>
      )}
    </Box>
  );
};

export default OverlayConfig;