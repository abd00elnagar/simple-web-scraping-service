# Backend Implementation Guide

## 1. Directory Structure

```
backend/
├── app/
│   ├── Console/Commands/
│   │   ├── DevStart.php            # Starts scraper in background + php artisan serve
│   │   └── ScrapeProducts.php      # Continuous/single-run scraper CLI command
│   ├── Http/Controllers/
│   │   └── ProductApiController.php # REST API controller for products (index, show)
│   ├── Models/
│   │   └── Product.php             # Eloquent model with casts and mass-assignment rules
│   └── Services/
│       ├── ProxyIdentityClient.php # Communicates with Go proxy-service for headers
│       └── ScraperService.php      # Scrapes eCommerce pages via DomCrawler and upserts
├── config/
│   ├── cors.php                    # Configured for localhost:3000
│   └── database.php                # Database connections (MySQL default, SQLite optional)
├── database/migrations/
│   └── 2026_08_31_185950_create_products_table.php # Products schema definition
├── routes/
│   └── api.php                     # Route definitions (/api/products)
└── tests/Feature/
    ├── ProductApiTest.php          # API endpoints test suite
    ├── ProxyIdentityClientTest.php # Proxy service integration tests
    └── ScraperTest.php             # Deduplication and HTML parsing tests
```

---

## 2. Core Implementation Details

### 2.1 Database & Model (`Product.php`)
- Migration establishes a `products` table in MySQL with columns:
  - `id` (bigint auto-increment)
  - `title` (string)
  - `price` (decimal 10, 2 nullable)
  - `image_url` (string nullable)
  - `source_url` (string unique, index)
  - `created_at` / `updated_at` (timestamps)
- The model enforces decimal casting for consistent numerical formatting in JSON responses.

### 2.2 Proxy Identity Client (`ProxyIdentityClient.php`)
- Sends an HTTP GET request to `http://localhost:9000/next-identity` with a 5-second timeout.
- Extracts `proxy_label` and request headers (`User-Agent`, `Accept`, `Accept-Language`, `Sec-Fetch-Mode`).
- Throws a descriptive `RuntimeException` with troubleshooting guidance if the Go proxy service is offline.

### 2.3 Scraper Service (`ScraperService.php`)
- Maintains catalog page pointer in `storage/app/scraper_page.txt` to rotate across all 12 catalog pages (188 products).
- Uses `Illuminate\Support\Facades\Http::withHeaders()` (Guzzle underneath) to download catalog HTML with rotated fingerprints.
- Uses `Symfony\Component\DomCrawler\Crawler` to extract:
  - **Title**: `h2.woocommerce-loop-product__title`
  - **Price**: `span[data-testid="product-price"] bdi` (sanitized to remove currency symbols)
  - **Image URL**: `img.product-image`
  - **Source URL**: `a.woocommerce-LoopProduct-link`
- Performs idempotent upserting:
  ```php
  Product::updateOrCreate(
      ['source_url' => $data['source_url']],
      [
          'title'     => $data['title'],
          'price'     => $data['price'],
          'image_url' => $data['image_url'],
      ]
  );
  ```

### 2.4 REST API Controller (`ProductApiController.php`)
- **Read-Only**: Strictly queries and returns data without background scraping side-effects.
- **Bare Request (`GET /api/products`)**:
  Returns all products in database with total count metadata.
- **Paginated Request (`GET /api/products?page=1&per_page=20`)**:
  Returns paginated chunk with metadata (`current_page`, `last_page`, `per_page`, `total`).
- **Filtering & Sorting**:
  Supports `search`, `sort_price=asc|desc`, and `sort_date=asc|desc`.

---

## 3. Developer Commands (`DevStart` & `ScrapeProducts`)

### 3.1 `php artisan dev:start`
Located in `app/Console/Commands/DevStart.php`.
- Automatically spawns `php artisan scrape:products --interval=30` as a detached background worker process on both Windows (`cmd /c start /b ...`) and Unix (`nohup ... &`).
- Immediately launches `php artisan serve --port=8000` in the current foreground terminal.
- Flags:
  - `--port=8000`: Changes API server port.
  - `--interval=30`: Adjusts scrape loop interval in seconds.

### 3.2 `php artisan scrape:products`
Located in `app/Console/Commands/ScrapeProducts.php`.
- Runs continuously in a 30-second loop by default.
- Logs cycle progress, rotated proxy label, User-Agent, and upserted product counts to the terminal.
- Flags:
  - `--once`: Executes a single scrape pass and exits (used in tests and CI).
  - `--interval=N`: Custom sleep interval between scrape cycles.

---

## 4. Verification & Testing

Run the full Pest feature test suite:
```bash
php artisan test
```
Covers:
1. `ProductApiTest`: Bare list query, paginated query, single item query, and 404 response.
2. `ProxyIdentityClientTest`: Identity payload decoding and offline error handling.
3. `ScraperTest`: DOM extraction accuracy, price formatting, and duplicate rejection.
