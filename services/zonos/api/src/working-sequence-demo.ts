import { AudioSequenceBuilder } from "./audio-sequence-builder.js";

async function createWorkingSequence() {
  console.log("🔧 Creating WORKING Audio Sequence (Using New Builder)\n");
  console.log("=" .repeat(60));
  
  try {
    // Example script
    const script = `Welcome to our story about Luna the fox. She was known throughout the forest for her quick wit and mysterious abilities.

Luna lived in an enchanted forest where ancient trees whispered secrets to those who listened carefully. Every morning, she would wake up to the sound of birds singing.

One day, while exploring a hidden grove, Luna discovered something amazing. There, in the center of the clearing, stood the legendary Tree of Wisdom.

From that day forward, Luna became the guardian of the forest. And they all lived happily ever after.`;

    // Create the sequence builder with your voice settings
    const builder = new AudioSequenceBuilder("http://localhost:7860", {
      speakerAudio: "../confusion.wav",
      maxChunkLength: 140, // Natural sentence breaks
      pauseAtParagraphs: true,
      pauseDuration: 2000, // 300ms pauses between paragraphs
      pauseBetweenChunks: true,
      chunkPauseDuration: 1000, // 200ms pauses between chunks
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
          baseSeed: 95000
        },
        emotion: {
          happiness: 0.6,
          neutral: 0.4
        }
      }
    });

    await builder.connect();
    console.log("✅ Connected to Zonos TTS API\n");
    
    // Preview the chunks first
    console.log("📋 Script will be broken into these chunks:");
    console.log("-".repeat(50));
    const chunks = builder.previewChunks(script);
    chunks.forEach((chunk, index) => {
      console.log(`${index + 1}. "${chunk.text.substring(0, 60)}${chunk.text.length > 60 ? '...' : ''}"`);
      console.log(`   Length: ${chunk.text.length} chars${chunk.isParagraphBreak ? ' [PARAGRAPH BREAK]' : ''}\n`);
    });
    
    // Build the complete sequence
    console.log("🚀 Building complete audio sequence...");
    console.log("-".repeat(50));
    await builder.buildSequence(script, "luna_story_complete.wav", "luna_chunk");

    console.log("\n✨ Success!");
    console.log("=" .repeat(60));
    console.log("🎵 luna_story_complete.wav - Complete story with natural pauses");
    console.log("📁 luna_chunk_*.wav - Individual chunk files");
    console.log("\n🎧 Listen to luna_story_complete.wav to hear the seamless story!");
    console.log("🔧 This approach WORKS unlike the broken prefix continuation!");
    
  } catch (error) {
    console.error("❌ Failed:", error);
  }
}

createWorkingSequence().catch(console.error);
