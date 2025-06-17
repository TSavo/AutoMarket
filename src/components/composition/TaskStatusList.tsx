/**
 * TaskStatusList component for displaying composition tasks
 */
import React from 'react';
import { Box, Heading, Text } from '@chakra-ui/react';
import TaskStatus from './TaskStatus';

interface TaskStatusListProps {
  activeTask: any;
  recentTasks: any[];
  onRefresh: (taskId: string) => void;
}

/**
 * Display a list of composition tasks and their status
 */
const TaskStatusList: React.FC<TaskStatusListProps> = ({
  activeTask,
  recentTasks,
  onRefresh
}) => {
  return (
    <Box>
      <Heading as="h2" size="lg" mb={4}>
        Composition Status
      </Heading>
      
      {activeTask && (
        <Box mb={6}>
          <Heading size="md" mb={3}>Current Task</Heading>
          <TaskStatus 
            task={activeTask} 
            onRefresh={() => onRefresh(activeTask.id)} 
          />
        </Box>
      )}
      
      {recentTasks.length > 0 && (
        <Box>
          <Heading size="md" mb={3}>Recent Tasks</Heading>
          {recentTasks.map(task => (
            <TaskStatus 
              key={task.id} 
              task={task} 
              onRefresh={() => onRefresh(task.id)} 
            />
          ))}
        </Box>
      )}
      
      {!activeTask && recentTasks.length === 0 && (
        <Text color="gray.500">No composition tasks found</Text>
      )}
    </Box>
  );
};

export default TaskStatusList;
