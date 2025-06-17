/**
 * CompositionProjectStore.ts
 * 
 * Storage and management for composition projects
 */

import fs from 'fs';
import path from 'path';
import { 
  CompositionProject, 
  CompositionProjectDatabase,
  createCompositionProject 
} from '../models/CompositionProject';
import { Composition } from '../models/Composition';

/**
 * Manages storage and retrieval of composition projects
 */
export class CompositionProjectStore {
  private database: CompositionProjectDatabase;
  private databasePath: string;
  private initialized: boolean = false;

  /**
   * Create a new CompositionProjectStore
   * @param databasePath Path to the project database JSON file (relative to project root)
   */
  constructor(databasePath: string = 'data/media/composition-projects.json') {
    this.databasePath = databasePath;
    // Initialize with empty database structure
    this.database = {
      lastUpdated: new Date().toISOString(),
      projects: []
    };
  }

  /**
   * Initialize the store by loading the database
   * @returns Promise that resolves when initialization is complete
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('CompositionProjectStore already initialized, skipping initialization.');
      return;
    }

    try {
      console.log('Initializing CompositionProjectStore...');
      await this.loadDatabase();
      this.initialized = true;
      console.log('CompositionProjectStore initialization complete with', 
        this.database.projects.length, 'projects.');
    } catch (error) {
      console.error('Failed to initialize CompositionProjectStore:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Check if the store is initialized
   * @returns True if initialized, false otherwise
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Ensure the store is initialized
   * @throws Error if not initialized
   */
  private checkInitialized(): void {
    if (!this.initialized) {
      throw new Error('CompositionProjectStore is not initialized. Call initialize() first.');
    }
  }

  /**
   * Load the project database from the JSON file
   */
  private async loadDatabase(): Promise<void> {
    try {
      const absolutePath = path.resolve(process.cwd(), this.databasePath);

      // Create directory if it doesn't exist
      const dirPath = path.dirname(absolutePath);
      await fs.promises.mkdir(dirPath, { recursive: true });

      try {
        const data = await fs.promises.readFile(absolutePath, 'utf8');
        this.database = JSON.parse(data) as CompositionProjectDatabase;
        console.log(`Successfully loaded project database with ${this.database.projects.length} projects.`);
      } catch (error) {
        // If file doesn't exist, create an empty database
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          console.log('Project database file not found, creating a new one.');
          this.database = {
            lastUpdated: new Date().toISOString(),
            projects: []
          };
          // Save the empty database immediately
          await this.saveDatabase();
          console.log('Created new empty project database.');
        } else {
          console.error('Error parsing project database:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Failed to load project database:', error);
      throw error;
    }
  }

  /**
   * Save the project database to the JSON file
   */
  public async saveDatabase(): Promise<void> {
    try {
      const absolutePath = path.resolve(process.cwd(), this.databasePath);
      
      // Update the lastUpdated timestamp
      this.database.lastUpdated = new Date().toISOString();
      
      // Stringify with pretty formatting (2 spaces)
      const data = JSON.stringify(this.database, null, 2);
      
      await fs.promises.writeFile(absolutePath, data, 'utf8');
      console.log(`Successfully saved project database with ${this.database.projects.length} projects.`);
    } catch (error) {
      console.error('Failed to save project database:', error);
      throw error;
    }
  }

  /**
   * Get all projects
   * @returns Array of all projects
   */
  public getAllProjects(): CompositionProject[] {
    this.checkInitialized();
    return [...this.database.projects];
  }

  /**
   * Get project by ID
   * @param id Project ID
   * @returns The project or undefined if not found
   */
  public getProjectById(id: string): CompositionProject | undefined {
    this.checkInitialized();
    return this.database.projects.find(project => project.id === id);
  }

  /**
   * Get all template projects
   * @returns Array of template projects
   */
  public getTemplateProjects(): CompositionProject[] {
    this.checkInitialized();
    return this.database.projects.filter(project => project.isTemplate);
  }

  /**
   * Add a new project to the database
   * @param project The project to add
   * @returns Promise that resolves to the added project
   */
  public async addProject(project: CompositionProject): Promise<CompositionProject> {
    this.checkInitialized();

    // Check if a project with the same ID already exists
    if (this.database.projects.some(p => p.id === project.id)) {
      throw new Error(`Project with ID ${project.id} already exists`);
    }

    // Add the project to the database
    this.database.projects.push(project);

    // Save the database
    await this.saveDatabase();

    return project;
  }

  /**
   * Create and add a new project to the database
   * @param name Project name
   * @param composition The composition
   * @param description Optional project description
   * @param isTemplate Whether this is a template
   * @returns The created project
   */
  public async createProject(
    name: string,
    composition: Composition,
    description?: string,
    isTemplate: boolean = false
  ): Promise<CompositionProject> {
    this.checkInitialized();

    // Create the project
    const project = createCompositionProject(name, composition, description, isTemplate);

    // Add it to the database
    return this.addProject(project);
  }

  /**
   * Update an existing project
   * @param project The project to update
   * @returns Promise that resolves to the updated project
   */
  public async updateProject(project: CompositionProject): Promise<CompositionProject> {
    this.checkInitialized();

    // Find the index of the project
    const index = this.database.projects.findIndex(p => p.id === project.id);

    // Check if the project exists
    if (index === -1) {
      throw new Error(`Project with ID ${project.id} does not exist`);
    }

    // Update the project
    this.database.projects[index] = project;

    // Save the database
    await this.saveDatabase();

    return project;
  }

  /**
   * Delete a project
   * @param id Project ID
   * @returns Promise that resolves to true if the project was deleted, false otherwise
   */
  public async deleteProject(id: string): Promise<boolean> {
    this.checkInitialized();

    // Find the project index
    const index = this.database.projects.findIndex(p => p.id === id);

    // If project not found, return false
    if (index === -1) {
      return false;
    }

    // Remove the project
    this.database.projects.splice(index, 1);

    // Save the database
    await this.saveDatabase();

    return true;
  }

  /**
   * Search projects by name or description
   * @param query Search query
   * @returns Array of matching projects
   */
  public searchProjects(query: string): CompositionProject[] {
    this.checkInitialized();

    const searchLower = query.toLowerCase();
    return this.database.projects.filter(project => 
      project.name.toLowerCase().includes(searchLower) || 
      (project.description && project.description.toLowerCase().includes(searchLower))
    );
  }

  /**
   * Filter projects by tags
   * @param tags Tags to filter by (project must have ALL tags)
   * @returns Array of matching projects
   */
  public getProjectsByTags(tags: string[]): CompositionProject[] {
    this.checkInitialized();

    if (!tags || tags.length === 0) {
      return this.getAllProjects();
    }

    return this.database.projects.filter(project => 
      tags.every(tag => project.tags.includes(tag))
    );
  }
}
