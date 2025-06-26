import { Client } from "@gradio/client";

async function simpleTest() {
  console.log("🔍 Testing basic Gradio connection...\n");
  
  try {
    const client = await Client.connect("http://localhost:7860");
    console.log("✅ Connected to Gradio!");
    
    // Get the app info to see available functions
    console.log("📋 App configuration:");
    console.log(JSON.stringify(client.config, null, 2));
    
  } catch (error) {
    console.error("❌ Connection failed:", error);
  }
}

simpleTest().catch(console.error);
