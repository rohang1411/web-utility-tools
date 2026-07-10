import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
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

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
    <article className="group overflow-hidden rounded-lg border border-[var(--yt-border)] bg-[var(--yt-bg-card)] shadow-[var(--yt-shadow-card)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-[var(--yt-shadow-card-hover)]">
      <div className="aspect-video w-full overflow-hidden bg-[var(--yt-bg-subtle)]">
        <img
          src={transcript.thumbnail}
          alt={transcript.title}
          loading="lazy"
          className="h-full w-full object-cover opacity-[0.86] transition duration-500 group-hover:scale-[1.015] group-hover:opacity-100"
          onError={(event) => {
            (event.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--yt-text-muted)]">
              {LANGUAGE_LABELS[transcript.language] || transcript.language}
            </p>
            <h3 className="mt-2 line-clamp-2 text-base font-medium leading-snug text-[var(--yt-text-primary)]">
              {transcript.title}
            </h3>
          </div>

          <div className="relative flex-none" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setExportOpen((open) => !open)}
              className="yt-icon-button"
              aria-label="Export transcript"
              title="Export transcript"
            >
              <Download size={15} />
            </button>

            {exportOpen && (
              <div className="absolute right-0 top-full z-10 mt-2 min-w-[132px] rounded-lg border border-[var(--yt-border)] bg-[var(--yt-bg-page)] p-1 shadow-[var(--yt-shadow-float)]">
                <button
                  type="button"
                  onClick={handleExportTxt}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-[var(--yt-text-secondary)] transition hover:bg-[var(--yt-bg-subtle)] hover:text-[var(--yt-text-primary)]"
                  aria-label="Export transcript as text file"
                >
                  .txt
                  <ChevronDown size={13} className="-rotate-90" />
                </button>
                <button
                  type="button"
                  onClick={handleExportSrt}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-[var(--yt-text-secondary)] transition hover:bg-[var(--yt-bg-subtle)] hover:text-[var(--yt-text-primary)]"
                  aria-label="Export transcript as SRT file"
                >
                  .srt
                  <ChevronDown size={13} className="-rotate-90" />
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="mt-2 truncate text-xs text-[var(--yt-text-secondary)]">{transcript.channel}</p>
        {transcript.playlistTitle && (
          <p className="mt-1 line-clamp-1 text-[11px] text-[var(--yt-text-muted)]">
            {transcript.playlistTitle}
          </p>
        )}

        <p className="mt-4 line-clamp-3 text-xs leading-relaxed text-[var(--yt-text-secondary)]">
          {transcript.preview}
        </p>
      </div>
    </article>
  );
}
