#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT_DIR = path.resolve(__dirname, '..');

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

function tryExec(commands, cwd = ROOT_DIR) {
  for (const cmd of commands) {
    try {
      execSync(cmd, { cwd, stdio: 'inherit', shell: true });
      return true;
    } catch {
      // try next fallback
    }
  }
  return false;
}

async function main() {
  console.log('========================================================');
  console.log('  Simple Web Scraping Service - Direct Execution Setup');
  console.log('========================================================\n');

  // 1. Setup Go Proxy Microservice
  console.log('[1/4] Setting up proxy-service...');
  const proxyDir = path.join(ROOT_DIR, 'proxy-service');
  const goOk = tryExec(['go mod tidy', 'cmd.exe /c "go mod tidy"'], proxyDir);
  if (goOk) {
    console.log('  - proxy-service configured successfully.');
  } else {
    console.log('  \x1b[33m[WARNING] Go command failed or not found in proxy-service.\x1b[0m');
    console.log('            Please install Go (1.21+) from https://go.dev/dl/ to run proxy-service.');
  }

  // 2. Setup Laravel Backend
  console.log('\n[2/4] Setting up backend (Laravel)...');
  const backendDir = path.join(ROOT_DIR, 'backend');
  const envPath = path.join(backendDir, '.env');
  const envExamplePath = path.join(backendDir, '.env.example');

  const newlyCreatedEnv = !fs.existsSync(envPath) && fs.existsSync(envExamplePath);
  if (newlyCreatedEnv) {
    console.log('  - Creating backend/.env from .env.example...');
    fs.copyFileSync(envExamplePath, envPath);
  }

  console.log('  - Installing PHP dependencies...');
  const composerOk = tryExec([
    'composer install --no-interaction --prefer-dist --optimize-autoloader',
    'composer.bat install --no-interaction --prefer-dist --optimize-autoloader',
    'cmd.exe /c "composer install --no-interaction --prefer-dist --optimize-autoloader"',
    'php composer.phar install --no-interaction --prefer-dist --optimize-autoloader'
  ], backendDir);

  if (!composerOk) {
    console.log('  \x1b[33m[WARNING] Composer install failed. Please ensure Composer is installed.\x1b[0m');
  }

  if (newlyCreatedEnv || (fs.existsSync(envPath) && !fs.readFileSync(envPath, 'utf8').includes('APP_KEY=base64:'))) {
    console.log('  - Generating application key...');
    tryExec(['php artisan key:generate --ansi', 'cmd.exe /c "php artisan key:generate --ansi"'], backendDir);
  }

  console.log('  - Running database migrations...');
  const migrateOk = tryExec([
    'php artisan migrate --force',
    'cmd.exe /c "php artisan migrate --force"'
  ], backendDir);

  if (migrateOk) {
    console.log('  - Database migrated successfully.');
  } else {
    console.log('\n--------------------------------------------------------');
    console.log('\x1b[33m[NOTICE] Database migration failed with current configuration.\x1b[0m');
    console.log('--------------------------------------------------------');

    const answer = await askQuestion('Would you like to switch to SQLite? (Y/N) [default: Y]: ');
    const shouldSwitch = answer === '' || answer.toLowerCase() === 'y';

    if (shouldSwitch) {
      console.log('  - Reconfiguring backend/.env to use SQLite...');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        envContent = envContent.replace(/^DB_CONNECTION=.*$/m, 'DB_CONNECTION=sqlite');
        envContent = envContent.replace(/^DB_DATABASE=.*$/m, 'DB_DATABASE=database/database.sqlite');
        fs.writeFileSync(envPath, envContent, 'utf8');
      }

      const sqliteDir = path.join(backendDir, 'database');
      const sqliteFile = path.join(sqliteDir, 'database.sqlite');
      if (!fs.existsSync(sqliteDir)) fs.mkdirSync(sqliteDir, { recursive: true });
      if (!fs.existsSync(sqliteFile)) fs.writeFileSync(sqliteFile, '');

      console.log('  - Retrying migration with SQLite...');
      const sqliteMigrateOk = tryExec([
        'php artisan migrate --force',
        'cmd.exe /c "php artisan migrate --force"'
      ], backendDir);

      if (sqliteMigrateOk) {
        console.log('  - SQLite configured and migrated successfully.');
      } else {
        console.log('  \x1b[31m[ERROR] SQLite migration failed.\x1b[0m');
      }
    } else {
      console.log('[INFO] Keeping MySQL configuration. Run php artisan migrate manually when MySQL is running.');
    }
  }

  // 3. Setup Next.js Frontend
  console.log('\n[3/4] Setting up frontend (Next.js)...');
  const frontendDir = path.join(ROOT_DIR, 'frontend');
  const frontendEnv = path.join(frontendDir, '.env.local');

  if (!fs.existsSync(frontendEnv)) {
    console.log('  - Creating frontend/.env.local...');
    fs.writeFileSync(frontendEnv, 'NEXT_PUBLIC_API_URL=http://localhost:8000/api\n', 'utf8');
  }

  console.log('  - Installing frontend dependencies...');
  tryExec([
    'bun install',
    'npm install',
    'cmd.exe /c "npm install"'
  ], frontendDir);
  console.log('  - Frontend ready.');

  // 4. Setup Root Workspace Dependencies
  console.log('\n[4/4] Setting up root runner dependencies...');
  tryExec([
    'bun install',
    'npm install',
    'cmd.exe /c "npm install"'
  ], ROOT_DIR);
  console.log('  - Root dependencies ready.');

  console.log('\n========================================================');
  console.log('  \x1b[32m[SUCCESS] Setup Completed!\x1b[0m');
  console.log('========================================================\n');
  console.log('To run all 3 services concurrently:');
  console.log('  \x1b[36mbun dev\x1b[0m (or: npm run dev / bash scripts/run.bash)\n');
  console.log('Then open: \x1b[34mhttp://localhost:3000\x1b[0m\n');
}

main().catch((err) => {
  console.error('\n[FAILED] Setup encountered an error:', err.message);
});
