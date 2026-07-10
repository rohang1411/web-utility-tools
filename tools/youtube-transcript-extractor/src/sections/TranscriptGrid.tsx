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
        <div key={i} className="rounded-lg border border-[var(--yt-border)] bg-[var(--yt-bg-card)] p-4 shadow-[var(--yt-shadow-card)]">
          <div className="aspect-video w-full rounded-md bg-[var(--yt-bg-subtle)] skeleton-pulse" />
          <div className="mt-4 h-4 w-3/5 rounded bg-[var(--yt-bg-subtle)] skeleton-pulse" />
          <div className="mt-2 h-3 w-2/5 rounded bg-[var(--yt-bg-subtle)] skeleton-pulse" />
          <div className="mt-4 h-3 w-4/5 rounded bg-[var(--yt-bg-subtle)] skeleton-pulse" />
        </div>
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full rounded-lg border border-dashed border-[var(--yt-border)] bg-[var(--yt-bg-card)] px-5 py-12 text-center">
      <h3 className="text-sm font-medium text-[var(--yt-text-secondary)]">No transcripts yet</h3>
    </div>
  );
}

export default function TranscriptGrid({ transcripts, isLoading, includeIndexInTitles }: TranscriptGridProps) {
  return (
    <section id="transcripts" className="bg-[var(--yt-bg-page)] px-5 pb-12 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[12px] font-medium uppercase tracking-[0.28em] text-[var(--yt-text-muted)]">
            Results
          </h2>
          {transcripts.length > 0 && (
            <span className="rounded-full border border-[var(--yt-border)] bg-[var(--yt-bg-card)] px-2.5 py-1 text-xs font-medium text-[var(--yt-text-secondary)]">
              {transcripts.length} ready
            </span>
          )}
        </div>

        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
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
