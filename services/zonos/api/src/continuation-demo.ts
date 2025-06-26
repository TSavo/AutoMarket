import { ZonosClient } from "./zonos-client.js";

async function continuationDemo() {
  console.log("🎭 Zonos Continuation Demo using confusion.wav\n");
  console.log("=" .repeat(60));
  
  try {
    const client = new ZonosClient("http://localhost:7860");
    await client.connect();
    console.log("✅ Connected to Zonos TTS API\n");
    
    // Step 1: Generate first audio segment using confusion.wav as reference
    console.log("🎵 Step 1: Generating first audio segment with confusion.wav reference");
    console.log("-".repeat(50));
    
    const firstResult = await client.generateSpeech({
      text: "This is the first part of our speech demonstration. I'm using the confusion audio as my voice reference.",
      speakerAudio: "../confusion.wav",
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 14.0,
        pitchStd: 45.0,
        vqScore: 0.75
      },
      generation: {
        cfgScale: 2.8,
        seed: 12345,
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
    
    await client.saveAudio(firstResult, "continuation_part1.wav");
    console.log(`✅ First segment generated: continuation_part1.wav`);
    console.log(`🌱 Seed used: ${firstResult.seed}`);
    console.log(`🔗 URL: ${firstResult.url}\n`);
    
    // Step 2: Use the first generated audio as prefix for continuation
    console.log("🔄 Step 2: Continuing from the first audio segment");
    console.log("-".repeat(50));
    
    // For the continuation, we'll use the generated audio as prefix
    // Note: We need to use the file path to the saved audio
    const continuationResult = await client.generateSpeech({
      text: "And this is the continuation of the speech, seamlessly flowing from where the first part ended. Notice how the voice maintains consistency.",
      speakerAudio: "../confusion.wav", // Keep same speaker reference
      prefixAudio: "continuation_part1.wav", // Use first part as prefix
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 14.0, // Match the first part's rate
        pitchStd: 45.0,
        vqScore: 0.75
      },
      generation: {
        cfgScale: 2.8,
        seed: 12346, // Different seed for variation
        randomizeSeed: false
      },
      emotion: {
        happiness: 0.7, // Slightly more happy for the continuation
        neutral: 0.3
      },
      unconditional: {
        emotion: false
      }
    });
    
    await client.saveAudio(continuationResult, "continuation_part2.wav");
    console.log(`✅ Continuation generated: continuation_part2.wav`);
    console.log(`🌱 Seed used: ${continuationResult.seed}`);
    console.log(`🔗 URL: ${continuationResult.url}\n`);
    
    // Step 3: Generate a third segment with different emotion
    console.log("🎭 Step 3: Third segment with different emotion");
    console.log("-".repeat(50));
    
    const thirdResult = await client.generateSpeech({
      text: "Finally, this third segment demonstrates how we can change emotions while maintaining voice consistency throughout the entire sequence.",
      speakerAudio: "../confusion.wav",
      prefixAudio: "continuation_part2.wav", // Chain from second part
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 16.0, // Slightly faster for excitement
        pitchStd: 55.0, // More variation
        vqScore: 0.75
      },
      generation: {
        cfgScale: 3.0,
        seed: 12347,
        randomizeSeed: false
      },
      emotion: {
        happiness: 0.8, // Even more excited
        surprise: 0.1,
        neutral: 0.1
      },
      unconditional: {
        emotion: false
      }
    });
    
    await client.saveAudio(thirdResult, "continuation_part3.wav");
    console.log(`✅ Third segment generated: continuation_part3.wav`);
    console.log(`🌱 Seed used: ${thirdResult.seed}`);
    console.log(`🔗 URL: ${thirdResult.url}\n`);
    
    // Summary
    console.log("🎊 Continuation Demo Complete!");
    console.log("=" .repeat(60));
    console.log("Generated sequence:");
    console.log("📄 1. continuation_part1.wav - Initial segment (neutral/happy)");
    console.log("📄 2. continuation_part2.wav - Continuation from part 1 (more happy)");
    console.log("📄 3. continuation_part3.wav - Final segment from part 2 (excited)");
    console.log("\n🎵 Each part uses the previous as a prefix for seamless continuation!");
    console.log("🎭 All parts use confusion.wav as the voice reference for consistency.");
    console.log("📈 Emotions gradually increase from neutral to excited across the sequence.");
    
    // Bonus: Generate a standalone comparison without continuation
    console.log("\n🔬 Bonus: Generating comparison without continuation...");
    const standaloneResult = await client.generateSpeech({
      text: "This is the same voice but without any prefix audio, demonstrating the difference when not using continuation.",
      speakerAudio: "../confusion.wav",
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 14.0,
        pitchStd: 45.0,
        vqScore: 0.75
      },
      generation: {
        cfgScale: 2.8,
        seed: 99999
      }
    });
    
    await client.saveAudio(standaloneResult, "standalone_comparison.wav");
    console.log("✅ Standalone comparison saved: standalone_comparison.wav");
    console.log("\n🎧 Listen to all files to hear the difference between continuation and standalone generation!");
    
  } catch (error) {
    console.error("❌ Demo failed:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
  }
}

continuationDemo().catch(console.error);
