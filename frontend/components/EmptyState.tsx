"use client";

interface EmptyStateProps {
  onRefresh: () => void;
}

export default function EmptyState({ onRefresh }: EmptyStateProps) {
  return (
    <div className="my-12 flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-zinc-50/50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
        <svg
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      </div>

      <h2 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
        No Products Scraped Yet
      </h2>
      <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
        The database is currently empty. Run the scraping artisan command in the
        backend to populate product records.
      </p>

      <div className="mt-5 flex flex-col items-center gap-3">
        <div className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 font-mono text-xs text-zinc-800 shadow-xs dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
          php artisan scrape:products
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-500 active:scale-95"
        >
          Check for New Products
        </button>
      </div>
    </div>
  );
}
