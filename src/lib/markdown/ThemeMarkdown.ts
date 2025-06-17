import { z } from 'zod';
import { Markdown, BaseMarkdownSchema } from './Markdown';
import path from 'path';
import { MarkdownFactory } from './MarkdownFactory';

/**
 * Interface for theme data used in the UI
 */
export interface ThemeData {
  id: string;
  slug?: string;
  title: string;
  category?: string;
  description?: string;
  keyQuestions?: string[];
  manifestations?: string[];
  subthemes?: string[];
  storyAppearances?: {
    story: string;
    storySlug: string;
    context?: string;
    color?: string;
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
 * Schema for theme-specific fields
 */
export const ThemeMarkdownSchema = BaseMarkdownSchema.extend({
  category: z.string(),
  keyQuestions: z.array(z.string()).optional(),
  manifestations: z.array(z.string()).optional(),
  subthemes: z.array(z.string()).optional(),
  images: z.object({
    main: z.string(),
    detailed: z.string(),
    altText: z.string(),
  }),
});

export type ThemeMarkdownData = z.infer<typeof ThemeMarkdownSchema>;

/**
 * Class for handling theme markdown files
 */
export class ThemeMarkdown extends Markdown {
  /**
   * Validate the theme data against the schema
   */
  protected validateData(): void {
    ThemeMarkdownSchema.parse(this.data);
  }

  /**
   * Get the category of the theme
   */
  public getCategory(): string {
    return this.data.category;
  }

  /**
   * Get the key questions of the theme
   */
  public getKeyQuestions(): string[] {
    return this.data.keyQuestions || [];
  }

  /**
   * Get the manifestations of the theme
   */
  public getManifestations(): string[] {
    return this.data.manifestations || [];
  }

  /**
   * Get the subthemes of the theme
   */
  public getSubthemes(): string[] {
    return this.data.subthemes || [];
  }

  // Image methods are inherited from the base Markdown class

  /**
   * Static method to get all theme markdown files
   */
  public static getAllThemes(): ThemeMarkdown[] {
    const filePaths = Markdown.getAllFilePaths('themes');
    return filePaths.map(filePath => new ThemeMarkdown(filePath));
  }

  /**
   * Static method to get a theme by slug
   */
  public static getThemeBySlug(slug: string): ThemeMarkdown | undefined {
    const filePaths = Markdown.getAllFilePaths('themes');
    const themePath = filePaths.find(filePath => {
      const fileName = path.basename(filePath, '.md');
      return fileName === slug;
    });

    return themePath ? new ThemeMarkdown(themePath) : undefined;
  }

  /**
   * Static method to get a theme by slug with fuzzy matching
   */
  public static getThemeBySlugFuzzy(slug: string): ThemeMarkdown | undefined {
    const result = Markdown.findFileWithFuzzyMatching('themes', slug);
    if (!result) {
      return undefined;
    }
    return new ThemeMarkdown(result.filePath);
  }

  /**
   * Convert to ThemeData format for use in the UI
   */
  public async toThemeData(): Promise<ThemeData> {
    // Convert markdown content to HTML
    const contentHtml = await this.markdownToHtml();

    // Get story appearances with color information
    const storyAppearances = this.getStoryAppearances().map(story => {
      // Extract series and story slugs
      const storySlug = story.storySlug || '';
      const parts = storySlug.split('/');
      const seriesSlug = parts.length > 1 ? parts[0] : '';
      const slug = parts.length > 1 ? parts[1] : storySlug;

      // Try to get the story markdown to access its color scheme
      let color: string | undefined;

      try {
        // Use the imported MarkdownFactory
        const storyMarkdown = MarkdownFactory.createStoryMarkdown(slug, seriesSlug);

        if (storyMarkdown) {
          const colorScheme = storyMarkdown.getColorScheme();
          if (colorScheme?.accent) {
            color = colorScheme.accent;
          }
        }
      } catch {

      }

      // If no color was found, use a default based on series
      if (!color) {
        if (seriesSlug.includes('horizons-edge')) {
          color = "cyan";
        } else if (seriesSlug.includes('horizons-end')) {
          color = "red";
        } else if (seriesSlug.includes('horizons-fall')) {
          color = "orange";
        } else {
          color = "purple"; // Default color
        }
      }

      // Return the story with color information
      return {
        ...story,
        color
      };
    });

    // Create the theme data object
    const themeData: ThemeData = {
      id: this.getSlug(),
      slug: this.getSlug(),
      title: this.getTitle(),
      category: this.getCategory(),
      description: this.getDescription(),
      keyQuestions: this.getKeyQuestions(),
      manifestations: this.getManifestations(),
      subthemes: this.getSubthemes(),
      storyAppearances: storyAppearances,
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

    return this.makeSerializable(themeData) as ThemeData;
  }

  /**
   * Static method to get all theme slugs
   * This is used for generating static paths
   */
  public static async getAllThemeSlugs(): Promise<string[]> {
    const filePaths = Markdown.getAllFilePaths('themes');
    return filePaths.map(filePath => path.basename(filePath, '.md'));
  }

  /**
   * Static method to get theme data by slug
   * This is a replacement for the getThemeData function in mdx.ts
   */
  public static async getThemeData(slug: string): Promise<ThemeData> {
    // Try to get the theme with fuzzy matching
    const theme = ThemeMarkdown.getThemeBySlugFuzzy(slug);

    if (!theme) {
      // No matching file found, return minimal data with the search ID
      return {
        id: slug,
        slug: slug,
        title: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      };
    }

    // Convert to theme data
    return theme.toThemeData();
  }
}
