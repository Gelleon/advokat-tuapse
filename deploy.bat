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
ssh root@155.212.140.95 "cd /var/www/advokat-tuapse && git fetch origin main && git reset --hard origin/main && rm -rf dist node_modules/.vite && npm install && npm run build && (grep -q '^ADMIN_USERNAME=' .env || (echo 'ADMIN_USERNAME=admin' >> .env && echo 'ADMIN_PASSWORD=admin123' >> .env)) && cp .env server/.env && cd server && npx prisma generate && npx tsx seed.ts && pm2 restart advokat-api && pm2 save && echo '--- Patching Nginx ---' && (grep -q 'client_max_body_size' /etc/nginx/sites-enabled/*advokat* 2>/dev/null && echo 'Nginx already patched' || (sed -i '/server {/a\\tclient_max_body_size 20m;' /etc/nginx/sites-enabled/*advokat* 2>/dev/null && echo 'Nginx patched: client_max_body_size = 20m')) && nginx -t && nginx -s reload"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] SSH command failed!
    pause
    exit /b %errorlevel%
)

echo.
echo ==========================================
echo [3/3] SUCCESS! Project updated on server.
echo  Login: admin
echo  Password: admin123
echo  File upload limit: 20 MB
echo ==========================================
pause
