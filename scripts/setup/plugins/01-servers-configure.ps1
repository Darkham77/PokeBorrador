# Plugin de configuracion de servidores oficiales para Poke Vicio
$projectRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
Set-Location $projectRoot

$pkgJson = Get-Content (Join-Path $projectRoot "package.json") -Raw
if ($pkgJson -match '"servers:configure"') {
    Write-Host "  [plugin:01-servers-configure] Configurando servidores oficiales..." -ForegroundColor Cyan
    npm run servers:configure
}
