"use client";

interface NavbarProps {
  totalCount: number;
  isPolling: boolean;
  secondsRemaining: number;
  onManualRefresh: () => void;
  isRefreshing: boolean;
}

export default function Navbar({
  totalCount,
  isPolling,
  secondsRemaining,
  onManualRefresh,
  isRefreshing,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Clean Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Scraper Dashboard
            </span>
          </div>
        </div>

        {/* Status Indicators & Refresh Controls */}
        <div className="flex items-center gap-3">
          {/* Total Products Counter */}
          <div className="hidden items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>{totalCount} Products</span>
          </div>

          {/* Polling Countdown Indicator */}
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>
              {isPolling ? `Auto-sync in ${secondsRemaining}s` : "Paused"}
            </span>
          </div>

          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={onManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="Refresh now"
          >
            <svg
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-emerald-500" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
}
