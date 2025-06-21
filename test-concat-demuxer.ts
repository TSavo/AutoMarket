/**
 * Test concatenation using FFmpeg's concat demuxer instead of filter_complex
 */

import { FFMPEGLocalClient } from './src/media/providers/docker/ffmpeg/FFMPEGLocalClient';
import { SmartAssetFactory } from './src/media/assets/SmartAssetFactory';
import { hasVideoRole } from './src/media/assets/roles';
import fs from 'fs';
import path from 'path';

// Extended client to test concat demuxer
class ConcatDemuxerClient extends FFMPEGLocalClient {
  async concatWithDemuxer(videoBuffers: Buffer[]): Promise<Buffer> {
    const tempDir = this.getTempDir();
    const tempInputFiles: string[] = [];
    const concatListFile = path.join(tempDir, `concat_list_${Date.now()}.txt`);
    const outputFile = path.join(tempDir, `concat_output_${Date.now()}.mp4`);

    try {
      // Write video buffers to temp files
      for (let i = 0; i < videoBuffers.length; i++) {
        const tempFile = path.join(tempDir, `concat_input_${i}_${Date.now()}.mp4`);
        fs.writeFileSync(tempFile, videoBuffers[i]);
        tempInputFiles.push(tempFile);
      }

      // Create concat list file
      const concatList = tempInputFiles.map(file => `file '${file}'`).join('\n');
      fs.writeFileSync(concatListFile, concatList);

      console.log('📝 Concat list:');
      console.log(concatList);

      // Run FFmpeg with concat demuxer
      const args = [
        '-f', 'concat',
        '-safe', '0',
        '-i', concatListFile,
        '-c', 'copy',
        '-y', outputFile
      ];

      console.log('🔧 FFmpeg concat command:', 'ffmpeg', args.join(' '));
      
      await this['executeFFmpeg'](args);
      
      const result = fs.readFileSync(outputFile);
      
      // Cleanup
      tempInputFiles.forEach(file => fs.unlinkSync(file));
      fs.unlinkSync(concatListFile);
      fs.unlinkSync(outputFile);
      
      return result;
      
    } catch (error) {
      // Cleanup on error
      tempInputFiles.forEach(file => {
        try { fs.unlinkSync(file); } catch {}
      });
      try { fs.unlinkSync(concatListFile); } catch {}
      try { fs.unlinkSync(outputFile); } catch {}
      throw error;
    }
  }

  private getTempDir(): string {
    return path.join(require('os').tmpdir(), 'ffmpeg-local-client');
  }
}

async function testConcatDemuxer() {
  console.log('🔧 Testing FFmpeg concat demuxer approach...\n');

  try {
    const testVideoDir = path.join(process.cwd(), 'test-videos');
    const baseVideoPath = path.join(testVideoDir, 'base.mp4');
    const introVideoPath = path.join(testVideoDir, 'intro.mp4');

    const baseAsset = SmartAssetFactory.load(baseVideoPath);
    const introAsset = SmartAssetFactory.load(introVideoPath);
    
    if (!hasVideoRole(baseAsset) || !hasVideoRole(introAsset)) {
      throw new Error('Videos do not have video role capabilities');
    }
    
    const baseVideo = await baseAsset.asVideo();
    const introVideo = await introAsset.asVideo();
    
    console.log('✅ Loaded videos');
    console.log(`  Intro: ${introVideo.data.length} bytes`);
    console.log(`  Base: ${baseVideo.data.length} bytes`);

    const client = new ConcatDemuxerClient({ timeout: 120000 });
    
    console.log('\n🎬 Testing concat demuxer...');
    const result = await client.concatWithDemuxer([introVideo.data, baseVideo.data]);
    
    console.log('✅ Concat demuxer successful!');
    console.log(`📊 Result size: ${result.length} bytes`);
    
    // Save result
    const outputPath = path.join(process.cwd(), 'test-concat-demuxer-output.mp4');
    fs.writeFileSync(outputPath, result);
    console.log(`💾 Saved to: ${outputPath}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testConcatDemuxer().catch(console.error);
