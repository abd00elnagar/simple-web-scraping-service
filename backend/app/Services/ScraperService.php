<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Symfony\Component\DomCrawler\Crawler;

class ScraperService
{
    /**
     * Scraping target cascade — tried in order until one succeeds.
     *
     * Target history (tested 2026-08-31):
     * - Jumia Egypt:   HTTP 403 + Cloudflare JS challenge ("Just a moment..."). Cannot be solved
     *                  server-side. Excluded entirely.
     * - Amazon Egypt:  Silent connection timeout — no response within 5 s. Kept in cascade as
     *                  documented attempt; fast-fail timeout ensures the scraper moves on quickly.
     * - scrapingcourse.com/ecommerce: HTTP 200, 188 WooCommerce products, zero anti-bot.
     *                  Confirmed working fallback.
     */
    private const BASE_URL   = 'https://www.scrapingcourse.com/ecommerce/';
    private const TOTAL_PAGES = 12;
    private const LABEL       = 'ScrapingCourse Ecommerce';
    private const TIMEOUT     = 20;

    /**
     * Tracks which catalog page to scrape next (rotates 1 → 12 → 1 → ...).
     * Stored as a flat file in storage/app so it survives between CLI runs.
     */
    private function nextPage(): int
    {
        $file = storage_path('app/scraper_page.txt');
        $page = file_exists($file) ? (int) file_get_contents($file) : 1;
        $page = ($page >= self::TOTAL_PAGES) ? 1 : $page + 1;
        file_put_contents($file, $page);

        return $page;
    }

    private function pageUrl(int $page): string
    {
        return $page === 1
            ? self::BASE_URL
            : self::BASE_URL . 'page/' . $page . '/';
    }

    public function __construct(
        private readonly ProxyIdentityClient $proxyClient,
    ) {}

    /**
     * Run the full scrape pipeline.
     *
     * @return array{target: string, scraped: int, upserted: int, proxy_label: string, attempts: array}
     */
    public function scrape(): array
    {
        $identity = $this->proxyClient->getNextIdentity();
        $page     = $this->nextPage();
        $url      = $this->pageUrl($page);

        Log::info('[ScraperService] Starting scrape', [
            'proxy_label' => $identity['proxy_label'],
            'user_agent'  => $identity['headers']['User-Agent'],
            'page'        => $page,
            'url'         => $url,
        ]);

        [$html, $status] = $this->fetchHtml($url, $identity['headers'], self::TIMEOUT);

        $attempts = [[
            'target'  => self::LABEL . " (page {$page})",
            'url'     => $url,
            'status'  => $status,
            'success' => $html !== null,
        ]];

        if ($html === null) {
            Log::error('[ScraperService] Fetch failed.', ['status' => $status, 'url' => $url]);

            return [
                'target'      => 'none',
                'scraped'     => 0,
                'upserted'    => 0,
                'proxy_label' => $identity['proxy_label'],
                'attempts'    => $attempts,
            ];
        }

        $products = $this->parseScrapingCourse($html, $url);
        $upserted = $this->upsertProducts($products);

        Log::info("[ScraperService] Done — page {$page}", [
            'scraped'  => count($products),
            'upserted' => $upserted,
        ]);

        return [
            'target'      => self::LABEL . " (page {$page})",
            'scraped'     => count($products),
            'upserted'    => $upserted,
            'proxy_label' => $identity['proxy_label'],
            'attempts'    => $attempts,
        ];
    }

    /**
     * Make an HTTP GET request with the full rotated browser-fingerprint header set.
     *
     * @param  array<string, string>  $headers
     * @return array{0: string|null, 1: int|null}
     */
    private function fetchHtml(string $url, array $headers, int $timeout = 20): array
    {
        try {
            $response = Http::withHeaders($headers)
                ->timeout($timeout)
                ->get($url);

            $status = $response->status();

            Log::info("[ScraperService] GET {$url} → HTTP {$status}");

            if ($response->successful()) {
                return [$response->body(), $status];
            }

            return [null, $status];
        } catch (\Exception $e) {
            Log::error("[ScraperService] Request to {$url} failed: " . $e->getMessage());

            return [null, null];
        }
    }

    /**
     * Parse Amazon Egypt product listing HTML.
     * Selectors target the standard search results card structure.
     */
    private function parseAmazon(string $html, string $baseUrl): array
    {
        $crawler  = new Crawler($html);
        $products = [];

        $crawler->filter('[data-component-type="s-search-result"]')->each(function (Crawler $node) use (&$products) {
            $titleNode = $node->filter('h2 a.a-link-normal span');
            $priceNode = $node->filter('.a-price .a-offscreen')->first();
            $imageNode = $node->filter('img.s-image');
            $linkNode  = $node->filter('h2 a.a-link-normal');

            $title    = $titleNode->count() > 0 ? trim($titleNode->text()) : null;
            $price    = $priceNode->count() > 0 ? $this->parsePrice($priceNode->text()) : null;
            $imageUrl = $imageNode->count() > 0 ? $imageNode->attr('src') : null;
            $href     = $linkNode->count() > 0 ? $linkNode->attr('href') : null;

            if (! $title) {
                return;
            }

            $sourceUrl = $href
                ? (str_starts_with($href, 'http') ? $href : 'https://www.amazon.eg' . $href)
                : null;

            $products[] = [
                'title'      => $title,
                'price'      => $price,
                'image_url'  => $imageUrl,
                'source_url' => $sourceUrl,
            ];
        });

        return $products;
    }

    /**
     * Parse scrapingcourse.com/ecommerce (WooCommerce) product listing HTML.
     * Used as a confirmed fallback when real ecommerce sites block the scraper.
     *
     * Selectors verified against live HTML on 2026-08-31:
     *   li[data-products="item"]
     *     a.woocommerce-LoopProduct-link  ← href = product URL
     *       img.product-image             ← src = image URL
     *       h2.woocommerce-loop-product__title  ← title
     *     span[data-testid="product-price"] bdi  ← price
     */
    private function parseScrapingCourse(string $html, string $baseUrl): array
    {
        $crawler  = new Crawler($html);
        $products = [];

        $crawler->filter('li[data-products="item"]')->each(function (Crawler $node) use (&$products) {
            $titleNode = $node->filter('h2.woocommerce-loop-product__title');
            $priceNode = $node->filter('span[data-testid="product-price"] bdi');
            $imageNode = $node->filter('img.product-image');
            $linkNode  = $node->filter('a.woocommerce-LoopProduct-link');

            $title    = $titleNode->count() > 0 ? trim($titleNode->text()) : null;
            $price    = $priceNode->count() > 0 ? $this->parsePrice($priceNode->text()) : null;
            $imageUrl = $imageNode->count() > 0 ? $imageNode->attr('src') : null;
            $href     = $linkNode->count() > 0 ? $linkNode->attr('href') : null;

            if (! $title) {
                return;
            }

            $products[] = [
                'title'      => $title,
                'price'      => $price,
                'image_url'  => $imageUrl,
                'source_url' => $href,
            ];
        });

        return $products;
    }

    /**
     * Upsert products into the database keyed on source_url to avoid duplicates.
     */
    private function upsertProducts(array $products): int
    {
        $count = 0;

        foreach ($products as $data) {
            if (empty($data['source_url'])) {
                continue;
            }

            Product::updateOrCreate(
                ['source_url' => $data['source_url']],
                [
                    'title'     => $data['title'],
                    'price'     => $data['price'],
                    'image_url' => $data['image_url'],
                ]
            );

            $count++;
        }

        return $count;
    }

    /**
     * Strip currency symbols and commas, return a numeric string or null.
     */
    private function parsePrice(string $raw): ?string
    {
        $cleaned = preg_replace('/[^\d.]/', '', $raw);

        return is_numeric($cleaned) ? $cleaned : null;
    }
}
