/**
 * HoverVideoImageParser.ts
 * 
 * This utility parses markdown content and replaces <HoverVideoImage> tags
 * with the appropriate React component markup.
 */

/**
 * Interface for the attributes of a HoverVideoImage tag
 */
export interface HoverVideoImageTagAttributes {
  imageSrc: string;
  videoSrc: string;
  alt: string;
  width?: string;
  height?: string;
  expandedWidth?: string;
  expandedHeight?: string;
  borderColor?: string;
  expandedBorderColor?: string;
}

/**
 * Regular expression to match HoverVideoImage tags in markdown content
 * This regex captures both self-closing tags and tags with content
 */
const HOVER_VIDEO_IMAGE_REGEX = /<HoverVideoImage\s+([^>]*)(?:\/>|>(.*?)<\/HoverVideoImage>)/gs;

/**
 * Parse a string of attributes from the tag
 * 
 * @param attributesString The string containing the attributes
 * @returns An object with the parsed attributes
 */
function parseAttributes(attributesString: string): HoverVideoImageTagAttributes {
  const attributes: Partial<HoverVideoImageTagAttributes> = {};
  
  // Match all key="value" pairs
  const attributeRegex = /(\w+)=["']([^"']*)["']/g;
  let match;
  
  while ((match = attributeRegex.exec(attributesString)) !== null) {
    const [, key, value] = match;
    attributes[key as keyof HoverVideoImageTagAttributes] = value;
  }
  
  // Validate required attributes
  if (!attributes.imageSrc) {
    throw new Error('HoverVideoImage tag is missing required imageSrc attribute');
  }
  
  if (!attributes.videoSrc) {
    throw new Error('HoverVideoImage tag is missing required videoSrc attribute');
  }
  
  if (!attributes.alt) {
    throw new Error('HoverVideoImage tag is missing required alt attribute');
  }
  
  return attributes as HoverVideoImageTagAttributes;
}

/**
 * Generate the React component string for a HoverVideoImage
 * 
 * @param attributes The parsed attributes for the HoverVideoImage
 * @returns A string containing the React component markup
 */
function generateComponentString(attributes: HoverVideoImageTagAttributes): string {
  const {
    imageSrc,
    videoSrc,
    alt,
    width = '800',
    height = '450',
    expandedWidth,
    expandedHeight,
    borderColor,
    expandedBorderColor
  } = attributes;
  
  let componentString = `<HoverVideoImage
  imageSrc="${imageSrc}"
  videoSrc="${videoSrc}"
  alt="${alt}"
  width={${width}}
  height={${height}}`;
  
  // Add optional attributes if they exist
  if (expandedWidth) {
    componentString += `\n  expandedWidth={${expandedWidth}}`;
  }
  
  if (expandedHeight) {
    componentString += `\n  expandedHeight={${expandedHeight}}`;
  }
  
  if (borderColor) {
    componentString += `\n  borderColor="${borderColor}"`;
  }
  
  if (expandedBorderColor) {
    componentString += `\n  expandedBorderColor="${expandedBorderColor}"`;
  }
  
  componentString += `\n/>`;
  
  return componentString;
}

/**
 * Parse markdown content and replace HoverVideoImage tags with React component markup
 * 
 * @param content The markdown content to parse
 * @returns The content with HoverVideoImage tags replaced with React component markup
 */
export function parseHoverVideoImageTags(content: string): string {
  return content.replace(HOVER_VIDEO_IMAGE_REGEX, (match, attributesString) => {
    try {
      const attributes = parseAttributes(attributesString);
      return generateComponentString(attributes);
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
