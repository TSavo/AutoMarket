import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Markdown } from './Markdown';
import { BadgeType } from '../../../utils/access-badges';

// Regular expression for HoverVideoImage syntax
// Format: !hover[alt text](image.png)(video.mp4)(options)
// Options format: {borderColor:"purple.700",growDirection:"up"}
const HOVER_VIDEO_IMAGE_REGEX = /!hover\[(.*?)\]\((.*?)\)(?:\((.*?)\))?(?:\((.*?)\))?/g;

/**
 * Interface for blog post image data
 */
export interface BlogImageData {
  src?: string;       // For the primary static image
  animated?: string;  // Path to the animated video
  altText?: string;   // Alt text for accessibility
}

/**
 * Interface for blog post audio data
 */
export interface BlogAudioData {
  src: string;        // Path to the audio file
  duration: number;   // Duration in seconds
  fileSize: number;   // File size in bytes
  generated: string;  // Timestamp when generated
  provider: string;   // TTS provider used
  voice: string;      // Voice name used
}

/**
 * Interface for blog post data
 */
export interface BlogData {
  slug: string;
  title: string;
  description?: string;
  date: string;
  author: string;
  images?: BlogImageData; // Updated to use BlogImageData
  audio?: BlogAudioData;  // Audio metadata
  tags: string[];
  featured: boolean;
  content: string;
  restrictedTo?: BadgeType[];
  draft?: boolean; // Whether the post is a draft
}

/**
 * Configuration options for filtering blog posts
 */
export interface BlogPostFilterOptions {
  /** Whether to include draft posts (default: false) */
  includeDrafts?: boolean;
  /** Whether to include future posts (default: depends on NODE_ENV) */
  includeFuture?: boolean;
  /** Simulate a specific date (overrides current date) */
  simulatedDate?: Date | string | null;
  /** Filter by tag */
  tag?: string | null;
  /** Maximum number of posts to return */
  limit?: number | null;
  /** Only include featured posts */
  featuredOnly?: boolean;
}

/**
 * Class for handling blog markdown files
 */
export class BlogMarkdown extends Markdown {
  private static instance: BlogMarkdown;
  private blogPosts: Map<string, BlogData> = new Map();
  private blogPostsByTag: Map<string, BlogData[]> = new Map();
  private featuredPosts: BlogData[] = [];

  /**
   * Get the singleton instance
   */
  public static getInstance(): BlogMarkdown {
    if (!BlogMarkdown.instance) {
      // Use index.md as the base file for the BlogMarkdown instance
      const indexPath = path.join(process.cwd(), 'content', 'blog', 'index.md');
      BlogMarkdown.instance = new BlogMarkdown(indexPath);
    }
    return BlogMarkdown.instance;
  }

  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor(filePath: string) {
    super(filePath);
    // Use the directory of the file path for loading blog posts
    this.loadAllBlogPosts();
  }

  /**
   * Validate the markdown data
   */
  protected validateData(): void {
    // No validation needed for blog index, as we're creating individual blog posts separately
  }

  /**
   * Process markdown content to transform custom syntax to MDX components
   * @param content The markdown content to process
   * @returns The processed content with transformed custom syntax
   */
  private processMarkdownContent(content: string): string {
    // Transform !hover[alt text](image.jpg)(video.mp4)(options) to <HoverVideoImage /> component
    return content.replace(
      HOVER_VIDEO_IMAGE_REGEX,
      (_, alt, imageSrc, videoSrc, optionsStr) => {
        let options = {};

        // Parse options if provided
        if (optionsStr) {
          try {
            // Remove the curly braces and parse as JSON
            const cleanOptions = optionsStr.trim().replace(/^{|}$/g, '');
            // Add curly braces back for JSON parsing
            options = JSON.parse(`{${cleanOptions}}`);
          } catch {
            
          }
        }

        // Build the component string with all available props
        let componentStr = `<HoverVideoImage
  imageSrc="${imageSrc}"
  alt="${alt || 'Interactive image'}"`;

        // Add video source if provided
        if (videoSrc) {
          componentStr += `\n  videoSrc="${videoSrc}"`;
        }

        // Add all options as props
        for (const [key, value] of Object.entries(options)) {
          // Handle string values with quotes
          const propValue = typeof value === 'string'
            ? `"${value}"`
            : value;

          componentStr += `\n  ${key}={${propValue}}`;
        }

        // Close the component tag
        componentStr += '\n/>';

        return componentStr;
      }
    );
  }

  /**
   * Load all blog posts from the content directory
   */
  private loadAllBlogPosts(): void {
    const blogDir = path.join(process.cwd(), 'content', 'blog', 'posts');

    if (!fs.existsSync(blogDir)) {
      console.warn('Blog directory does not exist:', blogDir);
      return;
    }

    const files = fs.readdirSync(blogDir);

    for (const file of files) {
      if (file.endsWith('.mdx') || file.endsWith('.md')) {
        const filePath = path.join(blogDir, file);
        const slug = file.replace(/\.mdx?$/, '');
        const fileContent = fs.readFileSync(filePath, 'utf8');

        try {
          const { data, content } = matter(fileContent);

          // Process the markdown content to transform custom syntax
          const processedContent = this.processMarkdownContent(content);

          // Handle images data properly - ensure it's either an array or a single object
          let imagesData;
          if (data.images) {
            if (Array.isArray(data.images)) {
              // If it's already an array, use the first item
              imagesData = data.images[0] || {};
            } else {
              // If it's a single object, use it directly
              imagesData = data.images;
            }
          } else {
            // Default images data
            imagesData = {};
          }

          console.log(`📄 Processing ${file}:`);
          console.log(`  - Title: ${data.title}`);
          console.log(`  - Images src: ${imagesData.src}`);
          console.log(`  - Images animated: ${imagesData.animated}`);
          console.log(`  - Audio data: ${data.audio ? JSON.stringify(data.audio) : 'No audio'}`);

        const blogData: BlogData = {
          slug,
          title: data.title || 'Untitled Blog Post',
          description: data.description || '',
          date: data.date || new Date().toISOString().split('T')[0],
          author: data.author || 'Anonymous',
          images: {
            src: imagesData.src || '/images/blog/default.png',
            animated: imagesData.animated || null, // Use null instead of undefined
            altText: imagesData.altText || data.title || 'Blog post image',
          },
          tags: data.tags || [],
          featured: data.featured || false,
          content: processedContent,
          draft: data.draft || false,
        };

        // Only add audio field if it exists in the frontmatter
        if (data.audio) {
          blogData.audio = {
            src: data.audio.src,
            duration: data.audio.duration,
            fileSize: data.audio.fileSize,
            generated: data.audio.generated,
            provider: data.audio.provider,
            voice: data.audio.voice,
          };
        }

          console.log(`  ✅ Final animated value: ${blogData.images?.animated}`);
          console.log(`  📝 Blog data created for: ${blogData.slug}\n`);

        // Add to main posts map
        this.blogPosts.set(slug, blogData);

        // Add to tags map
        for (const tag of blogData.tags) {
          if (!this.blogPostsByTag.has(tag)) {
            this.blogPostsByTag.set(tag, []);
          }
          this.blogPostsByTag.get(tag)?.push(blogData);
        }

        // Add to featured posts if applicable
        if (blogData.featured) {
          this.featuredPosts.push(blogData);
        }
        } catch (error: any) {
          console.error(`❌ YAML parsing error in file: ${file}`);
          console.error(`📁 Full path: ${filePath}`);
          if (error.mark) {
            console.error(`📍 Line ${error.mark.line + 1}, Column ${error.mark.column + 1}`);
          }
          console.error(`💥 Error: ${error.message}`);
          throw new Error(`YAML parsing failed in ${file}: ${error.message}`);
        }
      }
    }

    // Sort featured posts by date (newest first)
    this.featuredPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Get blog posts with flexible filtering options
   * @param options Filter options for blog posts
   */
  public getBlogPosts(options: BlogPostFilterOptions = {}): BlogData[] {
    // Default options
    const includeDrafts = options.includeDrafts ?? false;
    const includeFuture = options.includeFuture ?? (process.env.NODE_ENV === 'development');
    const simulatedDate = options.simulatedDate || null;
    const tag = options.tag || null;
    const limit = options.limit || null;
    const featuredOnly = options.featuredOnly ?? false;    // Determine reference date for future post filtering
    let referenceDate: Date;
    if (simulatedDate) {
      if (typeof simulatedDate === 'string') {
        // Parse the date consistently
        if (simulatedDate.includes('T')) {
          // If it's already an ISO string with time, use it directly
          referenceDate = new Date(simulatedDate);
        } else {
          // If it's just a date (YYYY-MM-DD), ensure it's treated as UTC midnight
          const [year, month, day] = simulatedDate.split(/[-\/]/).map(num => parseInt(num));
          referenceDate = new Date(Date.UTC(year, month - 1, day));
        }
      } else {
        referenceDate = simulatedDate;
      }
    } else {
      // Use current date in local timezone
      const now = new Date();
      // Create a date at midnight in local timezone
      referenceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Select source collection based on featured filter
    const sourceCollection = featuredOnly
      ? this.featuredPosts
      : Array.from(this.blogPosts.values());

    // Apply filters
    let filteredPosts = sourceCollection
      .filter(post => {
        // Filter drafts if needed
        if (!includeDrafts && post.draft === true) return false;        // Filter future posts if needed
        if (!includeFuture) {
          // Parse the date consistently with date-formatter.ts
          let postDate: Date;
          if (post.date.includes('T')) {
            // If it's already an ISO string with time, use it directly
            postDate = new Date(post.date);
          } else {
            // If it's just a date (YYYY-MM-DD), ensure it's treated as UTC midnight
            const [year, month, day] = post.date.split(/[-\/]/).map(num => parseInt(num));
            postDate = new Date(Date.UTC(year, month - 1, day));
          }
          
          if (postDate > referenceDate) return false;
        }

        // Filter by tag if needed
        if (tag && !post.tags.includes(tag)) return false;

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply limit if needed
    if (limit !== null) {
      filteredPosts = filteredPosts.slice(0, limit);
    }

    return filteredPosts;
  }

  /**
   * Get tags from filtered posts
   * @param options Filter options for the underlying posts
   */
  public getTags(options: BlogPostFilterOptions = {}): { tag: string; count: number }[] {
    const filteredPosts = this.getBlogPosts(options);
    const tagCounts = new Map<string, number>();

    // Count tags from filtered posts
    for (const post of filteredPosts) {
      for (const tag of post.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get a blog post by slug
   * Note: This will return the post even if it's a draft or future post
   * This is intentional to allow preview of unpublished posts if accessed directly
   */
  public getBlogPostBySlug(slug: string): BlogData | undefined {
    return this.blogPosts.get(slug);
  }

  /**
   * Check if a blog post is published (not a draft and not a future post)
   */
  public isPostPublished(slug: string, simulatedDate?: Date | string): boolean {
    const post = this.getBlogPostBySlug(slug);
    if (!post) return false;    // Get reference date (current or simulated)
    let referenceDate: Date;
    if (simulatedDate) {
      if (typeof simulatedDate === 'string') {
        // Parse the date consistently
        if (simulatedDate.includes('T')) {
          // If it's already an ISO string with time, use it directly
          referenceDate = new Date(simulatedDate);
        } else {
          // If it's just a date (YYYY-MM-DD), ensure it's treated as UTC midnight
          const [year, month, day] = simulatedDate.split(/[-\/]/).map(num => parseInt(num));
          referenceDate = new Date(Date.UTC(year, month - 1, day));
        }
      } else {
        referenceDate = simulatedDate;
      }
    } else {
      // Use current date in local timezone
      const now = new Date();
      // Create a date at midnight in local timezone
      referenceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Check if it's a draft
    if (post.draft === true) return false;    // Check if it's a future post
    // Parse the date consistently with date-formatter.ts
    let postDate: Date;
    if (post.date.includes('T')) {
      // If it's already an ISO string with time, use it directly
      postDate = new Date(post.date);
    } else {
      // If it's just a date (YYYY-MM-DD), ensure it's treated as UTC midnight
      const [year, month, day] = post.date.split(/[-\/]/).map(num => parseInt(num));
      postDate = new Date(Date.UTC(year, month - 1, day));
    }
    
    return postDate <= referenceDate;
  }

  /**
   * Get the total count of blog posts matching filter options
   */
  public getBlogPostCount(options: BlogPostFilterOptions = {}): number {
    return this.getBlogPosts(options).length;
  }

  /**
   * Check if a blog post exists
   */
  public hasBlogPost(slug: string): boolean {
    return this.blogPosts.has(slug);
  }
}

// Export the singleton instance
export const blogMarkdown = BlogMarkdown.getInstance();
