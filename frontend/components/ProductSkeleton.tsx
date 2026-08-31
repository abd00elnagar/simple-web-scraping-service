export default function ProductSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200/60 bg-white/60 p-0 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/60 animate-pulse">
      <div className="aspect-4/3 w-full bg-zinc-200 dark:bg-zinc-800" />
      <div className="p-5">
        <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-2.5 h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-2 h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <div className="h-3 w-12 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
