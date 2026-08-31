<?php

namespace App\Console\Commands;

use App\Services\ScraperService;
use Illuminate\Console\Command;

class ScrapeProducts extends Command
{
    protected $signature = 'scrape:products
                            {--once : Run once and exit instead of running continuously}
                            {--interval=30 : Seconds to wait between scrape iterations [default: 30]}';

    protected $description = 'Scrape eCommerce product listings and persist them to the database (runs every 30s by default)';

    public function handle(ScraperService $scraper): int
    {
        $runOnce  = (bool) $this->option('once');
        $interval = max(1, (int) $this->option('interval'));

        if ($runOnce) {
            return $this->runScrape($scraper);
        }

        // Default behavior: Continuous 30-second scraping loop
        $this->info("[scrape:products] Starting continuous scraper (auto-refreshing every {$interval}s). Press Ctrl+C to stop.");
        $iteration = 1;

        while (true) {
            $this->line('');
            $this->line("<fg=yellow>--- Scrape Iteration #{$iteration} [" . date('Y-m-d H:i:s') . "] ---</>");
            $this->runScrape($scraper);
            $iteration++;

            $this->line("<fg=gray>Waiting {$interval}s until next scrape cycle...</>");
            sleep($interval);
        }
    }

    private function runScrape(ScraperService $scraper): int
    {
        $this->info('[scrape:products] Fetching products from eCommerce catalog...');

        $result = $scraper->scrape();

        // Display attempt cascade
        $this->line('<fg=cyan>Attempt cascade:</>');

        foreach ($result['attempts'] as $attempt) {
            $icon   = $attempt['success'] ? '<fg=green>✓</>' : '<fg=red>✗</>';
            $status = $attempt['status'] ?? 'timeout';
            $this->line("  {$icon}  {$attempt['target']} → HTTP {$status}");
        }

        $this->line('');

        if ($result['target'] === 'none') {
            $this->error('[scrape:products] All targets failed. No products scraped.');

            return self::FAILURE;
        }

        $this->info("  Proxy used        : {$result['proxy_label']}");
        $this->info("  Source            : {$result['target']}");
        $this->info("  Products scraped  : {$result['scraped']}");
        $this->info("  Products upserted : {$result['upserted']}");
        $this->line('<fg=green>[scrape:products] Done.</>');

        return self::SUCCESS;
    }
}
