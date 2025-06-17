import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Stack,
  Switch,
  Checkbox,
  SimpleGrid,
  HStack,
  Button,
  Flex,
} from '@chakra-ui/react';
import AssetSelector from '../AssetSelector';
import OverlayConfig from '../OverlayConfig';

interface OverlayConfigType {
  assetId: string;
  startTime: number;
  duration: number;
  position: {
    preset: string;
    x: number;
    y: number;
    size: number;
  };
  opacity: number;
  transition: {
    fadeIn: number;
    fadeOut: number;
  };
}

interface OverlaySectionProps {
  selectedIds: string[];
  onSelect: (id: string, isSelected: boolean) => void;
  autoPosition: boolean;
  onAutoPositionChange: (value: boolean) => void;
  configs: Record<string, OverlayConfigType>;
  onConfigChange: (id: string, config: OverlayConfigType) => void;
}

/**
 * Overlay section of the composition form
 */
const OverlaySection: React.FC<OverlaySectionProps> = ({
  selectedIds,
  onSelect,
  autoPosition,
  onAutoPositionChange,
  configs,
  onConfigChange
}) => {
  const [overlayAssets, setOverlayAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock fetch assets for demo
  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
      
      // Mock data
      setOverlayAssets([
        {
          id: 'overlay1',
          title: 'Logo Overlay',
          duration: 30,
          width: 400,
          height: 200,
          contentPurpose: ['OVERLAY'],
          thumbnailPath: null
        },
        {
          id: 'overlay2',
          title: 'Lower Third',
          duration: 20,
          width: 800,
          height: 150,
          contentPurpose: ['OVERLAY'],
          thumbnailPath: null
        }
      ]);
    }, 500);
  }, []);

  // Get selected overlay configs
  const selectedConfigs = Object.entries(configs)
    .filter(([id]) => selectedIds.includes(id))
    .map(([id, config]) => config);

  // Handle edit overlay config
  const handleEditConfig = (index: number) => {
    const config = selectedConfigs[index];
    // Trigger edit modal with config
    console.log('Edit config:', config);
  };

  // Handle delete overlay config
  const handleDeleteConfig = (index: number) => {
    const config = selectedConfigs[index];
    // Remove overlay from selection
    if (config && config.assetId) {
      onSelect(config.assetId, false);
    }
  };

  return (
    <Box>
      <Stack gap="6">
        <Heading size="md">Overlay Configuration (Optional)</Heading>
        <Text color="fg.muted">
          Select and configure overlays to appear on top of your video.
        </Text>
        
        <Flex align="center" gap="2">
          <Switch.Root
            id="auto-position"
            checked={autoPosition}
            onCheckedChange={(details) => onAutoPositionChange(details.checked)}
          >
            <Switch.Thumb />
          </Switch.Root>
          <Text>Automatically position overlays</Text>
        </Flex>
        
        <AssetSelector
          title="Available Overlays"
          purpose="OVERLAY"
          onSelect={(id) => onSelect(id, !selectedIds.includes(id))}
          filterByPurpose={true}
        />
        
        {selectedIds.length > 0 && (
          <OverlayConfig
            configs={selectedConfigs}
            assets={overlayAssets}
            onEdit={handleEditConfig}
            onDelete={handleDeleteConfig}
            contentDuration={180} // Mock duration
          />
        )}
      </Stack>
    </Box>
  );
};

export default OverlaySection;