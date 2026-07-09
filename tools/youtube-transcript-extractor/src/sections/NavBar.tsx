import { FileDown, Play } from 'lucide-react';

export default function NavBar() {
  const scrollTo = (target: string) => {
    document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--yt-border)] bg-black/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-6">
        <button
          onClick={() => scrollTo('#home')}
          className="flex items-center gap-3 text-left"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1683ff] text-white">
            <Play size={17} fill="currentColor" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-white">Transcript Extractor</span>
            <span className="block text-[11px] text-[var(--yt-text-muted)]">Batch YouTube exports</span>
          </span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => scrollTo('#home')}
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-[var(--yt-text-secondary)] hover:bg-[var(--yt-bg-card)] hover:text-white sm:inline-flex"
          >
            Extractors
          </button>
          <button
            onClick={() => scrollTo('#transcripts')}
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-[var(--yt-text-secondary)] hover:bg-[var(--yt-bg-card)] hover:text-white sm:inline-flex"
          >
            Results
          </button>
          <button
            onClick={() => scrollTo('#home')}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--yt-border)] bg-[var(--yt-bg-card)] px-3 text-sm font-semibold text-white hover:border-[#1683ff]"
          >
            <FileDown size={15} />
            Export
          </button>
        </div>
      </div>
    </nav>
  );
}
