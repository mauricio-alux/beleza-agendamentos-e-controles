$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend"

Set-Location -LiteralPath $backendDir
$env:REMINDER_SCHEDULER_ENABLED = "false"

node src/server.js
