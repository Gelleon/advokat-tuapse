# Восстановление server/prisma/dev.db из последнего бэкапа на VPS
$ErrorActionPreference = 'Stop'

function Read-DeployEnv {
  param([string]$Path)
  $result = @{}
  if (-not (Test-Path -LiteralPath $Path)) { return $result }
  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq '' -or $line.StartsWith('#')) { return }
    $idx = $line.IndexOf('=')
    if ($idx -lt 1) { return }
    $result[$line.Substring(0, $idx).Trim()] = $line.Substring($idx + 1).Trim()
  }
  return $result
}

$ENV_FILE = Join-Path $PSScriptRoot 'deploy.env'
$cfg = Read-DeployEnv $ENV_FILE
$SERVER_USER = if ($cfg['SERVER_USER']) { $cfg['SERVER_USER'] } else { 'root' }
$SERVER_HOST = if ($cfg['SERVER_HOST']) { $cfg['SERVER_HOST'] } else { '155.212.140.95' }
$SERVER_PATH = if ($cfg['SERVER_PATH']) { $cfg['SERVER_PATH'] } else { '/var/www/advokat-tuapse' }
$SERVER_PASSWORD = $cfg['SERVER_PASSWORD']
$SERVER = "$SERVER_USER@$SERVER_HOST"

if ([string]::IsNullOrWhiteSpace($SERVER_PASSWORD)) {
  Write-Host '[ERROR] SERVER_PASSWORD not set in deploy.env' -ForegroundColor Red
  exit 1
}

$TS = Get-Date -Format 'yyyyMMdd-HHmmss'
$PWD_DIR = Join-Path $env:TEMP "sshpwd_restore_$TS"
New-Item -ItemType Directory -Path $PWD_DIR -Force | Out-Null
$ASKPASS = Join-Path $PWD_DIR 'askpass.ps1'
$SEC_FILE = Join-Path $PWD_DIR 'pwd.txt'
[System.IO.File]::WriteAllText($SEC_FILE, $SERVER_PASSWORD)
@"
`$env:SSH_ASKPASS_PWD = Get-Content -LiteralPath '$SEC_FILE' -Raw
[Console]::WriteLine(`$env:SSH_ASKPASS_PWD)
"@ | Out-File -FilePath $ASKPASS -Encoding ascii

$env:SSH_ASKPASS = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$ASKPASS`""
$env:SSH_ASKPASS_REQUIRE = 'force'
$env:DISPLAY = ':0'
$SSH_OPTS = @('-o', 'StrictHostKeyChecking=accept-new', '-o', 'BatchMode=no', '-o', 'RequestTTY=no')

function Run-Ssh {
  param([string]$Cmd)
  & ssh @SSH_OPTS $SERVER $Cmd
  if ($LASTEXITCODE -ne 0) { throw "ssh failed: $Cmd" }
}

Write-Host '=== Restore database from latest backup ===' -ForegroundColor Cyan
Run-Ssh "cd $SERVER_PATH/server/prisma && ls -lt dev.db.bak.* 2>/dev/null | head -5"
Run-Ssh "cd $SERVER_PATH/server/prisma && LATEST=`$(ls -t dev.db.bak.* 2>/dev/null | head -1) && if [ -z `"`$LATEST`" ]; then echo NO_BACKUP; exit 1; fi && cp dev.db dev.db.before-restore.$TS && cp `"`$LATEST`" dev.db && echo RESTORED:`$LATEST"

if (-not $SkipRestart) {
  Write-Host '=== Restart backend ===' -ForegroundColor Cyan
  Run-Ssh "cd $SERVER_PATH/server && (pm2 restart advokat-api 2>/dev/null || pm2 start bash --name advokat-api -- -c 'npx tsx index.ts') && pm2 save"
  Start-Sleep -Seconds 2
  Run-Ssh "curl -fsS http://127.0.0.1:5000/api/health || true"
  Run-Ssh "cd $SERVER_PATH/server && python3 - <<'PY'
import sqlite3
con = sqlite3.connect('prisma/dev.db')
print('Cases in DB:', con.execute('SELECT COUNT(*) FROM \"Case\"').fetchone()[0])
con.close()
PY"
}

Remove-Item -LiteralPath $PWD_DIR -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item env:SSH_ASKPASS, env:SSH_ASKPASS_REQUIRE, env:DISPLAY -ErrorAction SilentlyContinue
Write-Host '=== DONE ===' -ForegroundColor Green
