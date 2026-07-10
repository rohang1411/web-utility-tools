import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Check,
  ChevronDown,
  Clipboard,
  Download,
  FileText,
  Languages,
  LayoutList,
  Loader2,
  Minus,
  Plus,
  Rows3,
  Table2,
} from 'lucide-react';
import { LANGUAGE_OPTIONS } from '@/types';
import type {
  JobProgress,
  LanguageCode,
  PlaylistExportFormat,
  PlaylistTableColumnId,
  TranscriptFormat,
} from '@/types';

interface HeroSectionProps {
  url: string;
  language: LanguageCode;
  format: TranscriptFormat;
  playlistExportFormat: PlaylistExportFormat;
  playlistTableColumns: PlaylistTableColumnId[];
  includeIndexInTitles: boolean;
  isLoading: boolean;
  isPlaylistExporting: boolean;
  extractProgress: JobProgress | null;
  playlistExportProgress: JobProgress | null;
  onUrlChange: (url: string) => void;
  onLanguageChange: (lang: LanguageCode) => void;
  onFormatChange: (format: TranscriptFormat) => void;
  onPlaylistExportFormatChange: (format: PlaylistExportFormat) => void;
  onPlaylistTableColumnsChange: (columns: PlaylistTableColumnId[]) => void;
  onIncludeIndexInTitlesChange: (enabled: boolean) => void;
  onExtract: () => void;
  onPlaylistExport: () => void;
}

type InputMode = 'rows' | 'bulk';

const PLAYLIST_COLUMN_OPTIONS: Array<{ id: PlaylistTableColumnId; label: string }> = [
  { id: 'playlist', label: 'Playlist' },
  { id: 'playlistId', label: 'Playlist ID' },
  { id: 'index', label: 'Index' },
  { id: 'title', label: 'Title' },
  { id: 'link', label: 'Link' },
  { id: 'channel', label: 'Channel' },
  { id: 'transcript', label: 'Transcript' },
];

const SAMPLE_PLAYLIST = 'https://www.youtube.com/playlist?list=PLQltO7RlbjPJnbfHLsFJWP-DYnWPugUZ7';
const SAMPLE_VIDEO = 'https://www.youtube.com/watch?v=Lp7E973zozc';

function splitLinks(value: string): string[] {
  const parts = value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return parts.length ? parts : [''];
}

function rowsToValue(rows: string[]): string {
  return rows.map((row) => row.trim()).filter(Boolean).join('\n');
}

function ProgressLine({ progress, active }: { progress: JobProgress | null; active: boolean }) {
  if (!active && !progress) return null;

  const processed = progress?.processed ?? 0;
  const total = progress?.total;
  const percentage = total ? Math.min(100, Math.round((processed / total) * 100)) : 16;
  const detail = progress?.currentTitle || progress?.playlistTitle || progress?.message || 'Working';

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-[var(--yt-control-border)] bg-[var(--yt-control-bg)] p-1">
      <div className="rounded-md bg-[var(--yt-field-bg)] px-4 py-3">
        <div className="flex items-center justify-between gap-4 text-[11px] text-[var(--yt-control-muted)]">
          <span className="font-medium text-[var(--yt-text-primary)]">{progress?.phase || 'Starting'}</span>
          <span>{total ? `${processed}/${total}` : `${processed}`}</span>
        </div>
        <div className="yt-progress-track mt-3">
          <div
            className={`yt-progress-fill ${total ? '' : 'is-indeterminate'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="mt-3 truncate text-[12px] text-[var(--yt-text-muted)]">{detail}</p>
      </div>
    </div>
  );
}

function SelectControl({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const selectOption = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div className={`yt-select-shell ${open ? 'is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="yt-select-trigger"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
          if (event.key === 'ArrowDown') setOpen(true);
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
      >
        <span>{selected?.label || value}</span>
      </button>
      <ChevronDown size={16} aria-hidden="true" />
      {open && (
        <div className="yt-select-menu" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              type="button"
              key={option.value}
              className={`yt-select-option ${option.value === value ? 'is-selected' : ''}`}
              onClick={() => selectOption(option.value)}
              role="option"
              aria-selected={option.value === value}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IconButton({
  label,
  children,
  onClick,
  disabled = false,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="yt-icon-button"
    >
      {children}
    </button>
  );
}

export default function HeroSection({
  url,
  language,
  format,
  playlistExportFormat,
  playlistTableColumns,
  includeIndexInTitles,
  isLoading,
  isPlaylistExporting,
  extractProgress,
  playlistExportProgress,
  onUrlChange,
  onLanguageChange,
  onFormatChange,
  onPlaylistExportFormatChange,
  onPlaylistTableColumnsChange,
  onIncludeIndexInTitlesChange,
  onExtract,
  onPlaylistExport,
}: HeroSectionProps) {
  const [inputMode, setInputMode] = useState<InputMode>('rows');
  const [linkRows, setLinkRows] = useState<string[]>(() => splitLinks(url));
  const [removingRows, setRemovingRows] = useState<number[]>([]);

  const activeLinkCount = useMemo(
    () => url.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean).length,
    [url]
  );

  const syncRows = (rows: string[]) => {
    setLinkRows(rows);
    onUrlChange(rowsToValue(rows));
  };

  const handleModeChange = (mode: InputMode) => {
    setInputMode(mode);
    if (mode === 'rows') {
      const rows = splitLinks(url);
      setLinkRows(rows);
      onUrlChange(rowsToValue(rows));
    }
  };

  const updateRow = (index: number, value: string) => {
    const next = [...linkRows];
    next[index] = value;
    syncRows(next);
  };

  const addRow = () => {
    syncRows([...linkRows, '']);
  };

  const removeRow = (index: number) => {
    if (removingRows.includes(index)) return;
    setRemovingRows((rows) => [...rows, index]);
    window.setTimeout(() => {
      setRemovingRows((rows) => rows.filter((row) => row !== index));
      const next = linkRows.filter((_, itemIndex) => itemIndex !== index);
      syncRows(next.length ? next : ['']);
    }, 210);
  };

  const insertSamplePlaylist = () => {
    if (inputMode === 'bulk') {
      onUrlChange(url.trim() ? `${url.trim()}, ${SAMPLE_PLAYLIST}` : SAMPLE_PLAYLIST);
      return;
    }
    const next = linkRows.length === 1 && !linkRows[0].trim()
      ? [SAMPLE_PLAYLIST]
      : [...linkRows, SAMPLE_PLAYLIST];
    syncRows(next);
  };

  const insertSampleVideo = () => {
    if (inputMode === 'bulk') {
      onUrlChange(url.trim() ? `${url.trim()}, ${SAMPLE_VIDEO}` : SAMPLE_VIDEO);
      return;
    }
    const next = linkRows.length === 1 && !linkRows[0].trim()
      ? [SAMPLE_VIDEO]
      : [...linkRows, SAMPLE_VIDEO];
    syncRows(next);
  };

  const togglePlaylistColumn = (columnId: PlaylistTableColumnId) => {
    if (playlistTableColumns.includes(columnId)) {
      const next = playlistTableColumns.filter((id) => id !== columnId);
      onPlaylistTableColumnsChange(next.length ? next : playlistTableColumns);
      return;
    }
    onPlaylistTableColumnsChange([...playlistTableColumns, columnId]);
  };

  const fetchesTranscripts = playlistTableColumns.includes('transcript');

  return (
    <section id="home" className="relative isolate overflow-hidden bg-[var(--yt-bg-page)] px-5 pb-10 pt-5 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--yt-border)] to-transparent" />
      <div className="mx-auto grid max-w-[1180px] gap-5 lg:grid-cols-[minmax(0,1.16fr)_minmax(360px,0.84fr)]">
        <div className="yt-panel min-h-[520px] p-5 sm:min-h-[560px] sm:p-6 lg:p-8">
          <div className="flex min-h-full flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.42em] text-[var(--yt-text-muted)]">YouTube</p>
                <h1 className="mt-3 max-w-[760px] text-6xl font-semibold leading-[0.88] text-[var(--yt-text-primary)] sm:text-7xl lg:text-8xl">
                  Extract.
                </h1>
              </div>

              <div className="hidden rounded-full border border-[var(--yt-control-border)] bg-[var(--yt-control-bg)] px-3 py-2 text-[11px] text-[var(--yt-control-muted)] sm:block">
                {activeLinkCount} link{activeLinkCount === 1 ? '' : 's'}
              </div>
            </div>

            <div className="mt-auto pt-10">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="yt-segmented" aria-label="Playlist input mode">
                  <button
                    type="button"
                    onClick={() => handleModeChange('rows')}
                    className={inputMode === 'rows' ? 'is-active' : ''}
                    aria-pressed={inputMode === 'rows'}
                  >
                    <Rows3 size={15} />
                    Rows
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange('bulk')}
                    className={inputMode === 'bulk' ? 'is-active' : ''}
                    aria-pressed={inputMode === 'bulk'}
                  >
                    <Clipboard size={15} />
                    Paste
                  </button>
                </div>

                <div className="hidden items-center gap-2 sm:flex">
                  <IconButton label="Insert sample playlist" onClick={insertSamplePlaylist}>
                    <LayoutList size={16} />
                  </IconButton>
                  <IconButton label="Insert sample video" onClick={insertSampleVideo}>
                    <FileText size={16} />
                  </IconButton>
                </div>
              </div>

              {inputMode === 'rows' ? (
                <div className="space-y-2">
                  {linkRows.map((link, index) => (
                    <div
                      key={`${index}-${linkRows.length}`}
                      className={`yt-link-row ${removingRows.includes(index) ? 'is-removing' : ''}`}
                    >
                      <div className="flex h-12 w-10 shrink-0 items-center justify-center text-[12px] text-[var(--yt-control-muted)]">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <input
                        value={link}
                        onChange={(event) => updateRow(index, event.target.value)}
                        placeholder="https://www.youtube.com/watch?v=... or playlist?list=..."
                        className="min-w-0 flex-1 bg-transparent px-1 text-[14px] text-[var(--yt-field-text)] outline-none placeholder:text-[var(--yt-field-placeholder)]"
                      />
                      <IconButton
                        label={linkRows.length === 1 ? 'Clear YouTube link' : 'Remove YouTube link'}
                        onClick={() => (linkRows.length === 1 ? updateRow(index, '') : removeRow(index))}
                      >
                        <Minus size={15} />
                      </IconButton>
                    </div>
                  ))}

                  <button type="button" onClick={addRow} className="yt-add-row">
                    <Plus size={16} />
                    <span>Add link</span>
                  </button>
                </div>
              ) : (
                <textarea
                  value={url}
                  onChange={(event) => onUrlChange(event.target.value)}
                  placeholder="video link, playlist link, video link"
                  className="h-[236px] w-full resize-y rounded-lg border border-[var(--yt-control-border)] bg-[var(--yt-field-bg)] p-5 font-mono text-[13px] leading-7 text-[var(--yt-field-text)] outline-none transition placeholder:text-[var(--yt-field-placeholder)] focus:border-[var(--yt-control-border-strong)] focus:bg-[var(--yt-field-bg-focus)]"
                />
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          <div className="yt-panel p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="yt-mark"><FileText size={17} /></span>
                <span className="text-sm font-medium text-[var(--yt-text-primary)]">Transcripts</span>
              </div>
              <Download size={17} className="text-[var(--yt-text-muted)]" />
            </div>

            <label className="yt-field">
              <span><Languages size={14} /> Language</span>
              <SelectControl
                value={language}
                label="Transcript language"
                onChange={(value) => onLanguageChange(value as LanguageCode)}
                options={LANGUAGE_OPTIONS.map((option) => ({
                  value: option.code,
                  label: option.label,
                }))}
              />
            </label>

            <div className="mt-3">
              <span className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-[var(--yt-text-muted)]">Format</span>
              <div className="yt-segmented w-full">
                {(['txt', 'srt'] as TranscriptFormat[]).map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => onFormatChange(item)}
                    className={format === item ? 'is-active' : ''}
                    aria-pressed={format === item}
                  >
                    .{item}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={onExtract}
              disabled={isLoading || isPlaylistExporting}
              className="yt-primary-action mt-5"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              <span>{isLoading ? 'Extracting' : 'Export Transcripts as separate files'}</span>
            </button>

            <ProgressLine progress={extractProgress} active={isLoading} />
          </div>

          <div className="yt-panel p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="yt-mark"><Table2 size={17} /></span>
                <span className="text-sm font-medium text-[var(--yt-text-primary)]">Video table</span>
              </div>
              <span className="text-[11px] text-[var(--yt-text-muted)]">
                {fetchesTranscripts ? 'with transcripts' : 'links only'}
              </span>
            </div>

            <label className="yt-field">
              <span><Table2 size={14} /> File</span>
              <SelectControl
                value={playlistExportFormat}
                label="Video table file format"
                onChange={(value) => onPlaylistExportFormatChange(value as PlaylistExportFormat)}
                options={[
                  { value: 'md', label: 'Markdown' },
                  { value: 'csv', label: 'CSV' },
                  { value: 'xlsx', label: 'Excel' },
                ]}
              />
            </label>

            <div className="mt-3">
              <span className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-[var(--yt-text-muted)]">Columns</span>
              <div className="flex flex-wrap gap-2">
                {PLAYLIST_COLUMN_OPTIONS.map((column) => {
                  const active = playlistTableColumns.includes(column.id);
                  return (
                    <button
                      type="button"
                      key={column.id}
                      onClick={() => togglePlaylistColumn(column.id)}
                      className={`yt-column-pill ${active ? 'is-active' : ''}`}
                    >
                      {column.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="yt-switch-row mt-3">
              <span>Number titles</span>
              <input
                type="checkbox"
                checked={includeIndexInTitles}
                onChange={(event) => onIncludeIndexInTitlesChange(event.target.checked)}
              />
              <span className="yt-switch" aria-hidden="true">
                <span />
              </span>
            </label>

            <button
              type="button"
              onClick={onPlaylistExport}
              disabled={isPlaylistExporting || isLoading}
              className="yt-secondary-action mt-5"
            >
              {isPlaylistExporting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              <span>{isPlaylistExporting ? 'Preparing' : 'Export table'}</span>
            </button>

            <ProgressLine progress={playlistExportProgress} active={isPlaylistExporting} />
          </div>
        </div>
      </div>
    </section>
  );
}
