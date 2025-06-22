import { NextRequest, NextResponse } from 'next/server';
import JobManager from '../../JobManager';
import { JobStatus } from '../../../../../../media/types/provider';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  
  if (!jobId || typeof jobId !== 'string') {
    return NextResponse.json(
      {
        success: false,
        error: 'Job ID must be a string'
      },
      { status: 400 }
    );
  }

  try {
    const jobManager = JobManager.getInstance();
    const job = jobManager.getJob(jobId);
    
    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: `Job '${jobId}' not found`
        },
        { status: 404 }
      );
    }

    if (job.status !== JobStatus.COMPLETED) {
      return NextResponse.json(
        {
          success: false,
          error: `Job '${jobId}' is not completed (status: ${job.status})`
        },
        { status: 400 }
      );
    }

    if (!job.output) {
      return NextResponse.json(
        {
          success: false,
          error: `Job '${jobId}' has no output`
        },
        { status: 404 }
      );
    }

    // Handle text assets (return as JSON)
    if (job.output.constructor.name === 'Text') {
      return NextResponse.json({
        type: 'text',
        content: job.output.content,
        metadata: job.output.metadata
      });
    }

    // Handle binary assets (stream the file)
    const asset = job.output;
    const localPath = asset.metadata?.localPath;
    
    if (!localPath || !fs.existsSync(localPath)) {
      return NextResponse.json(
        {
          success: false,
          error: `Asset file not found for job '${jobId}'`
        },
        { status: 404 }
      );
    }

    // Read the file
    const fileBuffer = fs.readFileSync(localPath);
    
    // Determine content type based on asset type and format
    let contentType = 'application/octet-stream';
    if (asset.constructor.name === 'Image') {
      contentType = `image/${asset.format}`;
    } else if (asset.constructor.name === 'Audio') {
      contentType = `audio/${asset.format}`;
    } else if (asset.constructor.name === 'Video') {
      contentType = `video/${asset.format}`;
    }

    // Set filename for download
    const filename = `${jobId}.${asset.format}`;

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
      }
    });

  } catch (error) {
    console.error('Asset download error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
