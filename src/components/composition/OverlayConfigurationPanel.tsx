/**
import React, { uimport React, { useState } from 'react';
import {
  Box,
  Field,
  Input,
  Select,
  Slider,
  HStack,
  VStack,
  Text,
  NumberInput,
  Grid,
  GridItem,
  RadioGroup,
  Stack,
  Separator,
} from '@chakra-ui/react';
import { createCollection } from '@ark-ui/react';eact';
import {
  Box,
  Field,
  Input,
  Select,
  Slider,
  HStack,
  VStack,
  Text,
  NumberInput,
  Grid,
  GridItem,
  RadioGroup,
  Stack,
  Separator,
  createListCollection,
} from '@chakra-ui/react';rationPanel for configuring overlay properties
 */

import React, { useState } from 'react';
import {
  Box,
  Field,
  Input,
  Select,
  Slider,
  HStack,
  VStack,
  Text,
  NumberInput,
  Grid,
  GridItem,
  RadioGroup,
  Stack,
  Separator,
  createListCollection,
} from '@chakra-ui/react';

interface OverlayPositionPreset {
  preset: string;
  label: string;
}

const POSITION_PRESETS: OverlayPositionPreset[] = [
  { preset: 'bottom-center', label: 'Bottom Center' },
  { preset: 'bottom-left', label: 'Bottom Left' },
  { preset: 'bottom-right', label: 'Bottom Right' },
  { preset: 'top-center', label: 'Top Center' },
  { preset: 'top-left', label: 'Top Left' },
  { preset: 'top-right', label: 'Top Right' },
  { preset: 'center-left', label: 'Center Left' },
  { preset: 'center-right', label: 'Center Right' },
  { preset: 'center', label: 'Center' },
];

interface OverlayConfig {
  startTime: number | string;
  endTime?: number | string;
  duration?: number;
  position: {
    preset?: string;
    x?: number;
    y?: number;
    size?: number;
  };
  opacity?: number;
  transition?: {
    fadeIn?: number;
    fadeOut?: number;
  };
  zIndex?: number;
}

interface OverlayConfigurationPanelProps {
  contentDuration: number;
  config: OverlayConfig;
  onChange: (config: OverlayConfig) => void;
}

/**
 * Panel for configuring overlay properties
 */
const OverlayConfigurationPanel: React.FC<OverlayConfigurationPanelProps> = ({
  contentDuration,
  config,
  onChange,
}) => {
  const [usePreset, setUsePreset] = useState(!!config.position.preset);
  const [usePercentage, setUsePercentage] = useState(
    typeof config.startTime === 'string' || typeof config.endTime === 'string'
  );

  // Handle start time change
  const handleStartTimeChange = (value: number | string) => {
    onChange({
      ...config,
      startTime: value,
    });
  };

  // Handle end time change
  const handleEndTimeChange = (value: number | string) => {
    onChange({
      ...config,
      endTime: value,
    });
  };

  // Handle position preset change
  const handlePresetChange = (preset: string) => {
    onChange({
      ...config,
      position: {
        ...config.position,
        preset,
      },
    });
  };

  // Handle custom position change
  const handleCustomPositionChange = (axis: 'x' | 'y', value: number) => {
    onChange({
      ...config,
      position: {
        ...config.position,
        [axis]: value,
      },
    });
  };

  // Handle size change
  const handleSizeChange = (value: number) => {
    onChange({
      ...config,
      position: {
        ...config.position,
        size: value,
      },
    });
  };

  // Handle opacity change
  const handleOpacityChange = (value: number) => {
    onChange({
      ...config,
      opacity: value,
    });
  };

  // Handle z-index change
  const handleZIndexChange = (value: number) => {
    onChange({
      ...config,
      zIndex: value,
    });
  };

  // Handle fade in/out change
  const handleTransitionChange = (type: 'fadeIn' | 'fadeOut', value: number) => {
    onChange({
      ...config,
      transition: {
        ...config.transition,
        [type]: value,
      },
    });
  };

  return (
    <VStack gap={4} align="stretch">
      <Box>
        <Text fontWeight="semibold" mb={2}>Timing</Text>
        <RadioGroup.Root
          value={usePercentage ? 'percentage' : 'seconds'}
          onValueChange={(details) => setUsePercentage(details.value === 'percentage')}
          mb={2}
        >
          <Stack direction="row">
            <RadioGroup.Item value="seconds">
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl>
                <RadioGroup.ItemIndicator />
                <RadioGroup.ItemText>Seconds</RadioGroup.ItemText>
              </RadioGroup.ItemControl>
            </RadioGroup.Item>
            <RadioGroup.Item value="percentage">
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl>
                <RadioGroup.ItemIndicator />
                <RadioGroup.ItemText>Percentage of Content</RadioGroup.ItemText>
              </RadioGroup.ItemControl>
            </RadioGroup.Item>
          </Stack>
        </RadioGroup.Root>

        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
          <GridItem>
            <Field.Root>
              <Field.Label>Start Time</Field.Label>
              {usePercentage ? (
                <HStack>
                  <NumberInput.Root
                    value={String(parseFloat(config.startTime.toString().replace('%', '')))}
                    min={0}
                    max={100}
                    onValueChange={(details) => handleStartTimeChange(`${details.value}%`)}
                  >
                    <NumberInput.Input />
                    <NumberInput.Control>
                      <NumberInput.IncrementTrigger />
                      <NumberInput.DecrementTrigger />
                    </NumberInput.Control>
                  </NumberInput.Root>
                  <Text>%</Text>
                </HStack>
              ) : (
                <NumberInput.Root
                  value={String(Number(config.startTime))}
                  min={0}
                  max={contentDuration}
                  onValueChange={(details) => handleStartTimeChange(Number(details.value))}
                  step={0.1}
                >
                  <NumberInput.Input />
                  <NumberInput.Control>
                    <NumberInput.IncrementTrigger />
                    <NumberInput.DecrementTrigger />
                  </NumberInput.Control>
                </NumberInput.Root>
              )}
            </Field.Root>
          </GridItem>

          <GridItem>
            <Field.Root>
              <Field.Label>End Time</Field.Label>
              {usePercentage ? (
                <HStack>
                  <NumberInput.Root
                    value={String(config.endTime ? parseFloat(config.endTime.toString().replace('%', '')) : 100)}
                    min={0}
                    max={100}
                    onValueChange={(details) => handleEndTimeChange(`${details.value}%`)}
                  >
                    <NumberInput.Input />
                    <NumberInput.Control>
                      <NumberInput.IncrementTrigger />
                      <NumberInput.DecrementTrigger />
                    </NumberInput.Control>
                  </NumberInput.Root>
                  <Text>%</Text>
                </HStack>
              ) : (
                <NumberInput.Root
                  value={String(Number(config.endTime || contentDuration))}
                  min={0}
                  max={contentDuration}
                  onValueChange={(details) => handleEndTimeChange(Number(details.value))}
                  step={0.1}
                >
                  <NumberInput.Input />
                  <NumberInput.Control>
                    <NumberInput.IncrementTrigger />
                    <NumberInput.DecrementTrigger />
                  </NumberInput.Control>
                </NumberInput.Root>
              )}
            </Field.Root>
          </GridItem>
        </Grid>
      </Box>

      <Separator />

      <Box>
        <Text fontWeight="semibold" mb={2}>Position</Text>
        <RadioGroup.Root
          value={usePreset ? 'preset' : 'custom'}
          onValueChange={(details) => setUsePreset(details.value === 'preset')}
          mb={2}
        >
          <Stack direction="row">
            <RadioGroup.Item value="preset">
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl>
                <RadioGroup.ItemIndicator />
                <RadioGroup.ItemText>Preset</RadioGroup.ItemText>
              </RadioGroup.ItemControl>
            </RadioGroup.Item>
            <RadioGroup.Item value="custom">
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl>
                <RadioGroup.ItemIndicator />
                <RadioGroup.ItemText>Custom</RadioGroup.ItemText>
              </RadioGroup.ItemControl>
            </RadioGroup.Item>
          </Stack>
        </RadioGroup.Root>

        {usePreset ? (
          <Select.Root
            value={[config.position.preset || 'bottom-center']}
            onValueChange={(details) => handlePresetChange(details.value[0])}
            collection={createListCollection({
              items: POSITION_PRESETS.map(preset => ({
                id: preset.preset,
                label: preset.label,
                value: preset.preset
              }))
            })}
          >
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText />
              </Select.Trigger>
              <Select.IndicatorGroup>
                <Select.Indicator />
              </Select.IndicatorGroup>
            </Select.Control>
            <Select.Positioner>
              <Select.Content>
                {POSITION_PRESETS.map((preset) => (
                  <Select.Item key={preset.preset} item={{ id: preset.preset }}>
                    <Select.ItemText>{preset.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Select.Root>
        ) : (
          <Grid templateColumns="repeat(2, 1fr)" gap={4}>
            <GridItem>
              <Field.Root>
                <Field.Label>X Position (%)</Field.Label>
                <NumberInput.Root
                  value={String(config.position.x || 0)}
                  min={0}
                  max={100}
                  onValueChange={(details) => handleCustomPositionChange('x', Number(details.value))}
                >
                  <NumberInput.Input />
                  <NumberInput.Control>
                    <NumberInput.IncrementTrigger />
                    <NumberInput.DecrementTrigger />
                  </NumberInput.Control>
                </NumberInput.Root>
              </Field.Root>
            </GridItem>

            <GridItem>
              <Field.Root>
                <Field.Label>Y Position (%)</Field.Label>
                <NumberInput.Root
                  value={String(config.position.y || 0)}
                  min={0}
                  max={100}
                  onValueChange={(details) => handleCustomPositionChange('y', Number(details.value))}
                >
                  <NumberInput.Input />
                  <NumberInput.Control>
                    <NumberInput.IncrementTrigger />
                    <NumberInput.DecrementTrigger />
                  </NumberInput.Control>
                </NumberInput.Root>
              </Field.Root>
            </GridItem>
          </Grid>
        )}

        <Field.Root mt={4}>
          <Field.Label>Size (%)</Field.Label>
          <Select.Root
            value={[config.position.size?.toString() || "100"]}
            onValueChange={(details) => handleSizeChange(parseInt(details.value[0]))}
            collection={createListCollection({
              items: [
                { id: "25", label: "25%", value: "25" },
                { id: "50", label: "50%", value: "50" },
                { id: "75", label: "75%", value: "75" },
                { id: "100", label: "100%", value: "100" }
              ]
            })}
          >
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText />
              </Select.Trigger>
              <Select.IndicatorGroup>
                <Select.Indicator />
              </Select.IndicatorGroup>
            </Select.Control>
            <Select.Positioner>
              <Select.Content>
                <Select.Item item={{ id: "25" }}>
                  <Select.ItemText>25%</Select.ItemText>
                </Select.Item>
                <Select.Item item={{ id: "50" }}>
                  <Select.ItemText>50%</Select.ItemText>
                </Select.Item>
                <Select.Item item={{ id: "75" }}>
                  <Select.ItemText>75%</Select.ItemText>
                </Select.Item>
                <Select.Item item={{ id: "100" }}>
                  <Select.ItemText>100%</Select.ItemText>
                </Select.Item>
              </Select.Content>
            </Select.Positioner>
          </Select.Root>
        </Field.Root>
      </Box>

      <Separator />

      <Box>
        <Text fontWeight="semibold" mb={2}>Visual Properties</Text>
        <Field.Root mb={4}>
          <Field.Label>Opacity</Field.Label>
          <HStack>
            <Slider.Root
              value={[config.opacity || 1]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={(details) => handleOpacityChange(details.value[0])}
              flex="1"
            >
              <Slider.Control>
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>
                <Slider.Thumbs />
              </Slider.Control>
            </Slider.Root>
            <Box w="60px">
              <NumberInput.Root
                value={String(config.opacity || 1)}
                min={0}
                max={1}
                step={0.01}
                onValueChange={(details) => handleOpacityChange(Number(details.value))}
              >
                <NumberInput.Input />
              </NumberInput.Root>
            </Box>
          </HStack>
        </Field.Root>

        <Field.Root>
          <Field.Label>Z-Index</Field.Label>
          <NumberInput.Root
            value={String(config.zIndex || 0)}
            min={0}
            max={10}
            onValueChange={(details) => handleZIndexChange(Number(details.value))}
          >
            <NumberInput.Input />
            <NumberInput.Control>
              <NumberInput.IncrementTrigger />
              <NumberInput.DecrementTrigger />
            </NumberInput.Control>
          </NumberInput.Root>
        </Field.Root>
      </Box>

      <Separator />

      <Box>
        <Text fontWeight="semibold" mb={2}>Transitions</Text>
        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
          <GridItem>
            <Field.Root>
              <Field.Label>Fade In (seconds)</Field.Label>
              <NumberInput.Root
                value={String(config.transition?.fadeIn || 0)}
                min={0}
                max={5}
                step={0.1}
                onValueChange={(details) => handleTransitionChange('fadeIn', Number(details.value))}
              >
                <NumberInput.Input />
                <NumberInput.Control>
                  <NumberInput.IncrementTrigger />
                  <NumberInput.DecrementTrigger />
                </NumberInput.Control>
              </NumberInput.Root>
            </Field.Root>
          </GridItem>

          <GridItem>
            <Field.Root>
              <Field.Label>Fade Out (seconds)</Field.Label>
              <NumberInput.Root
                value={String(config.transition?.fadeOut || 0)}
                min={0}
                max={5}
                step={0.1}
                onValueChange={(details) => handleTransitionChange('fadeOut', Number(details.value))}
              >
                <NumberInput.Input />
                <NumberInput.Control>
                  <NumberInput.IncrementTrigger />
                  <NumberInput.DecrementTrigger />
                </NumberInput.Control>
              </NumberInput.Root>
            </Field.Root>
          </GridItem>
        </Grid>
      </Box>
    </VStack>
  );
};

export default OverlayConfigurationPanel;
