# Этот скрипт делает то же самое, что и deploy.bat, но для PowerShell
$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "      Скрипт автоматического деплоя" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$msg = Read-Host "Введите сообщение для Git коммита (Enter для 'Автоматическое обновление')"
if ([string]::IsNullOrWhiteSpace($msg)) {
    $msg = "Автоматическое обновление"
}

Write-Host "`n[1/3] Сохранение и отправка изменений в Git..." -ForegroundColor Yellow
git add .
git commit -m $msg 2>&1 | Out-Null

Write-Host "Отправка изменений в Git (если есть)..." -ForegroundColor Gray
git push origin main 2>&1 | Out-Null
$pushExitCode = $LASTEXITCODE

Write-Host "Все актуально или успешно отправлено." -ForegroundColor Green

Write-Host "`n[2/3] Подключение к VPS (155.212.140.95) и обновление кода..." -ForegroundColor Yellow
$sshCommand = "apt-get update && apt-get install -y build-essential python3 && cd /var/www/advokat-tuapse && git pull && npm install && npm run build && cp .env server/.env 2>/dev/null || true && cd server && npm install && npx prisma generate && npx tsx seed.ts && pm2 restart advokat-api"
ssh root@155.212.140.95 $sshCommand

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ОШИБКА] Произошла ошибка при выполнении команд на сервере!" -ForegroundColor Red
    Read-Host "Нажмите Enter для выхода..."
    exit $LASTEXITCODE
}

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "[3/3] УСПЕХ! Проект успешно обновлен на сервере." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Read-Host "Нажмите Enter для выхода..."
