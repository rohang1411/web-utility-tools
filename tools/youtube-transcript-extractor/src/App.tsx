import { useCallback, useEffect } from 'react';
import NavBar from '@/sections/NavBar';
import HeroSection from '@/sections/HeroSection';
import PlaylistTablePreview from '@/sections/PlaylistTablePreview';
import TranscriptGrid from '@/sections/TranscriptGrid';
import BulkExportBar from '@/sections/BulkExportBar';
import { useAppState } from '@/hooks/useAppState';
import { TranscriptService, downloadFile } from '@/services/TranscriptService';
import type { LanguageCode, PlaylistExportFormat, TranscriptFormat } from '@/types';

const transcriptService = new TranscriptService();

export default function App() {
  const {
    state,
    setUrl,
    setLanguage,
    setFormat,
    setPlaylistExportFormat,
    setIncludeIndexInTitles,
    startExtract,
    extractProgress,
    extractSuccess,
    extractError,
    startPlaylistExport,
    playlistExportProgress,
    playlistExportSuccess,
    playlistExportError,
    setPlaylistTableColumns,
  } = useAppState();

  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  const handleExtract = useCallback(async () => {
    startExtract();
    try {
      const transcripts = await transcriptService.extract(
        state.url,
        state.language,
        extractProgress
      );
      extractSuccess(transcripts);
    } catch (err) {
      extractError(`Transcript extraction failed: ${err instanceof Error ? err.message : 'An unexpected error occurred'}`);
    }
  }, [state.url, state.language, startExtract, extractProgress, extractSuccess, extractError]);

  const handlePlaylistExport = useCallback(async () => {
    startPlaylistExport();
    try {
      const playlists = await transcriptService.fetchPlaylists(state.url, playlistExportProgress);
      const blob = await transcriptService.exportPlaylistTable(
        playlists,
        state.playlistExportFormat,
        state.includeIndexInTitles
      );
      downloadFile(blob, transcriptService.getPlaylistExportName(state.playlistExportFormat));
      playlistExportSuccess(transcriptService.getPlaylistExportSummary(playlists), playlists);
    } catch (err) {
      playlistExportError(`Playlist link export failed: ${err instanceof Error ? err.message : 'An unexpected error occurred'}`);
    }
  }, [
    state.url,
    state.playlistExportFormat,
    state.includeIndexInTitles,
    startPlaylistExport,
    playlistExportProgress,
    playlistExportSuccess,
    playlistExportError,
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--yt-bg-page)] text-[var(--yt-text-primary)]">
      {/* Navigation */}
      <NavBar />

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero / Input Section */}
        <HeroSection
          url={state.url}
          language={state.language}
          format={state.format}
          playlistExportFormat={state.playlistExportFormat}
          includeIndexInTitles={state.includeIndexInTitles}
          isLoading={state.isLoading}
          isPlaylistExporting={state.isPlaylistExporting}
          extractProgress={state.extractProgress}
          playlistExportProgress={state.playlistExportProgress}
          onUrlChange={setUrl}
          onLanguageChange={(lang: LanguageCode) => setLanguage(lang)}
          onFormatChange={(fmt: TranscriptFormat) => setFormat(fmt)}
          onPlaylistExportFormatChange={(fmt: PlaylistExportFormat) => setPlaylistExportFormat(fmt)}
          onIncludeIndexInTitlesChange={setIncludeIndexInTitles}
          onExtract={handleExtract}
          onPlaylistExport={handlePlaylistExport}
        />

        {/* Error Message */}
        {state.error && (
          <div className="px-6 py-4">
            <div className="mx-auto max-w-[1180px]">
              <div className="flex items-center gap-3 bg-[var(--yt-error-bg)] border-l-[3px] border-[var(--yt-error)] rounded-r-lg px-4 py-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--yt-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span className="text-sm text-[var(--yt-text-primary)]">{state.error}</span>
              </div>
            </div>
          </div>
        )}

        {state.playlistExportMessage && (
          <div className="px-6 py-4">
            <div className="mx-auto max-w-[1180px]">
              <div className="flex items-center gap-3 bg-[var(--yt-success-bg)] border-l-[3px] border-[var(--yt-success)] rounded-r-lg px-4 py-3">
                <span className="text-sm text-[var(--yt-text-primary)]">{state.playlistExportMessage}</span>
              </div>
            </div>
          </div>
        )}

        <PlaylistTablePreview
          playlists={state.playlistExports}
          selectedColumns={state.playlistTableColumns}
          onColumnsChange={setPlaylistTableColumns}
        />

        {/* Transcript Cards Grid */}
        <TranscriptGrid
          transcripts={state.transcripts}
          isLoading={state.isLoading}
          includeIndexInTitles={state.includeIndexInTitles}
        />
      </main>

      {/* Bulk Export Bar (sticky) */}
      <BulkExportBar
        transcripts={state.transcripts}
        format={state.format}
        includeIndexInTitles={state.includeIndexInTitles}
      />
    </div>
  );
}
