import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  HStack,
  Card,
  Badge,
  Flex,
  Spinner,
} from '@chakra-ui/react';

// Define the necessary types here instead of importing from server-side code
enum PipelineState {
  INITIAL = 'initial',
  BLOG_SELECTION = 'blog_selection',
  SCRIPT_GENERATION = 'script_generation',
  SCRIPT_REVIEW = 'script_review',
  AVATAR_GENERATION = 'avatar_generation',
  AVATAR_REVIEW = 'avatar_review',
  AUTO_COMPOSITION = 'auto_composition',
  COMPOSITION_REVIEW = 'composition_review',
  PUBLISHING = 'publishing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

enum PipelineAction {
  SELECT_BLOG = 'select_blog',
  GENERATE_SCRIPT = 'generate_script',
  APPROVE_SCRIPT = 'approve_script',
  REGENERATE_SCRIPT = 'regenerate_script',
  GENERATE_AVATAR = 'generate_avatar',
  APPROVE_AVATAR = 'approve_avatar',
  REGENERATE_AVATAR = 'regenerate_avatar',
  AUTO_COMPOSE = 'auto_compose',
  APPROVE_COMPOSITION = 'approve_composition',
  REGENERATE_COMPOSITION = 'regenerate_composition',
  PUBLISH = 'publish',
  RESET = 'reset'
}

interface ClientPipelineUIProps {
  pipelineId: string;
}

/**
 * Client-side version of the PipelineUI component
 * This uses API calls instead of direct server-side code
 */
const ClientPipelineUI: React.FC<ClientPipelineUIProps> = ({ pipelineId }) => {
  const [currentState, setCurrentState] = useState<PipelineState>(PipelineState.INITIAL);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load the initial pipeline state
  useEffect(() => {
    const loadPipeline = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/pipeline-client?id=${pipelineId}`);

        if (!response.ok) {
          throw new Error('Failed to load pipeline');
        }

        const data = await response.json();
        setCurrentState(data.state);
      } catch (err) {
        console.error('Error loading pipeline:', err);
        setError('Failed to load pipeline');
      } finally {
        setLoading(false);
      }
    };

    loadPipeline();
  }, [pipelineId]);

  // Perform a pipeline action
  const performAction = async (action: PipelineAction, payload?: any) => {
    try {
      setLoading(true);
      const response = await fetch('/api/pipeline-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: pipelineId,
          action,
          payload,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to perform action');
      }

      const data = await response.json();
      setCurrentState(data.state);
    } catch (err) {
      console.error('Error performing action:', err);
      setError('Failed to perform action');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box p={4} textAlign="center">
        <Spinner size="xl" />
        <Text mt={2}>Loading pipeline...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4} bg="red.50" borderRadius="md">
        <Heading size="md" color="red.500">Error</Heading>
        <Text>{error}</Text>
        <Button mt={4} colorPalette="blue" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Heading mb={4}>Video Pipeline</Heading>
      <Text mb={4}>Current State: {currentState}</Text>

      {/* Add your UI components based on the current state */}
      {/* This is a simplified version - you would need to implement the full UI */}

      <Card.Root p={4} mb={4}>
        <Heading size="md" mb={2}>Pipeline Controls</Heading>
        <HStack gap={4}>
          <Button
            colorPalette="blue"
            onClick={() => performAction(PipelineAction.RESET)}
          >
            Reset Pipeline
          </Button>
        </HStack>
      </Card.Root>
    </Box>
  );
};

export default ClientPipelineUI;
