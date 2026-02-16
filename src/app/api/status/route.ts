import { NextResponse } from 'next/server';
import { getRunStatus, getLatestData } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [status, channelData] = await Promise.all([
      getRunStatus().catch(err => {
        console.error('getRunStatus error:', err);
        return { lastRunTime: null, status: 'error' as const, channelsProcessed: 0, channelsFailed: 0 };
      }),
      getLatestData().catch(err => {
        console.error('getLatestData error:', err);
        return [];
      }),
    ]);

    return NextResponse.json({
      status,
      channels: channelData,
      // Note: Debug info about env vars removed to prevent exposure of configuration state
    });
  } catch (error) {
    console.error('Failed to fetch status:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch status',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
