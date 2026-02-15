'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

interface GasPrice {
  slow: number;
  standard: number;
  fast: number;
  timestamp: number;
}

interface GasHistoryData {
  current: {
    slow: number;
    standard: number;
    fast: number;
    baseFee: number;
  };
  history: GasPrice[];
  hourlyAverage: { hour: number; avgGas: number }[];
}

type ViewMode = 'history' | 'hourly';
type TimePeriod = '24h' | '7d';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function GasTracker() {
  const [viewMode, setViewMode] = useState<ViewMode>('history');
  const [period, setPeriod] = useState<TimePeriod>('24h');

  const { data, isLoading } = useSWR<GasHistoryData>(
    `/api/crypto/gas-history?period=${period}`,
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );

  if (isLoading) {
    return (
      <div className="widget-card gas-tracker-card">
        <div className="gas-tracker-header">
          <p className="widget-label">Gas Tracker</p>
        </div>
        <div className="gas-current-prices">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton skeleton-row" style={{ height: '60px' }} />
          ))}
        </div>
        <div className="gas-chart-container">
          <div className="skeleton" style={{ height: '150px' }} />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="widget-card gas-tracker-card">
        <p className="widget-label">Gas Tracker</p>
        <p className="widget-empty">Unable to load gas data</p>
      </div>
    );
  }

  const { current, history, hourlyAverage } = data;

  // Determine gas level status
  const getGasStatus = (gwei: number): { label: string; color: string } => {
    if (gwei < 20) return { label: 'Low', color: '#22c55e' };
    if (gwei < 50) return { label: 'Normal', color: '#f59e0b' };
    if (gwei < 100) return { label: 'High', color: '#ef4444' };
    return { label: 'Very High', color: '#dc2626' };
  };

  const status = getGasStatus(current.standard);

  // Find best time to transact
  const bestHour = hourlyAverage.reduce(
    (min, curr) => (curr.avgGas < min.avgGas ? curr : min),
    hourlyAverage[0] || { hour: 0, avgGas: 0 }
  );

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h}${ampm}`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    if (period === '24h') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get min gas for the current hour's bar highlighting
  const minHourlyGas = Math.min(...hourlyAverage.map(h => h.avgGas));

  return (
    <div className="widget-card gas-tracker-card">
      <div className="gas-tracker-header">
        <div className="gas-header-left">
          <p className="widget-label">Gas Tracker</p>
          <span className="gas-status" style={{ color: status.color }}>
            {status.label}
          </span>
        </div>
        <div className="gas-controls">
          <div className="gas-view-toggles">
            <button
              className={`gas-toggle ${viewMode === 'history' ? 'active' : ''}`}
              onClick={() => setViewMode('history')}
            >
              History
            </button>
            <button
              className={`gas-toggle ${viewMode === 'hourly' ? 'active' : ''}`}
              onClick={() => setViewMode('hourly')}
            >
              By Hour
            </button>
          </div>
          {viewMode === 'history' && (
            <div className="gas-period-toggles">
              <button
                className={`gas-toggle ${period === '24h' ? 'active' : ''}`}
                onClick={() => setPeriod('24h')}
              >
                24H
              </button>
              <button
                className={`gas-toggle ${period === '7d' ? 'active' : ''}`}
                onClick={() => setPeriod('7d')}
              >
                7D
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Current gas prices */}
      <div className="gas-current-prices">
        <div className="gas-price-card slow">
          <span className="gas-price-label">Slow</span>
          <span className="gas-price-value">{current.slow}</span>
          <span className="gas-price-unit">gwei</span>
        </div>
        <div className="gas-price-card standard">
          <span className="gas-price-label">Standard</span>
          <span className="gas-price-value">{current.standard}</span>
          <span className="gas-price-unit">gwei</span>
        </div>
        <div className="gas-price-card fast">
          <span className="gas-price-label">Fast</span>
          <span className="gas-price-value">{current.fast}</span>
          <span className="gas-price-unit">gwei</span>
        </div>
      </div>

      {/* Base fee indicator */}
      <div className="gas-base-fee">
        <span>Base Fee:</span>
        <span className="gas-base-fee-value">{current.baseFee} gwei</span>
      </div>

      {/* Chart section */}
      <div className="gas-chart-container">
        {viewMode === 'history' && history.length > 0 && (
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gasGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#627EEA" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#627EEA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTimestamp}
                stroke="#666"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${v}`}
                stroke="#666"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={35}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(0,0,0,0.9)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelFormatter={(ts) => new Date(ts).toLocaleString()}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = { slow: 'Slow', standard: 'Standard', fast: 'Fast' };
                  return [`${value} gwei`, labels[name] || name];
                }}
              />
              <Area
                type="monotone"
                dataKey="standard"
                stroke="#627EEA"
                fill="url(#gasGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {viewMode === 'hourly' && hourlyAverage.length > 0 && (
          <>
            <div className="gas-best-time">
              <span>Best time to transact (UTC):</span>
              <span className="gas-best-time-value">
                {formatHour(bestHour.hour)} ({bestHour.avgGas} gwei avg)
              </span>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={hourlyAverage} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="hour"
                  tickFormatter={(h) => (h % 6 === 0 ? formatHour(h) : '')}
                  stroke="#666"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `${v}`}
                  stroke="#666"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0,0,0,0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value} gwei`, 'Avg Gas']}
                  labelFormatter={(hour) => `${formatHour(hour)} UTC`}
                />
                <Bar dataKey="avgGas" radius={[2, 2, 0, 0]}>
                  {hourlyAverage.map((entry) => (
                    <Cell
                      key={`cell-${entry.hour}`}
                      fill={entry.avgGas === minHourlyGas ? '#22c55e' : '#627EEA'}
                      opacity={entry.avgGas === minHourlyGas ? 1 : 0.6}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      <div className="gas-footer">
        <span className="gas-network">Ethereum Mainnet</span>
        <a
          href="https://etherscan.io/gastracker"
          target="_blank"
          rel="noopener noreferrer"
          className="data-source-link"
        >
          Data from Etherscan
        </a>
      </div>
    </div>
  );
}
