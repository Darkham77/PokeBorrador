# Guía de Instalación: Supabase Online

Esta guía te ayudará a poner en marcha el servidor desde cero.

## 📋 Requisitos Previos

- **Docker**: Instalado y corriendo.
- **Docker Compose**: (V2 recomendado).
- **Node.js**: (Opcional, pero recomendado para generar llaves automáticamente).

## 🛠️ Inicio Rápido

Para poner en marcha todo el ecosistema de Supabase (Base de datos, Auth, API, Migraciones), solo necesitas ejecutar:

```bash
docker-compose up -d --build
```

### 🤖 ¿Qué ocurre automáticamente?

1. **Inicialización**: El sistema detecta si es la primera vez y genera llaves JWT y contraseñas seguras automáticamente.
2. **Construcción**: Se empaqueta el esquema de la base de datos dentro de la imagen.
3. **Migración**: Un contenedor especializado espera a que la DB esté lista y aplica todos los cambios.
4. **Docker Up**: Levanta todos los servicios de la infraestructura de Supabase.
5. **Sincronización**: Espera a que la base de datos esté lista y aplica las migraciones finales.

## ❓ Solución de Problemas

### Los contenedores no inician

- Verifica que los puertos (por defecto 54322 y 8000) no estén siendo usados por otra aplicación.
- Puedes cambiar los puertos en el archivo `.env`.

### Error al conectar desde el juego

- Verifica el estado de los servicios con `docker ps`. Todos los contenedores deben estar en estado `Up`.
- Verifica que el `.env` de la raíz del juego tenga la URL correcta (ej: `http://localhost:8000`).
