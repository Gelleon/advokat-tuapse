# Yandex Webmaster OAuth (verification code flow).
param(
  [string]$ClientId,
  [string]$ClientSecret,
  [string]$AuthCode
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root 'deploy.env'
$cfg = @{}
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
      $cfg[$matches[1].Trim()] = $matches[2].Trim()
    }
  }
}

if (-not $ClientId) { $ClientId = $cfg['YANDEX_OAUTH_CLIENT_ID'] }
if (-not $ClientSecret) { $ClientSecret = $cfg['YANDEX_OAUTH_CLIENT_SECRET'] }
$user = if ($cfg['SERVER_USER']) { $cfg['SERVER_USER'] } else { 'root' }
$hostName = if ($cfg['SERVER_HOST']) { $cfg['SERVER_HOST'] } else { '155.212.140.95' }
$remoteDir = if ($cfg['SERVER_PATH']) { $cfg['SERVER_PATH'] } else { '/var/www/advokat-tuapse' }
$password = $cfg['SERVER_PASSWORD']

if (-not $ClientId -or -not $ClientSecret) {
  throw 'Set YANDEX_OAUTH_CLIENT_ID and YANDEX_OAUTH_CLIENT_SECRET in deploy.env'
}
if (-not $password) {
  throw 'Set SERVER_PASSWORD in deploy.env'
}

function Initialize-SshAskPass {
  $TS = [guid]::NewGuid().ToString('n')
  $dir = Join-Path $env:TEMP "sshpwd_$TS"
  New-Item -ItemType Directory -Path $dir -Force | Out-Null
  $ask = Join-Path $dir 'askpass.ps1'
  $pwdFile = Join-Path $dir 'pwd.txt'
  [System.IO.File]::WriteAllText($pwdFile, $password)
  Set-Content -Path $ask -Value @"
`$pwd = Get-Content -LiteralPath '$pwdFile' -Raw
[Console]::WriteLine(`$pwd)
"@
  $env:SSH_ASKPASS = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$ask`""
  $env:SSH_ASKPASS_REQUIRE = 'force'
  $env:DISPLAY = 'dummy'
  return @('-o', 'StrictHostKeyChecking=no', '-o', 'BatchMode=no', '-o', 'ConnectTimeout=30')
}

function Get-OAuthToken {
  param([string]$Code)
  $r = Invoke-RestMethod -Uri 'https://oauth.yandex.ru/token' -Method Post -Body @{
    grant_type    = 'authorization_code'
    code          = $Code
    client_id     = $ClientId
    client_secret = $ClientSecret
  }
  if (-not $r.access_token) { throw 'No access_token in response' }
  return $r.access_token
}

function Save-TokenOnServer {
  param([string]$Token)
  $sshOpts = Initialize-SshAskPass
  $server = "${user}@${hostName}"
  $tmpLocal = Join-Path $env:TEMP "yandex_token_$([guid]::NewGuid().ToString('n')).env"
  $tmpRemote = '/tmp/yandex_oauth_token.env'
  [System.IO.File]::WriteAllText($tmpLocal, "YANDEX_WEBMASTER_OAUTH_TOKEN=$Token`n", [System.Text.UTF8Encoding]::new($false))

  & scp @sshOpts $tmpLocal "${server}:${tmpRemote}"
  if ($LASTEXITCODE -ne 0) { throw 'scp failed' }

  $remoteCmd = @"
python3 - <<'PY'
from pathlib import Path
env_path = Path('$remoteDir/server/.env')
token_line = Path('$tmpRemote').read_text(encoding='utf-8').strip()
content = env_path.read_text(encoding='utf-8') if env_path.exists() else ''
key = 'YANDEX_WEBMASTER_OAUTH_TOKEN='
lines = [l for l in content.splitlines() if not l.startswith(key)]
lines.append(token_line)
env_path.write_text('\n'.join(lines).rstrip() + '\n', encoding='utf-8')
Path('$tmpRemote').unlink(missing_ok=True)
print('ENV_OK')
PY
cd $remoteDir/server && node scripts/yandex-webmaster-info.cjs && node scripts/yandex-recrawl.cjs ../dist/sitemap.xml
"@

  & ssh @sshOpts $server $remoteCmd
  if ($LASTEXITCODE -ne 0) { throw 'Remote setup failed' }
  Remove-Item -LiteralPath $tmpLocal -Force -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Host '=== Yandex Webmaster OAuth ===' -ForegroundColor Cyan

if (-not $AuthCode) {
  $authUrl = "https://oauth.yandex.ru/authorize?response_type=code&client_id=$ClientId"
  Write-Host ''
  Write-Host '1. Open Yandex page (browser should open automatically)' -ForegroundColor Yellow
  Write-Host '2. Log in and click Allow' -ForegroundColor Yellow
  Write-Host '3. Copy the 7-digit code from the page' -ForegroundColor Yellow
  Write-Host '4. Run: .\scripts\yandex-auth.ps1 -AuthCode XXXXXXX' -ForegroundColor Yellow
  Write-Host ''
  Write-Host $authUrl -ForegroundColor DarkGray
  Start-Process $authUrl
  exit 0
}

Write-Host "Exchanging code $AuthCode ..." -ForegroundColor Green
$token = Get-OAuthToken -Code $AuthCode
Write-Host 'Token received. Writing to server...' -ForegroundColor Green
Save-TokenOnServer -Token $token
Write-Host 'Done.' -ForegroundColor Green
