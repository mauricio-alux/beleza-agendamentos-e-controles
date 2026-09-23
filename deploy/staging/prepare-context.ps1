# Run from repository root. Creates a NEW sanitized upload directory; no upload/deploy.
$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$destination=Join-Path $repo ('.codex-logs/staging-context-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))
if(Test-Path -LiteralPath $destination){throw 'Destination already exists'}
New-Item -ItemType Directory -Path $destination | Out-Null
foreach($part in @('frontend','backend','deploy/staging')){New-Item -ItemType Directory -Path (Join-Path $destination $part) -Force | Out-Null}
foreach($part in @('frontend/src','frontend/public','backend/src')){Copy-Item -LiteralPath (Join-Path $repo $part) -Destination (Join-Path $destination (Split-Path $part -Parent)) -Recurse}
foreach($file in @('frontend/package.json','frontend/package-lock.json','frontend/next.config.ts','frontend/next-env.d.ts','frontend/tsconfig.json','frontend/tailwind.config.ts','frontend/postcss.config.js','backend/package.json','backend/package-lock.json')){Copy-Item -LiteralPath (Join-Path $repo $file) -Destination (Join-Path $destination $file)}
foreach($file in Get-ChildItem -LiteralPath $PSScriptRoot -File){Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $destination 'deploy/staging')}
$bad=Get-ChildItem -LiteralPath $destination -Recurse -File | Where-Object {$_.Name -match '^\.env|\.log$|\.pem$|\.key$'}
if($bad){throw 'Unexpected sensitive file name in context; do not upload'}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'railway.json') -Destination (Join-Path $destination 'railway.json')
Write-Output $destination

