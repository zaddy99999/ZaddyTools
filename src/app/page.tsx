'use client';

import { useState, useEffect, useCallback } from 'react';
import ChannelTable from '@/components/ChannelTable';
import { TotalViewsChart, TikTokFollowersChart, TikTokLikesChart } from '@/components/Charts';
import { ChannelDisplayData } from '@/lib/types';

interface StatusResponse {
  channels: ChannelDisplayData[];
  error?: string;
}

export default function Home() {
  const [channels, setChannels] = useState<ChannelDisplayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // GIPHY chart state
  const [giphyCategory, setGiphyCategory] = useState<'all' | 'web2' | 'web3' | 'abstract'>('web3');
  const [giphyScaleType, setGiphyScaleType] = useState<'linear' | 'sqrt' | 'log'>('sqrt');
  const [giphyTimePeriod, setGiphyTimePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'alltime'>('alltime');
  const [giphyChartCount, setGiphyChartCount] = useState<number>(15);

  // TikTok chart state
  const [tiktokCategory, setTiktokCategory] = useState<'all' | 'web2' | 'web3' | 'abstract'>('web3');
  const [tiktokChartCount, setTiktokChartCount] = useState<number>(15);
  const [tiktokMetric, setTiktokMetric] = useState<'followers' | 'likes'>('followers');

  // Table filter state
  const [tableCategory, setTableCategory] = useState<'all' | 'web2' | 'web3' | 'abstract'>('all');

  // Suggestion modal state
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestForm, setSuggestForm] = useState({
    projectName: '',
    giphyUrl: '',
    tiktokUrl: '',
    category: 'web3' as 'web2' | 'web3',
    notes: '',
  });
  const [suggestSubmitting, setSuggestSubmitting] = useState(false);
  const [suggestSuccess, setSuggestSuccess] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const handleSuggestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuggestSubmitting(true);
    setSuggestError(null);

    try {
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(suggestForm),
      });

      const data = await response.json();

      if (!response.ok) {
        setSuggestError(data.error || 'Failed to submit');
      } else {
        setSuggestSuccess(true);
        setSuggestForm({
          projectName: '',
          giphyUrl: '',
          tiktokUrl: '',
          category: 'web3',
          notes: '',
        });
        setTimeout(() => {
          setShowSuggestModal(false);
          setSuggestSuccess(false);
        }, 2000);
      }
    } catch {
      setSuggestError('Failed to submit suggestion');
    } finally {
      setSuggestSubmitting(false);
    }
  };

  // Check if we have enough data for different time periods (need actual different day data)
  const hasMultipleDays = channels.some(ch => ch.delta1d !== null && ch.delta1d !== 0);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/status');
      const data: StatusResponse = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setChannels(data.channels);
        setError(null);
      }
    } catch (err) {
      setError('Failed to fetch status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Filter channels helper
  const filterByCategory = (ch: ChannelDisplayData, category: 'all' | 'web2' | 'web3' | 'abstract') => {
    if (category === 'all') return true;
    if (category === 'abstract') return ch.isAbstract === true;
    return ch.category === category;
  };

  // Filter channels for GIPHY chart
  const giphyFilteredChannels = channels.filter((ch) => filterByCategory(ch, giphyCategory));

  // Filter channels for TikTok chart
  const tiktokFilteredChannels = channels.filter((ch) => filterByCategory(ch, tiktokCategory));

  // Filter channels for table
  const tableFilteredChannels = channels.filter((ch) => filterByCategory(ch, tableCategory));

  if (loading) {
    return (
      <main className="container">
        <div className="loading">
          <div className="spinner" />
          <span>Loading dashboard...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="header">
        <h1>Virality3</h1>
        <button
          className="suggest-btn"
          onClick={() => setShowSuggestModal(true)}
        >
          + Suggest Addition
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Suggestion Modal */}
      {showSuggestModal && (
        <div className="modal-overlay" onClick={() => setShowSuggestModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Suggest a Project</h3>
              <button className="modal-close" onClick={() => setShowSuggestModal(false)}>×</button>
            </div>

            {suggestSuccess ? (
              <div className="modal-success">
                Thanks for your suggestion! We&apos;ll review it soon.
              </div>
            ) : (
              <form onSubmit={handleSuggestSubmit} className="suggest-form">
                {suggestError && <div className="form-error">{suggestError}</div>}

                <div className="form-group">
                  <label>Project Name *</label>
                  <input
                    type="text"
                    value={suggestForm.projectName}
                    onChange={(e) => setSuggestForm({ ...suggestForm, projectName: e.target.value })}
                    placeholder="e.g. Pudgy Penguins"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>GIPHY Channel URL</label>
                  <input
                    type="url"
                    value={suggestForm.giphyUrl}
                    onChange={(e) => setSuggestForm({ ...suggestForm, giphyUrl: e.target.value })}
                    placeholder="https://giphy.com/channel/..."
                  />
                </div>

                <div className="form-group">
                  <label>TikTok Profile URL</label>
                  <input
                    type="url"
                    value={suggestForm.tiktokUrl}
                    onChange={(e) => setSuggestForm({ ...suggestForm, tiktokUrl: e.target.value })}
                    placeholder="https://tiktok.com/@..."
                  />
                </div>

                <div className="form-group">
                  <label>Category *</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="category"
                        value="web3"
                        checked={suggestForm.category === 'web3'}
                        onChange={() => setSuggestForm({ ...suggestForm, category: 'web3' })}
                      />
                      Web3
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="category"
                        value="web2"
                        checked={suggestForm.category === 'web2'}
                        onChange={() => setSuggestForm({ ...suggestForm, category: 'web2' })}
                      />
                      Web2
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes (optional)</label>
                  <textarea
                    value={suggestForm.notes}
                    onChange={(e) => setSuggestForm({ ...suggestForm, notes: e.target.value })}
                    placeholder="Any additional info..."
                    rows={3}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={suggestSubmitting}
                  style={{ width: '100%' }}
                >
                  {suggestSubmitting ? 'Submitting...' : 'Submit Suggestion'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* GIPHY Chart */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="filter-bar">
          <span className="filter-label">Category</span>
          <select
            className="filter-select"
            value={giphyCategory}
            onChange={(e) => setGiphyCategory(e.target.value as 'all' | 'web2' | 'web3' | 'abstract')}
          >
            <option value="all">All</option>
            <option value="web2">Web2</option>
            <option value="web3">Web3</option>
            <option value="abstract">Abstract Only</option>
          </select>

          <span className="filter-label" style={{ marginLeft: '1.5rem' }}>Period</span>
          <select
            className="filter-select"
            value={giphyTimePeriod}
            onChange={(e) => setGiphyTimePeriod(e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'alltime')}
          >
            <option value="alltime">All Time</option>
            <option value="daily" disabled={!hasMultipleDays}>Daily{!hasMultipleDays ? ' (Need 2+ days)' : ''}</option>
            <option value="weekly" disabled>Weekly (Coming Soon)</option>
            <option value="monthly" disabled>Monthly (Coming Soon)</option>
            <option value="yearly" disabled>Yearly (Coming Soon)</option>
          </select>

          <span className="filter-label" style={{ marginLeft: '1.5rem' }}>Scale</span>
          <select
            className="filter-select"
            value={giphyScaleType}
            onChange={(e) => setGiphyScaleType(e.target.value as 'linear' | 'sqrt' | 'log')}
          >
            <option value="linear">Linear</option>
            <option value="sqrt">Sqrt</option>
            <option value="log">Log</option>
          </select>

          <span className="filter-label" style={{ marginLeft: '1.5rem' }}>Show</span>
          <select
            className="filter-select"
            value={giphyChartCount}
            onChange={(e) => setGiphyChartCount(Number(e.target.value))}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={25}>25</option>
          </select>
        </div>

        <h2>📊 GIPHY Views</h2>
        <div className="chart-container">
          <TotalViewsChart channels={giphyFilteredChannels} scaleType={giphyScaleType} timePeriod={giphyTimePeriod} count={giphyChartCount} />
        </div>
      </div>

      {/* TikTok Chart */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="filter-bar">
          <span className="filter-label">Category</span>
          <select
            className="filter-select"
            value={tiktokCategory}
            onChange={(e) => setTiktokCategory(e.target.value as 'all' | 'web2' | 'web3' | 'abstract')}
          >
            <option value="all">All</option>
            <option value="web2">Web2</option>
            <option value="web3">Web3</option>
            <option value="abstract">Abstract Only</option>
          </select>

          <span className="filter-label" style={{ marginLeft: '1.5rem' }}>Metric</span>
          <select
            className="filter-select"
            value={tiktokMetric}
            onChange={(e) => setTiktokMetric(e.target.value as 'followers' | 'likes')}
          >
            <option value="followers">Followers</option>
            <option value="likes">Likes</option>
          </select>

          <span className="filter-label" style={{ marginLeft: '1.5rem' }}>Show</span>
          <select
            className="filter-select"
            value={tiktokChartCount}
            onChange={(e) => setTiktokChartCount(Number(e.target.value))}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={25}>25</option>
          </select>
        </div>

        <h2>📱 TikTok {tiktokMetric === 'followers' ? 'Followers' : 'Likes'}</h2>
        <div className="chart-container">
          {tiktokMetric === 'followers' ? (
            <TikTokFollowersChart channels={tiktokFilteredChannels} count={tiktokChartCount} />
          ) : (
            <TikTokLikesChart channels={tiktokFilteredChannels} count={tiktokChartCount} />
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ marginBottom: 0 }}>🎯 All Channels ({tableFilteredChannels.length})</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="filter-label">Category</span>
            <select
              className="filter-select"
              value={tableCategory}
              onChange={(e) => setTableCategory(e.target.value as 'all' | 'web2' | 'web3' | 'abstract')}
            >
              <option value="all">All</option>
              <option value="web2">Web2</option>
              <option value="web3">Web3</option>
              <option value="abstract">Abstract Only</option>
            </select>
          </div>
        </div>
        <ChannelTable channels={tableFilteredChannels} />
      </div>
    </main>
  );
}
