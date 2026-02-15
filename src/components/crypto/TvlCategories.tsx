'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCompactNumber, formatPercentage } from '@/lib/crypto/formatters';

interface CategoryData {
  name: string;
  tvl: number;
  change24h: number;
  protocolCount: number;
  topProtocols: string[];
  percentage: number;
}

interface TvlCategoriesResponse {
  categories: CategoryData[];
  totalTvl: number;
  updatedAt: string;
}

type ViewType = 'chart' | 'list';

const CATEGORY_COLORS: Record<string, string> = {
  'Lending': '#3b82f6',
  'Dexes': '#2edb84',
  'Liquid Staking': '#8b5cf6',
  'CDP': '#ec4899',
  'Bridge': '#f59e0b',
  'Derivatives': '#ef4444',
  'Yield': '#06b6d4',
  'RWA': '#84cc16',
  'Restaking': '#a855f7',
  'Services': '#14b8a6',
  'Yield Aggregator': '#f97316',
  'Leveraged Farming': '#6366f1',
  'Other': '#6b7280',
};

// Fallback color generator for any unlisted categories
function getCategoryColor(name: string): string {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  const colors = [
    '#3b82f6', '#2edb84', '#8b5cf6', '#ec4899', '#f59e0b',
    '#ef4444', '#06b6d4', '#84cc16', '#a855f7', '#14b8a6',
  ];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function TvlCategories() {
  const [view, setView] = useState<ViewType>('chart');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const { data, isLoading, error } = useSWR<TvlCategoriesResponse>(
    '/api/crypto/tvl-categories',
    fetcher,
    { refreshInterval: 300000 } // Refresh every 5 minutes
  );

  if (isLoading) {
    return (
      <div className="tvl-categories-card">
        <div className="tvl-categories-header">
          <p className="widget-label">TVL by Category</p>
        </div>
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  if (error || !data || !data.categories) {
    return (
      <div className="tvl-categories-card">
        <div className="tvl-categories-header">
          <p className="widget-label">TVL by Category</p>
        </div>
        <p className="widget-empty">Failed to load TVL categories</p>
      </div>
    );
  }

  const { categories, totalTvl } = data;

  // Prepare chart data (top categories for donut)
  const chartData = categories.slice(0, 8).map(cat => ({
    name: cat.name,
    value: cat.tvl,
    percentage: cat.percentage,
    change24h: cat.change24h,
  }));

  // Custom tooltip for the pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="tvl-categories-tooltip">
          <p className="tooltip-name">{data.name}</p>
          <p className="tooltip-value">${formatCompactNumber(data.value)}</p>
          <p className="tooltip-percentage">{data.percentage.toFixed(1)}% of total</p>
          <p className={`tooltip-change ${data.change24h >= 0 ? 'positive' : 'negative'}`}>
            {formatPercentage(data.change24h)} 24h
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="tvl-categories-card">
      <div className="tvl-categories-header">
        <p className="widget-label">TVL by Category</p>
        <div className="tvl-categories-controls">
          <div className="tvl-categories-total">
            <span className="total-label">Total DeFi TVL</span>
            <span className="total-value">${formatCompactNumber(totalTvl)}</span>
          </div>
          <div className="tvl-categories-toggles">
            <button
              className={`tvl-cat-toggle ${view === 'chart' ? 'active' : ''}`}
              onClick={() => setView('chart')}
            >
              Chart
            </button>
            <button
              className={`tvl-cat-toggle ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {view === 'chart' ? (
        <div className="tvl-categories-chart-container">
          <div className="tvl-categories-chart">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  onMouseEnter={(_, index) => setHoveredCategory(chartData[index].name)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getCategoryColor(entry.name)}
                      stroke="transparent"
                      style={{
                        opacity: hoveredCategory === null || hoveredCategory === entry.name ? 1 : 0.4,
                        transition: 'opacity 0.2s ease',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="tvl-categories-center-label">
              <span className="center-value">${formatCompactNumber(totalTvl)}</span>
              <span className="center-label">Total TVL</span>
            </div>
          </div>
          <div className="tvl-categories-legend">
            {chartData.map((cat, index) => (
              <div
                key={cat.name}
                className={`legend-item ${hoveredCategory === cat.name ? 'active' : ''}`}
                onMouseEnter={() => setHoveredCategory(cat.name)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <span
                  className="legend-color"
                  style={{ backgroundColor: getCategoryColor(cat.name) }}
                />
                <span className="legend-name">{cat.name}</span>
                <span className="legend-percentage">{cat.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="tvl-categories-list">
          {categories.map((cat, index) => (
            <div key={cat.name} className="tvl-category-item">
              <div className="category-rank-color">
                <span className="category-rank">{index + 1}</span>
                <span
                  className="category-color-dot"
                  style={{ backgroundColor: getCategoryColor(cat.name) }}
                />
              </div>
              <div className="category-info">
                <p className="category-name">{cat.name}</p>
                <p className="category-protocols">
                  {cat.protocolCount} protocols
                  {cat.topProtocols.length > 0 && (
                    <span className="category-top"> ({cat.topProtocols.slice(0, 2).join(', ')})</span>
                  )}
                </p>
              </div>
              <div className="category-stats">
                <p className="category-tvl">${formatCompactNumber(cat.tvl)}</p>
                <div className="category-meta">
                  <span className={`category-change ${cat.change24h >= 0 ? 'positive' : 'negative'}`}>
                    {formatPercentage(cat.change24h)}
                  </span>
                  <span className="category-percentage">{cat.percentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="tvl-categories-footer">
        <a
          href="https://defillama.com/categories"
          target="_blank"
          rel="noopener noreferrer"
          className="data-source-link"
        >
          Data from DeFiLlama
        </a>
      </div>
    </div>
  );
}
