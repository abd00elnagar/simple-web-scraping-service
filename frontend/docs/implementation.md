# Frontend Implementation Guide

## 1. Directory Structure

```
frontend/
├── app/
│   ├── favicon.ico
│   ├── globals.css         # Tailwind directives and base styling
│   ├── layout.tsx          # Root HTML layout with viewport settings
│   ├── page.tsx            # Redirects "/" to "/products"
│   └── products/
│       └── page.tsx        # Main products view with 30s polling logic
├── components/
│   ├── EmptyState.tsx      # Displayed when DB contains zero records
│   ├── ErrorBanner.tsx     # Displayed when backend API is unreachable
│   ├── Navbar.tsx          # Header with live ticker & manual refresh button
│   ├── ProductCard.tsx     # Responsive product card
│   └── ProductSkeleton.tsx # Skeleton placeholder during initial loading
├── docs/
│   ├── implementation.md   # Implementation documentation (this file)
│   └── plan.md             # Architecture design document
├── types/
│   └── product.ts          # Type interfaces for Product and API structures
├── next.config.ts          # Next.js config (wildcard remote image patterns)
└── package.json
```

---

## 2. Core Components & Logic

### 2.1 Product Catalog View (`app/products/page.tsx`)
- Fetches data on initial component mount via `fetchProducts()`.
- Implements two timers in `useEffect`:
  1. `fetchInterval`: Triggers `fetchProducts()` every `30 * 1000` ms (30 seconds).
  2. `countdownInterval`: Decrements `secondsRemaining` every 1000 ms (1 second) for UI feedback.
- Cleans up both intervals on unmount to prevent memory leaks.
- Handles empty, loading, error, and filtered states.

### 2.2 Product Card (`components/ProductCard.tsx`)
- Displays product card with:
  - **Image**: Renders `image_url` with graceful fallback placeholder when null/broken.
  - **Title**: Formatted title with hover transition.
  - **Price**: Formatted currency with 2 decimal points.
  - **Source Link**: Direct link to the scraped source page.

### 2.3 Navbar & Live Indicator (`components/Navbar.tsx`)
- Shows active catalog item count.
- Includes a live polling status indicator:
  - Pulses green with countdown text (e.g. `Auto-refresh in 28s`).
  - Provides a manual "Refresh" button allowing instant re-fetch.

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
# or npm install
```

### Start Development Server:
```bash
bun dev
# or npm run dev
```

App runs on **http://localhost:3000** and connects to the backend on **http://localhost:8000/api**.
