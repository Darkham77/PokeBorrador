# Script para construir y publicar la imagen de base de datos de Poké Vicio
# Uso: .\publish-docker.ps1 -User tu-usuario -Repository mi-repo -Tag 0.5.0

param (
    [string]$Tag = "latest",
    [string]$User = "pokevicio",     # Tu usuario de Docker Hub
    [string]$Repository = "pokevicio-db" # El nombre del repositorio en Docker Hub
)

# --- Detección e Inyección de Path de Docker ---
$DockerBinPath = "C:\Program Files\Docker\Docker\resources\bin"
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    if (Test-Path $DockerBinPath) {
        Write-Host "ℹ️ Docker detectado en ruta personalizada. Ajustando PATH temporalmente..." -ForegroundColor Gray
        $env:PATH = "$DockerBinPath;$env:PATH"
    } else {
        Write-Host "⚠️ No se encontró Docker en la ruta estándar. Intentando con comando global..." -ForegroundColor Yellow
    }
}

$ImageName = "${User}/${Repository}:${Tag}"

Write-Host "`n🚀 Iniciando construcción de imagen: $ImageName" -ForegroundColor Cyan

# El contexto debe ser la raíz del proyecto para acceder a /database/migrations
$RootPath = Resolve-Path "$PSScriptRoot\..\.."
$Dockerfile = "supabase/Dockerfile.db"

Write-Host "📂 Contexto: $RootPath" -ForegroundColor Gray

try {
    # 1. Construir la imagen
    # Usamos directamente 'docker' porque ya inyectamos la ruta en el PATH del entorno
    docker build -t $ImageName -f "$RootPath\$Dockerfile" "$RootPath"
    if ($LASTEXITCODE -ne 0) { throw "Error al construir la imagen" }

    Write-Host "✅ Imagen construida con éxito." -ForegroundColor Green

    # 2. Subir a Docker Hub
    Write-Host "📤 Subiendo imagen a Docker Hub..." -ForegroundColor Yellow
    docker push $ImageName
    if ($LASTEXITCODE -ne 0) { throw "Error al subir la imagen. Asegúrate de haber ejecutado 'docker login'." }

    Write-Host "🎉 Proceso completado: $ImageName ya está en la web.`n" -ForegroundColor Green
}
catch {
    Write-Host "`n❌ ERROR: $_" -ForegroundColor Red
    exit 1
}
