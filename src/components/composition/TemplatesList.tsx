/**
 * TemplatesList component
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Spinner,
  Flex,
  Button
} from '@chakra-ui/react';
import { toaster } from '../../components/ui/toaster';

import { CompositionProject } from '../../media/composition/models/CompositionProject';

interface TemplatesListProps {
  onSelectTemplate: (template: CompositionProject) => void;
}

/**
 * List of template projects
 */
const TemplatesList: React.FC<TemplatesListProps> = ({
  onSelectTemplate
}) => {
  const [templates, setTemplates] = useState<CompositionProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Using toaster for notifications

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      setIsLoading(true);

      const res = await fetch('/api/composition/project?templates=true');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch templates');
      }

      setTemplates(data.projects || []);
    } catch (error) {
      toaster.create({
        title: 'Error',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <Heading as="h2" size="lg" mb={4}>
        Project Templates
      </Heading>

      {isLoading ? (
        <Flex justify="center" py={6}>
          <Spinner />
        </Flex>
      ) : templates.length === 0 ? (
        <Text color="gray.500" textAlign="center" py={6}>
          No template projects found
        </Text>
      ) : (
        <Box>
          {templates.map(template => (
            <Box
              key={template.id}
              p={4}
              borderWidth="1px"
              borderRadius="md"
              mb={3}
            >
              <Heading size="md">{template.name}</Heading>
              {template.description && (
                <Text mt={1} color="gray.600">{template.description}</Text>
              )}
              <Button
                mt={3}
                colorScheme="blue"
                onClick={() => onSelectTemplate(template)}
              >
                Use Template
              </Button>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default TemplatesList;
