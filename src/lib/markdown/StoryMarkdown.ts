import { Markdown } from './Markdown';
import { ChapterMarkdown } from './ChapterMarkdown';
import path from 'path';
import fs from 'fs';

// Define the StoryData interface
export interface StoryData {
  id: string;
  slug: string;
  title: string;
  description?: string;
  series: string;
  author?: string;
  part?: string;
  characterBadges?: string[];
  locationBadges?: string[];
  technologyBadges?: string[];
  themeBadges?: string[];
  storyBadges?: string[];
  seriesBadges?: string[];
  image?: string; // Kept for backward compatibility
  images?: {
    hero?: string;
    detailed?: string;
    altText?: string;
    detailedAltText?: string;
    animated?: string;
    animatePrompt?: string;
  };
  colorScheme?: {
    accent?: string;
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
  };
  content?: string;
  contentHtml?: string;
  chapters?: any[];
  comingSoon?: boolean; // Add this line
}

/**
 * Class for handling story markdown files
 * This class directly exposes whatever is in the index.md file
 */
export class StoryMarkdown extends Markdown {
  private storyDir: string;
  private chapterCache: Map<string, ChapterMarkdown> = new Map();

  constructor(filePath: string) {
    super(filePath);
    this.storyDir = path.dirname(filePath);
  }

  /**
   * No schema validation - just accept whatever is in the file
   */
  protected validateData(): void {
    // Make sure we have the minimum required fields
    if (!this.data.title) {
      this.data.title = path.basename(path.dirname(this.filePath));
    }

    if (!this.data.series) {
      // Try to extract series from directory structure
      const seriesDir = path.basename(path.dirname(path.dirname(this.filePath)));
      this.data.series = seriesDir;
    }

    // Validate all chapters
    this.validateChapters();
  }

  /**
   * Validate all chapters referenced by this story
   */
  public validateChapters(): boolean {
    // If there are no chapters, return true
    if (!this.data.chapters || !Array.isArray(this.data.chapters) || this.data.chapters.length === 0) {
      return true;
    }

    // Validate that the chapters array contains valid filenames
    for (const chapterFile of this.data.chapters) {
      if (typeof chapterFile !== 'string') {
        return false;
      }
    }

    // We don't validate that the chapter files exist on disk
    // This allows us to work with content that might be incomplete
    // The getAllChapters method will handle missing files gracefully

    return true;
  }

  /**
   * Get the title of the story
   */
  public getTitle(): string {
    return this.data.title || '';
  }

  /**
   * Get the series of the story
   */
  public getSeries(): string {
    return this.data.series || '';
  }

  /**
   * Get the number of the story in the series
   * For stories, we extract the number from the part field or directory name
   */
  public getNumber(): number | undefined {
    // Try to extract number from part field (e.g., "Part 1 of 10 in the Horizon's Hope Series")
    if (this.data.part) {
      const match = this.data.part.match(/Part (\d+)/);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }

    // Fall back to extracting from directory name (e.g., "01-clone")
    const dirName = path.basename(path.dirname(this.filePath));
    const match = dirName.match(/^(\d+)/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }

    return undefined;
  }

  /**
   * Get the slug of the content
   * For stories, we derive the slug from the directory name
   */
  public getSlug(): string {
    return path.basename(path.dirname(this.filePath));
  }

  /**
   * Get the description of the content
   * For stories, we use the first paragraph of the content as the description
   */
  public getDescription(): string {
    const firstParagraph = this.content.trim().split('\n\n')[0];
    return firstParagraph || this.getTitle();
  }

  /**
   * Get the main image URL (hero image)
   */
  public getMainImage(): string {
    return this.data.images?.hero || this.data.image || '';
  }

  /**
   * Get the detailed image URL
   */
  public getDetailedImage(): string {
    return this.data.images?.detailed || this.data.images?.hero || this.data.image || '';
  }

  /**
   * Get the alt text for the hero image
   */
  public getAltText(): string {
    return this.data.images?.altText || this.data.altText || this.getTitle();
  }

  /**
   * Get the alt text for the detailed image
   */
  public getDetailedAltText(): string {
    return this.data.images?.detailedAltText || this.data.images?.altText || this.data.altText || this.getTitle();
  }

  /**
   * Get the animation prompt
   */
  public getAnimatePrompt(): string | undefined {
    return this.data.images?.animatePrompt;
  }

  /**
   * Get the color scheme for the story
   */
  public getColorScheme(): { accent?: string; primary?: string; secondary?: string; background?: string; text?: string; } | undefined {
    return this.data.colorScheme;
  }

  /**
   * Get the accent color for the story
   * Returns the accent color from the color scheme if available, otherwise undefined
   */
  public getAccentColor(): string | undefined {
    return this.data.colorScheme?.accent;
  }

  /**
   * Get the video URL if available
   */
  public getVideo(): string | undefined {
    return this.data.images?.animated || this.data.animated;
  }

  /**
   * Get the author of the story
   */
  public getAuthor(): string | undefined {
    return this.data.author;
  }

  /**
   * Get the date of the story
   */
  public getDate(): string | undefined {
    return this.data.date;
  }

  /**
   * Get the part information of the story
   */
  public getPart(): string | undefined {
    return this.data.part;
  }

  /**
   * Get the character badges of the story
   */
  public getCharacterBadges(): string[] {
    return this.data.characterBadges || [];
  }

  /**
   * Get the location badges of the story
   */
  public getLocationBadges(): string[] {
    return this.data.locationBadges || [];
  }

  /**
   * Get the technology badges of the story
   */
  public getTechnologyBadges(): string[] {
    return this.data.technologyBadges || [];
  }

  /**
   * Get the theme badges of the story
   */
  public getThemeBadges(): string[] {
    return this.data.themeBadges || [];
  }

  /**
   * Get the story badges of the story
   */
  public getStoryBadges(): string[] {
    return this.data.storyBadges || [];
  }

  /**
   * Get the series badges of the story
   */
  public getSeriesBadges(): string[] {
    return this.data.seriesBadges || [];
  }

  /**
   * Get the chapter file paths
   */
  public getChapterPaths(): string[] {
    if (!this.data.chapters) {
      return [];
    }

    return this.data.chapters.map(chapterFile =>
      path.join(this.storyDir, chapterFile)
    );
  }

  /**
   * Get all chapters for this story
   */
  public getAllChapters(): ChapterMarkdown[] {
    const chapterPaths = this.getChapterPaths();
    const chapters: ChapterMarkdown[] = [];

    for (const chapterPath of chapterPaths) {
      // Skip chapters that don't exist
      if (!fs.existsSync(chapterPath)) {
        continue;
      }

      try {
        chapters.push(this.getChapterByPath(chapterPath));
      } catch {
       
        // Continue with other chapters even if one fails
      }
    }

    return chapters;
  }

  /**
   * Get a specific chapter by its filename
   */
  public getChapter(chapterFilename: string): ChapterMarkdown | undefined {
    const chapterPath = path.join(this.storyDir, chapterFilename);
    if (!fs.existsSync(chapterPath)) {
      return undefined;
    }

    try {
      return this.getChapterByPath(chapterPath);
    } catch {
     
      return undefined;
    }
  }

  /**
   * Get a chapter by its index in the chapters array
   */
  public getChapterByIndex(index: number): ChapterMarkdown | undefined {
    const chapterPaths = this.getChapterPaths();
    if (index < 0 || index >= chapterPaths.length) {
      return undefined;
    }

    try {
      return this.getChapterByPath(chapterPaths[index]);
    } catch{
     
      return undefined;
    }
  }

  /**
   * Helper method to get a chapter by path with caching
   */
  private getChapterByPath(chapterPath: string): ChapterMarkdown {
    if (!this.chapterCache.has(chapterPath)) {
      try {
        // Let the ChapterMarkdown class handle its own validation
        const chapter = new ChapterMarkdown(chapterPath);
        this.chapterCache.set(chapterPath, chapter);
      } catch (error) {
       
        throw error;
      }
    }

    return this.chapterCache.get(chapterPath)!;
  }

  /**
   * Static method to get all story markdown files
   */
  public static getAllStories(): StoryMarkdown[] {
    const contentDir = path.join(process.cwd(), 'content', 'stories');
    

    if (!fs.existsSync(contentDir)) {
      return [];
    }

    // Get all series directories
    const seriesDirs = fs.readdirSync(contentDir)
      .filter(item => {
        const itemPath = path.join(contentDir, item);
        return fs.statSync(itemPath).isDirectory() && !item.startsWith('_');
      });

    

    // Get all story directories within each series
    const stories: StoryMarkdown[] = [];

    for (const seriesDir of seriesDirs) {
      const seriesPath = path.join(contentDir, seriesDir);
      

      // Get all items in the series directory
      const allItems = fs.readdirSync(seriesPath);
      

      // Get story directories (e.g., 01-clone) with index.md files
      const storyDirs = allItems
        .filter(item => {
          const itemPath = path.join(seriesPath, item);
          const isDir = fs.statSync(itemPath).isDirectory();

          // Skip non-directories
          if (!isDir) {
            
            return false;
          }

          // Check if it has a number prefix (like 01-clone)
          const hasNumberPrefix = /^\d+-/.test(item);

          // Check if it has an index.md file
          const indexPath = path.join(itemPath, 'index.md');
          const hasIndexFile = fs.existsSync(indexPath);

          

          // Include directories with number prefix and index.md file
          return hasNumberPrefix && hasIndexFile;
        });

      

      // Create StoryMarkdown instances for each story
      for (const storyDir of storyDirs) {
        const storyPath = path.join(seriesPath, storyDir);
        const indexPath = path.join(storyPath, 'index.md');
        

        if (fs.existsSync(indexPath)) {
          try {
            // Create a proper StoryMarkdown instance
            const story = new StoryMarkdown(indexPath);
            
            stories.push(story);
          } catch{
            // Log the error and continue with other stories
           
          }
        }
      }
    }

    
    return stories;
  }

  /**
   * Static method to get stories by series
   */
  public static getStoriesBySeries(series: string): StoryMarkdown[] {
    const stories = this.getAllStories().filter(story => story.getSeries() === series);
    
    return stories;
  }

  /**
   * Static method to get a story by slug with fuzzy matching
   */
  public static getStoryBySlug(slug: string, series?: string): StoryMarkdown | undefined {
    const stories = this.getAllStories();

    // Filter by series if provided
    const filteredStories = series
      ? stories.filter(story => story.getSeries() === series)
      : stories;

    // Try exact match first
    let story = filteredStories.find(story => {
      const storyDir = path.basename(path.dirname(story.getFilePath()));
      return storyDir === slug;
    });

    // If no exact match, try matching with number prefix
    if (!story) {
      // Try to find a story with a number prefix (e.g., "01-clone" for "clone")
      story = filteredStories.find(story => {
        const storyDir = path.basename(path.dirname(story.getFilePath()));
        // Check if the directory name starts with a number and then the slug
        return storyDir.match(new RegExp(`^\\d+-${slug}$`));
      });
    }

    // If still no match, try fuzzy matching by removing number prefix
    if (!story) {
      story = filteredStories.find(story => {
        const storyDir = path.basename(path.dirname(story.getFilePath()));
        // Remove any leading numbers and hyphens for fuzzy matching
        const normalizedDirName = storyDir.replace(/^\d+-/, '');
        return normalizedDirName === slug;
      });
    }



    // Log the result for debugging
    

    return story;
  }

  /**
   * Convert to StoryData format for use in the UI
   */
  public async toStoryData(): Promise<StoryData> {
    // Convert markdown content to HTML
    const contentHtml = await this.markdownToHtml();

    // Create the story data object
    const storyData: StoryData = {
      id: this.getSlug(),
      slug: this.getSlug(),
      title: this.getTitle(),
      description: this.getDescription(),
      series: this.getSeries(),
      author: this.getAuthor(),
      part: this.getPart(),
      characterBadges: this.getCharacterBadges(),
      locationBadges: this.getLocationBadges(),
      technologyBadges: this.getTechnologyBadges(),
      themeBadges: this.getThemeBadges(),
      storyBadges: this.getStoryBadges(),
      seriesBadges: this.getSeriesBadges(),
      // Include both the legacy image field and the new images structure
      image: this.getMainImage(),
      colorScheme: this.getColorScheme(),
      images: {
        hero: this.data.images?.hero || this.data.image || '',
        detailed: this.data.images?.detailed || this.data.image || '',
        altText: this.data.images?.altText || this.data.altText || this.getTitle(),
        detailedAltText: this.data.images?.detailedAltText || this.data.images?.altText || this.data.altText || this.getTitle(),
        animated: this.data.images?.animated || this.data.animated,
        animatePrompt: this.data.images?.animatePrompt
      },
      content: this.getContent(),
      contentHtml,
      comingSoon: this.data.comingSoon, // Add this line
    };

    return this.makeSerializable(storyData) as StoryData;
  }

  /**
   * Static method to get story data by slug
   * This is a replacement for the getStory function in mdx.js
   */
  public static async getStoryData(slug: string, series?: string): Promise<StoryData> {
    // Try to get the story with fuzzy matching
    const story = StoryMarkdown.getStoryBySlug(slug, series);

    if (!story) {
      // No matching file found, return minimal data with the search ID
      return {
        id: slug,
        slug: slug,
        title: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        series: series || '',
        storyBadges: []
      };
    }

    // Convert to story data
    return story.toStoryData();
  }
}
