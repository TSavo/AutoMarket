import React from 'react';
import {
  Box,
  Heading,
  Text,
  Stack,
} from '@chakra-ui/react';
import AssetSelector from '../AssetSelector';

interface OutroSectionProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

/**
 * Outro section of the composition form
 */
const OutroSection: React.FC<OutroSectionProps> = ({
  selectedId,
  onSelect
}) => {
  return (
    <Box>
      <Stack gap="4">
        <Heading size="md">Outro Video (Optional)</Heading>
        <Text color="fg.muted">
          Select an optional outro video to play after the main content.
        </Text>
        
        <AssetSelector
          title="Outro Videos"
          purpose="OUTRO"
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </Stack>
    </Box>
  );
};

export default OutroSection;