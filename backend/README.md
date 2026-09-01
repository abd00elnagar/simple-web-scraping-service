# Backend Service (Laravel 12)

The backend service is a Laravel 12 application responsible for product data persistence, browser identity consumer logic, catalog web scraping, and providing the read-only REST API.

---

## Key Features

- **Read-Only REST API**: Serves randomized product listings, search/sort filters, pagination, and single-item endpoints at `/api/products`.
- **Scraping Engine**: Continuous 30-second catalog scraper (`php artisan scrape:products`) with page rotation (12 pages, ~188 products) and idempotent upserts.
- **Proxy Identity Consumer**: Interfaces with `proxy-service` (`http://localhost:9000/next-identity`) for rotated browser header sets.
- **Concurrent Dev Runner**: `php artisan dev:start` starts the background scraper daemon and HTTP API server simultaneously.

---

## Directory Structure

```
backend/
├── app/
│   ├── Console/Commands/
│   │   ├── DevStart.php             # Detached background scraper + API server
│   │   └── ScrapeProducts.php       # Continuous 30s scraper CLI command
│   ├── Http/Controllers/
│   │   └── ProductApiController.php  # Read-only REST API controller
│   ├── Models/
│   │   └── Product.php              # Eloquent model with decimal price cast
│   └── Services/
│       ├── ProxyIdentityClient.php  # Interfaces with Go proxy service
│       └── ScraperService.php       # DomCrawler parser & idempotent upsert
├── config/                          # CORS, database, and app configs
├── database/migrations/             # Products schema migration
├── docs/
│   ├── plan.md                      # Backend architecture specification
│   └── implementation.md            # Backend implementation guide
├── routes/api.php                   # API route definitions
└── tests/Feature/                   # Pest test suite
```

---

## Quick Commands

```bash
# Install PHP dependencies
composer install

# Generate application key
php artisan key:generate

# Run database migrations (MySQL or SQLite)
php artisan migrate

# Recommended: Run server + background scraper
php artisan dev:start

# Or run scraper manually
php artisan scrape:products

# Run test suite
php artisan test
```

For full details, see [backend/docs/plan.md](docs/plan.md) and [backend/docs/implementation.md](docs/implementation.md).
