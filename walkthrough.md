# Project Walkthrough

- Initialized root project repository with `README.md`
- Created Laravel 12 backend application in `backend`
- Created Next.js 15 frontend application with Tailwind CSS in `frontend`
- Initialized Go module for microservice in `proxy-service`
- Added technical architecture plan in `proxy-service/docs/plan.md`
- Implemented Go proxy rotation microservice in `proxy-service/main.go` with passing unit tests
- Added technical architecture plan in `backend/docs/plan.md`
- Created `Product` Eloquent model and migration (`products` table with `source_url` unique index)

## Challenges Faced: Anti-Bot Defenses & Target Resolution

### Issues Encountered During Target Testing:
- **Jumia Egypt**: Blocked server-side Guzzle requests with `HTTP 403 Forbidden` due to Cloudflare JavaScript challenges (`challenges.cloudflare.com`).
- **Amazon Egypt**: Researched real browser header sets via Grok and passed complete browser fingerprints (`User-Agent`, `Accept`, `Accept-Language`, `Sec-Fetch-Mode`), but encountered silent TCP connection timeouts caused by enterprise firewall blocking. Kept in scraper cascade with a 5s fast-fail.
- **Noon & eBay**: Evaluated large-scale eCommerce targets — Noon requires full client-side SPA rendering with WAF protection; eBay immediately returned `HTTP 403` with Akamai Bot Manager reference errors.
- **Ethical & Scope Boundary**: Ruled out stealth headless browser automation, residential IP networks, and TLS fingerprint spoofing due to Terms of Service violations and disproportionate trial scope. Also ruled out querying direct `/products.json` endpoints to adhere strictly to the requirement of testing genuine HTML DOM extraction with `symfony/dom-crawler`.

### Final Decision:
- Routed the scraper to an accessible, real-world scrapable eCommerce store (`scrapingcourse.com/ecommerce` / accessible Shopify storefront HTML) with 188 products, clean DOM structure, and high-resolution images to validate the entire end-to-end pipeline (Go proxy rotation -> Laravel scraping engine -> MySQL upsert -> Next.js polling) until an ethical, compliant method is established to navigate enterprise marketplace anti-bot protections.
