#!/usr/bin/env bash
set -e

# Always execute relative to project root
cd "$(dirname "$0")/.."

echo "========================================================"
echo "  Simple Web Scraping Service - Direct Execution Setup"
echo "========================================================"
echo ""

# Helper to run artisan commands
run_artisan() {
    local args="$@"
    if php artisan $args 2>/dev/null; then
        return 0
    elif php.exe artisan $args 2>/dev/null; then
        return 0
    elif cmd.exe /c "php artisan $args" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Helper to run composer with fallbacks
run_composer() {
    local args="$@"
    if composer $args 2>/dev/null; then
        return 0
    elif composer.bat $args 2>/dev/null; then
        return 0
    elif cmd.exe /c "composer $args" 2>/dev/null; then
        return 0
    elif php composer.phar $args 2>/dev/null; then
        return 0
    else
        echo "[ERROR] Composer command failed. Please install Composer from https://getcomposer.org/download/"
        return 1
    fi
}

# Helper to run JS package manager (try bun first, fallback to npm)
run_pkg_install() {
    local dir="$1"
    echo "  - Installing dependencies in $dir..."
    (
        cd "$dir"
        if bun install 2>/dev/null; then
            echo "  - Installed using bun."
        elif bun.exe install 2>/dev/null; then
            echo "  - Installed using bun."
        elif cmd.exe /c "bun install" 2>/dev/null; then
            echo "  - Installed using bun (Windows)."
        elif npm install 2>/dev/null; then
            echo "  - Installed using npm."
        elif cmd.exe /c "npm install" 2>/dev/null; then
            echo "  - Installed using npm (Windows)."
        else
            echo "[ERROR] Failed to install dependencies in $dir. Please ensure Bun or Node.js/npm is installed."
            return 1
        fi
    )
}

# 1. Setup Go Proxy Microservice
echo "[1/4] Setting up proxy-service..."
if (cd proxy-service && go mod tidy 2>/dev/null); then
    echo "  - proxy-service configured successfully."
elif (cd proxy-service && cmd.exe /c "go mod tidy" 2>/dev/null); then
    echo "  - proxy-service configured successfully via cmd.exe."
else
    echo "[WARNING] 'go' command was not found or failed in proxy-service."
    echo "          Please install Go (1.21+) from https://go.dev/dl/ to run proxy-service."
fi

# 2. Setup Laravel Backend
echo ""
echo "[2/4] Setting up backend (Laravel)..."
(
    cd backend

    if [ ! -f ".env" ]; then
        echo "  - Creating .env from .env.example..."
        cp .env.example .env 2>/dev/null || copy .env.example .env 2>/dev/null || true
        run_artisan "key:generate --ansi" || true
    fi

    echo "  - Installing PHP dependencies..."
    if ! run_composer "install --no-interaction --prefer-dist --optimize-autoloader"; then
        echo "[ERROR] Failed to install backend composer dependencies."
    fi

    echo "  - Running database migrations..."
    if run_artisan "migrate --force"; then
        echo "  - Database migrated successfully."
    else
        echo ""
        echo "--------------------------------------------------------"
        echo "[NOTICE] Database migration failed with current configuration (e.g. MySQL driver/host unavailable)."
        echo "--------------------------------------------------------"
        read -r -p "Would you like to switch to SQLite? (Y/N) [default: Y]: " SWITCH_SQLITE
        SWITCH_SQLITE=${SWITCH_SQLITE:-Y}
        if [[ "$SWITCH_SQLITE" =~ ^[Yy]$ ]]; then
            echo "  - Reconfiguring backend/.env to use SQLite..."
            php -r "\$p='.env'; \$c=file_get_contents(\$p); \$c=preg_replace('/^DB_CONNECTION=.*$/m','DB_CONNECTION=sqlite',\$c); \$c=preg_replace('/^DB_DATABASE=.*$/m','DB_DATABASE=database/database.sqlite',\$c); file_put_contents(\$p,\$c);" 2>/dev/null || true
            mkdir -p database 2>/dev/null || true
            touch database/database.sqlite 2>/dev/null || true
            echo "  - Retrying migration with SQLite..."
            if run_artisan "migrate --force"; then
                echo "  - SQLite configured and migrated successfully."
            else
                echo "[ERROR] SQLite migration failed. Please inspect backend configuration."
            fi
        else
            echo "[INFO] Keeping current configuration. Please run 'php artisan migrate' manually when database is ready."
        fi
    fi
)

# 3. Setup Next.js Frontend
echo ""
echo "[3/4] Setting up frontend (Next.js)..."
if [ ! -f "frontend/.env.local" ]; then
    echo "  - Creating frontend/.env.local..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > frontend/.env.local
fi
run_pkg_install "frontend"

# 4. Setup Root Workspace Dependencies
echo ""
echo "[4/4] Setting up root runner dependencies..."
run_pkg_install "."

echo ""
echo "========================================================"
echo "  [SUCCESS] Setup Completed!"
echo "========================================================"
echo ""
echo "To run all 3 services concurrently:"
echo "  bash scripts/run.bash"
echo "  (or: bun dev / npm run dev)"
echo ""
echo "Then visit: http://localhost:3000"
echo ""
