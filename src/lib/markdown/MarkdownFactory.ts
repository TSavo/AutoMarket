import path from 'path';
import fs from 'fs';
import matter from 'gray-matter';
import { Markdown } from './Markdown';
import { CharacterMarkdown } from './CharacterMarkdown';
import { LocationMarkdown } from './LocationMarkdown';
import { TechnologyMarkdown } from './TechnologyMarkdown';
import { ThemeMarkdown } from './ThemeMarkdown';
import { StoryMarkdown } from './StoryMarkdown';
import { ChapterMarkdown } from './ChapterMarkdown';
import { SeriesMarkdown } from './SeriesMarkdown';
import { OutreachMarkdown } from './OutreachMarkdown';
import { BlogMarkdown } from './BlogMarkdown';
import { BadgeType } from '../../../utils/access-badges';

/**
 * Interface for slug information
 */
export interface SlugInfo {
  slug: string;
  title: string;
  type: ContentType;
}

/**
 * Content types supported by the factory
 */
export type ContentType = 'character' | 'location' | 'technology' | 'theme' | 'story' | 'chapter' | 'series' | 'outreach' | 'blog';

/**
 * Factory for creating markdown instances
 */
export class MarkdownFactory {
  /**
   * Create a markdown instance based on content type and slug
   * @param type The content type
   * @param slug The slug to match
   * @param options Additional options (series for stories)
   * @returns A markdown instance or undefined if not found
   */
  public static create<T extends Markdown = Markdown>(
    type: ContentType,
    slug: string,
    options?: { series?: string, storySlug?: string }
  ): T | undefined {
    switch (type) {
      case 'character':
        return this.createCharacter(slug) as unknown as T;
      case 'location':
        return this.createLocation(slug) as unknown as T;
      case 'technology':
        return this.createTechnology(slug) as unknown as T;
      case 'theme':
        return this.createTheme(slug) as unknown as T;
      case 'series':
        return this.createSeries(slug) as unknown as T;
      case 'story':
        return this.createStory(slug, options?.series) as unknown as T;
      case 'chapter':
        return this.createChapter(slug, options?.storySlug, options?.series) as unknown as T;
      case 'outreach':
        return this.createOutreach(slug) as unknown as T;
      case 'blog':
        return this.createBlog(slug) as unknown as T;
      default:
        return undefined;
    }
  }

  /**
   * Type-safe create methods for specific content types
   */
  public static createCharacterMarkdown(slug: string): CharacterMarkdown | undefined {
    return this.createCharacter(slug);
  }

  public static createLocationMarkdown(slug: string): LocationMarkdown | undefined {
    return this.createLocation(slug);
  }

  public static createTechnologyMarkdown(slug: string): TechnologyMarkdown | undefined {
    return this.createTechnology(slug);
  }

  public static createThemeMarkdown(slug: string): ThemeMarkdown | undefined {
    return this.createTheme(slug);
  }

  public static createStoryMarkdown(slug: string, series?: string): StoryMarkdown | undefined {
    return this.createStory(slug, series);
  }

  public static createChapterMarkdown(chapterSlug: string, storySlug: string, series?: string): ChapterMarkdown | undefined {
    return this.createChapter(chapterSlug, storySlug, series);
  }

  public static createSeriesMarkdown(slug: string): SeriesMarkdown | undefined {
    return this.createSeries(slug);
  }

  public static createOutreachMarkdown(slug: string): OutreachMarkdown | undefined {
    return this.createOutreach(slug);
  }

  /**
   * Create a blog markdown instance
   * @param slug The blog post slug
   * @returns A blog post markdown instance or undefined if not found
   */
  public static createBlogMarkdown(slug: string): BlogMarkdown | undefined {
    return this.createBlog(slug);
  }

  /**
   * Get all markdown instances of a specific type
   * @param type The content type
   * @param options Additional options (series for stories)
   * @returns An array of markdown instances
   */
  public static getAll<T extends Markdown = Markdown>(
    type: ContentType,
    options?: { series?: string, storySlug?: string }
  ): T[] {
    switch (type) {
      case 'character':
        return CharacterMarkdown.getAllCharacters() as unknown as T[];
      case 'location':
        return LocationMarkdown.getAllLocations() as unknown as T[];
      case 'technology':
        return TechnologyMarkdown.getAllTechnologies() as unknown as T[];
      case 'theme':
        return ThemeMarkdown.getAllThemes() as unknown as T[];
      case 'series':
        return SeriesMarkdown.getAllSeries() as unknown as T[];
      case 'outreach':
        return OutreachMarkdown.getAllOutreachMaterials() as unknown as T[];
      case 'story': {
        const stories = StoryMarkdown.getAllStories();
        if (options?.series) {
          return stories.filter(story =>
            (story as StoryMarkdown).getSeries() === options.series
          ) as unknown as T[];
        }
        return stories as unknown as T[];
      }
      case 'chapter': {
        if (!options?.storySlug) {
          return [] as unknown as T[];
        }
        const story = this.createStory(options.storySlug, options.series);
        if (!story) {
          return [] as unknown as T[];
        }
        return story.getAllChapters() as unknown as T[];
      }
      case 'blog': {
        return BlogMarkdown.getInstance().getBlogPosts() as unknown as T[];
      }
      default:
        return [];
    }
  }

  /**
   * Type-safe getAll methods for specific content types
   */
  public static getAllCharacterMarkdowns(): CharacterMarkdown[] {
    return CharacterMarkdown.getAllCharacters();
  }

  public static getAllLocationMarkdowns(): LocationMarkdown[] {
    return LocationMarkdown.getAllLocations();
  }

  public static getAllTechnologyMarkdowns(): TechnologyMarkdown[] {
    return TechnologyMarkdown.getAllTechnologies();
  }

  public static getAllThemeMarkdowns(): ThemeMarkdown[] {
    return ThemeMarkdown.getAllThemes();
  }

  public static getAllStoryMarkdowns(series?: string): StoryMarkdown[] {
    const stories = StoryMarkdown.getAllStories();
    if (series) {
      return stories.filter(story => story.getSeries() === series);
    }
    return stories;
  }

  public static getAllChapterMarkdowns(storySlug: string, series?: string): ChapterMarkdown[] {
    const story = this.createStory(storySlug, series);
    if (!story) {
      return [];
    }
    return story.getAllChapters();
  }

  public static getAllSeriesMarkdowns(): SeriesMarkdown[] {
    return SeriesMarkdown.getAllSeries();
  }

  public static getAllOutreachMarkdowns(): OutreachMarkdown[] {
    return OutreachMarkdown.getAllOutreachMaterials();
  }

  public static getAllBlogMarkdowns(): BlogMarkdown[] {
    // Return array with single BlogMarkdown instance to match naming convention with other methods
    return [BlogMarkdown.getInstance()];
  }

  /**
   * Create a character markdown instance
   * @param slug The character slug
   * @returns A character markdown instance or undefined if not found
   */
  private static createCharacter(slug: string): CharacterMarkdown | undefined {
    // Use the new fuzzy matching method from CharacterMarkdown
    return CharacterMarkdown.getCharacterBySlugFuzzy(slug);
  }

  /**
   * Create a location markdown instance
   * @param slug The location slug
   * @returns A location markdown instance or undefined if not found
   */
  private static createLocation(slug: string): LocationMarkdown | undefined {
    // Use the new fuzzy matching method from LocationMarkdown
    return LocationMarkdown.getLocationBySlugFuzzy(slug);
  }

  /**
   * Create a technology markdown instance
   * @param slug The technology slug
   * @returns A technology markdown instance or undefined if not found
   */
  private static createTechnology(slug: string): TechnologyMarkdown | undefined {
    // Use the new fuzzy matching method from TechnologyMarkdown
    return TechnologyMarkdown.getTechnologyBySlugFuzzy(slug);
  }

  /**
   * Create a theme markdown instance
   * @param slug The theme slug
   * @returns A theme markdown instance or undefined if not found
   */
  private static createTheme(slug: string): ThemeMarkdown | undefined {
    // Use the new fuzzy matching method from ThemeMarkdown
    return ThemeMarkdown.getThemeBySlugFuzzy(slug);
  }

  /**
   * Create a series markdown instance
   * @param slug The series slug
   * @returns A series markdown instance or undefined if not found
   */
  private static createSeries(slug: string): SeriesMarkdown | undefined {
    return SeriesMarkdown.getSeriesBySlug(slug);
  }

  /**
   * Create a story markdown instance
   * @param slug The story slug
   * @param series Optional series to filter by
   * @returns A story markdown instance or undefined if not found
   */
  private static createStory(slug: string, series?: string): StoryMarkdown | undefined {
    return StoryMarkdown.getStoryBySlug(slug, series);
  }

  /**
   * Create a chapter markdown instance
   * @param chapterSlug The chapter filename
   * @param storySlug The story slug
   * @param series Optional series to filter by
   * @returns A chapter markdown instance or undefined if not found
   */
  private static createChapter(chapterSlug: string, storySlug?: string, series?: string): ChapterMarkdown | undefined {
    if (!storySlug) {
      return undefined;
    }

    const story = this.createStory(storySlug, series);
    if (!story) {
      return undefined;
    }

    return story.getChapter(chapterSlug);
  }

  /**
   * Create an outreach markdown instance
   * @param slug The outreach slug
   * @returns An outreach markdown instance or undefined if not found
   */
  private static createOutreach(slug: string): OutreachMarkdown | undefined {
    return OutreachMarkdown.getOutreachMaterialBySlug(slug);
  }

  /**
   * Create a blog post instance
   * @param slug The blog post slug
   * @returns A blog post instance or undefined if not found
   */
  private static createBlog(slug: string): BlogMarkdown | undefined {
    const blogData = BlogMarkdown.getInstance().getBlogPostBySlug(slug);
    return blogData ? BlogMarkdown.getInstance() as unknown as BlogMarkdown : undefined;
  }

  /**
   * Get all slugs for a specific content type
   * @param type The content type
   * @param options Additional options (series for stories)
   * @returns An array of slug information
   */
  public static getAllSlugs(
    type: ContentType,
    options?: { series?: string, storySlug?: string }
  ): SlugInfo[] {
    switch (type) {
      case 'character':
        return this.getAllCharacterSlugs();
      case 'location':
        return this.getAllLocationSlugs();
      case 'technology':
        return this.getAllTechnologySlugs();
      case 'theme':
        return this.getAllThemeSlugs();
      case 'series':
        return this.getAllSeriesSlugs();
      case 'outreach':
        return this.getAllOutreachSlugs();
      case 'story':
        return this.getAllStorySlugs(options?.series);
      case 'chapter':
        return this.getAllChapterSlugs(options?.storySlug, options?.series);
      case 'blog':
        return this.getAllBlogSlugs();
      default:
        return [];
    }
  }

  /**
   * Get all slugs for all content types
   * @returns An array of slug information
   */
  public static getAllContentSlugs(): SlugInfo[] {
    return [
      ...this.getAllCharacterSlugs(),
      ...this.getAllLocationSlugs(),
      ...this.getAllTechnologySlugs(),
      ...this.getAllThemeSlugs(),
      ...this.getAllSeriesSlugs(),
      ...this.getAllStorySlugs(),
      ...this.getAllOutreachSlugs(),
      ...this.getAllBlogSlugs()
      // Note: Chapters are not included here as they are accessed through stories
    ];
  }

  /**
   * Get all character slugs
   * @returns An array of character slug information
   */
  private static getAllCharacterSlugs(): SlugInfo[] {
    return this.getSlugsFromDirectory('characters', 'character');
  }

  /**
   * Get all location slugs
   * @returns An array of location slug information
   */
  private static getAllLocationSlugs(): SlugInfo[] {
    return this.getSlugsFromDirectory('locations', 'location');
  }

  /**
   * Get all technology slugs
   * @returns An array of technology slug information
   */
  private static getAllTechnologySlugs(): SlugInfo[] {
    return this.getSlugsFromDirectory('technologies', 'technology');
  }

  /**
   * Get all blog post slugs
   * @returns An array of blog post slug information
   */
  private static getAllBlogSlugs(): SlugInfo[] {
    const blogPosts = BlogMarkdown.getInstance().getBlogPosts();
    
    return blogPosts.map(post => ({
      slug: post.slug,
      title: post.title,
      type: 'blog'
    }));
  }

  /**
   * Get all theme slugs
   * @returns An array of theme slug information
   */
  private static getAllThemeSlugs(): SlugInfo[] {
    return this.getSlugsFromDirectory('themes', 'theme');
  }

  /**
   * Get all outreach slugs
   * @returns An array of outreach slug information
   */
  private static getAllOutreachSlugs(): SlugInfo[] {
    return this.getSlugsFromDirectory('outreach', 'outreach');
  }

  /**
   * Get all series slugs
   * @returns An array of series slug information
   */
  private static getAllSeriesSlugs(): SlugInfo[] {
    const contentDir = 'stories';
    const dir = path.join(process.cwd(), 'content', contentDir);

    if (!fs.existsSync(dir)) {
      return [];
    }

    const seriesDirs = fs.readdirSync(dir).filter(item => {
      const itemPath = path.join(dir, item);
      return fs.statSync(itemPath).isDirectory();
    });

    return seriesDirs.map(seriesDir => {
      const seriesIndexPath = path.join(dir, seriesDir, 'index.md');
      let title = seriesDir.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      // Try to get the title from the index file
      if (fs.existsSync(seriesIndexPath)) {
        try {
          const fileContents = fs.readFileSync(seriesIndexPath, 'utf8');
          const { data } = matter(fileContents);

          if (data.title) {
            title = data.title;
          }
        } catch {
         
        }
      }

      return {
        slug: seriesDir,
        title,
        type: 'series'
      };
    });
  }

  /**
   * Get all story slugs
   * @param series Optional series to filter by
   * @returns An array of story slug information
   */
  private static getAllStorySlugs(series?: string): SlugInfo[] {
    const contentDir = 'stories';
    const dir = path.join(process.cwd(), 'content', contentDir);

    if (!fs.existsSync(dir)) {
      return [];
    }

    // If series is provided, only get stories from that series
    if (series) {
      const seriesDir = path.join(dir, series);

      if (!fs.existsSync(seriesDir)) {
        return [];
      }

      return this.getSlugsFromDirectory(`${contentDir}/${series}`, 'story');
    }

    // Otherwise, get stories from all series
    const seriesDirs = fs.readdirSync(dir).filter(item => {
      const itemPath = path.join(dir, item);
      return fs.statSync(itemPath).isDirectory();
    });

    return seriesDirs.flatMap(seriesDir =>
      this.getSlugsFromDirectory(`${contentDir}/${seriesDir}`, 'story')
    );
  }

  /**
   * Get all chapter slugs for a story
   * @param storySlug The story slug
   * @param series Optional series to filter by
   * @returns An array of chapter slug information
   */
  private static getAllChapterSlugs(storySlug?: string, series?: string): SlugInfo[] {
    if (!storySlug) {
      return [];
    }

    const story = this.createStory(storySlug, series);
    if (!story) {
      return [];
    }

    const chapterPaths = story.getChapterPaths();
    return chapterPaths.map(chapterPath => {
      try {
        const chapter = new ChapterMarkdown(chapterPath);
        return {
          slug: path.basename(chapterPath, '.md'),
          title: chapter.getChapterTitle(),
          type: 'chapter'
        };
      } catch {
       
        return {
          slug: path.basename(chapterPath, '.md'),
          title: path.basename(chapterPath, '.md').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          type: 'chapter'
        };
      }
    });
  }

  /**
   * Get slugs from a directory
   * @param contentDir The content directory
   * @param type The content type
   * @returns An array of slug information
   */
  private static getSlugsFromDirectory(contentDir: string, type: ContentType): SlugInfo[] {
    const dir = path.join(process.cwd(), 'content', contentDir);

    if (!fs.existsSync(dir)) {
      return [];
    }

    const files = fs.readdirSync(dir).filter(file =>
      file.endsWith('.md') && file !== 'index.md' && file !== 'README.md'
    );

    return files.map(file => {
      const slug = path.basename(file, '.md');

      // Try to get the title from the file
      let title = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      try {
        const filePath = path.join(dir, file);
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(fileContents);

        if (data.title) {
          title = data.title;
        }
      } catch {
       
      }

      return {
        slug,
        title,
        type
      };
    });
  }



  /**
   * Extract metadata for restricted rendering
   * This provides a subset of metadata that can be shown even when content is restricted
   * @param content The content instance
   * @param type The content type
   * @returns Metadata for restricted rendering
   */
  public static extractRestrictedMetadata(content: Markdown, type: ContentType): Record<string, any> {
    // Common metadata for all content types
    const metadata: Record<string, any> = {
      title: content.getTitle(),
      slug: content.getSlug(),
      description: content.getDescription(),
      mainImage: content.getMainImage(),
      type
    };

    // Add content-specific metadata
    switch (type) {
      case 'character':
        // For characters, add portrait image and basic info
        const character = content as CharacterMarkdown;
        metadata.portraitImage = character.getPortraitImage();
        metadata.fullName = character.getFullName();
        if (character.getGender()) metadata.gender = character.getGender();
        if (character.getOccupations().length > 0) metadata.occupation = character.getOccupations();
        break;

      case 'location':
        // For locations, add level and district
        const location = content as LocationMarkdown;
        metadata.level = location.getLevel();
        if (location.getDistrict()) metadata.district = location.getDistrict();
        break;

      case 'technology':
        // For technologies, add category
        const technology = content as TechnologyMarkdown;
        metadata.category = technology.getCategory();
        break;

      case 'theme':
        // For themes, add category
        const theme = content as ThemeMarkdown;
        metadata.category = theme.getCategory();
        break;

      case 'series':
        // For series, add book number and author
        const series = content as SeriesMarkdown;
        if (series.getBookNumber()) metadata.book = series.getBookNumber();
        if (series.getAuthor()) metadata.author = series.getAuthor();
        break;

      case 'story':
        // For stories, add series and number
        const story = content as StoryMarkdown;
        metadata.series = story.getSeries();
        if (story.getNumber()) metadata.number = story.getNumber();
        break;

      case 'outreach':
        // For outreach materials, add category and type
        const outreach = content as OutreachMarkdown;
        if (outreach.getCategory()) metadata.category = outreach.getCategory();
        if (outreach.getType()) metadata.type = outreach.getType();
        if (outreach.getSubtitle()) metadata.subtitle = outreach.getSubtitle();
        metadata.accentColor = outreach.getAccentColor();
        metadata.primaryColor = outreach.getPrimaryColor();
        break;
    }

    return metadata;
  }

  /**
   * Map content type to badge type
   * @param type The content type
   * @returns The corresponding badge type
   */
  public static getBadgeTypeFromContentType(type: ContentType): BadgeType {
    switch (type) {
      case 'character':
        return BadgeType.CHARACTER;
      case 'location':
        return BadgeType.LOCATION;
      case 'technology':
        return BadgeType.TECHNOLOGY;
      case 'theme':
        return BadgeType.THEME;
      case 'series':
        return BadgeType.SERIES;
      case 'story':
        return BadgeType.STORY;
      case 'chapter':
        return BadgeType.STORY; // Chapters use the same badge type as stories
      case 'outreach':
        return BadgeType.THEME; // Outreach materials don't have a specific badge type, use THEME as a fallback
      case 'blog':
        return BadgeType.THEME; // Blog posts don't have a specific badge type, use THEME as a fallback
      default:
        throw new Error(`Unknown content type: ${type}`);
    }
  }

  /**
   * Find a markdown file by slug with fuzzy matching
   * @param contentDir The content directory
   * @param slug The slug to match
   * @param factory A function to create the markdown instance
   * @returns A markdown instance or undefined if not found
   */
  private static findBySlug<T extends Markdown>(
    contentDir: string,
    slug: string,
    factory: (filePath: string) => T
  ): T | undefined {
    const dir = path.join(process.cwd(), 'content', contentDir);

    if (!fs.existsSync(dir)) {
      return undefined;
    }

    const files = fs.readdirSync(dir).filter(file => file.endsWith('.md'));

    // Try exact match first
    let matchedFile = files.find(file => path.basename(file, '.md') === slug);

    // If no exact match, try fuzzy matching
    if (!matchedFile) {
      matchedFile = files.find(file => {
        const fileName = path.basename(file, '.md');
        // Remove any leading numbers and hyphens for fuzzy matching
        const normalizedFileName = fileName.replace(/^\d+-/, '');
        return normalizedFileName === slug;
      });
    }

    if (!matchedFile) {
      return undefined;
    }

    return factory(path.join(dir, matchedFile));
  }
}
