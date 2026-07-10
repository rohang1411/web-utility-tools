import { Check, ClipboardCopy, Columns3, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PlaylistExport, PlaylistTableColumnId } from '@/types';

interface PlaylistTablePreviewProps {
  playlists: PlaylistExport[];
  selectedColumns: PlaylistTableColumnId[];
  onColumnsChange: (columns: PlaylistTableColumnId[]) => void;
}

interface ColumnDef {
  id: PlaylistTableColumnId;
  label: string;
  getValue: (playlist: PlaylistExport, video: PlaylistExport['videos'][number]) => string;
}

const COLUMNS: ColumnDef[] = [
  { id: 'playlist', label: 'Playlist', getValue: (playlist) => playlist.title },
  { id: 'playlistId', label: 'Playlist ID', getValue: (playlist) => playlist.id },
  { id: 'index', label: 'Index', getValue: (_playlist, video) => String(video.playlistIndex) },
  { id: 'title', label: 'Title', getValue: (_playlist, video) => video.title },
  { id: 'link', label: 'Link', getValue: (_playlist, video) => video.url },
  { id: 'channel', label: 'Channel', getValue: (_playlist, video) => video.channel },
  { id: 'transcript', label: 'Transcript', getValue: (_playlist, video) => video.transcript || video.transcriptError || '' },
];

function tsvCell(value: string): string {
  return value.replace(/\t/g, ' ').replace(/\r?\n/g, ' ').trim();
}

function toTsv(rows: string[][]): string {
  return rows.map((row) => row.map(tsvCell).join('\t')).join('\r\n');
}

function htmlCell(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toHtmlTable(rows: string[][]): string {
  if (!rows.length) return '<table></table>';
  const [headers, ...body] = rows;
  return [
    '<table>',
    '<thead><tr>',
    ...headers.map((header) => `<th>${htmlCell(header)}</th>`),
    '</tr></thead>',
    '<tbody>',
    ...body.map((row) => `<tr>${row.map((cell) => `<td>${htmlCell(cell)}</td>`).join('')}</tr>`),
    '</tbody>',
    '</table>',
  ].join('');
}

export default function PlaylistTablePreview({
  playlists,
  selectedColumns,
  onColumnsChange,
}: PlaylistTablePreviewProps) {
  const [copied, setCopied] = useState(false);
  const visibleColumns = COLUMNS.filter((column) => selectedColumns.includes(column.id));
  const rows = useMemo(() => {
    const headers = visibleColumns.map((column) => column.label);
    const body = playlists.flatMap((playlist) =>
      playlist.videos.map((video) =>
        visibleColumns.map((column) => column.getValue(playlist, video))
      )
    );
    return headers.length ? [headers, ...body] : [];
  }, [playlists, visibleColumns]);

  const totalVideos = playlists.reduce((sum, playlist) => sum + playlist.videos.length, 0);
  const warnings = playlists.filter((playlist) => !playlist.isComplete || playlist.warning);

  if (!playlists.length) return null;

  const handleToggleColumn = (columnId: PlaylistTableColumnId) => {
    if (selectedColumns.includes(columnId)) {
      const next = selectedColumns.filter((id) => id !== columnId);
      onColumnsChange(next.length ? next : selectedColumns);
      return;
    }
    onColumnsChange([...selectedColumns, columnId]);
  };

  const handleCopy = async () => {
    const plainText = toTsv(rows);
    const html = toHtmlTable(rows);

    if ('ClipboardItem' in window && navigator.clipboard.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ]);
    } else {
      await navigator.clipboard.writeText(plainText);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="bg-[var(--yt-bg-page)] px-5 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1180px] overflow-hidden rounded-lg border border-[var(--yt-border)] bg-[var(--yt-bg-card)] shadow-[var(--yt-shadow-card)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 border-b border-[var(--yt-border)] p-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--yt-text-primary)]">
              <Columns3 size={17} className="text-[var(--yt-success)]" />
              Video table
            </div>
            <p className="mt-1 text-sm text-[var(--yt-text-muted)]">
              {totalVideos} videos, {playlists.length} source{playlists.length === 1 ? '' : 's'}.
            </p>
          </div>

          <button
            onClick={handleCopy}
            disabled={!rows.length}
            className="yt-primary-action !min-h-10 !w-auto px-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? <Check size={16} /> : <ClipboardCopy size={16} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {warnings.length > 0 && (
          <div className="border-b border-[var(--yt-border)] bg-[var(--yt-error-bg)] px-5 py-3">
            {warnings.map((playlist) => (
              <div key={playlist.id} className="flex gap-2 text-sm text-[var(--yt-text-secondary)]">
                <TriangleAlert size={16} className="mt-0.5 flex-none" />
                <span>
                  {playlist.title}: captured {playlist.capturedVideoCount}
                  {playlist.expectedVideoCount ? ` of ${playlist.expectedVideoCount}` : ''} videos.
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="border-b border-[var(--yt-border)] p-4">
          <div className="flex flex-wrap gap-2">
            {COLUMNS.map((column) => {
              const active = selectedColumns.includes(column.id);
              return (
                <button
                  key={column.id}
                  onClick={() => handleToggleColumn(column.id)}
                  className={`yt-column-pill ${active ? 'is-active' : ''}`}
                >
                  {column.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="max-h-[520px] overflow-auto">
          <table className="min-w-full table-fixed text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--yt-bg-page)] text-xs uppercase tracking-[0.18em] text-[var(--yt-text-muted)]">
              <tr>
                {visibleColumns.map((column) => (
                  <th key={column.id} className="border-b border-[var(--yt-border)] px-4 py-3 font-semibold">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {playlists.flatMap((playlist) =>
                playlist.videos.map((video) => (
                  <tr key={`${playlist.id}-${video.playlistIndex}-${video.id}`} className="border-b border-[var(--yt-border)] hover:bg-[var(--yt-bg-subtle)]">
                    {visibleColumns.map((column) => (
                      <td
                        key={column.id}
                        className={`px-4 py-3 text-[var(--yt-text-secondary)] ${
                          column.id === 'transcript'
                            ? 'max-w-[520px] truncate'
                            : 'max-w-[360px] truncate'
                        }`}
                      >
                        {column.id === 'link' ? (
                          <a href={video.url} target="_blank" rel="noreferrer" className="text-[var(--yt-success)] hover:text-[var(--yt-text-primary)]">
                            {column.getValue(playlist, video)}
                          </a>
                        ) : (
                          column.getValue(playlist, video)
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
