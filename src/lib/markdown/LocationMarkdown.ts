import { z } from 'zod';
import { Markdown, BaseMarkdownSchema } from './Markdown';
import path from 'path';

/**
 * Interface for location data used in the UI
 */
export interface LocationData {
  id: string;
  slug?: string;
  title: string;
  level?: string;
  district?: string;
  coordinates?: string;
  population?: string;
  controlledBy?: string;
  securityLevel?: string;
  economicStatus?: string;
  description?: string;
  notableFeatures?: string[];
  history?: string;
  dangers?: string[];
  opportunities?: string[];
  connectedLocations?: {
    location: string;
    locationSlug: string;
    level?: string;
    connection?: string;
  }[];
  notableCharacters?: {
    character: string;
    characterSlug: string;
    role?: string;
  }[];
  storyAppearances?: {
    story: string;
    storySlug: string;
    context?: string;
    title?: string;
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
  parentLocation?: string;
}

/**
 * Schema for location-specific fields
 */
export const LocationMarkdownSchema = BaseMarkdownSchema.extend({
  level: z.string(),
  district: z.string().optional(),
  coordinates: z.string().optional(),
  population: z.string().optional(),
  controlledBy: z.string().optional(),
  securityLevel: z.string().optional(),
  economicStatus: z.string().optional(),
  notableFeatures: z.array(z.string()).optional(),
  history: z.string().optional(),
  dangers: z.array(z.string()).optional(),
  opportunities: z.array(z.string()).optional(),
  connectedLocations: z.array(
    z.object({
      location: z.string(),
      locationSlug: z.string(),
      level: z.string().optional(),
      connection: z.string().optional(),
      relationship: z.string().optional(),
    })
  ).optional(),
  relatedLocations: z.array(
    z.object({
      location: z.string(),
      locationSlug: z.string(),
      level: z.string().optional(),
      connection: z.string().optional(),
      relationship: z.string().optional(),
    })
  ).optional(),
  notableCharacters: z.array(
    z.object({
      character: z.string(),
      characterSlug: z.string(),
      role: z.string().optional(),
      relationship: z.string().optional(),
    })
  ).optional(),
  relatedCharacters: z.array(
    z.object({
      character: z.string(),
      characterSlug: z.string(),
      role: z.string().optional(),
      relationship: z.string().optional(),
    })
  ).optional(),
  storyAppearances: z.array(
    z.object({
      story: z.string().optional(),
      title: z.string().optional(),
      storySlug: z.string(),
      context: z.string().optional(),
    }).refine(data => data.story !== undefined || data.title !== undefined, {
      message: "Either 'story' or 'title' must be provided",
      path: ['story']
    })
  ).optional(),
  images: z.object({
    main: z.string(),
    detailed: z.string(),
    altText: z.string(),
    animated: z.string().optional(),
  }),
});

export type LocationMarkdownData = z.infer<typeof LocationMarkdownSchema>;

/**
 * Class for handling location markdown files
 */
export class LocationMarkdown extends Markdown {
  /**
   * Validate the location data against the schema
   */
  protected validateData(): void {
    LocationMarkdownSchema.parse(this.data);
  }

  /**
   * Get the level of the location
   */
  public getLevel(): string {
    return this.data.level;
  }

  /**
   * Get the district of the location
   */
  public getDistrict(): string | undefined {
    return this.data.district;
  }

  /**
   * Get the coordinates of the location
   */
  public getCoordinates(): string | undefined {
    return this.data.coordinates;
  }

  /**
   * Get the population of the location
   */
  public getPopulation(): string | undefined {
    return this.data.population;
  }

  /**
   * Get who controls the location
   */
  public getControlledBy(): string | undefined {
    return this.data.controlledBy;
  }

  /**
   * Get the security level of the location
   */
  public getSecurityLevel(): string | undefined {
    return this.data.securityLevel;
  }

  /**
   * Get the economic status of the location
   */
  public getEconomicStatus(): string | undefined {
    return this.data.economicStatus;
  }

  /**
   * Get the notable features of the location
   */
  public getNotableFeatures(): string[] {
    return this.data.notableFeatures || [];
  }

  /**
   * Get the history of the location
   */
  public getHistory(): string | undefined {
    return this.data.history;
  }

  /**
   * Get the dangers of the location
   */
  public getDangers(): string[] {
    return this.data.dangers || [];
  }

  /**
   * Get the opportunities of the location
   */
  public getOpportunities(): string[] {
    return this.data.opportunities || [];
  }

  /**
   * Get connected locations
   */
  public getConnectedLocations(): { location: string; locationSlug: string; level?: string; connection?: string; relationship?: string }[] {
    // Support both connectedLocations and relatedLocations fields
    return this.data.connectedLocations || this.data.relatedLocations || [];
  }

  /**
   * Get notable characters
   */
  public getNotableCharacters(): { character: string; characterSlug: string; role?: string; relationship?: string }[] {
    // Support both notableCharacters and relatedCharacters fields
    return this.data.notableCharacters || this.data.relatedCharacters || [];
  }

  /**
   * Get story appearances
   */
  public getStoryAppearances(): { story: string; storySlug: string; context?: string }[] {
    if (!this.data.storyAppearances) {
      return [];
    }

    // Map the data to ensure each item has a story field
    return this.data.storyAppearances.map((item: any) => ({
      story: item.story || item.title || '',
      storySlug: item.storySlug,
      context: item.context
    }));
  }

  // Image methods are inherited from the base Markdown class

  /**
   * Static method to get all location markdown files
   */
  public static getAllLocations(): LocationMarkdown[] {
    const filePaths = Markdown.getAllFilePaths('locations');
    return filePaths.map(filePath => new LocationMarkdown(filePath));
  }

  /**
   * Static method to get a location by slug
   */
  public static getLocationBySlug(slug: string): LocationMarkdown | undefined {
    const filePaths = Markdown.getAllFilePaths('locations');
    const locationPath = filePaths.find(filePath => {
      const fileName = path.basename(filePath, '.md');
      return fileName === slug;
    });

    return locationPath ? new LocationMarkdown(locationPath) : undefined;
  }

  /**
   * Static method to get a location by slug with fuzzy matching
   */
  public static getLocationBySlugFuzzy(slug: string): LocationMarkdown | undefined {
    const result = Markdown.findFileWithFuzzyMatching('locations', slug);
    if (!result) {
      return undefined;
    }
    return new LocationMarkdown(result.filePath);
  }

  /**
   * Convert to LocationData format for use in the UI
   */
  public async toLocationData(): Promise<LocationData> {
    // Convert markdown content to HTML
    const contentHtml = await this.markdownToHtml();

    // Create the location data object
    const locationData: LocationData = {
      id: this.getSlug(),
      slug: this.getSlug(),
      title: this.getTitle(),
      level: this.getLevel(),
      district: this.getDistrict(),
      coordinates: this.getCoordinates(),
      population: this.getPopulation(),
      controlledBy: this.getControlledBy(),
      securityLevel: this.getSecurityLevel(),
      economicStatus: this.getEconomicStatus(),
      description: this.getDescription(),
      notableFeatures: this.getNotableFeatures(),
      history: this.getHistory(),
      dangers: this.getDangers(),
      opportunities: this.getOpportunities(),
      connectedLocations: this.getConnectedLocations(),
      notableCharacters: this.getNotableCharacters(),
      storyAppearances: this.getStoryAppearances(),
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
      comingSoon: this.data.comingSoon,
      parentLocation: this.data.parentLocation,
    };

    return this.makeSerializable(locationData) as LocationData;
  }

  /**
   * Static method to get all location slugs
   * This is used for generating static paths
   */
  public static async getAllLocationSlugs(): Promise<string[]> {
    const filePaths = Markdown.getAllFilePaths('locations');
    return filePaths.map(filePath => path.basename(filePath, '.md'));
  }

  /**
   * Static method to get location data by slug
   * This is a replacement for the getLocationData function in mdx.ts
   */
  public static async getLocationData(slug: string): Promise<LocationData> {
    // Try to get the location with fuzzy matching
    const location = LocationMarkdown.getLocationBySlugFuzzy(slug);

    if (!location) {
      // No matching file found, return minimal data with the search ID
      return {
        id: slug,
        slug: slug,
        title: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      };
    }

    // Convert to location data
    return location.toLocationData();
  }
}
