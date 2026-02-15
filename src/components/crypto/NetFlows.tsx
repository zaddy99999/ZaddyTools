'use client';

import { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { formatCompactNumber } from '@/lib/crypto/formatters';

interface FlowData {
  chain: string;
  inflow: number;
  outflow: number;
  net: number;
  logo: string;
}

type TimePeriod = '7d' | '1m' | '3m' | '1y';

const MIN_CHAINS = 15;
const MAX_RETRIES = 5;

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function NetFlows() {
  const [period, setPeriod] = useState<TimePeriod>('7d');
  const [isExpanded, setIsExpanded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const { data: flowData, isLoading, mutate } = useSWR<FlowData[]>(
    `/api/crypto/flows?period=${period}`,
    fetcher,
    { refreshInterval: 300000 }
  );

  // Retry if we don't have enough chains
  useEffect(() => {
    if (!isLoading && flowData && flowData.length < MIN_CHAINS && retryCount < MAX_RETRIES) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        mutate(); // Retry fetch
      }, 2000); // Wait 2 seconds between retries
      return () => clearTimeout(timer);
    }
  }, [flowData, isLoading, retryCount, mutate]);

  // Reset retry count when period changes
  useEffect(() => {
    setRetryCount(0);
  }, [period]);

  const lastUpdatedRef = useRef<string | null>(null);
  useEffect(() => {
    if (flowData) {
      lastUpdatedRef.current = new Date().toISOString();
    }
  }, [flowData]);

  // Sort from most positive to least positive (negative at bottom)
  const sortedData = flowData ? [...flowData].sort((a, b) => b.net - a.net) : [];
  const maxNet = sortedData.length > 0 ? Math.max(...sortedData.map(d => Math.abs(d.net))) : 1;

  // Determine if we're still waiting for data
  const needsMoreData = flowData && flowData.length < MIN_CHAINS && retryCount < MAX_RETRIES;
  const showLoading = isLoading || needsMoreData;
  const hasData = flowData && flowData.length > 0;

  return (
    <div className={`net-flows-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="net-flows-header">
        <p className="widget-label">Net Flows</p>
        <div className="net-flows-toggles">
          <button
            className="expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand for screenshot'}
          >
            {isExpanded ? '⊖' : '⊕'}
          </button>
          {(['7d', '1m', '3m', '1y'] as TimePeriod[]).map((p) => (
            <button
              key={p}
              className={`net-flows-toggle ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className={`net-flows-list ${isExpanded ? 'expanded' : ''}`} style={{ minHeight: '280px' }}>
        {showLoading ? (
          // Show skeleton rows while loading
          [...Array(8)].map((_, i) => (
            <div key={i} className="skeleton skeleton-row" />
          ))
        ) : !hasData ? (
          // Show message if no data after retries
          <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
            Unable to load flow data
          </div>
        ) : (
          // Show actual data
          sortedData.map((item) => {
            const isPositive = item.net >= 0;
            const barWidth = (Math.abs(item.net) / maxNet) * 50; // 50% max width each side
            const logoUrl = `https://icons.llamao.fi/icons/chains/rsz_${item.logo}.jpg`;

            return (
              <div key={item.chain} className="net-flow-row">
                <div className="net-flow-label">
                  <img
                    src={logoUrl}
                    alt={item.chain}
                    className="net-flow-logo"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <span className="net-flow-name">{item.chain}</span>
                </div>

                <div className="net-flow-centered-bar">
                  {/* Negative side (left) */}
                  <div className="net-flow-bar-half left">
                    {!isPositive && (
                      <div
                        className="net-flow-bar negative"
                        style={{ width: `${barWidth * 2}%` }}
                      />
                    )}
                  </div>
                  {/* Center line */}
                  <div className="net-flow-center-line" />
                  {/* Positive side (right) */}
                  <div className="net-flow-bar-half right">
                    {isPositive && (
                      <div
                        className="net-flow-bar positive"
                        style={{ width: `${barWidth * 2}%` }}
                      />
                    )}
                  </div>
                </div>

                <div className={`net-flow-value ${isPositive ? 'positive' : 'negative'}`}>
                  {isPositive ? '+' : ''}{formatCompactNumber(item.net, true)}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="net-flows-footer">
        <span className="data-source-link">Bridge data from DeFiLlama</span>
      </div>
      {lastUpdatedRef.current && (
        <span className="last-updated">
          Updated {new Date(lastUpdatedRef.current).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
