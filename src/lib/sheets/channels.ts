import {
  ScrapedChannel,
  RunStatus,
  ChannelDisplayData,
  ChannelCategory,
} from '../types';
import {
  getSheets,
  getSpreadsheetId,
  getSpreadsheetIdForTab,
  formatDate,
  formatTimestamp,
  TABS,
} from './auth';

export async function appendToDailyLog(channels: ScrapedChannel[]): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetIdForTab(TABS.DAILY_LOG);
  const now = new Date();
  const date = formatDate(now);
  const timestamp = formatTimestamp(now);

  const rows = channels.map((ch) => [
    date,
    timestamp,
    ch.channelName,
    ch.channelUrl,
    ch.rank,
    ch.category,
    ch.isAbstract ? 'yes' : 'no',
    ch.logoUrl || '',
    ch.parseFailed ? '' : ch.totalViews,
    ch.gifCount !== null ? ch.gifCount : '',
    ch.parseFailed,
    ch.errorMessage || '',
    // Social data columns
    ch.tiktokUrl || '',
    ch.tiktokFollowers !== null && ch.tiktokFollowers !== undefined ? ch.tiktokFollowers : '',
    ch.tiktokLikes !== null && ch.tiktokLikes !== undefined ? ch.tiktokLikes : '',
    ch.youtubeUrl || '',
    ch.youtubeSubscribers !== null && ch.youtubeSubscribers !== undefined ? ch.youtubeSubscribers : '',
    ch.youtubeViews !== null && ch.youtubeViews !== undefined ? ch.youtubeViews : '',
    ch.youtubeVideoCount !== null && ch.youtubeVideoCount !== undefined ? ch.youtubeVideoCount : '',
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${TABS.DAILY_LOG}!A:S`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rows,
    },
  });
}

export async function updateLatestTab(channels: ScrapedChannel[]): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetIdForTab(TABS.LATEST);
  const now = new Date();
  const date = formatDate(now);
  const timestamp = formatTimestamp(now);

  // Get current latest data
  const currentLatest = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TABS.LATEST}!A:I`,
  });

  const currentRows = currentLatest.data.values || [];
  const headerRow = currentRows.length > 0 ? currentRows[0] : [
    'channel_name',
    'channel_url',
    'rank',
    'category',
    'is_abstract',
    'logo_url',
    'total_views',
    'date',
    'timestamp',
  ];

  // Create a map of current data by URL
  const latestByUrl = new Map<string, string[]>();
  for (let i = 1; i < currentRows.length; i++) {
    const row = currentRows[i];
    if (row[1]) {
      latestByUrl.set(row[1], row);
    }
  }

  // Update with new successful scrapes
  for (const ch of channels) {
    if (!ch.parseFailed) {
      latestByUrl.set(ch.channelUrl, [
        ch.channelName,
        ch.channelUrl,
        String(ch.rank),
        ch.category,
        ch.isAbstract ? 'yes' : 'no',
        ch.logoUrl || '',
        String(ch.totalViews),
        date,
        timestamp,
      ]);
    }
  }

  // Convert back to rows
  const newRows = [headerRow, ...Array.from(latestByUrl.values())];

  // Clear and rewrite
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${TABS.LATEST}!A:I`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TABS.LATEST}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: newRows,
    },
  });
}

export async function updateMetricsTab(channels: ScrapedChannel[]): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetIdForTab(TABS.METRICS);
  const now = new Date();
  const timestamp = formatTimestamp(now);

  // Get daily log to compute deltas
  const dailyLog = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TABS.DAILY_LOG}!A:L`,
  });

  const logRows = dailyLog.data.values || [];

  // Group by channel URL and date
  const viewsByChannelDate = new Map<string, Map<string, number>>();
  for (let i = 1; i < logRows.length; i++) {
    const row = logRows[i];
    const date = row[0];
    const channelUrl = row[3];
    const views = parseInt(row[8], 10); // column order: date, timestamp, name, url, rank, category, isAbstract, logo, views, gifCount, parseFailed, error
    const parseFailed = row[10] === 'TRUE' || row[10] === true;

    if (!parseFailed && !isNaN(views)) {
      if (!viewsByChannelDate.has(channelUrl)) {
        viewsByChannelDate.set(channelUrl, new Map());
      }
      viewsByChannelDate.get(channelUrl)!.set(date, views);
    }
  }

  // Compute metrics for each channel
  const metricsRows: string[][] = [
    [
      'channel_name',
      'channel_url',
      'rank',
      'category',
      'is_abstract',
      'logo_url',
      'latest_total_views',
      'gif_count',
      'delta_1d',
      'avg_7d_delta',
      'last_updated',
      'tiktok_url',
      'tiktok_followers',
      'tiktok_likes',
      'youtube_url',
      'youtube_subscribers',
      'youtube_views',
      'youtube_video_count',
    ],
  ];

  for (const ch of channels) {
    if (ch.parseFailed) continue;

    const channelHistory = viewsByChannelDate.get(ch.channelUrl);
    let delta1d: number | null = null;
    let avg7dDelta: number | null = null;

    if (channelHistory) {
      // Get sorted dates
      const dates = Array.from(channelHistory.keys()).sort();
      const todayViews = ch.totalViews;

      // Find previous day's views
      if (dates.length >= 1) {
        const prevDate = dates[dates.length - 1];
        const prevViews = channelHistory.get(prevDate);
        if (prevViews !== undefined) {
          delta1d = todayViews - prevViews;
        }
      }

      // Calculate 7-day rolling average of deltas
      if (dates.length >= 2) {
        const recentDates = dates.slice(-8); // Need 8 days to get 7 deltas
        const deltas: number[] = [];
        for (let i = 1; i < recentDates.length; i++) {
          const prev = channelHistory.get(recentDates[i - 1]);
          const curr = channelHistory.get(recentDates[i]);
          if (prev !== undefined && curr !== undefined) {
            deltas.push(curr - prev);
          }
        }
        // Include today's delta if we have it
        if (delta1d !== null) {
          deltas.push(delta1d);
        }
        if (deltas.length > 0) {
          const recentDeltas = deltas.slice(-7);
          avg7dDelta = Math.round(
            recentDeltas.reduce((a, b) => a + b, 0) / recentDeltas.length
          );
        }
      }
    }

    metricsRows.push([
      ch.channelName,
      ch.channelUrl,
      String(ch.rank),
      ch.category,
      ch.isAbstract ? 'yes' : 'no',
      ch.logoUrl || '',
      String(ch.totalViews),
      ch.gifCount !== null ? String(ch.gifCount) : '',
      delta1d !== null ? String(delta1d) : '',
      avg7dDelta !== null ? String(avg7dDelta) : '',
      timestamp,
      ch.tiktokUrl || '',
      ch.tiktokFollowers !== null && ch.tiktokFollowers !== undefined ? String(ch.tiktokFollowers) : '',
      ch.tiktokLikes !== null && ch.tiktokLikes !== undefined ? String(ch.tiktokLikes) : '',
      ch.youtubeUrl || '',
      ch.youtubeSubscribers !== null && ch.youtubeSubscribers !== undefined ? String(ch.youtubeSubscribers) : '',
      ch.youtubeViews !== null && ch.youtubeViews !== undefined ? String(ch.youtubeViews) : '',
      ch.youtubeVideoCount !== null && ch.youtubeVideoCount !== undefined ? String(ch.youtubeVideoCount) : '',
    ]);
  }

  // Clear and rewrite metrics
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${TABS.METRICS}!A:R`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TABS.METRICS}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: metricsRows,
    },
  });
}

export async function getLatestData(): Promise<ChannelDisplayData[]> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetIdForTab(TABS.METRICS);

  try {
    const metricsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.METRICS}!A:R`,
    });

    const rows = metricsResponse.data.values || [];
    if (rows.length <= 1) return [];

    return rows.slice(1).map((row) => ({
      channelName: row[0] || '',
      channelUrl: row[1] || '',
      rank: parseInt(row[2], 10) || 0,
      category: (row[3] as ChannelCategory) || 'web2',
      isAbstract: row[4]?.toLowerCase() === 'yes' || row[4]?.toLowerCase() === 'true',
      logoUrl: row[5] || null,
      totalViews: parseInt(row[6], 10) || 0,
      gifCount: row[7] ? parseInt(row[7], 10) : null,
      delta1d: row[8] ? parseInt(row[8], 10) : null,
      avg7dDelta: row[9] ? parseInt(row[9], 10) : null,
      tiktokUrl: row[11] || undefined,
      tiktokFollowers: row[12] ? parseInt(row[12], 10) : null,
      tiktokLikes: row[13] ? parseInt(row[13], 10) : null,
      youtubeUrl: row[14] || undefined,
      youtubeSubscribers: row[15] ? parseInt(row[15], 10) : null,
      youtubeViews: row[16] ? parseInt(row[16], 10) : null,
      youtubeVideoCount: row[17] ? parseInt(row[17], 10) : null,
    }));
  } catch (error) {
    console.error('Error fetching latest data:', error);
    return [];
  }
}

export async function getRunStatus(): Promise<RunStatus> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetIdForTab(TABS.DAILY_LOG);

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TABS.DAILY_LOG}!A:L`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return {
        lastRunTime: null,
        status: 'never_run',
        channelsProcessed: 0,
        channelsFailed: 0,
      };
    }

    // Get the last run's timestamp (most recent row)
    const lastRow = rows[rows.length - 1];
    const lastTimestamp = lastRow[1];

    // Count channels from the last run
    const lastDate = lastRow[0];
    let channelsProcessed = 0;
    let channelsFailed = 0;

    for (let i = rows.length - 1; i >= 1; i--) {
      if (rows[i][0] !== lastDate) break;
      channelsProcessed++;
      // parseFailed is at column index 10 (date, timestamp, name, url, rank, category, isAbstract, logo, views, gifCount, parseFailed, error)
      if (rows[i][10] === 'TRUE' || rows[i][10] === true) {
        channelsFailed++;
      }
    }

    let status: 'success' | 'partial' | 'failed';
    if (channelsFailed === 0) {
      status = 'success';
    } else if (channelsFailed === channelsProcessed) {
      status = 'failed';
    } else {
      status = 'partial';
    }

    return {
      lastRunTime: lastTimestamp,
      status,
      channelsProcessed,
      channelsFailed,
    };
  } catch (error) {
    console.error('Error fetching run status:', error);
    return {
      lastRunTime: null,
      status: 'never_run',
      channelsProcessed: 0,
      channelsFailed: 0,
    };
  }
}

export async function ensureTabsExist(): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  // Get existing sheets
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const existingTabs = new Set(
    spreadsheet.data.sheets?.map((s) => s.properties?.title) || []
  );

  const tabsToCreate = Object.values(TABS).filter((tab) => !existingTabs.has(tab));

  if (tabsToCreate.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: tabsToCreate.map((title) => ({
          addSheet: {
            properties: { title },
          },
        })),
      },
    });

    // Add headers to new tabs
    const headerUpdates = [];

    if (tabsToCreate.includes(TABS.DAILY_LOG)) {
      headerUpdates.push({
        range: `${TABS.DAILY_LOG}!A1:K1`,
        values: [[
          'date',
          'timestamp',
          'channel_name',
          'channel_url',
          'rank',
          'category',
          'is_abstract',
          'logo_url',
          'total_views',
          'parse_failed',
          'error_message',
        ]],
      });
    }

    if (tabsToCreate.includes(TABS.LATEST)) {
      headerUpdates.push({
        range: `${TABS.LATEST}!A1:I1`,
        values: [[
          'channel_name',
          'channel_url',
          'rank',
          'category',
          'is_abstract',
          'logo_url',
          'total_views',
          'date',
          'timestamp',
        ]],
      });
    }

    if (tabsToCreate.includes(TABS.METRICS)) {
      headerUpdates.push({
        range: `${TABS.METRICS}!A1:J1`,
        values: [[
          'channel_name',
          'channel_url',
          'rank',
          'category',
          'is_abstract',
          'logo_url',
          'latest_total_views',
          'delta_1d',
          'avg_7d_delta',
          'last_updated',
        ]],
      });
    }

    if (headerUpdates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: headerUpdates,
        },
      });
    }
  }
}
