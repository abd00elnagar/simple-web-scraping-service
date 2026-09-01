# Simple Web Scraping Service

A full-stack product scraping pipeline composed of three decoupled services that work together to continuously collect, store, and display e-commerce product data.

```
┌─────────────────────┐     HTTP      ┌──────────────────────┐  MySQL / SQLite  ┌──────────────────┐
│   Go Proxy Service  │ ◄──────────── │  Laravel API Backend │ ───────────────► │   Database       │
│   :9000             │               │  :8000               │                  │   (products)     │
│                     │               │                      │                  └──────────────────┘
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

## Overview

1. **Go Proxy Service (`:9000`)**: Maintains a thread-safe pool of rotating realistic browser identities (User-Agent, Accept, Accept-Language, Sec-Fetch headers) and proxy labels via `GET /next-identity`.
2. **Laravel Backend (`:8000`)**: Runs a continuous 30-second scraping loop across catalog pages, deduplicating products via unique source URLs into MySQL/SQLite, and serves a read-only REST API.
3. **Next.js Frontend (`:3000`)**: Interactive product browser that polls the backend every 30 seconds with a live countdown ticker, debounced search, sorting, and responsive pagination.

---

## Prerequisites

Ensure the following tools are installed on your machine before running the setup script:

| Tool | Minimum Version | Purpose | Verification |
|------|-----------------|---------|--------------|
| **Node.js** / **Bun** | Node 18+ / Bun 1.x | Runs the setup script, root concurrent runner, and Next.js UI | `node -v` or `bun -v` |
| **PHP** | 8.2+ (8.3+ recommended) | Laravel 12 REST API backend & continuous scraping engine | `php -v` |
| **Composer** | 2.x | PHP dependency management for Laravel | `composer -v` |
| **Go** | 1.21+ | Browser identity rotation microservice | `go version` |
| **Database** | MySQL 8.x *(optional)* | MySQL database (zero-config SQLite fallback is automated) | `mysql --version` |

> **Note on Database**: If MySQL is not installed or running, the setup script will automatically offer to configure and migrate a local **SQLite** database with zero extra setup.

---

## Quick Start

### 1. Run Automated Setup

Run the automated setup script from the repository root. It validates system runtimes, configures `.env` and `.env.local`, installs PHP/Composer dependencies, installs frontend dependencies, and runs database migrations:

**Using Bun:**
```bash
bun run setup
```

**Using npm (Node.js):**
```bash
npm run setup
```

**Using Bash (Linux, macOS, WSL, Git Bash):**
```bash
bash scripts/setup.bash
```

### 2. Run All Services

Start all three services concurrently with unified, color-coded logging:

```bash
bun dev
# or: npm run dev
# or: bash scripts/run.bash
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser. Press `Ctrl+C` to stop all services simultaneously.

---

## Manual Setup & Individual Services

If you prefer to configure and run services individually:

### 1. Go Proxy Service (`:9000`)
```bash
cd proxy-service
go run main.go
```
*Run tests:* `go test -v ./...`

### 2. Laravel Backend (`:8000`)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate

# Recommended: starts both the HTTP API server AND background scraper:
php artisan dev:start
```
*Run tests:* `php artisan test`

### 3. Next.js Frontend (`:3000`)
```bash
cd frontend
bun install # or: npm install
bun dev     # or: npm run dev
```

---

## Project Structure

```
simple-web-scraping-service/
├── docs/             # Architecture, API, scraper, and setup documentation
├── backend/          # Laravel 12 REST API + Scraper engine
├── frontend/         # Next.js 16 + React 19 product browser UI
├── proxy-service/    # Go browser-identity rotation microservice
├── scripts/          # Automated setup & concurrent runner scripts
└── package.json      # Root concurrent runner configuration
```

---

## Documentation

Comprehensive technical documentation is organized in the [`docs/`](docs) directory:

- **[REST API Reference](docs/api.md)**: Endpoints, query parameters, schemas, and example JSON payloads.
- **[Scraper Architecture & Anti-Bot Research](docs/scraper.md)**: Page rotation pointer, idempotent deduplication, fingerprint profiles, and target defense analysis.
- **[Configuration & Environment Variables](docs/environment.md)**: `.env` configuration keys, MySQL setup, and SQLite fallback instructions.
- **[System Plan & Architecture](docs/plan.md)**: High-level design, resilience matrix, and service contracts.
- **[System Implementation Guide](docs/implementation.md)**: Setup automation workflow and service orchestration.
- **[Project Walkthrough](docs/walkthrough.md)**: Chronicle of development phases and test verifications.

### Service Deep Dives
- **Backend**: [Plan](backend/docs/plan.md) · [Implementation](backend/docs/implementation.md)
- **Frontend**: [Plan](frontend/docs/plan.md) · [Implementation](frontend/docs/implementation.md)
- **Proxy Service**: [Plan](proxy-service/docs/plan.md) · [Implementation](proxy-service/docs/implementation.md)
