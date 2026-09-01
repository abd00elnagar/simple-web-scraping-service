# Scraper Architecture & Target History

This document details the internal architecture, page-pointer rotation, deduplication mechanisms, anti-bot research, and proxy identity rotation implemented in the scraping service.

---

## 1. Page Rotation & Continuous Accumulation

The scraping service is designed to collect data progressively without overwhelming the target website or collecting redundant data.

```
Cycle 1  →  Page 1    (Products ~1–16)
Cycle 2  →  Page 2    (Products ~17–32)
...
Cycle 12 →  Page 12   (Products ~177–188)
Cycle 13 →  Page 1    (Cycle restarts, idempotently updates existing rows)
```

- **Pointer File**: The scraper maintains its current page pointer in `backend/storage/app/scraper_page.txt`.
- **Persistence**: This pointer survives process restarts.
- **Resetting**: Deleting `backend/storage/app/scraper_page.txt` will reset the scraper back to page 1 on its next cycle.
- **Cadence**: Scraper executes every 30 seconds by default when started via `php artisan scrape:products` or `php artisan dev:start`.

---

## 2. Idempotent Upsert & Deduplication

Products are uniquely identified by their canonical `source_url`.

- **Database Constraint**: `source_url` has a `UNIQUE` index in the `products` table.
- **Persistence Logic**: Using Laravel's `Product::updateOrCreate()`, repeated scrape cycles update existing records (refreshing title, price, image URL, and `updated_at`) rather than inserting duplicates.
- **Result**: Zero duplicate rows, with clean append-only accumulation until all 188 unique products across the 12 catalog pages are captured.

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

---

## 3. Browser Fingerprint & Proxy Rotation

To avoid static header signatures, the scraper fetches a fresh browser identity from the Go proxy microservice (`http://localhost:9000/next-identity`) prior to each page request.

### Header Profiles (10 Realistic User-Agents)
The Go service maintains 10 real-world browser profiles covering modern versions of:
- Chrome on Windows 11 & macOS Sonoma
- Firefox on Windows 11, macOS, and Linux
- Safari on macOS Sonoma and iOS 17
- Chrome on Android (Pixel 8 Pro)
- Microsoft Edge on Windows 11
- Opera on Windows 10

### Rotated Header Attributes
For each profile, the following headers are passed dynamically:
- `User-Agent`
- `Accept` (e.g. `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8`)
- `Accept-Language` (e.g. `en-US,en;q=0.9`)
- `Sec-Fetch-Mode` (`navigate`)

### Proxy Labels
Each request rotates through 5 simulated proxy identity channels (`proxy-1` through `proxy-5`).

---

## 4. Anti-Bot Target Research & History

During development, multiple large-scale eCommerce targets were tested. The findings and architectural decisions are summarized below:

| Target | Result | Root Cause & Technical Details |
|---|---|---|
| **Jumia Egypt** | ❌ 403 Forbidden | Blocked server-side Guzzle requests via Cloudflare JavaScript challenge (`challenges.cloudflare.com`). |
| **Amazon Egypt** | ❌ Timeout | Passes headers accurately, but enterprise firewalls trigger silent TCP connection timeouts. |
| **eBay** | ❌ 403 Forbidden | Akamai Bot Manager blocks non-browser TLS handshakes. |
| **Noon** | ❌ Not Scraped | Fully client-side SPA with aggressive WAF protection. |
| **scrapingcourse.com/ecommerce** | ✅ 200 OK | Real WooCommerce eCommerce store, 188 products across 12 pages, high-res assets, clean DOM. |

### Technical Decision
`scrapingcourse.com/ecommerce` was selected as the reference target to validate full end-to-end HTML parsing via `symfony/dom-crawler`, page-rotation pointer management, deduplication, and 30-second live polling without violating terms of service or requiring brittle TLS fingerprint spoofing.
