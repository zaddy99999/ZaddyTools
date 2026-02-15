'use client';

import useSWR from 'swr';

interface EconomicEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
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

const fetcher = (url: string) => fetch(url).then(res => res.json());

const typeIcons: Record<EconomicEvent['type'], string> = {
  fomc: 'FED',
  cpi: 'CPI',
  jobs: 'JOBS',
  gdp: 'GDP',
  ppi: 'PPI',
  retail: 'RETAIL',
  housing: 'HOME',
  other: 'ECON',
};

const typeLabels: Record<EconomicEvent['type'], string> = {
  fomc: 'FOMC Meeting',
  cpi: 'CPI Release',
  jobs: 'Jobs Report',
  gdp: 'GDP Report',
  ppi: 'PPI Release',
  retail: 'Retail Sales',
  housing: 'Housing Data',
  other: 'Economic Event',
};

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const eventDate = new Date(date);
  eventDate.setHours(0, 0, 0, 0);

  if (eventDate.getTime() === today.getTime()) return 'Today';
  if (eventDate.getTime() === tomorrow.getTime()) return 'Tomorrow';

  const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7 && diffDays > 0) return `In ${diffDays} days`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function EconomicCalendar() {
  const { data, isLoading, error } = useSWR<EconomicCalendarResponse>(
    '/api/crypto/economic-calendar',
    fetcher,
    { refreshInterval: 3600000 } // Refresh every hour
  );

  if (isLoading) {
    return (
      <div className="widget-card">
        <p className="widget-label">Economic Calendar</p>
        <div className="economic-calendar-list">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="widget-card">
        <p className="widget-label">Economic Calendar</p>
        <p className="widget-empty">Failed to load economic calendar</p>
      </div>
    );
  }

  // Handle "coming soon" status
  if (data?.status === 'coming_soon' || !data?.events || data.events.length === 0) {
    return (
      <div className="widget-card">
        <p className="widget-label">Economic Calendar</p>
        <div className="economic-calendar-coming-soon">
          <div className="coming-soon-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
            </svg>
          </div>
          <p className="coming-soon-title">Economic Calendar</p>
          <p className="coming-soon-message">
            {data?.message || 'Coming soon - sourcing reliable data from Federal Reserve, BLS, and other official sources.'}
          </p>
          <div className="coming-soon-events">
            <span className="coming-soon-event-type">FOMC Meetings</span>
            <span className="coming-soon-event-type">CPI Releases</span>
            <span className="coming-soon-event-type">Jobs Reports</span>
            <span className="coming-soon-event-type">GDP Data</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="widget-card">
      <div className="economic-calendar-header">
        <p className="widget-label">Economic Calendar</p>
        {data.source !== 'none' && (
          <span className="economic-calendar-source">via {data.source}</span>
        )}
      </div>
      <div className="economic-calendar-list scrollable">
        {data.events.map((event) => (
          <div
            key={event.id}
            className={`economic-event-item ${event.impact}`}
            title={formatFullDate(event.date)}
          >
            <span className={`economic-event-badge ${event.type}`}>
              {typeIcons[event.type]}
            </span>
            <div className="economic-event-info">
              <span className="economic-event-title">{event.title}</span>
              <span className="economic-event-category">{typeLabels[event.type]}</span>
            </div>
            <div className="economic-event-meta">
              <span className="economic-event-date">{formatEventDate(event.date)}</span>
              {event.time && (
                <span className="economic-event-time">{event.time} ET</span>
              )}
            </div>
            {(event.previous || event.forecast) && (
              <div className="economic-event-data">
                {event.previous && (
                  <span className="economic-event-previous">
                    Prev: {event.previous}
                  </span>
                )}
                {event.forecast && (
                  <span className="economic-event-forecast">
                    Exp: {event.forecast}
                  </span>
                )}
                {event.actual && (
                  <span className="economic-event-actual">
                    Act: {event.actual}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
