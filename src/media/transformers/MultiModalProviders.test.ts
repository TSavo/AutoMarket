/**
 * MediaTransformer Multi-Modal Provider Tests
 * 
 * Test suite demonstrating the MediaTransformer interface working with
 * FAL.ai and Replicate providers for various transformation scenarios.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createMediaInput } from '../types/MediaTransformer';
import { transformerRegistry, registerTransformer } from './TransformerRegistry';
import { FalAiTransformer } from './FalAiTransformer';
import { ReplicateTransformer } from './ReplicateTransformer';

describe('Multi-Modal MediaTransformer Integration', () => {
  let falAiTransformer: FalAiTransformer;
  let replicateTransformer: ReplicateTransformer;

  beforeAll(() => {
    // Initialize transformers with mock configs for testing
    falAiTransformer = new FalAiTransformer();
    replicateTransformer = new ReplicateTransformer();

    // Mock configure methods for testing
    falAiTransformer.configure = vi.fn(() => {
      (falAiTransformer as any).isConfigured = true;
      (falAiTransformer as any).config = { apiKey: 'test-fal-key' };
    });

    replicateTransformer.configure = vi.fn(() => {
      (replicateTransformer as any).isConfigured = true;
      (replicateTransformer as any).config = { apiKey: 'test-replicate-key' };
    });

    // Configure the transformers
    falAiTransformer.configure({ apiKey: 'test-fal-key' });
    replicateTransformer.configure({ apiKey: 'test-replicate-key' });

    // Register with the registry
    registerTransformer(falAiTransformer);
    registerTransformer(replicateTransformer);
  });

  describe('MediaTransformer Interface', () => {
    it('should have correct interface properties', () => {
      expect(falAiTransformer.id).toBe('fal-ai');
      expect(falAiTransformer.name).toBe('FAL.ai Multi-Modal AI');
      expect(falAiTransformer.type).toBe('remote');
      expect(falAiTransformer.transforms).toHaveLength(4);

      expect(replicateTransformer.id).toBe('replicate');
      expect(replicateTransformer.name).toBe('Replicate AI Platform');
      expect(replicateTransformer.type).toBe('remote');
      expect(replicateTransformer.transforms).toHaveLength(3);
    });

    it('should provide transformation capabilities metadata', () => {
      const falAiCapabilities = falAiTransformer.transforms;
      
      // Check FAL.ai capabilities
      expect(falAiCapabilities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ input: 'text', output: 'image' }),
          expect.objectContaining({ input: 'text', output: 'video' }),
          expect.objectContaining({ input: ['image', 'text'], output: 'video' }),
          expect.objectContaining({ input: ['image', 'video'], output: 'video' })
        ])
      );

      const replicateCapabilities = replicateTransformer.transforms;
      
      // Check Replicate capabilities
      expect(replicateCapabilities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ input: 'text', output: 'image' }),
          expect.objectContaining({ input: 'image', output: 'image' }),
          expect.objectContaining({ input: 'image', output: 'video' })
        ])
      );
    });
  });

  describe('Provider Selection Logic', () => {
    it('should select appropriate models based on input/output types', () => {
      // Mock the selectModel method to test logic
      const selectModel = (falAiTransformer as any).selectModel;

      expect(selectModel(['text'], 'image')).toBe('flux-pro');
      expect(selectModel(['text'], 'video')).toBe('runway-gen3');
      expect(selectModel(['image', 'text'], 'video')).toBe('framepack');
      expect(selectModel(['image', 'video'], 'video')).toBe('face-swap');

      expect(() => selectModel(['audio'], 'image')).toThrow('No FAL.ai model available');
    });

    it('should handle invalid transformation requests', () => {
      const selectModel = (falAiTransformer as any).selectModel;
      
      expect(() => selectModel(['audio', 'text'], 'video')).toThrow();
      expect(() => selectModel(['text'], 'audio')).toThrow();
    });
  });

  describe('TransformerRegistry', () => {
    it('should find correct transformers for simple transformations', () => {
      const textToImageProviders = transformerRegistry.findTransformers('text', 'image');
      expect(textToImageProviders).toHaveLength(2); // Both FAL.ai and Replicate support this
      
      const imageToImageProviders = transformerRegistry.findTransformers('image', 'image');
      expect(imageToImageProviders).toHaveLength(1); // Only Replicate Real-ESRGAN
      
      const audioToTextProviders = transformerRegistry.findTransformers('audio', 'text');
      expect(audioToTextProviders).toHaveLength(0); // No providers for this yet
    });

    it('should find transformers for multi-input transformations', () => {
      const multiInputProviders = transformerRegistry.findMultiInputTransformers(['image', 'text'], 'video');
      expect(multiInputProviders).toHaveLength(1); // Only FAL.ai FramePack
      expect(multiInputProviders[0].id).toBe('fal-ai');
    });

    it('should provide registry statistics', () => {
      const stats = transformerRegistry.getStats();
      
      expect(stats.totalTransformers).toBe(2);
      expect(stats.remoteTransformers).toBe(2);
      expect(stats.localTransformers).toBe(0);
      expect(stats.availableTransformations.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    it('should handle single MediaInput correctly', () => {
      const textInput = createMediaInput('text', 'A beautiful sunset');
      
      expect(textInput.type).toBe('text');
      expect(textInput.data).toBe('A beautiful sunset');
      expect(textInput.metadata).toBeUndefined();
    });

    it('should handle multiple MediaInputs correctly', () => {
      const imageInput = createMediaInput('image', 'data:image/jpeg;base64,/9j/...');
      const textInput = createMediaInput('text', 'Gentle motion');
      
      const inputs = [imageInput, textInput];
      
      expect(inputs).toHaveLength(2);
      expect(inputs[0].type).toBe('image');
      expect(inputs[1].type).toBe('text');
    });

    it('should create MediaInput with metadata', () => {
      const input = createMediaInput('image', 'image-data', { 
        width: 1024, 
        height: 1024,
        format: 'jpeg' 
      });
      
      expect(input.metadata).toEqual({
        width: 1024,
        height: 1024,
        format: 'jpeg'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unconfigured transformers', async () => {
      const unconfiguredTransformer = new FalAiTransformer();
      const textInput = createMediaInput('text', 'test prompt');
      
      await expect(
        unconfiguredTransformer.transform(textInput, 'image')
      ).rejects.toThrow('not configured');
    });

    it('should handle invalid transformations gracefully', async () => {
      const audioInput = createMediaInput('audio', 'audio-data');
      
      const result = await transformerRegistry.executeTransformation({
        input: audioInput,
        outputType: 'image'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No transformer available');
    });
  });

  describe('Multi-Modal Scenarios', () => {
    it('should demonstrate text → image transformation options', () => {
      // Both FAL.ai FLUX Pro and Replicate FLUX 1.1 Pro Ultra can do this
      const providers = transformerRegistry.findTransformers('text', 'image');
      
      expect(providers.map(p => p.id)).toEqual(
        expect.arrayContaining(['fal-ai', 'replicate'])
      );
    });

    it('should show exclusive capabilities', () => {
      // Only FAL.ai can do image + text → video (FramePack)
      const animationProviders = transformerRegistry.findMultiInputTransformers(['image', 'text'], 'video');
      expect(animationProviders).toHaveLength(1);
      expect(animationProviders[0].id).toBe('fal-ai');
      
      // Only Replicate can do image → enhanced image (Real-ESRGAN)
      const enhancementProviders = transformerRegistry.findTransformers('image', 'image');
      expect(enhancementProviders).toHaveLength(1);
      expect(enhancementProviders[0].id).toBe('replicate');
    });
  });

  describe('Real-World Scenarios', () => {
    it('should demonstrate complete workflow capabilities', () => {
      console.log('\n🎯 WORKFLOW DEMONSTRATION');
      console.log('========================');
      
      // Step 1: Generate image from text
      const imageGenerators = transformerRegistry.findTransformers('text', 'image');
      console.log(`Step 1 - Text → Image: ${imageGenerators.length} providers available`);
      imageGenerators.forEach(p => console.log(`  • ${p.name} (${p.id})`));
      
      // Step 2: Animate the image
      const animators = transformerRegistry.findMultiInputTransformers(['image', 'text'], 'video');
      console.log(`Step 2 - Image + Text → Video: ${animators.length} providers available`);
      animators.forEach(p => console.log(`  • ${p.name} (${p.id})`));
      
      // Step 3: Enhance the image (alternative path)
      const enhancers = transformerRegistry.findTransformers('image', 'image');
      console.log(`Alternative - Image → Enhanced Image: ${enhancers.length} providers available`);
      enhancers.forEach(p => console.log(`  • ${p.name} (${p.id})`));
      
      expect(imageGenerators.length).toBeGreaterThan(0);
      expect(animators.length).toBeGreaterThan(0);
      expect(enhancers.length).toBeGreaterThan(0);
    });
  });
});

// Integration test for the complete demo
describe('Multi-Modal Demo Integration', () => {
  it('should run the demo without errors', async () => {
    // Import the demo functions
    const { showAvailableCapabilities } = await import('./MultiModalDemo');
    
    // This should not throw
    expect(() => showAvailableCapabilities()).not.toThrow();
  });
});
