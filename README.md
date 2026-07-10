# Web Utility Tools

A local-first web workspace for small utility tools. The app is structured as one SPA with a homepage and tool routes, so it can be deployed later as a single website instead of a separate deployment per tool.

## Current Tools

- YouTube Links and Transcript Extractor: extract YouTube transcripts and export playlist video tables.

## Run Locally

```bash
cd tools/youtube-transcript-extractor
npm install
npm run dev
```

Open the homepage at `http://localhost:3000/`. The YouTube tool is available at `/tools/youtube-transcript-extractor`.

## Add A Tool

Add the tool entry in `src/data/tools.ts`, then mount the tool UI as a route in `src/App.tsx`.
