# Guía de Despliegue (Docker-Native)

Esta arquitectura está diseñada para ser 100% autocontenida. La base de datos y sus esquemas se empaquetan en una imagen Docker personalizada.

## 1. La Imagen como Artefacto

El servidor se basa en imágenes empaquetadas. El flujo es:

1. **Construir la imagen** (en tu máquina de desarrollo o entorno de compilación).
2. **Subir la imagen** a un registro de contenedores.
3. **Descargar y Correr** en el servidor final.

### Construcción de la Imagen

Para generar la imagen con el esquema actual:

```bash
docker-compose build db
```

Esto genera la imagen `supabase-db-pokevicio` que contiene todas las migraciones en su interior.

## 2. Despliegue en el Servidor

En tu servidor de producción, solo necesitas el archivo `docker-compose.yml` y tu `.env`.

Al ejecutar:

```bash
docker-compose up -d
```

Docker gestionará la descarga de las imágenes y la base de datos se inicializará sola con toda la lógica de Poké Vicio, sin depender de archivos externos en el servidor.

## 3. Configuración de Red

Asegúrate de permitir el tráfico en el puerto **8000** para el API Gateway.

## 4. Actualización de Esquemas

Para aplicar cambios en la base de datos:

1. Genera una nueva versión de la imagen con los cambios.
2. Ejecuta `docker-compose up -d --build` para actualizar el contenedor en el servidor.
