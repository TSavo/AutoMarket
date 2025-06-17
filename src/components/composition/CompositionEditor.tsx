/**
 * CompositionEditor component
 */
import React, { useState } from 'react';
import { 
  Box, 
  Flex, 
  Button, 
  Heading, 
  SimpleGrid 
} from '@chakra-ui/react';
import { toast } from '../../../components/ui/toaster';
import { FiCheck } from 'react-icons/fi';

import AssetSelector from './AssetSelector';
import TaskStatusList from './TaskStatusList';
import CompositionForm from './CompositionForm';
import OverlayConfig from './OverlayConfig';

// Types
import { CompositionProject } from '../../media/composition/models/CompositionProject';

interface CompositionEditorProps {
  activeProject: CompositionProject | null;
  onSaveClick: () => void;
  onTaskStart: (task: any) => void;
  onTasksUpdate: () => void;
  activeTask: any;
  recentTasks: any[];
}

/**
 * Main component for editing compositions
 */
const CompositionEditor: React.FC<CompositionEditorProps> = ({
  activeProject,
  onSaveClick,
  onTaskStart,
  onTasksUpdate,
  activeTask,
  recentTasks
}) => {
  const [formValues, setFormValues] = useState({});
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  
  // Handle form submission
  const handleSubmit = async (data: any) => {
    try {
      const res = await fetch('/api/composition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const responseData = await res.json();
      
      if (!res.ok) {
        throw new Error(responseData.message || 'Failed to create composition');
      }
      
      // Notify success
      toast({
        title: 'Composition created',
        description: 'Your composition is now processing',
        status: 'success',
        duration: 5000,
        isClosable: true
      });
      
      // Update active task
      onTaskStart(responseData);
      
      // Update tasks list
      onTasksUpdate();
      
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };
  
  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading as="h2" size="lg">
          {activeProject ? `Edit Project: ${activeProject.name}` : 'Create New Composition'}
        </Heading>

        <Button
          colorScheme="green"
          onClick={onSaveClick}
        >
          <Box mr={2} display="inline-flex" alignItems="center">
            <FiCheck />
          </Box>
          Save Project
        </Button>
      </Flex>
      
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={8}>
        <Box>
          <CompositionForm
            onSubmit={handleSubmit}
            initialValues={activeProject ? {
              title: activeProject.name,
              description: activeProject.description,
              // Extract other values from project
            } : undefined}
            onOverlaySelect={setSelectedOverlayId}
          />
        </Box>
        
        <Box>
          <TaskStatusList
            activeTask={activeTask}
            recentTasks={recentTasks}
            onRefresh={onTasksUpdate}
          />
        </Box>
      </SimpleGrid>
    </Box>
  );
};

export default CompositionEditor;
