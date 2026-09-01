# System Implementation & Orchestration Guide

## 1. Project Directory Structure

```
simple-web-scraping-service/
├── docs/                        # Root architecture and implementation docs (this folder)
│   ├── plan.md                  # High-level architecture & data contracts
│   └── implementation.md        # Orchestration, setup scripts, and environment details
├── backend/                     # Laravel 12 API & Scraping Engine
│   ├── app/                     # Controllers, Models, Services, Console Commands
│   ├── config/                  # Database, CORS, and Service configurations
│   ├── database/migrations/     # Products table schema
│   ├── docs/                    # Backend plan.md and implementation.md
│   ├── routes/api.php           # REST API routes
│   └── tests/Feature/           # Pest feature test suite
├── frontend/                    # Next.js 15 Product Browser UI
│   ├── app/                     # App router pages & layouts
│   ├── components/              # Navbar, ProductCard, ErrorBanner, EmptyState, Skeleton
│   ├── docs/                    # Frontend plan.md and implementation.md
│   └── types/                   # TypeScript interfaces
├── proxy-service/               # Go Browser Identity Rotation Microservice
│   ├── docs/                    # Proxy service plan.md and implementation.md
│   ├── main.go                  # HTTP server & sync.Mutex round-robin rotator
│   └── main_test.go             # Concurrency test suite
├── scripts/                     # Cross-platform automation scripts
│   ├── setup.js                 # Cross-platform Node.js automated setup script
│   ├── setup.bash               # Unified Bash automated setup script
│   └── run.bash                 # Unified concurrent runner script
├── package.json                 # Root npm/bun runner configuration
├── walkthrough.md               # Project development chronicle
└── README.md                    # Project overview & running instructions
```

---

## 2. Automated Setup Script Workflow (`npm run setup` / `scripts/setup.js`)

The setup automation (`npm run setup` / `bun run setup` or `bash scripts/setup.bash`) executes the following pipeline:

1. **System Prerequisite Validation**:
   - `php`: Requires version >= 8.2 (fails with download link if missing).
   - `composer`: Verifies Composer is available in PATH.
   - `go`: Verifies Go (1.21+) is available in PATH (fails with `https://go.dev/dl/` if missing).
   - `bun` / `npm`: Detects `bun` first; seamlessly falls back to `npm` if Bun is absent.

2. **Go Proxy Microservice Setup**:
   - Executes `go mod tidy` in `proxy-service/`.

3. **Backend Setup & Dynamic SQLite Fallback**:
   - Creates `backend/.env` from `.env.example` if not present.
   - Runs `php artisan key:generate`.
   - Runs `composer install --no-interaction`.
   - Executes `php artisan migrate --force`:
     - If MySQL succeeds: Continues normally.
     - If MySQL fails (e.g. database offline): Prompts the user to switch to SQLite.
     - Upon confirmation: Updates `.env` to `DB_CONNECTION=sqlite`, creates `database.sqlite`, and retries migrations automatically.

4. **Frontend Setup**:
   - Creates `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000/api` if absent.
   - Installs dependencies via `bun install` (or `npm install`).

5. **Root Dependencies Setup**:
   - Installs root workspace dependencies (`concurrently`) via `bun install` or `npm install`.

---

## 3. Multi-Service Execution

### Option A — Single-Command Concurrent Runner (Recommended)

Start all three services concurrently with unified, color-coded logging and failure trapping:

```bash
bash scripts/run.bash
```

**Via Bun / Node:**
```bash
bun dev
# or: npm run dev
```

This starts:
- `[proxy]` Go microservice on port `:9000`
- `[backend]` Laravel API server + continuous scraper on port `:8000`
- `[frontend]` Next.js UI on port `:3000`

Press `Ctrl+C` to terminate all services at once.

---

### Option B — Dedicated Terminal Execution

```bash
# Terminal 1 — Go Proxy Microservice (:9000)
cd proxy-service && go run main.go

# Terminal 2 — Laravel API Backend & Background Scraper (:8000)
cd backend && php artisan dev:start

# Terminal 3 — Next.js Frontend (:3000)
cd frontend && bun dev # or: npm run dev
```

Visit **http://localhost:3000** to interact with the live product catalog.
