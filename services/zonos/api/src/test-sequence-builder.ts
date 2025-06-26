import { AudioSequenceBuilder } from "./audio-sequence-builder.js";

async function testSequenceBuilder() {
  console.log("🔍 Testing Audio Sequence Builder\n");
  
  try {
    const builder = new AudioSequenceBuilder("http://localhost:7860", {
      speakerAudio: "../confusion.wav",
      maxChunkLength: 100
    });

    // Test just the preview function first
    const script = "Hello world. This is a test script. It has multiple sentences. This should be broken into chunks.";
    
    console.log("📋 Testing chunk preview:");
    const chunks = builder.previewChunks(script);
    
    chunks.forEach((chunk, index) => {
      console.log(`${index + 1}. "${chunk.text}" (${chunk.text.length} chars, seed: ${chunk.seed})`);
    });
    
    console.log("\n✅ Preview test successful!");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testSequenceBuilder().catch(console.error);
