/**
 * Pipeline State UI Component
 *
 * React component for interacting with the blog-to-video pipeline.
 * Displays current state, available actions, and stage-specific UI components.
 */

'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Container,
  Heading,
  Text,
  Stack,
  Progress
} from '@chakra-ui/react';
import {
  PipelineAction,
  PipelineContext,
  PipelineState,
  BlogPost
} from '../pipeline/types';

// Stage-specific UI components
import BlogSelector from './pipeline/BlogSelector';
import ScriptGenerator from './pipeline/ScriptGenerator';
import AvatarGenerator from './pipeline/AvatarGenerator';
import VideoComposer from './pipeline/VideoComposer';
import FinalApproval from './pipeline/FinalApproval';

interface PipelineUIProps {
  creatifyApiId?: string;
  creatifyApiKey?: string;
  initialPipelineId?: string;
  onComplete?: (context: PipelineContext) => void;
}

export default function PipelineUI({
  creatifyApiId,
  creatifyApiKey,
  initialPipelineId,
  onComplete
}: PipelineUIProps) {  // State
  const [context, setContext] = useState<PipelineContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipelineId, setPipelineId] = useState<string | null>(initialPipelineId || null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Toast notifications - using a simple function instead of useToast
  const showToast = (title: string, description: string, status: 'success' | 'error' | 'info') => {
    console.log(`${status.toUpperCase()}: ${title} - ${description}`);
    // In a real app, you'd implement proper toast notifications here
  };

  // Initialize pipeline context
  useEffect(() => {
    if (pipelineId) {
      // Load existing pipeline
      loadPipelineContext(pipelineId);
    } else {
      // Create a new pipeline context - start with null until blog is selected
      setContext(null);
    }
  }, [pipelineId]);

  // Polling for real-time updates
  useEffect(() => {
    if (!pipelineId || !context) return;

    const pollInterval = 5000; // Poll every 5 seconds
    let pollTimer: NodeJS.Timeout;

    const pollForUpdates = async () => {
      try {
        const response = await fetch(`/api/pipeline?id=${pipelineId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.context.metadata.updatedAt !== lastUpdated) {
            setContext(data.context);
            setLastUpdated(data.context.metadata.updatedAt);
            console.log('Pipeline state updated via polling');
          }
        }
      } catch (error) {
        // Silently fail polling errors to avoid spam
        console.debug('Polling error:', error);
      }
    };

    // Only poll if the pipeline is in an active state
    const activeStates = [
      PipelineState.SCRIPT_GENERATING,
      PipelineState.AVATAR_GENERATING,
      PipelineState.AUTO_COMPOSING
    ];

    if (activeStates.includes(context.currentState as PipelineState)) {
      pollTimer = setInterval(pollForUpdates, pollInterval);
    }

    return () => {
      if (pollTimer) {
        clearInterval(pollTimer);
      }
    };
  }, [pipelineId, context?.currentState, lastUpdated]);

  // Load pipeline context from API
  const loadPipelineContext = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/pipeline?id=${id}`);
      if (!response.ok) {
        throw new Error('Failed to load pipeline');
      }
      const data = await response.json();
      setContext(data.context);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipeline');
      showToast(
        'Load Error',
        err instanceof Error ? err.message : 'Failed to load pipeline',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle blog selection
  const handleBlogSelected = async (blog: BlogPost) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          payload: { blog }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start pipeline');
      }

      const data = await response.json();
      setContext(data.context);
      setPipelineId(data.pipelineId);

      showToast(
        'Blog Selected',
        `Selected: ${blog.title}`,
        'success'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select blog');
      showToast(
        'Error',
        err instanceof Error ? err.message : 'Failed to select blog',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle pipeline action execution with retry logic
  const handleExecuteAction = async (action: PipelineAction, payload?: any, retryCount = 0) => {
    if (!pipelineId) return;

    setLoading(true);
    setError(null);

    const maxRetries = 3;
    const retryDelay = 1000 * Math.pow(2, retryCount); // Exponential backoff

    try {
      const response = await fetch('/api/pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'execute',
          pipelineId,
          payload: {
            action,
            data: payload
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to execute ${action}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || `Failed to execute ${action}`);
      }

      setContext(data.context);

      // Check if the pipeline is complete
      if (data.context.currentState === PipelineState.READY_FOR_PUBLISHING && onComplete) {
        onComplete(data.context);
      }

      showToast(
        'Action Complete',
        `Successfully executed ${action}`,
        'success'
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to execute ${action}`;

      // Retry logic for transient errors
      if (retryCount < maxRetries && isRetryableError(err)) {
        console.warn(`Retrying ${action} (attempt ${retryCount + 1}/${maxRetries}) after ${retryDelay}ms`);

        setTimeout(() => {
          handleExecuteAction(action, payload, retryCount + 1);
        }, retryDelay);

        showToast(
          'Retrying...',
          `Attempt ${retryCount + 1}/${maxRetries} failed, retrying...`,
          'info'
        );
        return;
      }

      setError(errorMessage);
      showToast(
        'Action Failed',
        errorMessage,
        'error'
      );
    } finally {
      if (retryCount === 0) { // Only set loading false on the final attempt
        setLoading(false);
      }
    }
  };

  // Helper function to determine if an error is retryable
  const isRetryableError = (error: any): boolean => {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      // Retry on network errors, timeouts, and server errors
      return message.includes('network') ||
             message.includes('timeout') ||
             message.includes('fetch') ||
             message.includes('500') ||
             message.includes('502') ||
             message.includes('503');
    }
    return false;
  };

  // Handle going back to a previous state
  const handleRestartFromState = async (state: PipelineState) => {
    if (!pipelineId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'restart',
          pipelineId,
          payload: {
            targetState: state
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to restart from ${state}`);
      }

      const data = await response.json();
      setContext(data.context);

      showToast(
        'Restarted',
        `Successfully restarted from ${state}`,
        'info'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to restart from ${state}`);
      showToast(
        'Restart Failed',
        err instanceof Error ? err.message : `Failed to restart from ${state}`,
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Render appropriate UI based on current state
  const renderStateUI = () => {
    if (!context) return null;

    switch (context.currentState) {
      case PipelineState.BLOG_SELECTED:
        return (
          <BlogSelector
            selectedBlog={context.blog}
            onBlogSelected={handleBlogSelected}
            onGenerateScript={() => handleExecuteAction(PipelineAction.GENERATE_SCRIPT)}
            loading={loading}
          />
        );

      case PipelineState.SCRIPT_GENERATING:        return (
          <Box p={4} textAlign="center">
            <Heading size="md" mb={4}>Generating Script</Heading>
            <Progress.Root colorPalette="purple">
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
            <Text mt={4}>Using AI to create a cyberpunk-themed script for your blog post...</Text>
          </Box>
        );

      case PipelineState.SCRIPT_GENERATED:
      case PipelineState.SCRIPT_APPROVED:
        return (
          <ScriptGenerator
            script={context.script}
            onApproveScript={(aspectRatio) => handleExecuteAction(PipelineAction.APPROVE_SCRIPT, { aspectRatio })}
            onEditScript={(editedScript) => handleExecuteAction(PipelineAction.EDIT_SCRIPT, { editedScript })}
            onRegenerateScript={() => handleExecuteAction(PipelineAction.REGENERATE_SCRIPT)}
            onGenerateAvatar={() => handleExecuteAction(PipelineAction.GENERATE_AVATAR)}
            loading={loading}
            isApproved={context.currentState === PipelineState.SCRIPT_APPROVED}
          />
        );

      case PipelineState.AVATAR_GENERATING:        return (
          <Box p={4} textAlign="center">
            <Heading size="md" mb={4}>Generating Avatar Video</Heading>
            <Progress.Root colorPalette="purple">
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
            <Text mt={4}>Creating an AI avatar video with your approved script...</Text>
          </Box>
        );

      case PipelineState.AVATAR_GENERATED:
        return (
          <AvatarGenerator
            avatarVideo={context.avatarVideo}
            onAutoCompose={() => handleExecuteAction(PipelineAction.AUTO_COMPOSE)}
            onRegenerateAvatar={() => handleExecuteAction(PipelineAction.REGENERATE_AVATAR)}
            loading={loading}
          />
        );

      case PipelineState.AUTO_COMPOSING:        return (
          <Box p={4} textAlign="center">
            <Heading size="md" mb={4}>Auto-Composing Video</Heading>
            <Progress.Root colorPalette="purple">
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
            <Text mt={4}>Adding branding, intro, and outro to your avatar video...</Text>
          </Box>
        );

      case PipelineState.AUTO_COMPOSED:
        return (
          <VideoComposer
            composedVideo={context.composedVideo}
            onApproveFinal={() => handleExecuteAction(PipelineAction.APPROVE_FINAL)}
            onRegenerateComposition={() => handleExecuteAction(PipelineAction.REGENERATE_COMPOSITION)}
            loading={loading}
          />
        );

      case PipelineState.FINAL_APPROVED:
      case PipelineState.READY_FOR_PUBLISHING:
        return (
          <FinalApproval
            context={context}
            loading={loading}
          />
        );

      case PipelineState.ERROR:
        return (
          <Box p={4} textAlign="center" bg="red.50" borderRadius="md">
            <Heading size="md" color="red.500" mb={4}>Error Occurred</Heading>
            <Text color="red.700" mb={4}>{context.error?.message || 'An unknown error occurred'}</Text>
            <Button
              colorPalette="red"
              onClick={() => handleRestartFromState(PipelineState.BLOG_SELECTED)}
            >
              Restart Pipeline
            </Button>
          </Box>
        );

      default:
        // This should never happen with proper type checking
        return (
          <Box p={4} textAlign="center">
            <Text>Unknown state encountered</Text>
          </Box>
        );
    }
  };

  // Render timeline steps
  const renderTimeline = () => {
    if (!context) return null;

    const steps = [
      { state: PipelineState.BLOG_SELECTED, label: 'Blog Selected' },
      { state: PipelineState.SCRIPT_GENERATED, label: 'Script Generated' },
      { state: PipelineState.SCRIPT_APPROVED, label: 'Script Approved' },
      { state: PipelineState.AVATAR_GENERATED, label: 'Avatar Generated' },
      { state: PipelineState.AUTO_COMPOSED, label: 'Video Composed' },
      { state: PipelineState.READY_FOR_PUBLISHING, label: 'Ready' }
    ];

    const getCurrentStepIndex = () => {
      const currentState = context.currentState;

      // Map processing states to the previous completed state for the UI
      if (currentState === PipelineState.SCRIPT_GENERATING) {
        return 0; // After blog selected
      }
      if (currentState === PipelineState.AVATAR_GENERATING) {
        return 2; // After script approved
      }
      if (currentState === PipelineState.AUTO_COMPOSING) {
        return 3; // After avatar generated
      }
      if (currentState === PipelineState.FINAL_APPROVED) {
        return 4; // After video composed
      }

      // Find the exact state index
      const index = steps.findIndex(step => step.state === currentState);
      return index >= 0 ? index : 0;
    };

    const currentIndex = getCurrentStepIndex();

    return (
      <Stack direction="row" gap={0} align="center" mb={8} w="full">
        {steps.map((step, index) => (
          <React.Fragment key={step.state}>
            {/* Connecting line */}
            {index > 0 && (
              <Box
                flex={1}
                h="2px"
                bg={index <= currentIndex ? 'purple.500' : 'gray.200'}
              />
            )}

            {/* Step circle */}
            <Box
              borderRadius="full"
              bg={index <= currentIndex ? 'purple.500' : 'gray.200'}
              color={index <= currentIndex ? 'white' : 'gray.500'}
              w="30px"
              h="30px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              position="relative"
              cursor={index < currentIndex ? 'pointer' : 'default'}
              onClick={() => {
                if (index < currentIndex) {
                  handleRestartFromState(step.state);
                }
              }}
            >
              {index + 1}

              {/* Label */}
              <Text
                position="absolute"
                top="100%"
                mt={1}
                fontSize="xs"
                fontWeight={index === currentIndex ? 'bold' : 'normal'}
                textAlign="center"
                color={index <= currentIndex ? 'purple.500' : 'gray.500'}
                whiteSpace="nowrap"
              >
                {step.label}
              </Text>
            </Box>
          </React.Fragment>
        ))}
      </Stack>
    );
  };

  return (
    <Container maxW="container.lg" py={8}>      <Card.Root p={6}>
        <Stack gap={6}>
          <Heading textAlign="center" size="lg" mb={2}>
            Blog-to-Video Pipeline
          </Heading>

          {/* Timeline progress */}
          {context && renderTimeline()}

          {/* Current stage UI */}
          {renderStateUI()}

          {/* Error display */}
          {error && !context?.error && (
            <Box p={4} bg="red.50" borderRadius="md">
              <Text color="red.500">{error}</Text>
            </Box>
          )}        </Stack>
      </Card.Root>
    </Container>
  );
}
