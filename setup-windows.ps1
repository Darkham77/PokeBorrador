# Script de Inicializacion y Preparacion de Entorno para Windows (Poke Vicio)
# Configura NVM, Node.js, npm de forma determinista y resiliente.

param(
    [switch]$DeclaredVersions = $false,
    [switch]$Locked = $false,
    [switch]$Pinned = $false,
    [switch]$UpdateVersion = $false,
    [switch]$PruneOtherVersions = $false
)

$ErrorActionPreference = "Stop"

# Por defecto: actualiza automaticamente a la ultima version estable (Node.js Current + npm@latest)
# -DeclaredVersions / -Locked / -Pinned: restringe la instalacion estrictamente a lo declarado en el commit (.nvmrc / package.json)
$updateToLatest = -not ($DeclaredVersions -or $Locked -or $Pinned)

# Forzar codificacion UTF-8 en consola de Windows
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    [Console]::InputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

# Funcion para recargar todas las variables de entorno de Machine y User en la sesion actual
function Refresh-ProcessEnvironment {
    # 1. Cargar variables de Machine y User (excepto Path)
    foreach ($level in "Machine", "User") {
        [System.Environment]::GetEnvironmentVariables($level).GetEnumerator() | ForEach-Object {
            if ($_.Key -ne "Path") {
                [System.Environment]::SetEnvironmentVariable($_.Key, $_.Value, "Process")
            }
        }
    }

    # 2. Reconstruir PATH concatenando Machine + User preservando C:\Windows\System32
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $combinedPath = "$machinePath;$userPath"
    $cleanPath = ($combinedPath -split ';' | Where-Object { [string]::IsNullOrWhiteSpace($_) -eq $false } | Select-Object -Unique) -join ';'
    [System.Environment]::SetEnvironmentVariable("Path", $cleanPath, "Process")
    $env:Path = $cleanPath
}

# 1. Recargar variables de entorno iniciales
Refresh-ProcessEnvironment

# 2. Determinar version de Node.js requerida (por defecto actualiza a la ultima version estable; -DeclaredVersions para ceñirse a .nvmrc)
$pkgPath = Join-Path $PSScriptRoot "package.json"
$nvmrcPath = Join-Path $PSScriptRoot ".nvmrc"

if (-not (Test-Path $pkgPath)) {
    Write-Host "[ERROR] No se encontro package.json en $pkgPath" -ForegroundColor Red
    exit 1
}

$targetNodeVer = ""

if ($updateToLatest) {
    Write-Host "[NODE] Consultando la ultima version Current estable de Node.js en nodejs.org (modo por defecto: auto-actualizacion)..." -ForegroundColor Cyan
    try {
        $nodeDist = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json" -TimeoutSec 10 -ErrorAction Stop
        foreach ($item in $nodeDist) {
            # Filtrar versiones estables puras (sin tags -alpha, -beta, -rc)
            if ($item.version -match '^v?(\d+\.\d+\.\d+)$') {
                $targetNodeVer = $Matches[1]
                break
            }
        }
        if ($targetNodeVer) {
            $expectedNodeEngine = ">=$targetNodeVer"
            $pkgRaw = Get-Content -Raw -Path $pkgPath
            $pkgUpdated = $pkgRaw -replace '("node":\s*")[^"]*(")', "`$1$expectedNodeEngine`$2"
            [System.IO.File]::WriteAllText($pkgPath, $pkgUpdated, (New-Object System.Text.UTF8Encoding $false))
            [System.IO.File]::WriteAllText($nvmrcPath, $targetNodeVer, (New-Object System.Text.UTF8Encoding $false))
            Write-Host "[CONFIG] Sincronizado package.json y .nvmrc con v$targetNodeVer" -ForegroundColor Green
        }
    } catch {
        Write-Host "  [WARN] No se pudo consultar la API de nodejs.org: $_. Usando definicion local de .nvmrc / package.json..." -ForegroundColor Yellow
    }
} else {
    Write-Host "[NODE] Modo versiones declaradas activo (-DeclaredVersions). Preservando version exacta de .nvmrc sin consultar la red..." -ForegroundColor Cyan
}

# Por defecto en modo -DeclaredVersions o si fallo la consulta: leer la version canonica de .nvmrc
if (-not $targetNodeVer -and (Test-Path $nvmrcPath)) {
    $rawNvmrc = (Get-Content -Raw -Path $nvmrcPath).Trim() -replace '^v', ''
    if ($rawNvmrc) {
        $targetNodeVer = $rawNvmrc
    }
}

# Fallback a package.json si no existe .nvmrc
if (-not $targetNodeVer) {
    $pkgContent = Get-Content -Raw -Path $pkgPath | ConvertFrom-Json
    if ($pkgContent.engines -and $pkgContent.engines.node) {
        $targetNodeVer = $pkgContent.engines.node -replace '[^0-9.]', ''
    }
}

if (-not $targetNodeVer) {
    Write-Host "[ERROR] No se pudo determinar la version de Node.js a instalar." -ForegroundColor Red
    exit 1
}

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
        Write-Host "[NVM] NVM para Windows no fue detectado en las rutas estandar. Intentando instalar via winget..." -ForegroundColor Yellow
        try {
            winget install CoreyButler.NVMforWindows --accept-source-agreements --accept-package-agreements
            Refresh-ProcessEnvironment
        } catch {
            Write-Host "  [WARN] No se pudo instalar NVM via winget: $_" -ForegroundColor Yellow
        }
    }
}

# Si NVM sigue sin estar disponible, usar fallback nativo en AppData
if (-not $nvmRoot) {
    $nvmRoot = "$env:LOCALAPPDATA\nvm"
    if (-not (Test-Path $nvmRoot)) {
        New-Item -ItemType Directory -Path $nvmRoot -Force | Out-Null
    }
}

# 4. Asegurar el directorio receptor del Symlink/Junction de Node
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

# 5. Instalar la version requerida de Node.js si no existe
$targetNodeDir = Join-Path $nvmRoot "v$targetNodeVer"
$nodeExePath = Join-Path $targetNodeDir "node.exe"

if (-not (Test-Path $nodeExePath)) {
    Write-Host ""
    Write-Host "[NODE] Instalando Node.js v$targetNodeVer..." -ForegroundColor Cyan
    $installedViaNvm = $false
    if (Get-Command nvm -ErrorAction SilentlyContinue) {
        try {
            nvm install $targetNodeVer
            if (Test-Path $nodeExePath) {
                $installedViaNvm = $true
            }
        } catch {}
    }

    # Fallback: Descarga directa y extraccion de Node.js oficial (dist x64)
    if (-not $installedViaNvm -and -not (Test-Path $nodeExePath)) {
        Write-Host "  [DOWNLOAD] Descargando binarios oficiales de Node.js v$targetNodeVer desde nodejs.org..." -ForegroundColor Cyan
        $zipUrl = "https://nodejs.org/dist/v$targetNodeVer/node-v$targetNodeVer-win-x64.zip"
        $tempZip = Join-Path $env:TEMP "node-v$targetNodeVer-win-x64.zip"
        $tempExtractDir = Join-Path $env:TEMP "node-v$targetNodeVer-extract"

        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
            Invoke-WebRequest -Uri $zipUrl -OutFile $tempZip -UseBasicParsing -TimeoutSec 120
            
            if (Test-Path $tempExtractDir) {
                Remove-Item -Path $tempExtractDir -Recurse -Force -ErrorAction SilentlyContinue
            }
            Expand-Archive -Path $tempZip -DestinationPath $tempExtractDir -Force

            $extractedSubdir = Join-Path $tempExtractDir "node-v$targetNodeVer-win-x64"
            if (-not (Test-Path $targetNodeDir)) {
                New-Item -ItemType Directory -Path $targetNodeDir -Force | Out-Null
            }
            Copy-Item -Path "$extractedSubdir\*" -Destination $targetNodeDir -Recurse -Force
            Remove-Item -Path $tempZip, $tempExtractDir -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "  [OK] Node.js v$targetNodeVer extraido correctamente en $targetNodeDir" -ForegroundColor Green
        } catch {
            Write-Host "  [ERROR] Fallo la descarga y extraccion de Node.js: $_" -ForegroundColor Red
            exit 1
        }
    }
}

# 6. Activar Node.js (con fallback nativo Junction que no requiere permisos de Administrador)
Write-Host ""
Write-Host "[NODE] Activando Node.js v$targetNodeVer..." -ForegroundColor Cyan
$activated = $false

# Intento 1: Junction directo (compatible con NTFS sin elevacion UAC)
if (Test-Path $targetNodeDir) {
    try {
        if (Test-Path $nodeSymlinkPath) {
            Remove-Item -Path $nodeSymlinkPath -Recurse -Force -ErrorAction SilentlyContinue
        }
        New-Item -ItemType Junction -Path $nodeSymlinkPath -Target $targetNodeDir -Force | Out-Null
        if (Test-Path (Join-Path $nodeSymlinkPath "node.exe")) {
            $activated = $true
        }
    } catch {
        # Si Junction falla en C:\, usar ruta en AppData
        $nodeSymlinkPath = "$env:LOCALAPPDATA\nodejs"
        if (Test-Path $nodeSymlinkPath) {
            Remove-Item -Path $nodeSymlinkPath -Recurse -Force -ErrorAction SilentlyContinue
        }
        New-Item -ItemType Junction -Path $nodeSymlinkPath -Target $targetNodeDir -Force | Out-Null
        if (Test-Path (Join-Path $nodeSymlinkPath "node.exe")) {
            $activated = $true
        }
    }
}

# Intento 2: nvm use estandar (fallback si Junction fallo)
if (-not $activated -and (Get-Command nvm -ErrorAction SilentlyContinue)) {
    try {
        nvm use $targetNodeVer 2>$null
        if (Test-Path (Join-Path $nodeSymlinkPath "node.exe")) {
            $activated = $true
        }
    } catch {}
}

# 7. Limpieza de versiones obsoletas (ESTRICTAMENTE OPT-IN con -PruneOtherVersions)
if ($PruneOtherVersions) {
    Write-Host ""
    Write-Host "[CLEANUP] Limpiando versiones obsoletas de Node.js (-PruneOtherVersions activado)..." -ForegroundColor Cyan
    try {
        Get-ChildItem -Path $nvmRoot -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^v\d+\.\d+\.\d+$' -and $_.Name -ne "v$targetNodeVer" } | ForEach-Object {
            $verName = $_.Name
            Write-Host "  [-] Eliminando version: $verName..." -ForegroundColor Yellow
            Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
            if (Test-Path $_.FullName) {
                if (Get-Command nvm -ErrorAction SilentlyContinue) {
                    nvm uninstall ($verName -replace '^v','') 2>$null | Out-Null
                }
            }
            if (Test-Path $_.FullName) {
                Write-Host "  [WARN] No se pudo purgar $verName. Ejecuta PowerShell como Administrador si deseas eliminarla." -ForegroundColor Yellow
            }
        }
    } catch {}
} else {
    Write-Host ""
    Write-Host "[INFO] Preservando todas las demas versiones de Node.js instaladas para convivencia multi-proyecto." -ForegroundColor Cyan
    Write-Host "       (Usa -PruneOtherVersions solo si deseas eliminar deliberadamente otras versiones)." -ForegroundColor Gray
}

# Asegurar que el symlink activo de Node y Roaming npm esten en el PATH de la sesion actual
$npmRoamingPath = "$env:APPDATA\npm"
if ($env:Path -notlike "*$nodeSymlinkPath*") {
    $env:Path = "$nodeSymlinkPath;" + $env:Path
}
if ($env:Path -notlike "*$npmRoamingPath*") {
    $env:Path = "$npmRoamingPath;" + $env:Path
}

# Persistir rutas de Node y npm en el PATH de Usuario para sesiones futuras, saneando delimitadores
try {
    $rawUserPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    if ($rawUserPath) {
        $sanitizedUserPath = $rawUserPath -replace 'npm([A-Za-z]:\\)', 'npm;$1'
        $parts = [System.Text.RegularExpressions.Regex]::Split($sanitizedUserPath, ';|(?<=\S)\s+(?=[A-Za-z]:\\)')
        $userList = @()
        foreach ($p in $parts) {
            $t = $p.Trim()
            if (-not [string]::IsNullOrWhiteSpace($t)) { $userList += $t }
        }
        $pathsToAdd = @($nodeSymlinkPath, $npmRoamingPath, $nvmRoot) | Where-Object { $_ -and ($userList -notcontains $_) }
        $finalUserList = ($pathsToAdd + $userList) | Select-Object -Unique
        $updatedUserPath = $finalUserList -join ';'
        [System.Environment]::SetEnvironmentVariable("Path", $updatedUserPath, "User")
    }
} catch {}

# 7. Actualizar npm a la ultima version (por defecto en auto-actualizacion; preservada en -DeclaredVersions)
Write-Host ""
if ($updateToLatest) {
    Write-Host "[NPM] Actualizando npm a la ultima version global (npm@latest)..." -ForegroundColor Cyan
    try {
        npm install -g npm@latest
    } catch {
        Write-Host "  [WARN] Advertencia al actualizar npm global: $_" -ForegroundColor Yellow
        Write-Host "  Continuando con la version actual de npm ($((npm -v)))..." -ForegroundColor Gray
    }
} else {
    Write-Host "[NPM] Preservando version activa de npm ($((npm -v))). No se actualiza npm en modo -DeclaredVersions." -ForegroundColor Gray
}

# 8. Verificacion de configuracion NPM aislada al proyecto
Write-Host ""
Write-Host "[CONFIG] Verificando politicas de NPM (.npmrc local del proyecto)..." -ForegroundColor Cyan
$projectNpmrc = Join-Path $PSScriptRoot ".npmrc"
if (-not (Test-Path $projectNpmrc)) {
    $npmrcContent = @"
# Poké Vicio - Local Project NPM Configuration
ignore-scripts=true
registry=https://registry.npmjs.org/
audit-level=high
"@
    [System.IO.File]::WriteAllText($projectNpmrc, $npmrcContent, (New-Object System.Text.UTF8Encoding $false))
    Write-Host " [CONFIG] Archivo .npmrc local inicializado correctamente." -ForegroundColor Green
} else {
    Write-Host " [CONFIG] Archivo .npmrc local detectado y activo." -ForegroundColor Green
}

# 10. Instalar dependencias limpias del proyecto
Write-Host ""
Write-Host "[DEPENDENCIES] Instalando dependencias del proyecto con npm ci..." -ForegroundColor Cyan
Set-Location $PSScriptRoot
npm ci

# 11. Desbloquear binarios nativos descargados por npm en Windows
Write-Host ""
Write-Host "[SECURITY] Desbloqueando binarios nativos de node_modules..." -ForegroundColor Cyan
$nodeModulesDir = Join-Path $PSScriptRoot "node_modules"
if (Test-Path $nodeModulesDir) {
    Get-ChildItem -Path $nodeModulesDir -Include "*.node", "*.dll", "*.exe" -Recurse -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue
}

# 12. Validar y compilar herramientas nativas auxiliares
Write-Host ""
Write-Host "[BUILD-TOOLS] Compilando y verificando herramientas nativas auxiliares..." -ForegroundColor Cyan
npm run validate:tools

# 13. Compilar catálogo de servidores oficiales desde .env o plantilla
Write-Host ""
Write-Host "[CONFIG] Compilando catalogo de servidores oficiales..." -ForegroundColor Cyan
npm run servers:configure

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
