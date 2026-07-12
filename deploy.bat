@echo off
echo ==========================================
echo       Auto Deploy Script
echo ==========================================
echo.

set /p msg="Enter Git commit message (or press Enter for 'Auto update'): "
if "%msg%"=="" set msg="Auto update"

echo.
echo [1/3] Committing and pushing to Git...
git add .
git commit -m %msg% 1>nul 2>nul
git push origin main 1>nul 2>nul

echo.
echo [2/3] Connecting to VPS (155.212.140.95) and updating code...
ssh root@155.212.140.95 "apt-get update && apt-get install -y build-essential python3 && cd /var/www/advokat-tuapse && git pull && npm install && npm run build && cp .env server/.env 2>/dev/null || true && cd server && npm install && npx prisma generate && npx tsx seed.ts && pm2 restart advokat-api"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] SSH command failed!
    pause
    exit /b %errorlevel%
)

echo.
echo ==========================================
echo [3/3] SUCCESS! Project updated on server.
echo ==========================================
pause
