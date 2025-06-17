/**
 * CompositionProject.ts
 *
 * Defines the structure for a saved composition project
 */

import { Composition } from './Composition';

/**
 * Project category for organization
 */
export enum ProjectCategory {
  MARKETING = 'marketing',
  SOCIAL = 'social',
  EDUCATIONAL = 'educational',
  ENTERTAINMENT = 'entertainment',
  PERSONAL = 'personal',
  OTHER = 'other'
}

/**
 * Interface for a saved composition project
 */
export interface CompositionProject {
  id: string;
  name: string;
  title?: string; // Alias for name for compatibility
  description?: string;
  composition: Composition;

  // Asset references
  contentAssetId?: string;
  introAssetId?: string;
  outroAssetId?: string;
  overlayConfigs?: Array<any>;

  // Composition settings
  crossfadeDuration?: number;
  outputSettings?: any;
  outputPath?: string;

  // Metadata
  author?: string;
  dateCreated: string; // ISO date string
  dateModified: string; // ISO date string
  tags: string[];
  category?: ProjectCategory;

  // References to outputs
  generatedOutputs: CompositionOutput[];

  // Version tracking
  version: number;
  isTemplate: boolean;
  templateId?: string; // Reference to the template this project was created from

  // Status tracking
  status?: 'draft' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;

  // Sharing and collaboration
  isPublic?: boolean;
  collaborators?: string[]; // Array of user IDs who can edit this project

  // Additional metadata
  thumbnailPath?: string; // Path to a thumbnail image for the project
  notes?: string; // Additional notes about the project
  lastExportDate?: string; // ISO date string of the last export
}

/**
 * Interface for a generated composition output
 */
export interface CompositionOutput {
  id: string;
  outputPath: string;
  dateGenerated: string; // ISO date string
  settings: {
    width: number;
    height: number;
    format: string;
  };
  taskId?: string; // Reference to the task that generated this output
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * Database structure for composition projects
 */
export interface CompositionProjectDatabase {
  lastUpdated: string; // ISO date string
  projects: CompositionProject[];
}

/**
 * Options for creating a composition project
 */
export interface CreateProjectOptions {
  name: string;
  composition: Composition;
  description?: string;
  isTemplate?: boolean;
  templateId?: string;
  category?: ProjectCategory;
  author?: string;
  tags?: string[];
  isPublic?: boolean;
  collaborators?: string[];
  thumbnailPath?: string;
  notes?: string;
}

/**
 * Creates a new composition project
 * @param options Project creation options
 * @returns A new CompositionProject
 */
export function createCompositionProject(
  nameOrOptions: string | CreateProjectOptions,
  composition?: Composition,
  description?: string,
  isTemplate: boolean = false
): CompositionProject {
  const now = new Date().toISOString();

  // Handle both function signatures
  let options: CreateProjectOptions;

  if (typeof nameOrOptions === 'string') {
    // Old signature: (name, composition, description, isTemplate)
    options = {
      name: nameOrOptions,
      composition: composition!,
      description,
      isTemplate
    };
  } else {
    // New signature: (options)
    options = nameOrOptions;
  }

  return {
    id: `proj_${Date.now()}`,
    name: options.name,
    description: options.description,
    composition: options.composition,
    dateCreated: now,
    dateModified: now,
    tags: options.tags || [],
    category: options.category || ProjectCategory.OTHER,
    generatedOutputs: [],
    version: 1,
    isTemplate: options.isTemplate || false,
    templateId: options.templateId,
    status: 'draft',
    isPublic: options.isPublic || false,
    collaborators: options.collaborators || [],
    thumbnailPath: options.thumbnailPath,
    notes: options.notes,
    author: options.author
  };
}

/**
 * Adds an output to a composition project
 * @param project The project to add the output to
 * @param outputPath Path to the output file
 * @param settings Output settings
 * @param taskId Optional task ID
 * @returns The updated project
 */
export function addOutputToProject(
  project: CompositionProject,
  outputPath: string,
  settings: { width: number; height: number; format: string },
  taskId?: string
): CompositionProject {
  const output: CompositionOutput = {
    id: `output_${Date.now()}`,
    outputPath,
    dateGenerated: new Date().toISOString(),
    settings,
    taskId,
    status: 'completed'
  };

  return {
    ...project,
    dateModified: new Date().toISOString(),
    generatedOutputs: [...project.generatedOutputs, output]
  };
}

/**
 * Updates a composition project with a new composition
 * @param project The project to update
 * @param newComposition The new composition
 * @returns The updated project with incremented version
 */
export function updateProjectComposition(
  project: CompositionProject,
  newComposition: Composition
): CompositionProject {
  return {
    ...project,
    composition: newComposition,
    dateModified: new Date().toISOString(),
    version: project.version + 1
  };
}
