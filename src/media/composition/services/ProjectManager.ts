/**
 * ProjectManager.ts
 *
 * Service for managing composition projects
 */

import { AssetManager } from '../../AssetManager';
import VideoComposer, { CompositionOptions, CompositionTaskStatus } from './VideoComposer';
import { CompositionProjectStore } from '../storage/CompositionProjectStore';
import { CompositionProject, addOutputToProject, updateProjectComposition } from '../models/CompositionProject';
import { Composition } from '../../types';
import { Composition as FullComposition, DEFAULT_OUTPUT_SETTINGS } from '../models/Composition';

/**
 * Event handler type for project change events
 */
export type ProjectChangeHandler = (project: CompositionProject) => void;

/**
 * Service for managing composition projects and their execution
 */
export class ProjectManager {
  private projectStore: CompositionProjectStore;
  private videoComposer: VideoComposer;
  private assetManager: AssetManager;
  private changeHandlers: ProjectChangeHandler[] = [];
  private initialized: boolean = false;

  /**
   * Create a new ProjectManager
   * @param assetManager AssetManager instance
   * @param videoComposer VideoComposer instance (optional, will create if not provided)
   * @param projectStore CompositionProjectStore instance (optional, will create if not provided)
   */
  constructor(
    assetManager: AssetManager,
    videoComposer?: VideoComposer,
    projectStore?: CompositionProjectStore
  ) {
    this.assetManager = assetManager;
    this.videoComposer = videoComposer || new VideoComposer();
    this.projectStore = projectStore || new CompositionProjectStore();
  }

  /**
   * Initialize the project manager
   * @returns Promise that resolves when initialization is complete
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('ProjectManager already initialized.');
      return;
    }

    console.log('Initializing ProjectManager...');

    // Ensure asset manager is initialized
    if (!this.assetManager.isInitialized()) {
      await this.assetManager.initialize();
    }

    // Initialize project store
    await this.projectStore.initialize();

    this.initialized = true;
    console.log('ProjectManager initialization complete.');
  }

  /**
   * Check if manager is initialized
   * @returns True if initialized, false otherwise
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Ensure manager is initialized
   * @throws Error if not initialized
   */
  private checkInitialized(): void {
    if (!this.initialized) {
      throw new Error('ProjectManager is not initialized. Call initialize() first.');
    }
  }

  /**
   * Subscribe to project changes
   * @param handler The change handler function
   * @returns Function to unsubscribe
   */
  public subscribeToChanges(handler: ProjectChangeHandler): () => void {
    this.changeHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      this.changeHandlers = this.changeHandlers.filter(h => h !== handler);
    };
  }

  /**
   * Notify listeners of a project change
   * @param project The changed project
   */
  private notifyChange(project: CompositionProject): void {
    this.changeHandlers.forEach(handler => {
      try {
        handler(project);
      } catch (error) {
        console.error('Error in project change handler:', error);
      }
    });
  }

  /**
   * Get all projects
   * @returns Array of all projects
   */
  public getAllProjects(): CompositionProject[] {
    this.checkInitialized();
    return this.projectStore.getAllProjects();
  }

  /**
   * Get a project by ID
   * @param id Project ID
   * @returns The project or undefined if not found
   */
  public getProjectById(id: string): CompositionProject | undefined {
    this.checkInitialized();
    return this.projectStore.getProjectById(id);
  }

  /**
   * Get all template projects
   * @returns Array of template projects
   */
  public getTemplateProjects(): CompositionProject[] {
    this.checkInitialized();
    return this.projectStore.getTemplateProjects();
  }

  /**
   * Update a project
   * @param project The project to update
   * @returns The updated project
   */
  public async updateProject(project: CompositionProject): Promise<CompositionProject> {
    this.checkInitialized();

    // Update the project in the store
    const updatedProject = await this.projectStore.updateProject(project);

    // Notify listeners
    this.notifyChange(updatedProject);

    return updatedProject;
  }

  /**
   * Delete a project
   * @param id Project ID
   * @returns True if deleted, false otherwise
   */
  public async deleteProject(id: string): Promise<boolean> {
    this.checkInitialized();
    return this.projectStore.deleteProject(id);
  }





  /**
   * Search for projects
   * @param query Search query
   * @returns Array of matching projects
   */
  public searchProjects(query: string): CompositionProject[] {
    this.checkInitialized();
    return this.projectStore.searchProjects(query);
  }

  /**
   * Create a new project
   * @param composition The composition data
   * @returns The created project
   */
  public async createProject(composition: Composition): Promise<CompositionProject> {
    this.checkInitialized();

    // Create a new project from the composition
    const project = {
      id: composition.id || `project_${Date.now()}`,
      name: composition.title,
      description: composition.description || '',
      composition: composition,
      contentAssetId: composition.contentAssetId,
      introAssetId: composition.introAssetId,
      outroAssetId: composition.outroAssetId,
      overlayConfigs: composition.overlayConfigs || [],
      crossfadeDuration: composition.crossfadeDuration || 0.5,
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      tags: [],
      generatedOutputs: [],
      version: 1,
      isTemplate: false,
      outputPath: '',
    };

    // Create a full composition object for the project store
    const fullComposition: FullComposition = {
      id: project.id,
      title: project.name,
      description: project.description || '',
      clips: [],
      outputSettings: DEFAULT_OUTPUT_SETTINGS,
      dateCreated: project.dateCreated,
      dateModified: project.dateModified,
      tags: [],
      outputPath: '',
      crossfadeDuration: project.crossfadeDuration
    };

    // Save the project to the store
    const savedProject = await this.projectStore.createProject(
      project.name,
      fullComposition,
      project.description,
      project.isTemplate
    );

    // Notify listeners
    this.notifyChange(savedProject);

    return savedProject;
  }

  /**
   * Get a project by ID
   * @param id Project ID
   * @returns The project or null if not found
   */
  public async getProject(id: string): Promise<CompositionProject | null> {
    this.checkInitialized();
    const project = this.projectStore.getProjectById(id);
    return project || null;
  }

  /**
   * List all projects
   * @returns Array of all projects
   */
  public async listProjects(): Promise<CompositionProject[]> {
    this.checkInitialized();
    return this.projectStore.getAllProjects();
  }

  /**
   * Execute a project to create a video composition
   * @param projectId Project ID
   * @returns The updated project with output information
   */
  public async executeProject(projectId: string): Promise<CompositionProject> {
    this.checkInitialized();

    // Get the project
    const project = this.projectStore.getProjectById(projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }

    try {
      // Create the composition
      // Convert the project composition to an InputComposition
      const inputComposition: Composition = {
        id: project.id,
        title: project.name || 'Untitled Project',
        description: project.description || '',
        contentAssetId: project.contentAssetId || '',
        introAssetId: project.introAssetId,
        outroAssetId: project.outroAssetId,
        overlayConfigs: project.overlayConfigs || [],
        crossfadeDuration: project.crossfadeDuration || 0.5,
        createdAt: new Date(project.dateCreated),
        updatedAt: new Date()
      };

      const composition = await this.videoComposer.createComposition(inputComposition);

      // Update the project with output information
      const updatedProject = composition ? addOutputToProject(
        project,
        composition.outputPath || '',
        {
          width: composition.outputSettings.width,
          height: composition.outputSettings.height,
          format: composition.outputSettings.format
        }
      ) : project;

      // Save the updated project
      const savedProject = await this.projectStore.updateProject(updatedProject);

      // Notify listeners
      this.notifyChange(savedProject);

      return savedProject;
    } catch (error) {
      console.error(`Error executing project ${projectId}:`, error);
      throw new Error(`Failed to execute project: ${(error as Error).message}`);
    }
  }
}