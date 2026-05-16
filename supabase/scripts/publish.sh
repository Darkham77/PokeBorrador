#!/bin/bash
# Script Único de Publicación - Poké Vicio (Bash/Linux)
# Uso: ./publish.sh -u francogp612

set -e

TAG="latest"
USER="pokevicio"
REPO="pokevicio-db"

while getopts "t:u:r:" opt; do
  case $opt in
    t) TAG="$OPTARG" ;;
    u) USER="$OPTARG" ;;
    r) REPO="$OPTARG" ;;
    *) echo "Uso: $0 [-t tag] [-u user] [-r repo]" >&2; exit 1 ;;
  esac
done

IMAGE_NAME="${USER}/${REPO}:${TAG}"
ROOT_PATH=$(realpath "$(dirname "$0")/../..")
DOCKERFILE="supabase/Dockerfile.db"

echo "🚀 Publicando Sistema Poké Vicio: ${IMAGE_NAME}"

# Construir la imagen unificada
docker build -t "${IMAGE_NAME}" -f "${ROOT_PATH}/${DOCKERFILE}" "${ROOT_PATH}"

# Subir a Docker Hub
echo "📤 Subiendo a Docker Hub..."
docker push "${IMAGE_NAME}"

echo "🎉 TODO LISTO: ${IMAGE_NAME} ya está en la web."
