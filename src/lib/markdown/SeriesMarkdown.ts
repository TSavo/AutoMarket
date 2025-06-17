import path from 'path';
import fs from 'fs';
import { Markdown } from './Markdown';
import { StoryMarkdown } from './StoryMarkdown';

/**
 * Interface for series data
 */
export interface SeriesData {
  id: string;
  slug: string;
  title: string;
  description?: string;
  image?: string;
  images?: {
    hero?: string;
    detailed?: string;
    altText?: string;
    animated?: string;
  };
  book?: string | number;
  author?: string;
  titleFont?: string;
  tocFont?: string;
  headerFont?: string;
  content?: string;
  contentHtml?: string;
}

/**
 * Class for handling series markdown files
 */
export class SeriesMarkdown extends Markdown {
  private seriesDir: string;
  private storyCache: Map<string, StoryMarkdown> = new Map();

  constructor(filePath: string) {
    super(filePath);
    this.seriesDir = path.dirname(filePath);
  }

  /**
   * No schema validation - just accept whatever is in the file
   */
  protected validateData(): void {
    // Make sure we have the minimum required fields
    if (!this.data.title) {
      this.data.title = path.basename(this.seriesDir);
    }
  }

  /**
   * Get the slug of the series
   */
  public getSlug(): string {
    return path.basename(this.seriesDir);
  }

  /**
   * Get the book number of the series
   */
  public getBookNumber(): string | number | undefined {
    return this.data.book;
  }

  /**
   * Get the author of the series
   */
  public getAuthor(): string | undefined {
    return this.data.author;
  }

  /**
   * Get the title font of the series
   */
  public getTitleFont(): string | undefined {
    return this.data.titleFont;
  }

  /**
   * Get the TOC font of the series
   */
  public getTocFont(): string | undefined {
    return this.data.tocFont;
  }

  /**
   * Get the header font of the series
   */
  public getHeaderFont(): string | undefined {
    return this.data.headerFont;
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
   * Get the video URL if available
   */
  public getVideo(): string | undefined {
    return this.data.images?.animated || this.data.animated;
  }

  /**
   * Get all stories in this series
   */
  public getAllStories(): StoryMarkdown[] {
    const storyDirs = fs.readdirSync(this.seriesDir).filter(item => {
      const itemPath = path.join(this.seriesDir, item);
      return fs.statSync(itemPath).isDirectory();
    });

    return storyDirs.map(storyDir => {
      const storyIndexPath = path.join(this.seriesDir, storyDir, 'index.md');
      
      // Check if the story index file exists
      if (fs.existsSync(storyIndexPath)) {
        // Check if we have this story in the cache
        if (this.storyCache.has(storyDir)) {
          return this.storyCache.get(storyDir)!;
        }
        
        // Create a new story instance
        const story = new StoryMarkdown(storyIndexPath);
        this.storyCache.set(storyDir, story);
        return story;
      }
      
      return null;
    }).filter(Boolean) as StoryMarkdown[];
  }

  /**
   * Convert to SeriesData format for use in the UI
   */
  public async toSeriesData(): Promise<SeriesData> {
    // Convert markdown content to HTML
    const contentHtml = await this.markdownToHtml();

    // Create the series data object
    const seriesData: SeriesData = {
      id: this.getSlug(),
      slug: this.getSlug(),
      title: this.getTitle(),
      description: this.getDescription(),
      book: this.getBookNumber(),
      author: this.getAuthor(),
      titleFont: this.getTitleFont(),
      tocFont: this.getTocFont(),
      headerFont: this.getHeaderFont(),
      image: this.getMainImage(),
      images: {
        hero: this.data.images?.hero || this.data.image || '',
        detailed: this.data.images?.detailed || this.data.image || '',
        altText: this.data.images?.altText || this.data.altText || this.getTitle(),
        animated: this.data.images?.animated || this.data.animated
      },
      content: this.getContent(),
      contentHtml
    };

    return this.makeSerializable(seriesData) as SeriesData;
  }

  /**
   * Static method to get all series
   */
  public static getAllSeries(): SeriesMarkdown[] {
    const contentDir = path.join(process.cwd(), 'content', 'stories');
    
    if (!fs.existsSync(contentDir)) {
      return [];
    }
    
    const seriesDirs = fs.readdirSync(contentDir).filter(item => {
      const itemPath = path.join(contentDir, item);
      return fs.statSync(itemPath).isDirectory();
    });
    
    return seriesDirs.map(seriesDir => {
      const seriesIndexPath = path.join(contentDir, seriesDir, 'index.md');
      
      // Check if the series index file exists
      if (fs.existsSync(seriesIndexPath)) {
        return new SeriesMarkdown(seriesIndexPath);
      }
      
      return null;
    }).filter(Boolean) as SeriesMarkdown[];
  }

  /**
   * Static method to get a series by slug
   */
  public static getSeriesBySlug(slug: string): SeriesMarkdown | undefined {
    const seriesDir = path.join(process.cwd(), 'content', 'stories', slug);
    const seriesIndexPath = path.join(seriesDir, 'index.md');
    
    if (fs.existsSync(seriesIndexPath)) {
      return new SeriesMarkdown(seriesIndexPath);
    }
    
    return undefined;
  }

  /**
   * Static method to get series data by slug
   */
  public static async getSeriesData(slug: string): Promise<SeriesData> {
    const series = SeriesMarkdown.getSeriesBySlug(slug);
    
    if (!series) {
      // No matching file found, return minimal data with the search ID
      return {
        id: slug,
        slug: slug,
        title: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      };
    }
    
    // Convert to series data
    return series.toSeriesData();
  }
}
