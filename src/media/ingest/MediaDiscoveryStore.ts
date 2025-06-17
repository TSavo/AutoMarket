/**
 * MediaDiscoveryStore
 *
 * A file-based storage system for media discovery implementations.
 * This ensures discovery registrations persist between API calls
 * in a serverless environment like Next.js API routes.
 */

import fs from 'fs';
import path from 'path';
import { MediaType } from '../types';

/**
 * Helper function to get correct implementation class path
 * @param discovery Discovery implementation
 * @returns Path to the implementation class
 */
function getImplementationClassPath(discovery: any): string {
  const className = discovery.constructor.name;
  
  // Map class names to their correct module paths
  const classPathMap: Record<string, string> = {
    'PngMediaDiscovery': 'PngMediaDiscovery',
    'ExifMediaDiscovery': 'ExifMediaDiscovery',
    'FFMPEGVideoDiscovery': 'FFMPEGVideoDiscovery',
    'FontkitMediaDiscovery': 'FontkitMediaDiscovery'
  };
  
  return classPathMap[className] || className;
}

// Data directory for persistence
const DATA_DIR = path.join(process.cwd(), 'data', 'media');
const STORE_FILE = path.join(DATA_DIR, 'discovery-registry.json');

// Interface for the discovery entry in the store
export interface DiscoveryEntry {
  id: string;
  mediaType: MediaType;
  priority: number;
  implementationClass: string;
  options?: Record<string, any>;
}

/**
 * Store for media discovery registry
 */
export class MediaDiscoveryStore {
  private entries: DiscoveryEntry[] = [];
  private initialized: boolean = false;

  /**
   * Create a new MediaDiscoveryStore
   */
  constructor() {
    // Ensure data directory exists
    this.ensureDataDirExists();
  }

  /**
   * Ensure the data directory exists
   */
  private ensureDataDirExists(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  /**
   * Initialize the store
   * @returns Promise that resolves when initialization is complete
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.loadFromFile();
      this.initialized = true;
      console.log(`Successfully loaded media discovery registry with ${this.entries.length} entries.`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist yet, create a new one
        console.log('Media discovery registry file does not exist, creating a new one.');
        this.entries = [];
        await this.saveToFile();
        this.initialized = true;
      } else {
        console.error('Error initializing media discovery store:', error);
        throw error;
      }
    }
  }

  /**
   * Load the discovery registry from file
   * @returns Promise that resolves when loading is complete
   */
  private async loadFromFile(): Promise<void> {
    if (!fs.existsSync(STORE_FILE)) {
      this.entries = [];
      return;
    }

    const fileData = await fs.promises.readFile(STORE_FILE, 'utf8');
    const data = JSON.parse(fileData);
    this.entries = data.entries || [];
  }

  /**
   * Save the discovery registry to file
   * @returns Promise that resolves when saving is complete
   */
  public async saveToFile(): Promise<void> {
    const data = {
      entries: this.entries,
      lastUpdated: new Date().toISOString(),
    };

    await fs.promises.writeFile(STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log(`MediaDiscoveryStore: Registry file saved successfully (${this.entries.length} entries)`);
    
    // Verify the file was written correctly
    if (fs.existsSync(STORE_FILE)) {
      const stats = fs.statSync(STORE_FILE);
      console.log(`MediaDiscoveryStore: Registry file size: ${stats.size} bytes`);

      // Verify content
      try {
        const content = fs.readFileSync(STORE_FILE, 'utf8');
        const parsed = JSON.parse(content);
        console.log(`MediaDiscoveryStore: Verified registry file contains ${parsed.entries.length} entries`);
      } catch (error) {
        console.error('Error verifying registry file content:', error);
      }
    }
  }

  /**
   * Add a discovery entry
   * @param entry Discovery entry to add
   */
  public async addEntry(entry: DiscoveryEntry): Promise<void> {
    // Check if entry already exists
    const existingIndex = this.entries.findIndex(e => e.id === entry.id);
    
    if (existingIndex >= 0) {
      // Update existing entry
      this.entries[existingIndex] = entry;
      console.log(`MediaDiscoveryStore: Updated existing entry with ID: ${entry.id}`);
    } else {
      // Add new entry
      this.entries.push(entry);
      console.log(`MediaDiscoveryStore: Added new entry with ID: ${entry.id}`);
    }

    // Save to file
    await this.saveToFile();
  }

  /**
   * Remove a discovery entry
   * @param id ID of the discovery entry to remove
   * @returns True if the entry was removed, false if it was not found
   */
  public async removeEntry(id: string): Promise<boolean> {
    const initialLength = this.entries.length;
    this.entries = this.entries.filter(e => e.id !== id);
    
    const removed = this.entries.length < initialLength;
    
    if (removed) {
      console.log(`MediaDiscoveryStore: Removed entry with ID: ${id}`);
      await this.saveToFile();
    }
    
    return removed;
  }

  /**
   * Get all discovery entries
   * @returns All discovery entries
   */
  public getEntries(): DiscoveryEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries for a specific media type
   * @param mediaType Media type to get entries for
   * @returns Discovery entries for the specified media type
   */
  public getEntriesByMediaType(mediaType: MediaType): DiscoveryEntry[] {
    return this.entries
      .filter(e => e.mediaType === mediaType)
      .sort((a, b) => b.priority - a.priority); // Sort by priority (highest first)
  }

  /**
   * Get an entry by ID
   * @param id ID of the entry to get
   * @returns The entry or undefined if not found
   */
  public getEntryById(id: string): DiscoveryEntry | undefined {
    return this.entries.find(e => e.id === id);
  }

  /**
   * Check if an entry exists
   * @param id ID of the entry to check
   * @returns True if the entry exists, false otherwise
   */
  public hasEntry(id: string): boolean {
    return this.entries.some(e => e.id === id);
  }

  /**
   * Clear all entries
   */
  public async clear(): Promise<void> {
    this.entries = [];
    await this.saveToFile();
  }
}

// Create singleton instance
export const mediaDiscoveryStore = new MediaDiscoveryStore();
