import { CheckCircle2, Download, FileText, Link2, Loader2, Table2 } from 'lucide-react';
import { LANGUAGE_OPTIONS } from '@/types';
import type { JobProgress, LanguageCode, PlaylistExportFormat, TranscriptFormat } from '@/types';

interface HeroSectionProps {
  url: string;
  language: LanguageCode;
  format: TranscriptFormat;
  playlistExportFormat: PlaylistExportFormat;
  includeIndexInTitles: boolean;
  isLoading: boolean;
  isPlaylistExporting: boolean;
  extractProgress: JobProgress | null;
  playlistExportProgress: JobProgress | null;
  onUrlChange: (url: string) => void;
  onLanguageChange: (lang: LanguageCode) => void;
  onFormatChange: (format: TranscriptFormat) => void;
  onPlaylistExportFormatChange: (format: PlaylistExportFormat) => void;
  onIncludeIndexInTitlesChange: (enabled: boolean) => void;
  onExtract: () => void;
  onPlaylistExport: () => void;
}

function ProgressLine({ progress, active }: { progress: JobProgress | null; active: boolean }) {
  if (!active && !progress) return null;

  const processed = progress?.processed ?? 0;
  const total = progress?.total;
  const percentage = total ? Math.min(100, Math.round((processed / total) * 100)) : 8;

  return (
    <div className="mt-4 rounded-lg border border-[var(--yt-border)] bg-black p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium text-[var(--yt-text-primary)]">
          {progress?.phase || 'Starting'}
        </span>
        <span className="text-[var(--yt-text-secondary)]">
          {total ? `${processed} / ${total} videos processed` : `${processed} videos processed`}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--yt-bg-subtle)]">
        <div
          className={`h-full rounded-full bg-[#1683ff] transition-all duration-300 ${total ? '' : 'animate-pulse'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-2 truncate text-xs text-[var(--yt-text-muted)]">
        {progress?.currentTitle || progress?.playlistTitle || progress?.message || 'Working...'}
      </p>
    </div>
  );
}

export default function HeroSection({
  url,
  language,
  format,
  playlistExportFormat,
  includeIndexInTitles,
  isLoading,
  isPlaylistExporting,
  extractProgress,
  playlistExportProgress,
  onUrlChange,
  onLanguageChange,
  onFormatChange,
  onPlaylistExportFormatChange,
  onIncludeIndexInTitlesChange,
  onExtract,
  onPlaylistExport,
}: HeroSectionProps) {
  const handleSampleVideo = () => {
    onUrlChange('https://www.youtube.com/watch?v=Lp7E973zozc');
  };

  const handleSamplePlaylist = () => {
    onUrlChange('https://www.youtube.com/playlist?list=PLQltO7RlbjPJnbfHLsFJWP-DYnWPugUZ7');
  };

  return (
    <section id="home" className="bg-black px-6 py-8">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683ff]">
              YouTube batch workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Transcripts and playlist links, exported cleanly.
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[var(--yt-border)] bg-[var(--yt-bg-card)] px-3 py-2 text-xs text-[var(--yt-text-secondary)]">
            <CheckCircle2 size={14} className="text-[#40c463]" />
            Order is preserved with playlist indexes
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
          <div className="rounded-lg border border-[var(--yt-border)] bg-[var(--yt-bg-card)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Link2 size={17} className="text-[#1683ff]" />
                  Paste YouTube links here
                </div>
                <p className="mt-1 text-sm text-[var(--yt-text-secondary)]">
                  Add video links, playlist links, or multiple playlists. Use one per line for the cleanest batch.
                </p>
              </div>
            </div>

            <textarea
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder={'https://www.youtube.com/playlist?list=...\nhttps://youtu.be/...'}
              className="
                mt-4 h-[260px] w-full resize-y rounded-lg border border-[var(--yt-border)]
                bg-black p-4 font-mono text-[13px] leading-6 text-white outline-none
                placeholder:text-[var(--yt-text-placeholder)]
                focus:border-[#1683ff] focus:shadow-[0_0_0_2px_rgba(22,131,255,0.25)]
              "
            />

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={handleSamplePlaylist}
                className="text-xs font-medium text-[#1683ff] hover:text-[#69b1ff]"
              >
                Insert sample playlist
              </button>
              <button
                onClick={handleSampleVideo}
                className="text-xs font-medium text-[#1683ff] hover:text-[#69b1ff]"
              >
                Insert sample video
              </button>
            </div>
          </div>

          <div className="grid gap-5">
            <div className="rounded-lg border border-[var(--yt-border)] bg-[var(--yt-bg-card)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <FileText size={17} className="text-[#1683ff]" />
                    Transcript extractor
                  </div>
                  <p className="mt-1 text-sm text-[var(--yt-text-secondary)]">
                    Pull captions from videos or every video in a playlist.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <label className="block">
                  <span className="text-xs text-[var(--yt-text-secondary)]">Language</span>
                  <select
                    value={language}
                    onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
                    className="mt-1 h-10 w-full rounded-lg border border-[var(--yt-border)] bg-black px-3 text-sm text-white outline-none focus:border-[#1683ff]"
                  >
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <span className="text-xs text-[var(--yt-text-secondary)]">Download as</span>
                  <div className="mt-1 grid h-10 grid-cols-2 rounded-lg border border-[var(--yt-border)] bg-black p-1">
                    {(['txt', 'srt'] as TranscriptFormat[]).map((item) => (
                      <button
                        key={item}
                        onClick={() => onFormatChange(item)}
                        className={`rounded-md px-4 text-xs font-semibold transition-colors ${
                          format === item ? 'bg-[#1683ff] text-white' : 'text-[var(--yt-text-secondary)]'
                        }`}
                      >
                        .{item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={onExtract}
                disabled={isLoading || isPlaylistExporting}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1683ff] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4096ff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {isLoading ? 'Extracting transcripts' : 'Extract transcripts'}
              </button>

              <ProgressLine progress={extractProgress} active={isLoading} />
            </div>

            <div className="rounded-lg border border-[var(--yt-border)] bg-[var(--yt-bg-card)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Table2 size={17} className="text-[#1683ff]" />
                    Playlist links exporter
                  </div>
                  <p className="mt-1 text-sm text-[var(--yt-text-secondary)]">
                    Export playlist video titles and links as a formatted table.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <label className="block">
                  <span className="text-xs text-[var(--yt-text-secondary)]">Table format</span>
                  <select
                    value={playlistExportFormat}
                    onChange={(e) => onPlaylistExportFormatChange(e.target.value as PlaylistExportFormat)}
                    className="mt-1 h-10 w-full rounded-lg border border-[var(--yt-border)] bg-black px-3 text-sm text-white outline-none focus:border-[#1683ff]"
                  >
                    <option value="md">Markdown</option>
                    <option value="csv">CSV</option>
                    <option value="xlsx">Excel</option>
                  </select>
                </label>

                <label className="mt-5 flex h-10 items-center gap-2 rounded-lg border border-[var(--yt-border)] bg-black px-3 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={includeIndexInTitles}
                    onChange={(e) => onIncludeIndexInTitlesChange(e.target.checked)}
                    className="h-4 w-4 accent-[#1683ff]"
                  />
                  Number titles
                </label>
              </div>

              <button
                onClick={onPlaylistExport}
                disabled={isPlaylistExporting || isLoading}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-[#dcecff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPlaylistExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {isPlaylistExporting ? 'Preparing playlist links' : 'Download playlist links'}
              </button>

              <ProgressLine progress={playlistExportProgress} active={isPlaylistExporting} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
