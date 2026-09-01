# System Architecture & Technical Plan

## 1. High-Level Overview
The **Simple Web Scraping Service** is a decoupled full-stack scraping pipeline composed of three specialized services:

```
┌───────────────────────────────┐
│     Go Proxy Microservice     │
│     Port: 9000                │
│     Rotates User-Agents &     │
│     browser header profiles   │
└───────────────┬───────────────┘
                │ HTTP GET /next-identity
                ▼
┌───────────────────────────────┐        MySQL / SQLite
│      Laravel 12 Backend       │ ────────────────────────► [ Database: products ]
│      Port: 8000               │
│      - 30s catalog scraping   │
│      - Idempotent upsert      │
│      - Read-only REST API     │
└───────────────▲───────────────┘
                │ HTTP GET /api/products (polling / query)
┌───────────────┴───────────────┐
│      Next.js 16 Frontend      │
│      Port: 3000               │
│      - 30s live auto-polling  │
│      - Top pagination (30/pg) │
│      - Search & sort filters  │
└───────────────────────────────┘
```

---

## 2. Service Separation & Responsibilities

| Service | Technology | Port | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **`proxy-service`** | Go 1.21+ (Standard Library) | `:9000` | Maintains thread-safe pool of 10 browser identity profiles and 5 proxy labels; serves rotated fingerprints via `GET /next-identity`. |
| **`backend`** | Laravel 12 (PHP 8.2+) | `:8000` | Orchestrates 30s scraper cycles across 12 catalog pages (188 products), deduplicates records via `source_url` unique index, and provides the read-only REST API. |
| **`frontend`** | Next.js 16, React 19, Tailwind CSS v4 | `:3000` | Renders responsive product catalog, dispatches debounced search/sort queries to backend, executes 30s live auto-refresh with countdown, and provides top pagination. |

---

## 3. Resilience & Fallback Matrix

1. **Database Fallback (MySQL ↔ SQLite)**:
   - Default: MySQL (`127.0.0.1:3306`, database `scraper_service_backend`).
   - Fallback: If `php artisan migrate` encounters an unreachable MySQL host, the setup script (`scripts/setup.js` / `scripts/setup.bash`) prompts to switch to zero-config SQLite, creating `database.sqlite` and running migrations automatically.
2. **Package Manager Fallback (Bun ↔ npm)**:
   - Primary: Bun.
   - Fallback: If `bun` is not installed, the setup scripts and concurrent runner fall back seamlessly to `npm install` and `npm run dev`.
3. **Identity Rotation Fallback**:
   - The Laravel scraper requests fresh browser profiles from `proxy-service` (`http://localhost:9000/next-identity`) before every page scrape.
   - If the Go service is offline, descriptive runtime exceptions pinpoint the service status and troubleshooting steps.

---

## 4. REST API & Data Contracts

- **Base URL**: `http://localhost:8000/api`
- **`GET /api/products`**:
  - Without params: Returns all products randomized (`inRandomOrder()`) with `{ "meta": { "total": <count> } }`.
  - With `search=<query>`: Filters titles and URLs using MySQL `LIKE %query%` and orders by `id desc`.
  - With `sort_price=asc|desc`: Numerical price ordering.
  - With `sort_date=asc|desc`: Creation date ordering (`created_at`).
  - With `page=<n>&per_page=<n>`: Paginated subset with complete pagination metadata (`current_page`, `from`, `last_page`, `per_page`, `to`, `total`).
- **`GET /api/products/{id}`**: Returns single product object `{ "data": { ... } }` or 404 `{ "message": "Product not found" }`.
