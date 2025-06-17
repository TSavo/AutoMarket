/**
 * BaseAssetClass
 *
 * Base class for all media assets with common functionality.
 * This class provides methods for tag management and other common operations.
 */

import { BaseAsset, MediaType, ContentPurpose } from './types';

/**
 * Base class for all media assets
 */
export class BaseAssetClass implements BaseAsset {
  id: string;
  path: string;
  filename: string;
  type: MediaType;
  title: string;
  description: string;
  tags: string[];
  contentPurpose: ContentPurpose[];
  dateCreated: string;
  dateModified: string;
  author: string;
  license: string;
  fileSize: number;
  format?: string;

  /**
   * Create a new BaseAssetClass
   * @param asset The asset data to initialize with
   */
  constructor(asset: BaseAsset) {
    this.id = asset.id;
    this.path = asset.path;
    this.filename = asset.filename;
    this.type = asset.type;
    this.title = asset.title;
    this.description = asset.description || '';
    this.tags = [...(asset.tags || [])];
    this.contentPurpose = [...(asset.contentPurpose || [])];
    this.dateCreated = asset.dateCreated;
    this.dateModified = asset.dateModified;
    this.author = asset.author || '';
    this.license = asset.license || '';
    this.fileSize = asset.fileSize;
    this.format = asset.format;

    // Ensure tags are unique on initialization
    this.uniquifyTags();
  }

  /**
   * Add a tag to the asset
   * @param tag The tag to add
   * @returns True if the tag was added, false if it already existed
   */
  public addTag(tag: string): boolean {
    if (!tag || tag.trim() === '') {
      return false;
    }

    const trimmedTag = tag.trim();

    // Check if tag already exists
    if (this.hasTag(trimmedTag)) {
      return false;
    }

    // Check if this is a namespaced tag (contains a colon)
    if (trimmedTag.includes(':')) {
      // Split into namespace and value
      const colonIndex = trimmedTag.indexOf(':');
      const namespace = trimmedTag.substring(0, colonIndex);
      const value = trimmedTag.substring(colonIndex + 1);

      // Use the addTagValue method to handle namespaced tags
      return this.addTagValue(namespace, value);
    }

    // Add the tag (non-namespaced)
    this.tags.push(trimmedTag);
    this.updateModifiedDate();

    return true;
  }

  /**
   * Add a namespaced tag value
   * @param namespace The namespace for the tag
   * @param value The value for the tag
   * @returns True if the tag was added, false if it was invalid
   */
  public addTagValue(namespace: string, value: string | number | boolean): boolean {
    if (!namespace || namespace.trim() === '') {
      return false;
    }

    if (value === undefined || value === null) {
      return false;
    }

    const trimmedNamespace = namespace.trim();
    const valueStr = String(value);
    const fullTag = `${trimmedNamespace}:${valueStr}`;

    // Remove any existing tags with the same namespace
    this.removeTagsByNamespace(trimmedNamespace);

    // Add the new tag
    this.tags.push(fullTag);
    this.updateModifiedDate();

    return true;
  }

  /**
   * Remove all tags with a specific namespace
   * @param namespace The namespace to remove tags for
   * @returns The number of tags that were removed
   */
  private removeTagsByNamespace(namespace: string): number {
    if (!namespace || namespace.trim() === '') {
      return 0;
    }

    const initialLength = this.tags.length;

    // Filter out tags with the specified namespace
    this.tags = this.tags.filter(tag => {
      // Only filter out tags that have a colon and match the namespace
      if (tag.includes(':')) {
        const tagNamespace = tag.substring(0, tag.indexOf(':'));
        return tagNamespace !== namespace;
      }
      return true;
    });

    return initialLength - this.tags.length;
  }

  /**
   * Add multiple tags to the asset
   * @param tags The tags to add
   * @returns The number of tags that were added
   */
  public addTags(tags: string[]): number {
    if (!tags || tags.length === 0) {
      return 0;
    }

    let addedCount = 0;

    // Add each tag
    for (const tag of tags) {
      if (this.addTag(tag)) {
        addedCount++;
      }
    }

    return addedCount;
  }

  /**
   * Remove a tag from the asset
   * @param tag The tag to remove
   * @returns True if the tag was removed, false if it didn't exist
   */
  public removeTag(tag: string): boolean {
    if (!tag || tag.trim() === '') {
      return false;
    }

    const trimmedTag = tag.trim();
    const initialLength = this.tags.length;

    // Remove the tag
    this.tags = this.tags.filter(t => t !== trimmedTag);

    // Check if a tag was removed
    if (this.tags.length !== initialLength) {
      this.updateModifiedDate();
      return true;
    }

    return false;
  }

  /**
   * Remove multiple tags from the asset
   * @param tags The tags to remove
   * @returns The number of tags that were removed
   */
  public removeTags(tags: string[]): number {
    if (!tags || tags.length === 0) {
      return 0;
    }

    let removedCount = 0;

    // Remove each tag
    for (const tag of tags) {
      if (this.removeTag(tag)) {
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Check if the asset has a specific tag
   * @param tag The tag to check for
   * @returns True if the asset has the tag, false otherwise
   */
  public hasTag(tag: string): boolean {
    if (!tag || tag.trim() === '') {
      return false;
    }

    const trimmedTag = tag.trim();

    return this.tags.includes(trimmedTag);
  }

  /**
   * Get all tags with a specific namespace
   * @param namespace The namespace to get tags for
   * @returns Array of tags with the specified namespace
   */
  public getTagsByNamespace(namespace: string): string[] {
    if (!namespace || namespace.trim() === '') {
      return [];
    }

    const namespacePrefix = `${namespace.trim()}:`;

    return this.tags.filter(tag => tag.startsWith(namespacePrefix));
  }

  /**
   * Get the value of a namespaced tag
   * @param namespace The namespace to get the value for
   * @returns The value of the tag (part after the colon), or null if not found
   */
  public getTagValue(namespace: string): string | null {
    if (!namespace || namespace.trim() === '') {
      return null;
    }

    const tags = this.getTagsByNamespace(namespace);

    if (tags.length === 0) {
      return null;
    }

    // Return the part after the colon
    const tag = tags[0];
    const colonIndex = tag.indexOf(':');

    if (colonIndex === -1 || colonIndex === tag.length - 1) {
      return null;
    }

    return tag.substring(colonIndex + 1);
  }

  /**
   * Set a tag value with a namespace (alias for addTagValue for backward compatibility)
   * @param namespace The namespace for the tag
   * @param value The value to set
   * @returns True if the tag was set, false if the value was invalid
   */
  public setTagValue(namespace: string, value: string | number | boolean): boolean {
    return this.addTagValue(namespace, value);
  }

  /**
   * Clear all tags from the asset
   * @returns The number of tags that were removed
   */
  public clearTags(): number {
    const count = this.tags.length;

    if (count > 0) {
      this.tags = [];
      this.updateModifiedDate();
    }

    return count;
  }

  /**
   * Ensure tags are unique
   * @returns The number of duplicate tags that were removed
   */
  public uniquifyTags(): number {
    const initialCount = this.tags.length;

    // Use a Set to ensure uniqueness
    const uniqueTags = [...new Set(this.tags)];

    // Update tags if there were duplicates
    if (uniqueTags.length !== initialCount) {
      this.tags = uniqueTags;
      this.updateModifiedDate();
    }

    return initialCount - uniqueTags.length;
  }

  /**
   * Add a content purpose to the asset
   * @param purpose The content purpose to add
   * @returns True if the purpose was added, false if it already existed
   */
  public addContentPurpose(purpose: ContentPurpose): boolean {
    // Check if purpose already exists
    if (this.contentPurpose.includes(purpose)) {
      return false;
    }

    // Add the purpose
    this.contentPurpose.push(purpose);
    this.updateModifiedDate();

    return true;
  }

  /**
   * Remove a content purpose from the asset
   * @param purpose The content purpose to remove
   * @returns True if the purpose was removed, false if it didn't exist
   */
  public removeContentPurpose(purpose: ContentPurpose): boolean {
    const initialLength = this.contentPurpose.length;

    // Remove the purpose
    this.contentPurpose = this.contentPurpose.filter(p => p !== purpose);

    // Check if a purpose was removed
    if (this.contentPurpose.length !== initialLength) {
      this.updateModifiedDate();
      return true;
    }

    return false;
  }

  /**
   * Update the modified date to the current time
   */
  protected updateModifiedDate(): void {
    this.dateModified = new Date().toISOString();
  }

  /**
   * Convert the class instance to a plain object
   * @returns Plain object representation of the asset
   */
  public toObject(): BaseAsset {
    return {
      id: this.id,
      path: this.path,
      filename: this.filename,
      type: this.type,
      title: this.title,
      description: this.description,
      tags: [...this.tags],
      contentPurpose: [...this.contentPurpose],
      dateCreated: this.dateCreated,
      dateModified: this.dateModified,
      author: this.author,
      license: this.license,
      fileSize: this.fileSize,
      format: this.format
    };
  }
}
