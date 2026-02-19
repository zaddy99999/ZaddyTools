import { NextRequest, NextResponse } from 'next/server';
import { getChannelUrlsFromSheet, validateCronSecret } from '@/lib/config';
import { scrapeAllChannels } from '@/lib/scraper';
import {
  appendToDailyLog,
  updateLatestTab,
  updateMetricsTab,
} from '@/lib/sheets';
import { safeErrorMessage } from '@/lib/errorResponse';

export const maxDuration = 60; // Allow up to 60 seconds for the scrape job

export async function GET(request: NextRequest) {
  return handleRun(request);
}

export async function POST(request: NextRequest) {
  return handleRun(request);
}

async function handleRun(request: NextRequest) {
  // Validate authorization - always require CRON_SECRET validation
  // The x-vercel-cron header alone is not sufficient as it can be spoofed
  const authHeader = request.headers.get('authorization');
  const cronSecret = authHeader?.replace('Bearer ', '') || null;

  if (!validateCronSecret(cronSecret)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Get channel configuration from Google Sheet
    const channels = await getChannelUrlsFromSheet();
    if (channels.length === 0) {
      return NextResponse.json(
        { error: 'No channels configured in the channels sheet' },
        { status: 400 }
      );
    }

    console.log(`Starting scrape job for ${channels.length} channels`);

    // Scrape all channels
    const results = await scrapeAllChannels(channels);

    // Log results
    const successful = results.filter((r) => !r.parseFailed);
    const failed = results.filter((r) => r.parseFailed);
    console.log(
      `Scrape complete: ${successful.length} successful, ${failed.length} failed`
    );

    // Update Google Sheets
    await appendToDailyLog(results);
    await updateLatestTab(results);
    await updateMetricsTab(results);

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful: successful.length,
      failed: failed.length,
      results: results.map((r) => ({
        channelName: r.channelName,
        channelUrl: r.channelUrl,
        totalViews: r.totalViews,
        parseFailed: r.parseFailed,
        errorMessage: r.errorMessage,
      })),
    });
  } catch (error) {
    console.error('Scrape job failed:', error);
    return NextResponse.json(
      {
        error: safeErrorMessage(error, 'Scrape job failed'),
      },
      { status: 500 }
    );
  }
}
