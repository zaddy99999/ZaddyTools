import { NextResponse } from 'next/server';
import { getDevNotes } from '@/lib/sheets';

// Public endpoint - only returns approved notes
export async function GET() {
  try {
    const notes = await getDevNotes('approved');

    // Group notes by date
    const groupedByDate = new Map<string, typeof notes>();
    for (const note of notes) {
      const existing = groupedByDate.get(note.date) || [];
      existing.push(note);
      groupedByDate.set(note.date, existing);
    }

    // Convert to array format
    const grouped = Array.from(groupedByDate.entries()).map(([date, updates]) => ({
      date,
      updates: updates.map(u => ({
        title: u.title,
        description: u.description,
        type: u.type,
      })),
    }));

    return NextResponse.json({ notes: grouped });
  } catch (error) {
    console.error('Error fetching dev notes:', error);
    return NextResponse.json({ error: 'Failed to fetch dev notes' }, { status: 500 });
  }
}
