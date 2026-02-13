'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';

interface MemeTemplate {
  id: string;
  name: string;
  imageUrl: string;
  thumbnailUrl: string;
}

export default function MemeGenerator() {
  const [templates, setTemplates] = useState<MemeTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MemeTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Reference image (the character to swap in) - default to Zaddy
  const [characterImage, setCharacterImage] = useState<string | null>('/ZaddyPFP.png');
  const [twitterHandle, setTwitterHandle] = useState('');

  // AI generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const twitterAvatar = (handle: string) => `https://unavatar.io/twitter/${handle}`;

  useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await fetch('/api/meme-templates');
        if (res.ok) {
          const data = await res.json();
          setTemplates(data);
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadTemplates();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setCharacterImage(event.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const getTwitterAvatar = () => {
    if (!twitterHandle.trim()) return;
    setCharacterImage(twitterAvatar(twitterHandle.trim().replace('@', '')));
    setTwitterHandle('');
  };

  // Convert local image path to base64 for API
  const getImageAsBase64 = async (url: string): Promise<string> => {
    // If already a data URL, return as-is
    if (url.startsWith('data:')) return url;

    // If it's a local path, fetch and convert
    if (url.startsWith('/')) {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }

    // External URL - return as-is (OpenAI can fetch it)
    return url;
  };

  const generateMeme = async () => {
    if (!selectedTemplate || !characterImage || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      // Get both images ready for API
      const templateUrl = await getImageAsBase64(selectedTemplate.imageUrl);
      const characterUrl = characterImage; // Already base64 or external URL

      const response = await fetch('/api/generate-meme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateUrl,
          characterUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setGeneratedImage(data.imageUrl);
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate meme');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyImage = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      alert('Copied!');
    } catch (error) {
      console.error('Copy failed:', error);
      alert('Failed to copy');
    }
  };

  const downloadImage = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `meme-${Date.now()}.png`;
    link.click();
  };

  return (
    <main className="container meme-generator-page">
      <NavBar />

      <div className="meme-generator-header">
        <h1 className="meme-title">Meme Generator</h1>
        <p className="meme-subtitle">Upload your character, select a template, generate</p>
      </div>

      {/* Equation Display: [PFP] + [Template] = [Output] */}
      <div className="meme-equation">
        {/* PFP Box */}
        <div className="meme-equation-box pfp-box">
          <label className="equation-box-label">Your PFP</label>
          <div className="equation-box-content">
            {characterImage ? (
              <img src={characterImage} alt="Character" className="equation-preview-img" />
            ) : (
              <div className="equation-placeholder">?</div>
            )}
          </div>
          <div className="equation-box-actions">
            <input
              type="text"
              placeholder="@twitter"
              value={twitterHandle}
              onChange={(e) => setTwitterHandle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && getTwitterAvatar()}
              className="meme-input-tiny"
            />
            <button className="meme-btn-tiny" onClick={getTwitterAvatar}>Get</button>
            <label className="meme-btn-tiny upload">
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              Upload
            </label>
            {characterImage && characterImage !== '/ZaddyPFP.png' && (
              <button className="meme-btn-tiny reset" onClick={() => setCharacterImage('/ZaddyPFP.png')}>Reset</button>
            )}
          </div>
        </div>

        {/* Plus Sign */}
        <div className="meme-equation-operator">+</div>

        {/* Template Box */}
        <div className="meme-equation-box template-box">
          <label className="equation-box-label">Template</label>
          <div className="equation-box-content">
            {selectedTemplate ? (
              <img src={selectedTemplate.thumbnailUrl} alt={selectedTemplate.name} className="equation-preview-img" />
            ) : (
              <div className="equation-placeholder">?</div>
            )}
          </div>
          {selectedTemplate && (
            <span className="equation-box-name">{selectedTemplate.name}</span>
          )}
        </div>

        {/* Equals Sign */}
        <div className="meme-equation-operator">=</div>

        {/* Output Box */}
        <div className="meme-equation-box output-box">
          <label className="equation-box-label">Result</label>
          <div className="equation-box-content">
            {isGenerating ? (
              <div className="equation-placeholder generating">...</div>
            ) : generatedImage ? (
              <img src={generatedImage} alt="Generated meme" className="equation-preview-img" />
            ) : (
              <div className="equation-placeholder">?</div>
            )}
          </div>
          {generatedImage && (
            <div className="equation-box-actions">
              <button className="meme-btn-tiny" onClick={() => copyImage(generatedImage)}>Copy</button>
              <button className="meme-btn-tiny" onClick={() => downloadImage(generatedImage)}>Save</button>
              <button className="meme-btn-tiny" onClick={() => setGeneratedImage(null)}>Clear</button>
            </div>
          )}
        </div>
      </div>

      {/* Generate Button */}
      <div className="meme-generate-section">
        <button
          className="generate-btn"
          onClick={generateMeme}
          disabled={!selectedTemplate || !characterImage || isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate Meme'}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="meme-error">{error}</div>
      )}

      {/* Template Grid */}
      <div className="template-section">
        <p className="template-section-label">
          Select a Template ({templates.length})
        </p>
        <div className="template-grid-scroll">
          {isLoading ? (
            <div className="loading-templates">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="loading-templates">No templates found.</div>
          ) : (
            <div className="template-grid">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <img src={template.thumbnailUrl} alt={template.name} className="template-thumb" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
