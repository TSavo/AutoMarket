import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  Input,
  Textarea,
  VStack,
  HStack,
  Text,
  Flex,
  Separator,
  Stack,
  Spinner,
  SimpleGrid,
  Field,
} from '@chakra-ui/react';
import { Dialog } from '@chakra-ui/react';

import VideoAssetCard from './VideoAssetCard';
import OverlayConfigForm from './OverlayConfigForm';

// Define interface for initial composition values
interface CompositionValues {
  title?: string;
  description?: string;
  contentAssetId?: string;
  introAssetId?: string;
  outroAssetId?: string;
  overlayConfigs?: Array<any>;
  crossfadeDuration?: number;
}

// Define props for the component
interface EnhancedCompositionFormProps {
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  initialValues?: CompositionValues | null;
}

/**
 * Enhanced version of the composition form with more features
 */
const EnhancedCompositionForm: React.FC<EnhancedCompositionFormProps> = ({
  onSubmit,
  isLoading = false,
  initialValues = null
}) => {
  const [title, setTitle] = useState(initialValues?.title || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [contentAssetId, setContentAssetId] = useState(initialValues?.contentAssetId || '');
  const [introAssetId, setIntroAssetId] = useState(initialValues?.introAssetId || '');
  const [outroAssetId, setOutroAssetId] = useState(initialValues?.outroAssetId || '');
  const [overlayConfigs, setOverlayConfigs] = useState(initialValues?.overlayConfigs || []);
  const [crossfadeDuration, setCrossfadeDuration] = useState(initialValues?.crossfadeDuration || 0.5);

  // Define interface for video assets
  interface VideoAsset {
    id: string;
    title: string;
    duration: number;
    width: number;
    height: number;
    contentPurpose: string[];
    thumbnailPath: string | null;
  }

  const [contentAssets, setContentAssets] = useState<VideoAsset[]>([]);
  const [introAssets, setIntroAssets] = useState<VideoAsset[]>([]);
  const [outroAssets, setOutroAssets] = useState<VideoAsset[]>([]);
  const [overlayAssets, setOverlayAssets] = useState<VideoAsset[]>([]);
  const [formIsLoading, setFormIsLoading] = useState(true);

  // Modal state for overlay configuration
  const [overlayConfigModalOpen, setOverlayConfigModalOpen] = useState(false);
  const [selectedOverlayAsset, setSelectedOverlayAsset] = useState<VideoAsset | null>(null);
  const [editingOverlayIndex, setEditingOverlayIndex] = useState(-1);

  // Mock fetch assets for demo
  useEffect(() => {
    // Simulate API fetch
    setTimeout(() => {
      setFormIsLoading(false);

      // Mock data
      setContentAssets([
        {
          id: 'content1',
          title: 'Main Content',
          duration: 120,
          width: 1920,
          height: 1080,
          contentPurpose: ['CONTENT'],
          thumbnailPath: null
        }
      ]);

      setIntroAssets([
        {
          id: 'intro1',
          title: 'Intro Video',
          duration: 10,
          width: 1920,
          height: 1080,
          contentPurpose: ['INTRO'],
          thumbnailPath: null
        }
      ]);

      setOutroAssets([
        {
          id: 'outro1',
          title: 'Outro Video',
          duration: 15,
          width: 1920,
          height: 1080,
          contentPurpose: ['OUTRO'],
          thumbnailPath: null
        }
      ]);

      setOverlayAssets([
        {
          id: 'overlay1',
          title: 'Logo Overlay',
          duration: 30,
          width: 400,
          height: 200,
          contentPurpose: ['OVERLAY'],
          thumbnailPath: null
        }
      ]);
    }, 1000);
  }, []);

  // Find selected content asset (for duration calculation)
  const selectedContentAsset = contentAssets.find(asset => asset.id === contentAssetId);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!title || !contentAssetId) {
      alert('Please fill in all required fields');
      return;
    }

    // Submit form
    onSubmit({
      title,
      description,
      contentAssetId,
      introAssetId: introAssetId || undefined,
      outroAssetId: outroAssetId || undefined,
      overlayConfigs,
      crossfadeDuration
    });
  };

  // Open overlay config modal
  const handleConfigureOverlay = (asset: VideoAsset, existingIndex = -1) => {
    setSelectedOverlayAsset(asset);
    setEditingOverlayIndex(existingIndex);
    setOverlayConfigModalOpen(true);
  };

  // Handle saving overlay configuration
  const handleSaveOverlayConfig = (config: any) => {
    if (editingOverlayIndex >= 0) {
      // Update existing config
      const updatedConfigs = [...overlayConfigs];
      updatedConfigs[editingOverlayIndex] = {
        ...updatedConfigs[editingOverlayIndex],
        ...config
      };
      setOverlayConfigs(updatedConfigs);
    } else if (selectedOverlayAsset) {
      // Add new config
      const newConfig = {
        assetId: selectedOverlayAsset.id,
        ...config
      };
      setOverlayConfigs([...overlayConfigs, newConfig]);
    }

    // Close modal
    setOverlayConfigModalOpen(false);
    setSelectedOverlayAsset(null);
    setEditingOverlayIndex(-1);
  };

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <Stack gap="6" align="stretch">
        <Box>
          <Heading size="md" mb={4}>Basic Information</Heading>
          <Field.Root required>
            <Field.Label>Title</Field.Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter composition title"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Description</Field.Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter composition description"
            />
          </Field.Root>
        </Box>

        <Separator />

        <Box>
          <Heading size="md" mb={4}>Content Video (Required)</Heading>
          {formIsLoading ? (
            <Flex justify="center" py={6}>
              <Spinner />
            </Flex>
          ) : contentAssets.length === 0 ? (
            <Text color="fg.muted">No content assets found</Text>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="4">
              {contentAssets.map(asset => (
                <VideoAssetCard
                  key={asset.id}
                  asset={asset}
                  selected={asset.id === contentAssetId}
                  onClick={() => setContentAssetId(asset.id)}
                />
              ))}
            </SimpleGrid>
          )}
        </Box>

        <Separator />

        <Box>
          <Heading size="md" mb={4}>Additional Configuration (Optional)</Heading>
          <Text color="fg.muted">
            Intro, outro, and overlay configuration options will be available in the full version.
          </Text>
        </Box>

        <Button
          type="submit"
          colorPalette="blue"
          size="lg"
          loading={isLoading}
          loadingText="Creating"
        >
          Create Composition
        </Button>
      </Stack>

      {/* Overlay Configuration Dialog */}
      {selectedOverlayAsset && (
        <Dialog.Root
          open={overlayConfigModalOpen}
          onOpenChange={({ open }) => setOverlayConfigModalOpen(open)}
          size="xl"
        >
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Title>Configure Overlay</Dialog.Title>
              <Dialog.CloseTrigger />
              <Dialog.Description>
                <OverlayConfigForm
                  asset={selectedOverlayAsset}
                  contentDuration={selectedContentAsset?.duration || 0}
                  initialConfig={editingOverlayIndex >= 0 ? overlayConfigs[editingOverlayIndex] : undefined}
                  onSave={handleSaveOverlayConfig}
                  onCancel={() => setOverlayConfigModalOpen(false)}
                />
              </Dialog.Description>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>
      )}
    </Box>
  );
};

export default EnhancedCompositionForm;