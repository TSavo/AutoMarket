import { z } from 'zod';
import { Markdown, BaseMarkdownSchema } from './Markdown';
import path from 'path';

/**
 * Interface for technology data used in the UI
 */
export interface TechnologyData {
  id: string;
  slug?: string;
  title: string;
  category?: string;
  era?: string;
  inventor?: string | string[];
  manufacturer?: string | string[];
  description?: string;
  capabilities?: string[];
  limitations?: string[];
  legalStatus?: string;
  availability?: string;
  cost?: string;
  storyAppearances?: {
    story: string;
    storySlug: string;
    context?: string;
    timeline?: string;
  }[];
  relatedCharacters?: {
    character: string;
    characterSlug: string;
    relationship: string;
  }[];
  relatedLocations?: {
    location: string;
    locationSlug: string;
    relationship: string;
  }[];
  relatedTechnologies?: {
    technology: string;
    technologySlug: string;
    relationship: string;
  }[];
  relatedThemes?: {
    theme: string;
    themeSlug: string;
    relationship: string;
  }[];
  images?: {
    main: string;
    detailed?: string;
    altText?: string;
    animated?: string;
  };
  image?: string;
  content?: string;
  contentHtml?: string;
  comingSoon?: boolean;
}

/**
 * Schema for technology-specific fields
 */
export const TechnologyMarkdownSchema = BaseMarkdownSchema.extend({
  category: z.string(),
  era: z.string().optional(),
  inventor: z.union([z.string(), z.array(z.string())]).optional(),
  manufacturer: z.union([z.string(), z.array(z.string())]).optional(),
  requiredBadges: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  limitations: z.array(z.string()).optional(),
  legalStatus: z.string().optional(),
  availability: z.string().optional(),
  cost: z.string().optional(),
  relatedCharacters: z.array(
    z.object({
      character: z.string(),
      characterSlug: z.string(),
      relationship: z.string(),
    })
  ).optional(),
  relatedLocations: z.array(
    z.object({
      location: z.string(),
      locationSlug: z.string(),
      relationship: z.string(),
    })
  ).optional(),
  images: z.object({
    main: z.string(),
    detailed: z.string(),
    altText: z.string(),
  }),
});

export type TechnologyMarkdownData = z.infer<typeof TechnologyMarkdownSchema>;

/**
 * Class for handling technology markdown files
 */
export class TechnologyMarkdown extends Markdown {
  /**
   * Validate the technology data against the schema
   */
  protected validateData(): void {
    TechnologyMarkdownSchema.parse(this.data);
  }

  /**
   * Get the category of the technology
   */
  public getCategory(): string {
    return this.data.category;
  }

  /**
   * Get the era of the technology
   */
  public getEra(): string | undefined {
    return this.data.era;
  }

  /**
   * Get the inventor(s) of the technology
   */
  public getInventor(): string | string[] | undefined {
    return this.data.inventor;
  }

  /**
   * Get the manufacturer(s) of the technology
   */
  public getManufacturer(): string | string[] | undefined {
    return this.data.manufacturer;
  }

  /**
   * Get the required badges for the technology
   */
  public getRequiredBadges(): string[] {
    return this.data.requiredBadges || [];
  }

  /**
   * Get the capabilities of the technology
   */
  public getCapabilities(): string[] {
    return this.data.capabilities || [];
  }

  /**
   * Get the limitations of the technology
   */
  public getLimitations(): string[] {
    return this.data.limitations || [];
  }

  /**
   * Get the legal status of the technology
   */
  public getLegalStatus(): string | undefined {
    return this.data.legalStatus;
  }

  /**
   * Get the availability of the technology
   */
  public getAvailability(): string | undefined {
    return this.data.availability;
  }

  /**
   * Get the cost of the technology
   */
  public getCost(): string | undefined {
    return this.data.cost;
  }

  /**
   * Get related characters
   */
  public getRelatedCharacters(): { character: string; characterSlug: string; relationship: string }[] {
    return this.data.relatedCharacters || [];
  }

  /**
   * Get related locations
   */
  public getRelatedLocations(): { location: string; locationSlug: string; relationship: string }[] {
    return this.data.relatedLocations || [];
  }

  // Image methods are inherited from the base Markdown class

  /**
   * Static method to get all technology markdown files
   */
  public static getAllTechnologies(): TechnologyMarkdown[] {
    const filePaths = Markdown.getAllFilePaths('technologies');
    return filePaths.map(filePath => new TechnologyMarkdown(filePath));
  }

  /**
   * Static method to get a technology by slug
   */
  public static getTechnologyBySlug(slug: string): TechnologyMarkdown | undefined {
    const filePaths = Markdown.getAllFilePaths('technologies');
    const technologyPath = filePaths.find(filePath => {
      const fileName = path.basename(filePath, '.md');
      return fileName === slug;
    });

    return technologyPath ? new TechnologyMarkdown(technologyPath) : undefined;
  }

  /**
   * Static method to get a technology by slug with fuzzy matching
   */
  public static getTechnologyBySlugFuzzy(slug: string): TechnologyMarkdown | undefined {
    const result = Markdown.findFileWithFuzzyMatching('technologies', slug);
    if (!result) {
      return undefined;
    }
    return new TechnologyMarkdown(result.filePath);
  }

  /**
   * Convert to TechnologyData format for use in the UI
   */
  public async toTechnologyData(): Promise<TechnologyData> {
    // Convert markdown content to HTML
    const contentHtml = await this.markdownToHtml();

    // Create the technology data object
    const technologyData: TechnologyData = {
      id: this.getSlug(),
      slug: this.getSlug(),
      title: this.getTitle(),
      category: this.getCategory(),
      era: this.getEra(),
      inventor: this.getInventor(),
      manufacturer: this.getManufacturer(),
      description: this.getDescription(),
      capabilities: this.getCapabilities(),
      limitations: this.getLimitations(),
      legalStatus: this.getLegalStatus(),
      availability: this.getAvailability(),
      cost: this.getCost(),
      storyAppearances: this.getStoryAppearances(),
      relatedCharacters: this.getRelatedCharacters(),
      relatedLocations: this.getRelatedLocations(),
      relatedTechnologies: this.getRelatedTechnologies(),
      relatedThemes: this.getRelatedThemes(),
      images: {
        main: this.getMainImage(),
        detailed: this.getDetailedImage(),
        altText: this.getAltText(),
        animated: this.getVideo()
      },
      image: this.getMainImage(),
      content: this.getContent(),
      contentHtml,
      comingSoon: this.data.comingSoon
    };

    return this.makeSerializable(technologyData) as TechnologyData;
  }

  /**
   * Static method to get all technology slugs
   * This is used for generating static paths
   */
  public static async getAllTechnologySlugs(): Promise<string[]> {
    const filePaths = Markdown.getAllFilePaths('technologies');
    return filePaths.map(filePath => path.basename(filePath, '.md'));
  }

  /**
   * Static method to get technology data by slug
   * This is a replacement for the getTechnologyData function in mdx.ts
   */
  public static async getTechnologyData(slug: string): Promise<TechnologyData> {
    // Try to get the technology with fuzzy matching
    const technology = TechnologyMarkdown.getTechnologyBySlugFuzzy(slug);

    if (!technology) {
      // No matching file found, return minimal data with the search ID
      return {
        id: slug,
        slug: slug,
        title: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      };
    }

    // Convert to technology data
    return technology.toTechnologyData();
  }
}
