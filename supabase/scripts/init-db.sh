#!/bin/bash

# INITIALIZE DATABASE - SUPABASE POKÉ VICIO
# Carga los esquemas base y las funciones RPC en el servidor Supabase local.

set -e

# Cargar variables de entorno
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "❌ Error: Archivo .env no encontrado. Ejecuta ./scripts/setup.sh primero."
    exit 1
fi

echo "🗄️ Inicializando base de datos en el contenedor supabase-db-pokevicio..."

# Función para ejecutar SQL
exec_sql() {
    local file=$1
    echo "📋 Cargando: $(basename $file)..."
    docker exec -i supabase-db-pokevicio psql -U postgres -d postgres < "$file" > /dev/null
}

# 1. Esquema Core (Esencial)
exec_sql "../database/schemas/db_core_schema.sql"

# 2. Otros esquemas en orden lógico
exec_sql "../database/schemas/db_claim_queue_schema.sql"
exec_sql "../database/schemas/db_dominance_schema.sql"
exec_sql "../database/schemas/db_events_schema.sql"
exec_sql "../database/schemas/db_global_chat_schema.sql"
exec_sql "../database/schemas/db_market_rpc.sql"
exec_sql "../database/schemas/db_ranked_payout.sql"
exec_sql "../database/schemas/db_ranked_rules_schema.sql"
exec_sql "../database/schemas/db_results_schema.sql"
exec_sql "../database/schemas/db_security_triggers.sql"
exec_sql "../database/schemas/db_sessions.sql"
exec_sql "../database/schemas/db_trade_rpc.sql"

# 3. Migración específica de Supabase
exec_sql "../database/schemas/supabase_migration.sql"

echo "✅ Base de datos inicializada correctamente."
echo "Ahora puedes aplicar las migraciones automáticas con: ./scripts/apply-migrations.sh"
