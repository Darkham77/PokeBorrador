#!/usr/bin/env bash
# Plugin de configuración de servidores oficiales para Poké Vicio
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../../.." && pwd )"
cd "$SCRIPT_DIR"

if grep -q '"servers:configure"' package.json; then
    echo "  [plugin:01-servers-configure] Configurando servidores oficiales..."
    npm run servers:configure
fi
