import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const NFT_DIR = path.join(process.cwd(), 'public', 'nft-collections');

// Known Abstract NFT collections with their OpenSea slugs/image URLs
const COLLECTIONS: { address: string; name: string; imageUrl?: string }[] = [
  { address: '0x09bb4c785165915e66f4a645bc978a6c885a0319', name: 'Web3 Playboys', imageUrl: 'https://i.seadn.io/s/raw/files/0c71cb5e7a9d1b1c98e0dba4c9b34f2a.png' },
  { address: '0x1e49b0d225c45b22f66bd660841d98e153c7abd5', name: 'Web3 Playboys Traits' },
  { address: '0x30072084ff8724098cbb65e07f7639ed31af5f66', name: 'DreamilioMaker', imageUrl: 'https://i.seadn.io/gcs/files/3b7f0e0c0f9d4a3b8c5d6e7f8a9b0c1d.png' },
  { address: '0x35ffe9d966e35bd1b0e79f0d91e438701ea1c644', name: 'Moody Archives' },
  { address: '0xff4217568f7315b5950c6b244222884434e19ab3', name: 'Bearyz' },
  { address: '0xe501994195b9951413411395ed1921a88eff694e', name: 'Abstract Checks' },
  { address: '0x100ea890ad486334c8a74c6a37e216c381ff8ddf', name: 'Abstract Ordinals' },
  { address: '0xbc176ac2373614f9858a118917d83b139bcb3f8c', name: 'Abstract Badges' },
  { address: '0xec27d2237432d06981e1f18581494661517e1bd3', name: 'Xeet Creator Cards', imageUrl: 'https://i.seadn.io/gcs/files/xeet-creator-cards.png' },
];

export async function GET() {
  try {
    await fs.mkdir(NFT_DIR, { recursive: true });

    const results: { address: string; name: string; status: string }[] = [];

    for (const collection of COLLECTIONS) {
      const fileName = `${collection.address.toLowerCase()}.png`;
      const filePath = path.join(NFT_DIR, fileName);

      // Check if already exists
      try {
        await fs.access(filePath);
        results.push({ address: collection.address, name: collection.name, status: 'exists' });
        continue;
      } catch {
        // File doesn't exist
      }

      // Try to download if we have a URL
      if (collection.imageUrl) {
        try {
          const response = await fetch(collection.imageUrl);
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            await fs.writeFile(filePath, Buffer.from(buffer));
            results.push({ address: collection.address, name: collection.name, status: 'downloaded' });
            continue;
          }
        } catch {
          // Download failed
        }
      }

      // Try OpenSea API if configured
      if (process.env.OPENSEA_API_KEY) {
        try {
          const nftRes = await fetch(
            `https://api.opensea.io/api/v2/chain/abstract/contract/${collection.address}/nfts?limit=1`,
            {
              headers: {
                'Accept': 'application/json',
                'X-API-KEY': process.env.OPENSEA_API_KEY,
              },
            }
          );

          if (nftRes.ok) {
            const data = await nftRes.json();
            const imageUrl = data.nfts?.[0]?.image_url || data.nfts?.[0]?.display_image_url;

            if (imageUrl) {
              const imageRes = await fetch(imageUrl);
              if (imageRes.ok) {
                const buffer = await imageRes.arrayBuffer();
                await fs.writeFile(filePath, Buffer.from(buffer));
                results.push({ address: collection.address, name: collection.name, status: 'downloaded' });
                continue;
              }
            }
          }
        } catch {
          // OpenSea failed
        }
      }

      // Generate a placeholder using dicebear
      try {
        const placeholderUrl = `https://api.dicebear.com/7.x/shapes/png?seed=${encodeURIComponent(collection.name)}&size=128`;
        const placeholderRes = await fetch(placeholderUrl);
        if (placeholderRes.ok) {
          const buffer = await placeholderRes.arrayBuffer();
          await fs.writeFile(filePath, Buffer.from(buffer));
          results.push({ address: collection.address, name: collection.name, status: 'placeholder' });
          continue;
        }
      } catch {
        // Placeholder failed
      }

      results.push({ address: collection.address, name: collection.name, status: 'failed' });
    }

    const downloaded = results.filter(r => r.status === 'downloaded').length;
    const existing = results.filter(r => r.status === 'exists').length;
    const placeholders = results.filter(r => r.status === 'placeholder').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return NextResponse.json({
      success: true,
      total: COLLECTIONS.length,
      downloaded,
      existing,
      placeholders,
      failed,
      results,
    });
  } catch (error) {
    console.error('Error downloading NFT images:', error);
    return NextResponse.json({ error: 'Failed to download NFT images' }, { status: 500 });
  }
}
