import { ZonosClient } from "./zonos-client.js";

async function definitiveTest() {
  console.log("🎯 DEFINITIVE TEST: What's in the prefix audio output?\n");
  
  try {
    const client = new ZonosClient("http://localhost:7860");
    await client.connect();
    
    // Create a VERY recognizable base
    console.log("🎵 Creating distinctive base audio...");
    const baseResult = await client.generateSpeech({
      text: "ALPHA BRAVO CHARLIE.",
      speakerAudio: "../confusion.wav",
      generation: { seed: 70000, randomizeSeed: false }
    });
    await client.saveAudio(baseResult, "distinctive_base.wav");
    console.log("✅ Base saved: distinctive_base.wav (should say: ALPHA BRAVO CHARLIE)\n");
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Now generate with COMPLETELY different content using prefix
    console.log("🔄 Generating with prefix using COMPLETELY different text...");
    const prefixResult = await client.generateSpeech({
      text: "DELTA ECHO FOXTROT GOLF HOTEL.",
      speakerAudio: "../confusion.wav",
      prefixAudio: "distinctive_base.wav",
      generation: { seed: 70001, randomizeSeed: false }
    });
    await client.saveAudio(prefixResult, "prefix_output.wav");
    console.log("✅ Prefix output saved: prefix_output.wav\n");
    
    // Compare file sizes
    const fs = await import('fs');
    const baseSize = fs.statSync("distinctive_base.wav").size;
    const prefixSize = fs.statSync("prefix_output.wav").size;
    
    console.log("📊 RESULTS:");
    console.log("=" .repeat(50));
    console.log(`Base audio size:   ${baseSize.toLocaleString()} bytes`);
    console.log(`Prefix output size: ${prefixSize.toLocaleString()} bytes`);
    console.log(`Size ratio: ${(prefixSize / baseSize).toFixed(2)}x`);
    
    if (prefixSize > baseSize * 1.5) {
      console.log("\n🎯 LIKELY ANSWER: The output contains BOTH audios!");
      console.log("   Prefix output should contain: 'ALPHA BRAVO CHARLIE' + 'DELTA ECHO FOXTROT...'");
    } else {
      console.log("\n🎯 LIKELY ANSWER: The output contains ONLY the new text!");
      console.log("   Prefix output should contain ONLY: 'DELTA ECHO FOXTROT...'");
    }
    
    console.log("\n🎧 LISTEN TO THESE FILES:");
    console.log("1. distinctive_base.wav - Should say: 'ALPHA BRAVO CHARLIE'");
    console.log("2. prefix_output.wav - Should contain: ??? (this answers your question!)");
    console.log("\nIf you hear BOTH phrases in prefix_output.wav, then prefix = COMBINED");
    console.log("If you hear ONLY the new phrase, then prefix = CONDITIONING ONLY");
    
  } catch (error) {
    console.error("❌ Failed:", error);
  }
}

definitiveTest().catch(console.error);
