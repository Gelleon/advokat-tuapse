@echo off
REM ============================================================
REM Простая обёртка: запускает PowerShell-скрипт deploy.ps1
REM с обходом ExecutionPolicy, чтобы не было ошибок политики.
REM ============================================================

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1"
exit /b %ERRORLEVEL%
