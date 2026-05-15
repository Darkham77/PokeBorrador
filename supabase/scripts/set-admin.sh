#!/bin/bash
# Script para asignar el rol de administrador a un usuario
# Uso: ./scripts/set-admin.sh usuario@ejemplo.com

EMAIL=$1

if [ -z "$EMAIL" ]; then
    echo "❌ Error: Debes proporcionar un email."
    echo "Uso: ./scripts/set-admin.sh tu@email.com"
    exit 1
fi

echo "🛡️ Asignando rol 'admin' al usuario: $EMAIL"

# Ejecutamos el comando SQL directamente en el contenedor de la base de datos
docker exec -i supabase-db-pokevicio psql -U postgres -d postgres -c "UPDATE public.profiles SET role = 'admin' WHERE email = '$EMAIL';"

echo "✅ Proceso completado. Si el usuario existía en la tabla 'profiles', ahora tiene permisos de administrador."
