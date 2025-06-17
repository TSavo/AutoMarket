import React, { useState } from 'react';
import {
  Box,
  Button,
  Separator,
  Heading,
  Field,
  NumberInput,
  HStack,
  Stack,
  Text,
} from '@chakra-ui/react';

// Define interfaces
interface VideoAsset {
  id: string;
  title: string;
  duration: number;
  width: number;
  height: number;
  contentPurpose: string[];
  thumbnailPath: string | null;
}

interface OverlayConfig {
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

interface OverlayConfigFormProps {
  asset: VideoAsset;
  contentDuration: number;
  initialConfig?: OverlayConfig;
  onSave: (config: OverlayConfig) => void;
  onCancel: () => void;
}

/**
 * Overlay configuration component
 */
const OverlayConfigForm: React.FC<OverlayConfigFormProps> = ({ 
  asset, 
  contentDuration, 
  initialConfig, 
  onSave, 
  onCancel 
}) => {
  const [startTime, setStartTime] = useState(initialConfig?.startTime || 0);
  const [duration, setDuration] = useState(
    initialConfig?.duration || Math.min(asset.duration, contentDuration)
  );
  
  const handleSaveConfig = () => {
    const config: OverlayConfig = {
      assetId: asset.id,
      startTime: startTime,
      duration: duration,
      position: {
        preset: 'center',
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
      <Stack gap="4" align="stretch">
        <Heading size="md">Configure Overlay: {asset.title}</Heading>
        
        <Separator />
        
        <Box>
          <Heading size="sm" mb={2}>Timing</Heading>
          <Stack direction={['column', 'row']} gap="4">
            <Field.Root>
              <Field.Label>Start Time (seconds)</Field.Label>
              <NumberInput.Root
                min={0}
                max={contentDuration - 0.1}
                step={0.1}
                value={startTime.toString()}
                onChange={(value) => setStartTime(Number(value))}
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
                value={duration.toString()}
                onChange={(value) => setDuration(Number(value))}
              >
                <NumberInput.Input />
                <NumberInput.Control>
                  <NumberInput.IncrementTrigger />
                  <NumberInput.DecrementTrigger />
                </NumberInput.Control>
              </NumberInput.Root>
              <Field.HelperText>How long overlay should appear</Field.HelperText>
            </Field.Root>
          </Stack>
        </Box>
        
        <Separator />
        
        <Text color="fg.muted" fontSize="sm">
          Additional configuration options (position, opacity, transitions) 
          will be available in the next version.
        </Text>
        
        <HStack justify="flex-end" gap="3">
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button colorPalette="blue" onClick={handleSaveConfig}>
            Save Configuration
          </Button>
        </HStack>
      </Stack>
    </Box>
  );
};

export default OverlayConfigForm;