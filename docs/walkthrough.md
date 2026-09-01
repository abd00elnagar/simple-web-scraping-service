# Project Walkthrough

- Initialized root project repository with `README.md`
- Created Laravel 12 backend application in `backend`
- Created Next.js 15 frontend application with Tailwind CSS in `frontend`
- Initialized Go module for microservice in `proxy-service`
- Added technical architecture plan in `proxy-service/docs/plan.md`
- Implemented Go proxy rotation microservice in `proxy-service/main.go` with passing unit tests
- Added technical architecture plan in `backend/docs/plan.md`
- Created `Product` Eloquent model and migration (`products` table with `source_url` unique index)
- Ran `php artisan install:api` to scaffold `routes/api.php` and install Laravel Sanctum
- Created `ProductApiController` with `index` (search, sort, paginate) and `show` (with 404 handling)
- Registered `GET /api/products` and `GET /api/products/{product}` in `routes/api.php`
- Configured CORS in `config/cors.php` to allow `http://localhost:3000` on all `api/*` routes
- Upgraded `proxy-service` to serve full browser header sets (`User-Agent`, `Accept`, `Accept-Language`, `Sec-Fetch-Mode`) and rotating proxy labels
- Implemented `ProxyIdentityClient` to strictly consume identities from `proxy-service` on port 9000
- Implemented `ScraperService` with `symfony/dom-crawler` parsing and idempotent `updateOrCreate` database persistence
- Created `ScrapeProducts` Artisan command (`php artisan scrape:products`) with terminal attempt cascade reporting
- Added automated Pest feature test suite (`ProductApiTest`, `ProxyIdentityClientTest`, `ScraperTest`) with all tests passing
- Verified live end-to-end scraper execution and database persistence across multiple runs (`proxy-2` -> `proxy-3` -> `proxy-4`)

---

## Challenges Faced: Anti-Bot Defenses & Target Resolution

### Issues Encountered During Target Testing:
- **Jumia Egypt**: Blocked server-side Guzzle requests with `HTTP 403 Forbidden` due to Cloudflare JavaScript challenges (`challenges.cloudflare.com`).
- **Amazon Egypt**: Researched real browser header sets and passed complete browser fingerprints (`User-Agent`, `Accept`, `Accept-Language`, `Sec-Fetch-Mode`), but encountered silent TCP connection timeouts caused by enterprise firewall blocking. Kept in scraper cascade with a 5s fast-fail.
- **Noon & eBay**: Evaluated large-scale eCommerce targets — Noon requires full client-side SPA rendering with WAF protection; eBay immediately returned `HTTP 403` with Akamai Bot Manager reference errors.
- **Ethical & Scope Boundary**: Ruled out stealth headless browser automation, residential IP networks, and TLS fingerprint spoofing due to Terms of Service violations and disproportionate trial scope. Also ruled out querying direct `/products.json` endpoints to adhere strictly to the requirement of testing genuine HTML DOM extraction with `symfony/dom-crawler`.

### Final Decision:
- Routed the scraper to an accessible, real-world scrapable eCommerce store (`scrapingcourse.com/ecommerce` / accessible Shopify storefront HTML) with 188 products, clean DOM structure, and high-resolution images to validate the entire end-to-end pipeline (Go proxy rotation → Laravel scraping engine → MySQL upsert → Next.js polling) until an ethical, compliant method is established to navigate enterprise marketplace anti-bot protections.

---

## Phase 2 — Frontend, Auto-Scraping & Product Accumulation

### Frontend (Next.js)
- Built `ProductCard` component with image, title, and price display
- Built `ProductSkeleton` component for loading state placeholder grid
- Built `Navbar`, `ErrorBanner`, and `EmptyState` shared components
- Built `/products` page with responsive grid layout and 30-second client-side poll using `setInterval`
- Configured `next.config.ts` with wildcard `remotePatterns` for both `http` and `https` to allow all image sources from the scraper
- Added `suppressHydrationWarning` to `<html>` and `<body>` in `app/layout.tsx` to suppress false hydration mismatch warnings caused by browser extensions injecting custom attributes (e.g. `data-gptw`)
- Cleared boilerplate from `app/page.tsx` — root redirects to `/products`
- Added `Product` TypeScript type definition in `frontend/types/product.ts`

### Backend — Auto-Scrape on First Request
- Initial prototype included auto-scrape on empty DB; refactored in Phase 3 to maintain pure REST read-only idempotency.
- `ScrapeProducts` command refactored to run as a **continuous 30-second loop by default** (no flags needed); `--once` flag retained for single-run CI/testing scenarios; `--interval` flag for custom cadence.

### Backend — Paginated Product Accumulation
- `ScraperService` refactored from a single-target cascade to a **page-rotating architecture**:
  - The site exposes 12 catalog pages (~16 products each = 188 total unique products)
  - Current page pointer persisted in `storage/app/scraper_page.txt` — survives process restarts
  - Each 30-second scrape cycle advances to the next page (1 → 2 → … → 12 → 1 → …)
  - `updateOrCreate` on `source_url` unique index ensures **zero duplicates** — only genuinely new products are inserted

### Developer Experience — `php artisan dev:start`
- `DevStart` Artisan command launches both services from a single terminal:
  1. Spawns `php artisan scrape:products --interval=30` as a **detached background process** (Windows-safe via `cmd /c start /b "" "php" "artisan" ...` with explicit empty title to prevent Windows shell opening `artisan` as a document)
  2. Starts `php artisan serve` in the foreground
- `--port` and `--interval` options available for customization
- Full three-service startup:
  ```bash
  # Terminal 1 — Go Proxy Microservice
  cd proxy-service && go run main.go

  # Terminal 2 — Backend API + Background Scraper
  cd backend && php artisan dev:start

  # Terminal 3 — Next.js Frontend
  cd frontend && bun dev
  ```

---

## Phase 3 — Spec Compliance Audit & Documentation Suite

### 1. Database & REST API Refinement
- **MySQL Default**: Configured `backend/.env` and `backend/.env.example` to default to MySQL (`DB_CONNECTION=mysql`, `DB_DATABASE=scraper_service_backend`), with SQLite documented as an optional zero-config alternative.
- **Pure Read-Only API**: Removed any scraping side-effects from `ProductApiController@index`. GET `/api/products` is strictly read-only and idempotent.
- **Bare Endpoint Full Data**: `GET /api/products` without query parameters returns the complete stored product collection (`total` count metadata) shuffled via `inRandomOrder()` for natural variety across 30-second poll cycles. Optional pagination (`?page=1&per_page=20`) and search/sort filters remain supported.

### 2. Comprehensive Documentation Suite
Structured and populated individual `docs/` folders for all three services:
- **`backend/docs/`**:
  - `plan.md`: Architectural specification, MySQL schema, API routes, and scraper lifecycle.
  - `implementation.md`: Code-level details of `ScraperService`, `ProxyIdentityClient`, `ProductApiController`, `dev:start`, and Pest tests.
- **`frontend/docs/`**:
  - `plan.md`: Next.js 15 App Router architecture, backend-driven search/sort query integration, top pagination design, and image ratio handling.
  - `implementation.md`: 30-second polling cycle with countdown ticker, 400ms debounced search, `aspect-square` + `object-contain` image styling, top/bottom pagination, Tailwind styling, and Bun dev workflow.
- **`proxy-service/docs/`**:
  - `plan.md`: Go microservice architecture, 5 proxy labels, and 10 browser fingerprint profiles.
  - `implementation.md`: Thread-safe `sync.Mutex` round-robin rotator, HTTP endpoints, and concurrency unit test suite.

### 3. Automated Test Verification
- All 9 backend Pest tests passing (`ProductApiTest`, `ProxyIdentityClientTest`, `ScraperTest`).
- Verified Go microservice tests (`go test ./...`) passing under parallel execution.

---

### 1. Unified Cross-Platform Setup Scripts
- **`scripts/setup.js` (`npm run setup` / `bun run setup`)**: Cross-platform Node.js automation script verifying PHP (8.2+), Composer (including `composer.bat`), Go (1.21+), and Bun/npm. Installs backend dependencies, runs database migrations with interactive SQLite fallback on failure, installs frontend dependencies, and sets up workspace packages.
- **`scripts/setup.bash`**: Bash equivalent with matching environment checks and dynamic fallback logic.

### 2. Migration-Driven Database Fallback
- If `php artisan migrate` fails due to MySQL being unavailable or unconfigured, the setup script prompts the user to switch to SQLite.
- Upon confirmation, it dynamically updates `backend/.env`, creates `backend/database/database.sqlite`, and retries migrations automatically.

### 3. Unified Concurrent Runner & Error Handling
- **`scripts/run.bash`**: Validates PHP, Go, and detects `bunx` / `npx`. Launches the Go microservice (`:9000`), Laravel backend + scraper (`:8000`), and Next.js UI (`:3000`) concurrently.
- **Fail-Fast & Process Termination**: Configured with `--kill-others` (`-k`) and `--kill-others-on-fail`. If any service crashes, encounters a fatal runtime error, or terminates, all other services are immediately stopped and the error is printed to stdout.
- **Root `package.json`**: Exposes `npm run dev` and `bun dev` with matching fail-safe concurrency configuration.

### 4. Root Documentation Suite (`docs/`)
- **`docs/plan.md`**: High-level system architecture, multi-tier service topology, resilience matrix, and REST data contracts.
- **`docs/implementation.md`**: Project directory map, setup script execution lifecycle, concurrent runner mechanics, port allocations, and multi-terminal running instructions.


