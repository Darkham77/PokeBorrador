# Script para asignar el rol de administrador a un usuario
# Uso: .\scripts\set-admin.ps1 -Email tu@email.com

param (
    [Parameter(Mandatory=$true)]
    [string]$Email
)

Write-Host "`n🛡️ Asignando rol 'admin' al usuario: $Email" -ForegroundColor Cyan

# Ejecutamos el comando SQL directamente en el contenedor de la base de datos
docker exec -i supabase-db-pokevicio psql -U postgres -d postgres -c "UPDATE public.profiles SET role = 'admin' WHERE email = '$Email';"

Write-Host "✅ Proceso completado. Si el usuario existía en la tabla 'profiles', ahora tiene permisos de administrador.`n" -ForegroundColor Green
