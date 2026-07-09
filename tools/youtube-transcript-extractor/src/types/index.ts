export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface Transcript {
  id: string;
  title: string;
  channel: string;
  language: string;
  preview: string;
  fullText: string;
  segments: TranscriptSegment[];
  thumbnail: string;
  format: 'txt' | 'srt';
  playlistId?: string;
  playlistTitle?: string;
  playlistIndex?: number;
}

export type LanguageCode = 'all' | 'ko' | 'en' | 'ja' | 'es';
export type TranscriptFormat = 'txt' | 'srt';
export type PlaylistExportFormat = 'md' | 'csv' | 'xlsx';

export interface PlaylistVideo {
  id: string;
  playlistIndex: number;
  title: string;
  url: string;
  channel: string;
  thumbnail?: string;
}

export interface PlaylistExport {
  id: string;
  title: string;
  expectedVideoCount: number | null;
  capturedVideoCount: number;
  isComplete: boolean;
  warning?: string | null;
  verificationMessage: string;
  videos: PlaylistVideo[];
}

export type PlaylistTableColumnId = 'playlist' | 'playlistId' | 'index' | 'title' | 'link' | 'channel';

export interface JobProgress {
  phase: string;
  message: string;
  processed: number;
  total: number | null;
  currentTitle?: string;
  playlistTitle?: string;
}

export interface JobState<T> {
  id: string;
  status: 'running' | 'complete' | 'error';
  progress: JobProgress;
  result: T | null;
  error: string | null;
}

export interface LanguageOption {
  code: LanguageCode;
  label: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'all', label: 'All Languages' },
  { code: 'ko', label: 'Korean' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: 'Japanese' },
  { code: 'es', label: 'Spanish' },
];

export type AppAction =
  | { type: 'SET_URL'; payload: string }
  | { type: 'SET_LANGUAGE'; payload: LanguageCode }
  | { type: 'SET_FORMAT'; payload: TranscriptFormat }
  | { type: 'SET_PLAYLIST_EXPORT_FORMAT'; payload: PlaylistExportFormat }
  | { type: 'SET_INCLUDE_INDEX_IN_TITLES'; payload: boolean }
  | { type: 'EXTRACT_START' }
  | { type: 'EXTRACT_PROGRESS'; payload: JobProgress }
  | { type: 'EXTRACT_SUCCESS'; payload: Transcript[] }
  | { type: 'EXTRACT_ERROR'; payload: string }
  | { type: 'PLAYLIST_EXPORT_START' }
  | { type: 'PLAYLIST_EXPORT_PROGRESS'; payload: JobProgress }
  | { type: 'PLAYLIST_EXPORT_SUCCESS'; payload: { message: string; playlists: PlaylistExport[] } }
  | { type: 'PLAYLIST_EXPORT_ERROR'; payload: string }
  | { type: 'SET_PLAYLIST_TABLE_COLUMNS'; payload: PlaylistTableColumnId[] }
  | { type: 'CLEAR_TRANSCRIPTS' };

export interface AppState {
  url: string;
  language: LanguageCode;
  format: TranscriptFormat;
  playlistExportFormat: PlaylistExportFormat;
  includeIndexInTitles: boolean;
  isLoading: boolean;
  isPlaylistExporting: boolean;
  extractProgress: JobProgress | null;
  playlistExportProgress: JobProgress | null;
  transcripts: Transcript[];
  playlistExports: PlaylistExport[];
  playlistTableColumns: PlaylistTableColumnId[];
  error: string | null;
  playlistExportMessage: string | null;
}
