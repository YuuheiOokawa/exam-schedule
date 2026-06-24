interface LoadingStateProps {
  message?: string;
  /** Render qualification card skeletons instead of a spinner */
  cards?: boolean;
  cardCount?: number;
}

function CardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="rounded-2xl border border-[var(--border)] overflow-hidden bg-[var(--surface)]
                 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="h-[3px] skeleton" />
      <div className="p-3 space-y-2.5">
        <div className="flex items-start justify-between gap-1">
          <div className="flex gap-1">
            <div className="h-4 w-12 rounded-md skeleton" />
            <div className="h-4 w-10 rounded-md skeleton" />
          </div>
          <div className="h-7 w-7 rounded-xl skeleton shrink-0" />
        </div>
        <div className="space-y-1.5 min-h-[2.6em]">
          <div className="h-3 w-full rounded skeleton" />
          <div className="h-3 w-4/5 rounded skeleton" />
        </div>
        <div className="h-3 w-20 rounded skeleton" />
      </div>
    </div>
  );
}

export function LoadingState({ message = '読み込み中...', cards = false, cardCount = 8 }: LoadingStateProps) {
  if (cards) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: cardCount }).map((_, i) => (
          <CardSkeleton key={i} delay={i * 40} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-[var(--text-4)]">
      {/* Animated indigo spinner */}
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-[3px] border-[var(--surface-3)]" />
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent
                        border-t-indigo-500 animate-spin" />
      </div>
      <p className="text-[13px] text-[var(--text-3)] font-medium">{message}</p>
    </div>
  );
}
