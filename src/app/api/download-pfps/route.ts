import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const PFP_DIR = path.join(process.cwd(), 'public', 'pfp');

interface Person {
  handle: string;
  name: string;
}

export async function GET() {
  try {
    // Fetch the recommended people list
    const peopleRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/recommended-people`);
    if (!peopleRes.ok) {
      throw new Error('Failed to fetch people list');
    }

    const people: Person[] = await peopleRes.json();

    // Ensure directory exists
    await fs.mkdir(PFP_DIR, { recursive: true });

    const results: { handle: string; status: string }[] = [];

    // Download each profile picture
    for (const person of people) {
      const handle = person.handle;
      const filePath = path.join(PFP_DIR, `${handle}.jpg`);

      // Check if already exists
      try {
        await fs.access(filePath);
        results.push({ handle, status: 'exists' });
        continue;
      } catch {
        // File doesn't exist, download it
      }

      try {
        const imageUrl = `https://unavatar.io/twitter/${handle}`;
        const imageRes = await fetch(imageUrl);

        if (!imageRes.ok) {
          results.push({ handle, status: 'failed' });
          continue;
        }

        const buffer = await imageRes.arrayBuffer();
        await fs.writeFile(filePath, Buffer.from(buffer));
        results.push({ handle, status: 'downloaded' });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.push({ handle, status: 'error' });
      }
    }

    const downloaded = results.filter(r => r.status === 'downloaded').length;
    const existing = results.filter(r => r.status === 'exists').length;
    const failed = results.filter(r => r.status === 'failed' || r.status === 'error').length;

    return NextResponse.json({
      success: true,
      total: people.length,
      downloaded,
      existing,
      failed,
      results,
    });
  } catch (error) {
    console.error('Error downloading PFPs:', error);
    return NextResponse.json({ error: 'Failed to download PFPs' }, { status: 500 });
  }
}
