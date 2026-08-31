<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class DevStart extends Command
{
    protected $signature = 'dev:start
                            {--port=8000 : Port for the HTTP server}
                            {--interval=30 : Seconds between scrape iterations}';

    protected $description = 'Start the Laravel dev server AND the 30s scrape loop together';

    public function handle(): int
    {
        $port     = (int) $this->option('port');
        $interval = (int) $this->option('interval');

        // Spawn the scrape loop as a detached background process
        $phpBinary  = PHP_BINARY;
        $artisan    = base_path('artisan');
        $scrapeCmd  = "\"{$phpBinary}\" \"{$artisan}\" scrape:products --interval={$interval}";

        $this->info("[dev:start] Launching background scraper (every {$interval}s)...");

        if (PHP_OS_FAMILY === 'Windows') {
            // On Windows, `start` treats the first quoted arg as the window title.
            // Passing "" as an explicit empty title prevents "artisan" being opened as a document.
            $cmd = "cmd /c start /b \"\" \"{$phpBinary}\" \"{$artisan}\" scrape:products --interval={$interval}";
            pclose(popen($cmd, 'r'));
        } else {
            exec("nohup {$scrapeCmd} > /dev/null 2>&1 &");
        }

        $this->info("[dev:start] Scraper started in background.");
        $this->info("[dev:start] Starting Laravel server on port {$port}...");
        $this->line('');

        $this->call('serve', ['--port' => $port]);

        return self::SUCCESS;
    }
}
