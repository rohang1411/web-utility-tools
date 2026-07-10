import { useCallback } from 'react';
import NavBar from '@/sections/NavBar';
import HeroSection from '@/sections/HeroSection';
import PlaylistTablePreview from '@/sections/PlaylistTablePreview';
import TranscriptGrid from '@/sections/TranscriptGrid';
import BulkExportBar from '@/sections/BulkExportBar';
import { useAppState } from '@/hooks/useAppState';
import { TranscriptService, downloadFile } from '@/services/TranscriptService';
import type { LanguageCode, PlaylistExportFormat, TranscriptFormat } from '@/types';

const transcriptService = new TranscriptService();

export default function YoutubeTranscriptTool() {
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
      const includeTranscripts = state.playlistTableColumns.includes('transcript');
      const playlists = await transcriptService.fetchPlaylists(
        state.url,
        includeTranscripts,
        state.language,
        playlistExportProgress
      );
      const blob = await transcriptService.exportPlaylistTable(
        playlists,
        state.playlistExportFormat,
        state.playlistTableColumns,
        state.includeIndexInTitles
      );
      downloadFile(blob, transcriptService.getPlaylistExportName(state.playlistExportFormat));
      playlistExportSuccess(transcriptService.getPlaylistExportSummary(playlists), playlists);
    } catch (err) {
      playlistExportError(`Playlist link export failed: ${err instanceof Error ? err.message : 'An unexpected error occurred'}`);
    }
  }, [
    state.url,
    state.language,
    state.playlistExportFormat,
    state.playlistTableColumns,
    state.includeIndexInTitles,
    startPlaylistExport,
    playlistExportProgress,
    playlistExportSuccess,
    playlistExportError,
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--yt-bg-page)] text-[var(--yt-text-primary)]">
      <NavBar />

      <main className="flex-1">
        <HeroSection
          url={state.url}
          language={state.language}
          format={state.format}
          playlistExportFormat={state.playlistExportFormat}
          playlistTableColumns={state.playlistTableColumns}
          includeIndexInTitles={state.includeIndexInTitles}
          isLoading={state.isLoading}
          isPlaylistExporting={state.isPlaylistExporting}
          extractProgress={state.extractProgress}
          playlistExportProgress={state.playlistExportProgress}
          onUrlChange={setUrl}
          onLanguageChange={(lang: LanguageCode) => setLanguage(lang)}
          onFormatChange={(fmt: TranscriptFormat) => setFormat(fmt)}
          onPlaylistExportFormatChange={(fmt: PlaylistExportFormat) => setPlaylistExportFormat(fmt)}
          onPlaylistTableColumnsChange={setPlaylistTableColumns}
          onIncludeIndexInTitlesChange={setIncludeIndexInTitles}
          onExtract={handleExtract}
          onPlaylistExport={handlePlaylistExport}
        />

        {state.error && (
          <div className="px-5 py-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1180px]">
              <div className="rounded-lg border border-[var(--yt-error)] bg-[var(--yt-error-bg)] px-4 py-3">
                <span className="text-sm text-[var(--yt-text-primary)]">{state.error}</span>
              </div>
            </div>
          </div>
        )}

        {state.playlistExportMessage && (
          <div className="px-5 py-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1180px]">
              <div className="rounded-lg border border-[var(--yt-success)] bg-[var(--yt-success-bg)] px-4 py-3">
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

        <TranscriptGrid
          transcripts={state.transcripts}
          isLoading={state.isLoading}
          includeIndexInTitles={state.includeIndexInTitles}
        />
      </main>

      <BulkExportBar
        transcripts={state.transcripts}
        format={state.format}
        includeIndexInTitles={state.includeIndexInTitles}
      />
    </div>
  );
}
