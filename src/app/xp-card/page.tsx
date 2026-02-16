'use client';

import { useState, useRef } from 'react';
import NavBar from '@/components/NavBar';
import ErrorBoundary from '@/components/ErrorBoundary';

type CardType = 'id' | 'xp';
type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Obsidian';
type RankLevel = '1' | '2' | '3';
type Role = 'Elite Chad' | 'Graduated Elite Chad' | 'Gigachad';

interface XPPreset {
  name: string;
  image: string | null;
  video: string | null;
  displayName: string;
  xp: string;
  level: string;
  joinDate: string;
}

const XP_PRESETS: XPPreset[] = [
  { name: 'Hammie', image: '/HammieBannerBigger.gif', video: null, displayName: '', xp: '', level: '', joinDate: '' },
  { name: 'Clip 1', image: null, video: '/hamie_clip_1.mp4', displayName: '', xp: '', level: '', joinDate: '' },
  { name: 'Clip 2', image: null, video: '/hamie_clip_2.mp4', displayName: '', xp: '', level: '', joinDate: '' },
  { name: 'Clip 3', image: null, video: '/hamie_clip_3.mp4', displayName: '', xp: '', level: '', joinDate: '' },
  { name: 'Clip 4', image: null, video: '/hamie_clip_4.mp4', displayName: '', xp: '', level: '', joinDate: '' },
  { name: 'Custom', image: null, video: null, displayName: '', xp: '', level: '', joinDate: '' },
];

export default function XPCardPage() {
  const [cardType, setCardType] = useState<CardType>('id');

  // ID Card state - defaults for testing
  const [idProfileImage, setIdProfileImage] = useState<string | null>('/ZaddyPFP.png');
  const [idDisplayName, setIdDisplayName] = useState('Zaddy');
  const [rankTier, setRankTier] = useState<RankTier>('Platinum');
  const [rankLevel, setRankLevel] = useState<RankLevel>('1');
  const [role, setRole] = useState<Role>('Graduated Elite Chad');

  // XP Card state
  const [xpProfileImage, setXpProfileImage] = useState<string | null>('/ZaddyPFP.png');
  const [xpBackgroundImage, setXpBackgroundImage] = useState<string | null>('/HammieBannerBigger.gif');
  const [xpBackgroundVideo, setXpBackgroundVideo] = useState<string | null>(null);
  const [xpDisplayName, setXpDisplayName] = useState('Zaddy');
  const [xpAmount, setXpAmount] = useState('69,000');
  const [level, setLevel] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('Hammie');

  const applyPreset = (presetName: string) => {
    const preset = XP_PRESETS.find(p => p.name === presetName);
    if (preset) {
      setSelectedPreset(presetName);
      setXpBackgroundImage(preset.image);
      setXpBackgroundVideo(preset.video);
    }
  };

  const idFileInputRef = useRef<HTMLInputElement>(null);
  const xpFileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [idDragging, setIdDragging] = useState(false);
  const [xpDragging, setXpDragging] = useState(false);

  const rankTiers: RankTier[] = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Obsidian'];
  const rankLevels: RankLevel[] = ['1', '2', '3'];
  const roles: Role[] = ['Elite Chad', 'Graduated Elite Chad', 'Gigachad'];

  const processImageFile = (file: File, setImage: (url: string) => void) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file, setIdProfileImage);
  };

  const handleXpImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file, setXpProfileImage);
  };

  const handleIdDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIdDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file, setIdProfileImage);
  };

  const handleXpDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setXpDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file, setXpProfileImage);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
      });

      const name = cardType === 'id' ? idDisplayName : xpDisplayName;
      const link = document.createElement('a');
      link.download = `abstract-${cardType}-${name || 'card'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
    }
  };

  return (
    <ErrorBoundary>
      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
          15% { opacity: 1; transform: translateX(-50%) translateY(0); }
          85% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }
      `}</style>
      <main className="container">
        {/* Banner Header */}
        <div className="banner-header">
          <div className="banner-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src="/ZaddyToolsPFPandLogo.png" alt="ZaddyTools" style={{ height: 48, width: 'auto' }} />
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Card Generator</p>
            </div>
            <NavBar />
          </div>
        </div>

      {/* Main Layout */}
      <div className="id-generator-grid">
        {/* Configuration Card */}
        <div className="id-config-card">
          {/* Card Type Toggle */}
          <div className="card-type-toggle" style={{ marginBottom: '1rem' }}>
            <button
              className={`card-type-btn ${cardType === 'id' ? 'active' : ''}`}
              onClick={() => setCardType('id')}
            >
              ID Card
            </button>
            <button
              className={`card-type-btn ${cardType === 'xp' ? 'active' : ''}`}
              onClick={() => setCardType('xp')}
            >
              XP Card
            </button>
          </div>

          {cardType === 'id' ? (
            <>
              {/* ID Card Fields */}
              <div className="id-section">
                <label className="id-label">Profile Image</label>
                <div
                  className="id-upload-box"
                  onClick={() => idFileInputRef.current?.click()}
                  onDrop={handleIdDrop}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => { e.preventDefault(); setIdDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIdDragging(false); }}
                  style={{
                    borderColor: idDragging ? '#2edb84' : undefined,
                    background: idDragging ? 'rgba(46, 219, 132, 0.1)' : undefined,
                    transform: idDragging ? 'scale(1.02)' : undefined,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {idProfileImage ? (
                    <img src={idProfileImage} alt="Profile" className="id-upload-preview" />
                  ) : (
                    <div className="id-upload-placeholder">
                      <span className="id-upload-icon">+</span>
                      <span>{idDragging ? 'Drop image here' : 'Click or drag to upload'}</span>
                    </div>
                  )}
                  <input
                    ref={idFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleIdImageUpload}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              <div className="id-section">
                <label className="id-label">Display Name</label>
                <input
                  type="text"
                  className="id-input"
                  placeholder="Enter your name"
                  value={idDisplayName}
                  onChange={(e) => setIdDisplayName(e.target.value)}
                />
              </div>

              <div className="id-section">
                <label className="id-label">Rank</label>
                <div className="id-rank-dropdowns">
                  <select
                    className="id-select"
                    value={rankTier}
                    onChange={(e) => setRankTier(e.target.value as RankTier)}
                  >
                    {rankTiers.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <select
                    className="id-select"
                    value={rankLevel}
                    onChange={(e) => setRankLevel(e.target.value as RankLevel)}
                  >
                    {rankLevels.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="id-section">
                <label className="id-label">Role</label>
                <div className="id-role-list">
                  {roles.map((r) => (
                    <button
                      key={r}
                      className={`id-role-btn ${role === r ? 'active' : ''}`}
                      onClick={() => setRole(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* XP Card Presets */}
              <div className="id-section">
                <label className="id-label">Quick Presets</label>
                <div className="xp-preset-grid">
                  {XP_PRESETS.map((preset) => (
                    <div
                      key={preset.name}
                      className={`xp-preset-card ${selectedPreset === preset.name ? 'active' : ''}`}
                      onClick={() => applyPreset(preset.name)}
                      title={preset.name}
                    >
                      {preset.image ? (
                        <img src={preset.image} alt={preset.name} />
                      ) : preset.video ? (
                        <video
                          key={preset.video}
                          src={preset.video}
                          muted
                          loop
                          autoPlay
                          playsInline
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                        />
                      ) : (
                        <span className="xp-preset-placeholder">+</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* XP Card Fields */}
              <div className="id-section">
                <label className="id-label">Profile Image</label>
                <div
                  className="id-upload-box"
                  onClick={() => xpFileInputRef.current?.click()}
                  onDrop={handleXpDrop}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => { e.preventDefault(); setXpDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setXpDragging(false); }}
                  style={{
                    borderColor: xpDragging ? '#2edb84' : undefined,
                    background: xpDragging ? 'rgba(46, 219, 132, 0.1)' : undefined,
                    transform: xpDragging ? 'scale(1.02)' : undefined,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {xpProfileImage ? (
                    <img src={xpProfileImage} alt="Profile" className="id-upload-preview" />
                  ) : (
                    <div className="id-upload-placeholder">
                      <span className="id-upload-icon">+</span>
                      <span>{xpDragging ? 'Drop image here' : 'Click or drag to upload'}</span>
                    </div>
                  )}
                  <input
                    ref={xpFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleXpImageUpload}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              <div className="id-section">
                <label className="id-label">Display Name</label>
                <input
                  type="text"
                  className="id-input"
                  placeholder="Enter your name"
                  value={xpDisplayName}
                  onChange={(e) => setXpDisplayName(e.target.value)}
                />
              </div>

              <div className="id-section">
                <label className="id-label">XP Amount</label>
                <input
                  type="text"
                  className="id-input"
                  placeholder="e.g. 12,500"
                  value={xpAmount}
                  onChange={(e) => setXpAmount(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {/* Live Preview Card */}
        <div className="id-preview-card">
          <h3 className="id-card-header">Live Preview</h3>

          <div className="id-preview-container">
            {cardType === 'id' ? (
              /* ID Card Preview */
              <div ref={cardRef} className="abstract-id-card">
                <img src="/AbstractIDCard.png?v=3" alt="Abstract ID" className="abstract-id-bg" />
                <div className="abstract-id-avatar">
                  {idProfileImage ? (
                    <img src={idProfileImage} alt="Profile" />
                  ) : (
                    <div className="abstract-id-avatar-placeholder" />
                  )}
                </div>
                <span className="abstract-id-name">{idDisplayName || 'Your Name'}</span>
                <span className="abstract-id-rank">{rankTier} {rankLevel}</span>
                <span className="abstract-id-role">{role}</span>
                <span className="card-watermark">ZaddyTools</span>
              </div>
            ) : (
              /* XP Card Preview */
              <div ref={cardRef} className="abstract-xp-card" style={xpBackgroundImage && !xpBackgroundVideo ? { backgroundImage: `url(${xpBackgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                {xpBackgroundVideo && (
                  <video
                    key={xpBackgroundVideo}
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      zIndex: 0,
                      borderRadius: '16px',
                    }}
                    src={xpBackgroundVideo}
                  />
                )}
                <div className="abstract-xp-header" style={{ position: 'relative', zIndex: 1 }}>
                  <span className="abstract-xp-title">ABSTRACT XP CARD</span>
                  <img src="/abspfp.png" alt="Abstract" className="abstract-xp-logo" />
                </div>
                <div className="abstract-xp-content" style={{ position: 'relative', zIndex: 1 }}>
                  <div className="abstract-xp-avatar">
                    {xpProfileImage ? (
                      <img src={xpProfileImage} alt="Profile" />
                    ) : (
                      <div className="abstract-xp-avatar-placeholder" />
                    )}
                  </div>
                  <div className="abstract-xp-info">
                    <p className="abstract-xp-name">{xpDisplayName || 'Your Name'}</p>
                    <div className="abstract-xp-stats">
                      <div className="abstract-xp-stat">
                        <span className="abstract-xp-stat-value">{xpAmount || '0'}</span>
                        <span className="abstract-xp-stat-label">XP</span>
                      </div>
                    </div>
                  </div>
                </div>
                <span className="card-watermark" style={{ position: 'relative', zIndex: 1 }}>ZaddyTools</span>
              </div>
            )}
          </div>

          <div className="id-btn-group">
            <button className="id-download-btn" onClick={handleDownload}>
              DOWNLOAD CARD
            </button>
          </div>
        </div>
      </div>
      </main>
    </ErrorBoundary>
  );
}
