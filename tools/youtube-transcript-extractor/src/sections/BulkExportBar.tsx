import { useState } from 'react';
import { Archive, Download, FileText, Loader2 } from 'lucide-react';
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
    transcripts.forEach((transcript) => {
      const blob = service.exportAsTxt(transcript);
      downloadFile(blob, service.getFilename(transcript, 'txt', includeIndexInTitles));
    });
  };

  const handleExportSrt = () => {
    transcripts.forEach((transcript) => {
      const blob = service.exportAsSrt(transcript);
      downloadFile(blob, service.getFilename(transcript, 'srt', includeIndexInTitles));
    });
  };

  const handleExportZip = async (exportFormat: 'txt' | 'srt') => {
    setIsExporting(true);
    try {
      const blob = await service.exportAsZip(transcripts, exportFormat, includeIndexInTitles);
      downloadFile(blob, service.getArchiveName(exportFormat));
    } catch (err) {
      console.error('Failed to create ZIP:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="sticky bottom-0 z-40 border-t border-[var(--yt-border)] bg-[var(--yt-bg-page)] backdrop-blur-2xl">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-[12px] text-[var(--yt-text-secondary)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--yt-success)]" />
          {transcripts.length} ready
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportTxt}
            className="yt-icon-button hidden sm:inline-flex"
            aria-label="Export all transcripts as text files"
            title="Export .txt"
          >
            <FileText size={15} />
          </button>

          <button
            type="button"
            onClick={handleExportSrt}
            className="yt-icon-button hidden sm:inline-flex"
            aria-label="Export all transcripts as SRT files"
            title="Export .srt"
          >
            <Download size={15} />
          </button>

          <button
            type="button"
            onClick={() => handleExportZip(format)}
            disabled={isExporting}
            className="yt-secondary-action !min-h-9 !w-auto px-4"
            aria-label="Export all transcripts as ZIP archive"
          >
            {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Archive size={15} />}
            {isExporting ? 'Zipping' : `ZIP .${format}`}
          </button>
        </div>
      </div>
    </div>
  );
}
