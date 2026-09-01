# Project Walkthrough

- Initialized root project repository with `README.md`
- Created Laravel 12 backend application in `backend`
- Created Next.js 16 frontend application with Tailwind CSS v4 and Biome in `frontend`
- Initialized Go module for microservice in `proxy-service`
- Added technical architecture plan in `proxy-service/docs/plan.md`
- Implemented Go proxy rotation microservice in `proxy-service/main.go` with passing unit tests
- Added technical architecture plan in `backend/docs/plan.md`
- Created `Product` Eloquent model and migration (`products` table with `source_url` unique index)
- Scaffolded API routes in `routes/api.php` and installed Laravel Sanctum
- Created `ProductApiController` with `index` (randomized default, search, sort, paginate) and `show` (with 404 handling)
- Registered `GET /api/products` and `GET /api/products/{product}` in `routes/api.php`
- Configured CORS in `config/cors.php` to allow `http://localhost:3000` on all `api/*` routes
- Upgraded `proxy-service` to serve full browser header sets (`User-Agent`, `Accept`, `Accept-Language`, `Sec-Fetch-Mode`) and 5 rotating proxy labels (`proxy-1` .. `proxy-5`)
- Implemented `ProxyIdentityClient` to strictly consume identities from `proxy-service` on port 9000 (`GET /next-identity`)
- Implemented `ScraperService` with `symfony/dom-crawler` parsing and idempotent `updateOrCreate` database persistence
- Created `ScrapeProducts` Artisan command (`php artisan scrape:products`) with terminal attempt cascade reporting
- Added automated Pest feature test suite (`ProductApiTest`, `ProxyIdentityClientTest`, `ScraperTest`) with all tests passing
- Verified live end-to-end scraper execution and database persistence across multiple runs (`proxy-1` -> `proxy-2` -> ...)

---

## Challenges Faced: Anti-Bot Defenses & Target Resolution

### Issues Encountered During Target Testing:
- **Jumia Egypt**: Blocked server-side Guzzle requests with `HTTP 403 Forbidden` due to Cloudflare JavaScript challenges (`challenges.cloudflare.com`).
- **Amazon Egypt**: Researched real browser header sets and passed complete browser fingerprints (`User-Agent`, `Accept`, `Accept-Language`, `Sec-Fetch-Mode`), but encountered silent TCP connection timeouts caused by enterprise firewall blocking. Kept in scraper cascade with a fast-fail.
- **Noon & eBay**: Evaluated large-scale eCommerce targets — Noon requires full client-side SPA rendering with WAF protection; eBay immediately returned `HTTP 403` with Akamai Bot Manager reference errors.
- **Ethical & Scope Boundary**: Ruled out stealth headless browser automation, residential IP networks, and TLS fingerprint spoofing due to Terms of Service violations and disproportionate trial scope. Also ruled out querying direct `/products.json` endpoints to adhere strictly to the requirement of testing genuine HTML DOM extraction with `symfony/dom-crawler`.

### Final Decision:
- Routed the scraper to an accessible, real-world scrapable eCommerce store (`scrapingcourse.com/ecommerce`) with 188 products across 12 catalog pages, clean DOM structure, and high-resolution images to validate the entire end-to-end pipeline (Go proxy rotation → Laravel scraping engine → MySQL/SQLite upsert → Next.js polling).

---

## Phase 2 — Frontend, Auto-Scraping & Product Accumulation

### Frontend (Next.js 16 + React 19)
- Built `ProductCard` component with `aspect-square` container and `object-contain p-3` image display
- Built `ProductSkeleton` component for loading state placeholder grid
- Built `Navbar`, `ErrorBanner`, and `EmptyState` shared components
- Built `/products` page with responsive grid layout and 30-second client-side polling with live countdown ticker
- Configured `next.config.ts` with wildcard `remotePatterns` for both `http` and `https` to allow all image sources from the scraper
- Added `suppressHydrationWarning` to `<html>` and `<body>` in `app/layout.tsx` to suppress false hydration mismatch warnings caused by browser extensions injecting custom attributes
- Root page (`app/page.tsx`) renders the products catalog directly
- Added `Product` TypeScript type definitions in `frontend/types/product.ts`
- Formatted and linted frontend codebase using Biome

### Backend — Continuous Scraping Loop
- `ScrapeProducts` command runs as a **continuous 30-second loop by default**; `--once` flag retained for single-run CI/testing scenarios; `--interval` flag for custom cadence.

### Backend — Paginated Product Accumulation
- `ScraperService` uses a **page-rotating architecture**:
  - The site exposes 12 catalog pages (~16 products each = 188 total unique products)
  - Current page pointer persisted in `storage/app/scraper_page.txt` — survives process restarts
  - Each 30-second scrape cycle advances to the next catalog page
  - `updateOrCreate` on `source_url` unique index ensures **zero duplicates** — only genuinely new or updated products are written

### Developer Experience — `php artisan dev:start`
- `DevStart` Artisan command launches both services from a single terminal:
  1. Spawns `php artisan scrape:products --interval=30` as a **detached background process** (Windows-safe via `cmd /c start /b "" "php" "artisan" ...` and Unix `nohup`)
  2. Starts `php artisan serve` in the foreground

---

## Phase 3 — Spec Compliance Audit & Documentation Suite

### 1. Database & REST API Refinement
- **MySQL Default**: Configured `backend/.env.example` to default to MySQL (`DB_CONNECTION=mysql`, `DB_DATABASE=scraper_service_backend`), with SQLite documented as an automated fallback.
- **Pure Read-Only API**: `GET /api/products` is strictly read-only and idempotent.
- **Bare Endpoint Full Data**: `GET /api/products` without query parameters returns the complete stored product collection (`total` count metadata) shuffled via `inRandomOrder()` for natural variety across 30-second poll cycles. Optional pagination (`?page=1&per_page=20`) and search/sort filters remain supported.

### 2. Comprehensive Documentation Suite
Structured and populated individual `docs/` folders for all three services:
- **`backend/docs/`**: `plan.md` and `implementation.md` detailing architecture, schema, API endpoints, scraper lifecycle, and test coverage.
- **`frontend/docs/`**: `plan.md` and `implementation.md` detailing Next.js App Router architecture, backend-driven queries, client pagination slicing, and image ratio handling.
- **`proxy-service/docs/`**: `plan.md` and `implementation.md` detailing Go microservice architecture, proxy labels, browser profiles, and concurrency safety.

### 3. Unified Cross-Platform Automation
- **`scripts/setup.js` (`npm run setup` / `bun run setup`)**: Cross-platform Node.js automation script verifying PHP (8.2+), Composer, Go (1.21+), and Bun/npm. Installs backend dependencies, runs database migrations with interactive SQLite fallback on failure, installs frontend dependencies, and sets up workspace packages.
- **`scripts/setup.bash`**: Bash equivalent with matching environment checks and dynamic fallback logic.
- **`scripts/run.bash`**: Launches all 3 services concurrently (`proxy-service` `:9000`, `backend` `:8000`, `frontend` `:3000`) with `--kill-others` (`-k`) and `--kill-others-on-fail` fail-safe trapping.
