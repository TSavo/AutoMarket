import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Badge,
  Flex,
  Input,
  Spinner,
  Field,
  Menu,
  IconButton,
  Dialog,
} from '@chakra-ui/react';
import { toast } from '../../../../components/ui/toaster';
import { FiChevronDown, FiTrash2, FiEdit, FiRefreshCw } from 'react-icons/fi';
import { CompositionProject } from '../models/CompositionProject';

// Date formatting helper
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

// Project card component
interface ProjectCardProps {
  project: CompositionProject;
  onLoad: (projectId: string) => void;
  onExecute: (projectId: string) => void;
  onDelete: (projectId: string) => void;
  onEdit: (project: CompositionProject) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onLoad, onExecute, onDelete, onEdit }) => {
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      p={4}
      bg="white"
      boxShadow="sm"
      transition="all 0.2s"
      _hover={{ boxShadow: 'md' }}
    >
      <Flex justify="space-between" align="center" mb={2}>
        <Heading size="md" lineClamp={1}>{project.name}</Heading>
        {project.isTemplate && (
          <Badge colorScheme="purple">Template</Badge>
        )}
      </Flex>

      {project.description && (
        <Text color="gray.600" mb={2} lineClamp={2}>{project.description}</Text>
      )}

      <Flex direction="column" mt={3} fontSize="sm" color="gray.500">
        <Text>Created: {formatDate(project.dateCreated)}</Text>
        <Text>Modified: {formatDate(project.dateModified)}</Text>
        <Text>Version: {project.version}</Text>
        <Text>Outputs: {project.generatedOutputs.length}</Text>
      </Flex>

      <Flex mt={4} justify="space-between" wrap="wrap">
        <Button size="sm" colorScheme="blue" onClick={() => onLoad(project.id)}>
          Load
        </Button>

        <Menu.Root>
          <Menu.Trigger asChild>
            <IconButton
              aria-label="Options"
            >
              <FiChevronDown />
            </IconButton>
          </Menu.Trigger>
          <Menu.Positioner>
            <Menu.Content>
              <Menu.Item value="execute" onClick={() => onExecute(project.id)}>
                <Menu.ItemText>
                  <Box mr={2} display="inline-flex" alignItems="center">
                    <FiRefreshCw />
                  </Box>
                  Execute
                </Menu.ItemText>
              </Menu.Item>
              <Menu.Item value="edit" onClick={() => onEdit(project)}>
                <Menu.ItemText>
                  <Box mr={2} display="inline-flex" alignItems="center">
                    <FiEdit />
                  </Box>
                  Edit
                </Menu.ItemText>
              </Menu.Item>
              <Menu.Item value="delete" onClick={() => onDelete(project.id)} color="red.500">
                <Menu.ItemText>
                  <Box mr={2} display="inline-flex" alignItems="center">
                    <FiTrash2 />
                  </Box>
                  Delete
                </Menu.ItemText>
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Menu.Root>
      </Flex>
    </Box>
  );
};

// Delete confirmation modal
interface DeleteModalProps {
  open: boolean; // Changed from isOpen to open
  onClose: () => void;
  onConfirm: () => void;
  projectName: string;
}

const DeleteConfirmationModal: React.FC<DeleteModalProps> = ({ open, onClose, onConfirm, projectName }) => {
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Title>Delete Project</Dialog.Title>
          <Dialog.CloseTrigger />
          <Dialog.Description>
            <Text>Are you sure you want to delete the project "{projectName}"?</Text>
            <Text mt={2} color="red.500">This action cannot be undone.</Text>
          </Dialog.Description>
          <Dialog.Footer>
            <Button mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={onConfirm}>
              Delete
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};

// Edit project modal
interface EditModalProps {
  open: boolean; // Changed from isOpen to open
  onClose: () => void;
  onSave: (project: CompositionProject) => void;
  project: CompositionProject | null;
}

const EditProjectModal: React.FC<EditModalProps> = ({ open, onClose, onSave, project }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isTemplate, setIsTemplate] = useState(false);

  // Initialize form when project changes
  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setIsTemplate(project.isTemplate);
    }
  }, [project]);

  const handleSave = () => {
    if (!project) return;

    const updatedProject: CompositionProject = {
      ...project,
      name,
      description,
      isTemplate,
      dateModified: new Date().toISOString()
    };

    onSave(updatedProject);
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Title>Edit Project</Dialog.Title>
          <Dialog.CloseTrigger />
          <Dialog.Description>
            <VStack gap={4}>
              <Field.Root required>
                <Field.Label>Name</Field.Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Project name"
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Description</Field.Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Project description"
                />
              </Field.Root>

              <Field.Root display="flex" alignItems="center">
                <Field.Label htmlFor="isTemplate" mb="2">
                  Is Template
                </Field.Label>
                <input
                  id="is-template"
                  type="checkbox"
                  checked={isTemplate}
                  onChange={(e) => setIsTemplate(e.target.checked)}
                />
              </Field.Root>
            </VStack>
          </Dialog.Description>
          <Dialog.Footer>
            <Button mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSave}>
              Save
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};

// Main project list component
interface ProjectListProps {
  onLoadProject: (project: CompositionProject) => void;
  isTemplatesOnly?: boolean;
}

const ProjectList: React.FC<ProjectListProps> = ({ onLoadProject, isTemplatesOnly = false }) => {
  const [projects, setProjects] = useState<CompositionProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<CompositionProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<CompositionProject | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();
  }, [isTemplatesOnly]);

  // Filter projects when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProjects(projects);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredProjects(
        projects.filter(
          (project) =>
            project.name.toLowerCase().includes(query) ||
            (project.description && project.description.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, projects]);

  // Fetch projects from API
  const fetchProjects = async () => {
    try {
      setIsLoading(true);

      // Build the URL with appropriate query parameters
      let url = '/api/composition/project';
      if (isTemplatesOnly) {
        url += '?templates=true';
      }

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch projects');
      }

      setProjects(data.projects || []);
      setFilteredProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: 'Error',
        description: (error as Error).message,
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle project deletion
  const handleDeleteClick = (projectId: string) => {
    setProjectToDelete(projectId);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;

    try {
      const res = await fetch(`/api/composition/project?id=${projectToDelete}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete project');
      }

      // Remove the project from the state
      setProjects((prevProjects) =>
        prevProjects.filter((project) => project.id !== projectToDelete)
      );

      toast({
        title: 'Success',
        description: 'Project deleted successfully',
        status: 'success',
        duration: 3000,
        closable: true
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        status: 'error',
        duration: 5000,
        closable: true
      });
    } finally {
      setProjectToDelete(null);
      setDeleteModalOpen(false);
    }
  };

  // Handle project edit
  const handleEditClick = (project: CompositionProject) => {
    setProjectToEdit(project);
    setEditModalOpen(true);
  };

  const handleEditSave = async (updatedProject: CompositionProject) => {
    try {
      const res = await fetch(`/api/composition/project?id=${updatedProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedProject)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to update project');
      }

      const { project: savedProject } = await res.json();

      // Update the project in the state
      setProjects((prevProjects) =>
        prevProjects.map((project) =>
          project.id === savedProject.id ? savedProject : project
        )
      );

      toast({
        title: 'Success',
        description: 'Project updated successfully',
        status: 'success',
        duration: 3000,
        closable: true
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        status: 'error',
        duration: 5000,
        closable: true
      });
    }
  };

  // Handle project execution
  const handleExecuteProject = async (projectId: string) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) throw new Error('Project not found');

      const res = await fetch('/api/composition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: project.name,
          description: project.description,
          contentAssetId: project.composition.clips.find(c => c.type === 'content')?.asset,
          introAssetId: project.composition.clips.find(c => c.type === 'intro')?.asset,
          outroAssetId: project.composition.clips.find(c => c.type === 'outro')?.asset,
          overlayAssetIds: project.composition.clips.filter(c => c.type === 'overlay').map(c => c.asset),
          crossfadeDuration: project.composition.crossfadeDuration || 0.5
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to execute project');
      }

      toast({
        title: 'Success',
        description: 'Project execution started',
        status: 'success',
        duration: 3000,
        closable: true
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        status: 'error',
        duration: 5000,
        closable: true
      });
    }
  };

  // Handle project loading
  const handleLoadProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      onLoadProject(project);
    }
  };

  return (
    <Box>
      <VStack gap={4} align="stretch">
        <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={2}>
          <Heading size="md">
            {isTemplatesOnly ? 'Project Templates' : 'My Projects'}
          </Heading>

          <HStack>
            <Button size="sm" colorScheme="blue" onClick={fetchProjects}>
              Refresh
            </Button>
          </HStack>
        </Flex>

        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {isLoading ? (
          <Flex justify="center" py={10}>
            <Spinner />
          </Flex>
        ) : filteredProjects.length === 0 ? (
          <Box textAlign="center" py={10}>
            <Text color="gray.500">
              {searchQuery
                ? 'No projects match your search'
                : isTemplatesOnly
                ? 'No template projects found'
                : 'No projects found'}
            </Text>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onLoad={handleLoadProject}
                onExecute={handleExecuteProject}
                onDelete={handleDeleteClick}
                onEdit={handleEditClick}
              />
            ))}
          </SimpleGrid>
        )}
      </VStack>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        projectName={
          projectToDelete
            ? projects.find((p) => p.id === projectToDelete)?.name || ''
            : ''
        }
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleEditSave}
        project={projectToEdit}
      />
    </Box>
  );
};

export default ProjectList;
