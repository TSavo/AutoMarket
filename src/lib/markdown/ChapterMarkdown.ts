import { Markdown } from './Markdown';
import { StoryMarkdown } from './StoryMarkdown';
import path from 'path';

// Define the ChapterData interface
export interface ChapterData {
  id: string;
  slug: string;
  title: string;
  chapterNumber: string;
  storyTitle?: string;
  series?: string;
  author?: string;
  part?: string;
  description?: string;
  content?: string;
  contentHtml?: string;
}

/**
 * Class for handling chapter markdown files
 * This class directly exposes whatever is in the chapter file
 */
export class ChapterMarkdown extends Markdown {
  /**
   * No schema validation - just accept whatever is in the file
   */
  protected validateData(): void {
    // No validation needed
  }

  /**
   * Get the chapter number
   */
  public getChapterNumber(): string {
    return this.data.chapter || '';
  }

  /**
   * Get the chapter title
   */
  public getChapterTitle(): string {
    return this.data.chapter_title || '';
  }

  /**
   * Get the story title
   */
  public getStoryTitle(): string {
    return this.data.story_title || '';
  }

  /**
   * Get the series
   */
  public getSeries(): string {
    return this.data.series || '';
  }

  /**
   * Get the author
   */
  public getAuthor(): string | undefined {
    return this.data.author;
  }

  /**
   * Get the part information
   */
  public getPart(): string | undefined {
    return this.data.part;
  }

  /**
   * Get the title of the chapter
   * Alias for getChapterTitle for consistency with Markdown interface
   */
  public getTitle(): string {
    return this.getChapterTitle();
  }

  /**
   * Get the slug of the chapter
   * For chapters, we derive the slug from the filename
   */
  public getSlug(): string {
    return path.basename(this.filePath, '.md');
  }

  /**
   * Get the description of the chapter
   * For chapters, we use the first paragraph of the content as the description
   */
  public getDescription(): string {
    const firstParagraph = this.content.trim().split('\n\n')[0];
    return firstParagraph || this.getTitle();
  }

  /**
   * Convert to ChapterData format for use in the UI
   */
  public async toChapterData(): Promise<ChapterData> {
    // Convert markdown content to HTML
    const contentHtml = await this.markdownToHtml();

    // Create the chapter data object
    const chapterData: ChapterData = {
      id: this.getSlug(),
      slug: this.getSlug(),
      title: this.getChapterTitle(),
      chapterNumber: this.getChapterNumber(),
      storyTitle: this.getStoryTitle(),
      series: this.getSeries(),
      author: this.getAuthor(),
      part: this.getPart(),
      description: this.getDescription(),
      content: this.getContent(),
      contentHtml
    };

    return this.makeSerializable(chapterData) as ChapterData;
  }

  /**
   * Static method to get chapter data by slug
   */
  public static async getChapterData(chapterSlug: string, storySlug: string, series?: string): Promise<ChapterData> {
    // Try to get the story first
    const story = StoryMarkdown.getStoryBySlug(storySlug, series);

    if (!story) {
      // No matching story found, return minimal data
      return {
        id: chapterSlug,
        slug: chapterSlug,
        title: chapterSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        chapterNumber: '1'
      };
    }

    // Try to get the chapter from the story
    const chapter = story.getChapter(`${chapterSlug}.md`);

    if (!chapter) {
      // No matching chapter found, return minimal data
      return {
        id: chapterSlug,
        slug: chapterSlug,
        title: chapterSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        chapterNumber: '1',
        storyTitle: story.getTitle(),
        series: story.getSeries()
      };
    }

    // Convert to chapter data
    return chapter.toChapterData();
  }
}
