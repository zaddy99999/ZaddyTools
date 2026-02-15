const { google } = require('googleapis');
const fs = require('fs');

// Load from JSON credentials file
const credentialsPath = '/Users/bill/Documents/Development/ZaddyTools/claude-code-stuff-f08ac6751781.json';
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const BOT_DATA_SPREADSHEET_ID = '1V9F04yo3At3g-Vr7_jT49pFc4b083UiWOFVwQF2xpUk';

const BOT_TABS = [
  { name: 'daily_log', headers: ['date', 'timestamp', 'channel_name', 'channel_url', 'rank', 'category', 'is_abstract', 'logo_url', 'total_views', 'gif_count', 'parse_failed', 'error_message', 'tiktok_url', 'tiktok_followers', 'tiktok_likes', 'youtube_url', 'youtube_subscribers', 'youtube_views', 'youtube_video_count'] },
  { name: 'latest', headers: ['channel_name', 'channel_url', 'rank', 'category', 'is_abstract', 'logo_url', 'total_views', 'date', 'timestamp'] },
  { name: 'metrics', headers: ['channel_name', 'channel_url', 'rank', 'category', 'is_abstract', 'logo_url', 'latest_total_views', 'gif_count', 'delta_1d', 'avg_7d_delta', 'last_updated', 'tiktok_url', 'tiktok_followers', 'tiktok_likes', 'youtube_url', 'youtube_subscribers', 'youtube_views', 'youtube_video_count'] },
  { name: 'digests', headers: ['id', 'mode', 'date_label', 'summary', 'sections_json', 'generated_at', 'expires_at'] },
];

async function main() {
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Get existing tabs
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: BOT_DATA_SPREADSHEET_ID,
  });

  const existingTabs = new Set(
    spreadsheet.data.sheets?.map((s) => s.properties?.title) || []
  );

  console.log('Existing tabs:', Array.from(existingTabs));

  // Create missing tabs
  const tabsToCreate = BOT_TABS.filter(t => !existingTabs.has(t.name));

  if (tabsToCreate.length > 0) {
    console.log('Creating tabs:', tabsToCreate.map(t => t.name));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: BOT_DATA_SPREADSHEET_ID,
      requestBody: {
        requests: tabsToCreate.map((tab) => ({
          addSheet: {
            properties: { title: tab.name },
          },
        })),
      },
    });

    // Add headers to new tabs
    for (const tab of tabsToCreate) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: BOT_DATA_SPREADSHEET_ID,
        range: `${tab.name}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [tab.headers],
        },
      });
      console.log(`Added headers to ${tab.name}`);
    }
  } else {
    console.log('All tabs already exist');
  }

  console.log('Bot data spreadsheet setup complete!');
}

main().catch(console.error);
