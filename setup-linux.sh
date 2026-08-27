#!/usr/bin/env bash
# Script de Inicialización y Preparación de Entorno para Linux / macOS (Poké Vicio)

set -e

# 1. Consultar dinamicamente la ultima version Current estable de Node.js desde nodejs.org
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PKG_PATH="$SCRIPT_DIR/package.json"

if [ ! -f "$PKG_PATH" ]; then
    echo "❌ ERROR: No se encontró package.json en $PKG_PATH"
    exit 1
fi

echo "🔍 Consultando la última versión Current estable de Node.js desde nodejs.org..."
TARGET_NODE_VER=""

if command -v curl >/dev/null 2>&1; then
    TARGET_NODE_VER=$(curl -s --max-time 10 https://nodejs.org/dist/index.json | grep -o '"version": *"v[0-9.]*"' | head -n 1 | grep -o '[0-9.]*' || true)
fi

# Fallback a package.json si no hubo conexión a internet
if [ -z "$TARGET_NODE_VER" ]; then
    TARGET_NODE_VER=$(grep -o '"node": *"[^"]*"' "$PKG_PATH" | grep -o '[0-9.]*' | head -n 1)
fi

if [ -z "$TARGET_NODE_VER" ]; then
    echo "❌ ERROR: No se pudo determinar la versión requerida de Node.js"
    exit 1
fi

# 2. Sincronizar automáticamente package.json y .nvmrc con la versión detectada
if grep -q '"node":' "$PKG_PATH"; then
    sed -i -E "s/(\"node\": *\">=)[^\"]*(\")/\1$TARGET_NODE_VER\2/" "$PKG_PATH"
fi
echo -n "$TARGET_NODE_VER" > "$SCRIPT_DIR/.nvmrc"

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
echo -e "\n🟢 Verificando / Instalando Node.js v$TARGET_NODE_VER en NVM..."
nvm install "$TARGET_NODE_VER" || echo "⚠️ Advertencia al instalar Node v$TARGET_NODE_VER via NVM."

echo -e "\n⚡ Activando y fijando Node.js v$TARGET_NODE_VER..."
nvm use "$TARGET_NODE_VER" || echo "⚠️ Advertencia al activar Node v$TARGET_NODE_VER."
nvm alias default "$TARGET_NODE_VER" 2>/dev/null || true

# 3. Actualizar npm
echo -e "\n📦 Actualizando npm a la última versión global (npm@latest)..."
npm install -g npm@latest || echo "⚠️ Advertencia: No se pudo actualizar npm globalmente. Continuando con versión actual..."

# 4. Configuración de Seguridad de NPM
echo -e "\n🛡️ Aplicando configuraciones de seguridad globales en npm..."
npm config set ignore-scripts true
npm config set registry https://registry.npmjs.org/
npm config set audit-level high

# 5. Instalar dependencias limpias del proyecto
echo -e "\n📦 Instalando dependencias del proyecto con npm ci..."
cd "$SCRIPT_DIR"
npm ci

echo "======================================================"
echo " 🎉 ¡ENTORNO Y DEPENDENCIAS PREPARADOS CON ÉXITO!"
echo "======================================================"
echo "Versiones activas:"
node -v
npm -v
echo -e "\nTodo listo. Puedes iniciar el entorno de desarrollo ejecutando 'npm run dev'.\n"
