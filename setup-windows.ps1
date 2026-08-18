# Script de Inicialización y Preparación de Entorno para Windows (Poké Vicio)
# Requiere ejecutar PowerShell como Administrador.

$ErrorActionPreference = "Stop"

# Forzar codificación UTF-8 en consola de Windows
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

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

# 1. Comprobar permisos de Administrador y auto-elevar si es necesario
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "`n⚡ Elevando permisos mediante UAC (Administrador)..." -ForegroundColor Yellow
    try {
        $proc = Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy Bypass -NoProfile -File `"$PSCommandPath`"" -Verb RunAs -PassThru -Wait
        exit $proc.ExitCode
    } catch {
        Write-Host "`n❌ ERROR: Este script debe ejecutarse con permisos de Administrador." -ForegroundColor Red
        Write-Host "Por favor, vuelve a abrir PowerShell seleccionando 'Ejecutar como Administrador'.`n" -ForegroundColor Yellow
        exit 1
    }
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

# Función para recargar todas las variables de entorno de Machine y User en la sesión actual
function Refresh-ProcessEnvironment {
    foreach ($level in "Machine", "User") {
        [System.Environment]::GetEnvironmentVariables($level).GetEnumerator() | ForEach-Object {
            [System.Environment]::SetEnvironmentVariable($_.Key, $_.Value, "Process")
        }
    }
}

# 4. Verificar si NVM para Windows está instalado
if (-not (Get-Command nvm -ErrorAction SilentlyContinue)) {
    Write-Host "`n📦 NVM para Windows no fue detectado. Instalando via winget..." -ForegroundColor Yellow
    winget install CoreyButler.NVMforWindows --accept-source-agreements --accept-package-agreements
    
    # Recargar variables de entorno del sistema y usuario
    Refresh-ProcessEnvironment
    
    # Asegurar rutas de NVM en el PATH del proceso si el instalador no las propagó de inmediato
    $nvmPossiblePaths = @(
        $env:NVM_HOME,
        "$env:LOCALAPPDATA\nvm",
        "$env:APPDATA\nvm",
        "C:\Program Files\nvm"
    )
    foreach ($nvmDir in $nvmPossiblePaths) {
        if ($nvmDir -and (Test-Path -Path (Join-Path $nvmDir "nvm.exe"))) {
            if (-not $env:NVM_HOME) { $env:NVM_HOME = $nvmDir }
            if ($env:Path -notlike "*$nvmDir*") { $env:Path = "$nvmDir;" + $env:Path }
            break
        }
    }
}

# 5. Instalar y activar la versión requerida de Node.js
Write-Host "`n🟢 Instalando Node.js v$targetNodeVer en NVM..." -ForegroundColor Cyan
nvm install $targetNodeVer

Write-Host "`n⚡ Activando Node.js v$targetNodeVer..." -ForegroundColor Cyan
nvm use $targetNodeVer

# Recargar variables y asegurar el symlink activo de Node en el PATH del proceso
Refresh-ProcessEnvironment
$nodeSymlinkPath = if ($env:NVM_SYMLINK) { $env:NVM_SYMLINK } else { "C:\Program Files\nodejs" }
if ($nodeSymlinkPath -and (Test-Path -Path $nodeSymlinkPath)) {
    if ($env:Path -notlike "*$nodeSymlinkPath*") {
        $env:Path = "$nodeSymlinkPath;" + $env:Path
    }
}

# 6. Actualizar npm a la última versión
Write-Host "`n📦 Actualizando npm a la última versión global (npm@latest)..." -ForegroundColor Cyan
npm install -g npm@latest

Write-Host "`n======================================================" -ForegroundColor Green
Write-Host " 🎉 ¡ENTORNO PREPARADO CON ÉXITO EN UNA SOLA EJECUCIÓN!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host "Versiones activas en esta sesión:"
node -v
npm -v
Write-Host "`n💡 Nota: Si tienes terminales del IDE previamente abiertas, ciérralas y ábrelas de nuevo (o reinicia la terminal) para que hereden el nuevo PATH del sistema." -ForegroundColor Cyan
Write-Host "Ya puedes ejecutar 'npm ci' para instalar las dependencias del proyecto.`n" -ForegroundColor Yellow
Write-Host "Presiona cualquier tecla para salir..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
