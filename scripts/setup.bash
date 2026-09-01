#!/usr/bin/env bash
set -e

# Always execute relative to project root
cd "$(dirname "$0")/.."

echo "========================================================"
echo "  Simple Web Scraping Service - Direct Execution Setup"
echo "========================================================"
echo ""

# Global arrays to track summary results
declare -a SUMMARY_NAMES=()
declare -a SUMMARY_STATUS=()
declare -a SUMMARY_DETAILS=()

record_step() {
    local name="$1"
    local status="$2" # "SUCCESS" or "FAILED"
    local detail="$3"
    SUMMARY_NAMES+=("$name")
    SUMMARY_STATUS+=("$status")
    SUMMARY_DETAILS+=("$detail")
}

# Helper to run artisan commands with platform fallbacks
run_artisan() {
    local args="$*"
    # If native Linux php exists
    if command -v php >/dev/null 2>&1 && ! [[ "$(command -v php)" =~ \.(exe|bat|cmd)$ ]]; then
        if php artisan $args; then
            return 0
        fi
        # If Linux php failed (e.g. missing PDO sqlite/mysql driver in WSL), try php.exe if available
        if command -v php.exe >/dev/null 2>&1; then
            echo "  [INFO] Trying php.exe..."
            if php.exe artisan $args; then
                return 0
            fi
        fi
        return 1
    elif command -v php.exe >/dev/null 2>&1; then
        php.exe artisan $args
        return $?
    elif command -v cmd.exe >/dev/null 2>&1; then
        cmd.exe /c "php artisan $args"
        return $?
    else
        echo "[ERROR] PHP is not found. Please install PHP 8.2+."
        return 1
    fi
}

# Helper to run composer with platform fallbacks
run_composer() {
    local args="$*"
    # Check if native composer command exists
    if command -v composer >/dev/null 2>&1; then
        local comp_path
        comp_path="$(command -v composer)"
        # If composer points to a Windows .bat / .cmd file in WSL/Linux PATH
        if [[ "$comp_path" =~ \.(bat|cmd)$ ]] || grep -q -m 1 "^@ECHO" "$comp_path" 2>/dev/null; then
            if command -v cmd.exe >/dev/null 2>&1; then
                cmd.exe /c "composer $args"
                return $?
            fi
        else
            if composer $args; then
                return 0
            fi
        fi
    fi

    # Fallback to cmd.exe in Windows/WSL
    if command -v cmd.exe >/dev/null 2>&1; then
        cmd.exe /c "composer $args"
        return $?
    fi

    # Fallback to composer.phar
    if [ -f "composer.phar" ]; then
        if command -v php >/dev/null 2>&1; then
            php composer.phar $args
            return $?
        elif command -v php.exe >/dev/null 2>&1; then
            php.exe composer.phar $args
            return $?
        fi
    fi

    echo "[ERROR] Composer command failed. Please install Composer from https://getcomposer.org/download/"
    return 1
}

# Helper to run JS package manager (try bun first, fallback to npm)
run_pkg_install() {
    local target_dir="$1"
    echo "  - Installing dependencies in $target_dir..."
    (
        cd "$target_dir"
        if command -v bun >/dev/null 2>&1 && ! [[ "$(command -v bun)" =~ \.(exe|bat|cmd)$ ]]; then
            bun install
        elif command -v bun.exe >/dev/null 2>&1; then
            bun.exe install
        elif command -v npm >/dev/null 2>&1 && ! [[ "$(command -v npm)" =~ \.(exe|bat|cmd)$ ]]; then
            npm install
        elif command -v npm.cmd >/dev/null 2>&1; then
            npm.cmd install
        elif command -v cmd.exe >/dev/null 2>&1; then
            cmd.exe /c "npm install"
        else
            echo "[ERROR] Failed to install dependencies in $target_dir. Please ensure Bun or Node.js/npm is installed."
            return 1
        fi
    )
}

# 1. Setup Go Proxy Microservice
echo "[1/4] Setting up proxy-service..."
if (cd proxy-service && (go mod tidy 2>/dev/null || (command -v cmd.exe >/dev/null 2>&1 && cmd.exe /c "go mod tidy" 2>/dev/null))); then
    echo "  - proxy-service configured successfully."
    record_step "Go Proxy Microservice (proxy-service)" "SUCCESS" ""
else
    echo "[WARNING] 'go' command was not found or failed in proxy-service."
    echo "          Please install Go (1.21+) from https://go.dev/dl/ to run proxy-service."
    record_step "Go Proxy Microservice (proxy-service)" "FAILED" "Go CLI not found / tidy failed"
fi

# 2. Setup Laravel Backend
echo ""
echo "[2/4] Setting up backend (Laravel)..."
setup_backend() {
    cd backend

    local newly_created_env=0
    if [ ! -f ".env" ]; then
        echo "  - Creating .env from .env.example..."
        cp .env.example .env 2>/dev/null || copy .env.example .env 2>/dev/null || true
        newly_created_env=1
    fi

    echo "  - Installing PHP dependencies..."
    if run_composer install --no-interaction --prefer-dist --optimize-autoloader; then
        record_step "Backend PHP Dependencies (Composer)" "SUCCESS" ""
    else
        echo "[WARNING] Failed to install backend composer dependencies."
        record_step "Backend PHP Dependencies (Composer)" "FAILED" "Composer install failed"
    fi

    local key_ok=0
    if [ "$newly_created_env" -eq 1 ] || ! grep -q "APP_KEY=base64:" .env 2>/dev/null; then
        echo "  - Generating application key..."
        if run_artisan "key:generate --ansi"; then
            key_ok=1
        fi
    else
        key_ok=1
    fi

    if [ "$key_ok" -eq 1 ]; then
        record_step "Backend Environment & App Key" "SUCCESS" ""
    else
        record_step "Backend Environment & App Key" "FAILED" "Failed to generate APP_KEY"
    fi

    echo "  - Running database migrations..."
    if run_artisan "migrate --force"; then
        echo "  - Database migrated successfully."
        record_step "Backend Database Migrations" "SUCCESS" ""
    else
        echo ""
        echo "--------------------------------------------------------"
        echo "[NOTICE] Database migration failed with current configuration."
        echo "--------------------------------------------------------"
        read -r -p "Would you like to switch to SQLite? (Y/N) [default: Y]: " SWITCH_SQLITE
        SWITCH_SQLITE=${SWITCH_SQLITE:-Y}
        if [[ "$SWITCH_SQLITE" =~ ^[Yy]$ ]]; then
            echo "  - Reconfiguring backend/.env to use SQLite..."
            sed -i 's/^DB_CONNECTION=.*/DB_CONNECTION=sqlite/' .env 2>/dev/null || php -r "\$p='.env'; \$c=file_get_contents(\$p); \$c=preg_replace('/^DB_CONNECTION=.*$/m','DB_CONNECTION=sqlite',\$c); file_put_contents(\$p,\$c);" 2>/dev/null || true
            sed -i 's/^DB_DATABASE=.*/DB_DATABASE=database\/database.sqlite/' .env 2>/dev/null || php -r "\$p='.env'; \$c=file_get_contents(\$p); \$c=preg_replace('/^DB_DATABASE=.*$/m','DB_DATABASE=database/database.sqlite',\$c); file_put_contents(\$p,\$c);" 2>/dev/null || true
            mkdir -p database 2>/dev/null || true
            touch database/database.sqlite 2>/dev/null || true
            echo "  - Retrying migration with SQLite..."
            if run_artisan "migrate --force"; then
                echo "  - SQLite configured and migrated successfully."
                record_step "Backend Database Migrations" "SUCCESS" "Switched to SQLite"
            else
                echo ""
                echo "  [ERROR] SQLite migration failed."
                echo "  If using Linux/WSL PHP, ensure the SQLite extension is installed:"
                echo "    sudo apt install php-sqlite3 php-mysql"
                record_step "Backend Database Migrations" "FAILED" "SQLite migration failed"
            fi
        else
            echo "[INFO] Keeping current configuration. Please run 'php artisan migrate' manually when database is ready."
            record_step "Backend Database Migrations" "FAILED" "Pending manual MySQL migration"
        fi
    fi
}
setup_backend
cd "$OLDPWD" 2>/dev/null || cd "$ROOT_DIR"

# 3. Setup Next.js Frontend
echo ""
echo "[3/4] Setting up frontend (Next.js)..."
if [ ! -f "frontend/.env.local" ]; then
    echo "  - Creating frontend/.env.local..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > frontend/.env.local
fi

if run_pkg_install "frontend"; then
    echo "  - Frontend ready."
    record_step "Frontend Next.js Dependencies" "SUCCESS" ""
else
    record_step "Frontend Next.js Dependencies" "FAILED" "Package install failed"
fi

# 4. Setup Root Workspace Dependencies
echo ""
echo "[4/4] Setting up root runner dependencies..."
if run_pkg_install "."; then
    echo "  - Root dependencies ready."
    record_step "Root Runner Dependencies (concurrently)" "SUCCESS" ""
else
    record_step "Root Runner Dependencies (concurrently)" "FAILED" "Package install failed"
fi

# Final Summary
echo ""
echo "========================================================"
echo "  Setup Summary"
echo "========================================================"
has_failures=0
for i in "${!SUMMARY_NAMES[@]}"; do
    name="${SUMMARY_NAMES[$i]}"
    status="${SUMMARY_STATUS[$i]}"
    detail="${SUMMARY_DETAILS[$i]}"
    
    if [ "$status" = "SUCCESS" ]; then
        if [ -n "$detail" ]; then
            echo "  [✓] $name ($detail)"
        else
            echo "  [✓] $name"
        fi
    else
        has_failures=1
        if [ -n "$detail" ]; then
            echo "  [✗] $name ($detail)"
        else
            echo "  [✗] $name"
        fi
    fi
done
echo "========================================================"

if [ "$has_failures" -eq 0 ]; then
    echo "  [SUCCESS] All setup steps completed successfully!"
    echo ""
    echo "To run all 3 services concurrently:"
    echo "  bash scripts/run.bash"
    echo "  (or: bun dev / npm run dev)"
    echo ""
    echo "Then visit: http://localhost:3000"
    echo ""
else
    echo "  [NOTICE] Setup finished with issues requiring attention listed above."
    echo ""
fi
