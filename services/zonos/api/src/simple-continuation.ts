import { ZonosClient } from "./zonos-client.js";

async function simpleContinuationDemo() {
  console.log("🔄 Simple Continuation Demo\n");
  console.log("=" .repeat(50));
  
  try {
    const client = new ZonosClient("http://localhost:7860");
    await client.connect();
    console.log("✅ Connected to Zonos TTS API\n");
    
    // Step 1: Generate first audio segment (no speaker cloning first)
    console.log("🎵 Step 1: Generating first audio segment");
    console.log("-".repeat(40));
    
    const firstResult = await client.generateSpeech({
      text: "This is the beginning of our story. The weather was perfect that morning.",
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 13.0,
        pitchStd: 40.0
      },
      generation: {
        cfgScale: 2.5,
        seed: 1000,
        randomizeSeed: false
      },
      emotion: {
        happiness: 0.3,
        neutral: 0.7
      },
      unconditional: {
        emotion: false
      }
    });
    
    await client.saveAudio(firstResult, "simple_part1.wav");
    console.log(`✅ First part generated: simple_part1.wav`);
    console.log(`🌱 Seed: ${firstResult.seed}\n`);
    
    // Step 2: Continue from the first part
    console.log("🔄 Step 2: Continuing the story from part 1");
    console.log("-".repeat(40));
    
    // Wait a moment to ensure file is written
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const continuationResult = await client.generateSpeech({
      text: "Birds were singing in the trees, and I decided to take a walk through the park.",
      prefixAudio: "simple_part1.wav", // Continue from first part
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 13.0, // Match first part
        pitchStd: 40.0
      },
      generation: {
        cfgScale: 2.5,
        seed: 1001,
        randomizeSeed: false
      },
      emotion: {
        happiness: 0.5, // Slightly happier
        neutral: 0.5
      },
      unconditional: {
        emotion: false
      }
    });
    
    await client.saveAudio(continuationResult, "simple_part2.wav");
    console.log(`✅ Continuation generated: simple_part2.wav`);
    console.log(`🌱 Seed: ${continuationResult.seed}\n`);
    
    // Step 3: Third part with different emotion
    console.log("😊 Step 3: Final part with happy emotion");
    console.log("-".repeat(40));
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const finalResult = await client.generateSpeech({
      text: "The flowers were blooming beautifully, and I felt joy fill my heart as I enjoyed this perfect day.",
      prefixAudio: "simple_part2.wav", // Continue from second part
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 14.0, // Slightly faster for excitement
        pitchStd: 50.0 // More variation for emotion
      },
      generation: {
        cfgScale: 2.8,
        seed: 1002,
        randomizeSeed: false
      },
      emotion: {
        happiness: 0.8, // Much happier
        neutral: 0.2
      },
      unconditional: {
        emotion: false
      }
    });
    
    await client.saveAudio(finalResult, "simple_part3.wav");
    console.log(`✅ Final part generated: simple_part3.wav`);
    console.log(`🌱 Seed: ${finalResult.seed}\n`);
    
    // Summary
    console.log("🎊 Simple Continuation Demo Complete!");
    console.log("=" .repeat(50));
    console.log("Story sequence generated:");
    console.log("📄 1. simple_part1.wav - Beginning (neutral)");
    console.log("📄 2. simple_part2.wav - Middle (slightly happy)");
    console.log("📄 3. simple_part3.wav - End (very happy)");
    console.log("\n🎵 Each part continues seamlessly from the previous!");
    console.log("📈 Emotions progress from neutral to happy throughout the story.");
    
  } catch (error) {
    console.error("❌ Demo failed:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
  }
}

simpleContinuationDemo().catch(console.error);
