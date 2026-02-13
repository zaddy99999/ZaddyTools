'use client';

import { useState } from 'react';
import NavBar from '@/components/NavBar';

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  parameters?: { name: string; type: string; required: boolean; description: string }[];
  response: string;
  example?: string;
}

const endpoints: Endpoint[] = [
  {
    method: 'GET',
    path: '/api/status',
    description: 'Get current status and all channel data including GIPHY, TikTok, and YouTube metrics.',
    response: `{
  "status": {
    "lastRunTime": "2024-01-15T10:30:00Z",
    "status": "success",
    "channelsProcessed": 45,
    "channelsFailed": 0
  },
  "channels": [
    {
      "channelName": "Example Channel",
      "channelUrl": "https://giphy.com/channel/example",
      "rank": 1,
      "category": "web3",
      "totalViews": 1500000000,
      "delta1d": 5000000,
      "avg7dDelta": 4500000,
      "tiktokFollowers": 500000,
      "youtubeSubscribers": 100000
    }
  ]
}`,
  },
  {
    method: 'POST',
    path: '/api/suggest',
    description: 'Submit a suggestion for a new project to be added to the tracker.',
    parameters: [
      { name: 'projectName', type: 'string', required: true, description: 'Name of the project' },
      { name: 'giphyUrl', type: 'string', required: false, description: 'GIPHY channel URL' },
      { name: 'tiktokUrl', type: 'string', required: false, description: 'TikTok profile URL' },
      { name: 'youtubeUrl', type: 'string', required: false, description: 'YouTube channel URL' },
      { name: 'category', type: 'web2 | web3', required: true, description: 'Project category' },
      { name: 'notes', type: 'string', required: false, description: 'Additional notes' },
    ],
    response: `{
  "success": true,
  "message": "Suggestion submitted successfully"
}`,
  },
  {
    method: 'GET',
    path: '/api/crypto/global',
    description: 'Get global cryptocurrency market metrics including market cap, volume, and dominance.',
    response: `{
  "totalMarketCap": 2500000000000,
  "totalVolume24h": 85000000000,
  "btcDominance": 52.5,
  "ethDominance": 18.2,
  "marketCapChange24h": 2.5
}`,
  },
  {
    method: 'GET',
    path: '/api/crypto/prices',
    description: 'Get current cryptocurrency prices and 24h changes.',
    response: `{
  "prices": [
    {
      "symbol": "BTC",
      "name": "Bitcoin",
      "price": 45000,
      "change24h": 2.5,
      "marketCap": 880000000000
    }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/crypto/tvl',
    description: 'Get Total Value Locked (TVL) data for DeFi protocols.',
    response: `{
  "protocols": [
    {
      "name": "Lido",
      "tvl": 28500000000,
      "change24h": 1.2,
      "category": "Liquid Staking"
    }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/crypto/sentiment',
    description: 'Get market sentiment indicators including Fear & Greed Index.',
    response: `{
  "fearGreedIndex": 65,
  "sentiment": "Greed",
  "previousClose": 62
}`,
  },
  {
    method: 'GET',
    path: '/api/crypto/news',
    description: 'Get latest cryptocurrency news articles.',
    response: `{
  "articles": [
    {
      "title": "Bitcoin reaches new high",
      "source": "CoinDesk",
      "url": "https://...",
      "publishedAt": "2024-01-15T10:00:00Z"
    }
  ]
}`,
  },
];

export default function ApiDocsPage() {
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const methodColors: Record<string, string> = {
    GET: '#2edb84',
    POST: '#3b82f6',
    PUT: '#f59e0b',
    DELETE: '#ef4444',
  };

  return (
    <main className="container">
      <div className="banner-header">
        <div className="banner-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/ZaddyPFP.png" alt="Logo" style={{ width: 56, height: 56, borderRadius: '10px', border: '2px solid rgba(46, 219, 132, 0.3)' }} />
            <div>
              <h1 style={{ marginBottom: 0 }}>API Documentation</h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>ZaddyTools Public API</p>
            </div>
          </div>
          <NavBar />
        </div>
      </div>

      <div className="api-docs">
        {/* Introduction */}
        <section className="api-section">
          <h2>Introduction</h2>
          <p>
            The ZaddyTools API provides access to social analytics data for various channels across
            GIPHY, TikTok, and YouTube, as well as cryptocurrency market data. All endpoints return JSON.
          </p>
          <div className="api-info-box">
            <h4>Base URL</h4>
            <code>https://zaddytools.vercel.app</code>
          </div>
          <div className="api-info-box">
            <h4>Rate Limits</h4>
            <p>API requests are rate limited to 100 requests per minute per IP address.</p>
          </div>
        </section>

        {/* Endpoints */}
        <section className="api-section">
          <h2>Endpoints</h2>
          {endpoints.map((endpoint, index) => (
            <div
              key={index}
              className={`api-endpoint ${activeEndpoint === endpoint.path ? 'expanded' : ''}`}
            >
              <div
                className="api-endpoint-header"
                onClick={() => setActiveEndpoint(
                  activeEndpoint === endpoint.path ? null : endpoint.path
                )}
              >
                <div className="api-endpoint-method-path">
                  <span
                    className="api-method"
                    style={{ backgroundColor: methodColors[endpoint.method] }}
                  >
                    {endpoint.method}
                  </span>
                  <code className="api-path">{endpoint.path}</code>
                </div>
                <span className="api-description">{endpoint.description}</span>
                <span className="api-expand-icon">
                  {activeEndpoint === endpoint.path ? '-' : '+'}
                </span>
              </div>

              {activeEndpoint === endpoint.path && (
                <div className="api-endpoint-body">
                  {endpoint.parameters && endpoint.parameters.length > 0 && (
                    <div className="api-parameters">
                      <h4>Parameters</h4>
                      <table>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Required</th>
                            <th>Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {endpoint.parameters.map((param, idx) => (
                            <tr key={idx}>
                              <td><code>{param.name}</code></td>
                              <td><code>{param.type}</code></td>
                              <td>{param.required ? 'Yes' : 'No'}</td>
                              <td>{param.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="api-response">
                    <div className="api-response-header">
                      <h4>Response</h4>
                      <button
                        className="copy-btn-small"
                        onClick={() => copyToClipboard(endpoint.response, endpoint.path)}
                      >
                        {copied === endpoint.path ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <pre className="api-code-block">
                      <code>{endpoint.response}</code>
                    </pre>
                  </div>

                  {/* Try it section */}
                  <div className="api-try-it">
                    <h4>Try it</h4>
                    <div className="api-curl">
                      <code>
                        curl -X {endpoint.method} "https://zaddytools.vercel.app{endpoint.path}"
                      </code>
                      <button
                        className="copy-btn-small"
                        onClick={() => copyToClipboard(
                          `curl -X ${endpoint.method} "https://zaddytools.vercel.app${endpoint.path}"`,
                          `curl-${endpoint.path}`
                        )}
                      >
                        {copied === `curl-${endpoint.path}` ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>

        {/* Data Types */}
        <section className="api-section">
          <h2>Data Types</h2>
          <div className="api-type">
            <h4>ChannelDisplayData</h4>
            <pre className="api-code-block">
              <code>{`{
  channelName: string;
  channelUrl: string;
  rank: number;
  category: 'web2' | 'web3';
  isAbstract: boolean;
  logoUrl: string | null;
  totalViews: number;
  gifCount: number | null;
  delta1d: number | null;      // 24h change
  avg7dDelta: number | null;   // 7-day average change
  tiktokUrl?: string;
  tiktokFollowers?: number;
  tiktokLikes?: number;
  youtubeUrl?: string;
  youtubeSubscribers?: number;
  youtubeViews?: number;
  youtubeVideoCount?: number;
}`}</code>
            </pre>
          </div>
        </section>

        {/* Error Handling */}
        <section className="api-section">
          <h2>Error Handling</h2>
          <p>All endpoints return errors in the following format:</p>
          <pre className="api-code-block">
            <code>{`{
  "error": "Error message description",
  "message": "Detailed error information"
}`}</code>
          </pre>
          <div className="api-error-codes">
            <h4>HTTP Status Codes</h4>
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>200</code></td>
                  <td>Success</td>
                </tr>
                <tr>
                  <td><code>400</code></td>
                  <td>Bad Request - Invalid parameters</td>
                </tr>
                <tr>
                  <td><code>429</code></td>
                  <td>Too Many Requests - Rate limit exceeded</td>
                </tr>
                <tr>
                  <td><code>500</code></td>
                  <td>Internal Server Error</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
