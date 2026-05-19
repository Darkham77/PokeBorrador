# Diseño del Clonador de Base de Datos Local de Pokémon Showdown

## 1. Resumen y Contexto

- **Objetivo:** Crear una herramienta automatizada y aislada en NodeJS que clone la lógica de combate de Showdown y descargue todos los assets visuales necesarios.
- **Ubicación de Trabajo:** Todo vivirá dentro de `src/game/battle/showdown/sandbox_db/` para no interferir con el funcionamiento actual del juego principal.
- **Propósito:** Lograr la total independencia de red del motor de combate offline, asegurando que el juego siga funcionando si los servidores externos de Showdown o de PokeAPI se caen.
- **Público:** Administradores y desarrolladores del proyecto.
- **Riesgo Aceptado:** Incremento significativo de peso en el repositorio Git local por alojar miles de sprites de Pokémon (PNG/GIF).

## 2. Decisiones Arquitectónicas (Decision Log)

| Decisión | Alternativa Considerada | Rationale (Razón de la elección) |
| :--- | :--- | :--- |
| **Opción 1: Exportación a JSON Maestro** | Exportación a base de datos SQLite o scraping puro en Python | La Opción 1 aprovecha el ecosistema NodeJS existente y el motor de TypeScript del proyecto. Generar un archivo JSON y descargar archivos locales es extremadamente simple (YAGNI), fácil de leer en Vue y rápido de implementar en una carpeta de pruebas (sandbox). |
| **Soporte de Fallbacks en Sprites** | Detener el script al fallar una imagen | Algunos Pokémon personalizados o variaciones no tienen GIFs animados. Implementar un fallback automático a imágenes PNG estáticas asegura que el script termine de ejecutarse correctamente en lugar de romperse. |
| **Aislamiento en carpeta `sandbox_db`** | Modificar la lógica actual del juego | Al aislar la base de datos y su clonador en un sandbox, podemos realizar pruebas A/B y comparar el rendimiento sin comprometer el juego jugable actual. |

## 3. Especificación Técnica y Flujo de Datos

### Estructura del Sandbox

```text
src/game/battle/showdown/sandbox_db/
├── cloner/                  # Módulos de la herramienta de clonación
│   ├── build_db.ts          # Script principal y orquestador
│   ├── extract_logic.ts     # Filtro y mapeo de datos de @pkmn/sim
│   └── fetch_sprites.ts     # Gestor de descargas de imágenes con reintentos
├── data/                    # Base de datos local lógica resultante
│   └── showdown_db.json     # Archivo JSON maestro con especies, ataques y habilidades
└── assets/                  # Directorio de almacenamiento de imágenes locales
    ├── front/               # Sprites de frente (con soporte GIF animado / PNG estático)
    ├── back/                # Sprites de espalda (con soporte GIF animado / PNG estático)
    └── icons/               # Iconos de menú y miniaturas
```

### Flujo del Script (`build_db.ts`)

1. **Llamada de Consola:** El desarrollador corre `npm run showdown:clone`.
2. **Carga e Iteración de Datos:** `extract_logic.ts` lee directamente de la librería `@pkmn/sim` los datos específicos formateados para Gen 3.
3. **Escritura del JSON:** Se limpia la información irrelevante y se escribe un archivo comprimido `showdown_db.json`.
4. **Cola de Descarga de Assets:** `fetch_sprites.ts` procesa en lotes concurrentes (ej. lote de 10) la descarga de imágenes a través de PokéAPI y servidores de sprites de Showdown.
5. **Estrategia Fallback:** Si un sprite no está disponible en formato `.gif` animado, descarga inmediatamente la versión `.png` estática y lo registra en el JSON.
6. **Finalización:** Se genera un reporte en consola informando cuántos Pokémon, ataques, habilidades y sprites fueron consolidados.
