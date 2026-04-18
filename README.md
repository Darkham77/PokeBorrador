# Manual de Desarrollo: Pokémon Online (Vue 3 + Phaser 4)

Este manual detalla los comandos y configuraciones necesarios para trabajar en la nueva versión del juego usando **Vue 3**, **Phaser 4**, **Vite** y **Supabase**.

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado **Node.js (NPM)** y **Python** en tu sistema.

### 🌐 Instalación de Node.js y NPM

- **Windows (Terminal/PowerShell)**:

    ```bash
    winget install OpenJS.NodeJS
    ```

- **Linux (Ubuntu/Debian)**:

    ```bash
    sudo apt update && sudo apt install nodejs npm
    ```

### 🐍 Instalación de Python y Pip

- **Windows (Terminal/PowerShell)**:

    ```bash
    winget install Python.Python.3.12
    ```

- **Linux (Ubuntu/Debian)**:

    ```bash
    sudo apt update && sudo apt install python3 python3-pip
    ```

## 🛠️ Entorno de Desarrollo

Para iniciar el servidor de desarrollo local:

1. **Instalar dependencias**:

    ```bash
    npm install
    ```

2. **Actualizar dependencias** (Si hay nuevas versiones o warnings de seguridad):

    ```bash
    npm update
    ```

3. **Configurar Variables de Entorno**:
    Copia el archivo `.env.example` y renómbralo a `.env`, luego completa los valores de Supabase:

    ```bash
    cp .env.example .env
    ```

4. **Configurar Entorno Python (Optimizador)**:
    Instala las dependencias necesarias para los scripts de optimización (conversión a WebP, etc.):

    ```bash
    pip install -r requirements.txt
    ```

5. **Iniciar Vite**:

    ```bash
    npm run dev
    ```

El servidor estará disponible en `http://localhost:5173`.

## 🗄️ Base de Datos (Supabase)

### Inicialización

Para inicializar las tablas necesarias la primera vez:

1. Ejecutá el script [database/schemas/supabase_migration.sql](file:///home/franco/Trabajos/PokeBorrador/database/schemas/supabase_migration.sql) en el SQL Editor de Supabase.

### Actualizaciones y Migraciones

Cuando se añadan nuevas funcionalidades o cambios en los esquemas:

1. **Identificar cambios**: Revisa la carpeta `database/schemas/` por nuevos archivos `.sql`.
2. **Ejecución**: Copia el contenido de los nuevos archivos y ejecútalos en el **SQL Editor** de Supabase.
3. **Lógica de Servidor**: Si se modifican archivos como `db_trade_rpc.sql` o `db_security_triggers.sql`, asegúrate de ejecutarlos para actualizar las funciones RPC y triggers.

## 🚀 Despliegue (Hosting)

### Vercel (Recomendado Fullstack)

Vercel es la opción ideal ya que soporta automáticamente las funciones de la carpeta `/api`.

1. **Dashboard**: Conecta tu repositorio de GitHub en [vercel.com](https://vercel.com).
2. **Variables de Entorno**: En los ajustes del proyecto, agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY`.
3. **Despliegue**: Vercel detectará Vite automáticamente. Cada `git push` a `main` actualizará el sitio.

### GitHub Pages (Solo Frontend)

Si solo deseas hostear el cliente estático:

1. **Configurar Base**: En `vite.config.js`, agrega `base: '/PokeBorrador/'` (o el nombre de tu repo).
2. **GitHub Actions**: Utiliza un workflow (ej. `.github/workflows/deploy.yml`) para automatizar el build.
3. **Secrets**: Agrega las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY` en `Settings > Secrets > Actions`.

## ☁️ Configuración Local de Funciones (Vercel CLI)

Para probar las funciones de la carpeta `api/` localmente:

```bash
vercel dev
```

## 🛡️ Estándares de Calidad y Auditoría

Antes de realizar una entrega o desplegar cambios, es **MANDATORIO** que el código pase los siguientes controles:

1. **Linting**: El código debe estar libre de errores de sintaxis y seguir el estilo del proyecto.
2. **Testing**: Todos los unit tests deben pasar exitosamente.
3. **Build**: La aplicación debe compilar correctamente para producción.

```bash
npm run lint
npm run test
npm run build
```

### Reglas de Oro

- **Eficiencia GPU**: Usa siempre Texture Atlases y Object Pooling en Phaser.
- **Assets WebP**: Prohibido usar PNG/JPG raw; usa el script de conversión a WebP. (Excepción: Assets de PokeAPI deben ser PNG).
- **Ley de 500 Líneas**: Ningún archivo de lógica o componente debe exceder las 500 líneas.
- **Aislamiento de Servidores**: No mezcles datos de instancias Global (Supabase) con Local (SQLite).

---

## 📂 Estructura del Proyecto

- `/src`: Código fuente de la aplicación (Componentes, Stores, Vistas).
- `/public`: Activos estáticos (Assets, Mapas).
- `/api`: Funciones serverless para el backend.
- `/database`: Esquemas SQL y migraciones.
- `/tests`: Suite de pruebas (Vitest).
- `/docs`: Documentación técnica y reglas del juego.
