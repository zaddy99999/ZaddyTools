'use client';

import { useMemo } from 'react';

interface ActivityDay {
  date: string;
  count: number;
}

interface ActivityHeatmapProps {
  activityData: ActivityDay[];
  walletAge: number;
}

export default function ActivityHeatmap({ activityData, walletAge }: ActivityHeatmapProps) {
  const { weeks, maxCount, totalTxs, activeDays } = useMemo(() => {
    // Create a map of date -> count
    const activityMap = new Map<string, number>();
    activityData.forEach(d => {
      activityMap.set(d.date, d.count);
    });

    // Generate last 52 weeks (364 days)
    const today = new Date();
    const weeks: { date: string; count: number; dayOfWeek: number }[][] = [];
    let currentWeek: { date: string; count: number; dayOfWeek: number }[] = [];
    let maxCount = 0;
    let totalTxs = 0;
    let activeDays = 0;

    for (let i = 363; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      const count = activityMap.get(dateStr) || 0;

      if (count > maxCount) maxCount = count;
      totalTxs += count;
      if (count > 0) activeDays++;

      currentWeek.push({ date: dateStr, count, dayOfWeek });

      if (dayOfWeek === 6 || i === 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    return { weeks, maxCount, totalTxs, activeDays };
  }, [activityData]);

  const getColor = (count: number): string => {
    if (count === 0) return 'rgba(255, 255, 255, 0.03)';
    const intensity = Math.min(count / Math.max(maxCount, 1), 1);
    if (intensity < 0.25) return 'rgba(46, 219, 132, 0.2)';
    if (intensity < 0.5) return 'rgba(46, 219, 132, 0.4)';
    if (intensity < 0.75) return 'rgba(46, 219, 132, 0.6)';
    return 'rgba(46, 219, 132, 0.9)';
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate month labels
  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, weekIndex) => {
      if (week.length > 0) {
        const date = new Date(week[0].date);
        const month = date.getMonth();
        if (month !== lastMonth) {
          labels.push({ month: months[month], weekIndex });
          lastMonth = month;
        }
      }
    });
    return labels;
  }, [weeks]);

  return (
    <div className="activity-heatmap">
      <div className="heatmap-header">
        <h3>Transaction Activity</h3>
        <div className="heatmap-stats">
          <span>{totalTxs.toLocaleString()} txs</span>
          <span className="separator">·</span>
          <span>{activeDays} active days</span>
          <span className="separator">·</span>
          <span>{walletAge}d old</span>
        </div>
      </div>

      <div className="heatmap-container">
        {/* Month labels */}
        <div className="month-labels">
          {monthLabels.map((label, i) => (
            <span
              key={i}
              style={{ gridColumn: label.weekIndex + 2 }}
            >
              {label.month}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div className="heatmap-grid">
          {/* Day labels */}
          <div className="day-labels">
            <span></span>
            <span>Mon</span>
            <span></span>
            <span>Wed</span>
            <span></span>
            <span>Fri</span>
            <span></span>
          </div>

          {/* Weeks */}
          <div className="weeks-container">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="week">
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className="day"
                    style={{ backgroundColor: getColor(day.count) }}
                    title={`${day.date}: ${day.count} transactions`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="heatmap-legend">
          <span>Less</span>
          <div className="legend-squares">
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }} />
            <div style={{ backgroundColor: 'rgba(46, 219, 132, 0.2)' }} />
            <div style={{ backgroundColor: 'rgba(46, 219, 132, 0.4)' }} />
            <div style={{ backgroundColor: 'rgba(46, 219, 132, 0.6)' }} />
            <div style={{ backgroundColor: 'rgba(46, 219, 132, 0.9)' }} />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
