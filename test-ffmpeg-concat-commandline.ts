/**
 * Standalone FFmpeg command line test for concatenation via filter_complex
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function testFFmpegConcatenationCommandLine() {
  console.log('🔧 Testing FFmpeg concatenation via filter_complex on command line...\n');

  const testVideoDir = path.join(process.cwd(), 'test-videos');
  const introPath = path.join(testVideoDir, 'intro.mp4');
  const basePath = path.join(testVideoDir, 'base.mp4');
  const outputPath = path.join(process.cwd(), 'test-concat-commandline.mp4');

  // Check if test videos exist
  if (!fs.existsSync(introPath) || !fs.existsSync(basePath)) {
    console.log('❌ Test videos not found. Need intro.mp4 and base.mp4 in test-videos/');
    return;
  }

  console.log('✅ Found test videos:');
  console.log(`  - intro.mp4: ${fs.statSync(introPath).size} bytes`);
  console.log(`  - base.mp4: ${fs.statSync(basePath).size} bytes`);

  // Test 1: Simple concatenation via filter_complex (the exact filter we've been using)
  console.log('\n🎯 Test 1: Simple concatenation via filter_complex');
  const filterComplex1 = '[0:v]format=yuv420p,scale=1920:1080[v0];[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a0];[1:v]format=yuv420p,scale=1920:1080[v1];[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a1];[v0][v1][a0][a1]concat=n=2:v=1:a=1[final_video][final_audio]';
  
  const args1 = [
    '-i', introPath,
    '-i', basePath,
    '-filter_complex', filterComplex1,
    '-map', '[final_video]',
    '-map', '[final_audio]',
    '-y', outputPath
  ];

  console.log('📝 Command:');
  console.log(`ffmpeg ${args1.join(' ')}`);

  try {
    await runFFmpegCommand(args1);
    if (fs.existsSync(outputPath)) {
      const outputSize = fs.statSync(outputPath).size;
      console.log(`✅ Test 1 SUCCESS! Output: ${outputSize} bytes`);
      fs.unlinkSync(outputPath); // Clean up
    } else {
      console.log('❌ Test 1 FAILED: No output file created');
    }
  } catch (error) {
    console.log('❌ Test 1 FAILED:', error.message);
  }

  // Test 2: Minimal concatenation (no format preprocessing)
  console.log('\n🎯 Test 2: Minimal concatenation (no preprocessing)');
  const filterComplex2 = '[0:v][1:v][0:a][1:a]concat=n=2:v=1:a=1[final_video][final_audio]';
  
  const args2 = [
    '-i', introPath,
    '-i', basePath,
    '-filter_complex', filterComplex2,
    '-map', '[final_video]',
    '-map', '[final_audio]',
    '-y', outputPath
  ];

  console.log('📝 Command:');
  console.log(`ffmpeg ${args2.join(' ')}`);

  try {
    await runFFmpegCommand(args2);
    if (fs.existsSync(outputPath)) {
      const outputSize = fs.statSync(outputPath).size;
      console.log(`✅ Test 2 SUCCESS! Output: ${outputSize} bytes`);
      fs.unlinkSync(outputPath); // Clean up
    } else {
      console.log('❌ Test 2 FAILED: No output file created');
    }
  } catch (error) {
    console.log('❌ Test 2 FAILED:', error.message);
  }

  // Test 3: Traditional concat demuxer approach (file-based)
  console.log('\n🎯 Test 3: Traditional concat demuxer (file list)');
  const concatListFile = path.join(process.cwd(), 'concat_list.txt');
  const concatContent = `file '${introPath.replace(/\\/g, '/')}'
file '${basePath.replace(/\\/g, '/')}'`;
  
  fs.writeFileSync(concatListFile, concatContent);
  
  const args3 = [
    '-f', 'concat',
    '-safe', '0',
    '-i', concatListFile,
    '-c', 'copy',
    '-y', outputPath
  ];

  console.log('📝 Command:');
  console.log(`ffmpeg ${args3.join(' ')}`);

  try {
    await runFFmpegCommand(args3);
    if (fs.existsSync(outputPath)) {
      const outputSize = fs.statSync(outputPath).size;
      console.log(`✅ Test 3 SUCCESS! Output: ${outputSize} bytes`);
      fs.unlinkSync(outputPath); // Clean up
    } else {
      console.log('❌ Test 3 FAILED: No output file created');
    }
    fs.unlinkSync(concatListFile); // Clean up
  } catch (error) {
    console.log('❌ Test 3 FAILED:', error.message);
    if (fs.existsSync(concatListFile)) fs.unlinkSync(concatListFile);
  }

  // Test 4: Very simple filter_complex test
  console.log('\n🎯 Test 4: Ultra-simple filter_complex concat');
  const filterComplex4 = 'concat=n=2:v=1:a=1[final_video][final_audio]';
  
  const args4 = [
    '-i', introPath,
    '-i', basePath,
    '-filter_complex', filterComplex4,
    '-map', '[final_video]',
    '-map', '[final_audio]',
    '-y', outputPath
  ];

  console.log('📝 Command:');
  console.log(`ffmpeg ${args4.join(' ')}`);

  try {
    await runFFmpegCommand(args4);
    if (fs.existsSync(outputPath)) {
      const outputSize = fs.statSync(outputPath).size;
      console.log(`✅ Test 4 SUCCESS! Output: ${outputSize} bytes`);
      fs.unlinkSync(outputPath); // Clean up
    } else {
      console.log('❌ Test 4 FAILED: No output file created');
    }
  } catch (error) {
    console.log('❌ Test 4 FAILED:', error.message);
  }

  console.log('\n🏁 Command line tests completed!');
}

function runFFmpegCommand(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn('ffmpeg', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stderr = '';

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        // Extract the key error from stderr
        const lines = stderr.split('\n');
        const errorLine = lines.find(line => 
          line.includes('Error') || 
          line.includes('Invalid') || 
          line.includes('mismatch')
        ) || 'Unknown error';
        reject(new Error(`FFmpeg failed with code ${code}: ${errorLine}`));
      }
    });

    process.on('error', (error) => {
      reject(new Error(`Failed to start FFmpeg: ${error.message}`));
    });
  });
}

testFFmpegConcatenationCommandLine().catch(console.error);
