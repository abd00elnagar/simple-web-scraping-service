# Frontend Service (Next.js 16 + React 19)

The frontend is a responsive product catalog dashboard built with Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS v4.

---

## Key Features

- **Live 30-Second Auto-Polling**: Automatically polls `GET /api/products` every 30 seconds with a real-time countdown badge in the Navbar.
- **Backend-Driven Filtering & Sorting**: Debounced search (400ms) and price/date sorting delegated to the Laravel backend API.
- **Top & Bottom Pagination**: Prominently placed pagination controls defaulting to 30 items per page with configurable density (12, 24, 30, 60).
- **Responsive Image Cards**: `aspect-square` container with `object-contain p-3` image rendering to display diverse external product images without distortion or cropping.
- **Micro-Animations & Skeletons**: Smooth card hover elevation, animated loading skeletons, and live pulse indicators.

---

## Directory Structure

```
frontend/
├── app/
│   ├── globals.css         # Tailwind CSS directives & theme rules
│   ├── layout.tsx          # Root layout with suppressHydrationWarning
│   ├── page.tsx            # Root redirect/render of products page
│   └── products/
│       └── page.tsx        # Main catalog view with search, sort, and pagination
├── components/
│   ├── EmptyState.tsx      # Empty product collection placeholder
│   ├── ErrorBanner.tsx     # API error notification with retry button
│   ├── Navbar.tsx          # Header with live ticker & manual refresh button
│   ├── ProductCard.tsx     # Product card with price pill and source link
│   └── ProductSkeleton.tsx # Shimmer skeleton placeholder
├── docs/
│   ├── plan.md             # Frontend architecture specification
│   └── implementation.md   # Frontend implementation guide
├── types/
│   └── product.ts          # TypeScript interfaces for Product and API payload
├── biome.json              # Biome linter & formatter config
├── next.config.ts          # Remote image wildcard patterns
└── package.json            # Scripts and dependencies
```

---

## Quick Commands

```bash
# Install dependencies (Bun recommended, npm compatible)
bun install
# or: npm install

# Start development server on port 3000
bun dev
# or: npm run dev

# Run linter / formatter
bun run lint
bun run format
```

For full details, see [frontend/docs/plan.md](docs/plan.md) and [frontend/docs/implementation.md](docs/implementation.md).
