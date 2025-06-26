import { AudioSequenceBuilder } from "./audio-sequence-builder.js";

async function testSameSeed() {
  console.log("🔍 Testing Same Seed Across All Chunks\n");
  
  try {
    const script = `First paragraph with multiple sentences. This should be chunk one.

Second paragraph here. This will be chunk two with consistent voice.

Third and final paragraph. Maximum voice consistency expected.`;

    const builder = new AudioSequenceBuilder("http://localhost:7860", {
      speakerAudio: "../confusion.wav",
      maxChunkLength: 60, // Small chunks to force multiple chunks
      voice: {
        generation: {
          baseSeed: 99999 // Fixed seed
        }
      }
    });

    console.log("📋 Preview chunks with same seed:");
    const chunks = builder.previewChunks(script);
    
    chunks.forEach((chunk, index) => {
      console.log(`${index + 1}. Seed: ${chunk.seed} | "${chunk.text}"`);
    });
    
    // Verify all seeds are the same
    const uniqueSeeds = [...new Set(chunks.map(c => c.seed))];
    
    if (uniqueSeeds.length === 1) {
      console.log(`\n✅ SUCCESS: All ${chunks.length} chunks use the same seed (${uniqueSeeds[0]})`);
      console.log("🎭 This ensures maximum voice consistency across all chunks!");
    } else {
      console.log(`\n❌ ERROR: Found ${uniqueSeeds.length} different seeds: ${uniqueSeeds.join(', ')}`);
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testSameSeed().catch(console.error);
