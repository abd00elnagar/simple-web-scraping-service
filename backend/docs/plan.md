# Backend Architecture & Technical Specification

## 1. Overview
The `backend` is a Laravel 12 application responsible for:
1. Managing the `Product` data model and MySQL database persistence.
2. Interfacing with `proxy-service` to retrieve rotated browser identities.
3. Scraping eCommerce product data through an Artisan command (`php artisan scrape:products`).
4. Exposing a clean, read-only REST API (`GET /api/products`) with CORS enabled for the Next.js frontend.

---

## 2. Technical Stack
- **Framework**: Laravel 12 (PHP 8.3+)
- **Database**: MySQL (with SQLite support for local/testing environments)
- **HTML Parsing**: `symfony/dom-crawler` and `symfony/css-selector`
- **HTTP Client**: Laravel `Http` (Guzzle wrapper)

---

## 3. Database Schema & Models

### 3.1 Migration (`products` table)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | Unique internal ID |
| `title` | VARCHAR(255) | NOT NULL | Product title/name |
| `price` | DECIMAL(10,2) | NULLABLE | Parsed numerical product price |
| `image_url` | VARCHAR(255) | NULLABLE | Absolute image URL |
| `source_url` | VARCHAR(255) | UNIQUE, NOT NULL | Canonical product source URL (used for deduplication/upsert) |
| `created_at` | TIMESTAMP | NULLABLE | Record creation timestamp |
| `updated_at` | TIMESTAMP | NULLABLE | Record last update timestamp |

### 3.2 `Product` Model
- Namespace: `App\Models\Product`
- `$fillable`: `['title', 'price', 'image_url', 'source_url']`
- `$casts`: `['price' => 'decimal:2']`

---

## 4. Anti-Bot Investigation & Target Selection

During development, multiple eCommerce platforms were tested against server-side HTTP requests using full browser fingerprint headers:

| Target Site | Response Code | Anti-Bot Mechanism | Verdict |
| :--- | :--- | :--- | :--- |
| **Jumia Egypt** | `HTTP 403` | Cloudflare JS challenge (`challenges.cloudflare.com`) | ❌ Blocked (requires browser JS engine) |
| **Amazon Egypt** | Timeout | Silent TCP drop / firewall block | ❌ Blocked (timed out) |
| **eBay** | `HTTP 403` | Akamai Bot Manager (Reference error page) | ❌ Blocked (fingerprint rejected) |
| **scrapingcourse.com/ecommerce** | `HTTP 200` | Static WooCommerce store (188 products) | ✅ **Selected Primary Target** |

---

## 5. Services Architecture

### 5.1 `ProxyIdentityClient`
- Communicates with `http://localhost:9000/next-identity`.
- Fetches rotated identity containing `proxy_label` and complete browser headers (`User-Agent`, `Accept`, `Accept-Language`, `Sec-Fetch-Mode`).
- Graceful fallback in case proxy service is offline.

### 5.2 `ScraperService`
- Requests rotated headers from `ProxyIdentityClient`.
- Implements a target cascade pattern.
- Extracts product data using `Symfony\Component\DomCrawler\Crawler`.
- Upserts records via `Product::updateOrCreate(['source_url' => $sourceUrl], [...])` to eliminate duplicate rows on repeated scrapes.

---

## 6. API Specification

### Endpoint: `GET /api/products`
- **Method**: `GET`
- **Controller**: `App\Http\Controllers\ProductController@index`
- **Ordering**: `updated_at DESC`
- **Response Format**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "title": "Abominable Hoodie",
        "price": "69.00",
        "image_url": "https://www.scrapingcourse.com/ecommerce/wp-content/uploads/2024/03/mh09-blue_main.jpg",
        "source_url": "https://www.scrapingcourse.com/ecommerce/product/abominable-hoodie/",
        "created_at": "2026-08-31T22:30:00.000000Z",
        "updated_at": "2026-08-31T22:30:00.000000Z"
      }
    ],
    "count": 1
  }
  ```
- **CORS**: Enabled for `http://localhost:3000`.
