import { useReducer, useCallback } from 'react';
import type {
  AppState,
  AppAction,
  JobProgress,
  LanguageCode,
  PlaylistExport,
  PlaylistExportFormat,
  PlaylistTableColumnId,
  Transcript,
  TranscriptFormat,
} from '@/types';

const DEFAULT_PLAYLIST_COLUMNS: PlaylistTableColumnId[] = ['playlist', 'index', 'title', 'link', 'channel'];

const initialState: AppState = {
  url: '',
  language: 'en',
  format: 'txt',
  playlistExportFormat: 'xlsx',
  includeIndexInTitles: false,
  isLoading: false,
  isPlaylistExporting: false,
  extractProgress: null,
  playlistExportProgress: null,
  transcripts: [],
  playlistExports: [],
  playlistTableColumns: DEFAULT_PLAYLIST_COLUMNS,
  error: null,
  playlistExportMessage: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_URL':
      return { ...state, url: action.payload, error: null, playlistExportMessage: null };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'SET_FORMAT':
      return { ...state, format: action.payload };
    case 'SET_PLAYLIST_EXPORT_FORMAT':
      return { ...state, playlistExportFormat: action.payload };
    case 'SET_INCLUDE_INDEX_IN_TITLES':
      return { ...state, includeIndexInTitles: action.payload };
    case 'EXTRACT_START':
      return {
        ...state,
        isLoading: true,
        extractProgress: {
          phase: 'Starting',
          message: 'Preparing transcript extraction...',
          processed: 0,
          total: null,
        },
        error: null,
        playlistExportMessage: null,
      };
    case 'EXTRACT_PROGRESS':
      return { ...state, extractProgress: action.payload };
    case 'EXTRACT_SUCCESS':
      return { ...state, isLoading: false, transcripts: action.payload, error: null };
    case 'EXTRACT_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'PLAYLIST_EXPORT_START':
      return {
        ...state,
        isPlaylistExporting: true,
        playlistExportProgress: {
          phase: 'Starting',
          message: 'Preparing video table export...',
          processed: 0,
          total: null,
        },
        error: null,
        playlistExportMessage: null,
      };
    case 'PLAYLIST_EXPORT_PROGRESS':
      return { ...state, playlistExportProgress: action.payload };
    case 'PLAYLIST_EXPORT_SUCCESS':
      return {
        ...state,
        isPlaylistExporting: false,
        playlistExportMessage: action.payload.message,
        playlistExports: action.payload.playlists,
      };
    case 'PLAYLIST_EXPORT_ERROR':
      return { ...state, isPlaylistExporting: false, error: action.payload };
    case 'SET_PLAYLIST_TABLE_COLUMNS':
      return { ...state, playlistTableColumns: action.payload };
    case 'CLEAR_TRANSCRIPTS':
      return { ...state, transcripts: [] };
    default:
      return state;
  }
}

export function useAppState() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const setUrl = useCallback((url: string) => dispatch({ type: 'SET_URL', payload: url }), []);
  const setLanguage = useCallback((lang: LanguageCode) => dispatch({ type: 'SET_LANGUAGE', payload: lang }), []);
  const setFormat = useCallback((format: TranscriptFormat) => dispatch({ type: 'SET_FORMAT', payload: format }), []);
  const setPlaylistExportFormat = useCallback((format: PlaylistExportFormat) => dispatch({ type: 'SET_PLAYLIST_EXPORT_FORMAT', payload: format }), []);
  const setIncludeIndexInTitles = useCallback((enabled: boolean) => dispatch({ type: 'SET_INCLUDE_INDEX_IN_TITLES', payload: enabled }), []);
  const startExtract = useCallback(() => dispatch({ type: 'EXTRACT_START' }), []);
  const extractProgress = useCallback((progress: JobProgress) => dispatch({ type: 'EXTRACT_PROGRESS', payload: progress }), []);
  const extractSuccess = useCallback((transcripts: Transcript[]) => dispatch({ type: 'EXTRACT_SUCCESS', payload: transcripts }), []);
  const extractError = useCallback((error: string) => dispatch({ type: 'EXTRACT_ERROR', payload: error }), []);
  const startPlaylistExport = useCallback(() => dispatch({ type: 'PLAYLIST_EXPORT_START' }), []);
  const playlistExportProgress = useCallback((progress: JobProgress) => dispatch({ type: 'PLAYLIST_EXPORT_PROGRESS', payload: progress }), []);
  const playlistExportSuccess = useCallback((message: string, playlists: PlaylistExport[]) => {
    dispatch({ type: 'PLAYLIST_EXPORT_SUCCESS', payload: { message, playlists } });
  }, []);
  const playlistExportError = useCallback((error: string) => dispatch({ type: 'PLAYLIST_EXPORT_ERROR', payload: error }), []);
  const setPlaylistTableColumns = useCallback((columns: PlaylistTableColumnId[]) => {
    dispatch({ type: 'SET_PLAYLIST_TABLE_COLUMNS', payload: columns });
  }, []);
  const clearTranscripts = useCallback(() => dispatch({ type: 'CLEAR_TRANSCRIPTS' }), []);

  return {
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
    clearTranscripts,
  };
}
