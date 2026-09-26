$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path -LiteralPath 'node_modules')) {
    throw 'Install dependencies with pnpm install first. See README.md.'
}
& node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 1420
