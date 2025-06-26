import { ZonosClient } from "./zonos-client.js";

async function testPrefixBehavior() {
  console.log("🔍 Testing Prefix Audio Behavior\n");
  console.log("=" .repeat(60));
  
  try {
    const client = new ZonosClient("http://localhost:7860");
    await client.connect();
    console.log("✅ Connected to Zonos TTS API\n");
    
    // Test 1: Generate a SHORT base audio
    console.log("🎵 Test 1: Generating SHORT base audio");
    console.log("-".repeat(50));
    
    const shortResult = await client.generateSpeech({
      text: "Hello world.",  // Very short
      speakerAudio: "../confusion.wav",
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 13.0,
        pitchStd: 40.0
      },
      generation: {
        cfgScale: 2.8,
        seed: 30000,
        randomizeSeed: false
      },
      emotion: {
        happiness: 0.5,
        neutral: 0.5
      }
    });
    
    await client.saveAudio(shortResult, "test_short_base.wav");
    console.log(`✅ Short base: test_short_base.wav`);
    console.log(`📊 Size: ${await getFileSize("test_short_base.wav")} bytes\n`);
    
    // Wait for file
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Generate continuation with VERY DIFFERENT content
    console.log("🔄 Test 2: Adding COMPLETELY different content with prefix");
    console.log("-".repeat(50));
    
    const continuationResult = await client.generateSpeech({
      text: "This is completely different content that should be clearly distinguishable from the hello world prefix.",  // Very different and longer
      speakerAudio: "../confusion.wav",
      prefixAudio: "test_short_base.wav", // Use short base as prefix
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 13.0,
        pitchStd: 40.0
      },
      generation: {
        cfgScale: 2.8,
        seed: 30001,
        randomizeSeed: false
      },
      emotion: {
        happiness: 0.5,
        neutral: 0.5
      }
    });
    
    await client.saveAudio(continuationResult, "test_with_prefix.wav");
    console.log(`✅ With prefix: test_with_prefix.wav`);
    console.log(`📊 Size: ${await getFileSize("test_with_prefix.wav")} bytes\n`);
    
    // Test 3: Generate the SAME new content WITHOUT prefix
    console.log("🆚 Test 3: Same new content WITHOUT prefix (for comparison)");
    console.log("-".repeat(50));
    
    const standaloneResult = await client.generateSpeech({
      text: "This is completely different content that should be clearly distinguishable from the hello world prefix.",  // Same text as Test 2
      speakerAudio: "../confusion.wav",
      // NO prefixAudio
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 13.0,
        pitchStd: 40.0
      },
      generation: {
        cfgScale: 2.8,
        seed: 30001, // Same seed as Test 2
        randomizeSeed: false
      },
      emotion: {
        happiness: 0.5,
        neutral: 0.5
      }
    });
    
    await client.saveAudio(standaloneResult, "test_without_prefix.wav");
    console.log(`✅ Without prefix: test_without_prefix.wav`);
    console.log(`📊 Size: ${await getFileSize("test_without_prefix.wav")} bytes\n`);
    
    // Analysis
    console.log("📊 FILE SIZE ANALYSIS:");
    console.log("=" .repeat(60));
    const shortSize = await getFileSize("test_short_base.wav");
    const prefixSize = await getFileSize("test_with_prefix.wav");
    const standaloneSize = await getFileSize("test_without_prefix.wav");
    
    console.log(`📄 Short base:     ${shortSize.toLocaleString()} bytes`);
    console.log(`📄 With prefix:    ${prefixSize.toLocaleString()} bytes`);
    console.log(`📄 Without prefix: ${standaloneSize.toLocaleString()} bytes`);
    console.log(`📊 Difference (prefix vs standalone): ${(prefixSize - standaloneSize).toLocaleString()} bytes`);
    console.log(`📊 Expected if combined: ~${(shortSize + standaloneSize).toLocaleString()} bytes`);
    
    if (prefixSize > standaloneSize + (shortSize * 0.8)) {
      console.log("✅ THEORY CONFIRMED: Prefix audio appears to be COMBINED with new content!");
      console.log("   The 'continuation' file contains BOTH the prefix AND the new audio.");
    } else {
      console.log("❓ THEORY UNCERTAIN: Size difference doesn't clearly indicate combination.");
    }
    
    console.log("\n🎧 LISTENING TEST:");
    console.log("1. Listen to test_short_base.wav - Should say 'Hello world'");
    console.log("2. Listen to test_with_prefix.wav - Should start with 'Hello world' then continue");
    console.log("3. Listen to test_without_prefix.wav - Should only have the new content");
    console.log("\nIf theory is correct, file #2 should be longer and contain both parts!");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
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

testPrefixBehavior().catch(console.error);
