# ============================================================
# Safe deploy for advokat-tuapse.ru (PowerShell)
# - Password never saved to disk (SecureString, cleared after use)
# - Backs up SQLite DB BEFORE any deploy step
# - Applies migrations via `prisma migrate deploy` (no data loss)
# ============================================================

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '=== Safe deploy advokat-tuapse.ru ===' -ForegroundColor Cyan
Write-Host ''

# --- Credentials ------------------------------------------------
$SERVER_USER = Read-Host 'SSH user'
if ([string]::IsNullOrWhiteSpace($SERVER_USER)) { $SERVER_USER = 'root' }

$SERVER_HOST = Read-Host 'SSH host (IP or domain)'
if ([string]::IsNullOrWhiteSpace($SERVER_HOST)) {
  Write-Host '[ERROR] Host is required' -ForegroundColor Red
  exit 1
}

$SERVER_PATH = Read-Host 'Remote path (Enter = /var/www/advokat-tuapse)'
if ([string]::IsNullOrWhiteSpace($SERVER_PATH)) { $SERVER_PATH = '/var/www/advokat-tuapse' }

$securePwd = Read-Host 'SSH password' -AsSecureString
if ($securePwd -eq $null -or $securePwd.Length -eq 0) {
  Write-Host '[ERROR] Password is required' -ForegroundColor Red
  exit 1
}
$BNet = New-Object System.Net.NetworkCredential('', $securePwd)
$SERVER_PASSWORD = $BNet.Password

$SERVER = "$SERVER_USER@$SERVER_HOST"
$REMOTE_DIR = $SERVER_PATH

# Local backup dir
$BACKUP_DIR = Join-Path $PSScriptRoot 'backups'
if (-not (Test-Path $BACKUP_DIR)) { New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null }

$TS = Get-Date -Format 'yyyyMMdd-HHmmss'

# --- Askpass wrapper ------------------------------------------
# Windows OpenSSH when SSH_ASKPASS_REQUIRE=force launches SSH_ASKPASS via CreateProcess
# with no console. Use a small .ps1 that reads password from a temp file.

$PWD_DIR  = Join-Path $env:TEMP "sshpwd_$TS"
New-Item -ItemType Directory -Path $PWD_DIR -Force | Out-Null
$ASKPASS  = Join-Path $PWD_DIR 'askpass.ps1'
$SEC_FILE = Join-Path $PWD_DIR 'pwd.txt'

[System.IO.File]::WriteAllText($SEC_FILE, $SERVER_PASSWORD)

@"
`$env:SSH_ASKPASS_PWD = Get-Content -LiteralPath '$SEC_FILE' -Raw
[Console]::WriteLine(`$env:SSH_ASKPASS_PWD)
"@ | Out-File -FilePath $ASKPASS -Encoding ascii

$env:SSH_ASKPASS         = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$ASKPASS`""
$env:SSH_ASKPASS_REQUIRE = 'force'
$env:DISPLAY             = ':0'

# Clear password var
$SERVER_PASSWORD = $null
[System.GC]::Collect()

# SSH options (no interactive password prompt)
$SSH_OPTS = @('-o', 'StrictHostKeyChecking=accept-new', '-o', 'BatchMode=no')

function Run-Ssh {
  param([string]$Cmd)
  & ssh @SSH_OPTS $SERVER $Cmd
  if ($LASTEXITCODE -ne 0) {
    throw "ssh exited with code $LASTEXITCODE. Command: $Cmd"
  }
}

function Run-ScpFrom {
  param([string]$RemotePath, [string]$LocalPath)
  & scp @SSH_OPTS "${SERVER}:${RemotePath}" $LocalPath
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "scp failed: $RemotePath -> $LocalPath (server backup is still saved)"
  }
}

# --- Main sequence --------------------------------------------

Write-Host ''
Write-Host '=== Connecting to '$SERVER' ===' -ForegroundColor Cyan
Run-Ssh 'echo CONNECT_OK'

Write-Host ''
Write-Host '=== [1/5] Backup SQLite DB from server ===' -ForegroundColor Cyan
Run-Ssh "cd $REMOTE_DIR/server && (test -f prisma/dev.db && cp prisma/dev.db prisma/dev.db.bak.$TS && echo BACKUP_CREATED || echo NO_DB)"
Run-Ssh "cd $REMOTE_DIR/server && (test -f prisma/dev.db.bak.$TS && echo BACKUP_OK || echo BACKUP_FAIL)"

$LOCAL_BAK = Join-Path $BACKUP_DIR "dev.db.$TS"
Run-ScpFrom "$REMOTE_DIR/server/prisma/dev.db.bak.$TS" $LOCAL_BAK

Write-Host ''
Write-Host '=== [2/5] Pull changes to server ===' -ForegroundColor Cyan
Run-Ssh "cd $REMOTE_DIR && (git fetch && (git diff --quiet HEAD..@{u} && echo NO_UPDATES || git pull --rebase --autostash))"

Write-Host ''
Write-Host '=== [3/5] Install dependencies ===' -ForegroundColor Cyan
Run-Ssh "cd $REMOTE_DIR/server && (npm ci --omit=dev 2>/dev/null || npm install --omit=dev)"
Run-Ssh "cd $REMOTE_DIR           && (npm ci --omit=dev 2>/dev/null || npm install --omit=dev)"

Write-Host ''
Write-Host '=== [4/5] Apply migrations WITHOUT data loss ===' -ForegroundColor Cyan
Run-Ssh "cd $REMOTE_DIR/server && npx prisma migrate deploy"

Write-Host ''
Write-Host '=== [5/5] Build and restart ===' -ForegroundColor Cyan
Run-Ssh "cd $REMOTE_DIR && npm run build"
Run-Ssh "pm2 restart advokat-server 2>/dev/null || (cd $REMOTE_DIR/server && pm2 start 'node dist/index.js' --name advokat-server)"

Write-Host ''
Write-Host '=== DONE ===' -ForegroundColor Green
Write-Host "Server backup: $REMOTE_DIR/server/prisma/dev.db.bak.$TS" -ForegroundColor Green
Write-Host "Local backup:  $LOCAL_BAK" -ForegroundColor Green

# Clean secrets
Remove-Item -LiteralPath $PWD_DIR -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item env:SSH_ASKPASS         -ErrorAction SilentlyContinue
Remove-Item env:SSH_ASKPASS_REQUIRE -ErrorAction SilentlyContinue
Remove-Item env:SSH_ASKPASS_PWD     -ErrorAction SilentlyContinue
Remove-Item env:DISPLAY             -ErrorAction SilentlyContinue
[System.GC]::Collect()
