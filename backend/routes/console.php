<?php

use Illuminate\Support\Facades\Schedule;

// Schedule the scraper command to run periodically in the background
Schedule::command('scrape:products')->everyMinute();
