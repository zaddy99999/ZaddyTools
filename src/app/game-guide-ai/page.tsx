'use client';

import { useState, useRef, useEffect } from 'react';
import NavBar from '@/components/NavBar';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Game {
  id: string;
  name: string;
  icon: string;
  description: string;
  twitterPfp?: string | null;
}

interface FAQ {
  question: string;
  category: 'basics' | 'nfts' | 'tokens' | 'gameplay' | 'earning';
}

const DEFAULT_GAMES: Game[] = [
  { id: 'general', name: 'General', icon: '🌐', description: 'Abstract ecosystem overview' },
  { id: 'gigaverse', name: 'Gigaverse', icon: '🤖', description: 'ROMs & Giglings universe' },
  { id: 'moody-madness', name: 'Moody Madness', icon: '😈', description: 'Moody creatures game' },
  { id: 'hamieverse', name: 'Hamieverse', icon: '🐹', description: 'Hamster gaming world' },
  { id: 'ruyui', name: 'Ruyui', icon: '🎭', description: 'Ruyui collection' },
  { id: 'cambria', name: 'Cambria', icon: '⚔️', description: 'Fantasy adventure' },
  { id: 'duper', name: 'Duper', icon: '🎮', description: 'Duper gaming' },
  { id: 'onchainheroes', name: 'OnchainHeroes', icon: '🦸', description: 'Hero battle game' },
];

// Game-specific FAQs
const GAME_FAQS: Record<string, FAQ[]> = {
  'general': [
    { question: 'What is Abstract chain?', category: 'basics' },
    { question: 'How do I get started on Abstract?', category: 'basics' },
    { question: 'What are the top games on Abstract?', category: 'basics' },
    { question: 'How do I bridge to Abstract?', category: 'basics' },
    { question: 'What wallets work with Abstract?', category: 'basics' },
    { question: 'What are gas fees like on Abstract?', category: 'basics' },
    { question: 'What NFT collections are popular?', category: 'nfts' },
    { question: 'Is there an Abstract token?', category: 'tokens' },
  ],
  'gigaverse': [
    { question: 'Give me an overview of Gigaverse', category: 'basics' },
    { question: 'Explain all the NFT collections (ROMs, Giglings, etc)', category: 'nfts' },
    { question: 'What are the ROM rarities and traits?', category: 'nfts' },
    { question: 'What makes a ROM valuable?', category: 'nfts' },
    { question: 'How do gameplay mechanics work?', category: 'gameplay' },
    { question: 'Explain breeding and evolution', category: 'gameplay' },
    { question: 'What are the best earning strategies?', category: 'earning' },
    { question: 'What is the $GIGA token utility?', category: 'tokens' },
    { question: 'How does staking and earning work?', category: 'earning' },
    { question: 'What are seasons and rewards?', category: 'earning' },
    { question: 'What is the Gigaverse roadmap?', category: 'basics' },
    { question: 'How do I trade ROMs and Giglings?', category: 'basics' },
  ],
  'moody-madness': [
    { question: 'What is Moody Madness?', category: 'basics' },
    { question: 'How do I play Moody Madness?', category: 'basics' },
    { question: 'What are Moodies?', category: 'nfts' },
    { question: 'How many Moodies are there?', category: 'nfts' },
    { question: 'What traits do Moodies have?', category: 'nfts' },
    { question: 'Is Moody Madness free to play?', category: 'basics' },
    { question: 'How do I earn rewards?', category: 'earning' },
    { question: 'What is the game roadmap?', category: 'basics' },
    { question: 'Are there any tokens?', category: 'tokens' },
    { question: 'How does the leaderboard work?', category: 'gameplay' },
  ],
  'hamieverse': [
    { question: 'What is Hamieverse Riven?', category: 'basics' },
    { question: 'What are the card types?', category: 'gameplay' },
    { question: 'What are the card ranks?', category: 'nfts' },
    { question: 'How does the fusion system work?', category: 'gameplay' },
    { question: 'What are Living NFTs?', category: 'nfts' },
    { question: 'How do I create my own Legend?', category: 'nfts' },
    { question: 'What currencies are in the game?', category: 'tokens' },
    { question: 'How does battle combat work?', category: 'gameplay' },
    { question: 'What is the ingredient system?', category: 'earning' },
    { question: 'How do guilds work?', category: 'basics' },
    { question: 'What is the Battle Pass?', category: 'earning' },
    { question: 'How does the market and trading work?', category: 'earning' },
  ],
  'ruyui': [
    { question: 'What is Ruyui?', category: 'basics' },
    { question: 'What is the Ruyui collection about?', category: 'nfts' },
    { question: 'How many Ruyui NFTs are there?', category: 'nfts' },
    { question: 'What are the Ruyui traits?', category: 'nfts' },
    { question: 'Is there utility for Ruyui?', category: 'nfts' },
    { question: 'Where can I buy Ruyui?', category: 'basics' },
    { question: 'Is there a Ruyui token?', category: 'tokens' },
    { question: 'What is the Ruyui roadmap?', category: 'basics' },
  ],
  'cambria': [
    { question: 'What is Cambria?', category: 'basics' },
    { question: 'How do I play Cambria?', category: 'basics' },
    { question: 'What type of game is Cambria?', category: 'gameplay' },
    { question: 'What NFTs are in Cambria?', category: 'nfts' },
    { question: 'How does combat work?', category: 'gameplay' },
    { question: 'Is there a Cambria token?', category: 'tokens' },
    { question: 'How do I earn in Cambria?', category: 'earning' },
    { question: 'What classes are available?', category: 'gameplay' },
    { question: 'Is there PvP in Cambria?', category: 'gameplay' },
    { question: 'What is the game roadmap?', category: 'basics' },
  ],
  'duper': [
    { question: 'What is Duper?', category: 'basics' },
    { question: 'How do I play Duper?', category: 'basics' },
    { question: 'What type of game is Duper?', category: 'gameplay' },
    { question: 'Are there Duper NFTs?', category: 'nfts' },
    { question: 'Is Duper free to play?', category: 'basics' },
    { question: 'How does multiplayer work?', category: 'gameplay' },
    { question: 'Is there a Duper token?', category: 'tokens' },
    { question: 'How do I earn rewards?', category: 'earning' },
    { question: 'What platforms is Duper on?', category: 'basics' },
    { question: 'What is the Duper roadmap?', category: 'basics' },
  ],
  'onchainheroes': [
    { question: 'What is OnchainHeroes?', category: 'basics' },
    { question: 'How do I play OnchainHeroes?', category: 'basics' },
    { question: 'What are Heroes?', category: 'nfts' },
    { question: 'How does battle work?', category: 'gameplay' },
    { question: 'What hero classes exist?', category: 'gameplay' },
    { question: 'Is there a token?', category: 'tokens' },
    { question: 'How do I earn in OnchainHeroes?', category: 'earning' },
    { question: 'What are hero abilities?', category: 'gameplay' },
    { question: 'Is there PvP?', category: 'gameplay' },
    { question: 'How does leveling work?', category: 'gameplay' },
    { question: 'What is staking?', category: 'earning' },
    { question: 'What is the roadmap?', category: 'basics' },
  ],
};

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  basics: 'rgba(46, 219, 132, 0.15)',
  nfts: 'rgba(138, 43, 226, 0.15)',
  tokens: 'rgba(255, 193, 7, 0.15)',
  gameplay: 'rgba(0, 204, 255, 0.15)',
  earning: 'rgba(255, 107, 107, 0.15)',
};

const CATEGORY_BORDERS: Record<string, string> = {
  basics: 'rgba(46, 219, 132, 0.4)',
  nfts: 'rgba(138, 43, 226, 0.4)',
  tokens: 'rgba(255, 193, 7, 0.4)',
  gameplay: 'rgba(0, 204, 255, 0.4)',
  earning: 'rgba(255, 107, 107, 0.4)',
};

export default function GameGuideAI() {
  const [games, setGames] = useState<Game[]>(DEFAULT_GAMES);
  const [selectedGame, setSelectedGame] = useState<Game>(DEFAULT_GAMES[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch game metadata with Twitter PFPs
  useEffect(() => {
    async function fetchGames() {
      try {
        const res = await fetch('/api/game-guide/games');
        if (res.ok) {
          const data = await res.json();
          if (data.games && data.games.length > 0) {
            // Merge fetched data with defaults
            const updatedGames = DEFAULT_GAMES.map(defaultGame => {
              const fetched = data.games.find((g: { id: string; twitterPfp?: string }) =>
                g.id === defaultGame.id
              );
              return fetched?.twitterPfp
                ? { ...defaultGame, twitterPfp: fetched.twitterPfp }
                : defaultGame;
            });
            setGames(updatedGames);
            // Update selected game if it has a PFP now
            const updatedSelected = updatedGames.find(g => g.id === selectedGame.id);
            if (updatedSelected) {
              setSelectedGame(updatedSelected);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch game metadata:', err);
      }
    }
    fetchGames();
  }, []);

  // Get FAQs for selected game
  const currentFaqs = GAME_FAQS[selectedGame.id] || GAME_FAQS['general'];

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset chat when game changes
  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    setMessages([]);
    setInput('');
    inputRef.current?.focus();
  };

  // Send message
  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/game-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: selectedGame.id,
          gameName: selectedGame.name,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content || data.error || 'Sorry, something went wrong.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle FAQ click - clear chat and send
  const handleFaqClick = (question: string) => {
    setMessages([]); // Clear previous conversation
    handleSend(question);
  };

  // Handle image error - fall back to emoji
  const handleImageError = (gameId: string) => {
    setImageErrors(prev => new Set(prev).add(gameId));
  };

  // Render game icon (PFP or emoji fallback)
  const renderGameIcon = (game: Game, size: number = 24) => {
    if (game.twitterPfp && !imageErrors.has(game.id)) {
      return (
        <img
          src={game.twitterPfp}
          alt={game.name}
          onError={() => handleImageError(game.id)}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
      );
    }
    return <span style={{ fontSize: size * 0.8 }}>{game.icon}</span>;
  };

  return (
    <main className="container">
      {/* Banner Header */}
      <div className="banner-header">
        <div className="banner-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/ZaddyToolsPFPandLogo.png" alt="ZaddyTools" style={{ height: 48, width: 'auto' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>GameGuideAI</p>
          </div>
          <NavBar />
        </div>
      </div>

      {/* Main Content */}
      <div className="game-guide-layout">
        {/* Left Sidebar - Game Tabs */}
        <div className="card game-guide-sidebar">
          {/* Sidebar Header */}
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}>
            <h2 style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: '#2edb84',
              margin: 0,
            }}>
              Select Game
            </h2>
          </div>

          {/* Game List */}
          <div className="game-list" style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.5rem',
          }}>
            {games.map((game) => (
              <button
                key={game.id}
                className="game-btn"
                onClick={() => handleGameSelect(game)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  marginBottom: '0.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: selectedGame.id === game.id
                    ? 'rgba(46, 219, 132, 0.2)'
                    : 'transparent',
                  borderLeft: selectedGame.id === game.id
                    ? '3px solid #2edb84'
                    : '3px solid transparent',
                  color: selectedGame.id === game.id ? '#fff' : 'rgba(255,255,255,0.6)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {renderGameIcon(game, 28)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{game.name}</div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
                    {game.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="card game-guide-main">
          {/* Chat Header */}
          <div style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {renderGameIcon(selectedGame, 36)}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>{selectedGame.name} Guide</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                AI-powered assistant for {selectedGame.name}
              </p>
            </div>
            <button
              onClick={() => handleGameSelect(selectedGame)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Reset Chat
            </button>
          </div>

          {/* FAQ Quick Access - Always visible */}
          <div style={{
            padding: '0.5rem 1rem',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            flexShrink: 0,
          }}>
            <div style={{
              fontSize: '0.6rem',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.35)',
              marginBottom: '0.35rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Quick Questions
            </div>
            <div className="game-guide-faq-grid" style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.3rem',
            }}>
              {currentFaqs.map((faq, i) => (
                <button
                  key={i}
                  onClick={() => handleFaqClick(faq.question)}
                  disabled={loading}
                  style={{
                    padding: '0.3rem 0.5rem',
                    borderRadius: '4px',
                    border: `1px solid ${CATEGORY_BORDERS[faq.category]}`,
                    background: CATEGORY_COLORS[faq.category],
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '0.6rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  {faq.question}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            {messages.length === 0 ? (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.3)',
                textAlign: 'center',
                padding: '2rem',
              }}>
                <div style={{ width: 64, height: 64, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {renderGameIcon(selectedGame, 64)}
                </div>
                <h3 style={{ margin: '0 0 0.25rem 0', color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem' }}>
                  {selectedGame.name} Guide
                </h3>
                <p style={{ margin: 0, maxWidth: '400px', lineHeight: 1.5, fontSize: '0.85rem' }}>
                  Click any question above or type your own below
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div style={{
                      maxWidth: '70%',
                      padding: '0.875rem 1.125rem',
                      borderRadius: msg.role === 'user'
                        ? '16px 16px 4px 16px'
                        : '16px 16px 16px 4px',
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg, #2edb84 0%, #00ccff 100%)'
                        : 'rgba(255,255,255,0.08)',
                      color: msg.role === 'user' ? '#000' : '#fff',
                      fontSize: '0.9rem',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                  }}>
                    <div style={{
                      padding: '1rem 1.25rem',
                      borderRadius: '16px 16px 16px 4px',
                      background: 'rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.5)',
                    }}>
                      Thinking...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
            }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask about ${selectedGame.name}...`}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '0.875rem 1.25rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                style={{
                  padding: '0.875rem 1.5rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: loading || !input.trim()
                    ? 'rgba(255,255,255,0.1)'
                    : '#2edb84',
                  color: loading || !input.trim() ? 'rgba(255,255,255,0.3)' : '#000',
                  fontWeight: 600,
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  fontSize: '0.9rem',
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
