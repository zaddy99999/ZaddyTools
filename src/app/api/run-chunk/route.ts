import { NextRequest, NextResponse } from 'next/server';
import { getChannelUrlsFromSheet, validateCronSecret } from '@/lib/config';
import { scrapeAllChannels } from '@/lib/scraper';
import {
  appendToDailyLog,
  updateLatestTab,
  updateMetricsTab,
} from '@/lib/sheets';
import { safeErrorMessage } from '@/lib/errorResponse';

// 5 channels per chunk - should complete in ~8 seconds
const CHUNK_SIZE = 5;

export async function GET(request: NextRequest) {
  return handleRunChunk(request);
}

export async function POST(request: NextRequest) {
  return handleRunChunk(request);
}

async function handleRunChunk(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = authHeader?.replace('Bearer ', '') || null;

  if (!validateCronSecret(cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const chunkParam = searchParams.get('chunk');
  const chunk = chunkParam ? parseInt(chunkParam, 10) : 0;

  if (isNaN(chunk) || chunk < 0) {
    return NextResponse.json({ error: 'Invalid chunk parameter' }, { status: 400 });
  }

  try {
    const channels = await getChannelUrlsFromSheet();
    if (channels.length === 0) {
      return NextResponse.json(
        { error: 'No channels configured in the channels sheet' },
        { status: 400 }
      );
    }

    const totalChunks = Math.ceil(channels.length / CHUNK_SIZE);
    const start = chunk * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, channels.length);

    if (start >= channels.length) {
      return NextResponse.json({
        success: true,
        message: 'Chunk out of range - all channels already processed',
        chunk,
        totalChunks,
        processed: 0,
      });
    }

    const channelSubset = channels.slice(start, end);
    console.log(`Scraping chunk ${chunk + 1}/${totalChunks}: channels ${start + 1}-${end} of ${channels.length}`);

    // Scrape this chunk with faster pacing (800ms instead of 1200ms)
    const results = await scrapeAllChannels(channelSubset, 800);

    const successful = results.filter((r) => !r.parseFailed);
    const failed = results.filter((r) => r.parseFailed);

    // Update sheets with this chunk's data
    await appendToDailyLog(results);
    await updateLatestTab(results);
    await updateMetricsTab(results);

    return NextResponse.json({
      success: true,
      chunk,
      totalChunks,
      processed: results.length,
      successful: successful.length,
      failed: failed.length,
      nextChunk: chunk + 1 < totalChunks ? chunk + 1 : null,
      results: results.map((r) => ({
        channelName: r.channelName,
        channelUrl: r.channelUrl,
        totalViews: r.totalViews,
        parseFailed: r.parseFailed,
        errorMessage: r.errorMessage,
      })),
    });
  } catch (error) {
    console.error('Chunk scrape failed:', error);
    return NextResponse.json(
      { error: safeErrorMessage(error, 'Chunk scrape failed') },
      { status: 500 }
    );
  }
}
