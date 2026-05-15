#!/bin/bash

# SETUP SCRIPT - SUPABASE POKÉ VICIO
# Este script prepara el entorno para levantar Supabase con Docker.

set -e

echo "🚀 Iniciando configuración del servidor Supabase para Poké Vicio..."

# 1. Crear .env si no existe
if [ ! -f .env ]; then
    echo "📄 Creando archivo .env desde la plantilla..."
    cp .env.example .env
    
    # Generar contraseñas aleatorias
    DB_PASS=$(openssl rand -base64 18 | tr -dc 'a-zA-Z0-9' | head -c 20)
    JWT_SEC=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 40)
    
    sed -i "s/POSTGRES_PASSWORD=super-secret-password-pokevicio/POSTGRES_PASSWORD=$DB_PASS/" .env
    sed -i "s/JWT_SECRET=super-secret-jwt-token-must-be-long-and-random-77/JWT_SECRET=$JWT_SEC/" .env
    
    echo "🔑 Contraseñas generadas y guardadas en .env"
    
    # Generar LLaves JWT
    if command -v node > /dev/null; then
        echo "🛠️ Generando llaves JWT con Node..."
        KEYS=$(node scripts/generate-keys.js "$JWT_SEC")
        ANON_KEY=$(echo "$KEYS" | grep "ANON_KEY=" | cut -d'=' -f2)
        SERVICE_KEY=$(echo "$KEYS" | grep "SERVICE_ROLE_KEY=" | cut -d'=' -f2)
        
        sed -i "s|ANON_KEY=.*|ANON_KEY=$ANON_KEY|" .env
        sed -i "s|SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=$SERVICE_KEY|" .env
        
        echo "✅ Llaves JWT integradas en .env"
    else
        echo "⚠️ Node.js no detectado. Deberás generar las llaves manualmente o usar las por defecto."
    fi
else
    echo "✅ El archivo .env ya existe. No se realizaron cambios."
fi

# 2. Asegurar directorios de volúmenes
echo "📁 Asegurando directorios de volúmenes..."
mkdir -p volumes/db/data volumes/db/conf volumes/storage volumes/functions

# 3. Permisos
chmod +x scripts/*.sh

echo ""
echo "----------------------------------------------------------------"
echo "✅ Configuración lista."
echo "Para iniciar el servidor, ejecuta: docker-compose up -d"
echo "Luego, para cargar las tablas, ejecuta: ./scripts/init-db.sh"
echo "----------------------------------------------------------------"
