/**
 * BasicInfoSection component
 */
import React from 'react';
import {
  Box,
  Heading,
  Input,
  Textarea,
  Field,
} from '@chakra-ui/react';

interface BasicInfoSectionProps {
  title: string;
  description: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

/**
 * Basic information section of the composition form
 */
const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  title,
  description,
  onTitleChange,
  onDescriptionChange
}) => {
  return (
    <Box>
      <Heading size="md" mb={4}>Basic Information</Heading>
      <Field.Root required mb={3}>
        <Field.Label>Title</Field.Label>
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Enter composition title"
        />
      </Field.Root>
      
      <Field.Root mb={3}>
        <Field.Label>Description</Field.Label>
        <Textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Enter composition description"
        />
      </Field.Root>
    </Box>
  );
};

export default BasicInfoSection;
