// Search TierMaker List (People) for specific names
require('dotenv').config({ path: '/Users/bill/Development/ZaddyTools/.env.local' });
const { google } = require('googleapis');

async function searchTierMaker() {
  const searchTerms = ['lambo', 'mayki', 'louis'];
  
  // Set up auth
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  try {
    // First, get all sheet names to find "TierMaker List (People)"
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    console.log('Available sheets:');
    spreadsheet.data.sheets.forEach(sheet => {
      console.log('  - ' + sheet.properties.title);
    });
    
    // Find the TierMaker List (People) sheet
    const tierMakerSheet = spreadsheet.data.sheets.find(
      sheet => sheet.properties.title.toLowerCase().includes('tiermaker') && 
               sheet.properties.title.toLowerCase().includes('people')
    );
    
    if (!tierMakerSheet) {
      console.log('\nCould not find "TierMaker List (People)" sheet. Searching all sheets...');
      
      // Search through all sheets
      for (const sheet of spreadsheet.data.sheets) {
        const sheetName = sheet.properties.title;
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: "'" + sheetName + "'!A:Z",
        });
        
        const rows = response.data.values || [];
        const matchingRows = [];
        
        rows.forEach((row, index) => {
          const rowText = row.join(' ').toLowerCase();
          for (const term of searchTerms) {
            if (rowText.includes(term.toLowerCase())) {
              matchingRows.push({ rowIndex: index + 1, data: row, matchedTerm: term });
              break;
            }
          }
        });
        
        if (matchingRows.length > 0) {
          console.log('\n=== Sheet: "' + sheetName + '" ===');
          const headers = rows[0] ? rows[0].join(' | ') : 'No headers';
          console.log('Headers: ' + headers);
          console.log('\nMatching rows:');
          matchingRows.forEach(function(match) {
            console.log('  Row ' + match.rowIndex + ' (matched: "' + match.matchedTerm + '"):');
            console.log('    ' + match.data.join(' | '));
          });
        }
      }
    } else {
      const sheetName = tierMakerSheet.properties.title;
      console.log('\nFound sheet: "' + sheetName + '"');
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'" + sheetName + "'!A:Z",
      });
      
      const rows = response.data.values || [];
      console.log('Total rows: ' + rows.length);
      
      if (rows.length > 0) {
        console.log('Headers: ' + rows[0].join(' | '));
      }
      
      console.log('\nSearching for: ' + searchTerms.join(', '));
      console.log('---');
      
      const matchingRows = [];
      rows.forEach((row, index) => {
        const rowText = row.join(' ').toLowerCase();
        for (const term of searchTerms) {
          if (rowText.includes(term.toLowerCase())) {
            matchingRows.push({ rowIndex: index + 1, data: row, matchedTerm: term });
            break;
          }
        }
      });
      
      if (matchingRows.length === 0) {
        console.log('No matching rows found.');
      } else {
        console.log('Found ' + matchingRows.length + ' matching rows:\n');
        matchingRows.forEach(function(match) {
          console.log('Row ' + match.rowIndex + ' (matched: "' + match.matchedTerm + '"):');
          console.log('  ' + match.data.join(' | '));
          console.log('');
        });
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

searchTierMaker();
