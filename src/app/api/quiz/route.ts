import { NextRequest, NextResponse } from 'next/server';
import { getQuizQuestions } from '@/lib/sheets';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId') || undefined;

    const questions = await getQuizQuestions(gameId);

    // Shuffle questions for variety
    const shuffled = questions.sort(() => Math.random() - 0.5);

    return NextResponse.json({ questions: shuffled });
  } catch (error) {
    console.error('Quiz questions error:', error);
    return NextResponse.json({ error: 'Failed to fetch quiz questions' }, { status: 500 });
  }
}
