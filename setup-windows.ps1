# Script de Inicialización y Preparación de Entorno para Windows (Poké Vicio)
# Requiere ejecutar PowerShell como Administrador.

$ErrorActionPreference = "Stop"

# Leer dinámicamente las versiones desde package.json
$pkgPath = Join-Path $PSScriptRoot "package.json"
if (-not (Test-Path $pkgPath)) {
    Write-Host "❌ ERROR: No se encontró package.json en $pkgPath" -ForegroundColor Red
    exit 1
}

$pkgContent = Get-Content -Raw -Path $pkgPath | ConvertFrom-Json
$nodeEngineStr = if ($pkgContent.engines -and $pkgContent.engines.node) { $pkgContent.engines.node } else { ">=26.7.0" }
$targetNodeVer = $nodeEngineStr -replace '[^0-9.]', ''

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " 🚀 PREPARACIÓN DE ENTORNO NODE (v$targetNodeVer) (WINDOWS)" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. Comprobar permisos de Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "`n❌ ERROR: Este script debe ejecutarse en PowerShell como Administrador." -ForegroundColor Red
    Write-Host "Por favor, vuelve a abrir PowerShell seleccionando 'Ejecutar como Administrador'.`n" -ForegroundColor Yellow
    exit 1
}

# 2. Asegurar el directorio receptor del Symlink de NVM
$nvmSymlinkPath = "C:\nvm4w"
if (-not (Test-Path -Path $nvmSymlinkPath)) {
    Write-Host "`n📁 Creando directorio para symlink de NVM en '$nvmSymlinkPath'..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $nvmSymlinkPath -Force | Out-Null
    Write-Host "  ✅ Directorio creado con éxito." -ForegroundColor Green
}

# 3. Limpiar residuales huérfanos en %APPDATA%\npm
$appDataNpm = "$env:APPDATA\npm"
$appDataNpmCache = "$env:APPDATA\npm-cache"

if (Test-Path -Path $appDataNpm) {
    Write-Host "🧹 Limpiando archivos residuales en $appDataNpm..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $appDataNpm -ErrorAction SilentlyContinue
}

if (Test-Path -Path $appDataNpmCache) {
    Write-Host "🧹 Limpiando cache residual en $appDataNpmCache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $appDataNpmCache -ErrorAction SilentlyContinue
}

# 4. Verificar si NVM para Windows está instalado
if (-not (Get-Command nvm -ErrorAction SilentlyContinue)) {
    Write-Host "`n📦 NVM para Windows no fue detectado. Instalando via winget..." -ForegroundColor Yellow
    winget install CoreyButler.NVMforWindows --accept-source-agreements --accept-package-agreements
    
    # Refrescar variables de entorno en la sesión actual
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# 5. Instalar y activar la versión requerida de Node.js
Write-Host "`n🟢 Instalando Node.js v$targetNodeVer en NVM..." -ForegroundColor Cyan
nvm install $targetNodeVer

Write-Host "`n⚡ Activando Node.js v$targetNodeVer..." -ForegroundColor Cyan
nvm use $targetNodeVer

# 6. Actualizar npm a la última versión
Write-Host "`n📦 Actualizando npm a la última versión global (npm@latest)..." -ForegroundColor Cyan
npm install -g npm@latest

Write-Host "`n======================================================" -ForegroundColor Green
Write-Host " 🎉 ¡ENTORNO PREPARADO CON ÉXITO!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host "Versiones activas:"
node -v
npm -v
Write-Host "`nYa puedes ejecutar 'npm ci' para instalar las dependencias del proyecto.`n" -ForegroundColor Yellow
