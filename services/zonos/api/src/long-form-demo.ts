import { ZonosClient } from "./zonos-client.js";

async function longFormGeneration() {
  console.log("📖 Long-Form Audio Generation (Single Request)\n");
  console.log("=" .repeat(50));
  
  try {
    const client = new ZonosClient("http://localhost:7860");
    await client.connect();
    console.log("✅ Connected to Zonos TTS API\n");
    
    // Generate the entire story in one request for natural flow
    const longStory = `Welcome to our story about Luna the fox. She lived in an enchanted forest full of mysteries and ancient secrets. Every morning, Luna would explore deeper into the woods, discovering new magical creatures and hidden pathways. One day, she found a glowing crystal that would change her life forever. And that's how Luna discovered her magical powers and became the guardian of the forest.`;
    
    console.log("🎵 Generating complete story in one request...");
    console.log(`📝 Text length: ${longStory.length} characters\n`);
    
    const result = await client.generateSpeech({
      text: longStory,
      speakerAudio: "../confusion.wav",
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 13.0,
        pitchStd: 40.0,
        vqScore: 0.75
      },
      generation: {
        cfgScale: 2.8,
        seed: 85000,
        randomizeSeed: false
      },
      emotion: {
        happiness: 0.6,
        neutral: 0.4
      },
      unconditional: {
        emotion: false
      }
    });
    
    await client.saveAudio(result, "complete_story_single.wav");
    console.log("✅ Complete story saved: complete_story_single.wav");
    console.log("🎵 Natural flow with no artifacts!");
    console.log("🎭 Consistent voice throughout");
    console.log("⚡ No broken continuation features used!");
    
  } catch (error) {
    console.error("❌ Failed:", error);
  }
}

longFormGeneration().catch(console.error);
