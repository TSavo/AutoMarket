/**
 * Script Generator State Handler
 *
 * Handles script generation using Ollama/DeepSeek-R1:7b for AI script generation
 * with specific cyberpunk framing.
 */

import {
  PipelineAction,
  PipelineContext,
  PipelineState,
  Script,
  StateHandler
} from '../types';
import { AspectRatio, DEFAULT_ASPECT_RATIO } from '../../common/aspect-ratio';
import { scriptGenerationResponseSchema } from '../validation/schemas';
import { validateApiResponse } from '../validation/validate';

export class ScriptGeneratorStateHandler implements StateHandler {
  /**
   * Check if this handler can handle the given state
   * @param state Current pipeline state
   * @returns True if this handler can handle the state
   */
  canHandle(state: PipelineState): boolean {
    return [
      PipelineState.BLOG_SELECTED,
      PipelineState.SCRIPT_GENERATING,
      PipelineState.SCRIPT_GENERATED,
      PipelineState.SCRIPT_APPROVED
    ].includes(state);
  }

  /**
   * Handle a state transition
   * @param action Action being performed
   * @param context Current pipeline context
   * @returns Updated context after handling the action
   */
  async handleTransition(
    action: PipelineAction,
    context: PipelineContext
  ): Promise<PipelineContext> {
    switch (action) {
      case PipelineAction.GENERATE_SCRIPT:
        return this.generateScript(context);

      case PipelineAction.EDIT_SCRIPT:
        return this.editScript(context, (context as any).editedScript);

      case PipelineAction.REGENERATE_SCRIPT:
        return this.regenerateScript(context);

      case PipelineAction.APPROVE_SCRIPT:
        // Extract aspect ratio from payload if provided
        const aspectRatio = (context as any).aspectRatio as AspectRatio | undefined;
        return this.approveScript(context, aspectRatio);

      default:
        // For unsupported actions, just return the unchanged context
        return context;
    }
  }

  /**
   * Generate a script from the blog content
   * @param context Current pipeline context
   * @returns Updated context with generated script
   */
  private async generateScript(context: PipelineContext): Promise<PipelineContext> {
    if (!context.blog) {
      throw new Error('Cannot generate script: No blog post selected');
    }

    try {
      // Generate script using Ollama/DeepSeek
      const scriptText = await this.callAiModel(context.blog.content);

      // Create script object with metadata
      const script: Script = {
        text: scriptText,
        estimatedDuration: this.estimateScriptDuration(scriptText),
        generatedAt: new Date().toISOString()
      };

      // Return updated context
      return {
        ...context,
        script
      } as PipelineContext;
    } catch (error) {
      // Handle error and update context
      console.error('Script generation error:', error);

      return {
        ...context,
        error: {
          message: error instanceof Error ? error.message : 'Unknown script generation error',
          state: context.currentState,
          action: PipelineAction.GENERATE_SCRIPT,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Edit an existing script
   * @param context Current pipeline context
   * @param editedText Edited script text
   * @returns Updated context with edited script
   */
  private async editScript(
    context: PipelineContext,
    editedText: string
  ): Promise<PipelineContext> {
    if (!context.script) {
      throw new Error('Cannot edit script: No script exists');
    }

    const updatedScript: Script = {
      ...context.script,
      text: editedText,
      estimatedDuration: this.estimateScriptDuration(editedText),
      editedAt: new Date().toISOString()
    };

    return {
      ...context,
      script: updatedScript
    } as PipelineContext;
  }

  /**
   * Regenerate the script with new AI generation
   * @param context Current pipeline context
   * @returns Updated context with regenerated script
   */
  private async regenerateScript(context: PipelineContext): Promise<PipelineContext> {
    if (!context.blog) {
      throw new Error('Cannot regenerate script: No blog post selected');
    }

    // We can reuse the generateScript method but add a flag to indicate regeneration
    const updatedContext = await this.generateScript(context);

    // Add metadata to indicate this was a regeneration
    if (updatedContext.script) {
      updatedContext.script = {
        ...updatedContext.script,
        regenerated: true
      } as Script;
    }

    return updatedContext;
  }

  /**
   * Approve the current script and prepare for next steps
   * @param context Current pipeline context
   * @param aspectRatio Optional aspect ratio for the video
   * @returns Updated context with approved script
   */
  private async approveScript(
    context: PipelineContext,
    aspectRatio?: AspectRatio
  ): Promise<PipelineContext> {
    // Validate required data exists
    if (!context.script) {
      throw new Error('Cannot approve script: No script exists');
    }

    if (!context.blog) {
      throw new Error('Cannot approve script: No blog post available');
    }

    if (!context.script.text || context.script.text.trim().length === 0) {
      throw new Error('Cannot approve script: Script text is empty');
    }

    // Add approval timestamp and aspect ratio to the script
    const approvedScript: Script = {
      ...context.script,
      approvedAt: new Date().toISOString(),
      aspectRatio: aspectRatio || DEFAULT_ASPECT_RATIO // Default to 16:9 if not specified
    };

    console.log(`[SCRIPT HANDLER] Script approved with aspect ratio: ${approvedScript.aspectRatio}`);

    return {
      ...context,
      script: approvedScript
    } as PipelineContext;
  }

  /**
   * Call the AI model to generate a script
   * @param blogContent Blog content to generate script from
   * @returns Generated script text
   */
  private async callAiModel(blogContent: string): Promise<string> {
    try {
      // Create a trim and extract function to get a concise chunk of blog content
      const extractContent = (content: string): string => {
        // Truncate to 1000 characters max to avoid overwhelming the AI
        const truncated = content.slice(0, 1000);
        // Extract meaningful sentences
        return truncated
          .split('.')
          .slice(0, 5)
          .join('. ')
          .trim() + '.';
      };

      const blogExcerpt = extractContent(blogContent);

      // Try to call Ollama/DeepSeek API directly
      try {
        const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
        const model = 'deepseek-r1:7b';

        const prompt = this.createCyberpunkPrompt(blogExcerpt);

        const response = await fetch(`${ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            prompt,
            stream: false,
            options: {
              temperature: 0.7,
              top_p: 0.9,
              max_tokens: 200,
            }
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const processedScript = this.processAIResponse(data.response, blogExcerpt);
          return processedScript;
        } else {
          console.warn('Ollama API call failed, falling back to template');
        }
      } catch (apiError) {
        console.warn('Ollama API unavailable, falling back to template:', apiError);
      }

      // Fallback to template-based generation
      return this.generateTemplateScript(blogExcerpt);
    } catch (error) {
      console.error('Error calling AI model:', error);
      throw new Error(`Failed to generate script: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create cyberpunk-themed prompt for AI
   * @param blogContent Blog content to convert
   * @returns Formatted prompt
   */
  private createCyberpunkPrompt(blogContent: string): string {
    return `You are a cyberpunk video script writer for Horizon City Stories. Convert this blog content into a compelling 30-60 second video script with a cyberpunk aesthetic.

Blog content: ${blogContent}

Create a script that:
- Has a strong cyberpunk/dystopian tone
- Is engaging for video format
- Is 30-60 seconds when spoken
- Includes visual cues in [brackets]
- Ends with a call to action

Script:`;
  }

  /**
   * Process AI response into clean script
   * @param aiResponse Raw AI response
   * @param originalContent Original blog content for fallback
   * @returns Processed script
   */
  private processAIResponse(aiResponse: string, originalContent: string): string {
    try {
      // Clean up the AI response
      let script = aiResponse.trim();

      // Remove any "Script:" prefix
      script = script.replace(/^Script:\s*/i, '');

      // Ensure it's not too long (max ~150 words for 60 seconds)
      const words = script.split(/\s+/);
      if (words.length > 150) {
        script = words.slice(0, 150).join(' ') + '...';
      }

      // Ensure it ends with punctuation
      if (!/[.!?]$/.test(script)) {
        script += '.';
      }

      return script;
    } catch (error) {
      console.warn('Error processing AI response, using template:', error);
      return this.generateTemplateScript(originalContent);
    }
  }

  /**
   * Generate a template-based script as fallback
   * @param blogExcerpt Extracted blog content
   * @returns Template-generated script
   */
  private generateTemplateScript(blogExcerpt: string): string {
    // Template-based script generation with cyberpunk framing
    return `Hey chummers, gather 'round and jack into this slice of dystopian reality.

${blogExcerpt}

In this concrete jungle of neon and shadow, the line between human and machine blurs with each passing day. The corps have eyes everywhere, but we've got the edge they never will - our humanity.

For more dystopia, visit horizon-dash-city dot com. Walk safe!`;
  }

  /**
   * Estimate the duration of a script in seconds
   * @param scriptText Script text
   * @returns Estimated duration in seconds
   */
  private estimateScriptDuration(scriptText: string): number {
    // Average speaking rate is ~150 words per minute (or 2.5 words per second)
    // Calculate estimated duration based on word count
    const words = scriptText.split(/\s+/).filter(Boolean).length;
    return Math.round(words / 2.5);
  }
}
