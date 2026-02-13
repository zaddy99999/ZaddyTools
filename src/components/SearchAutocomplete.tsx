'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChannelDisplayData } from '@/lib/types';

interface Props {
  channels: ChannelDisplayData[];
  value: string;
  onChange: (value: string) => void;
  onSelectChannel?: (channel: ChannelDisplayData) => void;
  placeholder?: string;
}

export default function SearchAutocomplete({
  channels,
  value,
  onChange,
  onSelectChannel,
  placeholder = 'Search channels...',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter channels based on search
  const filteredChannels = value.trim()
    ? channels.filter(ch =>
        ch.channelName.toLowerCase().includes(value.toLowerCase()) ||
        ch.category.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8)
    : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredChannels.length]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || filteredChannels.length === 0) {
      if (e.key === 'ArrowDown' && filteredChannels.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(i => (i + 1) % filteredChannels.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(i => (i - 1 + filteredChannels.length) % filteredChannels.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredChannels[highlightedIndex]) {
          handleSelect(filteredChannels[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  }, [isOpen, filteredChannels, highlightedIndex]);

  const handleSelect = (channel: ChannelDisplayData) => {
    onChange(channel.channelName);
    setIsOpen(false);
    onSelectChannel?.(channel);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
  };

  const handleFocus = () => {
    if (filteredChannels.length > 0) {
      setIsOpen(true);
    }
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const formatNumber = (num: number): string => {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="search-autocomplete">
      <div className="search-input-wrapper">
        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="search-input"
          autoComplete="off"
        />
        {value && (
          <button className="search-clear" onClick={handleClear} title="Clear search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && filteredChannels.length > 0 && (
        <div ref={dropdownRef} className="search-dropdown">
          {filteredChannels.map((channel, index) => (
            <div
              key={channel.channelUrl}
              className={`search-result ${index === highlightedIndex ? 'highlighted' : ''}`}
              onClick={() => handleSelect(channel)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {channel.logoUrl && (
                <img src={channel.logoUrl} alt="" className="search-result-logo" />
              )}
              <div className="search-result-info">
                <div className="search-result-name">{channel.channelName}</div>
                <div className="search-result-meta">
                  <span className={`category-badge ${channel.category}`}>{channel.category}</span>
                  <span className="search-result-views">{formatNumber(channel.totalViews)} views</span>
                </div>
              </div>
              {channel.delta1d !== null && (
                <span className={`search-result-delta ${channel.delta1d >= 0 ? 'positive' : 'negative'}`}>
                  {channel.delta1d >= 0 ? '+' : ''}{formatNumber(channel.delta1d)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {isOpen && value && filteredChannels.length === 0 && (
        <div ref={dropdownRef} className="search-dropdown">
          <div className="search-no-results">
            No channels found for "{value}"
          </div>
        </div>
      )}
    </div>
  );
}
