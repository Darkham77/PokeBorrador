#!/bin/bash

# START SCRIPT - SUPABASE POKÉ VICIO
# El único script que necesitas. Todo es automático.

set -e

# Asegurar que estamos en el directorio correcto
cd "$(dirname "$0")"

echo "🔥 Iniciando Poké Vicio Online Server..."

# 1. Configuración inicial (Solo si no existe .env)
if [ ! -f .env ]; then
    ./scripts/setup.sh
fi

# 2. Levantar la infraestructura
# Esto construye la imagen de DB y activa el migrador automático.
echo "🐳 Levantando contenedores y sincronizando base de datos..."
docker-compose up -d --build

# 3. Verificación final
echo "✨ Infraestructura levantada."
echo "⏳ El sistema está terminando de aplicar migraciones en segundo plano..."
echo ""
echo "🚀 Acceso API: http://localhost:8000"
echo "Recuerda configurar tu VITE_SUPABASE_URL y VITE_SUPABASE_KEY en el .env del juego."

./scripts/health-check.sh
