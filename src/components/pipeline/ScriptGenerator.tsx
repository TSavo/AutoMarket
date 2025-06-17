/**
 * Script Generator Component
 *
 * Displays the generated script and allows the user to edit, approve, or regenerate it.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  Textarea,
  Stack,
  HStack,
  Badge,
  Separator
} from '@chakra-ui/react';
import { Script } from '../../pipeline/types';
import { AspectRatio } from '../../common/aspect-ratio/types';
import { FiClock, FiEdit3, FiVideo } from 'react-icons/fi';
import { AspectRatioSelector, AspectRatioPreview } from '../../components/AspectRatioSelector';

interface ScriptGeneratorProps {
  script: Script | undefined;
  onApproveScript: (aspectRatio: AspectRatio) => void;
  onEditScript: (editedScript: string) => void;
  onRegenerateScript: () => void;
  onGenerateAvatar: () => void;
  loading: boolean;
  isApproved: boolean;
}

export default function ScriptGenerator({
  script,
  onApproveScript,
  onEditScript,
  onRegenerateScript,
  onGenerateAvatar,
  loading,
  isApproved
}: ScriptGeneratorProps) {
  const [editMode, setEditMode] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [estimatedDuration, setEstimatedDuration] = useState(0);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>(
    script?.aspectRatio || AspectRatio.LANDSCAPE_WIDESCREEN
  );

  // Initialize with script text when component mounts or script changes
  useEffect(() => {
    if (script?.text) {
      setEditedText(script.text);

      // Calculate word count
      const words = script.text.split(/\s+/).filter(Boolean).length;
      setWordCount(words);

      // Estimate duration (2.5 words per second)
      setEstimatedDuration(Math.round(words / 2.5));

      // Set aspect ratio if available in the script
      if (script.aspectRatio) {
        setSelectedAspectRatio(script.aspectRatio);
      }
    }
  }, [script]);

  // Update word count and duration when edited text changes
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setEditedText(newText);

    // Calculate word count
    const words = newText.split(/\s+/).filter(Boolean).length;
    setWordCount(words);

    // Estimate duration (2.5 words per second)
    setEstimatedDuration(Math.round(words / 2.5));
  };

  // Handle save button click
  const handleSave = () => {
    onEditScript(editedText);
    setEditMode(false);
  };

  if (!script) {
    return (
      <Box p={4} textAlign="center">
        <Text>No script available. Please generate one first.</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Stack gap={6}>
        <HStack justify="space-between" align="center">
          <Heading size="md">
            {isApproved ? 'Approved Script' : 'Generated Script'}
            {script.regenerated && (
              <Badge ml={2} colorPalette="green">Regenerated</Badge>
            )}
          </Heading>

          {!editMode && !isApproved && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditMode(true)}
              disabled={loading}
            >
              <FiEdit3 style={{ marginRight: '8px' }} />
              Edit
            </Button>
          )}
        </HStack>

        <Box p={4} borderWidth={1} borderRadius="md" bg="white">
          {editMode ? (
            <Textarea
              value={editedText}
              onChange={handleTextChange}
              minHeight="200px"
              disabled={loading}
              placeholder="Edit your script here..."
            />
          ) : (
            <Text whiteSpace="pre-wrap">{script.text}</Text>
          )}
        </Box>

        {/* Script stats */}
        <Stack
          direction={{ base: 'column', md: 'row' }}
          gap={4}
          justify="center"
        >
          <Box textAlign="center" p={4} borderWidth={1} borderRadius="md">
            <Text fontSize="sm" color="gray.600">Words</Text>
            <Text fontSize="2xl" fontWeight="bold">{wordCount}</Text>
            <Text fontSize="xs" color="gray.500">Target: 75-125 words</Text>
          </Box>

          <Box textAlign="center" p={4} borderWidth={1} borderRadius="md">
            <Text fontSize="sm" color="gray.600">Estimated Duration</Text>
            <Text fontSize="2xl" fontWeight="bold">{estimatedDuration}s</Text>
            <Text fontSize="xs" color="gray.500">
              <FiClock style={{ display: 'inline', marginRight: '4px' }} />
              Target: 30-45 seconds
            </Text>
          </Box>

          {script.aspectRatio && (
            <Box textAlign="center" p={4} borderWidth={1} borderRadius="md">
              <Text fontSize="sm" color="gray.600">Aspect Ratio</Text>
              <Text fontSize="2xl" fontWeight="bold">{script.aspectRatio}</Text>
              <Text fontSize="xs" color="gray.500">
                <FiVideo style={{ display: 'inline', marginRight: '4px' }} />
                Video Format
              </Text>
            </Box>
          )}
        </Stack>

        {/* Aspect Ratio Selector (only shown when not in edit mode and not approved) */}
        {!editMode && !isApproved && (
          <>
            <Separator my={4} />
            <Box>
              <Heading size="sm" mb={4}>Video Format</Heading>
              <HStack gap={6} align="flex-start">
                <Box flex="1">
                  <AspectRatioSelector
                    selectedAspectRatio={selectedAspectRatio}
                    onChange={setSelectedAspectRatio}
                  />
                </Box>
                <Box>
                  <AspectRatioPreview aspectRatio={selectedAspectRatio} />
                </Box>
              </HStack>
            </Box>
          </>
        )}

        {/* Action buttons */}
        <HStack gap={4} justify="center" mt={4}>
          {editMode ? (
            <>
              <Button
                colorPalette="purple"
                onClick={handleSave}
                disabled={loading}
                loading={loading}
              >
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditedText(script.text);
                  setEditMode(false);
                }}
                disabled={loading}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              {isApproved ? (
                <Button
                  colorPalette="purple"
                  onClick={onGenerateAvatar}
                  disabled={loading}
                  loading={loading}
                >
                  Generate Avatar Video
                </Button>
              ) : (
                <>
                  <Button
                    colorPalette="purple"
                    onClick={() => onApproveScript(selectedAspectRatio)}
                    disabled={loading}
                    loading={loading}
                  >
                    Approve Script
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onRegenerateScript}
                    disabled={loading}
                  >
                    Regenerate
                  </Button>
                </>
              )}
            </>
          )}
        </HStack>

        {/* Guidance text */}
        {!isApproved && (
          <Box mt={4} p={4} bg="purple.50" borderRadius="md">
            <Text fontSize="sm" color="purple.700">
              <strong>Script Guidelines:</strong> Aim for 30-45 seconds of speaking time (75-125 words).
              Ensure the script captures the key points from your blog while maintaining the cyberpunk tone.
              The standard opening "Hey chummers" and closing "For more dystopia, visit horizon-dash-city dot com. Walk safe!" will be automatically added.
            </Text>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
