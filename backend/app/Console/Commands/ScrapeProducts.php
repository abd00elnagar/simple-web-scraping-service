<?php

namespace App\Console\Commands;

use App\Services\ScraperService;
use Illuminate\Console\Command;

class ScrapeProducts extends Command
{
    protected $signature = 'scrape:products';

    protected $description = 'Scrape eCommerce product listings and persist them to the database';

    public function handle(ScraperService $scraper): int
    {
        $this->info('[scrape:products] Starting scrape run...');

        $result = $scraper->scrape();

        // Display the attempt cascade so each target try is visible in the terminal
        $this->line('');
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

        $this->info("  Proxy used   : {$result['proxy_label']}");
        $this->info("  Source       : {$result['target']}");
        $this->info("  Products scraped  : {$result['scraped']}");
        $this->info("  Products upserted : {$result['upserted']}");
        $this->line('');
        $this->line('<fg=green>[scrape:products] Done.</>');

        return self::SUCCESS;
    }
}
