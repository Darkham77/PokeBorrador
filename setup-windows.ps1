# Script de Inicializacion y Preparacion de Entorno para Windows (Poke Vicio)
# Configura NVM, Node.js, npm de forma determinista y resiliente.

$ErrorActionPreference = "Stop"

# Forzar codificacion UTF-8 en consola de Windows
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    [Console]::InputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

# Funcion para recargar todas las variables de entorno de Machine y User en la sesion actual
function Refresh-ProcessEnvironment {
    foreach ($level in "Machine", "User") {
        [System.Environment]::GetEnvironmentVariables($level).GetEnumerator() | ForEach-Object {
            [System.Environment]::SetEnvironmentVariable($_.Key, $_.Value, "Process")
        }
    }
}

# 1. Recargar variables de entorno iniciales
Refresh-ProcessEnvironment

# 2. Consultar dinamicamente la ultima version Current estable de Node.js desde nodejs.org
$pkgPath = Join-Path $PSScriptRoot "package.json"
if (-not (Test-Path $pkgPath)) {
    Write-Host "[ERROR] No se encontro package.json en $pkgPath" -ForegroundColor Red
    exit 1
}

$targetNodeVer = ""
Write-Host "[NODE] Consultando la ultima version Current estable de Node.js en nodejs.org..." -ForegroundColor Cyan
try {
    $nodeDist = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json" -TimeoutSec 10 -ErrorAction Stop
    foreach ($item in $nodeDist) {
        # Filtrar versiones estables puras (sin tags -alpha, -beta, -rc)
        if ($item.version -match '^v?(\d+\.\d+\.\d+)$') {
            $targetNodeVer = $Matches[1]
            break
        }
    }
} catch {
    Write-Host "  [WARN] No se pudo consultar la API de nodejs.org: $_. Usando definicion local de package.json..." -ForegroundColor Yellow
}

$pkgContent = Get-Content -Raw -Path $pkgPath | ConvertFrom-Json

# Fallback a package.json si no hubo conexion
if (-not $targetNodeVer) {
    if ($pkgContent.engines -and $pkgContent.engines.node) {
        $targetNodeVer = $pkgContent.engines.node -replace '[^0-9.]', ''
    }
}

if (-not $targetNodeVer) {
    Write-Host "[ERROR] No se pudo determinar la version de Node.js a instalar." -ForegroundColor Red
    exit 1
}

# 3. Sincronizar automaticamente package.json y .nvmrc con la version detectada
$expectedNodeEngine = ">=$targetNodeVer"
if (-not $pkgContent.engines -or $pkgContent.engines.node -ne $expectedNodeEngine) {
    Write-Host "[CONFIG] Sincronizando package.json ('engines.node' = '$expectedNodeEngine')..." -ForegroundColor Cyan
    $pkgRaw = Get-Content -Raw -Path $pkgPath
    $pkgUpdated = $pkgRaw -replace '("node":\s*")[^"]*(")', "`$1$expectedNodeEngine`$2"
    [System.IO.File]::WriteAllText($pkgPath, $pkgUpdated, [System.Text.Encoding]::UTF8)
}

# Sincronizar automaticamente .nvmrc
$targetNodeVer.Trim() | Set-Content -Path (Join-Path $PSScriptRoot ".nvmrc") -Encoding ASCII -NoNewline

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " [SETUP] PREPARACION DE ENTORNO NODE (v$targetNodeVer) (WINDOWS)" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 3. Detectar NVM para Windows y asegurar rutas
$nvmPossiblePaths = @(
    $env:NVM_HOME,
    "$env:LOCALAPPDATA\nvm",
    "$env:APPDATA\nvm",
    "C:\Program Files\nvm"
)
$nvmRoot = ""
foreach ($nvmDir in $nvmPossiblePaths) {
    if ($nvmDir -and (Test-Path -Path (Join-Path $nvmDir "nvm.exe"))) {
        $nvmRoot = $nvmDir
        if (-not $env:NVM_HOME) { $env:NVM_HOME = $nvmDir }
        if ($env:Path -notlike "*$nvmDir*") { $env:Path = "$nvmDir;" + $env:Path }
        break
    }
}

if (-not $nvmRoot) {
    if (-not (Get-Command nvm -ErrorAction SilentlyContinue)) {
        Write-Host ""
        Write-Host "[NVM] NVM para Windows no fue detectado. Instalando via winget..." -ForegroundColor Yellow
        try {
            winget install CoreyButler.NVMforWindows --accept-source-agreements --accept-package-agreements
            Refresh-ProcessEnvironment
        } catch {
            Write-Host "  [WARN] No se pudo instalar NVM automaticamente via winget: $_" -ForegroundColor Red
        }
    }
}

# 4. Asegurar el directorio receptor del Symlink/Junction de NVM
$nodeSymlinkPath = if ($env:NVM_SYMLINK) { $env:NVM_SYMLINK } else { "C:\nvm4w\nodejs" }
$parentSymlinkDir = Split-Path -Parent $nodeSymlinkPath
if ($parentSymlinkDir -and -not (Test-Path -Path $parentSymlinkDir)) {
    try {
        New-Item -ItemType Directory -Path $parentSymlinkDir -Force | Out-Null
    } catch {
        # Fallback a AppData local si C:\ esta restringido
        $nodeSymlinkPath = "$env:LOCALAPPDATA\nodejs"
        $parentSymlinkDir = Split-Path -Parent $nodeSymlinkPath
        New-Item -ItemType Directory -Path $parentSymlinkDir -Force | Out-Null
    }
}

# 5. Instalar la version requerida de Node.js en NVM si no existe
$targetNodeDir = if ($nvmRoot) { Join-Path $nvmRoot "v$targetNodeVer" } else { "" }
if ($targetNodeDir -and -not (Test-Path $targetNodeDir)) {
    Write-Host ""
    Write-Host "[NODE] Instalando Node.js v$targetNodeVer en NVM..." -ForegroundColor Cyan
    try {
        nvm install $targetNodeVer
    } catch {
        Write-Host "  [WARN] Fallo la descarga de Node.js v$targetNodeVer via nvm install: $_" -ForegroundColor Yellow
    }
}

# 6. Activar Node.js (con fallback nativo Junction que no requiere permisos de Administrador)
Write-Host ""
Write-Host "[NODE] Activando Node.js v$targetNodeVer..." -ForegroundColor Cyan
$activated = $false

# Intento 1: nvm use estandar
try {
    nvm use $targetNodeVer 2>$null
    if (Test-Path (Join-Path $nodeSymlinkPath "node.exe")) {
        $activated = $true
    }
} catch {}

# Intento 2: Junction directo (compatible con NTFS sin elevacion UAC)
if (-not $activated -and $targetNodeDir -and (Test-Path $targetNodeDir)) {
    try {
        if (Test-Path $nodeSymlinkPath) {
            Remove-Item -Path $nodeSymlinkPath -Recurse -Force -ErrorAction SilentlyContinue
        }
        New-Item -ItemType Junction -Path $nodeSymlinkPath -Target $targetNodeDir -Force | Out-Null
        $activated = $true
    } catch {
        Write-Host "  [WARN] No se pudo crear el enlace simbolico/junction para Node: $_" -ForegroundColor Yellow
    }
}

# Asegurar que el symlink activo de Node este en el PATH de la sesion actual
if ($env:Path -notlike "*$nodeSymlinkPath*") {
    $env:Path = "$nodeSymlinkPath;" + $env:Path
}

# 7. Actualizar npm a la ultima version
Write-Host ""
Write-Host "[NPM] Actualizando npm a la ultima version global (npm@latest)..." -ForegroundColor Cyan
try {
    npm install -g npm@latest
} catch {
    Write-Host "  [WARN] Advertencia al actualizar npm global: $_" -ForegroundColor Yellow
    Write-Host "  Continuando con la version actual de npm ($((npm -v)))..." -ForegroundColor Gray
}

# 8. Configuracion de Seguridad de NPM
Write-Host ""
Write-Host "[SECURITY] Aplicando configuraciones de seguridad globales en npm..." -ForegroundColor Cyan
npm config set ignore-scripts true
npm config set registry https://registry.npmjs.org/
npm config set audit-level high

# 9. Limpiar residuales en %APPDATA%\npm-cache
$appDataNpmCache = "$env:APPDATA\npm-cache"
if (Test-Path -Path $appDataNpmCache) {
    Remove-Item -Recurse -Force $appDataNpmCache -ErrorAction SilentlyContinue
}

# 10. Instalar dependencias limpias del proyecto
Write-Host ""
Write-Host "[DEPENDENCIES] Instalando dependencias del proyecto con npm ci..." -ForegroundColor Cyan
Set-Location $PSScriptRoot
npm ci

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host " [SUCCESS] ENTORNO Y DEPENDENCIAS PREPARADOS CON EXITO!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host "Versiones activas en esta sesion:"
node -v
npm -v
Write-Host ""
Write-Host "[NOTE] Si tienes terminales del IDE previamente abiertas, cierralas y abrelas de nuevo para que hereden el nuevo PATH del sistema." -ForegroundColor Cyan
Write-Host "Todo listo. Puedes iniciar el servidor de desarrollo con 'npm run dev'." -ForegroundColor Yellow
Write-Host ""
