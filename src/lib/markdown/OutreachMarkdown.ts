import { z } from 'zod';
import path from 'path';
import { Markdown, BaseMarkdownSchema } from './Markdown';
import { parseHoverVideoImageTags } from './HoverVideoImageTagParser';

/**
 * Interface for next step in outreach journey
 */
export interface NextStep {
  title: string;
  slug: string;
  description: string;
  icon?: string;
}

/**
 * Interface for outreach data
 */
export interface OutreachData {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  category?: string;
  type?: 'creative' | 'business' | 'production' | 'storytelling' | 'worldbuilding' | 'collaboration';
  accentColor?: string;
  primaryColor?: string;
  nextSteps?: NextStep[];
  images?: {
    hero: string;
    detailed?: string;
    altText?: string;
    animated?: string;
    promptText?: string;
  };
  content?: string;
  contentHtml?: string;
}

/**
 * Schema for outreach-specific fields
 */
export const OutreachMarkdownSchema = BaseMarkdownSchema.extend({
  title: z.string(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  type: z.enum(['creative', 'business', 'production', 'storytelling', 'worldbuilding', 'collaboration']).optional(),
  accentColor: z.string().optional(),
  primaryColor: z.string().optional(),
  nextSteps: z.array(z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string(),
    icon: z.string().optional(),
  })).optional(),
  images: z.object({
    hero: z.string(),
    detailed: z.string().optional(),
    altText: z.string().optional(),
    animated: z.string().optional(),
    promptText: z.string().optional(),
  }).optional(),
});

export type OutreachMarkdownData = z.infer<typeof OutreachMarkdownSchema>;

/**
 * Class for handling outreach markdown files
 */
export class OutreachMarkdown extends Markdown {
  /**
   * Validate the outreach data against the schema
   */
  protected validateData(): void {
    try {
      OutreachMarkdownSchema.parse(this.data);
    } catch {
     
    }
  }

  /**
   * Get the subtitle of the outreach material
   */
  public getSubtitle(): string {
    return this.data.subtitle || '';
  }

  /**
   * Get the category of the outreach material
   */
  public getCategory(): string {
    return this.data.category || '';
  }

  /**
   * Get the type of the outreach material
   */
  public getType(): 'creative' | 'business' | 'production' | 'storytelling' | 'worldbuilding' | 'collaboration' | undefined {
    return this.data.type;
  }

  /**
   * Get the accent color of the outreach material
   */
  public getAccentColor(): string {
    return this.data.accentColor || 'cyan';
  }

  /**
   * Get the primary color of the outreach material
   */
  public getPrimaryColor(): string {
    return this.data.primaryColor || 'blue';
  }

  /**
   * Get the hero image of the outreach material
   */
  public getHeroImage(): string {
    return this.data.images?.hero || '';
  }

  /**
   * Get the detailed image of the outreach material
   */
  public getDetailedImage(): string {
    return this.data.images?.detailed || this.data.images?.hero || '';
  }

  /**
   * Get the alt text for the hero image
   */
  public getAltText(): string {
    return this.data.images?.altText || '';
  }

  /**
   * Get the animated version of the hero image
   */
  public getAnimatedImage(): string {
    return this.data.images?.animated || '';
  }

  /**
   * Get the prompt text for animation
   */
  public getPromptText(): string {
    return this.data.images?.promptText || '';
  }

  /**
   * Override getSlug to use the filename as the slug if not specified in frontmatter
   */
  public getSlug(): string {
    // If slug is specified in frontmatter, use it
    if (this.data.slug) {
      return this.data.slug;
    }

    // Otherwise, use the filename as the slug
    return path.basename(this.filePath, '.md');
  }

  /**
   * Get the next steps for the outreach journey
   */
  public getNextSteps(): NextStep[] {
    return this.data.nextSteps || [];
  }

  /**
   * Override markdownToHtml to parse HoverVideoImage tags
   * @param markdown The markdown content to convert
   * @returns The HTML content with HoverVideoImage tags parsed
   */
  public async markdownToHtml(markdown?: string): Promise<string> {
    // First convert markdown to HTML using the parent method
    const html = await super.markdownToHtml(markdown);

    // Then parse HoverVideoImage tags in the HTML
    return parseHoverVideoImageTags(html);
  }

  /**
   * Convert to OutreachData format for use in the UI
   */
  public async toOutreachData(): Promise<OutreachData> {
    // Convert markdown content to HTML
    const contentHtml = await this.markdownToHtml();

    // Get the slug
    const slug = this.getSlug();

    // Create the outreach data object
    const outreachData: OutreachData = {
      id: slug,
      slug: slug,
      title: this.getTitle(),
      subtitle: this.getSubtitle(),
      description: this.getDescription(),
      category: this.getCategory(),
      type: this.getType(),
      accentColor: this.getAccentColor(),
      primaryColor: this.getPrimaryColor(),
      nextSteps: this.getNextSteps(),
      images: {
        hero: this.getHeroImage(),
        detailed: this.getDetailedImage(),
        altText: this.getAltText(),
        animated: this.getAnimatedImage(),
        promptText: this.getPromptText(),
      },
      content: this.getContent(),
      contentHtml
    };

    return this.makeSerializable(outreachData) as OutreachData;
  }

  /**
   * Static method to get all outreach materials
   */
  public static getAllOutreachMaterials(): OutreachMarkdown[] {
    const filePaths = this.getAllFilePaths('outreach');
    return filePaths.map(filePath => new OutreachMarkdown(filePath));
  }

  /**
   * Static method to get outreach material by slug
   */
  public static getOutreachMaterialBySlug(slug: string): OutreachMarkdown | undefined {
    if (!slug) {
      return undefined;
    }

    const filePaths = this.getAllFilePaths('outreach');

    // First try exact match
    const exactMatch = filePaths.find(filePath => {
      const fileName = path.basename(filePath, '.md');
      return fileName === slug;
    });

    if (exactMatch) {
      return new OutreachMarkdown(exactMatch);
    }

    // Then try fuzzy match
    const fuzzyMatch = filePaths.find(filePath => {
      const fileName = path.basename(filePath, '.md');
      return fileName.toLowerCase().includes(slug.toLowerCase());
    });

    if (fuzzyMatch) {
      return new OutreachMarkdown(fuzzyMatch);
    }

    return undefined;
  }

  /**
   * Static method to get outreach data by slug
   */
  public static async getOutreachData(slug: string): Promise<OutreachData> {
    if (!slug) {
      return {
        id: 'unknown',
        slug: 'unknown',
        title: 'Unknown Outreach Material'
      };
    }

    // Try to get the outreach material
    const outreachMaterial = OutreachMarkdown.getOutreachMaterialBySlug(slug);

    if (!outreachMaterial) {
      // No matching file found, return minimal data with the search ID
      return {
        id: slug,
        slug: slug,
        title: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      };
    }

    // Convert to outreach data
    return outreachMaterial.toOutreachData();
  }
}
