import React from 'react';
import {
  Box,
  Heading,
  Text,
  Stack,
} from '@chakra-ui/react';
import AssetSelector from '../AssetSelector';

interface IntroSectionProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

/**
 * Intro section of the composition form
 */
const IntroSection: React.FC<IntroSectionProps> = ({
  selectedId,
  onSelect
}) => {
  return (
    <Box>
      <Stack gap="4">
        <Heading size="md">Intro Video (Optional)</Heading>
        <Text color="fg.muted">
          Select an optional intro video to play before the main content.
        </Text>
        
        <AssetSelector
          title="Intro Videos"
          purpose="INTRO"
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </Stack>
    </Box>
  );
};

export default IntroSection;