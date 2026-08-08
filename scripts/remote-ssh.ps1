param(
  [Parameter(Mandatory = $true)]
  [string]$RemoteCommand
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root 'deploy.env'
$cfg = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') {
    $cfg[$matches[1].Trim()] = $matches[2].Trim()
  }
}

$user = if ($cfg['SERVER_USER']) { $cfg['SERVER_USER'] } else { 'root' }
$hostName = if ($cfg['SERVER_HOST']) { $cfg['SERVER_HOST'] } else { '155.212.140.95' }
$password = $cfg['SERVER_PASSWORD']

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

$sshOpts = @(
  '-o', 'StrictHostKeyChecking=no',
  '-o', 'BatchMode=no',
  '-o', 'ConnectTimeout=30'
)

& ssh @sshOpts "${user}@${hostName}" $RemoteCommand
exit $LASTEXITCODE
