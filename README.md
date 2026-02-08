# GIPHY Views Tracker

Track total view counts from public GIPHY channel pages daily, storing history in Google Sheets and displaying charts.

## Features

- Daily scraping of up to 20 GIPHY channels
- View count tracking with historical data in Google Sheets
- Metrics: daily delta, 7-day rolling average
- Simple dashboard with bar charts
- Vercel Cron for automated daily runs

## File Structure

```
virality/
├── config/
│   └── channels.json      # Channel URLs for development
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── run/       # Scrape job endpoint
│   │   │   └── status/    # Status endpoint
│   │   ├── page.tsx       # Dashboard UI
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ChannelTable.tsx
│   │   └── Charts.tsx
│   ├── lib/
│   │   ├── config.ts      # Channel config loader
│   │   ├── parser.ts      # View count parsing
│   │   ├── scraper.ts     # GIPHY page scraper
│   │   ├── sheets.ts      # Google Sheets API
│   │   └── types.ts
│   └── __tests__/
│       └── parser.test.ts
├── vercel.json            # Cron configuration
└── package.json
```

## Local Development Setup

### 1. Install Dependencies

```bash
cd virality
npm install
```

### 2. Create Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Create a Service Account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Give it a name (e.g., "giphy-tracker")
   - Click "Create and Continue", then "Done"
5. Create a key for the service account:
   - Click on the service account you just created
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Select "JSON" and click "Create"
   - Save the downloaded JSON file securely

### 3. Create Google Sheet

1. Create a new Google Sheet
2. Note the spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```
3. Share the sheet with your service account email:
   - Click "Share" in the top right
   - Add the service account email (from the JSON file, field `client_email`)
   - Give it "Editor" access
   - Click "Send" (uncheck "Notify people" if prompted)

The required tabs (`daily_log`, `latest`, `metrics`) will be created automatically on first run.

### 4. Configure Environment Variables

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
CRON_SECRET=your_random_secret_here
```

**Important:** For `GOOGLE_PRIVATE_KEY`, copy the `private_key` value from your service account JSON file. The newlines should be literal `\n` characters in the env var.

### 5. Configure Channels

Edit `config/channels.json` to add your GIPHY channel URLs:

```json
{
  "channels": [
    "https://giphy.com/nfl",
    "https://giphy.com/netflix",
    "https://giphy.com/your-channel"
  ]
}
```

### 6. Run Locally

```bash
npm run dev
```

Visit http://localhost:3000 to see the dashboard.

To test the scraper manually, click "Run Now" and enter your `CRON_SECRET`.

### 7. Run Tests

```bash
npm test
```

## Vercel Deployment

### 1. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Or connect your GitHub repository to Vercel.

### 2. Configure Environment Variables in Vercel

In your Vercel project settings, add these environment variables:

- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY` (paste the entire private key including BEGIN/END lines)
- `CRON_SECRET`
- `CHANNEL_URLS` (JSON array of channel URLs)

For production, use `CHANNEL_URLS` instead of the JSON file:

```
["https://giphy.com/nfl","https://giphy.com/nba","https://giphy.com/netflix"]
```

### 3. Cron Job

The `vercel.json` configures a cron job to run daily at 09:00 UTC:

```json
{
  "crons": [
    {
      "path": "/api/run",
      "schedule": "0 9 * * *"
    }
  ]
}
```

Note: Vercel Cron requires a Pro or Enterprise plan for custom schedules. On the Hobby plan, minimum interval is once per day.

## Google Sheets Structure

### daily_log

| Column | Description |
|--------|-------------|
| date | YYYY-MM-DD |
| timestamp | ISO 8601 timestamp |
| channel_name | Parsed channel name |
| channel_url | Source URL |
| rank | Order in config |
| total_views | View count (empty if failed) |
| parse_failed | TRUE/FALSE |
| error_message | Error details if failed |

### latest

| Column | Description |
|--------|-------------|
| channel_name | Channel name |
| channel_url | Source URL |
| rank | Order in config |
| total_views | Most recent view count |
| date | Date of last successful scrape |
| timestamp | Timestamp of last update |

### metrics

| Column | Description |
|--------|-------------|
| channel_name | Channel name |
| channel_url | Source URL |
| rank | Order in config |
| latest_total_views | Most recent view count |
| delta_1d | Change from previous day |
| avg_7d_delta | 7-day rolling average of daily changes |
| last_updated | Timestamp of last update |

## API Endpoints

### GET/POST `/api/run`

Triggers the scrape job. Requires authorization:

- Header: `Authorization: Bearer YOUR_CRON_SECRET`
- Or: Vercel Cron header (automatic)

### GET `/api/status`

Returns current status and channel data for the dashboard.

## Troubleshooting

### "Missing Google service account credentials"

Ensure `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` are set correctly.

### "Could not parse view count from page"

GIPHY may have changed their page structure. The parser uses multiple strategies but may need updates.

### Sheets permission denied

Make sure the Google Sheet is shared with your service account email with Editor access.

### Private key errors

If you see errors about the private key:
1. Make sure the entire key is included (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)
2. In `.env.local`, use quotes around the value
3. In Vercel, paste the raw key - Vercel handles the formatting

## License

MIT
