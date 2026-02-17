'use client';

import { Tweet } from 'react-tweet';
import { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';

interface GoatedTweet {
  url: string;
  handle: string;
  text?: string;
  description?: string;
}

export default function TweetTestPage() {
  const [goatedTweet, setGoatedTweet] = useState<GoatedTweet | null>(null);
  const [tweetId, setTweetId] = useState<string>('');

  // Fetch first goated tweet from the sheet
  useEffect(() => {
    fetch('/api/goated-tweets')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const tweet = data[0];
          setGoatedTweet(tweet);
          // Extract tweet ID from URL
          const match = tweet.url.match(/status\/(\d+)/);
          if (match) {
            setTweetId(match[1]);
          }
        }
      })
      .catch(console.error);
  }, []);

  // Load Twitter widget script for official embed
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const EXAMPLE_HANDLE = goatedTweet?.handle || 'loading...';
  const EXAMPLE_TEXT = goatedTweet?.text || goatedTweet?.description || 'Loading tweet text...';
  const EXAMPLE_TWEET_ID = tweetId;

  return (
    <>
      <NavBar />
      <main className="main-content" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2edb84', marginBottom: '2rem' }}>
          Tweet Embedding Options Test
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>

          {/* Option 1: Manual Text Card */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(46, 219, 132, 0.2)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
              Option 1: Manual Text Card
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
              Store tweet text in Google Sheet, display as custom card. Fast, no external deps.
            </p>

            <a
              href={goatedTweet?.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(46, 219, 132, 0.3)',
                borderRadius: '12px',
                padding: '1rem',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <img
                  src={`https://unavatar.io/twitter/${EXAMPLE_HANDLE}`}
                  alt={EXAMPLE_HANDLE}
                  style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid rgba(46, 219, 132, 0.3)' }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>Abstract</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>@{EXAMPLE_HANDLE}</div>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)" style={{ marginLeft: 'auto' }}>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.5, margin: 0 }}>
                {EXAMPLE_TEXT}
              </p>
              <div style={{ fontSize: '0.65rem', color: 'rgba(46, 219, 132, 0.7)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span>View on X</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17L17 7M17 7H7M17 7V17"/>
                </svg>
              </div>
            </a>
          </div>

          {/* Option 2: Twitter Official Embed */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(46, 219, 132, 0.2)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
              Option 2: Twitter Official Embed
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
              Uses Twitter&apos;s widget.js. Interactive but loads ~1MB external JS.
            </p>

            {EXAMPLE_TWEET_ID ? (
              <blockquote
                className="twitter-tweet"
                data-theme="dark"
                data-conversation="none"
                key={EXAMPLE_TWEET_ID}
              >
                <a href={`https://twitter.com/${EXAMPLE_HANDLE}/status/${EXAMPLE_TWEET_ID}`}>
                  Loading tweet...
                </a>
              </blockquote>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                Loading tweet from goated tweets...
              </div>
            )}
          </div>

          {/* Option 3: react-tweet Library */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(46, 219, 132, 0.2)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
              Option 3: react-tweet Library
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
              Renders tweet-like card without Twitter&apos;s JS. Fast, looks authentic.
            </p>

            <div data-theme="dark" className="react-tweet-theme">
              {EXAMPLE_TWEET_ID ? (
                <Tweet id={EXAMPLE_TWEET_ID} />
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                  Loading tweet from goated tweets...
                </div>
              )}
            </div>
          </div>

          {/* Option 4: Screenshot/Image */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(46, 219, 132, 0.2)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
              Option 4: Screenshot Image
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
              Store screenshot of tweet as image. Exact look, but requires manual work.
            </p>

            <a
              href={goatedTweet?.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                background: '#15202b',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {/* Placeholder showing what a screenshot would look like */}
              <div style={{
                padding: '1rem',
                background: 'linear-gradient(135deg, #15202b 0%, #1a2836 100%)',
                minHeight: '150px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '0.8rem',
                textAlign: 'center',
                gap: '0.5rem',
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.5 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span>Tweet screenshot would go here</span>
                <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>
                  (Upload .png/.jpg to /public/tweets/)
                </span>
              </div>
            </a>
          </div>

        </div>

        {/* Summary */}
        <div style={{ marginTop: '2rem', background: 'rgba(46, 219, 132, 0.1)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(46, 219, 132, 0.2)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2edb84', marginBottom: '1rem' }}>Summary</h3>
          <table style={{ width: '100%', fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem 0', color: '#2edb84' }}>Option</th>
                <th style={{ textAlign: 'left', padding: '0.5rem 0', color: '#2edb84' }}>Speed</th>
                <th style={{ textAlign: 'left', padding: '0.5rem 0', color: '#2edb84' }}>Setup</th>
                <th style={{ textAlign: 'left', padding: '0.5rem 0', color: '#2edb84' }}>Look</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '0.5rem 0' }}>1. Manual Text</td>
                <td style={{ padding: '0.5rem 0', color: '#2edb84' }}>Fastest</td>
                <td style={{ padding: '0.5rem 0' }}>Copy/paste text to sheet</td>
                <td style={{ padding: '0.5rem 0' }}>Custom styled</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '0.5rem 0' }}>2. Official Embed</td>
                <td style={{ padding: '0.5rem 0', color: '#ef4444' }}>Slowest</td>
                <td style={{ padding: '0.5rem 0' }}>Just URL needed</td>
                <td style={{ padding: '0.5rem 0' }}>Official Twitter</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '0.5rem 0' }}>3. react-tweet</td>
                <td style={{ padding: '0.5rem 0', color: '#2edb84' }}>Fast</td>
                <td style={{ padding: '0.5rem 0' }}>Just tweet ID needed</td>
                <td style={{ padding: '0.5rem 0' }}>Twitter-like</td>
              </tr>
              <tr>
                <td style={{ padding: '0.5rem 0' }}>4. Screenshot</td>
                <td style={{ padding: '0.5rem 0', color: '#2edb84' }}>Fast</td>
                <td style={{ padding: '0.5rem 0' }}>Screenshot + upload</td>
                <td style={{ padding: '0.5rem 0' }}>Exact replica</td>
              </tr>
            </tbody>
          </table>
        </div>

      </main>
    </>
  );
}
