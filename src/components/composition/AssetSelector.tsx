import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Spinner,
  Text,
  SimpleGrid,
  Stack,
  Button,
  Input,
  HStack,
} from '@chakra-ui/react';
import VideoAssetCard from './VideoAssetCard';

interface AssetSelectorProps {
  title: string;
  purpose: string;
  selectedId?: string;
  onSelect: (assetId: string) => void;
  filterByPurpose?: boolean;
}

/**
 * Component for selecting video assets
 */
const AssetSelector: React.FC<AssetSelectorProps> = ({
  title,
  purpose,
  selectedId,
  onSelect,
  filterByPurpose = true
}) => {
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock fetch assets for demo
  useEffect(() => {
    // Simulate API fetch
    setTimeout(() => {
      setIsLoading(false);
      
      // Mock data
      setAssets([
        {
          id: `${purpose.toLowerCase()}1`,
          title: `${purpose} Sample 1`,
          duration: purpose === 'CONTENT' ? 120 : purpose === 'OVERLAY' ? 30 : 10,
          width: 1920,
          height: 1080,
          contentPurpose: [purpose],
          thumbnailPath: null
        },
        {
          id: `${purpose.toLowerCase()}2`,
          title: `${purpose} Sample 2`,
          duration: purpose === 'CONTENT' ? 180 : purpose === 'OVERLAY' ? 20 : 15,
          width: 1920,
          height: 1080,
          contentPurpose: [purpose],
          thumbnailPath: null
        }
      ]);
    }, 500);
  }, [purpose]);

  // Filter assets by search term
  const filteredAssets = assets.filter(asset => 
    asset.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (!filterByPurpose || asset.contentPurpose.includes(purpose))
  );

  return (
    <Box>
      <Stack gap="4">
        <Heading size="md">{title}</Heading>
        
        <HStack>
          <Input
            placeholder="Search assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            maxWidth="300px"
          />
        </HStack>
        
        {isLoading ? (
          <Box textAlign="center" py={8}>
            <Spinner size="lg" />
          </Box>
        ) : filteredAssets.length === 0 ? (
          <Text color="fg.muted">No assets found</Text>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="4">
            {filteredAssets.map(asset => (
              <VideoAssetCard
                key={asset.id}
                asset={asset}
                selected={asset.id === selectedId}
                onClick={() => onSelect(asset.id)}
              />
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Box>
  );
};

export default AssetSelector;
