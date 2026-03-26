# Poké Vicio — RPG Pokémon en Español

## Descripción
Juego RPG de navegador inspirado en FireRed/Kanto, en español, con mecánicas propias. Backend en Supabase, frontend en HTML/CSS/JS vanilla.

## Arquitectura
- **Servidor**: `node server.js` en puerto 5000
- **Frontend**: HTML/CSS/JS vanilla (sin frameworks), cargado via tags `<script>` en `index.html`
- **Backend**: Supabase (PostgreSQL + Auth)
- **Sin bundler**: módulos cargados en orden explícito en `index.html`

## Archivos principales
| Archivo | Función |
|---------|---------|
| `js/00_ratios.js` | Constantes y ratios del juego |
| `js/01_auth.js` | Autenticación con Supabase, carga/guardado de partida |
| `js/04_state.js` | Estado global del juego (`state`), `INITIAL_STATE`, `makePokemon()` |
| `js/06_encounters.js` | Sistema de encuentros y Pokémon salvajes |
| `js/07_battle.js` | Motor de combate completo + fórmula de captura |
| `js/08_shop.js` | Tienda, curación, EXP de entrenador |
| `js/11_battle_ui.js` | UI del combate |
| `js/12_box_bag.js` | Caja de Pokémon y mochila |
| `js/15_breeding.js` | Sistema de cría/guardería |
| `js/20_classes.js` | **Sistema de clases completo** |

## Sistema de 4 Clases (Implementado)
Las 4 clases se desbloquean al llegar al nivel 5 de entrenador:

### Equipo Rocket 🚀
- **Bonificaciones**: EXP +20%, BC +15%, robo de ítems al iniciar batalla vs entrenadores, venta en mercado negro desde la caja
- **Penalizaciones**: Curación 2x cara, Reputación negativa, bloqueado en algunos gimnasios
- **Misiones idle**: Contrabando Básico (30m), Robo de Laboratorio (60m), Extorsión (45m)

### Cazabichos 🦋
- **Bonificaciones**: Sinergia Bicho (+5% catchRate por Pokémon bicho en equipo, máx +20%), Racha de captura con IV floor y shiny rate mejorado, zonas de Pokémon insecto
- **Misiones idle**: Expedición de Captura (45m), Torneo de Insectos (90m), Investigación de Hábitat (60m)

### Entrenador 🎯
- **Bonificaciones**: EXP combate +25%, Reputación en gimnasios (canjeable en tienda especial), BC +20%
- **Penalizaciones**: -10% catchRate en Pokémon con IVs totales > 120
- **Tienda de Reputación**: Ultra Balls, MTs, Revivires, Huevo Suerte...
- **Misiones idle**: Sesión de Gimnasio (30m), Torneo Local (90m), Mentoría (60m)

### Criador Pokémon 🧬
- **Bonificaciones**: 4 IVs heredados en cría (vs 3), huevos 25% más rápidos (22.5m vs 30m), Everstone 100% controlado, flag _haBoost para HA 75%, Análisis Genético desde la caja
- **Penalizaciones**: Curación 1.5x cara con Pokémon foráneos
- **Misiones idle**: Incubación Asistida (60m), Concurso de Belleza (45m), Análisis Genético Profundo (90m)

## Mecánicas Clave del Sistema de Clases
- `initClassSystem()` en `js/20_classes.js` se llama al autenticarse (en `js/01_auth.js`)
- `processOfflineClassMissions()` cobra automáticamente misiones completadas offline
- Misiones en `state.classData.activeMissions` (máximo 2 activas)
- Reputación del Entrenador en `state.classData.reputation`
- Racha de capturas del Cazabichos en `state.classData.captureStreak`
- HUD badge flotante (abajo derecha) muestra clase, nivel y progreso XP

## Diseño completo
Ver `Reglas/Sistema_de_Clases_Plan_Implementacion.md` para el plan completo.
