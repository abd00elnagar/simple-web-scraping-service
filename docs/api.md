# REST API Reference

Base URL: `http://localhost:8000/api`

This document details all available HTTP endpoints, query parameters, request schemas, and response formats for the backend API and proxy microservice.

---

## Backend API Endpoints

### 1. `GET /api/products`

Retrieves scraped products stored in the database.

- **Read-Only**: Strictly reads from the database with no scraping side-effects.
- **Default Behavior**: When no query parameters are provided, returns the entire product collection randomized (`inRandomOrder()`) with total count metadata. This provides dynamic variety across 30-second poll cycles.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | `string` | — | Filter products matching `title` or `source_url` (uses `LIKE %query%`, orders by `id desc`) |
| `sort_price` | `string` | — | Sort by price: `asc` (low to high) or `desc` (high to low) |
| `sort_date` | `string` | — | Sort by creation date: `desc` (newest first) or `asc` |
| `page` | `integer` | — | Page number for paginated results |
| `per_page` | `integer` | `20` | Number of items per page when pagination is active |

---

#### Example Responses

##### Bare Collection Response (`GET /api/products`)

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

##### Paginated Response (`GET /api/products?page=1&per_page=20`)

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
    "current_page": 1,
    "from": 1,
    "last_page": 10,
    "per_page": 20,
    "to": 20,
    "total": 188
  }
}
```

---

### 2. `GET /api/products/{id}`

Retrieves a single product by its database ID.

#### Response `200 OK`

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

#### Response `404 Not Found`

```json
{
  "message": "Product not found"
}
```

---

## Proxy Microservice Endpoints

Base URL: `http://localhost:9000`

### `GET /next-identity`

Returns the next sequentially rotated browser fingerprint identity and proxy label.

- **Method**: `GET` (non-GET requests return `405 Method Not Allowed`)
- **Concurrency**: Thread-safe (`sync.Mutex`)

#### Response `200 OK`

```json
{
  "proxy_label": "proxy-1",
  "headers": {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Mode": "navigate"
  }
}
```
