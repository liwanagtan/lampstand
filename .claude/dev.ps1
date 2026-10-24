# Starts the dev server on http://localhost:5310, installing dependencies first if needed.
$env:Path = 'C:\Program Files\nodejs;C:\Program Files\Git\cmd;' + $env:Path
Set-Location (Split-Path $PSScriptRoot)
if (-not (Test-Path node_modules\.bin\vite.cmd)) { npm ci --no-audit --no-fund }
npm run dev
