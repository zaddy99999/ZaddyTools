import { NextResponse } from 'next/server';
import { getDevNotes, addDevNote, updateDevNote, deleteDevNote } from '@/lib/sheets';

// Whitelisted wallet address for admin access
const WHITELISTED_WALLET = '0x0351b76923992c2aFE0f040D22B43Ef0B8773D24'.toLowerCase();

function isAuthorized(request: Request): boolean {
  const walletAddress = request.headers.get('x-wallet-address');
  if (walletAddress && walletAddress.toLowerCase() === WHITELISTED_WALLET) {
    return true;
  }
  return false;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'approved' | null;

    const notes = await getDevNotes(status || undefined);
    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Error fetching dev notes:', error);
    return NextResponse.json({ error: 'Failed to fetch dev notes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { date, title, description, type, status } = body;

    if (!date || !title || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await addDevNote({
      date,
      title,
      description,
      type: type || 'feature',
      status: status || 'pending',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding dev note:', error);
    return NextResponse.json({ error: 'Failed to add dev note' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing note ID' }, { status: 400 });
    }

    await updateDevNote(id, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating dev note:', error);
    return NextResponse.json({ error: 'Failed to update dev note' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing note ID' }, { status: 400 });
    }

    await deleteDevNote(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dev note:', error);
    return NextResponse.json({ error: 'Failed to delete dev note' }, { status: 500 });
  }
}
