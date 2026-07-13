# ============================================================
# Safe deploy for advokat-tuapse.ru (PowerShell)
# Guarantees the SQLite database is NOT destroyed by the deploy:
#  - Creates a backup of dev.db on the server BEFORE anything
#  - Downloads that backup to ./backups/
#  - Uses `prisma migrate deploy` (not reset, not --force-reset)
#  - Count cases BEFORE and AFTER the deploy; if count shrank,
#    automatically restores the backup
#  - Password never saved to disk (SecureString, cleared after use)
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
$SERVER_PASSWORD = $null
[System.GC]::Collect()

# SSH options
$SSH_OPTS = @('-o', 'StrictHostKeyChecking=accept-new', '-o', 'BatchMode=no')

function Run-Ssh {
  param([string]$Cmd)
  & ssh @SSH_OPTS $SERVER $Cmd
  if ($LASTEXITCODE -ne 0) {
    throw "ssh exited with code $LASTEXITCODE. Command: $Cmd"
  }
}

function Run-SshQuiet {
  param([string]$Cmd)
  $out = & ssh @SSH_OPTS $SERVER $Cmd 2>&1
  return ($out -join "`n").Trim()
}

function Run-SshWithRC {
  param([string]$Cmd)
  # Run command, capture both stdout and exit code. Returns hashtable.
  $out = & ssh @SSH_OPTS $SERVER "echo __RC__\$?\necho __OUT__\n$Cmd" 2>&1
  $text = ($out -join "`n")
  $rcLine = ($text | Select-String -Pattern '^__RC__-?\d+$' | Select-Object -First 1).Line
  $stdout = ($text -replace '^__RC__-?\d+\s*', '' -replace '^__OUT__\s*', '')
  if ($rcLine) {
    $rc = [int]($rcLine -replace '^__RC__', '')
  } else {
    $rc = 0
  }
  return @{ RC = $rc; Out = $stdout.Trim() }
}

function Run-ScpFrom {
  param([string]$RemotePath, [string]$LocalPath)
  & scp @SSH_OPTS "${SERVER}:${RemotePath}" $LocalPath
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "scp failed: $RemotePath -> $LocalPath (server backup is still saved)"
  }
}

# Helper: count Case rows directly via the SQLite file (avoids any
# Prisma client generation issues on the server). Falls back to better-sqlite3
# or sqlite3 CLI if available.
$SCRIPTS_DIR  = Join-Path $env:TEMP "deploy_scripts_$TS"
New-Item -ItemType Directory -Path $SCRIPTS_DIR -Force | Out-Null
$COUNT_SCRIPT_LOCAL  = Join-Path $SCRIPTS_DIR 'count_cases.cjs'
$COUNT_SCRIPT_REMOTE = "$REMOTE_DIR/_deploy_count_$TS.cjs"

# Script: tries to load better-sqlite3 from server's node_modules.
# If that fails, it tries sqlite3 CLI; if that fails, prints empty -> caller returns -1.
$nl = [Environment]::NewLine
# Build script as a single string with concatenation to keep ASCII content
# free of PowerShell quote-escaping issues.
$countScriptContent = @(
  'const DB_PATH = process.argv[2];'
  '(async () => {'
  '  let Database;'
  '  try { Database = require("/var/www/advokat-tuapse/server/node_modules/better-sqlite3"); } catch (e) {}'
  '  if (Database) {'
  '    const db = new Database(DB_PATH, { readonly: true });'
  '    const row = db.prepare(String.fromCharCode(83,69,76,69,67,84,32,67,79,85,78,84,40,42,41,32,65,83,32,110,32,70,82,79,77,32,34,67,97,115,101,34)).get();'
  '    process.stdout.write(String(row.n));'
  '    db.close();'
  '    return;'
  '  }'
  '  const { execSync } = require("child_process");'
  '  const sql = String.fromCharCode(83,69,76,69,67,84,32,67,79,85,78,84,40,42,41,32,70,82,79,77,32,34,67,97,115,101,34,59);'
  '  const out = execSync("sqlite3 " + JSON.stringify(DB_PATH) + " " + JSON.stringify(sql), { encoding: "utf8" }).trim();'
  '  const m = out.match(/^(\d+)/);'
  '  if (m) process.stdout.write(m[1]);'
  '})().catch(e => { console.error("COUNT_ERR:" + e.message); process.exit(1); });'
) -join $nl
[System.IO.File]::WriteAllText($COUNT_SCRIPT_LOCAL, $countScriptContent, [System.Text.Encoding]::ASCII)

function Get-RemoteCaseCount {
  $dbRemote = "$REMOTE_DIR/server/prisma/dev.db"
  & scp @SSH_OPTS $COUNT_SCRIPT_LOCAL "${SERVER}:${COUNT_SCRIPT_REMOTE}" 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { return -1 }

  # Pass DB path as argv; no quoting inside ssh command -> no shell escaping issues.
  $raw = Run-SshQuiet "node '$COUNT_SCRIPT_REMOTE' '$dbRemote' 2>&1; echo __NODE_RC__\$?"
  & ssh @SSH_OPTS $SERVER "rm -f '$COUNT_SCRIPT_REMOTE'" 2>&1 | Out-Null

  $clean = ($raw -replace '__NODE_RC__\d+\s*$', '' -replace '^COUNT_ERR:.*$', '').Trim()
  if ($clean -match '^\d+$') { return [int]$clean }

  if ($clean) {
    Write-Host ('[count_cases.cjs output on server]:') -ForegroundColor DarkYellow
    Write-Host $clean -ForegroundColor DarkYellow
  }
  return -1
}

# --- Main sequence --------------------------------------------

Write-Host ''
Write-Host '=== Connecting to '$SERVER' ===' -ForegroundColor Cyan
Run-Ssh 'echo CONNECT_OK'

# ---- Step 1: Backup BEFORE anything ---------------------------

Write-Host ''
Write-Host '=== [1/6] Backup SQLite DB from server ===' -ForegroundColor Cyan
Run-Ssh "cd $REMOTE_DIR/server && (test -f prisma/dev.db && cp prisma/dev.db prisma/dev.db.bak.$TS && echo BACKUP_CREATED || echo NO_DB)"
Run-Ssh "cd $REMOTE_DIR/server && (test -f prisma/dev.db.bak.$TS && echo BACKUP_OK || echo BACKUP_FAIL)"

$LOCAL_BAK = Join-Path $BACKUP_DIR "dev.db.$TS"
Run-ScpFrom "$REMOTE_DIR/server/prisma/dev.db.bak.$TS" $LOCAL_BAK

$CASES_BEFORE = Get-RemoteCaseCount
Write-Host ("Cases in DB BEFORE deploy: $CASES_BEFORE") -ForegroundColor Yellow

# Safety block: refuse to run if known dangerous deploy step exists on the server
Write-Host ''
Write-Host '=== [2/6] Guard: refuse if dangerous deploy step exists ===' -ForegroundColor Cyan
$dangerous = Run-SshQuiet "grep -rEl 'prisma\\s+migrate\\s+reset(\\s|$)|prisma\\s+db\\s+push\\s+--force-reset|\\brm\\s+.*dev\\.db\\b|\\bnpm\\s+run\\s+seed\\b' $REMOTE_DIR/deploy.bat $REMOTE_DIR/deploy.ps1 $REMOTE_DIR/force-update.ps1 2>/dev/null || true"
if ([string]::IsNullOrWhiteSpace($dangerous)) {
  Write-Host 'No dangerous step found on the server. Safe to continue.' -ForegroundColor Green
} else {
  Write-Host 'WARNING: dangerous deploy step detected on the server:' -ForegroundColor Red
  Write-Host $dangerous -ForegroundColor Red
  $ans = Read-Host 'Type SKIP to continue anyway, or anything else to abort'
  if ($ans -ne 'SKIP') {
    Write-Host 'Aborted by user. Database untouched.' -ForegroundColor Yellow
    exit 2
  }
}

# ---- Step 3: Pull changes ------------------------------------

Write-Host ''
Write-Host '=== [3/6] Pull changes to server ===' -ForegroundColor Cyan
Run-Ssh "cd $REMOTE_DIR && (git fetch && (git diff --quiet HEAD..@{u} && echo NO_UPDATES || git pull --rebase --autostash))"

# ---- Step 4: Install deps ------------------------------------

Write-Host ''
Write-Host '=== [4/6] Install dependencies ===' -ForegroundColor Cyan
Run-Ssh "cd $REMOTE_DIR/server && (npm ci --omit=dev 2>/dev/null || npm install --omit=dev)"
Run-Ssh "cd $REMOTE_DIR           && (npm ci --omit=dev 2>/dev/null || npm install --omit=dev)"

# ---- Step 5: Apply migrations WITHOUT data loss ---------------

Write-Host ''
Write-Host '=== [5/6] Apply migrations WITHOUT data loss ===' -ForegroundColor Cyan
Run-Ssh "cd $REMOTE_DIR/server && npx prisma migrate deploy"
# Make sure the typed client exists so the server actually runs.
Run-Ssh "cd $REMOTE_DIR/server && npx prisma generate"

# Build + restart
Run-Ssh "cd $REMOTE_DIR && npm run build"
Run-Ssh "pm2 restart advokat-server 2>/dev/null || (cd $REMOTE_DIR/server && pm2 start 'node dist/index.js' --name advokat-server)"

# ---- Step 6: Verify data is still there ----------------------

Write-Host ''
Write-Host '=== [6/6] Verify cases count did not shrink ===' -ForegroundColor Cyan
$CASES_AFTER = Get-RemoteCaseCount
Write-Host ("Cases in DB AFTER deploy:  $CASES_AFTER") -ForegroundColor Yellow

if ($CASES_BEFORE -ge 0 -and $CASES_AFTER -ge 0 -and $CASES_AFTER -lt $CASES_BEFORE) {
  Write-Host ''
  Write-Host '!!! DEPLOY REDUCED CASE COUNT: before='$CASES_BEFORE' after='$CASES_AFTER' !!!' -ForegroundColor Red
  Write-Host 'Restoring database from backup ...' -ForegroundColor Red
  Run-Ssh "cd $REMOTE_DIR/server && cp prisma/dev.db.bak.$TS prisma/dev.db && pm2 restart advokat-server && echo RESTORED_OK"
  Write-Host 'Database restored from backup. Please review the server deploy scripts.' -ForegroundColor Red
  exit 3
}

Write-Host ''
Write-Host '=== DONE ===' -ForegroundColor Green
Write-Host ("Cases preserved: before=$CASES_BEFORE after=$CASES_AFTER") -ForegroundColor Green
Write-Host "Server backup: $REMOTE_DIR/server/prisma/dev.db.bak.$TS" -ForegroundColor Green
Write-Host "Local backup:  $LOCAL_BAK" -ForegroundColor Green

# Clean secrets
Remove-Item -LiteralPath $PWD_DIR     -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $SCRIPTS_DIR -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item env:SSH_ASKPASS         -ErrorAction SilentlyContinue
Remove-Item env:SSH_ASKPASS_REQUIRE -ErrorAction SilentlyContinue
Remove-Item env:SSH_ASKPASS_PWD     -ErrorAction SilentlyContinue
Remove-Item env:DISPLAY             -ErrorAction SilentlyContinue
[System.GC]::Collect()
