import { AudioSequenceBuilder } from "./audio-sequence-builder.js";

async function quickExample() {
  console.log("⚡ Quick Audio Sequence Example\n");
  
  try {
    // Your script
    const myScript = `Hello everyone, welcome to today's presentation.

We'll be covering three main topics today. First, we'll discuss the current market trends and how they affect our strategy.

Second, we'll review our quarterly performance metrics and identify areas for improvement.

Finally, we'll outline our roadmap for the next quarter and set clear objectives for the team.

Thank you for your attention, and let's begin with the first topic.`;

    // Create builder with your confusion.wav voice
    const builder = new AudioSequenceBuilder("http://localhost:7860", {
      speakerAudio: "../confusion.wav",
      maxChunkLength: 120, // Break into smaller, manageable chunks
      pauseAtParagraphs: true,
      pauseDuration: 300, // Slightly longer pauses for presentations
    });

    await builder.connect();
    
    // Build the complete audio sequence
    await builder.buildSequence(myScript, "my_presentation.wav", "presentation");
    
    console.log("🎯 Success! Your presentation audio is ready:");
    console.log("📄 my_presentation.wav - Complete presentation with natural pauses");
    
  } catch (error) {
    console.error("❌ Failed:", error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  quickExample().catch(console.error);
}

export { quickExample };
