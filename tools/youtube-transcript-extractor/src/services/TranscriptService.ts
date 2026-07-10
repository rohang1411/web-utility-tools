import type {
  JobProgress,
  JobState,
  LanguageCode,
  PlaylistExport,
  PlaylistExportFormat,
  PlaylistTableColumnId,
  Transcript,
  TranscriptFormat,
} from '@/types';

interface ExtractResponse {
  transcripts: Transcript[];
  skipped?: Array<{
    id?: string;
    title?: string;
    playlistTitle?: string;
    reason: string;
  }>;
}

interface PlaylistResponse {
  playlists: PlaylistExport[];
  skipped?: Array<{
    title?: string;
    reason: string;
  }>;
}

interface PlaylistColumnDef {
  id: PlaylistTableColumnId;
  label: string;
  getValue: (playlist: PlaylistExport, video: PlaylistExport['videos'][number], includeIndexInTitles: boolean) => string;
}

interface StartJobResponse {
  jobId: string;
}

const INVALID_PATH_CHARS = new RegExp(
  `[<>:"/\\\\|?*${String.fromCharCode(0)}-${String.fromCharCode(31)}]`,
  'g'
);

function splitInput(input: string): string[] {
  return input
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function sanitizePathPart(value: string, fallback: string): string {
  return (value || fallback)
    .replace(INVALID_PATH_CHARS, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 90) || fallback;
}

function uniquePath(path: string, usedPaths: Set<string>): string {
  if (!usedPaths.has(path)) {
    usedPaths.add(path);
    return path;
  }

  const dotIndex = path.lastIndexOf('.');
  const base = dotIndex === -1 ? path : path.slice(0, dotIndex);
  const ext = dotIndex === -1 ? '' : path.slice(dotIndex);
  let index = 2;

  while (usedPaths.has(`${base}_${index}${ext}`)) {
    index += 1;
  }

  const next = `${base}_${index}${ext}`;
  usedPaths.add(next);
  return next;
}

function prefixTitleWithIndex(title: string, index?: number): string {
  return index ? `${index}. ${title}` : title;
}

function markdownCell(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');
}

function csvCell(value: string | number | null | undefined): string {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

const PLAYLIST_COLUMNS: PlaylistColumnDef[] = [
  { id: 'playlist', label: 'Playlist', getValue: (playlist) => playlist.title },
  { id: 'playlistId', label: 'Playlist ID', getValue: (playlist) => playlist.id },
  { id: 'index', label: 'Index', getValue: (_playlist, video) => String(video.playlistIndex) },
  {
    id: 'title',
    label: 'Title',
    getValue: (_playlist, video, includeIndexInTitles) =>
      includeIndexInTitles ? prefixTitleWithIndex(video.title, video.playlistIndex) : video.title,
  },
  { id: 'link', label: 'Link', getValue: (_playlist, video) => video.url },
  { id: 'channel', label: 'Channel', getValue: (_playlist, video) => video.channel },
  {
    id: 'transcript',
    label: 'Transcript',
    getValue: (_playlist, video) => video.transcript || video.transcriptError || '',
  },
];

function normalisePlaylistColumns(columns: PlaylistTableColumnId[]): PlaylistTableColumnId[] {
  const unique = columns.filter((column, index) => columns.indexOf(column) === index);
  const allowed = new Set(PLAYLIST_COLUMNS.map((column) => column.id));
  const selected = unique.filter((column) => allowed.has(column));
  return selected.length ? selected : ['title', 'link'];
}

function xmlEscape(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xlsxCellValue(value: string | number | null | undefined): string {
  const text = String(value ?? '');
  const maxExcelCellLength = 32767;
  if (text.length <= maxExcelCellLength) return text;
  return `${text.slice(0, 32720)}\n[Transcript truncated for Excel cell limit. Use CSV for the full text.]`;
}

function columnName(index: number): string {
  let name = '';
  let current = index;

  while (current > 0) {
    const mod = (current - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    current = Math.floor((current - mod) / 26);
  }

  return name;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 20_000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)} seconds: ${url}`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function readJsonResponse<T>(response: Response, context: string): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();

  if (!contentType.includes('application/json')) {
    const preview = rawText.replace(/\s+/g, ' ').trim().slice(0, 220);
    throw new Error(
      `${context} returned ${response.status} ${response.statusText || ''} with ${contentType || 'no content-type'} instead of JSON.` +
      (preview ? ` Response started with: ${preview}` : '')
    );
  }

  try {
    return JSON.parse(rawText) as T;
  } catch (error) {
    throw new Error(
      `${context} returned invalid JSON: ${error instanceof Error ? error.message : 'parse failed'}`
    );
  }
}

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i += 1) {
  let value = i;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[i] = value >>> 0;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function getDosTimestamp() {
  const now = new Date();
  const year = Math.max(now.getFullYear(), 1980);
  const time =
    (now.getHours() << 11) |
    (now.getMinutes() << 5) |
    Math.floor(now.getSeconds() / 2);
  const date =
    ((year - 1980) << 9) |
    ((now.getMonth() + 1) << 5) |
    now.getDate();

  return { time, date };
}

async function createZipBlob(files: Array<{ path: string; blob: Blob }>): Promise<Blob> {
  const encoder = new TextEncoder();
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;
  const { time, date } = getDosTimestamp();

  for (const file of files) {
    const name = encoder.encode(file.path);
    const data = new Uint8Array(await file.blob.arrayBuffer());
    const crc = crc32(data);

    const localHeader = new Uint8Array(30 + name.length);
    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0x0800);
    writeUint16(localHeader, 8, 0);
    writeUint16(localHeader, 10, time);
    writeUint16(localHeader, 12, date);
    writeUint32(localHeader, 14, crc);
    writeUint32(localHeader, 18, data.length);
    writeUint32(localHeader, 22, data.length);
    writeUint16(localHeader, 26, name.length);
    localHeader.set(name, 30);

    const centralHeader = new Uint8Array(46 + name.length);
    writeUint32(centralHeader, 0, 0x02014b50);
    writeUint16(centralHeader, 4, 20);
    writeUint16(centralHeader, 6, 20);
    writeUint16(centralHeader, 8, 0x0800);
    writeUint16(centralHeader, 10, 0);
    writeUint16(centralHeader, 12, time);
    writeUint16(centralHeader, 14, date);
    writeUint32(centralHeader, 16, crc);
    writeUint32(centralHeader, 20, data.length);
    writeUint32(centralHeader, 24, data.length);
    writeUint16(centralHeader, 28, name.length);
    writeUint32(centralHeader, 42, offset);
    centralHeader.set(name, 46);

    localChunks.push(localHeader, data);
    centralChunks.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralSize = centralChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = new Uint8Array(22);
  writeUint32(end, 0, 0x06054b50);
  writeUint16(end, 8, files.length);
  writeUint16(end, 10, files.length);
  writeUint32(end, 12, centralSize);
  writeUint32(end, 16, offset);

  const parts = [...localChunks, ...centralChunks, end].map((chunk) => {
    const buffer = new ArrayBuffer(chunk.byteLength);
    new Uint8Array(buffer).set(chunk);
    return buffer;
  });

  return new Blob(parts, { type: 'application/zip' });
}

export class TranscriptService {
  async extract(
    input: string,
    language: LanguageCode,
    onProgress?: (progress: JobProgress) => void
  ): Promise<Transcript[]> {
    if (!input.trim()) {
      throw new Error('Please enter a YouTube video or playlist URL.');
    }

    const items = splitInput(input);
    if (!items.length) {
      throw new Error('Please enter at least one YouTube video or playlist URL.');
    }

    const data = await this.runJob<ExtractResponse>(
      '/api/extract/start',
      { input, language },
      onProgress
    );

    if (!data.transcripts?.length) {
      throw new Error('No transcripts were found for the supplied URL(s).');
    }

    return data.transcripts;
  }

  async fetchPlaylists(
    input: string,
    includeTranscripts: boolean,
    language: LanguageCode,
    onProgress?: (progress: JobProgress) => void
  ): Promise<PlaylistExport[]> {
    if (!input.trim()) {
      throw new Error('Please enter at least one YouTube video or playlist URL.');
    }

    const data = await this.runJob<PlaylistResponse>(
      '/api/playlists/start',
      { input, includeTranscripts, language },
      onProgress
    );

    if (!data.playlists?.length) {
      throw new Error('No YouTube videos were found for the supplied URL(s).');
    }

    return data.playlists;
  }

  private async runJob<T>(
    endpoint: string,
    payload: Record<string, unknown>,
    onProgress?: (progress: JobProgress) => void
  ): Promise<T> {
    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }, 20_000);

    const started = await readJsonResponse<Partial<StartJobResponse> & { error?: string }>(
      response,
      `Starting ${endpoint}`
    );
    if (!response.ok) {
      throw new Error(started.error || 'Failed to start job.');
    }

    if (!started.jobId) {
      throw new Error('Server did not return a job ID.');
    }

    let lastProgressKey = '';
    let lastProgressAt = Date.now();

    while (true) {
      await delay(450);
      const jobUrl = `/api/jobs/${encodeURIComponent(started.jobId)}`;
      const statusResponse = await fetchWithTimeout(jobUrl, {}, 20_000);
      const job = await readJsonResponse<JobState<T> & { error?: string }>(
        statusResponse,
        `Polling ${jobUrl}`
      );

      if (!statusResponse.ok) {
        throw new Error(job.error || 'Could not read job progress.');
      }

      onProgress?.(job.progress);
      const progressKey = JSON.stringify(job.progress);
      if (progressKey !== lastProgressKey) {
        lastProgressKey = progressKey;
        lastProgressAt = Date.now();
      } else if (Date.now() - lastProgressAt > 45_000) {
        throw new Error(
          `No progress update from server for 45 seconds while job ${started.jobId} was ${job.progress.phase}: ${job.progress.message}`
        );
      }

      if (job.status === 'complete') {
        if (!job.result) {
          throw new Error('Job completed without a result.');
        }
        return job.result;
      }

      if (job.status === 'error') {
        throw new Error(job.error || 'Job failed.');
      }
    }
  }

  parseUrl(url: string): { type: 'video' | 'playlist'; ids: string[] } | null {
    const trimmed = url.trim();

    const playlistMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (playlistMatch) {
      return { type: 'playlist', ids: [playlistMatch[1]] };
    }

    const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) {
      return { type: 'video', ids: [watchMatch[1]] };
    }

    const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) {
      return { type: 'video', ids: [shortMatch[1]] };
    }

    return null;
  }

  exportAsTxt(transcript: Transcript): Blob {
    return new Blob([transcript.fullText], { type: 'text/plain;charset=utf-8' });
  }

  exportAsSrt(transcript: Transcript): Blob {
    const srtContent = transcript.segments.map((seg, i) => {
      const start = this.formatTimestamp(seg.start);
      const end = this.formatTimestamp(seg.start + seg.duration);
      return `${i + 1}\n${start} --> ${end}\n${seg.text}\n`;
    }).join('\n');
    return new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
  }

  async exportAsZip(
    transcripts: Transcript[],
    format: TranscriptFormat,
    includeIndexInTitles = false
  ): Promise<Blob> {
    const usedPaths = new Set<string>();
    const files: Array<{ path: string; blob: Blob }> = [];

    transcripts.forEach((transcript) => {
      const blob = format === 'txt' ? this.exportAsTxt(transcript) : this.exportAsSrt(transcript);
      const folder = transcript.playlistTitle
        ? `${sanitizePathPart(transcript.playlistTitle, 'Playlist')}/`
        : '';
      const exportTitle = includeIndexInTitles
        ? prefixTitleWithIndex(transcript.title, transcript.playlistIndex)
        : transcript.title;
      const filename = `${sanitizePathPart(exportTitle, transcript.id)}.${format}`;
      const zipPath = uniquePath(`${folder}${filename}`, usedPaths);
      files.push({ path: zipPath, blob });
    });

    return createZipBlob(files);
  }

  getFilename(transcript: Transcript, format: TranscriptFormat, includeIndexInTitles = false): string {
    const exportTitle = includeIndexInTitles
      ? prefixTitleWithIndex(transcript.title, transcript.playlistIndex)
      : transcript.title;
    return `${sanitizePathPart(exportTitle, transcript.id)}.${format}`;
  }

  getArchiveName(format: TranscriptFormat): string {
    return `youtube_transcripts_${format}_${Date.now()}.zip`;
  }

  exportPlaylistTable(
    playlists: PlaylistExport[],
    format: PlaylistExportFormat,
    selectedColumns: PlaylistTableColumnId[],
    includeIndexInTitles: boolean
  ): Promise<Blob> | Blob {
    const rows = this.getPlaylistRows(playlists, selectedColumns, includeIndexInTitles);

    if (format === 'md') {
      return this.exportPlaylistMarkdown(playlists, rows);
    }

    if (format === 'csv') {
      return this.exportPlaylistCsv(rows);
    }

    return this.exportPlaylistXlsx(rows);
  }

  getPlaylistExportName(format: PlaylistExportFormat): string {
    return `youtube_video_table_${Date.now()}.${format}`;
  }

  getPlaylistExportSummary(playlists: PlaylistExport[]): string {
    const playlistCount = playlists.length;
    const videoCount = playlists.reduce((sum, playlist) => sum + playlist.videos.length, 0);
    const verifiedCount = playlists.filter((playlist) => playlist.isComplete).length;
    const partialCount = playlistCount - verifiedCount;

    const transcriptCount = playlists.reduce(
      (sum, playlist) => sum + playlist.videos.filter((video) => video.transcript).length,
      0
    );
    const transcriptText = transcriptCount
      ? ` with ${transcriptCount} transcript${transcriptCount === 1 ? '' : 's'}`
      : '';

    return `Downloaded ${videoCount} captured video link${videoCount === 1 ? '' : 's'}${transcriptText} from ${playlistCount} source${playlistCount === 1 ? '' : 's'} (${verifiedCount}/${playlistCount} verified complete${partialCount ? `, ${partialCount} partial` : ''}).`;
  }

  private getPlaylistRows(
    playlists: PlaylistExport[],
    selectedColumns: PlaylistTableColumnId[],
    includeIndexInTitles: boolean
  ): string[][] {
    const columns = normalisePlaylistColumns(selectedColumns)
      .map((columnId) => PLAYLIST_COLUMNS.find((column) => column.id === columnId))
      .filter((column): column is PlaylistColumnDef => Boolean(column));
    const headers = columns.map((column) => column.label);
    const rows = [headers];

    playlists.forEach((playlist) => {
      playlist.videos.forEach((video) => {
        rows.push(columns.map((column) => column.getValue(playlist, video, includeIndexInTitles)));
      });
    });

    return rows;
  }

  private exportPlaylistMarkdown(
    playlists: PlaylistExport[],
    rows: string[][]
  ): Blob {
    const headers = rows[0];
    const alignment = headers.map(() => '---');
    const body = rows.slice(1).map((row) => `| ${row.map(markdownCell).join(' | ')} |`);
    const summary = playlists.map((playlist) => {
      const expected = playlist.expectedVideoCount ?? playlist.capturedVideoCount;
      return `- ${playlist.title}: ${playlist.capturedVideoCount}/${expected} videos ${playlist.isComplete ? 'verified' : 'captured (partial)'}`;
    });
    const markdown = [
      '# YouTube Playlist Videos',
      '',
      ...summary,
      '',
      `| ${headers.map(markdownCell).join(' | ')} |`,
      `| ${alignment.join(' | ')} |`,
      ...body,
      '',
    ].join('\n');

    return new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  }

  private exportPlaylistCsv(rows: string[][]): Blob {
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
    return new Blob([csv], { type: 'text/csv;charset=utf-8' });
  }

  private async exportPlaylistXlsx(rows: string[][]): Promise<Blob> {
    const rowXml = rows.map((row, rowIndex) => {
      const style = rowIndex === 0 ? ' s="1"' : '';
      const cells = row.map((cell, cellIndex) => {
        const ref = `${columnName(cellIndex + 1)}${rowIndex + 1}`;
        return `<c r="${ref}" t="inlineStr"${style}><is><t>${xmlEscape(xlsxCellValue(cell))}</t></is></c>`;
      }).join('');

      return `<row r="${rowIndex + 1}">${cells}</row>`;
    }).join('');
    const lastColumn = columnName(rows[0]?.length || 1);
    const lastRow = Math.max(rows.length, 1);
    const widths = rows[0]?.map((header) => {
      if (header === 'Title' || header === 'Link') return 54;
      if (header === 'Transcript') return 72;
      if (header === 'Playlist') return 28;
      if (header === 'Index') return 10;
      if (header === 'Channel') return 24;
      return 22;
    }) || [24];
    const cols = widths.map((width, index) =>
      `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
    ).join('');
    const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${cols}</cols>
  <sheetData>${rowXml}</sheetData>
  <autoFilter ref="A1:${lastColumn}${lastRow}"/>
</worksheet>`;
    const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Playlist Videos" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1677FF"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
    const files = [
      {
        path: '[Content_Types].xml',
        blob: new Blob([`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`], { type: 'application/xml' }),
      },
      {
        path: '_rels/.rels',
        blob: new Blob([`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`], { type: 'application/xml' }),
      },
      {
        path: 'xl/_rels/workbook.xml.rels',
        blob: new Blob([`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`], { type: 'application/xml' }),
      },
      { path: 'xl/workbook.xml', blob: new Blob([workbook], { type: 'application/xml' }) },
      { path: 'xl/styles.xml', blob: new Blob([styles], { type: 'application/xml' }) },
      { path: 'xl/worksheets/sheet1.xml', blob: new Blob([sheet], { type: 'application/xml' }) },
    ];

    return createZipBlob(files);
  }

  private formatTimestamp(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }
}

export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
