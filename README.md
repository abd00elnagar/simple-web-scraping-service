# Simple Web Scraping Service

A full-stack product scraping pipeline composed of three services that work together to continuously collect, store, and display e-commerce product data.

```
┌─────────────────────┐     HTTP      ┌──────────────────────┐     MySQL     ┌──────────────────┐
│   Go Proxy Service  │ ◄──────────── │  Laravel API Backend │ ──────────►  │   SQLite / MySQL │
│   :9000             │               │  :8000               │               │   (products)     │
│                     │               │                      │               └──────────────────┘
│  Rotates browser    │               │  Scrapes every 30s   │
│  fingerprint        │               │  Serves REST API     │
│  identities         │               │                      │
└─────────────────────┘               └──────────────────────┘
                                              ▲
                                              │ GET /api/products (every 30s)
                                      ┌───────┴──────────┐
                                      │  Next.js Frontend │
                                      │  :3000            │
                                      │                   │
                                      │  Product grid,    │
                                      │  live polling     │
                                      └───────────────────┘
```

## How It Works

1. **Go Proxy Service** maintains a pool of 10 realistic browser identity fingerprints (User-Agent, Accept, Accept-Language, Sec-Fetch headers) and 5 rotating proxy labels (`proxy-1` .. `proxy-5`), exposing them via a thread-safe round-robin HTTP endpoint (`GET /next-identity`). This prevents downstream scrapers from presenting an identical fingerprint on every request.

2. **Laravel Backend** runs a continuous 30-second scrape loop (`php artisan scrape:products`). Each iteration:
   - Fetches the next rotated browser identity from the Go proxy (`http://localhost:9000/next-identity`)
   - Scrapes the next catalog page from the target site (rotates pages 1–12, ~16 products each)
   - Upserts products keyed on `source_url` — no duplicates, append-only accumulation
   - Exposes a read-only, paginated, filterable `/api/products` JSON endpoint

3. **Next.js Frontend** polls `/api/products` every 30 seconds with a visual countdown ticker, displaying the latest product set in a responsive card grid with debounced search, sorting, and top/bottom pagination.

---

## Prerequisites

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| PHP | 8.2+ (8.3+ recommended) | Laravel backend API & scraper engine |
| Composer | 2.x | PHP dependency management |
| Go | 1.21+ | Browser identity rotation microservice |
| Node.js / Bun | Node 18+ / Bun 1.x | Next.js frontend & root runner |

> **MySQL** (default) or **SQLite** (zero-config fallback) can be used — see [Database Configuration](#database-configuration).

---

## Project Structure

```
simple-web-scraping-service/
├── docs/             # High-level architecture, implementation, and walkthrough
│   ├── plan.md
│   ├── implementation.md
│   └── walkthrough.md
├── backend/          # Laravel 12 API + Scraper engine
│   ├── docs/         # Backend plan and implementation details
│   └── ...
├── frontend/         # Next.js 16 + React 19 product browser UI
│   ├── docs/         # Frontend plan and implementation details
│   └── ...
├── proxy-service/    # Go browser-identity rotation microservice
│   ├── docs/         # Proxy service plan and implementation details
│   └── ...
├── scripts/          # Automated setup & concurrent runner scripts
│   ├── setup.js      # Cross-platform Node.js automated setup script
│   ├── setup.bash    # Cross-platform Bash automated setup script
│   └── run.bash      # Cross-platform concurrent runner script
└── package.json      # Root concurrent runner configuration
```

---

## Setup & Running

### Quick Start (Automated Setup)

Run the single automated setup command from the repository root:

**Cross-Platform (Node / Bun):**
```bash
bun run setup
# or: npm run setup
```

**Via Bash (Git Bash, WSL, Linux, macOS):**
```bash
bash scripts/setup.bash
```

> **What the setup script does automatically**:
> 1. Validates and detects system runtimes (`php`, `composer`, `go`, and `bun`/`npm`).
> 2. Sets up `proxy-service` and checks Go modules (`go mod tidy`).
> 3. Configures `backend/.env`, installs PHP dependencies, and executes database migrations. If MySQL is not reachable, it prompts to switch to SQLite automatically.
> 4. Configures `frontend/.env.local` and installs frontend and root dependencies using `bun` (with automatic fallback to `npm`).

---

### Manual Setup (Step-by-Step)

If you prefer to configure each service manually, follow the steps below:

### 1. Go Proxy Service

```bash
cd proxy-service

# Run directly (no build required)
go run main.go
```

Starts on **http://localhost:9000**.

Endpoint:
- `GET /next-identity` — returns next rotated proxy label and browser fingerprint headers

Run tests:
```bash
go test -v ./...
```

---

### 2. Laravel Backend

#### First-time setup

```bash
cd backend

# Install PHP dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate
```

#### Database Configuration

The application is configured to use **MySQL by default**:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=scraper_service_backend
DB_USERNAME=root
DB_PASSWORD=
```

Create the database in MySQL (if not already existing):
```sql
CREATE DATABASE IF NOT EXISTS scraper_service_backend CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

> **Optional Alternative (SQLite)**: If you prefer zero-config SQLite, set `DB_CONNECTION=sqlite` and `DB_DATABASE=database/database.sqlite` in `backend/.env`, create an empty `backend/database/database.sqlite` file, and run migrations.

#### Run migrations

```bash
php artisan migrate
```

#### Start the server

**Option A — Recommended: single command that starts both the server AND the scraper loop:**

```bash
php artisan dev:start
```

This spawns `scrape:products` as a detached background process and starts the HTTP server on port 8000.

Available options:
```
--port=8000       HTTP server port (default: 8000)
--interval=30     Seconds between scrape iterations (default: 30)
```

**Option B — Run separately in two terminals:**

```bash
# Terminal A: HTTP server
php artisan serve

# Terminal B: continuous scraper loop (runs forever, Ctrl+C to stop)
php artisan scrape:products

# Or run just once:
php artisan scrape:products --once

# Or set a custom interval (seconds):
php artisan scrape:products --interval=60
```

Server runs on **http://localhost:8000**.

#### Run backend tests

```bash
php artisan test
```

Test suite covers:
- `ProductApiTest` — index randomized listing, search/sort query params, pagination, show 200/404
- `ScraperTest` — HTML parsing and idempotent upsert (no duplicates on re-scrape)
- `ProxyIdentityClientTest` — correct header extraction and offline error handling

---

### 3. Next.js Frontend

#### First-time setup

```bash
cd frontend

# Install dependencies (Bun or npm)
bun install
# or: npm install
```

#### Environment

The frontend reads the API URL from `.env.local` (created automatically by setup scripts):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

If you run the backend on a different port, update this value.

#### Start the dev server

```bash
bun dev
# or: npm run dev
```

Frontend runs on **http://localhost:3000**.

Navigating to `/` renders the products catalog view at `/products`.

---

## Running All Three Services Together

### Option A — Recommended: Single-Command Concurrent Runner

Run all 3 services simultaneously with color-coded, unified logging:

```bash
bash scripts/run.bash
```

*Or via Bun / Node:*
```bash
bun dev
# or: npm run dev
```

This uses `concurrently` (with `--kill-others` and `--kill-others-on-fail`) to start:
- `[proxy]` Go microservice on `:9000`
- `[backend]` Laravel API server + 30s background scraper on `:8000`
- `[frontend]` Next.js dev server on `:3000`

Press `Ctrl+C` to stop all services simultaneously.

---

### Option B — Run Separately in Three Terminals

```bash
# Terminal 1 — Go proxy (browser identity rotation)
cd proxy-service
go run main.go

# Terminal 2 — Laravel API + background scraper
cd backend
php artisan dev:start

# Terminal 3 — Next.js frontend
cd frontend
bun dev # or: npm run dev
```

Then open **http://localhost:3000** in your browser.

---

## API Reference

Base URL: `http://localhost:8000/api`

### `GET /api/products`

Returns a list of scraped products in JSON format. Without filters or pagination parameters, products are returned in randomized order (`inRandomOrder()`) with full collection metadata (`total` count).

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | `string` | — | Filter products matching title or source URL (`LIKE %query%`, orders by `id desc`) |
| `sort_price` | `string` | — | Sort by price: `asc` (low to high) or `desc` (high to low) |
| `sort_date` | `string` | — | Sort by creation date: `desc` (newest first) or `asc` |
| `page` | `integer` | — | Page number for paginated view |
| `per_page` | `integer` | `20` | Items per page (when pagination is active) |

**Bare Collection Response (`GET /api/products`):**

```json
{
  "data": [
    {
      "id": 1,
      "title": "Abominable Hoodie",
      "price": "69.00",
      "image_url": "https://www.scrapingcourse.com/ecommerce/wp-content/uploads/2024/03/mh09-blue_main.jpg",
      "source_url": "https://www.scrapingcourse.com/ecommerce/product/abominable-hoodie/",
      "created_at": "2026-09-01T00:00:00.000000Z",
      "updated_at": "2026-09-01T00:00:00.000000Z"
    }
  ],
  "meta": {
    "total": 188
  }
}
```

**Paginated Response (`GET /api/products?page=1&per_page=20`):**

```json
{
  "data": [ ... ],
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 10,
    "per_page": 20,
    "to": 20,
    "total": 188
  }
}
```

### `GET /api/products/{id}`

Returns a single product by ID.

**Response `200`:**
```json
{
  "data": {
    "id": 1,
    "title": "Abominable Hoodie",
    "price": "69.00",
    "image_url": "https://www.scrapingcourse.com/ecommerce/wp-content/uploads/2024/03/mh09-blue_main.jpg",
    "source_url": "https://www.scrapingcourse.com/ecommerce/product/abominable-hoodie/",
    "created_at": "2026-09-01T00:00:00.000000Z",
    "updated_at": "2026-09-01T00:00:00.000000Z"
  }
}
```

**Response `404`:**
```json
{ "message": "Product not found" }
```

---

## Scraper Architecture

### Page Rotation

The scraper tracks which catalog page it last scraped in `backend/storage/app/scraper_page.txt`. Each run advances the pointer through the 12 catalog pages (~188 total products):

```
Cycle 1  →  page 1/2  (products ~1–16)
Cycle 2  →  page 3    (products ~33–48)
...
Cycle 12 →  page 12   (products ~177–188)
Cycle 13 →  page 1    (cycle repeats, all upserts, zero duplicate rows)
```

Delete `storage/app/scraper_page.txt` to reset the pointer to page 1.

### Deduplication

Products are keyed on `source_url` (unique index in database). `Product::updateOrCreate` ensures re-scraping the same page refreshes title/price/image data without creating duplicate records.

### Browser Fingerprint Rotation

The Go proxy maintains a pool of 10 realistic browser identities and 5 proxy labels, cycling through them sequentially on each `/next-identity` request. The Laravel scraper fetches a fresh identity before every HTTP request, varying:

- `User-Agent`
- `Accept`
- `Accept-Language`
- `Sec-Fetch-Mode`

### Anti-Bot Target History

| Target | Result | Reason |
|--------|--------|--------|
| Jumia Egypt | ❌ 403 | Cloudflare JS challenge (`challenges.cloudflare.com`) |
| Amazon Egypt | ❌ Timeout | Enterprise firewall silent TCP connection timeout |
| eBay | ❌ 403 | Akamai Bot Manager |
| Noon | ❌ N/A | Client-side SPA + WAF |
| **scrapingcourse.com/ecommerce** | ✅ 200 | Open WooCommerce demo store, 188 products across 12 pages |

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_KEY` | *(generated)* | Laravel encryption key — generated via `php artisan key:generate` |
| `APP_URL` | `http://localhost:8000` | Backend base URL |
| `DB_CONNECTION` | `mysql` | Database driver (`mysql` or `sqlite`) |
| `DB_HOST` | `127.0.0.1` | MySQL host (MySQL only) |
| `DB_PORT` | `3306` | MySQL port (MySQL only) |
| `DB_DATABASE` | `scraper_service_backend` | MySQL database name (or `database/database.sqlite` for SQLite) |
| `DB_USERNAME` | `root` | MySQL username (MySQL only) |
| `DB_PASSWORD` | `""` | MySQL password (MySQL only) |
| `LOG_LEVEL` | `debug` | Laravel log verbosity |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` | Laravel API base URL |

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Scraper engine & API | Laravel / PHP | Laravel 12, PHP 8.2+ (`symfony/dom-crawler`, `symfony/css-selector`) |
| Database | MySQL (default) / SQLite (fallback) | MySQL 8.x / SQLite 3 |
| HTTP client | Laravel `Http` facade | Guzzle 7.x |
| Proxy microservice | Golang | Go 1.21+ (Standard Library) |
| Frontend UI | Next.js, React, TypeScript | Next.js 16 (`16.3.3`), React 19 (`19.2.8`), TypeScript 5 |
| Frontend Styling | Tailwind CSS | Tailwind CSS v4 (`@tailwindcss/postcss: ^4`) |
| Linter & Formatter | Biome | Biome 2.4+ (`biome.json`) |
| Testing | Pest PHP, `go test` | Pest 3.x, Go testing package |
