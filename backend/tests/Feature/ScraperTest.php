<?php

use App\Models\Product;
use App\Services\ProxyIdentityClient;
use App\Services\ScraperService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

test('scraper successfully extracts products and upserts without duplicate records', function () {
    $sampleHtml1 = <<<HTML
    <!DOCTYPE html>
    <html>
    <body>
        <ul class="products columns-4">
            <li data-products="item" class="product">
                <a href="https://www.scrapingcourse.com/ecommerce/product/test-hoodie/" class="woocommerce-LoopProduct-link">
                    <img src="https://www.scrapingcourse.com/ecommerce/images/test.jpg" class="product-image" />
                    <h2 class="woocommerce-loop-product__title">Test Hoodie</h2>
                    <span data-testid="product-price"><bdi><span>$</span>49.99</bdi></span>
                </a>
            </li>
            <li data-products="item" class="product">
                <a href="https://www.scrapingcourse.com/ecommerce/product/test-jacket/" class="woocommerce-LoopProduct-link">
                    <img src="https://www.scrapingcourse.com/ecommerce/images/jacket.jpg" class="product-image" />
                    <h2 class="woocommerce-loop-product__title">Test Jacket</h2>
                    <span data-testid="product-price"><bdi><span>$</span>89.00</bdi></span>
                </a>
            </li>
        </ul>
    </body>
    </html>
    HTML;

    $sampleHtml2 = str_replace('49.99', '39.99', $sampleHtml1);

    @unlink(storage_path('app/scraper_page.txt'));

    Http::fake([
        'http://localhost:9000/next-identity' => Http::sequence()
            ->push(['proxy_label' => 'proxy-1', 'headers' => ['User-Agent' => 'Chrome/128.0']], 200)
            ->push(['proxy_label' => 'proxy-2', 'headers' => ['User-Agent' => 'Firefox/129.0']], 200),
        'https://www.scrapingcourse.com/ecommerce*' => Http::sequence()
            ->push($sampleHtml1, 200)
            ->push($sampleHtml2, 200),
    ]);

    $proxyClient = new ProxyIdentityClient();
    $scraper = new ScraperService($proxyClient);

    // First scrape run
    $result1 = $scraper->scrape();
    expect($result1['scraped'])->toBe(2)
        ->and($result1['upserted'])->toBe(2)
        ->and(Product::count())->toBe(2);

    $hoodie = Product::where('source_url', 'https://www.scrapingcourse.com/ecommerce/product/test-hoodie/')->first();
    expect($hoodie)->not->toBeNull()
        ->and($hoodie->title)->toBe('Test Hoodie')
        ->and((float) $hoodie->price)->toBe(49.99);

    // Second scrape run (same source_url, updated price)
    $result2 = $scraper->scrape();
    expect($result2['scraped'])->toBe(2)
        ->and($result2['upserted'])->toBe(2)
        ->and(Product::count())->toBe(2); // Count remains 2 (no duplicate rows created)

    $updatedHoodie = Product::where('source_url', 'https://www.scrapingcourse.com/ecommerce/product/test-hoodie/')->first();
    expect((float) $updatedHoodie->price)->toBe(39.99);
});
