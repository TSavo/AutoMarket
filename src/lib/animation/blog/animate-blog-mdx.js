/**
 * Blog Animation Script for MDX-based hover images
 *
 * This script animates blog hover images using FramePack AI based on the animation prompts
 * defined directly in the blog post MDX files. It supports both the main blog image in the
 * 'images' frontmatter field and additional hover images in the 'blogImages' array.
 * 
 * If no blogImages array is found, the script will scan the MDX content for !hover tags and
 * create the blogImages array automatically.
 * 
 * Usage:
 *   node animate-blog-mdx.js blog-post-slug [--force] [--debug] [--blog-images-only]
 *   node animate-blog-mdx.js --all [--force] [--debug]
 *   
 * Where:
 *   blog-post-slug is the filename of the blog post without the extension
 *   --force forces regeneration even if the video already exists
 *   --debug enables debug logging
 *   --all processes all blog posts in the directory
 *   --blog-images-only only processes the blogImages array, not the main image
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { fal } = require('@fal-ai/client');
const dotenv = require('dotenv');
const matter = require('gray-matter');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Configure fal.ai client with API key
const apiKey = process.env.FALAI_API_KEY;
if (!apiKey) {
  console.error('FALAI_API_KEY environment variable is not set!');
  process.exit(1);
} else {
  console.log('API Key found, configuring fal.ai client...');
  fal.config({
    credentials: apiKey
  });
}

// Configuration
const HORIZON_CITY_PATH = path.resolve(__dirname, '../../..');
const BLOG_POSTS_PATH = path.join(HORIZON_CITY_PATH, 'content', 'blog', 'posts');
const VIDEOS_PATH = path.join(HORIZON_CITY_PATH, 'public/videos/blog');
const IMAGES_PATH = path.join(HORIZON_CITY_PATH, 'public');

// Ensure videos directory exists
if (!fs.existsSync(VIDEOS_PATH)) {
  fs.mkdirSync(VIDEOS_PATH, { recursive: true });
}

/**
 * Find a blog post by slug
 */
function findBlogPostBySlug(slug) {
  // Check for exact match with .md or .mdx extension
  const exactMatches = [
    path.join(BLOG_POSTS_PATH, `${slug}.md`),
    path.join(BLOG_POSTS_PATH, `${slug}.mdx`)
  ];

  for (const filePath of exactMatches) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
}

/**
 * Generate and save a video using FramePack AI
 */
async function generateAndSaveVideo(inputImagePath, prompt, outputVideoPath) {
  try {
    console.log(`Generating video for ${path.basename(inputImagePath)}`);
    console.log(`Animation prompt: ${prompt}`);

    // Read the image file
    const imageBuffer = fs.readFileSync(inputImagePath);

    // Convert to base64 data URI
    const base64Image = imageBuffer.toString('base64');
    const mimeType = path.extname(inputImagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    console.log('Image converted to base64 data URI');

    // Call the fal.ai API - Using 16:9 aspect ratio for blog images
    console.log('Calling FramePack API...');
    const videoLength = 5; // in seconds
    let lastReportedProgress = -1;

    const result = await fal.subscribe("fal-ai/framepack", {
      input: {
        prompt: prompt,
        image_url: dataUri,
        num_frames: 150,
        fps: 30,
        guidance_scale: 7.5,
        seed: Math.floor(Math.random() * 1000000),
        teacache: true,
        video_length: videoLength,
        aspect_ratio: "16:9" // Using 16:9 for blog images
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS" && update.logs.length > 0) {
          // Only show the last/latest log message
          const lastLog = update.logs[update.logs.length - 1];

          // Parse progress from the log message (e.g., "  4%|▍         | 1/25 [00:01<00:27,  1.13s/it]")
          const progressMatch = lastLog.message.match(/^\s*(\d+)%\|[^|]*\|\s*(\d+)\/(\d+)/);
          if (progressMatch) {
            const cycleProgress = parseInt(progressMatch[1]); // 0-100% for current cycle
            const currentStep = parseInt(progressMatch[2]); // current step (1-25)
            const totalSteps = parseInt(progressMatch[3]); // total steps per cycle (25)

            // Calculate overall progress across all video seconds
            // We estimate which cycle we're in based on total log count
            const totalLogs = update.logs.length;
            const estimatedCycle = Math.floor(totalLogs / totalSteps);
            const overallProgress = Math.min(100, Math.round(
              ((estimatedCycle * 100) + cycleProgress) / videoLength
            ));

            // Only report progress if it's meaningfully different
            if (overallProgress > lastReportedProgress) {
              console.log(`🎬 Animation Progress: ${overallProgress}% (Processing second ${Math.min(estimatedCycle + 1, videoLength)}/${videoLength})`);
              lastReportedProgress = overallProgress;
            }
          } else {
            // Fallback to showing the raw message if we can't parse it
            console.log(lastLog.message);
          }
        }
      },
    });

    // Get the video URL from the result (handle different response formats)
    let videoUrl;
    if (result.data && result.data.video && result.data.video.url) {
      videoUrl = result.data.video.url;
    } else if (result.data && result.data.video_url) {
      videoUrl = result.data.video_url;
    } else if (result.video) {
      videoUrl = result.video;
    } else {
      throw new Error('No video URL found in the API response');
    }

    console.log(`Video generated: ${videoUrl}`);

    // Download the video
    console.log(`Downloading video to ${outputVideoPath}...`);
    const response = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8'
      }
    });

    // Check if we got valid video data
    if (!response.data || response.data.length === 0) {
      throw new Error('Received empty data when downloading the video');
    }

    console.log(`Received ${response.data.length} bytes of video data`);

    // Save the video file
    fs.writeFileSync(outputVideoPath, response.data);

    // Verify the file was saved
    const stats = fs.statSync(outputVideoPath);
    console.log(`Video saved to: ${outputVideoPath} (${stats.size} bytes)`);

    if (stats.size === 0) {
      throw new Error('Saved file is empty');
    }

    return outputVideoPath;
  } catch (error) {
    console.error('Error generating and saving video:', error);
    throw error;
  }
}

/**
 * Update the blog post mdx file with animated video path for the main image
 */
async function updateMdxFile(mdxPath, animatedPath) {
  try {
    // Read the MDX file
    const content = fs.readFileSync(mdxPath, 'utf8');
    
    // Parse the frontmatter
    const { data, content: body } = matter(content);
    
    // Update images.animated in the frontmatter
    if (!data.images) {
      data.images = {};
    }
    
    // Store the previous value to check if it changed
    const previousValue = data.images.animated;
    
    // Update the value
    data.images.animated = animatedPath;
    
    // Rewrite the file with updated frontmatter
    const updatedContent = matter.stringify(body, data);
    fs.writeFileSync(mdxPath, updatedContent);
    
    if (previousValue !== animatedPath) {
      console.log(`✅ Updated MDX file with animated video path: ${animatedPath}`);
    } else {
      console.log(`ℹ️ MDX file already had the correct animated path: ${animatedPath}`);
    }
    return true;
  } catch (error) {
    console.error(`Error updating MDX file ${mdxPath}:`, error);
    throw error;
  }
}

/**
 * Process a single blog image
 */
async function processImage(imageSrc, animationPrompt, force = false) {
  try {
    console.log(`\n--- Processing image: ${imageSrc} ---`);

    // Convert relative path to absolute
    const fullImagePath = path.join(IMAGES_PATH, imageSrc);
    if (!fs.existsSync(fullImagePath)) {
      console.error(`Error: Image file not found at ${fullImagePath}`);
      return null;
    }
    
    // Determine output video file name and path
    const imgBaseName = path.basename(imageSrc, path.extname(imageSrc));
    const outputVideoName = `${imgBaseName}-animated.mp4`;
    const outputVideoPath = path.join(VIDEOS_PATH, outputVideoName);
    const videoWebPath = `/videos/blog/${outputVideoName}`;
    
    // Check if video already exists and not forcing regeneration
    if (fs.existsSync(outputVideoPath) && !force) {
      console.log(`ℹ️ Video already exists at ${outputVideoPath}. Skipping video generation.`);
    } else {
      // Generate and save video only if it doesn't exist or force is true
      console.log('Generating and saving video...');
      await generateAndSaveVideo(fullImagePath, animationPrompt, outputVideoPath);
    }
    
    console.log(`--- Finished processing image: ${imageSrc} ---`);
    return videoWebPath;
  } catch (error) {
    console.error(`Error processing image ${imageSrc}:`, error);
    return null;
  }
}

/**
 * Update the blog post MDX file with animated blogImages
 */
async function updateMdxWithBlogImages(mdxPath, blogImages) {
  try {
    // Read the MDX file
    const content = fs.readFileSync(mdxPath, 'utf8');
    
    // Parse the frontmatter
    const { data, content: body } = matter(content);
    
    // Update blogImages in the frontmatter
    data.blogImages = blogImages;
    
    // Rewrite the file with updated frontmatter
    const updatedContent = matter.stringify(body, data);
    fs.writeFileSync(mdxPath, updatedContent);
    
    console.log(`✅ Updated MDX file with blogImages data`);
    return true;
  } catch (error) {
    console.error(`Error updating MDX file ${mdxPath} with blogImages:`, error);
    throw error;
  }
}

/**
 * Process a blog post MDX file
 */
async function processPost(mdxPath, force = false) {
  try {
    console.log(`\n=== Processing ${path.basename(mdxPath)} ===`);
    
    // Read and parse the MDX file
    const content = fs.readFileSync(mdxPath, 'utf8');
    const { data } = matter(content);
    let updated = false;
    let success = true;
      // Check if we should only process blog images
    const blogImagesOnly = process.argv.includes('--blog-images-only');

    // Process main image if it exists and we're not in blog-images-only mode
    if (!blogImagesOnly && data.images) {
      const animationPrompt = data.images.animationPrompt;
      const imageSrc = data.images.src;
      
      if (animationPrompt && imageSrc) {
        // Process the main image
        console.log('Processing main blog image...');
        const videoWebPath = await processImage(imageSrc, animationPrompt, force);
        
        if (videoWebPath) {
          // Update the MDX file with the main image animated path
          if (!data.images.animated || data.images.animated !== videoWebPath) {
            await updateMdxFile(mdxPath, videoWebPath);
            updated = true;
          } else {
            console.log('MDX already has the correct animated path for main image');
          }
        } else {
          console.warn('Failed to process main blog image');
          success = false;
        }
      } else {
        console.log('Main blog image is missing src or animationPrompt, skipping');
      }
    } else if (blogImagesOnly) {
      console.log('Blog images only mode, skipping main image processing');
    } else {
      console.log('No main images block found in frontmatter, skipping main image processing');
    }
      // Process blogImages if they exist
    if (data.blogImages && Array.isArray(data.blogImages) && data.blogImages.length > 0) {
      console.log(`Processing ${data.blogImages.length} additional blog images from frontmatter...`);
      
      const processedImages = [];
      
      for (let i = 0; i < data.blogImages.length; i++) {
        const img = data.blogImages[i];
        console.log(`Processing blog image ${i + 1}/${data.blogImages.length}: ${img.src}`);
        
        // Skip if no animation prompt is provided
        if (!img.animationPrompt) {
          console.error(`❌ No animation prompt provided for ${img.src}! Skipping animation generation.`);
          console.error(`Please add an 'animationPrompt' field to this image in the blogImages array.`);
          processedImages.push(img);
          continue;
        }
        
        // Generate animation if needed
        if (!img.animated || force) {
          const videoWebPath = await processImage(img.src, img.animationPrompt, force);
          if (videoWebPath) {
            img.animated = videoWebPath;
          }
        }
        
        processedImages.push(img);
      }
      
      // Update blogImages in the MDX file
      await updateMdxWithBlogImages(mdxPath, processedImages);
      updated = true;
    } else {
      // Look for hover images in the MDX content to create blogImages automatically
      console.log('No blogImages block found in frontmatter, scanning content for !hover tags...');
        // Regular expression to match !hover syntax in the MDX content
      const hoverRegex = /!hover\[([^\]]+)\]\(([^)]+)\)\(([^)]+)\)(?:\(({[^}]*})\))?/g;
      let match;
      const blogImages = [];
      
      // Find all hover images in the content
      while ((match = hoverRegex.exec(content)) !== null) {
        const altText = match[1];
        const imageSrc = match[2];
        const videoSrc = match[3];
        const params = match[4] ? match[4] : '{}';
        
        // Skip external videos that we don't need to animate
        const isExternalVideo = videoSrc.startsWith('http') || 
                                videoSrc.includes('youtube.com') || 
                                videoSrc.includes('vimeo.com');
        
        if (isExternalVideo) {
          console.log(`Skipping external video: ${videoSrc}`);
          continue;
        }
        
        blogImages.push({
          src: imageSrc,
          animated: videoSrc,
          altText: altText,
          params: params
        });
      }
      
      // If we already have blogImages in the frontmatter, compare and merge
      if (data.blogImages && Array.isArray(data.blogImages) && data.blogImages.length > 0) {
        console.log(`Found ${data.blogImages.length} blogImages in frontmatter and ${blogImages.length} in content`);
        
        // Map existing images by source path
        const existingImageMap = new Map();
        data.blogImages.forEach(img => {
          existingImageMap.set(img.src, img);
        });
        
        // Update only new or changed images
        for (const contentImage of blogImages) {
          const existingImage = existingImageMap.get(contentImage.src);
          
          if (!existingImage) {
            console.log(`New image found in content: ${contentImage.src}`);
            data.blogImages.push(contentImage);
          } else {
            // Update if necessary
            if (contentImage.altText !== existingImage.altText || 
                contentImage.params !== existingImage.params) {
              console.log(`Updating image properties for: ${contentImage.src}`);
              existingImage.altText = contentImage.altText;
              existingImage.params = contentImage.params;
            }
          }
        }
        
        blogImages = data.blogImages;
      }
        if (blogImages.length > 0) {
        console.log(`Found ${blogImages.length} hover images in the content`);
        
        // Add animationPrompts from the main image if not specified
        const defaultAnimationPrompt = data.images?.animationPrompt || "A smooth animation of this image showing subtle movement and dynamic elements.";
        
        // Process each blog image to generate animations
        const processedImages = [];
        
        for (let i = 0; i < blogImages.length; i++) {
          const img = blogImages[i];
          console.log(`Processing hover image ${i + 1}/${blogImages.length}: ${img.src}`);
          
          // Set the animation prompt if not specified
          img.animationPrompt = img.animationPrompt || defaultAnimationPrompt;
          
          // Check if we need to animate this image (if it's not just referencing an existing video)
          if (!img.animated.startsWith('/videos/') || force) {
            const videoWebPath = await processImage(img.src, img.animationPrompt, force);
            if (videoWebPath) {
              img.animated = videoWebPath;
            }
          } else {
            console.log(`Using existing animated video path: ${img.animated}`);
            
            // Check if the video actually exists
            const fullVideoPath = path.join(HORIZON_CITY_PATH, 'public', img.animated);
            if (!fs.existsSync(fullVideoPath)) {
              console.log(`Warning: Video file not found at ${fullVideoPath}, will regenerate`);
              const videoWebPath = await processImage(img.src, img.animationPrompt, true);
              if (videoWebPath) {
                img.animated = videoWebPath;
              }
            }
          }
          
          processedImages.push(img);
        }
        
        // Update the MDX file with the processed blogImages
        if (processedImages.length > 0) {
          await updateMdxWithBlogImages(mdxPath, processedImages);
          updated = true;
        }
      } else {
        console.log('No hover images found in the content');
      }
    }
    
    if (updated) {
      console.log(`\n✅ Successfully processed ${path.basename(mdxPath)}`);
    } else {
      console.log(`\n⚠️ No updates required for ${path.basename(mdxPath)}`);
    }
    
    console.log(`=== Finished processing ${path.basename(mdxPath)} ===\n`);
    
    return success;
  } catch (error) {
    console.error(`Error processing post ${mdxPath}:`, error);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const force = args.includes('--force');
    const debug = args.includes('--debug');
    const all = args.includes('--all');
    const blogImagesOnly = args.includes('--blog-images-only');

    if (debug) {
      console.log('Debug mode enabled');
    }

    // Process all blog posts if --all flag is provided
    if (all) {
      console.log('Processing all blog posts...');
      
      // Get all blog post files
      const files = fs.readdirSync(BLOG_POSTS_PATH);
      const mdxFiles = files.filter(file => file.endsWith('.mdx') || file.endsWith('.md'));
      
      let successCount = 0;
      let failCount = 0;
      
      for (const file of mdxFiles) {
        const mdxPath = path.join(BLOG_POSTS_PATH, file);
        console.log(`\n=== Processing ${file} ===`);
        
        try {
          const success = await processPost(mdxPath, force);
          if (success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Error processing ${file}:`, error);
          failCount++;
        }
      }
      
      console.log(`\n=== Processing Summary ===`);
      console.log(`Total processed: ${mdxFiles.length}`);
      console.log(`Successful: ${successCount}`);
      console.log(`Failed: ${failCount}`);
      
      if (failCount > 0) {
        process.exit(1);
      }
      
      console.log('\nAnimation processing complete!');
      return;
    }

    // Check if we have a blog post slug
    if (args.length === 0 || (args[0].startsWith('--') && args.length === 1)) {
      console.error('Error: No blog post slug provided');
      console.log('Usage: node animate-blog-mdx.js blog-post-slug [--force] [--debug] [--blog-images-only]');
      console.log('       node animate-blog-mdx.js --all [--force] [--debug]');
      process.exit(1);
    }

    // Get the slug
    const slug = args.find(arg => !arg.startsWith('--'));
    console.log(`Looking for blog post with slug: ${slug}`);

    // Find the blog post
    const mdxPath = findBlogPostBySlug(slug);
    if (!mdxPath) {
      console.error(`Error: Blog post with slug "${slug}" not found in ${BLOG_POSTS_PATH}`);
      process.exit(1);
    }

    console.log(`Found blog post at: ${mdxPath}`);

    // Process the blog post
    const success = await processPost(mdxPath, force);
    
    if (!success) {
      process.exit(1);
    }

    console.log('Animation processing complete!');
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
}

// Run the main function
main();
