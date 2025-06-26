import { AudioSequenceBuilder } from "./audio-sequence-builder.js";

async function demonstrateSequenceBuilder() {
  console.log("🎬 Audio Sequence Builder Demo\n");
  console.log("=" .repeat(60));
  
  try {
    // Sample script with multiple paragraphs
    const script = `Welcome to our magical story about Luna, a young fox with extraordinary abilities.

Luna lived in an enchanted forest where ancient trees whispered secrets to those who listened carefully. Every morning, she would wake up to the sound of birds singing and leaves rustling in the gentle breeze.

One day, while exploring a hidden grove, Luna discovered something amazing. There, in the center of the clearing, stood the legendary Tree of Wisdom, its golden leaves shimmering with mystical energy.

As Luna approached the tree, she felt a warm sensation flowing through her body. Suddenly, she could understand the language of all the forest creatures! The squirrels chattered about hidden acorn treasures, the owls spoke of ancient mysteries, and the deer shared stories of distant meadows.

From that day forward, Luna became the guardian of the forest, using her newfound gift to help all the creatures live in harmony. And they all lived happily ever after.`;

    // Create the sequence builder
    const builder = new AudioSequenceBuilder("http://localhost:7860", {
      speakerAudio: "../confusion.wav",
      maxChunkLength: 150, // Shorter chunks for better control
      pauseAtParagraphs: true,
      pauseDuration: 250, // Quarter second pauses
      voice: {
        conditioning: {
          dnsmos: 4.5,
          speakingRate: 13.0,
          pitchStd: 40.0,
          vqScore: 0.75
        },
        generation: {
          cfgScale: 2.8,
          randomizeSeed: false,
          baseSeed: 100000 // Starting seed
        },
        emotion: {
          happiness: 0.6,
          neutral: 0.4
        }
      }
    });

    await builder.connect();
    console.log("✅ Connected to Zonos TTS API\n");

    // Preview how the script will be chunked
    console.log("📋 Preview: How the script will be chunked:");
    console.log("-".repeat(50));
    const chunks = builder.previewChunks(script);
    chunks.forEach((chunk, index) => {
      console.log(`${index + 1}. "${chunk.text}"`);
      console.log(`   Length: ${chunk.text.length} chars, Seed: ${chunk.seed}${chunk.isParagraphBreak ? ' [PARAGRAPH BREAK]' : ''}\n`);
    });

    // Build the complete sequence
    console.log("🚀 Building complete audio sequence...");
    console.log("-".repeat(50));
    await builder.buildSequence(script, "complete_luna_story.wav", "luna");

    console.log("\n🎯 Alternative: Build without paragraph pauses");
    console.log("-".repeat(50));
    
    const fastBuilder = new AudioSequenceBuilder("http://localhost:7860", {
      speakerAudio: "../confusion.wav",
      maxChunkLength: 200,
      pauseAtParagraphs: false, // No pauses
      voice: {
        generation: {
          baseSeed: 110000 // Different seed range
        }
      }
    });
    
    await fastBuilder.connect();
    await fastBuilder.buildSequence(script, "luna_story_no_pauses.wav", "luna_fast");

    console.log("\n✨ Demo Complete!");
    console.log("=" .repeat(60));
    console.log("📄 Generated files:");
    console.log("  🎵 complete_luna_story.wav - Full story with paragraph pauses");
    console.log("  🎵 luna_story_no_pauses.wav - Full story without pauses");
    console.log("  📁 luna_*.wav - Individual chunk files");
    console.log("  📁 luna_fast_*.wav - Individual chunk files (no pauses version)");
    console.log("\n🎧 Listen to both versions to compare the difference!");
    
  } catch (error) {
    console.error("❌ Demo failed:", error);
  }
}

demonstrateSequenceBuilder().catch(console.error);
