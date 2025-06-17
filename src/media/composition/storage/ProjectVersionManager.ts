/**
 * ProjectVersionManager.ts
 * 
 * Manages versioning and backups for composition projects
 */

import fs from 'fs';
import path from 'path';
import { CompositionProject } from '../models/CompositionProject';

/**
 * Interface for a project version
 */
export interface ProjectVersion {
  id: string;
  projectId: string;
  version: number;
  dateCreated: string;
  snapshot: CompositionProject;
}

/**
 * Interface for the version database
 */
export interface VersionDatabase {
  lastUpdated: string;
  versions: ProjectVersion[];
}

/**
 * Manages versioning and backups for composition projects
 */
export class ProjectVersionManager {
  private database: VersionDatabase;
  private databasePath: string;
  private initialized: boolean = false;
  private maxVersionsPerProject: number;

  /**
   * Create a new ProjectVersionManager
   * @param databasePath Path to the version database JSON file (relative to project root)
   * @param maxVersionsPerProject Maximum number of versions to keep per project
   */
  constructor(
    databasePath: string = 'data/media/composition-versions.json',
    maxVersionsPerProject: number = 10
  ) {
    this.databasePath = databasePath;
    this.maxVersionsPerProject = maxVersionsPerProject;
    this.database = {
      lastUpdated: new Date().toISOString(),
      versions: []
    };
  }

  /**
   * Initialize the manager by loading the database
   * @returns Promise that resolves when initialization is complete
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('ProjectVersionManager already initialized, skipping initialization.');
      return;
    }

    try {
      console.log('Initializing ProjectVersionManager...');
      await this.loadDatabase();
      this.initialized = true;
      console.log('ProjectVersionManager initialization complete with', 
        this.database.versions.length, 'versions.');
    } catch (error) {
      console.error('Failed to initialize ProjectVersionManager:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Check if the manager is initialized
   * @returns True if initialized, false otherwise
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Ensure the manager is initialized
   * @throws Error if not initialized
   */
  private checkInitialized(): void {
    if (!this.initialized) {
      throw new Error('ProjectVersionManager is not initialized. Call initialize() first.');
    }
  }

  /**
   * Load the version database from the JSON file
   */
  private async loadDatabase(): Promise<void> {
    try {
      const absolutePath = path.resolve(process.cwd(), this.databasePath);

      // Create directory if it doesn't exist
      const dirPath = path.dirname(absolutePath);
      await fs.promises.mkdir(dirPath, { recursive: true });

      try {
        const data = await fs.promises.readFile(absolutePath, 'utf8');
        this.database = JSON.parse(data) as VersionDatabase;
        console.log(`Successfully loaded version database with ${this.database.versions.length} versions.`);
      } catch (error) {
        // If file doesn't exist, create an empty database
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          console.log('Version database file not found, creating a new one.');
          this.database = {
            lastUpdated: new Date().toISOString(),
            versions: []
          };
          // Save the empty database immediately
          await this.saveDatabase();
          console.log('Created new empty version database.');
        } else {
          console.error('Error parsing version database:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Failed to load version database:', error);
      throw error;
    }
  }

  /**
   * Save the version database to the JSON file
   */
  private async saveDatabase(): Promise<void> {
    try {
      const absolutePath = path.resolve(process.cwd(), this.databasePath);
      
      // Update the lastUpdated timestamp
      this.database.lastUpdated = new Date().toISOString();
      
      // Stringify with pretty formatting (2 spaces)
      const data = JSON.stringify(this.database, null, 2);
      
      await fs.promises.writeFile(absolutePath, data, 'utf8');
      console.log(`Successfully saved version database with ${this.database.versions.length} versions.`);
    } catch (error) {
      console.error('Failed to save version database:', error);
      throw error;
    }
  }

  /**
   * Create a new version of a project
   * @param project The project to create a version for
   * @returns The created version
   */
  public async createVersion(project: CompositionProject): Promise<ProjectVersion> {
    this.checkInitialized();

    // Create the version
    const version: ProjectVersion = {
      id: `ver_${Date.now()}`,
      projectId: project.id,
      version: project.version,
      dateCreated: new Date().toISOString(),
      snapshot: { ...project }
    };

    // Add the version to the database
    this.database.versions.push(version);

    // Prune old versions if needed
    await this.pruneVersions(project.id);

    // Save the database
    await this.saveDatabase();

    return version;
  }

  /**
   * Get all versions of a project
   * @param projectId The project ID
   * @returns Array of versions for the project
   */
  public getVersions(projectId: string): ProjectVersion[] {
    this.checkInitialized();
    return this.database.versions
      .filter(version => version.projectId === projectId)
      .sort((a, b) => b.version - a.version); // Sort by version number, newest first
  }

  /**
   * Get a specific version of a project
   * @param projectId The project ID
   * @param versionNumber The version number
   * @returns The version or undefined if not found
   */
  public getVersion(projectId: string, versionNumber: number): ProjectVersion | undefined {
    this.checkInitialized();
    return this.database.versions.find(
      version => version.projectId === projectId && version.version === versionNumber
    );
  }

  /**
   * Prune old versions of a project to stay within the maximum limit
   * @param projectId The project ID
   */
  private async pruneVersions(projectId: string): Promise<void> {
    const projectVersions = this.getVersions(projectId);
    
    if (projectVersions.length <= this.maxVersionsPerProject) {
      return;
    }

    // Keep only the newest maxVersionsPerProject versions
    const versionsToKeep = projectVersions.slice(0, this.maxVersionsPerProject);
    const versionIdsToKeep = new Set(versionsToKeep.map(v => v.id));

    // Filter out old versions
    this.database.versions = this.database.versions.filter(
      version => version.projectId !== projectId || versionIdsToKeep.has(version.id)
    );
  }

  /**
   * Restore a project to a specific version
   * @param projectId The project ID
   * @param versionNumber The version number to restore
   * @returns The restored project or null if version not found
   */
  public async restoreVersion(projectId: string, versionNumber: number): Promise<CompositionProject | null> {
    this.checkInitialized();
    
    const version = this.getVersion(projectId, versionNumber);
    if (!version) {
      return null;
    }

    return version.snapshot;
  }
}
