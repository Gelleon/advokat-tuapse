@echo off
REM ============================================================
REM Запуск deploy.ps1 без интерактивных запросов между шагами.
REM В конце — пауза, чтобы увидеть результат.
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
echo Log markers: %LOG_FILE%
echo.
pause
exit /b %RC%
