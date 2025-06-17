import { z } from 'zod';
import matter from 'gray-matter';
import path from 'path';
import fs from 'fs';
import { remark } from 'remark';
import html from 'remark-html';
import { fuzzyMatchBadgeId } from '../../../utils/access-badges';

/**
 * Base schema for common fields across all content types
 * This is a very permissive schema that allows any fields
 */
export const BaseMarkdownSchema = z.object({}).passthrough();

export type BaseMarkdownData = z.infer<typeof BaseMarkdownSchema>;

/**
 * Image data with common fields
 */
export interface ImageData {
  altText: string;
  [key: string]: string; // Allow additional image fields
}

/**
 * Relationship data structure
 */
export interface RelationshipData {
  relationship: string;
  [key: string]: string; // Allow additional relationship fields
}

/**
 * Abstract base class for all markdown content types
 */
export abstract class Markdown {
  protected data: Record<string, any> = {};
  protected content: string = '';
  protected filePath: string;

  /**
   * Create a new Markdown instance
   * @param filePath Path to the markdown file
   */
  constructor(filePath: string) {
    this.filePath = filePath;
    this.initialize();
  }

  /**
   * Initialize the markdown instance
   * This is separated from the constructor to allow for overriding
   */
  protected initialize(): void {
    const fileContent = fs.readFileSync(this.filePath, 'utf8');
    const { data, content } = matter(fileContent);

    this.data = data;
    this.content = content;

    this.validateData();
  }

  /**
   * Validate the markdown data against the schema
   */
  protected abstract validateData(): void;

  /**
   * Get the title of the content
   */
  public getTitle(): string {
    return this.data.title;
  }

  /**
   * Get the slug of the content
   */
  public getSlug(): string {
    return this.data.slug;
  }

  /**
   * Get the description of the content
   */
  public getDescription(): string {
    return this.data.description;
  }

  /**
   * Get the raw content (without frontmatter)
   */
  public getContent(): string {
    return this.content;
  }

  /**
   * Get the raw data (frontmatter)
   */
  public getData(): Record<string, any> {
    return this.data;
  }

  /**
   * Get the file path
   */
  public getFilePath(): string {
    return this.filePath;
  }

  /**
   * Get the image data
   */
  public getImages(): ImageData {
    return this.data.images;
  }

  /**
   * Get the main image URL
   */
  public getMainImage(): string {
    return this.data.images.main;
  }

  /**
   * Get the detailed image URL
   */
  public getDetailedImage(): string {
    return this.data.images.detailed;
  }

  /**
   * Get the alt text for images
   */
  public getAltText(): string {
    return this.data.images.altText;
  }

  /**
   * Get the video URL if available
   */
  public getVideo(): string | undefined {
    return this.data.images.animated;
  }

  /**
   * Get related themes
   */
  public getRelatedThemes(): Array<RelationshipData & { theme: string; themeSlug: string }> {
    return this.data.relatedThemes || [];
  }

  /**
   * Get related technologies
   */
  public getRelatedTechnologies(): Array<RelationshipData & { technology: string; technologySlug: string }> {
    return this.data.relatedTechnologies || [];
  }

  /**
   * Get related characters
   */
  public getRelatedCharacters(): Array<RelationshipData & { character: string; characterSlug: string }> {
    return this.data.relatedCharacters || [];
  }

  /**
   * Get related locations
   */
  public getRelatedLocations(): Array<RelationshipData & { location: string; locationSlug: string }> {
    return this.data.relatedLocations || [];
  }

  /**
   * Get story appearances
   */
  public getStoryAppearances(): Array<{ story: string; storySlug: string; context?: string; role?: string; timeline?: string }> {
    if (!this.data.storyAppearances) {
      return [];
    }

    // Map the data to ensure each item has a story field
    return this.data.storyAppearances.map((item: any) => ({
      story: item.story || item.title || '',
      storySlug: item.storySlug,
      context: item.context,
      role: item.role,
      timeline: item.timeline
    }));
  }

  /**
   * Static method to get all markdown files of a specific type
   * @param contentDir Directory containing the markdown files
   * @returns Array of file paths
   */
  public static getAllFilePaths(contentDir: string): string[] {
    const dir = path.join(process.cwd(), 'content', contentDir);
    return fs.readdirSync(dir)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(dir, file));
  }

  /**
   * Convert markdown content to HTML
   * @param markdown The markdown content to convert
   * @returns The HTML content
   */
  public async markdownToHtml(markdown?: string): Promise<string> {
    const markdownContent = markdown || this.content;
    const result = await remark()
      .use(html, { sanitize: false })
      .process(markdownContent);
    return result.toString();
  }

  /**
   * Get the HTML content
   * @returns The HTML content
   */
  public async getHtmlContent(): Promise<string> {
    return this.markdownToHtml();
  }

  /**
   * Find a markdown file with fuzzy matching
   * @param contentDir Directory containing the markdown files
   * @param slug The slug to match
   * @returns The file path and matched slug, or null if not found
   */
  public static findFileWithFuzzyMatching(contentDir: string, slug: string): { filePath: string; matchedSlug: string } | null {
    const dir = path.join(process.cwd(), 'content', contentDir);

    // Try exact match first
    const exactPath = path.join(dir, `${slug}.md`);
    if (fs.existsSync(exactPath)) {
      return { filePath: exactPath, matchedSlug: slug };
    }

    // Try fuzzy matching
    try {
      const files = fs.readdirSync(dir)
        .filter(file => file.endsWith('.md') && file !== 'README.md' && file !== 'index.md');

      // Find a file that matches using fuzzy matching
      const matchingFile = files.find(file => {
        const fileSlug = file.replace(/\.md$/, '');
        return fuzzyMatchBadgeId(fileSlug, slug);
      });

      if (matchingFile) {
        const matchedSlug = matchingFile.replace(/\.md$/, '');
        return { filePath: path.join(dir, matchingFile), matchedSlug };
      }
    } catch {
     
    }

    return null;
  }

  /**
   * Create a serializable version of the data
   * This ensures all values can be safely serialized to JSON
   */
  public toSerializable(): Record<string, any> {
    return this.makeSerializable(this.data);
  }

  /**
   * Helper function to ensure all values are serializable
   * @param obj The object to make serializable
   * @returns A serializable version of the object
   */
  protected makeSerializable(obj: any): any {
    if (obj === undefined) return null;
    if (obj === null) return null;
    if (typeof obj === 'function') return null;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.makeSerializable(item));
    }

    const result: Record<string, any> = {};
    for (const key in obj) {
      result[key] = this.makeSerializable(obj[key]);
    }
    return result;
  }
}
