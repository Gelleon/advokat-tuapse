# ============================================================
# Safe deploy for advokat-tuapse.ru (PowerShell)
# Guarantees the SQLite database is NOT destroyed by the deploy:
#  - Commits and pushes local changes before connecting to the server
#  - Creates a backup of dev.db on the server BEFORE anything
#  - Downloads that backup to ./backups/
#  - Syncs server code via fetch + reset --hard origin/main (DB restored separately)
#  - Uses `prisma migrate deploy` (not reset, not --force-reset)
#  - Count cases BEFORE and AFTER the deploy; if count shrank,
#    automatically restores the backup
#  - Password from deploy.env (gitignored) or prompted once if missing
# ============================================================

$ErrorActionPreference = 'Stop'

# Локально: без интерактивных запросов git/npm
$env:GIT_TERMINAL_PROMPT = '0'
$env:GIT_PAGER = 'cat'
$env:CI = 'true'

$LOG_FILE = Join-Path $PSScriptRoot 'deploy.last.log'

function Start-DeployLog {
  try {
    Set-Content -LiteralPath $LOG_FILE -Value ("=== Deploy started {0} ===`r`n" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) -Encoding UTF8
  } catch {
    Write-Host ("Warning: cannot write log file ({0}). Continuing." -f $_.Exception.Message) -ForegroundColor Yellow
  }
}

function Stop-DeployLog {
  try {
    Add-Content -LiteralPath $LOG_FILE -Value ("=== Deploy finished {0} ===`r`n" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) -Encoding UTF8
  } catch {}
}

Start-DeployLog

trap {
  Write-Host ''
  Write-Host '!!! DEPLOY FAILED !!!' -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  if ($_.ScriptStackTrace) {
    Write-Host $_.ScriptStackTrace -ForegroundColor DarkRed
  }
  Stop-DeployLog
  exit 1
}

function Exit-Deploy {
  param([int]$Code = 0)
  Stop-DeployLog
  exit $Code
}

function Invoke-Git {
  param([string[]]$GitArgs)
  $prevEAP = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $out = & git -C $PSScriptRoot @GitArgs 2>&1
    return @{
      Out = (($out | ForEach-Object {
        if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.ToString() } else { "$_" }
      }) -join "`n").Trim()
      RC  = $LASTEXITCODE
    }
  } finally {
    $ErrorActionPreference = $prevEAP
  }
}

function Publish-LocalGitChanges {
  param([string]$CustomMessage)

  Write-Host ''
  Write-Host '=== [1/8] Commit and push local changes ===' -ForegroundColor Cyan

  $gitCheck = Invoke-Git @('rev-parse', '--is-inside-work-tree')
  if ($gitCheck.RC -ne 0 -or $gitCheck.Out -ne 'true') {
    throw 'Not a git repository. Cannot auto-commit.'
  }

  $status = Invoke-Git @('status', '--porcelain')
  $hasChanges = -not [string]::IsNullOrWhiteSpace($status.Out)

  $ahead = 0
  $upstreamCheck = Invoke-Git @('rev-parse', '--abbrev-ref', '@{u}')
  if ($upstreamCheck.RC -eq 0 -and -not [string]::IsNullOrWhiteSpace($upstreamCheck.Out)) {
    $aheadOut = Invoke-Git @('rev-list', '--count', '@{u}..HEAD')
    if ($aheadOut.RC -eq 0 -and $aheadOut.Out -match '^\d+$') {
      $ahead = [int]$aheadOut.Out.Trim()
    }
  }

  if (-not $hasChanges -and $ahead -eq 0) {
    Write-Host 'No local changes to commit or push. Continuing.' -ForegroundColor Yellow
    return
  }

  if ($hasChanges) {
    $add = Invoke-Git @('add', '-A')
    if ($add.RC -ne 0) { throw "git add failed: $($add.Out)" }

    Invoke-Git @('reset', 'HEAD', '--', 'deploy.env', 'deploy.last.log', 'backups') | Out-Null

    $staged = Invoke-Git @('diff', '--cached', '--name-only')
    if ([string]::IsNullOrWhiteSpace($staged.Out)) {
      Write-Host 'Only ignored or sensitive files changed — nothing to commit.' -ForegroundColor Yellow
    } else {
      $stagedFiles = @($staged.Out -split "`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
      $forbidden = $stagedFiles | Where-Object {
        $_ -match '(^deploy\.env$)|(\.db$)|(^backups/)|(^deploy\.last\.log$)|(^\.env$)'
      }
      if ($forbidden) {
        throw "Refusing to commit sensitive files: $($forbidden -join ', ')"
      }

      if (-not [string]::IsNullOrWhiteSpace($CustomMessage)) {
        $msg = $CustomMessage
      } else {
        $fileList = ($stagedFiles | ForEach-Object { Split-Path $_ -Leaf }) -join ', '
        $msg = "deploy: auto-commit ($fileList)"
        if ($msg.Length -gt 240) {
          $msg = "deploy: auto-commit $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
        }
      }

      $commit = Invoke-Git @('commit', '-m', $msg)
      if ($commit.RC -ne 0) { throw "git commit failed: $($commit.Out)" }
      Write-Host "Committed: $msg" -ForegroundColor Green
      if ($commit.Out) { Write-Host $commit.Out }
      $ahead = [Math]::Max($ahead, 1)
    }
  }

  if ($ahead -gt 0) {
    $branch = (Invoke-Git @('rev-parse', '--abbrev-ref', 'HEAD')).Out.Trim()
    Write-Host "Pushing to origin/$branch ..." -ForegroundColor Cyan
    $push = Invoke-Git @('push', 'origin', $branch)
    if ($push.RC -ne 0) { throw "git push failed: $($push.Out)" }
    if ($push.Out) { Write-Host $push.Out }
    Write-Host 'Local changes published to remote.' -ForegroundColor Green
  }
}

function Read-DeployEnv {
  param([string]$Path)
  $result = @{}
  if (-not (Test-Path -LiteralPath $Path)) { return $result }
  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq '' -or $line.StartsWith('#')) { return }
    $idx = $line.IndexOf('=')
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1).Trim()
    $result[$key] = $val
  }
  return $result
}

Write-Host ''
Write-Host '=== Safe deploy advokat-tuapse.ru ===' -ForegroundColor Cyan
Write-Host ''

# --- Credentials (deploy.env or built-in defaults) ------------
$ENV_FILE = Join-Path $PSScriptRoot 'deploy.env'
$cfg = Read-DeployEnv $ENV_FILE

$SERVER_USER = $cfg['SERVER_USER']
if ([string]::IsNullOrWhiteSpace($SERVER_USER)) { $SERVER_USER = 'root' }

$SERVER_HOST = $cfg['SERVER_HOST']
if ([string]::IsNullOrWhiteSpace($SERVER_HOST)) { $SERVER_HOST = '155.212.140.95' }

$SERVER_PATH = $cfg['SERVER_PATH']
if ([string]::IsNullOrWhiteSpace($SERVER_PATH)) { $SERVER_PATH = '/var/www/advokat-tuapse' }

$SERVER = "$SERVER_USER@$SERVER_HOST"
$REMOTE_DIR = $SERVER_PATH

Write-Host ("Target: {0}:{1}" -f $SERVER, $REMOTE_DIR) -ForegroundColor Green

$GIT_COMMIT_MESSAGE = $cfg['GIT_COMMIT_MESSAGE']
Publish-LocalGitChanges -CustomMessage $GIT_COMMIT_MESSAGE

$SERVER_PASSWORD = $cfg['SERVER_PASSWORD']
if ([string]::IsNullOrWhiteSpace($SERVER_PASSWORD) -or $SERVER_PASSWORD -eq 'your_password_here') {
  $securePwd = Read-Host 'SSH password (save to deploy.env to skip this prompt)' -AsSecureString
  if ($securePwd -eq $null -or $securePwd.Length -eq 0) {
    Write-Host '[ERROR] Password is required' -ForegroundColor Red
    Exit-Deploy 1
  }
  $BNet = New-Object System.Net.NetworkCredential('', $securePwd)
  $SERVER_PASSWORD = $BNet.Password
}

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

# SSH options — без TTY, keepalive для длинных npm-команд
$SSH_OPTS = @(
  '-o', 'StrictHostKeyChecking=accept-new',
  '-o', 'BatchMode=no',
  '-o', 'RequestTTY=no',
  '-o', 'ConnectTimeout=30',
  '-o', 'ServerAliveInterval=15',
  '-o', 'ServerAliveCountMax=20',
  '-o', 'LogLevel=ERROR'
)

function Wrap-RemoteCommand {
  param([string]$Cmd)
  return "export GIT_TERMINAL_PROMPT=0 GIT_PAGER=cat CI=true NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false DEBIAN_FRONTEND=noninteractive; $Cmd"
}

function Convert-NativeOutput {
  param([object[]]$Records)
  return ($Records | ForEach-Object {
    if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.ToString() } else { "$_" }
  })
}

function Invoke-SshCapture {
  param([string]$Cmd)
  $prevEAP = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $remoteCmd = Wrap-RemoteCommand $Cmd
    $out = Convert-NativeOutput (& ssh @SSH_OPTS $SERVER $remoteCmd 2>&1)
    return @{ Out = ($out -join "`n").Trim(); RC = $LASTEXITCODE }
  } finally {
    $ErrorActionPreference = $prevEAP
  }
}

function Run-Ssh {
  param([string]$Cmd)
  $result = Invoke-SshCapture $Cmd
  if ($result.Out) { Write-Host $result.Out }
  if ($result.RC -ne 0) {
    throw "ssh exited with code $($result.RC). Command: $Cmd`nOutput:`n$($result.Out)"
  }
}

function Run-SshQuiet {
  param([string]$Cmd)
  return (Invoke-SshCapture $Cmd).Out
}

function Run-SshWithRC {
  param([string]$Cmd)
  $prevEAP = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $remoteCmd = Wrap-RemoteCommand "$Cmd; echo __DEPLOY_RC__`$?"
    $out = Convert-NativeOutput (& ssh @SSH_OPTS $SERVER $remoteCmd 2>&1)
    $text = ($out -join "`n").Trim()
    $rcLine = ($text | Select-String -Pattern '__DEPLOY_RC__-?\d+\s*$' | Select-Object -First 1).Line
    $stdout = ($text -replace '__DEPLOY_RC__-?\d+\s*$', '').Trim()
    if ($rcLine -match '__DEPLOY_RC__(-?\d+)') {
      $rc = [int]$Matches[1]
    } else {
      $rc = $LASTEXITCODE
    }
    return @{ RC = $rc; Out = $stdout }
  } finally {
    $ErrorActionPreference = $prevEAP
  }
}

function Run-ScpFrom {
  param([string]$RemotePath, [string]$LocalPath)
  & scp @SSH_OPTS "${SERVER}:${RemotePath}" $LocalPath
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "scp failed: $RemotePath -> $LocalPath (server backup is still saved)"
  }
}

function Parse-CaseCountOutput {
  param([string]$Raw)
  if ([string]::IsNullOrWhiteSpace($Raw)) { return $null }
  $line = ($Raw -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -match '^\d+$' } | Select-Object -First 1)
  if ($line) { return [int]$line }
  return $null
}

# Helper: count Case rows in SQLite. Python first — works before npm install.
$SCRIPTS_DIR  = Join-Path $env:TEMP "deploy_scripts_$TS"
New-Item -ItemType Directory -Path $SCRIPTS_DIR -Force | Out-Null
$COUNT_PY_LOCAL     = Join-Path $SCRIPTS_DIR 'count_cases.py'
$COUNT_PY_REMOTE    = "$REMOTE_DIR/server/_deploy_count_$TS.py"
$COUNT_SCRIPT_LOCAL  = Join-Path $SCRIPTS_DIR 'count_cases.cjs'
$COUNT_SCRIPT_REMOTE = "$REMOTE_DIR/server/_deploy_count_$TS.cjs"

@'
import sqlite3
import sys

db_path = sys.argv[1] if len(sys.argv) > 1 else "prisma/dev.db"
con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
try:
    cur = con.cursor()
    cur.execute('SELECT COUNT(*) FROM "Case"')
    print(cur.fetchone()[0])
finally:
    con.close()
'@ | Set-Content -LiteralPath $COUNT_PY_LOCAL -Encoding ASCII

$nl = [Environment]::NewLine
$countScriptContent = @(
  "'use strict';"
  'const DB_PATH = process.argv[2] || "prisma/dev.db";'
  'async function main() {'
  '  try {'
  '    const Database = require("better-sqlite3");'
  '    const db = new Database(DB_PATH, { readonly: true });'
  '    try {'
  '      const row = db.prepare(''SELECT COUNT(*) AS n FROM "Case"'').get();'
  '      process.stdout.write(String(row.n));'
  '      return;'
  '    } finally {'
  '      db.close();'
  '    }'
  '  } catch (sqliteErr) {'
  '    try {'
  '      const { PrismaClient } = require("@prisma/client");'
  '      const prisma = new PrismaClient();'
  '      try {'
  '        const n = await prisma.case.count();'
  '        process.stdout.write(String(n));'
  '        return;'
  '      } finally {'
  '        await prisma.$disconnect();'
  '      }'
  '    } catch (prismaErr) {'
  '      console.error("COUNT_ERR:better-sqlite3=" + sqliteErr.message + "; prisma=" + prismaErr.message);'
  '      process.exit(1);'
  '    }'
  '  }'
  '}'
  'main();'
) -join $nl
[System.IO.File]::WriteAllText($COUNT_SCRIPT_LOCAL, $countScriptContent, [System.Text.Encoding]::ASCII)

function Get-RemoteCaseCount {
  $dbExists = Run-SshQuiet "cd $REMOTE_DIR/server && (test -f prisma/dev.db && echo YES || echo NO)"
  if ($dbExists.Trim() -ne 'YES') {
    Write-Host 'No prisma/dev.db on server — case count treated as 0.' -ForegroundColor Yellow
    return 0
  }

  # 1) Python stdlib sqlite3 (no node_modules required)
  & scp @SSH_OPTS $COUNT_PY_LOCAL "${SERVER}:${COUNT_PY_REMOTE}" 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $raw = Run-SshQuiet "cd $REMOTE_DIR/server && python3 ./_deploy_count_$TS.py prisma/dev.db 2>&1"
    & ssh @SSH_OPTS $SERVER "rm -f '$COUNT_PY_REMOTE'" 2>&1 | Out-Null
    $count = Parse-CaseCountOutput $raw
    if ($null -ne $count) { return $count }
    if ($raw) {
      Write-Host '[count_cases.py on server]:' -ForegroundColor DarkYellow
      Write-Host $raw -ForegroundColor DarkYellow
    }
  }

  # 2) sqlite3 CLI if installed
  $raw = Run-SshQuiet "cd $REMOTE_DIR/server && (command -v sqlite3 >/dev/null && sqlite3 prisma/dev.db 'SELECT COUNT(*) FROM \"Case\";' 2>/dev/null || true)"
  $count = Parse-CaseCountOutput $raw
  if ($null -ne $count) { return $count }

  # 3) Node fallback (ensure server deps exist)
  Run-SshQuiet "cd $REMOTE_DIR/server && (test -d node_modules/better-sqlite3 || npm install --omit=dev >/dev/null 2>&1 || true)" | Out-Null

  & scp @SSH_OPTS $COUNT_SCRIPT_LOCAL "${SERVER}:${COUNT_SCRIPT_REMOTE}" 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { return -1 }

  $raw = Run-SshQuiet "cd $REMOTE_DIR/server && node ./_deploy_count_$TS.cjs 'prisma/dev.db' 2>&1; echo __NODE_RC__`$?"
  & ssh @SSH_OPTS $SERVER "rm -f '$COUNT_SCRIPT_REMOTE'" 2>&1 | Out-Null

  $clean = ($raw -replace '__NODE_RC__\S+\s*$', '').Trim()
  $count = Parse-CaseCountOutput $clean
  if ($null -ne $count) { return $count }

  if ($clean) {
    Write-Host '[count_cases.cjs on server]:' -ForegroundColor DarkYellow
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
Write-Host '=== [2/8] Backup SQLite DB from server ===' -ForegroundColor Cyan
Run-Ssh "cd $REMOTE_DIR/server && (test -f prisma/dev.db && cp prisma/dev.db prisma/dev.db.bak.$TS && echo BACKUP_CREATED || echo NO_DB)"
Run-Ssh "cd $REMOTE_DIR/server && (test -f prisma/dev.db.bak.$TS && echo BACKUP_OK || echo BACKUP_FAIL)"

$LOCAL_BAK = Join-Path $BACKUP_DIR "dev.db.$TS"
Run-ScpFrom "$REMOTE_DIR/server/prisma/dev.db.bak.$TS" $LOCAL_BAK

$CASES_BEFORE = Get-RemoteCaseCount
Write-Host ("Cases in DB BEFORE deploy: $CASES_BEFORE") -ForegroundColor Yellow

# Safety block: refuse to run if known dangerous deploy step exists on the server
Write-Host ''
Write-Host '=== [3/8] Guard: refuse if dangerous deploy step exists ===' -ForegroundColor Cyan
$dangerous = Run-SshQuiet "grep -rEl 'prisma\\s+migrate\\s+reset(\\s|$)|prisma\\s+db\\s+push\\s+--force-reset|\\brm\\s+.*dev\\.db\\b|\\bnpm\\s+run\\s+seed\\b' $REMOTE_DIR/deploy.bat $REMOTE_DIR/deploy.ps1 $REMOTE_DIR/force-update.ps1 2>/dev/null || true"
if ([string]::IsNullOrWhiteSpace($dangerous)) {
  Write-Host 'No dangerous step found on the server. Safe to continue.' -ForegroundColor Green
} else {
  Write-Host 'WARNING: dangerous deploy step detected on the server:' -ForegroundColor Red
  Write-Host $dangerous -ForegroundColor Red
  $skipGuard = $cfg['DEPLOY_SKIP_GUARD']
  if ($skipGuard -eq '1' -or $skipGuard -eq 'true' -or $skipGuard -eq 'yes') {
    Write-Host 'DEPLOY_SKIP_GUARD is set — continuing without prompt.' -ForegroundColor Yellow
  } else {
    throw 'Dangerous deploy step detected. Aborting. Set DEPLOY_SKIP_GUARD=1 in deploy.env to override.'
  }
}

# ---- Step 4: Sync code on server (abort stuck merges, reset to origin) ----

Write-Host ''
Write-Host '=== [4/8] Sync code on server ===' -ForegroundColor Cyan

$conflicts = Run-SshQuiet "cd $REMOTE_DIR && git diff --name-only --diff-filter=U 2>/dev/null || true"
if (-not [string]::IsNullOrWhiteSpace($conflicts)) {
  Write-Host 'Unresolved git conflicts on server (will reset to origin/main):' -ForegroundColor Yellow
  Write-Host $conflicts
}

Run-Ssh "cd $REMOTE_DIR && git fetch origin && (git rebase --abort 2>/dev/null || true) && (git merge --abort 2>/dev/null || true) && (git diff --quiet HEAD origin/main && echo NO_UPDATES || (git reset --hard origin/main && echo SYNC_OK))"

# ---- Step 3b: Restore DB after pull (git may overwrite dev.db from repo) ----

Write-Host ''
Write-Host '=== [5/8] Restore SQLite DB from pre-pull backup ===' -ForegroundColor Cyan
$restoreResult = Run-SshWithRC "cd $REMOTE_DIR/server && if test -f prisma/dev.db.bak.$TS; then cp prisma/dev.db.bak.$TS prisma/dev.db && echo DB_RESTORED; else echo NO_BACKUP; fi"
if ($restoreResult.Out -match 'DB_RESTORED') {
  Write-Host 'Production database restored from backup (git pull cannot overwrite it).' -ForegroundColor Green
} else {
  Write-Host 'No pre-pull backup found — skipping restore (first deploy or empty DB).' -ForegroundColor Yellow
}

# ---- Step 5: Install deps ------------------------------------

Write-Host ''
Write-Host '=== [6/8] Install dependencies ===' -ForegroundColor Cyan
# Server: production deps only (prisma CLI is in dependencies).
Run-Ssh "cd $REMOTE_DIR/server && (npm ci --omit=dev --no-fund --no-audit 2>/dev/null || npm install --omit=dev --no-fund --no-audit)"
# Frontend: full install — vite/tailwind/typescript are devDependencies but required for build.
Run-Ssh "cd $REMOTE_DIR && (npm ci --no-fund --no-audit 2>/dev/null || npm install --no-fund --no-audit)"

# ---- Step 5: Apply migrations WITHOUT data loss ---------------

Write-Host ''
Write-Host '=== [7/8] Apply migrations WITHOUT data loss ===' -ForegroundColor Cyan

# Existing production DBs may have tables but no _prisma_migrations (P3005 on deploy).
$baselineCheck = @(
  'const fs = require("fs");'
  'if (!fs.existsSync("prisma/dev.db")) process.exit(0);'
  'let Database;'
  'try { Database = require("better-sqlite3"); } catch (e) { process.exit(0); }'
  'const db = new Database("prisma/dev.db", { readonly: true });'
  'const tables = db.prepare("SELECT name FROM sqlite_master WHERE type=''table'' AND name NOT LIKE ''sqlite_%''").all().map((r) => r.name);'
  'const hasMig = tables.includes("_prisma_migrations");'
  'const hasData = tables.some((t) => t !== "_prisma_migrations");'
  'db.close();'
  'process.exit(hasData && !hasMig ? 2 : 0);'
) -join $nl
$BASELINE_SCRIPT_LOCAL  = Join-Path $SCRIPTS_DIR 'baseline_check.cjs'
$BASELINE_SCRIPT_REMOTE = "$REMOTE_DIR/server/_deploy_baseline_$TS.cjs"
[System.IO.File]::WriteAllText($BASELINE_SCRIPT_LOCAL, $baselineCheck, [System.Text.Encoding]::ASCII)
& scp @SSH_OPTS $BASELINE_SCRIPT_LOCAL "${SERVER}:${BASELINE_SCRIPT_REMOTE}" 2>&1 | Out-Null
$baselineRc = Run-SshWithRC "cd $REMOTE_DIR/server && node ./_deploy_baseline_$TS.cjs"
& ssh @SSH_OPTS $SERVER "rm -f '$BASELINE_SCRIPT_REMOTE'" 2>&1 | Out-Null

if ($baselineRc.RC -eq 2) {
  Write-Host 'Existing DB without migration history — baselining init migration ...' -ForegroundColor Yellow
  Run-Ssh "cd $REMOTE_DIR/server && npx --yes prisma migrate resolve --applied 20260710110551_init"
}

Run-Ssh "cd $REMOTE_DIR/server && npx --yes prisma migrate deploy"
# Make sure the typed client exists so the server actually runs.
Run-Ssh "cd $REMOTE_DIR/server && npx --yes prisma generate"

# Build + sitemap + restart
Run-Ssh "cd $REMOTE_DIR && npm run build"
Run-Ssh "cd $REMOTE_DIR/server && node generate-sitemap.cjs ../dist/sitemap.xml"
Run-Ssh "test -f $REMOTE_DIR/dist/sitemap.xml && head -n 2 $REMOTE_DIR/dist/sitemap.xml || (echo SITEMAP_MISSING; exit 1)"
Run-Ssh "pm2 restart advokat-server 2>/dev/null || (cd $REMOTE_DIR/server && pm2 start 'node dist/index.js' --name advokat-server)"

# ---- Step 6: Verify data is still there ----------------------

Write-Host ''
Write-Host '=== [8/8] Verify cases count did not shrink ===' -ForegroundColor Cyan
$CASES_AFTER = Get-RemoteCaseCount
Write-Host ("Cases in DB AFTER deploy:  $CASES_AFTER") -ForegroundColor Yellow

if ($CASES_BEFORE -ge 0 -and $CASES_AFTER -ge 0 -and $CASES_AFTER -lt $CASES_BEFORE) {
  Write-Host ''
  Write-Host '!!! DEPLOY REDUCED CASE COUNT: before='$CASES_BEFORE' after='$CASES_AFTER' !!!' -ForegroundColor Red
  Write-Host 'Restoring database from backup ...' -ForegroundColor Red
  Run-Ssh "cd $REMOTE_DIR/server && cp prisma/dev.db.bak.$TS prisma/dev.db && pm2 restart advokat-server && echo RESTORED_OK"
  Write-Host 'Database restored from backup. Please review the server deploy scripts.' -ForegroundColor Red
  Exit-Deploy 3
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

Exit-Deploy 0
