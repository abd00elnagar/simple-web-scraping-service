"use client";

interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
}

export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="my-6 rounded-2xl border border-rose-200 bg-rose-50/80 p-5 backdrop-blur-sm dark:border-rose-900/50 dark:bg-rose-950/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-400">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-rose-900 dark:text-rose-200">
              Unable to load products from Laravel API
            </h2>
            <p className="mt-0.5 text-xs text-rose-700 dark:text-rose-300">
              {message}
            </p>
            <p className="mt-1 text-[11px] text-rose-600/80 dark:text-rose-400/80">
              Ensure Laravel backend is running:{" "}
              <code className="rounded bg-rose-100/80 px-1 py-0.5 font-mono text-[10px] dark:bg-rose-900/50">
                php artisan serve --port=8000
              </code>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRetry}
          className="self-start rounded-xl border border-rose-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-800 shadow-xs transition-all hover:bg-rose-100 active:scale-95 dark:border-rose-800 dark:bg-rose-900 dark:text-rose-100 dark:hover:bg-rose-800 sm:self-auto"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
