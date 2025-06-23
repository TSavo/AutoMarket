/**
 * TTS Audio File Generation Test
 * 
 * Generates sample audio files for manual listening and verification
 */

import { initializeProviders, getProvider } from './src/media/registry/bootstrap';
import { Text } from './src/media/assets/roles';
import { HuggingFaceDockerProvider } from './src/media/providers/docker/huggingface/HuggingFaceDockerProvider';
import * as fs from 'fs';
import * as path from 'path';

async function generateSampleAudioFiles() {
  console.log('🎧 Generating Sample Audio Files for Manual Testing...\n');

  try {
    // Initialize provider
    await initializeProviders();
    const provider = await getProvider('huggingface-docker') as unknown as HuggingFaceDockerProvider;
    
    if (!provider || !await provider.isAvailable()) {
      throw new Error('HuggingFace provider not available');
    }

    const speechT5Model = await provider.getModel('microsoft/speecht5_tts');

    // Create output directory
    const outputDir = path.join(process.cwd(), 'generated-audio-samples');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${outputDir}`);
    }

    // Test scenarios
    const testScenarios = [
      {
        name: 'basic-greeting',
        text: 'Hello! Welcome to the SpeechT5 text-to-speech demonstration.',
        options: { voice: 'default', speed: 1.0, pitch: 0.0 },
        description: 'Basic greeting with default voice'
      },
      {
        name: 'fast-paced',
        text: 'This is an example of fast-paced speech generation using SpeechT5.',
        options: { voice: 'default', speed: 1.5, pitch: 0.0 },
        description: 'Fast speech (1.5x speed)'
      },
      {
        name: 'slow-deliberate',
        text: 'This demonstrates slow and deliberate speech for better clarity.',
        options: { voice: 'default', speed: 0.7, pitch: 0.0 },
        description: 'Slow speech (0.7x speed)'
      },
      {
        name: 'higher-pitch',
        text: 'Here is an example with a higher pitch voice.',
        options: { voice: 'default', speed: 1.0, pitch: 0.4 },
        description: 'Higher pitch voice'
      },
      {
        name: 'lower-pitch',
        text: 'This sample demonstrates a lower pitch voice.',
        options: { voice: 'default', speed: 1.0, pitch: -0.4 },
        description: 'Lower pitch voice'
      },
      {
        name: 'technical-content',
        text: 'SpeechT5 utilizes transformer architecture with multimodal capabilities for high-quality speech synthesis.',
        options: { voice: 'default', speed: 1.0, pitch: 0.0 },
        description: 'Technical content'
      },
      {
        name: 'multilingual-english',
        text: 'This is an English sentence demonstrating multilingual capabilities.',
        options: { voice: 'default', language: 'en' },
        description: 'English language'
      },
      {
        name: 'multilingual-spanish',
        text: 'Esta es una oración en español que demuestra las capacidades multilingües.',
        options: { voice: 'default', language: 'es' },
        description: 'Spanish language'
      },
      {
        name: 'numbers-and-punctuation',
        text: 'The price is $29.99, and the quantity is 1,234 units. That\'s a 15% discount!',
        options: { voice: 'default', speed: 1.0 },
        description: 'Numbers and punctuation'
      },
      {
        name: 'long-paragraph',
        text: 'Artificial intelligence and machine learning have transformed numerous industries, from healthcare and finance to transportation and entertainment. Text-to-speech technology represents one of the most accessible applications of AI, enabling natural human-computer interaction through voice synthesis. Modern neural models like SpeechT5 can produce remarkably human-like speech with proper intonation, emotion, and clarity.',
        options: { voice: 'default', speed: 1.0 },
        description: 'Long paragraph (natural flow)'
      }
    ];    console.log(`🎯 Generating ${testScenarios.length} audio samples...\n`);

    interface AudioResult {
      name: string;
      description: string;
      filename?: string;
      size?: string;
      generationTime?: number;
      success: boolean;
      textLength?: number;
      options?: any;
      error?: string;
    }

    const results: AudioResult[] = [];

    for (const scenario of testScenarios) {
      try {
        console.log(`🔄 Generating: ${scenario.name}`);
        console.log(`   Text: "${scenario.text.substring(0, 60)}${scenario.text.length > 60 ? '...' : ''}"`);
        console.log(`   Options: ${JSON.stringify(scenario.options)}`);

        const startTime = Date.now();
        const textInput = new Text(scenario.text, scenario.options.language || 'en', 1.0);
        const audio = await speechT5Model.transform(textInput, scenario.options);
        const generationTime = Date.now() - startTime;

        // Get the temporary file path from metadata
        let sourceFilePath = null;
        if (audio.metadata) {
          sourceFilePath = audio.metadata.filePath || audio.metadata.sourceUrl;
        }

        // Copy to our output directory with a better name
        const outputFileName = `${scenario.name}.wav`;
        const outputFilePath = path.join(outputDir, outputFileName);

        if (sourceFilePath && fs.existsSync(sourceFilePath)) {
          fs.copyFileSync(sourceFilePath, outputFilePath);
          console.log(`   ✅ Saved: ${outputFileName} (${audio.getHumanSize()}, ${generationTime}ms)`);
          
          results.push({
            name: scenario.name,
            description: scenario.description,
            filename: outputFileName,
            size: audio.getHumanSize(),
            generationTime,
            success: true,
            textLength: scenario.text.length,
            options: scenario.options
          });
        } else {
          console.log(`   ⚠️  Generated but could not save file: ${scenario.name}`);
          results.push({
            name: scenario.name,
            description: scenario.description,
            success: false,
            error: 'Could not locate generated file'
          });
        }

      } catch (error) {
        console.log(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.push({
          name: scenario.name,
          description: scenario.description,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Generate summary report
    const reportPath = path.join(outputDir, 'generation-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      totalSamples: testScenarios.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      model: 'microsoft/speecht5_tts',
      provider: 'huggingface-docker',
      samples: results
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate HTML report for easy viewing
    const htmlReport = generateHTMLReport(report, outputDir);
    const htmlPath = path.join(outputDir, 'report.html');
    fs.writeFileSync(htmlPath, htmlReport);

    console.log('\n📊 Generation Summary:');
    console.log(`   Total samples: ${report.totalSamples}`);
    console.log(`   Successful: ${report.successful}`);
    console.log(`   Failed: ${report.failed}`);
    console.log(`   Success rate: ${Math.round(report.successful / report.totalSamples * 100)}%`);

    if (report.successful > 0) {
      const avgTime = results
        .filter(r => r.success && r.generationTime)
        .reduce((sum, r) => sum + r.generationTime!, 0) / report.successful;
      console.log(`   Average generation time: ${Math.round(avgTime)}ms`);
    }

    console.log(`\n📁 Files generated in: ${outputDir}`);
    console.log(`📄 JSON Report: generation-report.json`);
    console.log(`🌐 HTML Report: report.html`);

    if (report.successful > 0) {
      console.log('\n🎧 Audio files ready for listening:');
      results.filter(r => r.success).forEach(r => {
        console.log(`   • ${r.filename} - ${r.description} (${r.size})`);
      });
    }

    console.log('\n🎉 Audio file generation completed!');

  } catch (error) {
    console.error('\n❌ Audio generation failed:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

function generateHTMLReport(report: any, outputDir: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SpeechT5 TTS Generation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #007acc; padding-bottom: 10px; }
        .summary { background: #e8f4f8; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .summary-item { text-align: center; }
        .summary-item .value { font-size: 24px; font-weight: bold; color: #007acc; }
        .summary-item .label { font-size: 14px; color: #666; }
        .sample { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 6px; }
        .sample.success { border-left: 4px solid #4caf50; }
        .sample.failed { border-left: 4px solid #f44336; }
        .sample-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .sample-name { font-weight: bold; font-size: 16px; }
        .sample-status { padding: 4px 8px; border-radius: 4px; color: white; font-size: 12px; }
        .sample-status.success { background: #4caf50; }
        .sample-status.failed { background: #f44336; }
        .sample-description { color: #666; margin-bottom: 8px; }
        .sample-text { background: #f9f9f9; padding: 10px; border-radius: 4px; font-style: italic; margin: 8px 0; }
        .sample-details { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; font-size: 14px; }
        .detail-item { background: #f0f0f0; padding: 6px; border-radius: 4px; }
        .detail-label { font-weight: bold; }
        audio { width: 100%; margin-top: 10px; }
        .error { color: #f44336; font-style: italic; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎙️ SpeechT5 TTS Generation Report</h1>
        
        <div class="summary">
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="value">${report.totalSamples}</div>
                    <div class="label">Total Samples</div>
                </div>
                <div class="summary-item">
                    <div class="value">${report.successful}</div>
                    <div class="label">Successful</div>
                </div>
                <div class="summary-item">
                    <div class="value">${report.failed}</div>
                    <div class="label">Failed</div>
                </div>
                <div class="summary-item">
                    <div class="value">${Math.round(report.successful / report.totalSamples * 100)}%</div>
                    <div class="label">Success Rate</div>
                </div>
            </div>
        </div>

        <p><strong>Generated:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
        <p><strong>Model:</strong> ${report.model}</p>
        <p><strong>Provider:</strong> ${report.provider}</p>

        <h2>📊 Sample Results</h2>
        
        ${report.samples.map((sample: any) => `
            <div class="sample ${sample.success ? 'success' : 'failed'}">
                <div class="sample-header">
                    <div class="sample-name">${sample.name}</div>
                    <div class="sample-status ${sample.success ? 'success' : 'failed'}">
                        ${sample.success ? '✅ Success' : '❌ Failed'}
                    </div>
                </div>
                
                <div class="sample-description">${sample.description}</div>
                
                ${sample.success ? `
                    <div class="sample-details">
                        <div class="detail-item">
                            <div class="detail-label">File:</div>
                            <div>${sample.filename}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Size:</div>
                            <div>${sample.size}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Generation Time:</div>
                            <div>${sample.generationTime}ms</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Text Length:</div>
                            <div>${sample.textLength} chars</div>
                        </div>
                    </div>
                    <audio controls>
                        <source src="${sample.filename}" type="audio/wav">
                        Your browser does not support the audio element.
                    </audio>
                ` : `
                    <div class="error">Error: ${sample.error}</div>
                `}
            </div>
        `).join('')}
    </div>
</body>
</html>
`;
}

// Run the test
if (require.main === module) {
  generateSampleAudioFiles().catch(console.error);
}

export { generateSampleAudioFiles };
