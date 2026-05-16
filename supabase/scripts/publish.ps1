# Script Único de Publicación - Poké Vicio
# Uso: .\publish.ps1 -User francogp612

param (
    [string]$Tag = "latest",
    [string]$User = "pokevicio",
    [string]$Repository = "pokevicio-db"
)

# --- Detección de Docker ---
$DockerBinPath = "C:\Program Files\Docker\Docker\resources\bin"
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    if (Test-Path $DockerBinPath) { $env:PATH = "$DockerBinPath;$env:PATH" }
}

$ImageName = "${User}/${Repository}:${Tag}"
$RootPath = Resolve-Path "$PSScriptRoot\..\.."
$Dockerfile = "supabase/Dockerfile.db"

Write-Host "`n🚀 Publicando Sistema Poké Vicio: $ImageName" -ForegroundColor Cyan

try {
    # Construir la imagen unificada (DB + Config + Migraciones)
    docker build -t $ImageName -f "$RootPath\$Dockerfile" "$RootPath"
    if ($LASTEXITCODE -ne 0) { throw "Error en construcción." }

    # Subir a Docker Hub
    Write-Host "📤 Subiendo a Docker Hub..." -ForegroundColor Yellow
    docker push $ImageName
    if ($LASTEXITCODE -ne 0) { throw "Error en subida. ¿Hiciste 'docker login'?" }

    Write-Host "🎉 TODO LISTO: $ImageName ya está en la web.`n" -ForegroundColor Green
}
catch {
    Write-Host "`n❌ ERROR: $_" -ForegroundColor Red
    exit 1
}
