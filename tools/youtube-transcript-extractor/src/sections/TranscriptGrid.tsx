import TranscriptCard from '@/components/TranscriptCard';
import type { Transcript } from '@/types';

interface TranscriptGridProps {
  transcripts: Transcript[];
  isLoading: boolean;
  includeIndexInTitles: boolean;
}

function LoadingSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-[var(--yt-bg-card)] border border-[var(--yt-border)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {/* Thumbnail skeleton */}
          <div className="w-full aspect-video rounded-xl bg-[var(--yt-border)] skeleton-pulse" />
          {/* Title skeleton */}
          <div className="mt-3 w-3/5 h-4 rounded bg-[var(--yt-border)] skeleton-pulse" />
          {/* Channel skeleton */}
          <div className="mt-2 w-2/5 h-3 rounded bg-[var(--yt-border)] skeleton-pulse" />
          {/* Preview skeleton */}
          <div className="mt-2 w-4/5 h-3 rounded bg-[var(--yt-border)] skeleton-pulse" />
        </div>
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full rounded-lg border border-dashed border-[var(--yt-border)] bg-[var(--yt-bg-card)] px-5 py-10 text-center">
      <h3 className="text-sm font-semibold text-[var(--yt-text-primary)]">
        Transcript results will appear here
      </h3>
      <p className="mx-auto mt-2 max-w-[420px] text-sm text-[var(--yt-text-secondary)]">
        Paste YouTube links above, choose transcript options, and start extraction.
      </p>
    </div>
  );
}

export default function TranscriptGrid({ transcripts, isLoading, includeIndexInTitles }: TranscriptGridProps) {
  return (
    <section id="transcripts" className="bg-black px-6 pb-12 pt-4">
      <div className="mx-auto max-w-[1180px]">
        {/* Section Header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--yt-text-primary)]">
            Transcript results
          </h2>
          {transcripts.length > 0 && (
            <span className="rounded-full bg-[var(--yt-bg-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--yt-text-secondary)]">
              {transcripts.length} ready
            </span>
          )}
        </div>

        {/* Grid */}
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          }}
        >
          {isLoading ? (
            <LoadingSkeleton />
          ) : transcripts.length === 0 ? (
            <EmptyState />
          ) : (
            transcripts.map((transcript) => (
              <TranscriptCard
                key={transcript.id}
                transcript={transcript}
                includeIndexInTitles={includeIndexInTitles}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
