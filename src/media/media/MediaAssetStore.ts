import fs from 'fs';
import path from 'path';
import { BaseAsset, MediaDatabase } from './types';

/**
 * MediaAssetStore: Handles loading, saving, and accessing media assets
 */
export class MediaAssetStore {
  private database: MediaDatabase;
  private databasePath: string;
  private initialized: boolean = false;

  /**
   * Create a new MediaAssetStore instance
   * @param databasePath Path to the media database JSON file (relative to project root)
   */
  constructor(databasePath: string = 'data/media/media-database.json') {
    this.databasePath = databasePath;
    // Set initial empty database structure, but don't set initialized=true yet
    this.database = {
      lastUpdated: new Date().toISOString(),
      assets: []
    };
  }

  /**
   * Initialize the store by loading the database
   * @returns Promise that resolves when initialization is complete
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('MediaAssetStore already initialized, skipping initialization.');
      return;
    }

    try {
      console.log('Initializing MediaAssetStore...');
      await this.loadDatabase();
      this.initialized = true;
      console.log('MediaAssetStore initialization complete.');
    } catch (error) {
      console.error('Failed to initialize MediaAssetStore:', error);
      // Reset initialization state on failure
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
   * Load the media database from the JSON file
   * @returns Promise that resolves when the database is loaded
   */
  private async loadDatabase(): Promise<void> {
    try {
      const absolutePath = path.resolve(process.cwd(), this.databasePath);

      // Check if directory exists first, create it if needed
      const dirPath = path.dirname(absolutePath);
      await fs.promises.mkdir(dirPath, { recursive: true });

      try {
        const data = await fs.promises.readFile(absolutePath, 'utf8');
        this.database = JSON.parse(data) as MediaDatabase;
        console.log(`Successfully loaded media database with ${this.database.assets.length} assets.`);
      } catch (error) {
        // If the file doesn't exist, create an empty database
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          console.log('Media database file not found, creating a new one.');
          this.database = {
            lastUpdated: new Date().toISOString(),
            assets: []
          };
          // Save the empty database immediately
          await this.saveDatabase();
          console.log('Created new empty media database.');
        } else {
          console.error('Error parsing media database:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Failed to load media database:', error);
      throw error;
    }
  }

  /**
   * Save the media database to the JSON file
   * @returns Promise that resolves when the database is saved
   */
  public async saveDatabase(): Promise<void> {
    try {
      // Update the lastUpdated timestamp
      this.database.lastUpdated = new Date().toISOString();

      const absolutePath = path.resolve(process.cwd(), this.databasePath);
      console.log(`MediaAssetStore: Saving database to ${absolutePath}`);

      // Ensure the directory exists
      const dirPath = path.dirname(absolutePath);
      await fs.promises.mkdir(dirPath, { recursive: true });

      // Prepare the JSON data
      const jsonData = JSON.stringify(this.database, null, 2);

      // Write the database to the file with pretty formatting
      await fs.promises.writeFile(
        absolutePath,
        jsonData,
        'utf8'
      );

      // Verify the file was written correctly
      try {
        const stats = await fs.promises.stat(absolutePath);
        console.log(`MediaAssetStore: Database file saved successfully (${stats.size} bytes)`);

        // Verify the file contains the expected data
        const fileContent = await fs.promises.readFile(absolutePath, 'utf8');
        const parsedContent = JSON.parse(fileContent);
        console.log(`MediaAssetStore: Verified database file contains ${parsedContent.assets.length} assets`);
      } catch (verifyError) {
        console.error(`MediaAssetStore: Error verifying saved database file: ${verifyError instanceof Error ? verifyError.message : String(verifyError)}`);
      }

      console.log(`Successfully saved media database with ${this.database.assets.length} assets.`);
    } catch (error) {
      console.error('Failed to save media database:', error);
      throw error;
    }
  }

  /**
   * Get all assets from the database
   * @returns Array of all assets
   */
  public getAllAssets(): BaseAsset[] {
    this.checkInitialized();
    return [...this.database.assets];
  }

  /**
   * Get an asset by its ID
   * @param id The asset ID
   * @returns The asset or undefined if not found
   */
  public getAssetById(id: string): BaseAsset | undefined {
    this.checkInitialized();
    return this.database.assets.find(asset => asset.id === id);
  }

  /**
   * Add a new asset to the database
   * @param asset The asset to add
   * @returns Promise that resolves to the added asset
   * @throws Error if an asset with the same ID already exists
   */
  public async addAsset(asset: BaseAsset): Promise<BaseAsset> {
    this.checkInitialized();

    console.log(`MediaAssetStore: Adding asset with ID ${asset.id} to database`);

    // Check if an asset with the same ID already exists
    if (this.database.assets.some(a => a.id === asset.id)) {
      console.warn(`MediaAssetStore: Asset with ID ${asset.id} already exists, will not add duplicate`);
      throw new Error(`Asset with ID ${asset.id} already exists`);
    }

    // Add the asset to the database
    this.database.assets.push(asset);
    console.log(`MediaAssetStore: Added asset to database, new count: ${this.database.assets.length}`);

    // Save the database
    try {
      await this.saveDatabase();
      console.log(`MediaAssetStore: Database saved successfully with ${this.database.assets.length} assets`);
    } catch (error) {
      console.error(`MediaAssetStore: Error saving database: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }

    return asset;
  }

  /**
   * Update an existing asset in the database
   * @param asset The asset to update
   * @returns Promise that resolves to the updated asset
   * @throws Error if the asset does not exist
   */
  public async updateAsset(asset: BaseAsset): Promise<BaseAsset> {
    this.checkInitialized();

    // Find the index of the asset
    const index = this.database.assets.findIndex(a => a.id === asset.id);

    // Check if the asset exists
    if (index === -1) {
      throw new Error(`Asset with ID ${asset.id} does not exist`);
    }

    // Update the asset
    this.database.assets[index] = asset;

    // Save the database
    await this.saveDatabase();

    return asset;
  }

  /**
   * Remove an asset from the database
   * @param id The ID of the asset to remove
   * @returns Promise that resolves to true if the asset was removed, false otherwise
   */
  public async removeAsset(id: string): Promise<boolean> {
    this.checkInitialized();

    // Find the index of the asset
    const index = this.database.assets.findIndex(a => a.id === id);

    // Check if the asset exists
    if (index === -1) {
      return false;
    }

    // Remove the asset
    this.database.assets.splice(index, 1);

    // Save the database
    await this.saveDatabase();

    return true;
  }

  /**
   * Ensure the store is initialized before performing operations
   * @throws Error if the store is not initialized
   */
  private checkInitialized(): void {
    if (!this.initialized) {
      const error = new Error('MediaAssetStore is not initialized. Call initialize() first.');
      console.error(error);
      throw error;
    }
  }
}
