'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import NavBar from '@/components/NavBar';
import ErrorBoundary from '@/components/ErrorBoundary';

// Circular Image Crop Modal
interface CropModalProps {
  imageUrl: string;
  onConfirm: (croppedUrl: string) => void;
  onCancel: () => void;
}

function CropModal({ imageUrl, onConfirm, onCancel }: CropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const cropSize = 200; // Size of the crop circle

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
      // Center the image initially
      const scale = Math.max(cropSize / img.width, cropSize / img.height);
      setZoom(scale);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Set canvas to output size
      canvas.width = cropSize;
      canvas.height = cropSize;

      // Clear and create circular clip
      ctx.clearRect(0, 0, cropSize, cropSize);
      ctx.beginPath();
      ctx.arc(cropSize / 2, cropSize / 2, cropSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Calculate draw position
      const scaledWidth = img.width * zoom;
      const scaledHeight = img.height * zoom;
      const drawX = (cropSize - scaledWidth) / 2 + position.x;
      const drawY = (cropSize - scaledHeight) / 2 + position.y;

      ctx.drawImage(img, drawX, drawY, scaledWidth, scaledHeight);

      // Export as data URL
      const croppedUrl = canvas.toDataURL('image/png');
      onConfirm(croppedUrl);
    };
    img.src = imageUrl;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1rem',
    }}>
      <h3 style={{ color: '#fff', marginBottom: '1rem' }}>Adjust Profile Picture</h3>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '1rem' }}>
        Drag to position, use slider to zoom
      </p>

      {/* Crop area */}
      <div
        ref={containerRef}
        style={{
          width: cropSize,
          height: cropSize,
          borderRadius: '50%',
          overflow: 'hidden',
          border: '3px solid #2edb84',
          cursor: isDragging ? 'grabbing' : 'grab',
          position: 'relative',
          background: '#1a1a1a',
        }}
        onMouseDown={handleMouseDown}
      >
        <img
          src={imageUrl}
          alt="Crop preview"
          draggable={false}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transformOrigin: 'center',
            maxWidth: 'none',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Hidden canvas for cropping */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Zoom slider */}
      <div style={{ marginTop: '1.5rem', width: '100%', maxWidth: '300px' }}>
        <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>
          Zoom: {Math.round(zoom * 100)}%
        </label>
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          style={{
            width: '100%',
            height: '6px',
            appearance: 'none',
            background: `linear-gradient(to right, #2edb84 0%, #2edb84 ${((zoom - 0.5) / 2.5) * 100}%, rgba(255,255,255,0.2) ${((zoom - 0.5) / 2.5) * 100}%, rgba(255,255,255,0.2) 100%)`,
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        />
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            border: 'none',
            background: '#2edb84',
            color: '#000',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

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
  const [fontColor, setFontColor] = useState('#2edb84');

  const fontColorOptions = [
    { name: 'Green', color: '#2edb84' },
    { name: 'White', color: '#ffffff' },
    { name: 'Gold', color: '#ffd700' },
    { name: 'Cyan', color: '#00ffff' },
    { name: 'Pink', color: '#ff69b4' },
    { name: 'Orange', color: '#ff8c00' },
  ];

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

  // Crop modal state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'id' | 'xp'>('id');

  const rankTiers: RankTier[] = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Obsidian'];
  const rankLevels: RankLevel[] = ['1', '2', '3'];
  const roles: Role[] = ['Elite Chad', 'Graduated Elite Chad', 'Gigachad'];

  const processImageFile = (file: File, setImage: (url: string) => void, target: 'id' | 'xp') => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;

        // Check if image is square (1:1 aspect ratio)
        const img = new Image();
        img.onload = () => {
          const aspectRatio = img.width / img.height;
          // If not square (allowing 5% tolerance), show crop modal
          if (aspectRatio < 0.95 || aspectRatio > 1.05) {
            setCropImageUrl(dataUrl);
            setCropTarget(target);
            setCropModalOpen(true);
          } else {
            // Square image, use directly
            setImage(dataUrl);
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropConfirm = (croppedUrl: string) => {
    if (cropTarget === 'id') {
      setIdProfileImage(croppedUrl);
    } else {
      setXpProfileImage(croppedUrl);
    }
    setCropModalOpen(false);
    setCropImageUrl(null);
  };

  const handleCropCancel = () => {
    setCropModalOpen(false);
    setCropImageUrl(null);
  };

  const handleIdImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file, setIdProfileImage, 'id');
  };

  const handleXpImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file, setXpProfileImage, 'xp');
  };

  const handleIdDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIdDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file, setIdProfileImage, 'id');
  };

  const handleXpDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setXpDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file, setXpProfileImage, 'xp');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  const handleCopy = async () => {
    if (!cardRef.current || copyStatus === 'copying') return;

    const cardElement = cardRef.current;

    try {
      setCopyStatus('copying');

      // For Safari/mobile: Create ClipboardItem immediately with a Promise
      // This maintains the user gesture context
      const clipboardItem = new ClipboardItem({
        'image/png': (async () => {
          const html2canvas = (await import('html2canvas')).default;
          const canvas = await html2canvas(cardElement, {
            backgroundColor: null,
            scale: 2,
            useCORS: true,
          });

          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((b) => {
              if (b) resolve(b);
              else reject(new Error('Failed to create blob'));
            }, 'image/png');
          });

          return blob;
        })()
      });

      await navigator.clipboard.write([clipboardItem]);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  // Helper to parse GIF frames
  const parseGifFrames = async (url: string): Promise<{ frames: ImageData[]; delays: number[] }> => {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(buffer);

    // @ts-ignore - omggif types
    const omggif = await import('omggif');
    const reader = new omggif.GifReader(uint8);

    const frames: ImageData[] = [];
    const delays: number[] = [];

    for (let i = 0; i < reader.numFrames(); i++) {
      const frameInfo = reader.frameInfo(i);
      const canvas = document.createElement('canvas');
      canvas.width = reader.width;
      canvas.height = reader.height;
      const ctx = canvas.getContext('2d')!;

      // If not first frame, copy previous frame first (for disposal)
      if (i > 0 && frames.length > 0) {
        ctx.putImageData(frames[frames.length - 1], 0, 0);
      }

      const imageData = ctx.createImageData(reader.width, reader.height);
      reader.decodeAndBlitFrameRGBA(i, imageData.data);

      // Handle transparency - blend with previous frame
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = reader.width;
      tempCanvas.height = reader.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      if (i > 0) tempCtx.putImageData(frames[frames.length - 1], 0, 0);

      // Draw current frame
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = reader.width;
      frameCanvas.height = reader.height;
      const frameCtx = frameCanvas.getContext('2d')!;
      frameCtx.putImageData(imageData, 0, 0);
      tempCtx.drawImage(frameCanvas, 0, 0);

      frames.push(tempCtx.getImageData(0, 0, reader.width, reader.height));
      delays.push(frameInfo.delay * 10 || 100); // delay is in centiseconds
    }

    return { frames, delays };
  };

  const handleDownload = async () => {
    if (!cardRef.current || isDownloading) return;

    const name = cardType === 'id' ? idDisplayName : xpDisplayName;
    const hasGif = cardType === 'xp' && xpBackgroundImage?.endsWith('.gif');

    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      const html2canvas = (await import('html2canvas')).default;

      if (hasGif && xpBackgroundImage) {
        // Parse the source GIF to get all frames
        const { frames, delays } = await parseGifFrames(xpBackgroundImage);

        const GIF = (await import('gif.js')).default;
        const cardWidth = cardRef.current.offsetWidth * 2;
        const cardHeight = cardRef.current.offsetHeight * 2;

        const gif = new GIF({
          workers: 2,
          quality: 10,
          width: cardWidth,
          height: cardHeight,
          workerScript: '/gif.worker.js',
        });

        // For each GIF frame, render the card with that frame as background
        for (let i = 0; i < frames.length; i++) {
          setDownloadProgress(Math.round((i / frames.length) * 100));

          // Create a canvas with this frame
          const bgCanvas = document.createElement('canvas');
          bgCanvas.width = frames[i].width;
          bgCanvas.height = frames[i].height;
          const bgCtx = bgCanvas.getContext('2d')!;
          bgCtx.putImageData(frames[i], 0, 0);
          const frameDataUrl = bgCanvas.toDataURL('image/png');

          // Temporarily update the background
          const cardEl = cardRef.current;
          const originalBg = cardEl.style.backgroundImage;
          cardEl.style.backgroundImage = `url(${frameDataUrl})`;

          // Small delay to ensure render
          await new Promise(r => setTimeout(r, 10));

          // Capture this frame
          const canvas = await html2canvas(cardRef.current, {
            backgroundColor: null,
            scale: 2,
          });

          gif.addFrame(canvas, { delay: delays[i], copy: true });

          // Restore original
          cardEl.style.backgroundImage = originalBg;
        }

        gif.on('finished', (blob: Blob) => {
          const link = document.createElement('a');
          link.download = `abstract-${cardType}-${name || 'card'}.gif`;
          link.href = URL.createObjectURL(blob);
          link.click();
          URL.revokeObjectURL(link.href);
          setIsDownloading(false);
          setDownloadProgress(0);
        });

        gif.render();
      } else {
        // Static image - download as PNG
        const canvas = await html2canvas(cardRef.current, {
          backgroundColor: null,
          scale: 2,
        });

        const link = document.createElement('a');
        link.download = `abstract-${cardType}-${name || 'card'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setIsDownloading(false);
      }
    } catch (error) {
      console.error('Error generating image:', error);
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  return (
    <ErrorBoundary>
      {/* Image Crop Modal */}
      {cropModalOpen && cropImageUrl && (
        <CropModal
          imageUrl={cropImageUrl}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
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
              className="card-type-btn"
              disabled
              style={{ opacity: 0.4, cursor: 'not-allowed', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.3 }}
              title="Under Construction"
            >
              <span>XP Card</span>
              <span style={{ fontSize: '0.75em' }}>(under construction)</span>
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
              {/* Profile Image + Font Color side by side */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="id-section" style={{ flex: 1 }}>
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
                        <span>{xpDragging ? 'Drop image here' : 'Click or drag'}</span>
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

                <div className="id-section" style={{ flex: 1 }}>
                  <label className="id-label">Font Color</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    {fontColorOptions.map((option) => (
                      <button
                        key={option.color}
                        onClick={() => setFontColor(option.color)}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: option.color,
                          border: fontColor === option.color ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)',
                          cursor: 'pointer',
                          boxShadow: fontColor === option.color ? `0 0 10px ${option.color}` : 'none',
                          transition: 'all 0.2s ease',
                        }}
                        title={option.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Name + XP side by side */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="id-section" style={{ flex: 1 }}>
                  <label className="id-label">Display Name</label>
                  <input
                    type="text"
                    className="id-input"
                    placeholder="Enter your name"
                    value={xpDisplayName}
                    onChange={(e) => setXpDisplayName(e.target.value)}
                  />
                </div>

                <div className="id-section" style={{ flex: 1 }}>
                  <label className="id-label">XP Amount</label>
                  <input
                    type="text"
                    className="id-input"
                    placeholder="e.g. 12,500"
                    value={xpAmount}
                    onChange={(e) => setXpAmount(e.target.value)}
                  />
                </div>
              </div>

              {/* Background Templates */}
              <div className="id-section">
                <label className="id-label">Background Template</label>
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
                <img src="/AbstractIDCard.png?v=4" alt="Abstract ID" className="abstract-id-bg" />
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
                <img src="/ZaddyToolsLogo.png" alt="ZaddyTools" className="card-watermark" style={{ height: '36px', width: 'auto' }} />
              </div>
            ) : (
              /* XP Card Preview */
              <div ref={cardRef} className="abstract-xp-card" style={{ display: 'flex', flexDirection: 'column', ...(xpBackgroundImage && !xpBackgroundVideo ? { backgroundImage: `url(${xpBackgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}) }}>
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
                  <span className="abstract-xp-title" style={{ color: fontColor, textShadow: `0 0 10px ${fontColor}50` }}>ABSTRACT XP CARD</span>
                  <img src="/abspfp.png" alt="Abstract" className="abstract-xp-logo" />
                </div>
                <div className="abstract-xp-content" style={{ position: 'relative', zIndex: 1, flex: 1 }}>
                  <div className="abstract-xp-avatar">
                    {xpProfileImage ? (
                      <img src={xpProfileImage} alt="Profile" />
                    ) : (
                      <div className="abstract-xp-avatar-placeholder" />
                    )}
                  </div>
                  <div className="abstract-xp-info">
                    <p className="abstract-xp-name" style={{ color: fontColor }}>{xpDisplayName || 'Your Name'}</p>
                    <div className="abstract-xp-stats">
                      <div className="abstract-xp-stat">
                        <span className="abstract-xp-stat-value" style={{ color: fontColor }}>{xpAmount || '0'}</span>
                        <span className="abstract-xp-stat-label" style={{ color: fontColor }}>XP</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '0.75rem' }}>
                  <span style={{ color: fontColor, fontSize: '0.65rem', fontWeight: 600 }}>@zaddyfi</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', fontWeight: 500 }}>ZaddyTools</span>
                </div>
              </div>
            )}
          </div>

          <div className="id-btn-group">
            <button
              className="id-download-btn"
              onClick={handleCopy}
              disabled={copyStatus === 'copying'}
              style={{ background: copyStatus === 'copied' ? '#2edb84' : copyStatus === 'error' ? '#888' : undefined }}
            >
              {copyStatus === 'copying' ? 'COPYING...' : copyStatus === 'copied' ? 'COPIED!' : copyStatus === 'error' ? 'ERROR' : 'COPY'}
            </button>
            {!isMobile && (
              <button className="id-download-btn" onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? `GENERATING... ${downloadProgress}%` : 'DOWNLOAD CARD'}
              </button>
            )}
          </div>
        </div>
      </div>
      </main>
    </ErrorBoundary>
  );
}
