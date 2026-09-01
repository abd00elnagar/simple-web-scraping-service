# Frontend Architecture & Technical Specification

## 1. Overview
The `frontend` is a Next.js 15 (React 19) application responsible for:
1. Providing a user interface at the `/products` route.
2. Fetching stored eCommerce product data from the Laravel REST API (`/api/products`).
3. Displaying products in a responsive card grid showing title, price, and image.
4. Refreshing the catalog automatically every 30 seconds via client-side polling.
5. Providing user controls: live polling status countdown, search filtering, and price/date sorting.

---

## 2. Technical Stack
- **Framework**: Next.js 15 (App Router)
- **Library**: React 19 / TypeScript
- **Styling**: Tailwind CSS
- **Package Manager / Runtime**: Bun

---

## 3. UI Component Architecture

```
app/
├── layout.tsx         # Root layout with metadata and dark/light theme classes
├── page.tsx           # Root redirect to /products
└── products/
    └── page.tsx       # Main catalog page with polling hook, state, search & sorting
components/
├── Navbar.tsx         # Top navigation bar with total counter and 30s countdown badge
├── ProductCard.tsx    # Responsive card rendering product image, title, price, link
├── ProductSkeleton.tsx# Animated loading skeleton for initial data fetch
├── ErrorBanner.tsx    # Actionable error banner with retry button
└── EmptyState.tsx     # Graceful zero-products display with manual trigger
types/
└── product.ts         # TypeScript definitions for Product and API response schemas
```

---

## 4. Polling & State Management Strategy

### 4.1 30-Second Refresh Cycle
- `POLLING_INTERVAL_SECONDS = 30` (30,000 ms).
- Managed using `setInterval` inside `useEffect` in `app/products/page.tsx`.
- Includes a 1-second interval ticker updating `secondsRemaining` to provide visual countdown feedback on the Navbar badge.
- Re-fetches with `{ cache: 'no-store' }` to ensure fresh responses bypassing Next.js client router caches.

### 4.2 Client-Side Filtering
- `searchQuery`: Live regex-free search across title and source URL.
- `sortBy`: Offers `default`, `price-asc`, `price-desc`, and `newest` ordering.

---

## 5. Environment & Backend Integration
- `NEXT_PUBLIC_API_URL`: Points to the Laravel API (defaults to `http://localhost:8000/api`).
- Configured in `frontend/.env.local`.
- Works seamlessly with backend's `php artisan dev:start` single-command server launcher.
