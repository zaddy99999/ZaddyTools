'use client';

import useSWR from 'swr';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

interface ETFFlowDay {
  date: string;
  total: number;
  ibit: number;
  fbtc: number;
  gbtc: number;
  arkb: number;
  bitb: number;
  others: number;
}

interface ETFFlowsData {
  flows: ETFFlowDay[];
  totalAUM: number;
  netFlow7d: number;
  netFlow30d: number;
  lastUpdated: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ETFFlows() {
  const { data, isLoading, error } = useSWR<ETFFlowsData>(
    '/api/crypto/etf-flows',
    fetcher,
    { refreshInterval: 300000 }
  );

  if (isLoading) {
    return (
      <div className="etf-flows-card">
        <p className="widget-label">Bitcoin ETF Flows</p>
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  if (error || !data || !data.flows) {
    return (
      <div className="etf-flows-card">
        <p className="widget-label">Bitcoin ETF Flows</p>
        <p className="widget-empty">Failed to load ETF data</p>
      </div>
    );
  }

  const { flows, totalAUM, netFlow7d, netFlow30d } = data;

  // Format for chart
  const chartData = flows.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    total: d.total,
    ibit: d.ibit,
    fbtc: d.fbtc,
    gbtc: d.gbtc,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="etf-tooltip">
          <p className="tooltip-date">{label}</p>
          <p className={`tooltip-total ${d.total >= 0 ? 'positive' : 'negative'}`}>
            Total: {d.total >= 0 ? '+' : ''}{d.total.toFixed(1)}M
          </p>
          <div className="tooltip-breakdown">
            <span>IBIT: {d.ibit >= 0 ? '+' : ''}{d.ibit.toFixed(1)}M</span>
            <span>FBTC: {d.fbtc >= 0 ? '+' : ''}{d.fbtc.toFixed(1)}M</span>
            <span>GBTC: {d.gbtc >= 0 ? '+' : ''}{d.gbtc.toFixed(1)}M</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="etf-flows-card">
      <div className="etf-flows-header">
        <p className="widget-label">Bitcoin ETF Flows</p>
        <div className="etf-aum">
          <span className="aum-label">Total AUM</span>
          <span className="aum-value">${totalAUM.toFixed(1)}B</span>
        </div>
      </div>

      <div className="etf-flows-stats">
        <div className="etf-stat">
          <span className="etf-stat-label">7D Net Flow</span>
          <span className={`etf-stat-value ${netFlow7d >= 0 ? 'positive' : 'negative'}`}>
            {netFlow7d >= 0 ? '+' : ''}{(netFlow7d / 1000).toFixed(2)}B
          </span>
        </div>
        <div className="etf-stat">
          <span className="etf-stat-label">14D Net Flow</span>
          <span className={`etf-stat-value ${netFlow30d >= 0 ? 'positive' : 'negative'}`}>
            {netFlow30d >= 0 ? '+' : ''}{(netFlow30d / 1000).toFixed(2)}B
          </span>
        </div>
      </div>

      <div className="etf-flows-chart">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="date"
              tick={{ fill: '#666', fontSize: 9 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              interval={2}
            />
            <YAxis
              tick={{ fill: '#666', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}M`}
              label={{ value: 'Millions ($)', angle: -90, position: 'insideLeft', fill: '#555', fontSize: 8, dy: 30 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
            <Bar dataKey="total" radius={[2, 2, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.total >= 0 ? '#2edb84' : '#ef4444'}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="etf-flows-footer">
        <div className="etf-legend">
          <span className="legend-item"><span className="legend-dot ibit"></span>IBIT</span>
          <span className="legend-item"><span className="legend-dot fbtc"></span>FBTC</span>
          <span className="legend-item"><span className="legend-dot gbtc"></span>GBTC</span>
        </div>
        <a
          href="https://www.coinglass.com/bitcoin-etf"
          target="_blank"
          rel="noopener noreferrer"
          className="data-source-link"
        >
          View on CoinGlass
        </a>
      </div>
    </div>
  );
}
