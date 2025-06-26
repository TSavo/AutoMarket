import { ZonosClient } from "./zonos-client.js";

async function finalContinuationDemo() {
  console.log("🔄 Final Continuation Demo with confusion.wav\n");
  console.log("=" .repeat(60));
  
  try {
    const client = new ZonosClient("http://localhost:7860");
    await client.connect();
    console.log("✅ Connected to Zonos TTS API\n");
    
    // Step 1: Generate first audio segment using confusion.wav
    console.log("🎵 Step 1: Generating first segment with confusion.wav voice");
    console.log("-".repeat(55));
    
    const firstResult = await client.generateSpeech({
      text: "This is the beginning of our story. The voice you're hearing is cloned from the confusion audio file.",
      speakerAudio: "../confusion.wav",
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 13.0,
        pitchStd: 40.0,
        vqScore: 0.75
      },
      generation: {
        cfgScale: 2.8,
        seed: 10000,
        randomizeSeed: false
      },
      emotion: {
        happiness: 0.4,
        neutral: 0.6
      },
      unconditional: {
        emotion: false
      }
    });
    
    await client.saveAudio(firstResult, "continuation_1_base.wav");
    console.log(`✅ First segment saved: continuation_1_base.wav`);
    console.log(`🌱 Seed: ${firstResult.seed}`);
    console.log(`📊 File size: ${await getFileSize("continuation_1_base.wav")} bytes\n`);
    
    // Step 2: Try to use the first audio as prefix for continuation
    console.log("🔄 Step 2: Attempting continuation using first audio as prefix");
    console.log("-".repeat(55));
    
    // Wait a moment to ensure file is written
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const continuationResult = await client.generateSpeech({
        text: "And this is the seamless continuation of the story, building upon the previous audio segment.",
        speakerAudio: "../confusion.wav", // Keep same voice reference
        prefixAudio: "continuation_1_base.wav", // Use first part as prefix
        conditioning: {
          dnsmos: 4.5,
          speakingRate: 13.0, // Match first segment
          pitchStd: 40.0,
          vqScore: 0.75
        },
        generation: {
          cfgScale: 2.8,
          seed: 10001,
          randomizeSeed: false
        },
        emotion: {
          happiness: 0.6, // Slightly happier
          neutral: 0.4
        },
        unconditional: {
          emotion: false
        }
      });
      
      await client.saveAudio(continuationResult, "continuation_2_with_prefix.wav");
      console.log(`✅ Continuation with prefix: continuation_2_with_prefix.wav`);
      console.log(`🌱 Seed: ${continuationResult.seed}`);
      console.log(`📊 File size: ${await getFileSize("continuation_2_with_prefix.wav")} bytes`);
      console.log("🎉 SUCCESS: Prefix audio continuation worked!\n");
      
    } catch (error) {
      console.log("❌ Prefix continuation failed, trying alternative approach...");
      console.log(`Error: ${error}\n`);
      
      // Alternative: Generate with same settings but no prefix
      console.log("🔄 Step 2 Alternative: Same voice settings without prefix");
      console.log("-".repeat(55));
      
      const altResult = await client.generateSpeech({
        text: "This is the alternative continuation using the same voice and settings, but without audio prefix.",
        speakerAudio: "../confusion.wav", // Keep same voice reference
        conditioning: {
          dnsmos: 4.5,
          speakingRate: 13.0, // Match first segment
          pitchStd: 40.0,
          vqScore: 0.75
        },
        generation: {
          cfgScale: 2.8,
          seed: 10001, // Same seed for consistency
          randomizeSeed: false
        },
        emotion: {
          happiness: 0.6, // Slightly happier
          neutral: 0.4
        },
        unconditional: {
          emotion: false
        }
      });
      
      await client.saveAudio(altResult, "continuation_2_alternative.wav");
      console.log(`✅ Alternative continuation: continuation_2_alternative.wav`);
      console.log(`🌱 Seed: ${altResult.seed}\n`);
    }
    
    // Step 3: Generate third segment with even more emotion
    console.log("😊 Step 3: Final segment with increased emotion");
    console.log("-".repeat(55));
    
    const finalResult = await client.generateSpeech({
      text: "Finally, this concluding segment demonstrates the full emotional range while maintaining the cloned voice consistency throughout!",
      speakerAudio: "../confusion.wav",
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 15.0, // Slightly faster for excitement
        pitchStd: 55.0, // More variation for emotion
        vqScore: 0.75
      },
      generation: {
        cfgScale: 3.0, // Higher guidance for emotion
        seed: 10002,
        randomizeSeed: false
      },
      emotion: {
        happiness: 0.85, // Very happy
        surprise: 0.1,
        neutral: 0.05
      },
      unconditional: {
        emotion: false
      }
    });
    
    await client.saveAudio(finalResult, "continuation_3_final.wav");
    console.log(`✅ Final segment: continuation_3_final.wav`);
    console.log(`🌱 Seed: ${finalResult.seed}`);
    console.log(`📊 File size: ${await getFileSize("continuation_3_final.wav")} bytes\n`);
    
    // Summary
    console.log("🎊 Final Continuation Demo Complete!");
    console.log("=" .repeat(60));
    console.log("Generated sequence:");
    console.log("📄 1. continuation_1_base.wav - Base segment with confusion.wav voice");
    console.log("📄 2. continuation_2_*.wav - Continuation attempt");
    console.log("📄 3. continuation_3_final.wav - Final segment with high emotion");
    console.log("\n🎭 All segments use confusion.wav as voice reference");
    console.log("📈 Emotional progression: neutral → happy → very excited");
    console.log("🔄 Demonstrates voice cloning consistency across multiple generations");
    console.log("🎵 Compare the files to hear the voice consistency and emotional changes!");
    
  } catch (error) {
    console.error("❌ Demo failed:", error);
  }
}

async function getFileSize(filePath: string): Promise<number> {
  try {
    const fs = await import('fs');
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

finalContinuationDemo().catch(console.error);
