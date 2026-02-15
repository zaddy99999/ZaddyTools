// Re-export everything from all sheets modules for backwards compatibility

// Auth and shared utilities
export {
  SPREADSHEET_IDS,
  TABS,
  BOT_DATA_TABS,
  getAuth,
  getSheets,
  getSpreadsheetId,
  getSpreadsheetIdForTab,
  formatDate,
  formatTimestamp,
} from './auth';

// Channel operations
export {
  appendToDailyLog,
  updateLatestTab,
  updateMetricsTab,
  getLatestData,
  getRunStatus,
  ensureTabsExist,
} from './channels';

// Game guide operations
export {
  getGameGuideDocs,
  getGameGuideDocsWithContent,
  ensureGameGuideDocsTab,
  populateGameGuideGames,
  getGameGuideFAQs,
  findFAQAnswer,
  ensureGameGuideFAQTab,
} from './gameGuide';
export type { GameGuideDoc, GameGuideFAQ } from './gameGuide';

// Content operations (lore links, quiz questions, factions)
export {
  getLoreLinks,
  ensureLoreLinksTab,
  getQuizQuestions,
  ensureQuestionsTab,
  getFactions,
} from './content';
export type { LoreLink, QuizQuestion, Faction } from './content';

// Tier maker operations
export {
  getTierMakerItems,
  addTierMakerItems,
  updateTierMakerItem,
  deleteTierMakerItem,
  getPeopleTierMakerItems,
  addPeopleTierMakerItems,
  getRecommendedPeople,
} from './tierMaker';

// Wallet operations
export { writeTopWallets } from './wallets';
export type { TopWallet } from './wallets';

// Suggestion operations
export {
  submitSuggestion,
  getSuggestions,
  updateSuggestionStatus,
} from './suggestions';
export type { SuggestionData, SuggestionRow } from './suggestions';

// Digest operations
export {
  saveDigest,
  getDigest,
  getLatestDigests,
} from './digests';
export type { DigestData } from './digests';

// Abstract news operations
export {
  getAbstractNews,
  addAbstractNewsItem,
} from './abstractNews';
export type { AbstractNewsItem } from './abstractNews';
