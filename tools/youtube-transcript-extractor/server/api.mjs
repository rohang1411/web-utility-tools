import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const distRoot = path.join(appRoot, 'dist');
const port = Number(process.env.API_PORT || process.env.PORT || 8787);
const userAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const jobs = new Map();

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
  });
  res.end(body);
}

function sendOptions(res) {
  res.writeHead(204, {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end();
}

function updateJob(jobId, patch) {
  const job = jobs.get(jobId);
  if (!job) return;
  jobs.set(jobId, { ...job, ...patch, updatedAt: Date.now() });
}

function updateJobProgress(jobId, progress) {
  updateJob(jobId, { progress: { ...jobs.get(jobId)?.progress, ...progress } });
}

function formatError(error) {
  if (error?.name === 'AbortError') {
    return 'Request timed out while contacting YouTube. Please try again, or split very large playlists into smaller batches.';
  }
  return error instanceof Error ? error.message : 'Unexpected server error.';
}

function startJob(task) {
  const jobId = randomUUID();
  jobs.set(jobId, {
    id: jobId,
    status: 'running',
    progress: {
      phase: 'Starting',
      message: 'Preparing request...',
      processed: 0,
      total: null,
    },
    result: null,
    error: null,
    updatedAt: Date.now(),
  });

  Promise.resolve()
    .then(() => task((progress) => updateJobProgress(jobId, progress)))
    .then((result) => {
      updateJob(jobId, {
        status: 'complete',
        progress: {
          ...jobs.get(jobId)?.progress,
          phase: 'Complete',
          message: 'Done.',
        },
        result,
      });
    })
    .catch((error) => {
      updateJob(jobId, {
        status: 'error',
        error: formatError(error),
      });
    });

  return jobId;
}

setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [jobId, job] of jobs.entries()) {
    if (job.updatedAt < cutoff) {
      jobs.delete(jobId);
    }
  }
}, 5 * 60 * 1000).unref();

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.webp': 'image/webp',
  }[ext] || 'application/octet-stream';
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function splitInput(input) {
  return String(input || '')
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseYouTubeUrl(value) {
  const trimmed = value.trim();

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.replace(/^www\./, '');
    const listId = url.searchParams.get('list');

    if (listId) {
      return { type: 'playlist', id: listId };
    }

    if (hostname === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return isVideoId(id) ? { type: 'video', id } : null;
    }

    if (hostname.endsWith('youtube.com')) {
      const watchId = url.searchParams.get('v');
      if (isVideoId(watchId)) {
        return { type: 'video', id: watchId };
      }

      const parts = url.pathname.split('/').filter(Boolean);
      const id = parts[1];
      if (['shorts', 'embed', 'live'].includes(parts[0]) && isVideoId(id)) {
        return { type: 'video', id };
      }
    }
  } catch {
    if (isVideoId(trimmed)) {
      return { type: 'video', id: trimmed };
    }
  }

  return null;
}

function isVideoId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(value);
}

function sanitizeName(value, fallback = 'Untitled') {
  return String(value || fallback)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || fallback;
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 30_000);
  const response = await fetch(url, {
    ...options,
    signal: options.signal || controller.signal,
    headers: {
      'user-agent': userAgent,
      'accept-language': 'en-US,en;q=0.9',
      ...(options.headers || {}),
    },
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    throw new Error(`YouTube returned ${response.status} for ${url}`);
  }

  return response.text();
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 30_000);
  const response = await fetch(url, {
    ...options,
    signal: options.signal || controller.signal,
    headers: {
      'user-agent': userAgent,
      'accept-language': 'en-US,en;q=0.9',
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    throw new Error(`YouTube returned ${response.status} for ${url}`);
  }

  return response.json();
}

function extractJsonAssignment(html, marker) {
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  const start = html.indexOf('{', markerIndex);
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < html.length; i += 1) {
    const char = html[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(html.slice(start, i + 1));
      }
    }
  }

  return null;
}

function getText(value) {
  if (!value) return '';
  if (typeof value.simpleText === 'string') return value.simpleText;
  if (typeof value.content === 'string') return value.content;
  if (Array.isArray(value.runs)) {
    return value.runs.map((run) => run.text || '').join('');
  }
  return '';
}

function getThumb(thumbnails) {
  const items = thumbnails?.thumbnail?.thumbnails || thumbnails?.thumbnails || [];
  return items.at(-1)?.url || '';
}

function getLockupThumb(lockup) {
  const sources = lockup?.contentImage?.thumbnailViewModel?.image?.sources || [];
  return sources.at(-1)?.url || '';
}

function getLockupChannel(lockup) {
  const avatarLabel =
    lockup?.metadata?.lockupMetadataViewModel?.image?.decoratedAvatarViewModel?.a11yLabel ||
    lockup?.metadata?.lockupMetadataViewModel?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.accessibilityText;
  if (avatarLabel) {
    return String(avatarLabel).replace(/^Go to channel\s+/i, '').trim();
  }

  const rows =
    lockup?.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
  for (const row of rows) {
    for (const part of row.metadataParts || []) {
      const text = getText(part.text);
      if (text && !/\bviews?\b/i.test(text) && !/\bago\b/i.test(text)) return text;
    }
  }
  return 'YouTube';
}

function parseCountText(value) {
  const text = getText(value) || String(value || '');
  if (!/\bvideos?\b/i.test(text)) return null;

  const match = text.replace(/\u00a0/g, ' ').match(/([\d,.]+)\s*([KMB])?\s+videos?/i);
  if (!match) return null;

  const base = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(base)) return null;

  const multiplier = {
    K: 1_000,
    M: 1_000_000,
    B: 1_000_000_000,
  }[match[2]?.toUpperCase()] || 1;

  return Math.round(base * multiplier);
}

function collectPlaylistCounts(node, counts) {
  if (!node || typeof node !== 'object') return;

  const directCount = parseCountText(node.videoCountText || node.numVideosText);
  if (directCount !== null) {
    counts.add(directCount);
  }

  if (Array.isArray(node.stats)) {
    node.stats.forEach((stat) => {
      const count = parseCountText(stat);
      if (count !== null) counts.add(count);
    });
  }

  if (Array.isArray(node)) {
    node.forEach((item) => collectPlaylistCounts(item, counts));
    return;
  }

  Object.values(node).forEach((value) => collectPlaylistCounts(value, counts));
}

function normalisePlaylistIndex(value, fallback) {
  const text = getText(value) || String(value || '');
  const parsed = Number(text.replace(/[^\d]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function playlistVideoFromRenderer(renderer, fallbackIndex) {
  if (!renderer?.videoId || !renderer?.title) {
    return null;
  }

  const title = getText(renderer.title) || `Video ${renderer.videoId}`;
  const index = normalisePlaylistIndex(renderer.index, fallbackIndex);

  return {
    id: renderer.videoId,
    playlistIndex: index,
    title,
    url: `https://www.youtube.com/watch?v=${renderer.videoId}`,
    channel:
      getText(renderer.shortBylineText) ||
      getText(renderer.ownerText) ||
      getText(renderer.longBylineText) ||
      'YouTube',
    thumbnail: getThumb(renderer.thumbnail),
  };
}

function playlistVideoFromLockup(lockup, fallbackIndex) {
  const endpoint = lockup?.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint;
  const id = endpoint?.videoId || lockup?.contentId;
  const title = getText(lockup?.metadata?.lockupMetadataViewModel?.title);

  if (!isVideoId(id) || !title || lockup?.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO') {
    return null;
  }

  const index = Number.isFinite(endpoint?.index) ? endpoint.index + 1 : fallbackIndex;
  const playlistQuery = endpoint?.playlistId
    ? `&list=${encodeURIComponent(endpoint.playlistId)}&index=${index}`
    : '';

  return {
    id,
    playlistIndex: index,
    title,
    url: `https://www.youtube.com/watch?v=${id}${playlistQuery}`,
    channel: getLockupChannel(lockup),
    thumbnail: getLockupThumb(lockup),
  };
}

function collectPlaylistVideos(node, videos) {
  if (!node || typeof node !== 'object') return;

  const renderer = node.playlistVideoRenderer;
  const video = playlistVideoFromRenderer(renderer, videos.length + 1);
  if (video) {
    videos.push(video);
  }

  const lockupVideo = playlistVideoFromLockup(node.lockupViewModel, videos.length + 1);
  if (lockupVideo) {
    videos.push(lockupVideo);
  }

  if (Array.isArray(node)) {
    node.forEach((item) => collectPlaylistVideos(item, videos));
    return;
  }

  Object.values(node).forEach((value) => collectPlaylistVideos(value, videos));
}

function collectContinuationTokens(node, tokens) {
  if (!node || typeof node !== 'object') return;

  const token =
    node.continuationCommand?.token ||
    node.nextContinuationData?.continuation ||
    node.reloadContinuationData?.continuation;

  if (token) {
    tokens.add(token);
  }

  if (Array.isArray(node)) {
    node.forEach((item) => collectContinuationTokens(item, tokens));
    return;
  }

  Object.values(node).forEach((value) => collectContinuationTokens(value, tokens));
}

function extractYtConfig(html) {
  const apiKey =
    html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1] ||
    html.match(/'INNERTUBE_API_KEY':'([^']+)'/)?.[1];
  const context =
    extractJsonAssignment(html, '"INNERTUBE_CONTEXT":') ||
    extractJsonAssignment(html, "'INNERTUBE_CONTEXT':");

  return {
    apiKey,
    context:
      context || {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20240726.00.00',
        },
      },
  };
}

async function getPlaylistVideos(playlistId, onProgress) {
  const html = await fetchText(`https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`);
  const initialData = extractJsonAssignment(html, 'ytInitialData');
  if (!initialData) {
    throw new Error(`Could not read playlist ${playlistId}`);
  }

  const title =
    getText(initialData.metadata?.playlistMetadataRenderer?.title) ||
    initialData.metadata?.playlistMetadataRenderer?.title ||
    decodeHtml(html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/)?.[1]) ||
    decodeHtml(html.match(/<title>([^<]+)<\/title>/)?.[1])?.replace(/\s*-\s*YouTube\s*$/, '') ||
    `Playlist ${playlistId}`;
  const videos = [];
  const expectedCounts = new Set();
  const seenContinuations = new Set();
  const continuationTokens = new Set();
  collectPlaylistVideos(initialData, videos);
  collectPlaylistCounts(initialData, expectedCounts);
  collectContinuationTokens(initialData, continuationTokens);
  onProgress?.({
    phase: 'Reading playlist',
    playlistTitle: sanitizeName(title, `Playlist ${playlistId}`),
    processed: videos.length,
    total: expectedCounts.size > 0 ? Math.max(...expectedCounts) : null,
    message: `Found ${videos.length} playlist videos...`,
  });

  const { apiKey, context } = extractYtConfig(html);
  while (apiKey && continuationTokens.size > 0) {
    const token = continuationTokens.values().next().value;
    continuationTokens.delete(token);
    if (seenContinuations.has(token)) continue;
    seenContinuations.add(token);

    const data = await fetchJson(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}`, {
      method: 'POST',
      body: JSON.stringify({ context, continuation: token }),
    });

    const beforeCount = videos.length;
    collectPlaylistVideos(data, videos);
    collectPlaylistCounts(data, expectedCounts);
    collectContinuationTokens(data, continuationTokens);
    onProgress?.({
      phase: 'Reading playlist',
      playlistTitle: sanitizeName(title, `Playlist ${playlistId}`),
      processed: videos.length,
      total: expectedCounts.size > 0 ? Math.max(...expectedCounts) : null,
      message: `Found ${videos.length} playlist videos...`,
    });

    if (videos.length === beforeCount && continuationTokens.size === 0) {
      break;
    }
  }

  const expectedVideoCount = expectedCounts.size > 0 ? Math.max(...expectedCounts) : null;
  const capturedVideoCount = videos.length;
  const isComplete =
    continuationTokens.size === 0 &&
    (expectedVideoCount === null || capturedVideoCount >= expectedVideoCount);
  const warning = isComplete
    ? null
    : `Playlist ${playlistId} appears incomplete: captured ${capturedVideoCount}` +
      (expectedVideoCount === null ? '' : ` of ${expectedVideoCount}`) +
      ' videos. Export includes the videos that were successfully captured.';

  return {
    id: playlistId,
    title: sanitizeName(title, `Playlist ${playlistId}`),
    expectedVideoCount,
    capturedVideoCount,
    isComplete,
    warning,
    verificationMessage:
      warning ||
      (expectedVideoCount === null
        ? `Captured ${capturedVideoCount} videos and exhausted the playlist continuation pages.`
        : `Verified ${capturedVideoCount} of ${expectedVideoCount} playlist videos.`),
    videos: videos.map((video, index) => ({
      ...video,
      playlistIndex: video.playlistIndex || index + 1,
    })),
  };
}

function selectCaptionTrack(tracks, language) {
  if (!tracks?.length) return null;

  if (language !== 'all') {
    const exact = tracks.find((track) => track.languageCode === language);
    if (exact) return exact;

    const vss = tracks.find((track) => String(track.vssId || '').replace(/^a?\./, '') === language);
    if (vss) return vss;
  }

  return (
    tracks.find((track) => track.languageCode === 'en') ||
    tracks.find((track) => !track.kind || track.kind !== 'asr') ||
    tracks[0]
  );
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function xmlSegments(xml) {
  const segments = [];
  const regex = /<text[^>]*start="([^"]+)"[^>]*(?:dur="([^"]+)")?[^>]*>([\s\S]*?)<\/text>/g;
  let match;
  while ((match = regex.exec(xml))) {
    const text = decodeHtml(match[3]).replace(/\s+/g, ' ').trim();
    if (text) {
      segments.push({
        text,
        start: Number(match[1]) || 0,
        duration: Number(match[2]) || 0,
      });
    }
  }
  return segments;
}

async function fetchCaptionSegments(track) {
  const url = new URL(track.baseUrl);
  url.searchParams.set('fmt', 'json3');

  try {
    const data = await fetchJson(url.toString());
    return (data.events || [])
      .filter((event) => Array.isArray(event.segs))
      .map((event) => ({
        text: event.segs.map((seg) => seg.utf8 || '').join('').replace(/\s+/g, ' ').trim(),
        start: (event.tStartMs || 0) / 1000,
        duration: (event.dDurationMs || 0) / 1000,
      }))
      .filter((segment) => segment.text);
  } catch {
    url.searchParams.delete('fmt');
    const xml = await fetchText(url.toString());
    return xmlSegments(xml);
  }
}

function fetchPythonTranscript(videoId, language) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.PYTHON || 'python', [path.join(__dirname, 'transcript_worker.py')], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Python transcript worker exited with code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(error);
      }
    });

    child.stdin.end(JSON.stringify({ videoId, language }));
  });
}

async function getVideoTranscript(video, language, playlist) {
  const html = await fetchText(`https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}&hl=en`);
  const playerResponse = extractJsonAssignment(html, 'ytInitialPlayerResponse');
  const details = playerResponse?.videoDetails || {};
  const title = video.title && video.title !== `Video ${video.id}`
    ? video.title
    : details.title || `Video ${video.id}`;
  const channel = video.channel && video.channel !== 'YouTube'
    ? video.channel
    : details.author || 'YouTube';
  const tracks =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  const track = selectCaptionTrack(tracks, language);
  let selectedLanguage = track?.languageCode || language;
  let segments = [];

  if (track) {
    try {
      segments = await fetchCaptionSegments(track);
    } catch {
      segments = [];
    }
  }

  if (!segments.length) {
    try {
      const fallback = await fetchPythonTranscript(video.id, language);
      segments = fallback.segments || [];
      selectedLanguage = fallback.language || selectedLanguage;
    } catch {
      segments = [];
    }
  }

  if (!track && !segments.length) {
    return {
      skipped: true,
      id: video.id,
      title,
      reason: 'No captions are available for this video.',
    };
  }

  if (!segments.length) {
    return {
      skipped: true,
      id: video.id,
      title,
      reason: 'Caption track was empty.',
    };
  }

  const fullText = segments.map((segment) => segment.text).join('\n');

  return {
    id: video.id,
    title,
    channel,
    language: selectedLanguage,
    preview: fullText.slice(0, 220),
    fullText,
    segments,
    thumbnail:
      video.thumbnail ||
      details.thumbnail?.thumbnails?.at(-1)?.url ||
      `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
    format: 'txt',
    playlistId: playlist?.id,
    playlistTitle: playlist?.title,
    playlistIndex: video.playlistIndex,
  };
}

async function extractAll(input, language, onProgress) {
  const items = splitInput(input);
  if (!items.length) {
    throw new Error('Please enter at least one YouTube video or playlist URL.');
  }

  const transcripts = [];
  const skipped = [];
  let processedVideos = 0;
  let totalVideos = items.filter((item) => parseYouTubeUrl(item)?.type === 'video').length;

  onProgress?.({
    phase: 'Preparing transcripts',
    processed: 0,
    total: totalVideos || null,
    message: 'Checking submitted YouTube URLs...',
  });

  for (const item of items) {
    const parsed = parseYouTubeUrl(item);
    if (!parsed) {
      skipped.push({ title: item, reason: 'Invalid YouTube URL.' });
      continue;
    }

    if (parsed.type === 'playlist') {
      const playlist = await getPlaylistVideos(parsed.id, (progress) => {
        onProgress?.({
          ...progress,
          processed: processedVideos,
          total: totalVideos || progress.total,
          message: progress.message,
        });
      });
      if (!playlist.videos.length) {
        skipped.push({
          title: playlist.title,
          reason: 'No public videos were found in this playlist.',
        });
        continue;
      }

      totalVideos += playlist.videos.length;
      onProgress?.({
        phase: 'Extracting transcripts',
        playlistTitle: playlist.title,
        processed: processedVideos,
        total: totalVideos,
        message: `Processing ${playlist.title}`,
      });

      for (const video of playlist.videos) {
        onProgress?.({
          phase: 'Extracting transcripts',
          playlistTitle: playlist.title,
          currentTitle: video.title,
          processed: processedVideos,
          total: totalVideos,
          message: `Processing video ${video.playlistIndex} of ${playlist.videos.length}`,
        });
        const result = await getVideoTranscript(video, language, playlist);
        processedVideos += 1;
        if (result.skipped) {
          skipped.push({ ...result, playlistTitle: playlist.title });
        } else {
          transcripts.push(result);
        }
        onProgress?.({
          phase: 'Extracting transcripts',
          playlistTitle: playlist.title,
          currentTitle: video.title,
          processed: processedVideos,
          total: totalVideos,
          message: `Processed ${processedVideos} of ${totalVideos} videos`,
        });
      }
    } else {
      onProgress?.({
        phase: 'Extracting transcripts',
        currentTitle: parsed.id,
        processed: processedVideos,
        total: totalVideos,
        message: `Processing video ${processedVideos + 1} of ${totalVideos}`,
      });
      const result = await getVideoTranscript({ id: parsed.id }, language, null);
      processedVideos += 1;
      if (result.skipped) {
        skipped.push(result);
      } else {
        transcripts.push(result);
      }
      onProgress?.({
        phase: 'Extracting transcripts',
        currentTitle: result.title || parsed.id,
        processed: processedVideos,
        total: totalVideos,
        message: `Processed ${processedVideos} of ${totalVideos} videos`,
      });
    }
  }

  if (!transcripts.length) {
    const reason = skipped[0]?.reason ? ` ${skipped[0].reason}` : '';
    throw new Error(`No transcripts could be extracted.${reason}`);
  }

  return { transcripts, skipped };
}

async function extractPlaylists(input, onProgress) {
  const items = splitInput(input);
  if (!items.length) {
    throw new Error('Please enter at least one YouTube playlist URL.');
  }

  const playlists = [];
  const skipped = [];
  let completedVideos = 0;
  let totalVideos = null;

  onProgress?.({
    phase: 'Reading playlists',
    processed: 0,
    total: null,
    message: 'Checking playlist URLs...',
  });

  for (const item of items) {
    const parsed = parseYouTubeUrl(item);
    if (!parsed || parsed.type !== 'playlist') {
      skipped.push({ title: item, reason: 'Invalid YouTube playlist URL.' });
      continue;
    }

    const playlist = await getPlaylistVideos(parsed.id, (progress) => {
      const discoveredTotal = progress.total === null || progress.total === undefined
        ? totalVideos
        : completedVideos + progress.total;
      onProgress?.({
        ...progress,
        phase: 'Reading playlist links',
        processed: completedVideos + progress.processed,
        total: discoveredTotal,
        message: `Found ${completedVideos + progress.processed}` +
          (discoveredTotal ? ` of ${discoveredTotal}` : '') +
          ' videos',
      });
    });
    if (!playlist.videos.length) {
      skipped.push({
        title: playlist.title,
        reason: 'No public videos were found in this playlist.',
      });
      continue;
    }

    playlists.push(playlist);
    completedVideos += playlist.videos.length;
    const expectedThroughPlaylist = playlist.expectedVideoCount === null
      ? completedVideos
      : completedVideos - playlist.videos.length + playlist.expectedVideoCount;
    totalVideos = totalVideos === null
      ? expectedThroughPlaylist
      : Math.max(totalVideos, expectedThroughPlaylist);
    if (!playlist.isComplete) {
      skipped.push({
        title: playlist.title,
        reason: playlist.warning || playlist.verificationMessage,
      });
    }
    onProgress?.({
      phase: 'Reading playlist links',
      playlistTitle: playlist.title,
      processed: completedVideos,
      total: totalVideos,
      message: playlist.isComplete
        ? `Verified ${completedVideos} playlist videos`
        : `Captured ${playlist.capturedVideoCount} of ${playlist.expectedVideoCount || playlist.capturedVideoCount} videos from ${playlist.title}`,
    });
  }

  if (!playlists.length) {
    const reason = skipped[0]?.reason ? ` ${skipped[0].reason}` : '';
    throw new Error(`No playlist videos could be fetched.${reason}`);
  }

  return { playlists, skipped };
}

function serveStatic(req, res) {
  if (!existsSync(distRoot)) {
    sendJson(res, 404, { error: 'Build the app first with npm run build.' });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const target = path.normalize(path.join(distRoot, pathname));

  if (!target.startsWith(distRoot) || !existsSync(target)) {
    res.writeHead(200, { 'content-type': contentTypeFor('index.html') });
    createReadStream(path.join(distRoot, 'index.html')).pipe(res);
    return;
  }

  res.writeHead(200, { 'content-type': contentTypeFor(target) });
  createReadStream(target).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      sendOptions(res);
      return;
    }

    if (req.method === 'POST' && req.url === '/api/extract') {
      const body = await readJsonBody(req);
      const data = await extractAll(body.input || body.url, body.language || 'all');
      sendJson(res, 200, data);
      return;
    }

    if (req.method === 'POST' && req.url === '/api/extract/start') {
      const body = await readJsonBody(req);
      const jobId = startJob((onProgress) =>
        extractAll(body.input || body.url, body.language || 'all', onProgress)
      );
      sendJson(res, 202, { jobId });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/playlists') {
      const body = await readJsonBody(req);
      const data = await extractPlaylists(body.input || body.url);
      sendJson(res, 200, data);
      return;
    }

    if (req.method === 'POST' && req.url === '/api/playlists/start') {
      const body = await readJsonBody(req);
      const jobId = startJob((onProgress) => extractPlaylists(body.input || body.url, onProgress));
      sendJson(res, 202, { jobId });
      return;
    }

    if (req.method === 'GET' && req.url.startsWith('/api/jobs/')) {
      const jobId = decodeURIComponent(req.url.replace('/api/jobs/', '').split('?')[0]);
      const job = jobs.get(jobId);
      if (!job) {
        sendJson(res, 404, { error: 'Job not found.' });
        return;
      }
      sendJson(res, 200, job);
      return;
    }

    if (req.method === 'GET' && req.url === '/api/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.url.startsWith('/api/')) {
      sendJson(res, 404, {
        error: `Unknown API endpoint: ${req.method} ${req.url}. The frontend and backend may be out of sync; restart the dev server.`,
      });
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, {
      error: formatError(error),
    });
  }
});

server.listen(port, () => {
  console.log(`Transcript API listening on http://localhost:${port}`);
});
