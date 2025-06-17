/**
 * TransitionSection component
 */
import React from 'react';
import {
  Box,
  Heading,
  Input,
  Field,
} from '@chakra-ui/react';

interface TransitionSectionProps {
  crossfadeDuration: number;
  onChange: (value: number) => void;
}

/**
 * Transition settings section of the composition form
 */
const TransitionSection: React.FC<TransitionSectionProps> = ({
  crossfadeDuration,
  onChange
}) => {
  return (
    <Box>
      <Heading size="md" mb={4}>Transition Settings</Heading>
      <Field.Root mb={3}>
        <Field.Label>Crossfade Duration (seconds)</Field.Label>
        <Input
          type="number"
          step="0.1"
          min="0"
          max="3"
          value={crossfadeDuration}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      </Field.Root>
    </Box>
  );
};

export default TransitionSection;
