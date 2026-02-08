import { NextResponse } from 'next/server';
import { getRunStatus, getLatestData } from '@/lib/sheets';

export async function GET() {
  try {
    const [status, channelData] = await Promise.all([
      getRunStatus(),
      getLatestData(),
    ]);

    return NextResponse.json({
      status,
      channels: channelData,
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
