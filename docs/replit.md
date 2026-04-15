# Pokémon Online — RPG Pokémon (Vue 3 + Vite)

## Descripción
Juego RPG de navegador inspirado en FireRed/Kanto, reconstruido con **Vue 3**, **Vite** y **Supabase**. Ofrece mecánicas clásicas de Pokémon con un sistema moderno de clases, misiones y persistencia en la nube.

## Arquitectura
- **Tecnología**: Vue 3 (Composition API) + Vite
- **Estado Global**: Pinia stores (proporcionan reactividad y persistencia automática)
- **Rutas**: Vue Router para una navegación fluida entre Mapa, Batalla y Menús.
- **Backend**: Supabase (Auth, DB real-time) + Vercel Functions para lógica de servidor.

## Archivos y Organización
| Directorio | Función |
|------------|---------|
| `src/views/` | Vistas principales (Map, Battle, Login, Pokedex) |
| `src/stores/` | Gestión de estado (User, Game, Battle) |
| `src/logic/` | Lógica de negocio modularizada (Cálculos de daño, Stats) |
| `src/legacy/js/` | Motor original en proceso de migración modular |
| `public/` | Activos estáticos (assets, maps) |

## Sistema de 4 Clases
Las clases se desbloquean al llegar al nivel 4 de entrenador. Cada una ofrece un estilo de juego único:

1. **Equipo Rocket 🚀**: Foco en recolección rápida de recursos (BC, EXP) y mercado negro.
2. **Cazabichos 🦋**: Especialistas en captura y encadenamiento para Pokémon Shiny/Perfectos.
3. **Entrenador 🎯**: Optimizado para combate, gimnasios y competitividad.
4. **Criador Pokémon 🧬**: Maestros en la guardería, herencia de IVs y eclosión rápida.

## Ejecución en Replit
```bash
npm install
npm run dev
```
Asegúrate de configurar las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY` en el panel de **Secrets** de Replit.

---
Ver `docs/rules/00_Indice.md` para la documentación detallada del sistema de juego.
