@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0restore-db.ps1"
set "RC=%ERRORLEVEL%"
echo.
if %RC% NEQ 0 (
  echo [ERROR] Restore failed, exit code: %RC%
) else (
  echo Restore completed successfully.
)
echo.
pause
exit /b %RC%
