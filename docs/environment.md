# Configuration & Environment Variables

This document provides a complete reference for configuring environment variables, database connections, and service endpoints across all components.

---

## 1. Backend Configuration (`backend/.env`)

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `APP_NAME` | `Laravel` | Application name |
| `APP_ENV` | `local` | Environment mode (`local`, `production`, `testing`) |
| `APP_KEY` | *(generated)* | Application encryption key (`php artisan key:generate`) |
| `APP_DEBUG` | `true` | Enables detailed error pages and debugging logs |
| `APP_URL` | `http://localhost:8000` | Base URL for the backend server |
| `DB_CONNECTION` | `mysql` | Database driver (`mysql` or `sqlite`) |
| `DB_HOST` | `127.0.0.1` | MySQL host address (MySQL only) |
| `DB_PORT` | `3306` | MySQL port (MySQL only) |
| `DB_DATABASE` | `scraper_service_backend` | MySQL database name (or `database/database.sqlite` for SQLite) |
| `DB_USERNAME` | `root` | MySQL username (MySQL only) |
| `DB_PASSWORD` | `""` | MySQL password (MySQL only) |
| `LOG_LEVEL` | `debug` | Log output verbosity |

---

## 2. Database Options (MySQL vs. SQLite)

### Option A: MySQL (Default)
By default, the backend connects to a local MySQL instance:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=scraper_service_backend
DB_USERNAME=root
DB_PASSWORD=
```
Create the database:
```sql
CREATE DATABASE IF NOT EXISTS scraper_service_backend CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Option B: SQLite (Zero-Config Fallback)
To use SQLite without running a database server:
1. Update `backend/.env`:
   ```env
   DB_CONNECTION=sqlite
   DB_DATABASE=database/database.sqlite
   ```
2. Create the SQLite file:
   ```bash
   touch backend/database/database.sqlite
   # On Windows PowerShell: New-Item -ItemType File -Path backend/database/database.sqlite -Force
   ```
3. Run migrations:
   ```bash
   cd backend && php artisan migrate
   ```

> **Note**: The automated setup script (`npm run setup` / `bun run setup` / `bash scripts/setup.bash`) detects if MySQL is unreachable and offers to configure and migrate SQLite automatically.

---

## 3. Frontend Configuration (`frontend/.env.local`)

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` | Base URL for the Laravel REST API endpoint |

---

## 4. Proxy Service Configuration

The Go proxy service runs on port `9000` with zero external dependencies and requires no `.env` configuration file.

- **Port**: `:9000`
- **Identity Endpoint**: `http://localhost:9000/next-identity`
