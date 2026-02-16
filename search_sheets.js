require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

async function searchSheet() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  
  // Get all data from TierMaker List (Projects)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'TierMaker List (Projects)'",
  });
  
  const rows = response.data.values || [];
  console.log('Total rows:', rows.length);
  
  // Show header row
  if (rows.length > 0) {
    console.log('\nHeader row:');
    console.log(JSON.stringify(rows[0], null, 2));
  }
  
  // Show first few data rows to understand structure
  console.log('\nFirst 5 data rows:');
  for (let i = 1; i <= Math.min(5, rows.length - 1); i++) {
    console.log('Row ' + (i + 1) + ':', JSON.stringify(rows[i]));
  }
  
  // Search for matching rows (case-insensitive)
  const searchTerms = ['lambo', 'mayki', 'louis'];
  const matches = [];
  
  rows.forEach((row, index) => {
    const rowString = row.join(' ').toLowerCase();
    for (const term of searchTerms) {
      if (rowString.includes(term.toLowerCase())) {
        matches.push({ rowNumber: index + 1, term, data: row });
        break;
      }
    }
  });
  
  console.log('\n=== MATCHING ROWS ===');
  console.log('Found', matches.length, 'matches for terms: lambo, mayki, louis');
  matches.forEach(m => {
    console.log('\nRow ' + m.rowNumber + ' (matched: "' + m.term + '"):');
    console.log(JSON.stringify(m.data, null, 2));
  });
  
  // Also show all unique values for debugging
  console.log('\n=== ALL ROW DATA (for verification) ===');
  rows.slice(1).forEach((row, idx) => {
    console.log('Row ' + (idx + 2) + ': ' + row.join(' | '));
  });
}

searchSheet().catch(console.error);
