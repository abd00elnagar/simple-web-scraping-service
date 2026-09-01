# Frontend Implementation Guide

## 1. Directory Structure

```
frontend/
├── app/
│   ├── favicon.ico
│   ├── globals.css         # Tailwind directives and base styling
│   ├── layout.tsx          # Root layout with suppressHydrationWarning
│   ├── page.tsx            # Renders ProductsPage component
│   └── products/
│       └── page.tsx        # Main products view with backend queries, debounce & pagination
├── components/
│   ├── EmptyState.tsx      # Displayed when DB contains zero records
│   ├── ErrorBanner.tsx     # Displayed when backend API is unreachable
│   ├── Navbar.tsx          # Header with live ticker & manual refresh button
│   ├── ProductCard.tsx     # Responsive product card with aspect-square object-contain image
│   └── ProductSkeleton.tsx # Skeleton placeholder during initial loading
├── docs/
│   ├── implementation.md   # Implementation documentation (this file)
│   └── plan.md             # Architecture design document
├── types/
│   └── product.ts          # Type interfaces for Product and API structures
├── biome.json              # Biome linter & formatter configuration
├── next.config.ts          # Next.js config (wildcard remote image patterns)
└── package.json
```

---

## 2. Core Components & Logic

### 2.1 Product Catalog View (`app/products/page.tsx`)

#### Backend-Integrated Search & Sort
- All filtering and sorting is handled by passing query parameters directly to the Laravel backend API:
```ts
function buildApiParams(search: string, sort: SortOption): URLSearchParams {
  const params = new URLSearchParams();
  if (search.trim()) {
    params.set("search", search.trim());
  }
  if (sort === "price-asc") params.set("sort_price", "asc");
  else if (sort === "price-desc") params.set("sort_price", "desc");
  else if (sort === "newest") params.set("sort_date", "desc");
  // "default" sends no sort params → backend applies inRandomOrder()
  return params;
}
```

#### Search Debounce (400ms)
- User typing in the search field is debounced using a `useRef` timer (400ms), preventing unnecessary API requests on intermediate keystrokes:
```ts
const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
const handleSearchChange = (value: string) => {
  setSearchInput(value);
  if (debounceTimer.current) clearTimeout(debounceTimer.current);
  debounceTimer.current = setTimeout(() => {
    setActiveSearch(value);
  }, 400);
};
```

#### Prominent Top Pagination
- Defaults to **30 items per page** (`itemsPerPage = 30`).
- Placed directly above the product card grid so users can navigate pages without scrolling through cards.
- A mirrored pagination bar is rendered at the bottom with smooth `window.scrollTo({ top: 0, behavior: "smooth" })`.
- Includes ellipsis formatting for large page collections (`renderPageNumbers()`).
- Automatically resets `currentPage` to 1 whenever search query, sort order, or items-per-page change.

#### Auto-Polling Timers (30s Cycle)
- Two intervals started in `useEffect`, both cleared on unmount:
  1. `fetchInterval`: Re-fetches current catalog query from API every 30,000 ms.
  2. `countdownInterval`: Decrements `secondsRemaining` in 1-second ticks for the live countdown indicator.

---

### 2.2 Product Card (`components/ProductCard.tsx`)

#### Image Aspect Ratio & Size Handling
To support diverse eCommerce image ratios (tall apparel, wide bags, square product shots) without distortion or clipping:
```tsx
<div className="relative aspect-square w-full overflow-hidden bg-zinc-50 dark:bg-zinc-800/40">
  <Image
    src={product.image_url}
    alt={product.title}
    fill
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
    className="object-contain p-3 transition-transform duration-500 ease-out group-hover:scale-105"
    unoptimized
  />
</div>
```
- **`aspect-square`**: Provides a stable, uniform bounding box across all grid items.
- **`object-contain p-3`**: Ensures the full product silhouette is visible with generous edge padding.
- **`group-hover:scale-105`**: Provides subtle micro-interaction zoom without altering layout.

#### Clean Typography & Details
- Displays product title with 2-line clamping (`line-clamp-2`).
- Price badge positioned in top-right corner with `bg-emerald-600` / `bg-emerald-500` pill.
- Card footer displays internal `ID #N` and a direct "View Source" external link.

---

### 2.3 Navbar (`components/Navbar.tsx`)
- Minimalist header with "Scraper Dashboard" title.
- Total product count badge (`N Products`).
- Live pulse indicator showing `Auto-sync in Ns` (or `Paused` on error).
- Manual "Refresh" button triggering immediate API fetch with spinning icon animation.

---

### 2.4 Remote Image Configuration (`next.config.ts`)
Configured to allow all remote domains for product image rendering without hostname restrictions:
```typescript
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};
```

---

## 3. Running the Frontend

### Install Dependencies:
```bash
bun install
# or: npm install
```

### Start Development Server:
```bash
bun dev
# or: npm run dev
```

App runs on **http://localhost:3000** and connects to the backend on **http://localhost:8000/api**.
