# Frontend Architecture & Technical Specification

## 1. Overview
The `frontend` is a Next.js 16 (React 19) application built with TypeScript and Tailwind CSS v4. It is responsible for:
1. Providing an interactive catalog interface at the `/products` route (with root `/` rendering the catalog).
2. Fetching stored eCommerce product data from the Laravel REST API (`/api/products`).
3. Delegating search and sorting operations directly to backend query parameters (`?search=`, `?sort_price=`, `?sort_date=`).
4. Displaying products in a responsive card grid showing title, price, image, and source link with robust handling for varied image aspect ratios.
5. Refreshing the catalog automatically every 30 seconds via client-side polling with a visual countdown ticker.
6. Providing prominent top-level pagination controls (defaulting to 30 items per page) to eliminate unnecessary scrolling.

---

## 2. Technical Stack
- **Framework**: Next.js 16 (`16.3.3`, App Router)
- **Library**: React 19 (`19.2.8`) / TypeScript 5
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss: ^4`)
- **Package Manager / Runtime**: Bun (Node.js compatible)
- **Code Quality**: Biome (`biome.json`)

---

## 3. UI Component Architecture

```
frontend/
├── app/
│   ├── favicon.ico
│   ├── globals.css         # Tailwind directives and base styling
│   ├── layout.tsx          # Root layout with suppressHydrationWarning
│   ├── page.tsx            # Root view rendering ProductsPage
│   └── products/
│       └── page.tsx        # Main catalog page: API queries, debounce, pagination, layout
├── components/
│   ├── EmptyState.tsx      # Graceful zero-products display with retry button
│   ├── ErrorBanner.tsx     # Actionable error banner with retry option
│   ├── Navbar.tsx          # Minimalist header with live sync countdown & manual refresh
│   ├── ProductCard.tsx     # Responsive card with aspect-square container & object-contain image
│   └── ProductSkeleton.tsx # Animated loading skeleton for initial data fetch
├── docs/
│   ├── implementation.md   # Detailed implementation documentation
│   └── plan.md             # Architecture design document (this file)
├── types/
│   └── product.ts          # TypeScript interfaces for Product and API responses
├── next.config.ts          # Next.js image configuration (wildcard remote patterns)
└── package.json
```

---

## 4. Search, Sort, and Polling Architecture

### 4.1 Backend-Driven Search & Sorting
The frontend delegates filtering and sorting to the Laravel backend API to ensure optimal database querying:
- **Search (`?search=<query>`)**: Debounced by 400ms on the client. Searches against `title` and `source_url` in MySQL using `LIKE %query%`.
- **Price Sort (`?sort_price=asc|desc`)**: Orders results by price numerically.
- **Date Sort (`?sort_date=desc`)**: Orders results by `created_at` descending.
- **Default Sort**: When no search or explicit sort is specified, backend returns products in randomized order (`inRandomOrder()`), providing dynamic variety on every 30-second poll cycle.

### 4.2 30-Second Refresh Cycle
- `POLLING_INTERVAL_SECONDS = 30` (30,000 ms).
- Managed using `setInterval` inside `useEffect` in `app/products/page.tsx`.
- Accompanied by a 1-second interval ticker updating `secondsRemaining` displayed in the Navbar badge.
- Polling requests are executed with `{ cache: 'no-store' }` to bypass client caching.

### 4.3 Top Pagination Architecture
- **Default Items Per Page**: 30 products (`itemsPerPage = 30`).
- **Placement**: Prominently placed directly above the card grid (and mirrored at the bottom) so users can change pages immediately without scrolling through cards.
- **Configurable Densities**: Dropdown options for `12`, `24`, `30`, and `60` items per page.
- **Pagination State Reset**: Automatically resets `currentPage` to 1 whenever search, sort, or items-per-page change.

---

## 5. Image & Card Ratio Handling
- Scraped images from external eCommerce sources have arbitrary aspect ratios (tall portrait apparel, wide accessories, square product shots).
- To prevent cropping or distorted zooming, cards use an **`aspect-square` container with `object-contain p-3`** and `unoptimized` loading with wildcard remote patterns.
- This guarantees that 100% of the product image is visible with neutral letterboxing that integrates seamlessly into both dark and light modes.
