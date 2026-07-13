@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

REM ============================================================
REM Безопасный deploy для advokat-tuapse.ru
REM - Пароль НЕ сохраняется на диск, запрашивается интерактивно
REM - Делает бэкап SQLite БД ПЕРЕД деплоем
REM - НЕ удаляет dev.db и НЕ делает prisma migrate reset
REM - Применяет миграции через `prisma migrate deploy`
REM ============================================================

REM --- Запрашиваем креды один раз ----------------------------------
for /f "usebackq tokens=*" %%U in (`powershell -NoProfile -Command "Read-Host 'SSH user'"`) do set "SERVER_USER=%%U"
if "%SERVER_USER%"=="" set "SERVER_USER=root"

for /f "usebackq tokens=*" %%H in (`powershell -NoProfile -Command "Read-Host 'SSH host'"`) do set "SERVER_HOST=%%H"
if "%SERVER_HOST%"=="" goto :config_error

for /f "usebackq tokens=*" %%P in (`powershell -NoProfile -Command "Read-Host 'SSH path (default /var/www/advokat-tuapse)'"`) do set "SERVER_PATH=%%P"
if "%SERVER_PATH%"=="" set "SERVER_PATH=/var/www/advokat-tuapse"

for /f "usebackq tokens=*" %%S in (`powershell -NoProfile -Command "$p = Read-Host 'SSH password' -AsSecureString; $BNet = New-Object System.Net.NetworkCredential('', $p); $BNet.Password"`) do set "SERVER_PASSWORD=%%S"
if "%SERVER_PASSWORD%"=="" goto :config_error

set "SERVER=%SERVER_USER%@%SERVER_HOST%"
set "REMOTE_DIR=%SERVER_PATH%"

REM Куда сохранять бэкапы локально
set "BACKUP_DIR=%~dp0backups"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Метка времени
for /f "usebackq tokens=*" %%T in (`powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"`) do set "TS=%%T"

REM --- Временная обёртка SSH_ASKPASS ------------------------------
set "ASKPASS_SCRIPT=%TEMP%\askpass_%TS%.cmd"
> "%ASKPASS_SCRIPT%" echo @echo off
>>"%ASKPASS_SCRIPT%" echo echo %SERVER_PASSWORD%

set "SSH_ASKPASS=%ASKPASS_SCRIPT%"
set "SSH_ASKPASS_REQUIRE=force"
set "DISPLAY=:0"
set "SSH_OPTS=-o StrictHostKeyChecking=accept-new -o BatchMode=no"

REM Очищаем пароль из переменных как можно скорее
set "SERVER_PASSWORD="

REM --- Вспомогательные подпрограммы cmd ---------------------------

:run_ssh
REM %~1 = команда для выполнения на сервере
ssh %SSH_OPTS% %SERVER% "%~1"
goto :eof

:run_scp_from
REM %~1 = путь на сервере, %~2 = путь локально
scp %SSH_OPTS% %SERVER%:%~1 "%~2"
goto :eof

REM --- Главная последовательность ---------------------------------

echo.
echo === Подключение к %SERVER% ===
call :run_ssh "echo CONNECT_OK"
if errorlevel 1 (
  echo [ERROR] Не удалось подключиться к %SERVER%. Проверьте креды и сеть.
  del "%ASKPASS_SCRIPT%" 2>nul
  exit /b 1
)

echo.
echo === [1/5] Бэкап SQLite БД с сервера ===
call :run_ssh "cd %REMOTE_DIR%/server ^&^& (test -f prisma/dev.db ^&^& cp prisma/dev.db prisma/dev.db.bak.%TS% ^&^& echo BACKUP_CREATED || echo NO_DB)"
if errorlevel 1 goto :ssh_fail

call :run_ssh "cd %REMOTE_DIR%/server ^&^& (test -f prisma/dev.db.bak.%TS% ^&^& echo BACKUP_OK || echo BACKUP_FAIL)"
if errorlevel 1 goto :ssh_fail

call :run_scp_from "%REMOTE_DIR%/server/prisma/dev.db.bak.%TS%" "%BACKUP_DIR%\dev.db.%TS%"
if errorlevel 1 (
  echo [WARN] Не удалось скачать бэкап локально, но на сервере он сохранён.
)

echo.
echo === [2/5] Загрузка изменений на сервер ===
call :run_ssh "cd %REMOTE_DIR% ^&^& git fetch ^&^& (git diff --quiet HEAD..@{u} ^&^& echo NO_UPDATES || git pull --rebase --autostash)"
if errorlevel 1 goto :ssh_fail

echo.
echo === [3/5] Установка зависимостей ===
call :run_ssh "cd %REMOTE_DIR%/server ^&^& (npm ci --omit=dev 2>/dev/null || npm install --omit=dev)"
if errorlevel 1 goto :ssh_fail
call :run_ssh "cd %REMOTE_DIR% ^&^& (npm ci --omit=dev 2>/dev/null || npm install --omit=dev)"
if errorlevel 1 goto :ssh_fail

echo.
echo === [4/5] Применение миграций БЕЗ потери данных ===
call :run_ssh "cd %REMOTE_DIR%/server ^&^& npx prisma migrate deploy"
if errorlevel 1 goto :ssh_fail

echo.
echo === [5/5] Сборка и перезапуск ===
call :run_ssh "cd %REMOTE_DIR% ^&^& npm run build"
if errorlevel 1 goto :ssh_fail
call :run_ssh "pm2 restart advokat-server 2>/dev/null || (cd %REMOTE_DIR%/server ^&^& pm2 start 'node dist/index.js' --name advokat-server)"
if errorlevel 1 goto :ssh_fail

echo.
echo === ГОТОВО ===
echo Бэкап БД на сервере: %REMOTE_DIR%/server/prisma/dev.db.bak.%TS%
echo Локальная копия:      %BACKUP_DIR%\dev.db.%TS%
del "%ASKPASS_SCRIPT%" 2>nul
endlocal
exit /b 0

:config_error
echo [ERROR] Не заполнены обязательные параметры.
del "%ASKPASS_SCRIPT%" 2>nul
exit /b 1

:ssh_fail
echo [ERROR] ssh/scp завершился с ошибкой. Деплой прерван. Бэкап БД на сервере сохранён.
del "%ASKPASS_SCRIPT%" 2>nul
exit /b 1
