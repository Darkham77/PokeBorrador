#!/usr/bin/env bash
# Script de Inicialización y Preparación de Entorno para Linux / macOS (Poké Vicio)

set -e

# Obtener directorio del script y leer la versión requerida de Node desde package.json
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PKG_PATH="$SCRIPT_DIR/package.json"

if [ ! -f "$PKG_PATH" ]; then
    echo "❌ ERROR: No se encontró package.json en $PKG_PATH"
    exit 1
fi

TARGET_NODE_VER=$(grep -o '"node": *"[^"]*"' "$PKG_PATH" | grep -o '[0-9.]*' | head -n 1)
if [ -z "$TARGET_NODE_VER" ]; then
    TARGET_NODE_VER="26.7.0"
fi

echo "======================================================"
echo " 🚀 PREPARACIÓN DE ENTORNO NODE (v$TARGET_NODE_VER) (LINUX/MACOS)"
echo "======================================================"

# 1. Comprobar / Cargar NVM
export NVM_DIR="$HOME/.nvm"

if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
else
    echo "📦 NVM no detectado. Instalando NVM (v0.40.1)..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

# 2. Instalar y activar Node.js
echo -e "\n🟢 Instalando Node.js v$TARGET_NODE_VER en NVM..."
nvm install "$TARGET_NODE_VER"

echo -e "\n⚡ Activando y fijando Node.js v$TARGET_NODE_VER..."
nvm use "$TARGET_NODE_VER"
nvm alias default "$TARGET_NODE_VER"

# 3. Actualizar npm
echo -e "\n📦 Actualizando npm a la última versión global (npm@latest)..."
npm install -g npm@latest

echo "======================================================"
echo " 🎉 ¡ENTORNO PREPARADO CON ÉXITO!"
echo "======================================================"
echo "Versiones activas:"
node -v
npm -v
echo -e "\nYa puedes ejecutar 'npm ci' para instalar las dependencias del proyecto.\n"
