'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ChannelTable from '@/components/ChannelTable';
import NavBar from '@/components/NavBar';
import ErrorBoundary from '@/components/ErrorBoundary';
import ComparisonView from '@/components/ComparisonView';
// Search removed - keeping simpler filters
import FullscreenChart, { FullscreenButton } from '@/components/FullscreenChart';
import { TotalViewsChart, TikTokFollowersChart, TikTokLikesChart, YouTubeSubscribersChart, YouTubeViewsChart } from '@/components/Charts';
import { ChannelDisplayData } from '@/lib/types';
import { exportToCSV, exportToJSON } from '@/lib/exportData';
import { checkMilestones } from '@/lib/notifications';
import { decodeViewState, generateShareableLink, copyToClipboard, ViewState } from '@/lib/shareableLinks';

type ChartTab = 'giphy' | 'tiktok' | 'youtube';
type GrowthFilter = 'all' | 'growing' | 'declining' | 'fastest';

// Skeleton Loading Components
function SkeletonPulse({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton-pulse ${className}`} style={style} />;
}

function ChartSkeleton() {
  return (
    <div className="chart-skeleton">
      <div className="chart-skeleton-header">
        <SkeletonPulse style={{ width: '40%', height: '24px' }} />
        <div className="chart-skeleton-controls">
          <SkeletonPulse style={{ width: '80px', height: '28px' }} />
          <SkeletonPulse style={{ width: '80px', height: '28px' }} />
          <SkeletonPulse style={{ width: '60px', height: '28px' }} />
        </div>
      </div>
      <div className="chart-skeleton-bars">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="chart-skeleton-bar-group">
            <SkeletonPulse
              className="chart-skeleton-bar"
              style={{
                height: `${40 + (i * 7) % 60}%`,
                animationDelay: `${i * 0.1}s`
              }}
            />
            <SkeletonPulse style={{ width: '40px', height: '40px', borderRadius: '8px', marginTop: '8px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="table-skeleton">
      <div className="table-skeleton-header">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonPulse key={i} style={{ width: `${60 + (i * 8) % 40}px`, height: '14px' }} />
        ))}
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="table-skeleton-row" style={{ animationDelay: `${i * 0.05}s` }}>
          <SkeletonPulse style={{ width: '30px', height: '16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SkeletonPulse style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
            <SkeletonPulse style={{ width: `${80 + (i * 6) % 60}px`, height: '16px' }} />
          </div>
          <SkeletonPulse style={{ width: '50px', height: '20px', borderRadius: '4px' }} />
          <SkeletonPulse style={{ width: '70px', height: '16px' }} />
          <SkeletonPulse style={{ width: '60px', height: '16px' }} />
          <SkeletonPulse style={{ width: '60px', height: '16px' }} />
        </div>
      ))}
    </div>
  );
}

interface StatusResponse {
  channels: ChannelDisplayData[];
  status?: {
    lastRunTime: string | null;
  };
  error?: string;
}

function HomeContent() {
  const searchParams = useSearchParams();
  const [channels, setChannels] = useState<ChannelDisplayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Comparison state
  const [compareChannels, setCompareChannels] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  // Fullscreen chart state
  const [fullscreenChart, setFullscreenChart] = useState<'giphy' | 'tiktok' | 'youtube' | null>(null);

  // Share link state
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Chart tab state
  const [activeTab, setActiveTab] = useState<ChartTab>('giphy');

  // Default count based on screen size
  const defaultCount = isMobile ? 8 : 15;

  // GIPHY chart state
  const [giphyCategory, setGiphyCategory] = useState<'all' | 'web2' | 'web3' | 'abstract'>('web3');
  const [giphyScaleType, setGiphyScaleType] = useState<'linear' | 'sqrt' | 'log'>('sqrt');
  const [giphyTimePeriod, setGiphyTimePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'alltime'>('alltime');
  const [giphyChartCount, setGiphyChartCount] = useState<number | null>(null);

  // TikTok chart state
  const [tiktokCategory, setTiktokCategory] = useState<'all' | 'web2' | 'web3' | 'abstract'>('web3');
  const [tiktokChartCount, setTiktokChartCount] = useState<number | null>(null);
  const [tiktokMetric, setTiktokMetric] = useState<'followers' | 'likes'>('followers');
  const [tiktokTimePeriod, setTiktokTimePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'alltime'>('alltime');
  const [tiktokScaleType, setTiktokScaleType] = useState<'linear' | 'sqrt' | 'log'>('sqrt');

  // YouTube chart state
  const [youtubeCategory, setYoutubeCategory] = useState<'all' | 'web2' | 'web3' | 'abstract'>('web3');
  const [youtubeChartCount, setYoutubeChartCount] = useState<number | null>(null);
  const [youtubeMetric, setYoutubeMetric] = useState<'subscribers' | 'views'>('subscribers');
  const [youtubeScaleType, setYoutubeScaleType] = useState<'linear' | 'sqrt' | 'log'>('sqrt');
  const [youtubeTimePeriod, setYoutubeTimePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'alltime'>('alltime');

  // Actual chart counts (use state if set, otherwise use default)
  const actualGiphyCount = giphyChartCount ?? defaultCount;
  const actualTiktokCount = tiktokChartCount ?? defaultCount;
  const actualYoutubeCount = youtubeChartCount ?? defaultCount;

  // Table filter state
  const [tableCategory, setTableCategory] = useState<'all' | 'web2' | 'web3' | 'abstract'>('web3');
  const [growthFilter, setGrowthFilter] = useState<GrowthFilter>('all');


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

  // Track previous channels for animation
  const prevChannelsRef = useRef<ChannelDisplayData[]>([]);
  const [dataUpdated, setDataUpdated] = useState(false);

  // Parse URL params for initial state
  useEffect(() => {
    if (searchParams) {
      const state = decodeViewState(searchParams.toString());
      if (state.category) setTableCategory(state.category);
      if (state.growthFilter) setGrowthFilter(state.growthFilter);
      if (state.chartTab) setActiveTab(state.chartTab);
      if (state.compareChannels) setCompareChannels(state.compareChannels);
    }
  }, [searchParams]);

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

  // Toggle comparison
  const handleToggleCompare = (channelUrl: string) => {
    setCompareChannels(prev => {
      if (prev.includes(channelUrl)) {
        return prev.filter(url => url !== channelUrl);
      }
      if (prev.length >= 3) return prev;
      return [...prev, channelUrl];
    });
  };

  // Share current view
  const handleShare = async () => {
    const state: ViewState = {
      category: tableCategory,
      growthFilter,
      chartTab: activeTab,
      compareChannels: compareChannels.length > 0 ? compareChannels : undefined,
    };
    const link = generateShareableLink(state);
    const success = await copyToClipboard(link);
    if (success) {
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2000);
    }
  };

  // Check if we have enough data for different time periods
  const hasMultipleDays = channels.some(ch => ch.delta1d !== null && ch.delta1d !== 0);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/status');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data: StatusResponse = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        if (JSON.stringify(data.channels) !== JSON.stringify(prevChannelsRef.current)) {
          prevChannelsRef.current = data.channels;
          setDataUpdated(true);
          setTimeout(() => setDataUpdated(false), 1000);
        }
        setChannels(data.channels);
        setLastUpdated(data.status?.lastRunTime || null);
        setError(null);

        // Check for milestones
        checkMilestones(data.channels);
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

  // Filter channels for table by category
  const tableFilteredChannels = channels.filter((ch) => {
    return tableCategory === 'all' ? true :
      tableCategory === 'abstract' ? ch.isAbstract === true :
      ch.category === tableCategory;
  });

  if (loading) {
    return (
      <main className="container">
        <div className="banner-header">
          <div className="banner-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <SkeletonPulse style={{ width: 56, height: 56, borderRadius: '10px' }} />
              <div>
                <SkeletonPulse style={{ width: '180px', height: '32px', marginBottom: '8px' }} />
                <SkeletonPulse style={{ width: '140px', height: '14px' }} />
              </div>
            </div>
            <NavBar />
          </div>
        </div>

        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <SkeletonPulse style={{ width: '140px', height: '36px', borderRadius: '6px' }} />
        </div>

        <div className="chart-section-wrapper">
          <div className="platform-tabs">
            {['GIPHY', 'TikTok', 'YouTube'].map((name, i) => (
              <div key={name} className="platform-tab-skeleton" style={{ animationDelay: `${i * 0.1}s` }}>
                <SkeletonPulse style={{ width: '18px', height: '18px', borderRadius: '4px' }} />
                <SkeletonPulse style={{ width: '50px', height: '14px' }} />
              </div>
            ))}
          </div>
          <div className="chart-card">
            <ChartSkeleton />
          </div>
        </div>

        <div className="card table-card" style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <SkeletonPulse style={{ width: '200px', height: '24px' }} />
            <SkeletonPulse style={{ width: '120px', height: '32px', borderRadius: '6px' }} />
          </div>
          <TableSkeleton />
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      {/* Banner Header */}
      <div className="banner-header">
        <div className="banner-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/ZaddyToolsPFPandLogo.png" alt="ZaddyTools" style={{ height: 48, width: 'auto' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Social Analytics</p>
          </div>

          <NavBar />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Suggestion Modal */}
      {showSuggestModal && (
        <div className="modal-overlay modal-enter" onClick={() => setShowSuggestModal(false)}>
          <div className="modal modal-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Suggest a Project</h3>
                <p className="modal-subtitle">Help us track more projects.</p>
              </div>
              <button className="modal-close btn-micro" onClick={() => setShowSuggestModal(false)} aria-label="Close modal">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {suggestSuccess ? (
              <div className="modal-success-container">
                <div className="success-icon-animated">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 12l3 3 5-5" className="success-checkmark" />
                  </svg>
                </div>
                <p>Thanks for your suggestion!</p>
                <span className="modal-success-subtitle">We&apos;ll review it soon.</span>
              </div>
            ) : (
              <form onSubmit={handleSuggestSubmit} className="suggest-form">
                {suggestError && (
                  <div className="form-error form-error-animated">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                    {suggestError}
                  </div>
                )}

                <div className="form-group">
                  <label>Project Name *</label>
                  <input
                    type="text"
                    value={suggestForm.projectName}
                    onChange={(e) => setSuggestForm({ ...suggestForm, projectName: e.target.value })}
                    placeholder="e.g. Pudgy Penguins"
                    required
                    autoFocus
                    className="input-animated"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>GIPHY URL</label>
                    <input
                      type="url"
                      value={suggestForm.giphyUrl}
                      onChange={(e) => setSuggestForm({ ...suggestForm, giphyUrl: e.target.value })}
                      placeholder="giphy.com/channel/..."
                      className="input-animated"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>TikTok URL</label>
                    <input
                      type="url"
                      value={suggestForm.tiktokUrl}
                      onChange={(e) => setSuggestForm({ ...suggestForm, tiktokUrl: e.target.value })}
                      placeholder="tiktok.com/@..."
                      className="input-animated"
                    />
                  </div>

                  <div className="form-group">
                    <label>YouTube URL</label>
                    <input
                      type="url"
                      value={suggestForm.youtubeUrl}
                      onChange={(e) => setSuggestForm({ ...suggestForm, youtubeUrl: e.target.value })}
                      placeholder="youtube.com/@..."
                      className="input-animated"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Category *</label>
                  <div className="category-selector">
                    <button
                      type="button"
                      className={`category-option btn-micro ${suggestForm.category === 'web3' ? 'active' : ''}`}
                      onClick={() => setSuggestForm({ ...suggestForm, category: 'web3' })}
                    >
                      Web3
                    </button>
                    <button
                      type="button"
                      className={`category-option btn-micro ${suggestForm.category === 'web2' ? 'active' : ''}`}
                      onClick={() => setSuggestForm({ ...suggestForm, category: 'web2' })}
                    >
                      Web2
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes (optional)</label>
                  <textarea
                    value={suggestForm.notes}
                    onChange={(e) => setSuggestForm({ ...suggestForm, notes: e.target.value })}
                    placeholder="Any additional info..."
                    rows={3}
                    className="input-animated"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-micro submit-btn"
                  disabled={suggestSubmitting}
                >
                  {suggestSubmitting ? 'Submitting...' : 'Submit Suggestion'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Comparison View */}
      {showComparison && (
        <ComparisonView
          channels={channels}
          selectedChannels={compareChannels}
          onClose={() => setShowComparison(false)}
          onRemoveChannel={(url) => setCompareChannels(prev => prev.filter(u => u !== url))}
        />
      )}

      {/* Action Buttons */}
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {compareChannels.length > 0 && (
            <button
              className="btn btn-primary"
              onClick={() => setShowComparison(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              Compare ({compareChannels.length})
            </button>
          )}
        </div>
        <button
          className="suggest-btn btn-micro"
          onClick={() => setShowSuggestModal(true)}
        >
          + Suggest Addition
        </button>
      </div>

      {/* Chart Section with Tabs */}
      <div className="chart-section-wrapper">
        <div className="platform-tabs">
          <button
            className={`platform-tab btn-micro ${activeTab === 'giphy' ? 'active' : ''}`}
            onClick={() => setActiveTab('giphy')}
          >
            <svg className="tab-icon-svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 6h4v12H2zm6-4h4v20H8zm6 6h4v8h-4zm6-2h4v12h-4z"/>
            </svg>
            <span>GIPHY</span>
          </button>
          <button
            className={`platform-tab btn-micro ${activeTab === 'tiktok' ? 'active' : ''}`}
            onClick={() => setActiveTab('tiktok')}
          >
            <svg className="tab-icon-svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
            </svg>
            <span>TikTok</span>
          </button>
          <button
            className={`platform-tab btn-micro ${activeTab === 'youtube' ? 'active' : ''}`}
            onClick={() => setActiveTab('youtube')}
          >
            <svg className="tab-icon-svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.55 15.5V8.5l6.27 3.5-6.27 3.5z"/>
            </svg>
            <span>YouTube</span>
          </button>
        </div>

        <div className={`chart-card ${dataUpdated ? 'data-updated' : ''}`}>
          {/* GIPHY Chart */}
          {activeTab === 'giphy' && (
            <div className="chart-tab-content chart-tab-enter">
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
                      value={actualGiphyCount}
                      onChange={(e) => setGiphyChartCount(Number(e.target.value))}
                    >
                      <option value={5}>5</option>
                      <option value={8}>8</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={20}>20</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="chart-container">
                <TotalViewsChart channels={giphyFilteredChannels} scaleType={giphyScaleType} timePeriod={giphyTimePeriod} count={actualGiphyCount} />
              </div>
            </div>
          )}

          {/* TikTok Chart */}
          {activeTab === 'tiktok' && (
            <div className="chart-tab-content chart-tab-enter">
              <div className="chart-header">
                <div className="chart-title-row">
                  <h2 className="chart-title">TikTok {tiktokMetric === 'followers' ? 'Followers' : 'Likes'}</h2>
                  <div className="chart-meta">{tiktokFilteredChannels.filter(c => c.tiktokFollowers || c.tiktokLikes).length} channels</div>
                  <FullscreenButton onClick={() => setFullscreenChart('tiktok')} />
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
                      value={actualTiktokCount}
                      onChange={(e) => setTiktokChartCount(Number(e.target.value))}
                    >
                      <option value={5}>5</option>
                      <option value={8}>8</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={20}>20</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="chart-container">
                {tiktokMetric === 'followers' ? (
                  <TikTokFollowersChart channels={tiktokFilteredChannels} count={actualTiktokCount} scaleType={tiktokScaleType} />
                ) : (
                  <TikTokLikesChart channels={tiktokFilteredChannels} count={actualTiktokCount} scaleType={tiktokScaleType} />
                )}
              </div>
            </div>
          )}

          {/* YouTube Chart */}
          {activeTab === 'youtube' && (
            <div className="chart-tab-content chart-tab-enter">
              <div className="chart-header">
                <div className="chart-title-row">
                  <h2 className="chart-title">YouTube {youtubeMetric === 'subscribers' ? 'Subscribers' : 'Views'}</h2>
                  <div className="chart-meta">{youtubeFilteredChannels.filter(c => c.youtubeSubscribers || c.youtubeViews).length} channels</div>
                  <FullscreenButton onClick={() => setFullscreenChart('youtube')} />
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
                      value={actualYoutubeCount}
                      onChange={(e) => setYoutubeChartCount(Number(e.target.value))}
                    >
                      <option value={5}>5</option>
                      <option value={8}>8</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={20}>20</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="chart-container">
                {youtubeMetric === 'subscribers' ? (
                  <YouTubeSubscribersChart channels={youtubeFilteredChannels} count={actualYoutubeCount} scaleType={youtubeScaleType} />
                ) : (
                  <YouTubeViewsChart channels={youtubeFilteredChannels} count={actualYoutubeCount} scaleType={youtubeScaleType} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Chart Modal */}
      <FullscreenChart
        title={
          fullscreenChart === 'giphy' ? 'GIPHY Views' :
          fullscreenChart === 'tiktok' ? `TikTok ${tiktokMetric === 'followers' ? 'Followers' : 'Likes'}` :
          `YouTube ${youtubeMetric === 'subscribers' ? 'Subscribers' : 'Views'}`
        }
        isOpen={fullscreenChart !== null}
        onClose={() => setFullscreenChart(null)}
      >
        {fullscreenChart === 'giphy' && (
          <TotalViewsChart channels={giphyFilteredChannels} scaleType={giphyScaleType} timePeriod={giphyTimePeriod} count={25} />
        )}
        {fullscreenChart === 'tiktok' && (
          tiktokMetric === 'followers' ? (
            <TikTokFollowersChart channels={tiktokFilteredChannels} count={25} scaleType={tiktokScaleType} />
          ) : (
            <TikTokLikesChart channels={tiktokFilteredChannels} count={25} scaleType={tiktokScaleType} />
          )
        )}
        {fullscreenChart === 'youtube' && (
          youtubeMetric === 'subscribers' ? (
            <YouTubeSubscribersChart channels={youtubeFilteredChannels} count={25} scaleType={youtubeScaleType} />
          ) : (
            <YouTubeViewsChart channels={youtubeFilteredChannels} count={25} scaleType={youtubeScaleType} />
          )
        )}
      </FullscreenChart>

      {/* Table */}
      <div className="card table-card">
        <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1rem' }}>All Channels ({tableFilteredChannels.length})</h2>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <select
              className="filter-select"
              value={tableCategory}
              onChange={(e) => setTableCategory(e.target.value as 'all' | 'web2' | 'web3' | 'abstract')}
              style={{ fontSize: '0.7rem', padding: '0.25rem 1.25rem 0.25rem 0.4rem' }}
            >
              <option value="all">All</option>
              <option value="web2">Web2</option>
              <option value="web3">Web3</option>
              <option value="abstract">Abstract</option>
            </select>
            <select
              className="filter-select"
              value={growthFilter}
              onChange={(e) => setGrowthFilter(e.target.value as GrowthFilter)}
              style={{ fontSize: '0.7rem', padding: '0.25rem 1.25rem 0.25rem 0.4rem' }}
            >
              <option value="all">All</option>
              <option value="growing">Growing</option>
              <option value="declining">Declining</option>
              <option value="fastest">Fastest</option>
            </select>
          </div>
        </div>
        <ChannelTable
          channels={tableFilteredChannels}
          compareChannels={compareChannels}
          onToggleCompare={handleToggleCompare}
          growthFilter={growthFilter}
        />
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="loading"><div className="spinner" /><span>Loading dashboard...</span></div>}>
        <HomeContent />
      </Suspense>
    </ErrorBoundary>
  );
}
