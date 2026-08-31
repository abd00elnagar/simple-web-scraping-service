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

1. **Go Proxy Service** maintains a pool of realistic browser identity fingerprints (User-Agent, Accept headers, Sec-Fetch headers, etc.) and exposes them via a round-robin HTTP endpoint. This prevents the scraper from presenting an identical fingerprint on every request.

2. **Laravel Backend** runs a continuous 30-second scrape loop (`php artisan scrape:products`). Each iteration:
   - Fetches the next browser identity from the Go proxy
   - Scrapes the next catalog page from the target site (rotates pages 1–12, ~16 products each)
   - Upserts products keyed on `source_url` — no duplicates, append-only accumulation
   - Exposes a paginated, randomised `/api/products` JSON endpoint

3. **Next.js Frontend** polls `/api/products` every 30 seconds, displaying the latest randomised product set in a responsive card grid.

---

## Prerequisites

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| PHP | 8.3+ | Laravel backend |
| Composer | 2.x | PHP dependency management |
| Go | 1.21+ | Proxy microservice |
| Node.js | 18+ | Next.js frontend |
| Bun | 1.x | Frontend package manager & dev server |

> **MySQL** can be used instead of SQLite — see [Database Configuration](#database-configuration).

---

## Project Structure

```
simple-web-scraping-service/
├── backend/          # Laravel 12 API + Scraper engine
├── frontend/         # Next.js 15 product browser UI
├── proxy-service/    # Go browser-identity rotation microservice
└── walkthrough.md    # Development journal
```

---

## Setup & Running

### 1. Go Proxy Service

```bash
cd proxy-service

# Run directly (no build required)
go run main.go

# OR use the pre-built binary (Windows)
./proxy-service.exe
```

Starts on **http://localhost:9000**.

Endpoints:
- `GET /identity` — returns a rotating browser fingerprint JSON object
- `GET /health` — liveness check

Run tests:
```bash
go test ./...
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

The app uses **SQLite by default** (zero config — the file is auto-created).

To use **MySQL** instead, edit `backend/.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=scraping_service
DB_USERNAME=root
DB_PASSWORD=your_password
```

Then create the database manually:
```sql
CREATE DATABASE scraping_service CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### Run migrations

```bash
php artisan migrate
```

#### Start the server

**Option A — Recommended: single command that starts both the server AND the scraper loop:**

```bash
php artisan dev:start
```

This spawns `scrape:products` as a detached background process and then starts the HTTP server on port 8000.

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
- `ProductApiTest` — index pagination, show 200/404, empty DB auto-scrape trigger
- `ScraperTest` — idempotent upsert (no duplicates on re-scrape)
- `ProxyIdentityClientTest` — correct header forwarding from Go service

---

### 3. Next.js Frontend

#### First-time setup

```bash
cd frontend

# Install dependencies
bun install
```

#### Environment

The frontend reads the API URL from `.env.local`. This file is already present in the repo:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

If you run the backend on a different port, update this value.

#### Start the dev server

```bash
bun dev
```

Frontend runs on **http://localhost:3000**.

Navigating to `/` redirects automatically to `/products`.

---

## Running All Three Services Together

Open **three terminals**:

```bash
# Terminal 1 — Go proxy (browser identity rotation)
cd proxy-service
go run main.go

# Terminal 2 — Laravel API + background scraper
cd backend
php artisan dev:start

# Terminal 3 — Next.js frontend
cd frontend
bun dev
```

Then open **http://localhost:3000** in your browser.

On the very first request to `/api/products`, if the database is empty, the backend triggers an immediate scrape so you see data straight away. Subsequent scrapes happen automatically every 30 seconds in the background, walking through the 12 catalog pages one per cycle until all ~188 products are accumulated.

---

## API Reference

Base URL: `http://localhost:8000/api`

### `GET /api/products`

Returns a **randomised**, paginated list of scraped products.

**Query parameters:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `page` | `1` | Page number |
| `per_page` | `20` | Items per page |

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "title": "Fjallraven - Foldsack No. 1 Backpack",
      "price": "109.95",
      "image_url": "https://...",
      "source_url": "https://scrapingcourse.com/ecommerce/product/...",
      "created_at": "2026-09-01T00:00:00.000000Z",
      "updated_at": "2026-09-01T00:00:00.000000Z"
    }
  ],
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
{ "data": { "id": 1, "title": "...", ... } }
```

**Response `404`:**
```json
{ "message": "Product not found" }
```

---

## Scraper Architecture

### Page Rotation

The scraper tracks which catalog page it last scraped in `backend/storage/app/scraper_page.txt`. Each run advances the pointer by one:

```
Run 1  →  page 1  (products  1–16)
Run 2  →  page 2  (products 17–32)
...
Run 12 →  page 12 (products 177–188)
Run 13 →  page 1  (cycle repeats, all upserts, zero new inserts)
```

Delete `scraper_page.txt` to reset the pointer to page 1.

### Deduplication

Products are keyed on `source_url` (unique index). `updateOrCreate` ensures re-scraping the same page refreshes title/price/image data without creating duplicate rows.

### Browser Fingerprint Rotation

The Go proxy maintains a pool of realistic browser identities and cycles through them on each `/identity` request. The Laravel scraper fetches a fresh identity before every HTTP request, varying:

- `User-Agent`
- `Accept`
- `Accept-Language`
- `Sec-Fetch-Mode` / `Sec-Fetch-Dest` / `Sec-Fetch-Site`
- `Cache-Control`

### Anti-Bot Target History

| Target | Result | Reason |
|--------|--------|--------|
| Jumia Egypt | ❌ 403 | Cloudflare JS challenge |
| Amazon Egypt | ❌ Timeout | Enterprise firewall TCP block |
| eBay | ❌ 403 | Akamai Bot Manager |
| Noon | ❌ N/A | Client-side SPA + WAF |
| **scrapingcourse.com/ecommerce** | ✅ 200 | Open WooCommerce demo store, 188 products |

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_KEY` | *(generated)* | Laravel encryption key — run `php artisan key:generate` |
| `APP_URL` | `http://localhost:8000` | Backend base URL |
| `DB_CONNECTION` | `sqlite` | `sqlite` or `mysql` |
| `DB_DATABASE` | `database/database.sqlite` | SQLite path or MySQL database name |
| `DB_HOST` | `127.0.0.1` | MySQL host (MySQL only) |
| `DB_PORT` | `3306` | MySQL port (MySQL only) |
| `DB_USERNAME` | — | MySQL username (MySQL only) |
| `DB_PASSWORD` | — | MySQL password (MySQL only) |
| `LOG_LEVEL` | `debug` | Laravel log verbosity |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` | Laravel API base URL |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Scraper engine | Laravel 12 (PHP 8.3), `symfony/dom-crawler` |
| Database | SQLite (default) / MySQL |
| HTTP client | Laravel `Http` facade (Guzzle) |
| Proxy microservice | Go 1.21 |
| Frontend | Next.js 15, React 19, TypeScript |
| Frontend runtime | Bun |
| Styling | Tailwind CSS |
| Testing | Pest (PHP), `go test` (Go) |
