'use client';

import { useState, useEffect, useCallback } from 'react';
import ChannelTable from '@/components/ChannelTable';
import { TotalViewsChart, TikTokFollowersChart, TikTokLikesChart, YouTubeSubscribersChart, YouTubeViewsChart } from '@/components/Charts';
import { ChannelDisplayData } from '@/lib/types';

type ChartTab = 'giphy' | 'tiktok' | 'youtube';

interface StatusResponse {
  channels: ChannelDisplayData[];
  error?: string;
}

export default function Home() {
  const [channels, setChannels] = useState<ChannelDisplayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chart tab state
  const [activeTab, setActiveTab] = useState<ChartTab>('giphy');

  // GIPHY chart state
  const [giphyCategory, setGiphyCategory] = useState<'all' | 'web2' | 'web3' | 'abstract'>('web3');
  const [giphyScaleType, setGiphyScaleType] = useState<'linear' | 'sqrt' | 'log'>('sqrt');
  const [giphyTimePeriod, setGiphyTimePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'alltime'>('alltime');
  const [giphyChartCount, setGiphyChartCount] = useState<number>(15);

  // TikTok chart state
  const [tiktokCategory, setTiktokCategory] = useState<'all' | 'web2' | 'web3' | 'abstract'>('web3');
  const [tiktokChartCount, setTiktokChartCount] = useState<number>(15);
  const [tiktokMetric, setTiktokMetric] = useState<'followers' | 'likes'>('followers');
  const [tiktokTimePeriod, setTiktokTimePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'alltime'>('alltime');
  const [tiktokScaleType, setTiktokScaleType] = useState<'linear' | 'sqrt' | 'log'>('sqrt');

  // YouTube chart state
  const [youtubeCategory, setYoutubeCategory] = useState<'all' | 'web2' | 'web3' | 'abstract'>('web3');
  const [youtubeChartCount, setYoutubeChartCount] = useState<number>(15);
  const [youtubeMetric, setYoutubeMetric] = useState<'subscribers' | 'views'>('subscribers');
  const [youtubeScaleType, setYoutubeScaleType] = useState<'linear' | 'sqrt' | 'log'>('sqrt');
  const [youtubeTimePeriod, setYoutubeTimePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'alltime'>('alltime');

  // Table filter state
  const [tableCategory, setTableCategory] = useState<'all' | 'web2' | 'web3' | 'abstract'>('web3');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Suggestion modal state
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestForm, setSuggestForm] = useState({
    projectName: '',
    giphyUrl: '',
    tiktokUrl: '',
    youtubeUrl: '',
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
          youtubeUrl: '',
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

  // Filter channels for YouTube chart
  const youtubeFilteredChannels = channels.filter((ch) => filterByCategory(ch, youtubeCategory));

  // Filter channels for table (reuse the same filter function)
  const tableFilteredChannels = channels.filter((ch) => {
    if (tableCategory === 'all') return true;
    if (tableCategory === 'abstract') return ch.isAbstract === true;
    return ch.category === tableCategory;
  });

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
      {/* Top Navigation */}
      <nav className="top-nav">
        <button className="nav-btn active">Social Analytics</button>
        <button className="nav-btn">XP Card</button>
        <button className="nav-btn">Creator Dashboard</button>
      </nav>

      {/* Banner Header */}
      <div className="banner-header">
        <img src="/absbanner2.png" alt="" className="banner-bg" />
        <div className="banner-overlay" />
        <div className="banner-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/abspfp.png" alt="Logo" style={{ width: 56, height: 56, borderRadius: '10px', border: '2px solid rgba(46, 219, 132, 0.3)' }} />
            <div>
              <h1 style={{ marginBottom: 0 }}>Virality3</h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Social Analytics Dashboard</p>
            </div>
          </div>
          <button
            className="suggest-btn"
            onClick={() => setShowSuggestModal(true)}
          >
            + Suggest Addition
          </button>
        </div>
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
                  <label>YouTube Channel URL</label>
                  <input
                    type="url"
                    value={suggestForm.youtubeUrl}
                    onChange={(e) => setSuggestForm({ ...suggestForm, youtubeUrl: e.target.value })}
                    placeholder="https://youtube.com/@..."
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

      {/* Chart Section with Tabs */}
      <div className="chart-section" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {/* Left Tab Navigation - Compact */}
        <div className="chart-tabs">
          <button
            className={`chart-tab ${activeTab === 'giphy' ? 'active' : ''}`}
            onClick={() => setActiveTab('giphy')}
          >
            <svg className="tab-icon-svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 6h4v12H2zm6-4h4v20H8zm6 6h4v8h-4zm6-2h4v12h-4z"/>
            </svg>
            GIPHY
          </button>
          <button
            className={`chart-tab ${activeTab === 'tiktok' ? 'active' : ''}`}
            onClick={() => setActiveTab('tiktok')}
          >
            <svg className="tab-icon-svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
            </svg>
            TikTok
          </button>
          <button
            className={`chart-tab ${activeTab === 'youtube' ? 'active' : ''}`}
            onClick={() => setActiveTab('youtube')}
          >
            <svg className="tab-icon-svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.55 15.5V8.5l6.27 3.5-6.27 3.5z"/>
            </svg>
            YouTube
          </button>
        </div>

        {/* Chart Content */}
        <div className="chart-card">
          {/* GIPHY Chart */}
          {activeTab === 'giphy' && (
            <>
              <div className="chart-header">
                <div className="chart-title-row">
                  <h2 className="chart-title">GIPHY Views</h2>
                  <div className="chart-meta">{giphyFilteredChannels.length} channels</div>
                </div>
                <div className="chart-controls">
                  <div className="control-group">
                    <span className="control-label">Category</span>
                    <select
                      className="filter-select"
                      value={giphyCategory}
                      onChange={(e) => setGiphyCategory(e.target.value as 'all' | 'web2' | 'web3' | 'abstract')}
                    >
                      <option value="all">All</option>
                      <option value="web2">Web2</option>
                      <option value="web3">Web3</option>
                      <option value="abstract">Abstract</option>
                    </select>
                  </div>
                  <div className="control-group">
                    <span className="control-label">Period</span>
                    <select
                      className="filter-select"
                      value={giphyTimePeriod}
                      onChange={(e) => setGiphyTimePeriod(e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'alltime')}
                    >
                      <option value="alltime">All Time</option>
                      <option value="daily" disabled={!hasMultipleDays}>Daily</option>
                    </select>
                  </div>
                  <div className="control-group">
                    <span className="control-label">Scale</span>
                    <select
                      className="filter-select"
                      value={giphyScaleType}
                      onChange={(e) => setGiphyScaleType(e.target.value as 'linear' | 'sqrt' | 'log')}
                    >
                      <option value="linear">Linear</option>
                      <option value="sqrt">Sqrt</option>
                      <option value="log">Log</option>
                    </select>
                  </div>
                  <div className="control-group">
                    <span className="control-label">Show</span>
                    <select
                      className="filter-select"
                      value={giphyChartCount}
                      onChange={(e) => setGiphyChartCount(Number(e.target.value))}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={20}>20</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="chart-container">
                <TotalViewsChart channels={giphyFilteredChannels} scaleType={giphyScaleType} timePeriod={giphyTimePeriod} count={giphyChartCount} />
              </div>
            </>
          )}

          {/* TikTok Chart */}
          {activeTab === 'tiktok' && (
            <>
              <div className="chart-header">
                <div className="chart-title-row">
                  <h2 className="chart-title">TikTok {tiktokMetric === 'followers' ? 'Followers' : 'Likes'}</h2>
                  <div className="chart-meta">{tiktokFilteredChannels.filter(c => c.tiktokFollowers || c.tiktokLikes).length} channels</div>
                </div>
                <div className="chart-controls">
                  <div className="control-group">
                    <span className="control-label">Metric</span>
                    <div className="toggle-group">
                      <button
                        className={`toggle-btn ${tiktokMetric === 'followers' ? 'active' : ''}`}
                        onClick={() => setTiktokMetric('followers')}
                      >
                        Followers
                      </button>
                      <button
                        className={`toggle-btn ${tiktokMetric === 'likes' ? 'active' : ''}`}
                        onClick={() => setTiktokMetric('likes')}
                      >
                        Likes
                      </button>
                    </div>
                  </div>
                  <div className="control-group">
                    <span className="control-label">Category</span>
                    <select
                      className="filter-select"
                      value={tiktokCategory}
                      onChange={(e) => setTiktokCategory(e.target.value as 'all' | 'web2' | 'web3' | 'abstract')}
                    >
                      <option value="all">All</option>
                      <option value="web2">Web2</option>
                      <option value="web3">Web3</option>
                      <option value="abstract">Abstract</option>
                    </select>
                  </div>
                  <div className="control-group">
                    <span className="control-label">Period</span>
                    <select
                      className="filter-select"
                      value={tiktokTimePeriod}
                      onChange={(e) => setTiktokTimePeriod(e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'alltime')}
                    >
                      <option value="alltime">All Time</option>
                      <option value="daily" disabled={!hasMultipleDays}>Daily</option>
                    </select>
                  </div>
                  <div className="control-group">
                    <span className="control-label">Scale</span>
                    <select
                      className="filter-select"
                      value={tiktokScaleType}
                      onChange={(e) => setTiktokScaleType(e.target.value as 'linear' | 'sqrt' | 'log')}
                    >
                      <option value="linear">Linear</option>
                      <option value="sqrt">Sqrt</option>
                      <option value="log">Log</option>
                    </select>
                  </div>
                  <div className="control-group">
                    <span className="control-label">Show</span>
                    <select
                      className="filter-select"
                      value={tiktokChartCount}
                      onChange={(e) => setTiktokChartCount(Number(e.target.value))}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={20}>20</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="chart-container">
                {tiktokMetric === 'followers' ? (
                  <TikTokFollowersChart channels={tiktokFilteredChannels} count={tiktokChartCount} scaleType={tiktokScaleType} />
                ) : (
                  <TikTokLikesChart channels={tiktokFilteredChannels} count={tiktokChartCount} scaleType={tiktokScaleType} />
                )}
              </div>
            </>
          )}

          {/* YouTube Chart */}
          {activeTab === 'youtube' && (
            <>
              <div className="chart-header">
                <div className="chart-title-row">
                  <h2 className="chart-title">YouTube {youtubeMetric === 'subscribers' ? 'Subscribers' : 'Views'}</h2>
                  <div className="chart-meta">{youtubeFilteredChannels.filter(c => c.youtubeSubscribers || c.youtubeViews).length} channels</div>
                </div>
                <div className="chart-controls">
                  <div className="control-group">
                    <span className="control-label">Metric</span>
                    <div className="toggle-group">
                      <button
                        className={`toggle-btn ${youtubeMetric === 'subscribers' ? 'active' : ''}`}
                        onClick={() => setYoutubeMetric('subscribers')}
                      >
                        Subs
                      </button>
                      <button
                        className={`toggle-btn ${youtubeMetric === 'views' ? 'active' : ''}`}
                        onClick={() => setYoutubeMetric('views')}
                      >
                        Views
                      </button>
                    </div>
                  </div>
                  <div className="control-group">
                    <span className="control-label">Category</span>
                    <select
                      className="filter-select"
                      value={youtubeCategory}
                      onChange={(e) => setYoutubeCategory(e.target.value as 'all' | 'web2' | 'web3' | 'abstract')}
                    >
                      <option value="all">All</option>
                      <option value="web2">Web2</option>
                      <option value="web3">Web3</option>
                      <option value="abstract">Abstract</option>
                    </select>
                  </div>
                  <div className="control-group">
                    <span className="control-label">Period</span>
                    <select
                      className="filter-select"
                      value={youtubeTimePeriod}
                      onChange={(e) => setYoutubeTimePeriod(e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'alltime')}
                    >
                      <option value="alltime">All Time</option>
                      <option value="daily" disabled={!hasMultipleDays}>Daily</option>
                    </select>
                  </div>
                  <div className="control-group">
                    <span className="control-label">Scale</span>
                    <select
                      className="filter-select"
                      value={youtubeScaleType}
                      onChange={(e) => setYoutubeScaleType(e.target.value as 'linear' | 'sqrt' | 'log')}
                    >
                      <option value="linear">Linear</option>
                      <option value="sqrt">Sqrt</option>
                      <option value="log">Log</option>
                    </select>
                  </div>
                  <div className="control-group">
                    <span className="control-label">Show</span>
                    <select
                      className="filter-select"
                      value={youtubeChartCount}
                      onChange={(e) => setYoutubeChartCount(Number(e.target.value))}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={20}>20</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="chart-container">
                {youtubeMetric === 'subscribers' ? (
                  <YouTubeSubscribersChart channels={youtubeFilteredChannels} count={youtubeChartCount} scaleType={youtubeScaleType} />
                ) : (
                  <YouTubeViewsChart channels={youtubeFilteredChannels} count={youtubeChartCount} scaleType={youtubeScaleType} />
                )}
              </div>
            </>
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
