#!/bin/bash

# DOCKER INIT SCRIPT - SUPABASE POKÉ VICIO
# Este script corre DENTRO del contenedor de inicialización.
# No contiene datos harcodeados, solo orquesta la carga de los archivos originales.

set -e

echo "🗄️ Iniciando carga de esquemas desde el código fuente..."

# Función para ejecutar SQL
exec_sql() {
    local file=$1
    echo "📋 Cargando: $(basename $file)..."
    psql -h db -U postgres -d postgres -f "$file" > /dev/null
}

# 1. Esquema Core
exec_sql "/opt/pokevicio/database/schemas/db_core_schema.sql"

# 2. Resto de esquemas en orden
for f in /opt/pokevicio/database/schemas/db_*.sql; do
    if [[ "$f" != *"db_core_schema.sql"* ]]; then
        exec_sql "$f"
    fi
done

# 3. Migración Supabase
exec_sql "/opt/pokevicio/database/schemas/supabase_migration.sql"

echo "✅ Esquemas base cargados."
