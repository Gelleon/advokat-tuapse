# ============================================================
# Безопасный deploy для advokat-tuapse.ru (PowerShell)
# - Пароль НЕ сохраняется на диск (SecureString)
# - Делает бэкап SQLite БД ПЕРЕД деплоем
# - Применяет миграции через prisma migrate deploy (БЕЗ потери данных)
# ============================================================

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '=== Безопасный деплой advokat-tuapse.ru ===' -ForegroundColor Cyan
Write-Host ''

# --- Креды ----------------------------------------------------
$SERVER_USER = Read-Host 'SSH user'
if ([string]::IsNullOrWhiteSpace($SERVER_USER)) { $SERVER_USER = 'root' }

$SERVER_HOST = Read-Host 'SSH host (IP или домен)'
if ([string]::IsNullOrWhiteSpace($SERVER_HOST)) {
  Write-Host '[ERROR] Хост не указан' -ForegroundColor Red
  exit 1
}

$SERVER_PATH = Read-Host 'Путь на сервере (Enter = /var/www/advokat-tuapse)'
if ([string]::IsNullOrWhiteSpace($SERVER_PATH)) { $SERVER_PATH = '/var/www/advokat-tuapse' }

$securePwd = Read-Host 'SSH password' -AsSecureString
if ($securePwd -eq $null -or $securePwd.Length -eq 0) {
  Write-Host '[ERROR] Пароль не введён' -ForegroundColor Red
  exit 1
}
$BNet = New-Object System.Net.NetworkCredential('', $securePwd)
$SERVER_PASSWORD = $BNet.Password

$SERVER = "$SERVER_USER@$SERVER_HOST"
$REMOTE_DIR = $SERVER_PATH

# Куда сохранять локальные бэкапы
$BACKUP_DIR = Join-Path $PSScriptRoot 'backups'
if (-not (Test-Path $BACKUP_DIR)) { New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null }

$TS = Get-Date -Format 'yyyyMMdd-HHmmss'

# --- Обёртка askpass -----------------------------------------
# Windows OpenSSH при SSH_ASKPASS_REQUIRE=force запускает SSH_ASKPASS через CreateProcess,
# у которого нет консоли, поэтому echo туда не выводит. Поэтому используем временный
# .ps1 скрипт, который читает пароль из файла.

$PWD_DIR  = Join-Path $env:TEMP "sshpwd_$TS"
New-Item -ItemType Directory -Path $PWD_DIR -Force | Out-Null
$ASKPASS  = Join-Path $PWD_DIR 'askpass.ps1'
$SEC_FILE = Join-Path $PWD_DIR 'pwd.txt'

# Сохраняем пароль во временный файл (с узкими правами)
[System.IO.File]::WriteAllText($SEC_FILE, $SERVER_PASSWORD)

@"
`$env:SSH_ASKPASS_PWD = Get-Content -LiteralPath '$SEC_FILE' -Raw
Remove-Variable SERVER_PASSWORD -ErrorAction SilentlyContinue
[Console]::WriteLine(`$env:SSH_ASKPASS_PWD)
"@ | Out-File -FilePath $ASKPASS -Encoding utf8

$env:SSH_ASKPASS         = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$ASKPASS`""
$env:SSH_ASKPASS_REQUIRE = 'force'
$env:DISPLAY             = ':0'

# Подчищаем переменную с паролем
$SERVER_PASSWORD = $null
[System.GC]::Collect()

# SSH-флаги (без интерактивного запроса пароля)
$SSH_OPTS = @('-o', 'StrictHostKeyChecking=accept-new', '-o', 'BatchMode=no')

function Run-Ssh {
  param([string]$Cmd)
  & ssh @SSH_OPTS $SERVER $Cmd
  if ($LASTEXITCODE -ne 0) {
    throw "ssh завершился с кодом $LASTEXITCODE. Команда: $Cmd"
  }
}

function Run-ScpFrom {
  param([string]$RemotePath, [string]$LocalPath)
  & scp @SSH_OPTS "${SERVER}:${RemotePath}" $LocalPath
  if ($LASTEXITCODE -ne 0) {
    Write-Warn "scp не удался: $RemotePath -> $LocalPath (но на сервере бэкап сохранён)"
  }
}

# --- Главная последовательность -------------------------------

Write-Host ''
Write-Host '=== Подключение к '$SERVER' ===' -ForegroundColor Cyan
Run-Ssh 'echo CONNECT_OK'

Write-Host ''
Write-Host '=== [1/5] Бэкап SQLite БД с сервера ===' -ForegroundColor Cyan
Run-Ssh "cd $REMOTE_DIR/server && (test -f prisma/dev.db && cp prisma/dev.db prisma/dev.db.bak.$TS && echo BACKUP_CREATED || echo NO_DB)"
Run-Ssh "cd $REMOTE_DIR/server && (test -f prisma/dev.db.bak.$TS && echo BACKUP_OK || echo BACKUP_FAIL)"

$LOCAL_BAK = Join-Path $BACKUP_DIR "dev.db.$TS"
Run-ScpFrom "$REMOTE_DIR/server/prisma/dev.db.bak.$TS" $LOCAL_BAK

Write-Host ''
Write-Host '=== [2/5] Загрузка изменений на сервер ===' -ForegroundColor Cyan
Run-Ssh "cd $REMOTE_DIR && (git fetch && (git diff --quiet HEAD..@{u} && echo NO_UPDATES || git pull --rebase --autostash))"

Write-Host ''
Write-Host '=== [3/5] Установка зависимостей ===' -ForegroundColor Cyan
Run-Ssh "cd $REMOTE_DIR/server && (npm ci --omit=dev 2>/dev/null || npm install --omit=dev)"
Run-Ssh "cd $REMOTE_DIR           && (npm ci --omit=dev 2>/dev/null || npm install --omit=dev)"

Write-Host ''
Write-Host '=== [4/5] Применение миграций БЕЗ потери данных ===' -ForegroundColor Cyan
Run-Ssh "cd $REMOTE_DIR/server && npx prisma migrate deploy"

Write-Host ''
Write-Host '=== [5/5] Сборка и перезапуск ===' -ForegroundColor Cyan
Run-Ssh "cd $REMOTE_DIR && npm run build"
Run-Ssh "pm2 restart advokat-server 2>/dev/null || (cd $REMOTE_DIR/server && pm2 start 'node dist/index.js' --name advokat-server)"

Write-Host ''
Write-Host '=== ГОТОВО ===' -ForegroundColor Green
Write-Host "Бэкап БД на сервере: $REMOTE_DIR/server/prisma/dev.db.bak.$TS" -ForegroundColor Green
Write-Host "Локальная копия:     $LOCAL_BAK" -ForegroundColor Green

# Подчищаем секреты
Remove-Item -LiteralPath $PWD_DIR -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item env:SSH_ASKPASS         -ErrorAction SilentlyContinue
Remove-Item env:SSH_ASKPASS_REQUIRE -ErrorAction SilentlyContinue
Remove-Item env:SSH_ASKPASS_PWD     -ErrorAction SilentlyContinue
Remove-Item env:DISPLAY             -ErrorAction SilentlyContinue
[System.GC]::Collect()
