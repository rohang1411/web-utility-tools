import { useState, useRef, useEffect } from 'react';
import type { Transcript } from '@/types';
import { TranscriptService, downloadFile } from '@/services/TranscriptService';

interface TranscriptCardProps {
  transcript: Transcript;
  includeIndexInTitles: boolean;
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  ko: 'Korean',
  ja: 'Japanese',
  es: 'Spanish',
};

const service = new TranscriptService();

export default function TranscriptCard({ transcript, includeIndexInTitles }: TranscriptCardProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleExportTxt = () => {
    const blob = service.exportAsTxt(transcript);
    downloadFile(blob, service.getFilename(transcript, 'txt', includeIndexInTitles));
    setExportOpen(false);
  };

  const handleExportSrt = () => {
    const blob = service.exportAsSrt(transcript);
    downloadFile(blob, service.getFilename(transcript, 'srt', includeIndexInTitles));
    setExportOpen(false);
  };

  return (
    <div className="rounded-lg border border-[var(--yt-border)] bg-[var(--yt-bg-card)] p-4 shadow-[var(--yt-shadow-card)] transition-shadow hover:shadow-[var(--yt-shadow-card-hover)]">
      {/* Thumbnail */}
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-[var(--yt-bg-subtle)]">
        <img
          src={transcript.thumbnail}
          alt={transcript.title}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      {/* Video Title */}
      <h3 className="mt-3 text-base font-medium text-[var(--yt-text-primary)] leading-snug line-clamp-2">
        {transcript.title}
      </h3>

      {/* Channel Name */}
      <p className="mt-1 text-xs text-[var(--yt-text-secondary)]">
        {transcript.channel}
      </p>
      {transcript.playlistTitle && (
        <p className="mt-1 text-[11px] text-[var(--yt-text-muted)] line-clamp-1">
          {transcript.playlistTitle}
        </p>
      )}

      {/* Transcript Preview */}
      <p className="mt-2 text-xs text-[var(--yt-text-secondary)] leading-relaxed line-clamp-3 max-h-[80px] overflow-hidden">
        {transcript.preview}
      </p>

      {/* Actions Row */}
      <div className="mt-3 flex items-center justify-between">
        {/* Language Tag */}
        <span className="inline-block rounded-full bg-[var(--yt-bg-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--yt-text-secondary)]">
          {LANGUAGE_LABELS[transcript.language] || transcript.language}
        </span>

        {/* Export Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setExportOpen(!exportOpen)}
            className="
              h-7 px-3 bg-[var(--yt-bg-card)] border border-[var(--yt-border)] rounded-md
              text-xs font-medium text-[var(--yt-text-primary)]
              hover:border-[#1683ff] hover:text-[#1683ff]
              transition-colors cursor-pointer
            "
            aria-label="Export transcript"
          >
            <span className="flex items-center gap-1">
              Export
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>

          {exportOpen && (
            <div className="absolute right-0 top-full mt-1 bg-[var(--yt-bg-card)] border border-[var(--yt-border)] rounded-lg shadow-[var(--yt-shadow-float)] py-1 min-w-[140px] z-10">
              <button
                onClick={handleExportTxt}
                className="block w-full text-left px-4 py-2 text-sm text-[var(--yt-text-secondary)] hover:bg-[var(--yt-bg-subtle)] hover:text-[var(--yt-text-primary)] transition-colors cursor-pointer"
                aria-label="Export transcript as text file"
              >
                Export as .txt
              </button>
              <button
                onClick={handleExportSrt}
                className="block w-full text-left px-4 py-2 text-sm text-[var(--yt-text-secondary)] hover:bg-[var(--yt-bg-subtle)] hover:text-[var(--yt-text-primary)] transition-colors cursor-pointer"
                aria-label="Export transcript as SRT file"
              >
                Export as .srt
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
