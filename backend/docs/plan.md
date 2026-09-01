# Backend Architecture & Technical Specification

## 1. Overview
The `backend` is a Laravel 12 application responsible for:
1. Managing the `Product` data model and MySQL / SQLite persistence.
2. Interfacing with `proxy-service` to retrieve rotating browser fingerprint identities and proxy labels.
3. Scraping eCommerce product data through an Artisan command (`php artisan scrape:products`) with page-rotation and deduplication.
4. Exposing a clean, read-only REST API (`GET /api/products` and `GET /api/products/{product}`) with CORS enabled for the Next.js frontend.
5. Providing a developer experience command (`php artisan dev:start`) to launch both the background scraping worker and the HTTP server simultaneously.

---

## 2. Technical Stack
- **Framework**: Laravel 12 (PHP 8.2+ / 8.3+)
- **Database**: MySQL 8.x / MariaDB (default) with zero-config SQLite support
- **HTML Parsing**: `symfony/dom-crawler` and `symfony/css-selector`
- **HTTP Client**: Laravel `Http` facade (Guzzle)
- **Testing**: Pest PHP test framework

---

## 3. Database Schema & Models

### 3.1 Migration (`products` table)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | Unique internal ID |
| `title` | VARCHAR(255) | NOT NULL | Product title / name |
| `price` | DECIMAL(10,2) | NULLABLE | Parsed numerical price |
| `image_url` | VARCHAR(255) | NULLABLE | Absolute image asset URL |
| `source_url` | VARCHAR(255) | UNIQUE, NOT NULL | Canonical source URL (used for deduplication / idempotent upsert) |
| `created_at` | TIMESTAMP | NULLABLE | Record creation timestamp |
| `updated_at` | TIMESTAMP | NULLABLE | Record last update timestamp |

### 3.2 `Product` Eloquent Model
- **File**: `app/Models/Product.php`
- **Fillable fields**: `['title', 'price', 'image_url', 'source_url']`
- **Casts**: `['price' => 'decimal:2']`

---

## 4. Scraping Engine Architecture

### 4.1 Browser Identity Rotation
- The scraper communicates with the Go `proxy-service` at `http://localhost:9000/next-identity` before making catalog requests.
- Rotates realistic `User-Agent`, `Accept`, `Accept-Language`, and `Sec-Fetch-Mode` headers.

### 4.2 Page Rotation & Accumulation
- Target website: `https://www.scrapingcourse.com/ecommerce/` (12 paginated catalog pages, ~188 unique products).
- Scraper state pointer persisted in `storage/app/scraper_page.txt` (rotates pages 1 through 12 continuously).
- Each 30s cycle scrapes the active page and upserts records using `Product::updateOrCreate(['source_url' => $url], [...])`.

---

## 5. API Specification

### 5.1 List Products: `GET /api/products`
- **Controller**: `App\Http\Controllers\ProductApiController@index`
- **Behavior**: Strictly read-only.
- **Default (Bare)**: Returns all stored products with total count metadata, ordered randomly (`inRandomOrder()`) to provide fresh variety across 30-second poll cycles.
- **Optional Query Parameters**:
  - `page` (int) & `per_page` (int): Enables pagination.
  - `search` (string): Filters by title or source URL (`LIKE %query%`, disables random order, defaults to `id desc`).
  - `sort_price` (`asc`|`desc`): Sorts by price.
  - `sort_date` (`asc`|`desc`): Sorts by creation date.

### 5.2 Single Product: `GET /api/products/{product}`
- **Controller**: `App\Http\Controllers\ProductApiController@show`
- **Response**: `200 OK` with `{ "data": { ... } }` or `404 Not Found` with `{ "message": "Product not found" }`.

---

## 6. Developer Commands
1. `php artisan scrape:products`: Continuous 30-second scraper loop (`--once` for single run, `--interval=N` for custom interval).
2. `php artisan dev:start`: Spawns the background scraper daemon and runs `php artisan serve` in foreground.
3. `php artisan test`: Runs the automated Pest feature test suite.
