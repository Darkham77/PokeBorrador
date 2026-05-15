#!/bin/bash

# Script para construir y publicar la imagen de base de datos de Poké Vicio
# Uso: ./publish-docker.sh [tag] [user] [repository]

TAG=${1:-latest}
USER=${2:-pokevicio}
REPO=${3:-pokevicio-db}
IMAGE_NAME="$USER/$REPO:$TAG"

# Detectar ruta raíz (dos niveles arriba de este script)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/../.." && pwd )"

echo -e "\n🚀 Iniciando construcción de imagen: $IMAGE_NAME"
echo "📂 Contexto: $ROOT_DIR"

# 1. Construir la imagen
docker build -t "$IMAGE_NAME" -f "$ROOT_DIR/supabase/Dockerfile.db" "$ROOT_DIR"
if [ $? -ne 0 ]; then
    echo "❌ Error al construir la imagen"
    exit 1
fi

echo "✅ Imagen construida con éxito."

# 2. Subir a Docker Hub
echo "📤 Subiendo imagen a Docker Hub..."
docker push "$IMAGE_NAME"
if [ $? -ne 0 ]; then
    echo "❌ Error al subir la imagen. Asegúrate de haber ejecutado 'docker login'."
    exit 1
fi

echo -e "🎉 Proceso completado: $IMAGE_NAME ya está en la web.\n"
