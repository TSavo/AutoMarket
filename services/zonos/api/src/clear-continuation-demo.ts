import { ZonosClient } from "./zonos-client.js";

async function clearContinuationDemo() {
  console.log("🔄 Clear Continuation Demo - Distinct Content\n");
  console.log("=" .repeat(60));
  
  try {
    const client = new ZonosClient("http://localhost:7860");
    await client.connect();
    console.log("✅ Connected to Zonos TTS API\n");
    
    // Step 1: Generate first audio segment - START OF STORY
    console.log("📖 Step 1: Beginning of the story");
    console.log("-".repeat(45));
    
    const part1Result = await client.generateSpeech({
      text: "Once upon a time, there was a magical forest where ancient trees whispered secrets to those who listened carefully.",
      speakerAudio: "../confusion.wav",
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 13.0,
        pitchStd: 40.0,
        vqScore: 0.75
      },
      generation: {
        cfgScale: 2.8,
        seed: 20000,
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
    
    await client.saveAudio(part1Result, "story_part1_beginning.wav");
    console.log(`✅ Part 1 saved: story_part1_beginning.wav`);
    console.log(`🌱 Seed: ${part1Result.seed}`);
    console.log(`📝 Content: "Once upon a time..." (Beginning)\n`);
    
    // Wait for file to be written
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Step 2: Continue the story using part 1 as prefix
    console.log("🔄 Step 2: Continuing the story with prefix audio");
    console.log("-".repeat(45));
    
    const part2Result = await client.generateSpeech({
      text: "In this enchanted place lived a young fox named Luna, who had the extraordinary ability to understand the language of all creatures.",
      speakerAudio: "../confusion.wav", // Same voice
      prefixAudio: "story_part1_beginning.wav", // Continue from part 1
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 13.0, // Same pace
        pitchStd: 40.0,
        vqScore: 0.75
      },
      generation: {
        cfgScale: 2.8,
        seed: 20001,
        randomizeSeed: false
      },
      emotion: {
        happiness: 0.5, // Slightly more engaged
        neutral: 0.5
      },
      unconditional: {
        emotion: false
      }
    });
    
    await client.saveAudio(part2Result, "story_part2_continuation.wav");
    console.log(`✅ Part 2 saved: story_part2_continuation.wav`);
    console.log(`🌱 Seed: ${part2Result.seed}`);
    console.log(`📝 Content: "In this enchanted place..." (Middle)\n`);
    
    // Wait for file to be written
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Step 3: Final part of the story
    console.log("🎬 Step 3: Dramatic conclusion");
    console.log("-".repeat(45));
    
    const part3Result = await client.generateSpeech({
      text: "One day, Luna discovered a hidden grove where the Tree of Wisdom stood, glowing with golden light and holding the answers to all mysteries!",
      speakerAudio: "../confusion.wav",
      prefixAudio: "story_part2_continuation.wav", // Continue from part 2
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 15.0, // Faster for excitement
        pitchStd: 55.0, // More variation for drama
        vqScore: 0.75
      },
      generation: {
        cfgScale: 3.0, // Higher guidance for emotion
        seed: 20002,
        randomizeSeed: false
      },
      emotion: {
        happiness: 0.7,
        surprise: 0.2,
        neutral: 0.1
      },
      unconditional: {
        emotion: false
      }
    });
    
    await client.saveAudio(part3Result, "story_part3_conclusion.wav");
    console.log(`✅ Part 3 saved: story_part3_conclusion.wav`);
    console.log(`🌱 Seed: ${part3Result.seed}`);
    console.log(`📝 Content: "One day, Luna discovered..." (Conclusion)\n`);
    
    // Generate comparison WITHOUT continuation
    console.log("🆚 Step 4: Generating standalone comparison");
    console.log("-".repeat(45));
    
    const standaloneResult = await client.generateSpeech({
      text: "In this enchanted place lived a young fox named Luna, who had the extraordinary ability to understand the language of all creatures.",
      speakerAudio: "../confusion.wav", // Same voice but NO prefix
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 13.0,
        pitchStd: 40.0,
        vqScore: 0.75
      },
      generation: {
        cfgScale: 2.8,
        seed: 20001, // Same seed as part 2
        randomizeSeed: false
      },
      emotion: {
        happiness: 0.5,
        neutral: 0.5
      },
      unconditional: {
        emotion: false
      }
    });
    
    await client.saveAudio(standaloneResult, "story_standalone_comparison.wav");
    console.log(`✅ Standalone saved: story_standalone_comparison.wav`);
    console.log(`📝 Same text as Part 2 but WITHOUT prefix audio\n`);
    
    // Summary
    console.log("🎊 Clear Continuation Demo Complete!");
    console.log("=" .repeat(60));
    console.log("📚 STORY SEQUENCE:");
    console.log("1️⃣ story_part1_beginning.wav - 'Once upon a time...'");
    console.log("2️⃣ story_part2_continuation.wav - 'In this enchanted place...' (WITH prefix)");
    console.log("3️⃣ story_part3_conclusion.wav - 'One day, Luna discovered...' (WITH prefix)");
    console.log("🆚 story_standalone_comparison.wav - Same as Part 2 but WITHOUT prefix");
    console.log("\n🎧 LISTENING TEST:");
    console.log("🔍 Compare Part 2 WITH prefix vs standalone WITHOUT prefix");
    console.log("🎵 Listen for voice continuity and flow differences");
    console.log("📈 Notice how emotions progress through the story");
    console.log("🎭 All use the same confusion.wav voice clone");
    
  } catch (error) {
    console.error("❌ Demo failed:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
  }
}

clearContinuationDemo().catch(console.error);
