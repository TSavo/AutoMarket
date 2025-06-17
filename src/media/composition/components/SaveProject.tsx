/**
 * SaveProject.tsx
 *
 * Component for saving composition projects
 */

import React, { useState } from 'react';
import {
  Field,
  Button,
  Input,
  Textarea,
  VStack,
  Text,
  Tag,
  Flex,
  HStack,
  IconButton,
  Separator,
} from '@chakra-ui/react';
import { Dialog, Checkbox } from '@chakra-ui/react';
import { FiPlus } from 'react-icons/fi';
import { Composition } from '../models/Composition';
import { CompositionProject } from '../models/CompositionProject';

// Props for SaveProjectModal
interface SaveProjectModalProps {
  open: boolean;
  onClose: () => void;
  composition: Composition;
  project?: CompositionProject; // Optional project for editing
  onSave: (project: CompositionProject) => void;
}

/**
 * Modal for saving composition projects
 */
export function SaveProjectModal({
  open,
  onClose,
  composition,
  project,
  onSave,
}: SaveProjectModalProps) {
  // Form state
  const [title, setTitle] = useState(project?.name || composition.title || '');
  const [description, setDescription] = useState(project?.description || composition.description || '');
  const [isTemplate, setIsTemplate] = useState(project?.isTemplate || false);
  const [tags, setTags] = useState<string[]>(project?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title) {
      // Error: Title is required
      console.error('Title is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare project data
      const projectData = {
        id: project?.id,
        name: title,
        description,
        composition,
        isTemplate,
        tags,
      };

      // Call onSave callback
      onSave(projectData as CompositionProject);

      // Close modal
      onClose();
    } catch (error) {
      console.error('Error saving project:', error);
      // Error: Failed to save project
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle adding a tag
  const addTag = () => {
    if (!newTag) return;
    if (!tags.includes(newTag)) {
      setTags([...tags, newTag]);
    }
    setNewTag('');
  };

  // Handle removing a tag
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  return (
    <Dialog.Root
      size="lg"
      open={open}
      onOpenChange={onClose}
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <form onSubmit={handleSubmit}>
            <Dialog.Title>
              {project ? 'Update Project' : 'Save as Project'}
            </Dialog.Title>
            <Dialog.CloseTrigger />

            <Dialog.Description>
              <VStack gap={4} align="stretch">
                <Field.Root required>
                  <Field.Label>Title</Field.Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter project title"
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>Description</Field.Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter project description"
                  />
                </Field.Root>

                <Separator />

                <Field.Root>
                  <Field.Label>Tags</Field.Label>
                  <Flex mb={2} wrap="wrap" gap={2}>
                    {tags.map(tag => (
                      <Tag.Root key={tag} size="md" variant="subtle" colorScheme="blue">
                        <Tag.Label>{tag}</Tag.Label>
                        <Tag.CloseTrigger onClick={() => removeTag(tag)} />
                      </Tag.Root>
                    ))}
                  </Flex>
                  <HStack>
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add a tag"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <IconButton
                      aria-label="Add tag"
                      onClick={addTag}
                    >
                      <FiPlus />
                    </IconButton>
                  </HStack>
                </Field.Root>

                <Checkbox.Root
                  checked={isTemplate}
                  onCheckedChange={(details) => setIsTemplate(details.checked === true)}
                >
                  <Checkbox.Control />
                  <Checkbox.Label>Save as template</Checkbox.Label>
                </Checkbox.Root>

                {isTemplate && (
                  <Text fontSize="sm" color="gray.500">
                    Templates can be used as a starting point for new compositions
                  </Text>
                )}
              </VStack>
            </Dialog.Description>

            <Dialog.Footer>
              <Button variant="outline" mr={3} onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                colorScheme="blue"
                loading={isSubmitting}
                loadingText="Saving"
              >
                {project ? 'Update' : 'Save'}
              </Button>
            </Dialog.Footer>
          </form>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
