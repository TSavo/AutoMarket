/**
 * TaskStatus component for displaying composition task status
 */
import React from 'react';
import { Box, Flex, Heading, Text, Badge, Progress, Button } from '@chakra-ui/react';
import AppLink from '../../../components/ui/AppLink';

interface TaskStatusProps {
  task: {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    composition: {
      id: string;
      title: string;
      description?: string;
    };
    outputPath?: string;
    error?: string;
    startTime?: string;
    endTime?: string;
  };
  onRefresh: () => void;
}

/**
 * Display the status of a composition task
 */
const TaskStatus: React.FC<TaskStatusProps> = ({ task, onRefresh }) => {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'green';
      case 'failed': return 'red';
      case 'processing': return 'blue';
      default: return 'gray';
    }
  };
  
  return (
    <Box 
      borderWidth="1px" 
      borderRadius="lg" 
      p={4} 
      mb={4}
      borderColor={`${getStatusColor(task.status)}.200`}
      bg={`${getStatusColor(task.status)}.50`}
    >
      <Flex justify="space-between" align="center" mb={2}>
        <Heading size="md">{task.composition.title}</Heading>
        <Badge colorScheme={getStatusColor(task.status)}>{task.status}</Badge>
      </Flex>
      
      {task.composition.description && (
        <Text color="gray.600" mb={2}>{task.composition.description}</Text>
      )}
      
      <Progress.Root 
        value={task.progress} 
        size="sm" 
        colorScheme={getStatusColor(task.status)} 
        mb={3}
      >
        <Progress.ValueText />
      </Progress.Root>
      
      <Flex justify="space-between" wrap="wrap" gap={2}>
        <Text fontSize="sm">ID: {task.id}</Text>
        <Text fontSize="sm">
          Started: {task.startTime ? new Date(task.startTime).toLocaleString() : 'N/A'}
        </Text>
        {task.endTime && (
          <Text fontSize="sm">
            Completed: {new Date(task.endTime).toLocaleString()}
          </Text>
        )}
      </Flex>
      
      {task.error && (
        <Box mt={2} p={2} bg="red.100" borderRadius="md">
          <Text color="red.800" fontSize="sm">{task.error}</Text>
        </Box>
      )}
      
      {task.status === 'completed' && task.outputPath && (
        <AppLink 
          mt={3} 
          colorScheme="green" 
          href={task.outputPath.replace(/^.*\/public/, '')}
          target="_blank"
        >
          View Composition
        </AppLink>
      )}
      
      {(task.status === 'processing' || task.status === 'pending') && (
        <Button 
          mt={3} 
          colorScheme="blue" 
          size="sm"
          onClick={onRefresh}
        >
          Refresh Status
        </Button>
      )}
    </Box>
  );
};

export default TaskStatus;
