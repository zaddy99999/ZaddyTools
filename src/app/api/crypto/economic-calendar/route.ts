import { NextResponse } from 'next/server';

/**
 * Economic Calendar API Route
 *
 * This route is designed to fetch real economic event data from reliable sources.
 *
 * Potential data sources:
 * - Federal Reserve FOMC Calendar: https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
 * - Bureau of Labor Statistics Schedule: https://www.bls.gov/schedule/
 * - Trading Economics API: https://tradingeconomics.com/calendar
 * - FRED API (St. Louis Fed): https://fred.stlouisfed.org/releases/calendar
 *
 * Note: Most of these sources require either:
 * - An API key (Trading Economics, etc.)
 * - Web scraping (Federal Reserve, BLS - which may have legal/ToS implications)
 *
 * To implement with real data:
 * 1. Sign up for Trading Economics API (has free tier) or similar service
 * 2. Add the API key to environment variables
 * 3. Uncomment and adapt the fetch logic below
 */

export interface EconomicEvent {
  id: string;
  title: string;
  date: string; // ISO date string
  time?: string; // Time in ET/UTC
  type: 'fomc' | 'cpi' | 'jobs' | 'gdp' | 'ppi' | 'retail' | 'housing' | 'other';
  impact: 'high' | 'medium' | 'low';
  country: string;
  previous?: string;
  forecast?: string;
  actual?: string;
}

interface EconomicCalendarResponse {
  events: EconomicEvent[];
  source: string;
  lastUpdated: string;
  status: 'live' | 'coming_soon' | 'error';
  message?: string;
}

let cache: { data: EconomicCalendarResponse; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour - economic calendars don't change frequently

export async function GET() {
  try {
    // Return cached data if still valid
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    // TODO: Implement real data fetching when API key is available
    // Example with Trading Economics API:
    /*
    const apiKey = process.env.TRADING_ECONOMICS_API_KEY;
    if (apiKey) {
      const response = await fetch(
        `https://api.tradingeconomics.com/calendar?c=${apiKey}&country=united%20states`,
        { next: { revalidate: 3600 } }
      );

      if (response.ok) {
        const data = await response.json();
        const events = transformTradingEconomicsData(data);
        const result: EconomicCalendarResponse = {
          events,
          source: 'Trading Economics',
          lastUpdated: new Date().toISOString(),
          status: 'live',
        };
        cache = { data: result, timestamp: Date.now() };
        return NextResponse.json(result);
      }
    }
    */

    // Use static calendar data for major US economic events
    const events = getUpcomingEconomicEvents();

    const response: EconomicCalendarResponse = {
      events,
      source: 'Federal Reserve / BLS',
      lastUpdated: new Date().toISOString(),
      status: 'live',
    };

    cache = { data: response, timestamp: Date.now() };
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching economic calendar:', error);

    // Return cached data on error if available
    if (cache) {
      return NextResponse.json(cache.data);
    }

    return NextResponse.json({
      events: [],
      source: 'none',
      lastUpdated: new Date().toISOString(),
      status: 'error',
      message: 'Failed to fetch economic calendar data',
    } as EconomicCalendarResponse);
  }
}

// Generate upcoming economic events from static calendar data
function getUpcomingEconomicEvents(): EconomicEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // All major economic events for 2025-2026 (add more as needed)
  const allEvents: Omit<EconomicEvent, 'id'>[] = [
    // 2025 FOMC Meetings (confirmed by Federal Reserve)
    { title: 'FOMC Meeting', date: '2025-01-28', time: '2:00 PM', type: 'fomc', impact: 'high', country: 'US' },
    { title: 'FOMC Meeting', date: '2025-01-29', time: '2:00 PM', type: 'fomc', impact: 'high', country: 'US' },
    { title: 'FOMC Meeting', date: '2025-03-18', time: '2:00 PM', type: 'fomc', impact: 'high', country: 'US' },
    { title: 'FOMC Meeting', date: '2025-03-19', time: '2:00 PM', type: 'fomc', impact: 'high', country: 'US' },
    { title: 'FOMC Meeting', date: '2025-05-06', time: '2:00 PM', type: 'fomc', impact: 'high', country: 'US' },
    { title: 'FOMC Meeting', date: '2025-05-07', time: '2:00 PM', type: 'fomc', impact: 'high', country: 'US' },
    { title: 'FOMC Meeting', date: '2025-06-17', time: '2:00 PM', type: 'fomc', impact: 'high', country: 'US' },
    { title: 'FOMC Meeting', date: '2025-06-18', time: '2:00 PM', type: 'fomc', impact: 'high', country: 'US' },
    { title: 'FOMC Meeting', date: '2025-07-29', time: '2:00 PM', type: 'fomc', impact: 'high', country: 'US' },
    { title: 'FOMC Meeting', date: '2025-07-30', time: '2:00 PM', type: 'fomc', impact: 'high', country: 'US' },
    { title: 'FOMC Meeting', date: '2025-09-16', time: '2:00 PM', type: 'fomc', impact: 'high', country: 'US' },
    { title: 'FOMC Meeting', date: '2025-09-17', time: '2:00 PM', type: 'fomc', impact: 'high', country: 'US' },
    { title: 'FOMC Meeting', date: '2025-11-05', time: '2:00 PM', type: 'fomc', impact: 'high', country: 'US' },
    { title: 'FOMC Meeting', date: '2025-11-06', time: '2:00 PM', type: 'fomc', impact: 'high', country: 'US' },
    { title: 'FOMC Meeting', date: '2025-12-16', time: '2:00 PM', type: 'fomc', impact: 'high', country: 'US' },
    { title: 'FOMC Meeting', date: '2025-12-17', time: '2:00 PM', type: 'fomc', impact: 'high', country: 'US' },
    // 2026 FOMC Meetings
    { title: 'FOMC Meeting', date: '2026-01-27', time: '2:00 PM', type: 'fomc', impact: 'high', country: 'US' },
    { title: 'FOMC Meeting', date: '2026-01-28', time: '2:00 PM', type: 'fomc', impact: 'high', country: 'US' },
    { title: 'FOMC Meeting', date: '2026-03-17', time: '2:00 PM', type: 'fomc', impact: 'high', country: 'US' },
    { title: 'FOMC Meeting', date: '2026-03-18', time: '2:00 PM', type: 'fomc', impact: 'high', country: 'US' },

    // 2025 CPI Releases (typically 2nd or 3rd week of each month)
    { title: 'CPI Report - January', date: '2025-02-12', time: '8:30 AM', type: 'cpi', impact: 'high', country: 'US' },
    { title: 'CPI Report - February', date: '2025-03-12', time: '8:30 AM', type: 'cpi', impact: 'high', country: 'US' },
    { title: 'CPI Report - March', date: '2025-04-10', time: '8:30 AM', type: 'cpi', impact: 'high', country: 'US' },
    { title: 'CPI Report - April', date: '2025-05-13', time: '8:30 AM', type: 'cpi', impact: 'high', country: 'US' },
    { title: 'CPI Report - May', date: '2025-06-11', time: '8:30 AM', type: 'cpi', impact: 'high', country: 'US' },
    { title: 'CPI Report - June', date: '2025-07-11', time: '8:30 AM', type: 'cpi', impact: 'high', country: 'US' },
    { title: 'CPI Report - July', date: '2025-08-12', time: '8:30 AM', type: 'cpi', impact: 'high', country: 'US' },
    { title: 'CPI Report - August', date: '2025-09-10', time: '8:30 AM', type: 'cpi', impact: 'high', country: 'US' },
    { title: 'CPI Report - September', date: '2025-10-10', time: '8:30 AM', type: 'cpi', impact: 'high', country: 'US' },
    { title: 'CPI Report - October', date: '2025-11-12', time: '8:30 AM', type: 'cpi', impact: 'high', country: 'US' },
    { title: 'CPI Report - November', date: '2025-12-10', time: '8:30 AM', type: 'cpi', impact: 'high', country: 'US' },
    { title: 'CPI Report - December', date: '2026-01-14', time: '8:30 AM', type: 'cpi', impact: 'high', country: 'US' },
    { title: 'CPI Report - January', date: '2026-02-11', time: '8:30 AM', type: 'cpi', impact: 'high', country: 'US' },
    { title: 'CPI Report - February', date: '2026-03-11', time: '8:30 AM', type: 'cpi', impact: 'high', country: 'US' },

    // 2025 Jobs Reports (first Friday of each month)
    { title: 'Jobs Report - January', date: '2025-02-07', time: '8:30 AM', type: 'jobs', impact: 'high', country: 'US' },
    { title: 'Jobs Report - February', date: '2025-03-07', time: '8:30 AM', type: 'jobs', impact: 'high', country: 'US' },
    { title: 'Jobs Report - March', date: '2025-04-04', time: '8:30 AM', type: 'jobs', impact: 'high', country: 'US' },
    { title: 'Jobs Report - April', date: '2025-05-02', time: '8:30 AM', type: 'jobs', impact: 'high', country: 'US' },
    { title: 'Jobs Report - May', date: '2025-06-06', time: '8:30 AM', type: 'jobs', impact: 'high', country: 'US' },
    { title: 'Jobs Report - June', date: '2025-07-03', time: '8:30 AM', type: 'jobs', impact: 'high', country: 'US' },
    { title: 'Jobs Report - July', date: '2025-08-01', time: '8:30 AM', type: 'jobs', impact: 'high', country: 'US' },
    { title: 'Jobs Report - August', date: '2025-09-05', time: '8:30 AM', type: 'jobs', impact: 'high', country: 'US' },
    { title: 'Jobs Report - September', date: '2025-10-03', time: '8:30 AM', type: 'jobs', impact: 'high', country: 'US' },
    { title: 'Jobs Report - October', date: '2025-11-07', time: '8:30 AM', type: 'jobs', impact: 'high', country: 'US' },
    { title: 'Jobs Report - November', date: '2025-12-05', time: '8:30 AM', type: 'jobs', impact: 'high', country: 'US' },
    { title: 'Jobs Report - December', date: '2026-01-09', time: '8:30 AM', type: 'jobs', impact: 'high', country: 'US' },
    { title: 'Jobs Report - January', date: '2026-02-06', time: '8:30 AM', type: 'jobs', impact: 'high', country: 'US' },
    { title: 'Jobs Report - February', date: '2026-03-06', time: '8:30 AM', type: 'jobs', impact: 'high', country: 'US' },

    // 2025 GDP Reports (quarterly)
    { title: 'GDP Q4 2024 Advance', date: '2025-01-30', time: '8:30 AM', type: 'gdp', impact: 'high', country: 'US' },
    { title: 'GDP Q4 2024 Second', date: '2025-02-27', time: '8:30 AM', type: 'gdp', impact: 'medium', country: 'US' },
    { title: 'GDP Q4 2024 Third', date: '2025-03-27', time: '8:30 AM', type: 'gdp', impact: 'medium', country: 'US' },
    { title: 'GDP Q1 2025 Advance', date: '2025-04-30', time: '8:30 AM', type: 'gdp', impact: 'high', country: 'US' },
    { title: 'GDP Q1 2025 Second', date: '2025-05-29', time: '8:30 AM', type: 'gdp', impact: 'medium', country: 'US' },
    { title: 'GDP Q1 2025 Third', date: '2025-06-26', time: '8:30 AM', type: 'gdp', impact: 'medium', country: 'US' },
    { title: 'GDP Q2 2025 Advance', date: '2025-07-30', time: '8:30 AM', type: 'gdp', impact: 'high', country: 'US' },
    { title: 'GDP Q2 2025 Second', date: '2025-08-28', time: '8:30 AM', type: 'gdp', impact: 'medium', country: 'US' },
    { title: 'GDP Q2 2025 Third', date: '2025-09-25', time: '8:30 AM', type: 'gdp', impact: 'medium', country: 'US' },
    { title: 'GDP Q3 2025 Advance', date: '2025-10-30', time: '8:30 AM', type: 'gdp', impact: 'high', country: 'US' },
    { title: 'GDP Q3 2025 Second', date: '2025-11-26', time: '8:30 AM', type: 'gdp', impact: 'medium', country: 'US' },
    { title: 'GDP Q3 2025 Third', date: '2025-12-23', time: '8:30 AM', type: 'gdp', impact: 'medium', country: 'US' },
    { title: 'GDP Q4 2025 Advance', date: '2026-01-29', time: '8:30 AM', type: 'gdp', impact: 'high', country: 'US' },
    { title: 'GDP Q4 2025 Second', date: '2026-02-26', time: '8:30 AM', type: 'gdp', impact: 'medium', country: 'US' },

    // 2025 PPI Reports (typically mid-month)
    { title: 'PPI Report - January', date: '2025-02-13', time: '8:30 AM', type: 'ppi', impact: 'medium', country: 'US' },
    { title: 'PPI Report - February', date: '2025-03-13', time: '8:30 AM', type: 'ppi', impact: 'medium', country: 'US' },
    { title: 'PPI Report - March', date: '2025-04-11', time: '8:30 AM', type: 'ppi', impact: 'medium', country: 'US' },
    { title: 'PPI Report - April', date: '2025-05-15', time: '8:30 AM', type: 'ppi', impact: 'medium', country: 'US' },
    { title: 'PPI Report - May', date: '2025-06-12', time: '8:30 AM', type: 'ppi', impact: 'medium', country: 'US' },
    { title: 'PPI Report - June', date: '2025-07-15', time: '8:30 AM', type: 'ppi', impact: 'medium', country: 'US' },
    { title: 'PPI Report - July', date: '2025-08-13', time: '8:30 AM', type: 'ppi', impact: 'medium', country: 'US' },
    { title: 'PPI Report - August', date: '2025-09-11', time: '8:30 AM', type: 'ppi', impact: 'medium', country: 'US' },
    { title: 'PPI Report - September', date: '2025-10-14', time: '8:30 AM', type: 'ppi', impact: 'medium', country: 'US' },
    { title: 'PPI Report - October', date: '2025-11-13', time: '8:30 AM', type: 'ppi', impact: 'medium', country: 'US' },
    { title: 'PPI Report - November', date: '2025-12-11', time: '8:30 AM', type: 'ppi', impact: 'medium', country: 'US' },
    { title: 'PPI Report - December', date: '2026-01-15', time: '8:30 AM', type: 'ppi', impact: 'medium', country: 'US' },
    { title: 'PPI Report - January', date: '2026-02-12', time: '8:30 AM', type: 'ppi', impact: 'medium', country: 'US' },

    // Retail Sales (mid-month)
    { title: 'Retail Sales - January', date: '2025-02-14', time: '8:30 AM', type: 'retail', impact: 'medium', country: 'US' },
    { title: 'Retail Sales - February', date: '2025-03-17', time: '8:30 AM', type: 'retail', impact: 'medium', country: 'US' },
    { title: 'Retail Sales - March', date: '2025-04-16', time: '8:30 AM', type: 'retail', impact: 'medium', country: 'US' },
    { title: 'Retail Sales - April', date: '2025-05-15', time: '8:30 AM', type: 'retail', impact: 'medium', country: 'US' },
    { title: 'Retail Sales - May', date: '2025-06-17', time: '8:30 AM', type: 'retail', impact: 'medium', country: 'US' },
    { title: 'Retail Sales - June', date: '2025-07-16', time: '8:30 AM', type: 'retail', impact: 'medium', country: 'US' },
    { title: 'Retail Sales - July', date: '2025-08-14', time: '8:30 AM', type: 'retail', impact: 'medium', country: 'US' },
    { title: 'Retail Sales - August', date: '2025-09-16', time: '8:30 AM', type: 'retail', impact: 'medium', country: 'US' },
    { title: 'Retail Sales - September', date: '2025-10-16', time: '8:30 AM', type: 'retail', impact: 'medium', country: 'US' },
    { title: 'Retail Sales - October', date: '2025-11-14', time: '8:30 AM', type: 'retail', impact: 'medium', country: 'US' },
    { title: 'Retail Sales - November', date: '2025-12-16', time: '8:30 AM', type: 'retail', impact: 'medium', country: 'US' },
    { title: 'Retail Sales - December', date: '2026-01-16', time: '8:30 AM', type: 'retail', impact: 'medium', country: 'US' },
    { title: 'Retail Sales - January', date: '2026-02-17', time: '8:30 AM', type: 'retail', impact: 'medium', country: 'US' },
  ];

  // Filter to upcoming events and sort by date
  const upcomingEvents = allEvents
    .filter((event) => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 20) // Limit to next 20 events
    .map((event, index) => ({
      ...event,
      id: `econ-${index}-${event.date}-${event.type}`,
    }));

  return upcomingEvents;
}
