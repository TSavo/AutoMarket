import { ZonosClient } from "./zonos-client.js";

async function analyzeAudioContents() {
  console.log("🎧 Analyzing Actual Audio Content\n");
  console.log("=" .repeat(50));
  
  try {
    const client = new ZonosClient("http://localhost:7860");
    await client.connect();
    console.log("✅ Connected\n");
    
    // Test 1: Very short base
    console.log("🎵 Test 1: Very short base");
    const shortResult = await client.generateSpeech({
      text: "One.",  // Extremely short
      speakerAudio: "../confusion.wav",
      generation: { seed: 60000, randomizeSeed: false }
    });
    await client.saveAudio(shortResult, "analyze_short.wav");
    console.log("📄 Saved: analyze_short.wav");
    
    // Wait
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Test 2: Continuation with very different, longer content
    console.log("\n🔄 Test 2: Continuation with much longer content");
    const continuationResult = await client.generateSpeech({
      text: "This is a much longer sentence that should be clearly different from the single word one.",
      speakerAudio: "../confusion.wav",
      prefixAudio: "analyze_short.wav",
      generation: { seed: 60001, randomizeSeed: false }
    });
    await client.saveAudio(continuationResult, "analyze_continuation.wav");
    console.log("📄 Saved: analyze_continuation.wav");
    
    // Test 3: Same long content WITHOUT prefix
    console.log("\n🆚 Test 3: Same long content WITHOUT prefix");
    const standaloneResult = await client.generateSpeech({
      text: "This is a much longer sentence that should be clearly different from the single word one.",
      speakerAudio: "../confusion.wav",
      generation: { seed: 60001, randomizeSeed: false }  // Same seed
    });
    await client.saveAudio(standaloneResult, "analyze_standalone.wav");
    console.log("📄 Saved: analyze_standalone.wav");
    
    // Analyze file sizes
    const fs = await import('fs');
    const shortSize = fs.statSync("analyze_short.wav").size;
    const continuationSize = fs.statSync("analyze_continuation.wav").size;
    const standaloneSize = fs.statSync("analyze_standalone.wav").size;
    
    console.log("\n📊 FILE SIZE ANALYSIS:");
    console.log("=" .repeat(50));
    console.log(`Short ("One"):              ${shortSize.toLocaleString()} bytes`);
    console.log(`Continuation (with prefix): ${continuationSize.toLocaleString()} bytes`);
    console.log(`Standalone (no prefix):     ${standaloneSize.toLocaleString()} bytes`);
    console.log(`\nDifference (continuation - standalone): ${(continuationSize - standaloneSize).toLocaleString()} bytes`);
    console.log(`Expected if combined: ~${(shortSize + standaloneSize).toLocaleString()} bytes`);
    
    if (continuationSize > standaloneSize + (shortSize * 0.7)) {
      console.log("\n✅ LIKELY COMBINED: Continuation file appears to contain both parts!");
      console.log("   The prefix audio was likely prepended to the new content.");
    } else if (Math.abs(continuationSize - standaloneSize) < (shortSize * 0.3)) {
      console.log("\n❓ LIKELY REPLACED: Similar sizes suggest prefix was used for conditioning only.");
    } else {
      console.log("\n🤔 UNCLEAR: Size pattern doesn't match either theory clearly.");
    }
    
    console.log("\n🎧 LISTENING INSTRUCTIONS:");
    console.log("=" .repeat(50));
    console.log("1. analyze_short.wav - Should say just 'One'");
    console.log("2. analyze_continuation.wav - What does this contain?");
    console.log("   a) If combined: Should start with 'One' then continue with the long sentence");
    console.log("   b) If replaced: Should only contain the long sentence");
    console.log("3. analyze_standalone.wav - Should only contain the long sentence");
    console.log("\nCompare files 2 and 3 to see if they're identical or different!");
    
  } catch (error) {
    console.error("❌ Failed:", error);
  }
}

analyzeAudioContents().catch(console.error);
