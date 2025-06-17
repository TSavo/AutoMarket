/**
 * CompositionForm component
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  VStack,
  Separator,
} from '@chakra-ui/react';

// Import sub-components
import BasicInfoSection from './form/BasicInfoSection';
import ContentSection from './form/ContentSection';
import IntroSection from './form/IntroSection';
import OutroSection from './form/OutroSection';
import OverlaySection from './form/OverlaySection';
import TransitionSection from './form/TransitionSection';

interface CompositionFormProps {
  onSubmit: (data: any) => void;
  initialValues?: any;
  onOverlaySelect: (overlayId: string | null) => void;
}

/**
 * Form for creating and editing compositions
 */
const CompositionForm: React.FC<CompositionFormProps> = ({
  onSubmit,
  initialValues,
  onOverlaySelect
}) => {
  // Form state
  const [formValues, setFormValues] = useState({
    title: '',
    description: '',
    contentAssetId: '',
    introAssetId: '',
    outroAssetId: '',
    overlayAssetIds: [],
    autoPosition: true,
    crossfadeDuration: 0.5,
    overlayConfigs: {}
  });
  // Update form values when initialValues changes
  useEffect(() => {
    if (initialValues) {
      setFormValues(prev => ({
        ...prev,
        ...initialValues
      }));
    }
  }, [initialValues]);
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formValues.title || !formValues.contentAssetId) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Submit form
    onSubmit(formValues);
  };
  
  // Handle form field changes
  const updateField = (field: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle overlay selection
  const handleOverlaySelect = (overlayId: string) => {
    onOverlaySelect(overlayId);
  };
  
  return (
    <Box as="form" onSubmit={handleSubmit}>
      <VStack gap={6} align="stretch">
        {/* Basic Information */}
        <BasicInfoSection
          title={formValues.title}
          description={formValues.description}
          onTitleChange={value => updateField('title', value)}
          onDescriptionChange={value => updateField('description', value)}
        />
        
        <Separator />
        
        {/* Content Video */}
        <ContentSection
          selectedId={formValues.contentAssetId}
          onSelect={value => updateField('contentAssetId', value)}
        />
        
        <Separator />
        
        {/* Intro, Outro, Overlays */}
        <IntroSection
          selectedId={formValues.introAssetId}
          onSelect={value => updateField('introAssetId', value)}
        />
        
        <OutroSection
          selectedId={formValues.outroAssetId}
          onSelect={value => updateField('outroAssetId', value)}
        />
        
        <OverlaySection
          selectedIds={formValues.overlayAssetIds}
          onSelect={(id, isSelected) => {
            updateField('overlayAssetIds', 
              isSelected 
                ? [...formValues.overlayAssetIds, id]
                : formValues.overlayAssetIds.filter(oid => oid !== id)
            );
            if (isSelected) {
              handleOverlaySelect(id);
            }
          }}
          autoPosition={formValues.autoPosition}
          onAutoPositionChange={value => updateField('autoPosition', value)}
          configs={formValues.overlayConfigs}
          onConfigChange={(id, config) => {
            updateField('overlayConfigs', {
              ...formValues.overlayConfigs,
              [id]: config
            });
          }}
        />
        
        <Separator />
        
        {/* Transition Settings */}
        <TransitionSection
          crossfadeDuration={formValues.crossfadeDuration}
          onChange={value => updateField('crossfadeDuration', value)}
        />
        
        <Button 
          type="submit" 
          colorScheme="blue" 
          size="lg"
        >
          Create Composition
        </Button>
      </VStack>
    </Box>
  );
};

export default CompositionForm;
