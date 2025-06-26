import { ZonosClient } from "./zonos-client.js";

async function examineRawOutputWithPrefix() {
  console.log("🔍 Examining RAW Output Structure with Prefix Audio\n");
  console.log("=" .repeat(60));
  
  try {
    const client = new ZonosClient("http://localhost:7860");
    await client.connect();
    console.log("✅ Connected to Zonos TTS API\n");
    
    // First generate a base audio
    console.log("🎵 Step 1: Generate base audio");
    console.log("-".repeat(40));
    
    const baseResult = await client.generateSpeech({
      text: "Base audio test.",
      speakerAudio: "../confusion.wav",
      generation: { seed: 40000, randomizeSeed: false }
    });
    
    await client.saveAudio(baseResult, "raw_test_base.wav");
    console.log(`✅ Base saved: raw_test_base.wav\n`);
    
    // Wait for file
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Now test WITH prefix and examine the RAW response
    console.log("🔍 Step 2: Generate with prefix - EXAMINING RAW RESPONSE");
    console.log("-".repeat(40));
    
    // Call the raw API directly to see ALL outputs
    const rawResult = await (client as any).client.predict(2, [
      "Zyphra/Zonos-v0.1-transformer",    // model_choice
      "Continuation test with prefix.",     // text
      "en-us",                             // language
      await loadAudioAsBuffer("../confusion.wav"),     // speaker_audio
      await loadAudioAsBuffer("raw_test_base.wav"),    // prefix_audio - KEY!
      0.5, 0.05, 0.05, 0.05, 0.05, 0.05, 0.1, 0.3,   // emotions
      0.78, 24000, 45.0, 15.0, 4.0,                   // conditioning
      false,                                           // speaker_noised
      2.0, 0, 0, 0, 0.5, 0.40, 0.00,                  // generation params
      40001, false,                                    // seed, randomize
      ["emotion"]                                      // unconditional_keys
    ]);
    
    console.log("🎯 RAW RESULT WITH PREFIX:");
    console.log("=" .repeat(50));
    console.log(JSON.stringify(rawResult, null, 2));
    
    if (rawResult && rawResult.data && Array.isArray(rawResult.data)) {
      console.log("\n🔍 DETAILED DATA ANALYSIS:");
      console.log(`📊 Number of data elements: ${rawResult.data.length}`);
      
      rawResult.data.forEach((item, index) => {
        console.log(`\n[${index}] Type: ${typeof item}`);
        if (typeof item === 'object' && item !== null) {
          console.log(`    Properties: ${Object.keys(item).join(', ')}`);
          if (item.url) {
            console.log(`    URL: ${item.url}`);
          }
          if (item.path) {
            console.log(`    Path: ${item.path}`);
          }
          if (item.size !== undefined) {
            console.log(`    Size: ${item.size}`);
          }
        } else {
          console.log(`    Value: ${item}`);
        }
      });
    }
    
    // Compare with NO prefix
    console.log("\n🆚 Step 3: Same content WITHOUT prefix for comparison");
    console.log("-".repeat(40));
    
    const rawResultNoPrefix = await (client as any).client.predict(2, [
      "Zyphra/Zonos-v0.1-transformer",    // model_choice
      "Continuation test with prefix.",     // SAME text
      "en-us",                             // language
      await loadAudioAsBuffer("../confusion.wav"),     // speaker_audio
      null,                                            // NO prefix_audio
      0.5, 0.05, 0.05, 0.05, 0.05, 0.05, 0.1, 0.3,   // emotions
      0.78, 24000, 45.0, 15.0, 4.0,                   // conditioning
      false,                                           // speaker_noised
      2.0, 0, 0, 0, 0.5, 0.40, 0.00,                  // generation params
      40001, false,                                    // SAME seed
      ["emotion"]                                      // unconditional_keys
    ]);
    
    console.log("\n🎯 RAW RESULT WITHOUT PREFIX:");
    console.log("=" .repeat(50));
    console.log(JSON.stringify(rawResultNoPrefix, null, 2));
    
    console.log("\n📊 COMPARISON:");
    console.log("=" .repeat(50));
    console.log(`With prefix data count: ${rawResult?.data?.length || 0}`);
    console.log(`Without prefix data count: ${rawResultNoPrefix?.data?.length || 0}`);
    
    if (rawResult?.data?.length !== rawResultNoPrefix?.data?.length) {
      console.log("🚨 DIFFERENT OUTPUT COUNTS! This might explain the confusion!");
    } else {
      console.log("📋 Same output count - examining differences...");
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

async function loadAudioAsBuffer(filePath: string): Promise<Buffer> {
  const fs = await import('fs');
  const path = await import('path');
  
  let fullPath = filePath;
  if (!path.isAbsolute(filePath)) {
    fullPath = path.resolve(process.cwd(), filePath);
  }
  
  return fs.readFileSync(fullPath);
}

examineRawOutputWithPrefix().catch(console.error);
