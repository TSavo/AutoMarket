import { ZonosClient } from "./zonos-client.js";

async function examineRawOutput() {
  console.log("🔍 Examining RAW API Output with Prefix\n");
  console.log("=" .repeat(50));
  
  try {
    const client = new ZonosClient("http://localhost:7860");
    await client.connect();
    console.log("✅ Connected\n");
    
    // Load the confusion audio as buffer
    const fs = await import('fs');
    const confusionBuffer = fs.readFileSync("../confusion.wav");
    console.log(`📁 Loaded confusion.wav: ${confusionBuffer.length} bytes\n`);
    
    // Generate base audio first
    console.log("🎵 Generating base audio...");
    const baseRawResult = await (client as any).client.predict(2, [
      "Zyphra/Zonos-v0.1-transformer", "Short base.",
      "en-us", confusionBuffer, null,
      0.5, 0.05, 0.05, 0.05, 0.05, 0.05, 0.1, 0.3,
      0.78, 24000, 45.0, 15.0, 4.0, false,
      2.0, 0, 0, 0, 0.5, 0.40, 0.00, 50000, false, ["emotion"]
    ]);
    
    console.log("📊 Base result data length:", baseRawResult?.data?.length);
    if (baseRawResult?.data?.[0]?.url) {
      // Download the base audio to use as prefix
      const response = await fetch(baseRawResult.data[0].url);
      const baseAudioBuffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync("temp_base.wav", baseAudioBuffer);
      console.log(`💾 Saved base audio: ${baseAudioBuffer.length} bytes\n`);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Now generate WITH prefix
      console.log("🔄 Generating WITH prefix...");
      const prefixBuffer = fs.readFileSync("temp_base.wav");
      
      const prefixRawResult = await (client as any).client.predict(2, [
        "Zyphra/Zonos-v0.1-transformer", "Continuation text.",
        "en-us", confusionBuffer, prefixBuffer,  // <- PREFIX AUDIO HERE
        0.5, 0.05, 0.05, 0.05, 0.05, 0.05, 0.1, 0.3,
        0.78, 24000, 45.0, 15.0, 4.0, false,
        2.0, 0, 0, 0, 0.5, 0.40, 0.00, 50001, false, ["emotion"]
      ]);
      
      console.log("\n🎯 RAW RESULT WITH PREFIX:");
      console.log("Data array length:", prefixRawResult?.data?.length);
      console.log("Full result structure:");
      console.log(JSON.stringify(prefixRawResult, null, 2));
      
      // Generate WITHOUT prefix for comparison
      console.log("\n🆚 Generating WITHOUT prefix...");
      const noPrefixRawResult = await (client as any).client.predict(2, [
        "Zyphra/Zonos-v0.1-transformer", "Continuation text.",
        "en-us", confusionBuffer, null,  // <- NO PREFIX AUDIO
        0.5, 0.05, 0.05, 0.05, 0.05, 0.05, 0.1, 0.3,
        0.78, 24000, 45.0, 15.0, 4.0, false,
        2.0, 0, 0, 0, 0.5, 0.40, 0.00, 50001, false, ["emotion"]
      ]);
      
      console.log("\n🎯 RAW RESULT WITHOUT PREFIX:");
      console.log("Data array length:", noPrefixRawResult?.data?.length);
      console.log("Full result structure:");
      console.log(JSON.stringify(noPrefixRawResult, null, 2));
      
      console.log("\n📊 ANALYSIS:");
      console.log(`With prefix outputs: ${prefixRawResult?.data?.length || 0}`);
      console.log(`Without prefix outputs: ${noPrefixRawResult?.data?.length || 0}`);
      
      if (prefixRawResult?.data?.length > noPrefixRawResult?.data?.length) {
        console.log("🚨 MORE OUTPUTS WITH PREFIX! Multiple files returned!");
      } else {
        console.log("📋 Same number of outputs");
      }
    }
    
  } catch (error) {
    console.error("❌ Failed:", error);
  }
}

examineRawOutput().catch(console.error);
