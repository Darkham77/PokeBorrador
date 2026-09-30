#!/usr/bin/env bash
# Script de Inicialización y Preparación de Entorno para Linux / macOS (Poké Vicio)

set -e

# 1. Determinar versión de Node.js (por defecto actualiza a la última versión estable; --declared-versions para ceñirse a .nvmrc)
# Por defecto: actualiza automáticamente a la última versión estable (Node.js Current + npm@latest)
# --declared-versions / --locked / --pinned: restringe la instalación estrictamente a lo declarado en el commit (.nvmrc / package.json)
UPDATE_TO_LATEST=true
PRUNE_VERSIONS=false
SET_DEFAULT=false

for arg in "$@"; do
    case "$arg" in
        --declared-versions|--locked|--pinned)
            UPDATE_TO_LATEST=false
            ;;
        --update-version|-u)
            UPDATE_TO_LATEST=true
            ;;
        --prune-other-versions)
            PRUNE_VERSIONS=true
            ;;
        --set-default)
            SET_DEFAULT=true
            ;;
    esac
done

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PKG_PATH="$SCRIPT_DIR/package.json"
NVMRC_PATH="$SCRIPT_DIR/.nvmrc"

if [ ! -f "$PKG_PATH" ]; then
    echo "❌ ERROR: No se encontró package.json en $PKG_PATH"
    exit 1
fi

TARGET_NODE_VER=""

if [ "$UPDATE_TO_LATEST" = true ]; then
    echo "🔍 Consultando la última versión Current estable de Node.js desde nodejs.org (modo por defecto: auto-actualización)..."
    if command -v curl >/dev/null 2>&1; then
        TARGET_NODE_VER=$(curl -s --max-time 10 https://nodejs.org/dist/index.json | grep -o '"version": *"v[0-9.]*"' | head -n 1 | grep -o '[0-9.]*' || true)
    fi
    if [ -n "$TARGET_NODE_VER" ]; then
        if grep -q '"node":' "$PKG_PATH"; then
            sed -i -E "s/(\"node\": *\">=)[^\"]*(\")/\1$TARGET_NODE_VER\2/" "$PKG_PATH"
        fi
        echo -n "$TARGET_NODE_VER" > "$NVMRC_PATH"
        echo "✅ Versión de Node.js sincronizada a v$TARGET_NODE_VER en .nvmrc y package.json"
    fi
else
    echo "🔒 Modo versiones declaradas activo (--declared-versions). Preservando versión exacta de .nvmrc sin consultar la red..."
fi

# Por defecto en modo --declared-versions o si falló la consulta: leer la versión canónica de .nvmrc
if [ -z "$TARGET_NODE_VER" ]; then
    if [ -f "$NVMRC_PATH" ]; then
        TARGET_NODE_VER=$(tr -d ' \n\r' < "$NVMRC_PATH" | sed 's/^v//')
    fi
fi

# Fallback a package.json si no existe .nvmrc
if [ -z "$TARGET_NODE_VER" ]; then
    TARGET_NODE_VER=$(grep -o '"node": *"[^"]*"' "$PKG_PATH" | grep -o '[0-9.]*' | head -n 1)
fi

if [ -z "$TARGET_NODE_VER" ]; then
    echo "❌ ERROR: No se pudo determinar la versión requerida de Node.js"
    exit 1
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

# 2. Instalar y activar Node.js en NVM
echo -e "\n🟢 Verificando / Instalando Node.js v$TARGET_NODE_VER en NVM..."
nvm install "$TARGET_NODE_VER" || echo "⚠️ Advertencia al instalar Node v$TARGET_NODE_VER via NVM."

echo -e "\n⚡ Activando Node.js v$TARGET_NODE_VER..."
nvm use "$TARGET_NODE_VER" || echo "⚠️ Advertencia al activar Node v$TARGET_NODE_VER."

# Preservar alias default existente del usuario para convivencia multi-proyecto
CURRENT_DEFAULT=$(nvm alias default 2>/dev/null | awk '{print $3}' || true)
if [ -n "$CURRENT_DEFAULT" ] && [ "$CURRENT_DEFAULT" != "N/A" ] && [ "$SET_DEFAULT" = false ]; then
    echo "ℹ️ Preservando alias default existente en NVM ($CURRENT_DEFAULT). Este proyecto se activa localmente vía .nvmrc ('nvm use')."
else
    echo "📌 Configurando alias default de NVM a v$TARGET_NODE_VER..."
    nvm alias default "$TARGET_NODE_VER" 2>/dev/null || true
fi

# 3. Limpieza de versiones obsoletas (ESTRICTAMENTE OPT-IN con --prune-other-versions)
if [ "$PRUNE_VERSIONS" = true ]; then
    echo -e "\n🧹 Limpiando versiones de Node.js en NVM (--prune-other-versions activado)..."
    if [ -d "$NVM_DIR/versions/node" ]; then
        for old_dir in "$NVM_DIR/versions/node"/v*; do
            if [ -d "$old_dir" ] && [ "$(basename "$old_dir")" != "v$TARGET_NODE_VER" ]; then
                old_ver=$(basename "$old_dir" | sed 's/^v//')
                echo "  [-] Eliminando versión: $old_ver..."
                nvm uninstall "$old_ver" 2>/dev/null || rm -rf "$old_dir"
            fi
        done
    fi
else
    echo -e "\nℹ️ Preservando todas las demás versiones de Node.js instaladas en NVM para convivencia multi-proyecto."
    echo "   (Usa --prune-other-versions solo si deseas eliminar deliberadamente otras versiones)."
fi

# 4. Detectar ruta de binarios y asegurar enlaces simbólicos en ~/.local/bin (Paridad con Symlink/Junction de Windows)
NODE_BIN_DIR="$NVM_DIR/versions/node/v$TARGET_NODE_VER/bin"
if [ ! -d "$NODE_BIN_DIR" ]; then
    NODE_BIN_DIR="$(dirname "$(nvm which "$TARGET_NODE_VER" 2>/dev/null || which node)")"
fi

# Forzar precedencia de la versión objetivo en la sesión actual
export PATH="$NODE_BIN_DIR:$PATH"

LOCAL_BIN="$HOME/.local/bin"
mkdir -p "$LOCAL_BIN"

echo -e "\n🔗 Sincronizando enlaces simbólicos en $LOCAL_BIN..."
for bin_name in node npm npx corepack css-checker; do
    if [ -e "$NODE_BIN_DIR/$bin_name" ]; then
        ln -sf "$NODE_BIN_DIR/$bin_name" "$LOCAL_BIN/$bin_name"
    fi
done

# 4. Actualizar npm a la última versión global (por defecto en auto-actualización; preservada en --declared-versions)
if [ "$UPDATE_TO_LATEST" = true ]; then
    echo -e "\n📦 Actualizando npm a la última versión global en este Node (npm@latest)..."
    npm install -g npm@latest || echo "⚠️ Advertencia: No se pudo actualizar npm globalmente. Continuando con versión actual..."

    # Re-sincronizar symlinks en ~/.local/bin por si npm/npx fueron actualizados
    for bin_name in npm npx; do
        if [ -e "$NODE_BIN_DIR/$bin_name" ]; then
            ln -sf "$NODE_BIN_DIR/$bin_name" "$LOCAL_BIN/$bin_name"
        fi
    done
else
    echo -e "\n🔒 Preservando versión activa de npm ($($NODE_BIN_DIR/npm -v 2>/dev/null || npm -v)). No se actualiza npm en modo --declared-versions."
fi

# 5. Configuración de Seguridad de NPM aislada al proyecto (sin afectar el entorno global)
echo -e "\n🛡️ Verificando configuración local de npm (.npmrc del proyecto)..."
if [ ! -f "$SCRIPT_DIR/.npmrc" ]; then
    cat << 'EOF' > "$SCRIPT_DIR/.npmrc"
# Poké Vicio - Local Project NPM Configuration
ignore-scripts=true
registry=https://registry.npmjs.org/
audit-level=high
EOF
    echo "  [+] Creado .npmrc local con políticas aisladas (ignore-scripts, registry, audit-level)."
else
    echo "  [✓] .npmrc local detectado y activo."
fi

# Sincronizar configuraciones locales si no existen (sin pisar existentes ni ensuciar git)
if [ ! -f "$SCRIPT_DIR/src/data/system/servers.local.json" ] && [ -f "$SCRIPT_DIR/src/data/system/servers.defaults.json" ]; then
    echo "📋 Inicializando src/data/system/servers.local.json desde plantilla..."
    cp "$SCRIPT_DIR/src/data/system/servers.defaults.json" "$SCRIPT_DIR/src/data/system/servers.local.json"
fi

# 7. Instalar dependencias limpias del proyecto
echo -e "\n📦 Instalando dependencias del proyecto con npm ci..."
cd "$SCRIPT_DIR"
npm ci

# 8. Validar y compilar herramientas nativas auxiliares
npm run validate:tools

# Sincronizar binarios nativos generados hacia ~/.local/bin
if [ -e "$NODE_BIN_DIR/css-checker" ]; then
    ln -sf "$NODE_BIN_DIR/css-checker" "$LOCAL_BIN/css-checker"
fi

echo "======================================================"
echo " 🎉 ¡ENTORNO Y DEPENDENCIAS PREPARADOS CON ÉXITO!"
echo "======================================================"
echo "Versiones activas:"
node -v
npm -v
echo -e "\n[NOTE] Si tienes terminales del IDE previamente abiertas, recárgalas o ciérralas y ábrelas de nuevo para que hereden el nuevo PATH del sistema."
echo -e "Todo listo. Puedes iniciar el entorno de desarrollo ejecutando 'npm run dev'.\n"
