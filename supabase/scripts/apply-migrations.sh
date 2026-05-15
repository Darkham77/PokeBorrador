#!/bin/bash

# APPLY MIGRATIONS - SUPABASE POKÉ VICIO
# Extrae y aplica las últimas migraciones del código fuente a la base de datos.

set -e

# Cargar variables de entorno
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "❌ Error: Archivo .env no encontrado."
    exit 1
fi

echo "🔄 Extrayendo y aplicando migraciones desde el código fuente..."

if command -v node > /dev/null; then
    node scripts/extract-migrations.js > scripts/pending_migrations.sql
    
    echo "📋 Aplicando SQL de migraciones..."
    docker exec -i supabase-db-pokevicio psql -U postgres -d postgres < scripts/pending_migrations.sql > /dev/null
    
    rm scripts/pending_migrations.sql
    echo "✅ Migraciones aplicadas con éxito."
else
    echo "❌ Error: Node.js es necesario para extraer las migraciones automáticamente."
    exit 1
fi
