import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Extract YouTube channel handle from URL
function extractYouTubeHandle(url: string): string | null {
  if (!url) return null;

  // Handle different YouTube URL formats
  // https://www.youtube.com/@ChannelName
  // https://www.youtube.com/c/ChannelName
  // https://www.youtube.com/channel/UC...
  // https://www.youtube.com/user/Username

  const patterns = [
    /@([^/?]+)/,           // @handle format
    /\/c\/([^/?]+)/,       // /c/name format
    /\/user\/([^/?]+)/,    // /user/name format
    /\/channel\/([^/?]+)/, // /channel/ID format
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Check for admin auth
    const authHeader = request.headers.get('Authorization');
    const adminKey = process.env.ADMIN_KEY;

    if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch channel data from status API
    const statusRes = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/status`);
    if (!statusRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
    }

    const statusData = await statusRes.json();
    const channels = statusData.channels || [];

    // Filter channels with YouTube URLs
    const youtubeChannels = channels.filter((ch: any) => ch.youtubeUrl);

    // Ensure directory exists
    const pfpDir = path.join(process.cwd(), 'public', 'youtube-pfp');
    if (!existsSync(pfpDir)) {
      await mkdir(pfpDir, { recursive: true });
    }

    const results: { name: string; success: boolean; error?: string }[] = [];

    for (const channel of youtubeChannels) {
      const handle = extractYouTubeHandle(channel.youtubeUrl);
      if (!handle) {
        results.push({ name: channel.channelName, success: false, error: 'Could not extract handle' });
        continue;
      }

      try {
        // Use unavatar.io to get YouTube profile picture
        const avatarUrl = `https://unavatar.io/youtube/${handle}`;
        const imgRes = await fetch(avatarUrl);

        if (!imgRes.ok) {
          results.push({ name: channel.channelName, success: false, error: 'Image fetch failed' });
          continue;
        }

        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const filename = `${channel.channelName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.jpg`;
        const filepath = path.join(pfpDir, filename);

        await writeFile(filepath, buffer);
        results.push({ name: channel.channelName, success: true });
      } catch (err) {
        results.push({ name: channel.channelName, success: false, error: String(err) });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `Downloaded ${successful} PFPs, ${failed} failed`,
      results
    });

  } catch (error) {
    console.error('Error downloading YouTube PFPs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
