#!/usr/bin/env bash
set -e

# Always execute relative to project root
cd "$(dirname "$0")/.."

echo "========================================================"
echo "  Simple Web Scraping Service - Unified Runner"
echo "========================================================"
echo ""

# 1. Check PHP
if ! command -v php &> /dev/null; then
    echo "[ERROR] PHP is not found in PATH."
    echo "Please install PHP 8.2+ from https://www.php.net/downloads or https://herd.laravel.com"
    exit 1
fi

# 2. Check Go
if ! command -v go &> /dev/null; then
    echo "[ERROR] Go is not found in PATH."
    echo "Please install Go (1.21+) from https://go.dev/dl/"
    exit 1
fi

# 3. Check Runner Executor: bunx vs npx
RUNNER_EXE=""
if command -v bunx &> /dev/null || bunx --version &> /dev/null; then
    RUNNER_EXE="bunx"
elif cmd.exe /c "bunx --version" &> /dev/null; then
    RUNNER_EXE="cmd.exe /c bunx"
elif command -v npx &> /dev/null || npx --version &> /dev/null; then
    RUNNER_EXE="npx --yes"
elif cmd.exe /c "npx --version" &> /dev/null; then
    RUNNER_EXE="cmd.exe /c npx --yes"
else
    RUNNER_EXE="concurrently"
fi

# 4. Check Frontend dev command: bun dev vs npm run dev
FRONTEND_CMD="cd frontend && bun dev"
if ! command -v bun &> /dev/null && ! cmd.exe /c "bun --version" &> /dev/null; then
    FRONTEND_CMD="cd frontend && npm run dev"
fi

echo "Environment Verified:"
echo "  - PHP:      $(php -v | head -n 1)"
echo "  - Go:       $(go version)"
echo "  - Runner:   $RUNNER_EXE"
echo "  - Frontend: $FRONTEND_CMD"
echo ""
echo "Starting all 3 services concurrently:"
echo "  [proxy]    Go Microservice (:9000)"
echo "  [backend]  Laravel 12 API + Background Scraper (:8000)"
echo "  [frontend] Next.js 15 UI (:3000)"
echo ""
echo "Note: If any service stops or encounters an error, all services will be terminated."
echo "Press Ctrl+C at any time to stop."
echo ""

# Execute concurrently with kill-others and failure trapping
$RUNNER_EXE concurrently \
    -k \
    --kill-others-on-fail \
    --names "proxy,backend,frontend" \
    --prefix-colors "cyan,magenta,green" \
    "cd proxy-service && go run main.go" \
    "cd backend && php artisan dev:start" \
    "$FRONTEND_CMD"
