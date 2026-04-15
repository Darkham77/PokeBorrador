# Testing Skill: Poké Vicio Local Environment

Esta skill define los parámetros obligatorios para realizar pruebas en el proyecto Poké Vicio.

## Configuración de Pruebas
- **Entorno**: Siempre usar base de datos local (Supabase local/mock).
- **Nombre de Usuario**: `ASH`.
- **Autenticación**: No existe el campo de email. El login se realiza únicamente por nombre de usuario.
- **Persistencia**: Los datos se guardan en el `localStorage` del navegador bajo la llave `pokemon_online_user` o similares según el componente.

## Procedimiento de Login para Testing
1. Abrir `http://localhost:5173/login`.
2. Ingresar `ASH` en el campo de Nombre.
3. El sistema debe cargar la configuración local de ASH sin requerir validación de servidor externo.

## Reglas Críticas
- **NO CAMBIAR LA ESTÉTICA**: El usuario valora el diseño premium por encima de la pureza arquitectónica. Cualquier refactorización debe preservar el CSS y la estructura del DOM original.
- **LIMPIEZA DE SESIÓN**: Al cerrar sesión, se debe asegurar que el objeto `ASH` se elimine de `localStorage` para permitir re-logueos limpios.
