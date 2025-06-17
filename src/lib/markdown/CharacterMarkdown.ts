import { z } from 'zod';
import path from 'path';
import { Markdown, BaseMarkdownSchema } from './Markdown';

/**
 * Interface for character data used in the UI
 */
export interface CharacterData {
  id: string;
  slug?: string;
  title: string;
  fullName?: string;
  gender?: string;
  age?: string;
  aliases?: string[];
  occupation?: string[];
  status?: string;
  fileId?: string;
  archetype?: {
    type: string;
    description: string;
  };
  physicalDescription?: string[];
  species?: string;
  modifications?: string[];
  firstAppearance?: string;
  period?: string;
  storyAppearances?: {
    story: string;
    storySlug: string;
    role?: string;
    timeline?: string;
    context?: string;
  }[];
  affiliations?: string[];
  connections?: {
    character: string;
    characterSlug: string;
    relationship: string;
  }[];
  subversion?: string[];
  corporateRole?: string;
  arc?: string;
  quotes?: {
    quote: string;
    context?: string;
  }[];
  primaryLocations?: {
    location: string;
    locationSlug: string;
    level: string;
    description: string;
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
  relatedLocations?: {
    location: string;
    locationSlug: string;
    relationship: string;
  }[];
  images?: {
    portrait: string;
    detailed?: string;
    hero?: string;
    altText?: string;
    animated?: string;
  };
  animated?: string;
  content?: string;
  contentHtml?: string;
}

/**
 * Schema for character-specific fields
 */
export const CharacterMarkdownSchema = BaseMarkdownSchema.extend({
  fullName: z.string().optional(),
  gender: z.string().optional(),
  age: z.union([z.string(), z.number()]).optional(),
  aliases: z.array(z.string()).optional(),
  occupation: z.array(z.string()).optional(),
  status: z.string().optional(),
  archetype: z.object({
    type: z.string(),
    description: z.string(),
  }).optional(),
  physicalDescription: z.array(z.string()).optional(),
  species: z.string().optional(),
  modifications: z.array(z.string()).optional(),
  firstAppearance: z.string().optional(),
  period: z.string().optional(),
  affiliations: z.array(z.string()).optional(),
  subversion: z.array(z.string()).optional(),
  corporateRole: z.string().optional(),
  arc: z.string().optional(),
  quotes: z.array(z.object({
    quote: z.string(),
    context: z.string().optional(),
  })).optional(),
  images: z.object({
    portrait: z.string(),
    hero: z.string(),
    altText: z.string(),
    animated: z.string().optional(),
  }),
  connections: z.array(z.object({
    character: z.string(),
    characterSlug: z.string(),
    relationship: z.string(),
  })).optional(),
});

export type CharacterMarkdownData = z.infer<typeof CharacterMarkdownSchema>;

/**
 * Class for handling character markdown files
 */
export class CharacterMarkdown extends Markdown {
  /**
   * Validate the character data against the schema
   */
  protected validateData(): void {

      // Handle modifications field - convert string to array or empty array if none
      if (this.data.modifications) {
        if (typeof this.data.modifications === 'string') {
          // If it's a string, convert it to an array with that string as the only item
          this.data.modifications = [this.data.modifications];
        }
      } else {
        // If no modifications, set to empty array
        this.data.modifications = [];
      }

      // Handle occupation field - ensure all items are strings
      if (this.data.occupation && Array.isArray(this.data.occupation)) {
        this.data.occupation = this.data.occupation.map(item => {
          // Convert any non-string items to strings
          return typeof item === 'string' ? item : String(item);
        });
      }

      // Handle aliases field - ensure all items are strings
      if (this.data.aliases && Array.isArray(this.data.aliases)) {
        this.data.aliases = this.data.aliases.map(item => {
          // Convert any non-string items to strings
          return typeof item === 'string' ? item : String(item);
        });
      }

      // Handle physicalDescription field - ensure all items are strings
      if (this.data.physicalDescription && Array.isArray(this.data.physicalDescription)) {
        this.data.physicalDescription = this.data.physicalDescription.map(item => {
          // Convert any non-string items to strings
          return typeof item === 'string' ? item : String(item);
        });
      }

      // Ensure archetype exists and has required properties
      if (!this.data.archetype) {
        // Provide a default archetype
        this.data.archetype = {
          type: "Unknown",
          description: "Character archetype not specified"
        };
      } else if (!this.data.archetype.type || !this.data.archetype.description) {
        // If archetype exists but is missing required properties
        this.data.archetype.type = this.data.archetype.type || "Unknown";
        this.data.archetype.description = this.data.archetype.description || "Character archetype description not specified";
      }



      CharacterMarkdownSchema.parse(this.data);

  }

  /**
   * Get the full name of the character
   */
  public getFullName(): string {
    return this.data.fullName || this.data.title;
  }

  /**
   * Get the gender of the character
   */
  public getGender(): string | undefined {
    return this.data.gender;
  }

  /**
   * Get the age of the character
   */
  public getAge(): string | number | undefined {
    return this.data.age;
  }

  /**
   * Get the aliases of the character
   */
  public getAliases(): string[] {
    return this.data.aliases || [];
  }

  /**
   * Get the occupations of the character
   */
  public getOccupations(): string[] {
    return this.data.occupation || [];
  }

  /**
   * Get the status of the character
   */
  public getStatus(): string | undefined {
    return this.data.status;
  }

  /**
   * Get the archetype of the character
   */
  public getArchetype(): { type: string; description: string } | undefined {
    return this.data.archetype;
  }

  /**
   * Get the physical description of the character
   */
  public getPhysicalDescription(): string[] {
    return this.data.physicalDescription || [];
  }

  /**
   * Get the species of the character
   */
  public getSpecies(): string | undefined {
    return this.data.species;
  }

  /**
   * Get the modifications of the character
   */
  public getModifications(): string[] {
    return this.data.modifications || [];
  }

  /**
   * Get the first appearance of the character
   */
  public getFirstAppearance(): string | undefined {
    return this.data.firstAppearance;
  }

  /**
   * Get the period of the character
   */
  public getPeriod(): string | undefined {
    return this.data.period;
  }

  /**
   * Get the affiliations of the character
   */
  public getAffiliations(): string[] {
    return this.data.affiliations || [];
  }

  /**
   * Get the subversions of the character
   */
  public getSubversions(): string[] {
    return this.data.subversion || [];
  }

  /**
   * Get the corporate role of the character
   */
  public getCorporateRole(): string | undefined {
    return this.data.corporateRole;
  }

  /**
   * Get the arc of the character
   */
  public getArc(): string | undefined {
    return this.data.arc;
  }

  /**
   * Get the quotes of the character
   */
  public getQuotes(): Array<{ quote: string; context?: string }> {
    return this.data.quotes || [];
  }

  /**
   * Get the portrait image URL
   */
  public getPortraitImage(): string {
    return this.data.images.portrait;
  }

  /**
   * Get the hero image URL
   */
  public getHeroImage(): string {
    return this.data.images.hero;
  }

  /**
   * Override: Get the main image URL (uses hero for characters)
   */
  public override getMainImage(): string {
    return this.data.images.hero;
  }

  /**
   * Override: Get the detailed image URL (uses portrait for characters)
   */
  public override getDetailedImage(): string {
    return this.data.images.portrait;
  }

  // No need to override getVideo() as it's identical to the base implementation

  /**
   * Get the connections (character relationships before standardization)
   */
  public getConnections(): Array<{ character: string; characterSlug: string; relationship: string }> {
    return this.data.connections || [];
  }

  /**
   * Static method to get all character markdown files
   */
  public static getAllCharacters(): CharacterMarkdown[] {
    const filePaths = Markdown.getAllFilePaths('characters');
    return filePaths.map(filePath => new CharacterMarkdown(filePath));
  }

  /**
   * Static method to get a character by slug
   */
  public static getCharacterBySlug(slug: string): CharacterMarkdown | undefined {
    const filePaths = Markdown.getAllFilePaths('characters');
    const characterPath = filePaths.find(filePath => {
      const fileName = path.basename(filePath, '.md');
      return fileName === slug;
    });

    return characterPath ? new CharacterMarkdown(characterPath) : undefined;
  }

  /**
   * Static method to get a character by slug with fuzzy matching
   */
  public static getCharacterBySlugFuzzy(slug: string): CharacterMarkdown | undefined {
    const result = Markdown.findFileWithFuzzyMatching('characters', slug);
    if (!result) {
      return undefined;
    }
    return new CharacterMarkdown(result.filePath);
  }

  /**
   * Convert to CharacterData format for use in the UI
   */
  public async toCharacterData(): Promise<CharacterData> {
    // Convert markdown content to HTML
    const contentHtml = await this.markdownToHtml();

    // Create the character data object
    const characterData: CharacterData = {
      id: this.getSlug(),
      slug: this.getSlug(),
      title: this.getTitle(),
      fullName: this.getFullName(),
      gender: this.getGender(),
      age: this.getAge() as string,
      aliases: this.getAliases(),
      occupation: this.getOccupations(),
      status: this.getStatus(),
      archetype: this.getArchetype(),
      physicalDescription: this.getPhysicalDescription(),
      species: this.getSpecies(),
      modifications: this.getModifications(),
      firstAppearance: this.getFirstAppearance(),
      period: this.getPeriod(),
      storyAppearances: this.getStoryAppearances(),
      affiliations: this.getAffiliations(),
      connections: this.getConnections(),
      subversion: this.getSubversions(),
      corporateRole: this.getCorporateRole(),
      arc: this.getArc(),
      quotes: this.getQuotes(),
      relatedTechnologies: this.getRelatedTechnologies(),
      relatedThemes: this.getRelatedThemes(),
      relatedLocations: this.getRelatedLocations(),
      images: {
        portrait: this.getPortraitImage(),
        hero: this.getHeroImage(),
        detailed: this.getDetailedImage(),
        altText: this.getAltText(),
        animated: this.getVideo()
      },
      animated: this.getVideo(),
      content: this.getContent(),
      contentHtml
    };

    return this.makeSerializable(characterData) as CharacterData;
  }

  /**
   * Static method to get all character slugs
   * This is used for generating static paths
   */
  public static async getAllCharacterSlugs(): Promise<string[]> {
    const filePaths = Markdown.getAllFilePaths('characters');
    return filePaths.map(filePath => path.basename(filePath, '.md'));
  }

  /**
   * Static method to get character data by slug
   * This is a replacement for the getCharacterData function in mdx.ts
   */
  public static async getCharacterData(slug: string): Promise<CharacterData> {
    // Try to get the character with fuzzy matching
    const character = CharacterMarkdown.getCharacterBySlugFuzzy(slug);

    if (!character) {
      // No matching file found, return minimal data with the search ID
      return {
        id: slug,
        slug: slug,
        title: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      };
    }

    // Convert to character data
    return character.toCharacterData();
  }
}
