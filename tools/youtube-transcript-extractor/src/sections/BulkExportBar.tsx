import { useState } from 'react';
import type { Transcript } from '@/types';
import { TranscriptService, downloadFile } from '@/services/TranscriptService';

interface BulkExportBarProps {
  transcripts: Transcript[];
  format: 'txt' | 'srt';
  includeIndexInTitles: boolean;
}

const service = new TranscriptService();

export default function BulkExportBar({ transcripts, format, includeIndexInTitles }: BulkExportBarProps) {
  const [isExporting, setIsExporting] = useState(false);

  if (transcripts.length === 0) return null;

  const handleExportTxt = () => {
    transcripts.forEach((t) => {
      const blob = service.exportAsTxt(t);
      downloadFile(blob, service.getFilename(t, 'txt', includeIndexInTitles));
    });
  };

  const handleExportSrt = () => {
    transcripts.forEach((t) => {
      const blob = service.exportAsSrt(t);
      downloadFile(blob, service.getFilename(t, 'srt', includeIndexInTitles));
    });
  };

  const handleExportZip = async (format: 'txt' | 'srt') => {
    setIsExporting(true);
    try {
      const blob = await service.exportAsZip(transcripts, format, includeIndexInTitles);
      downloadFile(blob, service.getArchiveName(format));
    } catch (err) {
      console.error('Failed to create ZIP:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="sticky bottom-0 z-40 bg-[var(--yt-bg-card)] border-t border-[var(--yt-border)] shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
      <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
        {/* Left: Count */}
        <span className="text-sm text-[var(--yt-text-secondary)]">
          {transcripts.length} transcript{transcripts.length !== 1 ? 's' : ''} extracted
        </span>

        {/* Right: Export Buttons */}
        <div className="flex items-center gap-2">
          {/* Export All .txt */}
          <button
            onClick={handleExportTxt}
            className="
              hidden sm:flex h-9 px-4 bg-[var(--yt-bg-card)] border border-[var(--yt-border)] rounded-lg
              text-[13px] font-medium text-[var(--yt-text-primary)]
              hover:border-[#1677FF] hover:text-[#1677FF]
              transition-colors cursor-pointer
            "
            aria-label="Export all transcripts as text files"
          >
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              .txt
            </span>
          </button>

          {/* Export All .srt */}
          <button
            onClick={handleExportSrt}
            className="
              hidden sm:flex h-9 px-4 bg-[var(--yt-bg-card)] border border-[var(--yt-border)] rounded-lg
              text-[13px] font-medium text-[var(--yt-text-primary)]
              hover:border-[#1677FF] hover:text-[#1677FF]
              transition-colors cursor-pointer
            "
            aria-label="Export all transcripts as SRT files"
          >
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              .srt
            </span>
          </button>

          {/* Export All .zip */}
          <button
            onClick={() => handleExportZip(format)}
            disabled={isExporting}
            className={`
              h-9 px-4 rounded-lg text-[13px] font-medium text-white
              transition-colors cursor-pointer
              ${isExporting
                ? 'bg-[#4096FF] cursor-not-allowed'
                : 'bg-[#1677FF] hover:bg-[#4096FF] active:bg-[#0958D9]'
              }
            `}
            aria-label="Export all transcripts as ZIP archive"
          >
            {isExporting ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Zipping...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span className="hidden sm:inline">Export ZIP ({format})</span>
                <span className="sm:hidden">.zip</span>
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
