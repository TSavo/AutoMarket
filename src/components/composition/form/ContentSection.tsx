import React from 'react';
import {
  Box,
  Heading,
  Text,
  Stack,
} from '@chakra-ui/react';
import AssetSelector from '../AssetSelector';

interface ContentSectionProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

/**
 * Content section of the composition form
 */
const ContentSection: React.FC<ContentSectionProps> = ({
  selectedId,
  onSelect
}) => {
  return (
    <Box>
      <Stack gap="4">
        <Heading size="md">Content Video (Required)</Heading>
        <Text color="fg.muted">
          Select the main content video for your composition.
        </Text>
        
        <AssetSelector
          title="Content Videos"
          purpose="CONTENT"
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </Stack>
    </Box>
  );
};

export default ContentSection;