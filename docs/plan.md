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
│      Next.js 15 Frontend      │
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
| **`proxy-service`** | Go 1.21+ (Standard Library) | `:9000` | Maintains thread-safe pool of 10 browser identity profiles and 5 proxy labels; serves rotated fingerprints to downstream callers. |
| **`backend`** | Laravel 12 (PHP 8.3+) | `:8000` | Orchestrates 30s scraper cycles across 12 catalog pages (188 products), deduplicates records in MySQL via `source_url`, and provides the read-only REST API. |
| **`frontend`** | Next.js 15, React 19, Tailwind | `:3000` | Renders responsive product catalog, dispatches debounced search/sort queries to backend, executes 30s live auto-refresh, and provides top pagination. |

---

## 3. Resilience & Fallback Matrix

1. **Database Fallback (MySQL ↔ SQLite)**:
   - Default: MySQL (`127.0.0.1:3306`).
   - Fallback: If `php artisan migrate` encounters an unreachable MySQL host, the setup script (`scripts/setup.bash`) prompts to switch to zero-config SQLite, creating `database.sqlite` and running migrations automatically.
2. **Package Manager Fallback (Bun ↔ npm)**:
   - Primary: Bun.
   - Fallback: If `bun` is not installed, the setup script seamlessly falls back to `npm install` and `npm run dev`.
3. **Identity Rotation Fallback**:
   - The Laravel scraper requests fresh browser profiles from `proxy-service` before every page scrape.
   - If the Go service is offline, descriptive runtime errors pinpoint the service status.

---

## 4. REST API & Data Contracts

- **Base URL**: `http://localhost:8000/api`
- **`GET /api/products`**:
  - Without params: Returns all products randomized (`inRandomOrder()`) with `{ "meta": { "total": <count> } }`.
  - With `search=<query>`: Filters titles and URLs using MySQL `LIKE`.
  - With `sort_price=asc|desc`: Numerical price ordering.
  - With `sort_date=desc`: Newest creation date ordering.
  - With `page=<n>&per_page=<n>`: Paginated subset with complete pagination metadata.
- **`GET /api/products/{id}`**: Returns single product object or 404.
