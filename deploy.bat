@echo off
REM ============================================================
REM Простая обёртка: запускает PowerShell-скрипт deploy.ps1
REM с обходом ExecutionPolicy, чтобы не было ошибок политики.
REM Перед деплоем: git commit + push, затем обновление на сервере.
REM Окно остаётся открытым до нажатия клавиши; вывод пишется в deploy.last.log
REM ============================================================

set "LOG_FILE=%~dp0deploy.last.log"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1"
set "RC=%ERRORLEVEL%"

echo.
if %RC% NEQ 0 (
  echo [ERROR] Deploy failed, exit code: %RC%
) else (
  echo Deploy completed successfully.
)
echo Full log: %LOG_FILE%
echo.
pause
exit /b %RC%
