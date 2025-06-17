/**
 * HoverVideoImageTagParser.ts
 *
 * This utility parses markdown content and replaces <HoverVideoImage> tags
 * with the appropriate React component markup for server-side rendering.
 */

/**
 * Regular expression to match HoverVideoImage tags in markdown content
 */
const HOVER_VIDEO_IMAGE_REGEX = /<HoverVideoImage\s+([^>]*)\s*\/>/g;

/**
 * Parse a string of attributes from the tag
 *
 * @param attributesString The string containing the attributes
 * @returns An object with the parsed attributes
 */
function parseAttributes(attributesString: string): Record<string, string> {
  const attributes: Record<string, string> = {};

  // Match all key="value" pairs
  const attributeRegex = /(\w+)=["']([^"']*)["']/g;
  let match;

  while ((match = attributeRegex.exec(attributesString)) !== null) {
    const [, key, value] = match;
    attributes[key] = value;
  }

  return attributes;
}

/**
 * Generate React component markup for a HoverVideoImage
 *
 * @param attributes The parsed attributes for the HoverVideoImage
 * @returns A string containing the React component markup
 */
function _generateComponentMarkup(attributes: Record<string, string>): string {
  // Extract attributes with defaults
  const {
    imageSrc,
    videoSrc,
    alt,
    width = '800',
    height = '450',
    expandedWidth = '850',
    expandedHeight = '480',
    borderColor = 'blue.700',
    expandedBorderColor = 'cyan.500'
  } = attributes;

  // Validate required attributes
  if (!imageSrc) {
    return `<div class="error">Missing imageSrc in HoverVideoImage tag</div>`;
  }

  if (!videoSrc) {
    return `<div class="error">Missing videoSrc in HoverVideoImage tag</div>`;
  }

  if (!alt) {
    return `<div class="error">Missing alt in HoverVideoImage tag</div>`;
  }

  // Just return a simple image for now, which will be visible immediately
  // The client-side hydration will replace this with the interactive component
  return `<img src="${imageSrc}" alt="${alt}" class="hover-video-image-placeholder"
       data-hover-video-image="true"
       data-image-src="${imageSrc}"
       data-video-src="${videoSrc}"
       data-alt="${alt}"
       data-width="${width}"
       data-height="${height}"
       data-expanded-width="${expandedWidth}"
       data-expanded-height="${expandedHeight}"
       data-border-color="${borderColor}"
       data-expanded-border-color="${expandedBorderColor}"
       style="width: 100%; border-radius: 8px; border: 2px solid var(--chakra-colors-${borderColor.replace('.', '-')}); margin-bottom: 2rem;" />`;
}

/**
 * Parse markdown content and replace HoverVideoImage tags with HTML
 *
 * @param content The markdown content to parse
 * @returns The content with HoverVideoImage tags replaced with HTML
 */
export function parseHoverVideoImageTags(content: string): string {
  return content.replace(HOVER_VIDEO_IMAGE_REGEX, (match, attributesString) => {
    try {
      const attributes = parseAttributes(attributesString);
      const imageSrc = attributes.imageSrc;
      const alt = attributes.alt || 'Image';

      // Just return a simple image tag for now
      return `<img src="${imageSrc}" alt="${alt}" style="width: 100%; border-radius: 8px; margin-bottom: 2rem;" />`;
    } catch {
     
      return match; // Return the original tag if there's an error
    }
  });
}

/**
 * Check if content contains any HoverVideoImage tags
 *
 * @param content The markdown content to check
 * @returns True if the content contains HoverVideoImage tags, false otherwise
 */
export function containsHoverVideoImageTags(content: string): boolean {
  return HOVER_VIDEO_IMAGE_REGEX.test(content);
}
