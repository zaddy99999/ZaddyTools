import {
  getSheets,
  getSpreadsheetId,
  TABS,
} from './auth';

// ==================== LORE LINKS ====================

export interface LoreLink {
  type: 'novel' | 'comic' | 'other';
  title: string;
  url: string;
  description?: string;
  gameId?: string;
}

export async function getLoreLinks(gameId?: string): Promise<LoreLink[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.LORE_LINKS}!A:E`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return [];

    const links: LoreLink[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowGameId = row[0]?.trim() || '';
      const type = (row[1]?.trim().toLowerCase() || 'other') as 'novel' | 'comic' | 'other';
      const title = row[2]?.trim() || '';
      const url = row[3]?.trim() || '';
      const description = row[4]?.trim() || '';

      if (title && url) {
        if (!gameId || rowGameId === gameId) {
          links.push({ gameId: rowGameId, type, title, url, description });
        }
      }
    }
    return links;
  } catch {
    // Tab might not exist yet, that's ok
    return [];
  }
}

export async function ensureLoreLinksTab(): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(
      spreadsheet.data.sheets?.map((s) => s.properties?.title) || []
    );

    if (!existingTabs.has(TABS.LORE_LINKS)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: { properties: { title: TABS.LORE_LINKS } },
          }],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TABS.LORE_LINKS}!A1:E1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['game_id', 'type', 'title', 'url', 'description']],
        },
      });
    }
  } catch (error) {
    console.error('Error ensuring LoreLinks tab:', error);
  }
}

// ==================== QUIZ QUESTIONS ====================

export interface QuizQuestion {
  id: string;
  gameId: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export async function getQuizQuestions(gameId?: string): Promise<QuizQuestion[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.QUESTIONS}!A:J`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return [];

    const questions: QuizQuestion[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowGameId = row[0]?.trim() || '';
      const question = row[1]?.trim() || '';
      const optionA = row[2]?.trim() || '';
      const optionB = row[3]?.trim() || '';
      const optionC = row[4]?.trim() || '';
      const optionD = row[5]?.trim() || '';
      const correctAnswer = (row[6]?.trim().toUpperCase() || 'A') as 'A' | 'B' | 'C' | 'D';
      const category = row[7]?.trim() || '';
      const difficulty = (row[8]?.trim().toLowerCase() || 'medium') as 'easy' | 'medium' | 'hard';

      if (question && optionA && optionB) {
        if (!gameId || rowGameId === gameId) {
          questions.push({
            id: `q-${i}`,
            gameId: rowGameId,
            question,
            optionA,
            optionB,
            optionC,
            optionD,
            correctAnswer,
            category,
            difficulty,
          });
        }
      }
    }
    return questions;
  } catch {
    // Tab might not exist yet, that's ok
    return [];
  }
}

export async function ensureQuestionsTab(): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(
      spreadsheet.data.sheets?.map((s) => s.properties?.title) || []
    );

    if (!existingTabs.has(TABS.QUESTIONS)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: { properties: { title: TABS.QUESTIONS } },
          }],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TABS.QUESTIONS}!A1:I1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['game_id', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'category', 'difficulty']],
        },
      });
    }
  } catch (error) {
    console.error('Error ensuring Questions tab:', error);
  }
}

// ==================== FACTIONS ====================

export interface Faction {
  id: string;
  name: string;
  description?: string;
  gameId?: string;
}

export async function getFactions(gameId?: string): Promise<Faction[]> {
  // This is a placeholder - factions could be stored in a separate tab
  // or derived from other data. For now, return empty array.
  return [];
}
