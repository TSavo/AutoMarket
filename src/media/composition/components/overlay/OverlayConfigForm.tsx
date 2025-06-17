import React, { useState } from 'react';
import {
  Box,
  Button,
  Heading,
  HStack,
  NumberInput,
  SimpleGrid,
  VStack,
  Separator,
} from '@chakra-ui/react';
import { Field } from '@chakra-ui/react';

import {
  OverlayConfigFormProps,
  PositionPreset,
  OverlayConfig
} from './types';

/**
 * Component for configuring overlay settings
 */
const OverlayConfigForm: React.FC<OverlayConfigFormProps> = ({
  asset,
  contentDuration,
  initialConfig,
  onSave,
  onCancel,
}) => {
  // Initialize state based on provided initialConfig or defaults
  const [startTime, setStartTime] = useState<number>(
    initialConfig?.startTime
      ? typeof initialConfig.startTime === 'string'
        ? parseFloat(initialConfig.startTime as string)
        : initialConfig.startTime as number
      : 0
  );

  const [duration, setDuration] = useState<number>(
    initialConfig?.duration || Math.min(asset.duration, contentDuration)
  );

  // Handle saving the configuration
  const handleSaveConfig = () => {
    // Create a simplified config object to save
    const config: OverlayConfig = {
      assetId: asset.id,
      startTime: startTime,
      duration: duration,
      position: {
        preset: PositionPreset.CENTER,
        x: 50,
        y: 50,
        size: 50
      },
      opacity: 1,
      transition: {
        fadeIn: 0.5,
        fadeOut: 0.5
      }
    };

    onSave(config);
  };

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4}>
      <VStack gap={4} align="stretch">
        <Heading size="md">Configure Overlay: {asset.title}</Heading>

        <Separator />

        <Box>
          <Heading size="sm" mb={2}>Timing</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <Field.Root>
              <Field.Label>Start Time (seconds)</Field.Label>
              <NumberInput.Root
                min={0}
                max={contentDuration - 0.1}
                step={0.1}
                value={String(startTime)}
                onValueChange={(details) => setStartTime(Number(details.value))}
              >
                <NumberInput.Input />
                <NumberInput.Control>
                  <NumberInput.IncrementTrigger />
                  <NumberInput.DecrementTrigger />
                </NumberInput.Control>
              </NumberInput.Root>
              <Field.HelperText>When overlay should appear (0 = start)</Field.HelperText>
            </Field.Root>

            <Field.Root>
              <Field.Label>Duration (seconds)</Field.Label>
              <NumberInput.Root
                min={0.1}
                max={Math.min(asset.duration, contentDuration - startTime)}
                step={0.1}
                value={String(duration)}
                onValueChange={(details) => setDuration(Number(details.value))}
              >
                <NumberInput.Input />
                <NumberInput.Control>
                  <NumberInput.IncrementTrigger />
                  <NumberInput.DecrementTrigger />
                </NumberInput.Control>
              </NumberInput.Root>
              <Field.HelperText>How long overlay should appear</Field.HelperText>
            </Field.Root>
          </SimpleGrid>
        </Box>

        <Separator />

        <HStack justify="flex-end" gap={3}>
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSaveConfig}>
            Save Configuration
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default OverlayConfigForm;