# Plan de Implementación: Temporadas Temáticas Rotativas y Teatro de Repeticiones PvP

Este plan detalla el diseño técnico, la arquitectura y la ruta de implementación para dos grandes expansiones del ecosistema competitivo PvP:

1. **Temporadas Temáticas Rotativas (12 Copas Anuales)**: Calendario de formatos con restricciones dinámicas por mes, autocompletado asistido de equipos legales y recompensas de Pokémon Shiny 31 IVs temáticos.
2. **Teatro de Repeticiones (Battle Theater & Battle Codes)**: Registro en base de datos de batallas del Top 10 y bajo demanda, códigos alfanuméricos compartibles (`BTL-XXXX-XXXX`), reproductor táctico paso a paso con niebla de guerra auténtica, pestaña social y badges interactivos en el chat.

---

## Cumplimiento de Estándares del Proyecto (Mandatory Compliance)

1. **`@/project-standards`**:
   - **Modularidad (< 500 líneas)**: Todos los nuevos componentes Vue (`BattleTacticalReplayer.vue`, `SocialRankingsTheater.vue`, `ProfilePinnedReplaysCard.vue`, `ChatBattleCodeBadge.vue`) se mantendrán estrictamente bajo el límite de 500 líneas.
   - **Animaciones GSAP Exclusivas**: Toda transición visual (controles tácticos, apertura de badges en chat, cambios de turno, podio de repeticiones) se implementará con GSAP (`gsap.to()`, `v-gsap-hover`, `useGsapTransition`), sin CSS transitions ni `@keyframes`.
   - **Cero Temporizadores Arbitrarios**: La sincronización del reproductor táctico se basará 100% en eventos de Showdown (`battle-ready-for-input`, `choice-stream-step`) sin `setTimeout` ni sleeps.
   - **Compatibilidad con 4 Asientos & Paridad Showdown**: Los flujos de reproducción preservan la simetría de asientos (`p1`, `p2`) y se ejecutan sobre `@pkmn/sim`.
   - **Protocolo de Pruebas de 3 Niveles**:
     - *Nivel 1*: Tests unitarios aislados para cálculo de temáticas, auto-fill asistido, niebla de guerra y Battle Codes.
     - *Nivel 2*: Tests de persistencia e integridad multi-motor (SQLite en memoria + PostgreSQL en Docker para `battle_replays`).
     - *Nivel 3*: Simulación Playwright E2E (`scripts/e2e/battle/pvp_replay_tactical_spectator.simulation.ts`).
2. **`@/domain-type-first`**:
   - Definición de tipos de dominio estrictos con branded IDs (`BattleCode`, `ReplayId`, `SeasonId`), tuplas inmutables `as const`, cero `any`/`unknown`, y diccionarios tipados $O(1)$.
3. **Reglas del Auditor de Calidad (`npm run audit`)**:
   - 0 errores en las 21 suites, cero números mágicos, eliminación de código muerto y respeto a los guardianes estáticos.

---

## Decisiones de Diseño Acordadas en la Sesión

1. **Temporadas Temáticas**:
   - Calendario predefinido de 12 meses en el cliente (`src/data/system/rankedData.ts`) con override dinámico en tabla SQL `ranked_seasons`.
   - Asistencia en UI: Botón "Autocompletar con equipo legal" en `PvPChallengeModal.vue` para poblar automáticamente los slots con los mejores Pokémon legales de las cajas PC si el equipo actual incumple la temática.
   - Premios de fin de mes: Los rangos Diamante y Maestro otorgan un Pokémon Shiny temático emblemático de la copa disputada, garantizando 3 IVs en 31 para Diamante y 4 IVs en 31 para Maestro (con los valores restantes aleatorios entre 0 y 31 para preservar el valor de la crianza y chapas de entrenamiento).
2. **Teatro de Repeticiones**:
   - Almacenamiento y Retención: Guardado bajo demanda ("Guardar y Generar Battle Code") en pantalla de victoria/derrota + auto-archivado público para combates con jugadores del Top 10, con ciclo de retención mensual (30 días).
   - Experiencia de Espectador: Reproductor táctico paso a paso (Play, Pausa, Siguiente Turno secuencial) sin saltos arbitrarios no deterministas.
   - Niebla de Guerra Auténtica: Movimientos, objetos y habilidades se revelan al espectador únicamente a medida que son utilizados en el combate.
   - Puntos de Acceso:
     - 4ª sub-pestaña `Teatro` en `SocialRankings.vue` (feed del Top 10 y buscador por Battle Code).
     - Tarjeta `ProfilePinnedReplaysCard.vue` en el perfil del jugador (hasta 5 repeticiones fijadas).
     - Badges interactivos en `GlobalChat.vue` y `DirectChatWindow.vue` con botón [VER REPETICIÓN].

---

## Cambios Propuestos por Componente

### 1. Dominio, Tipado y Catálogo Canónico

#### [MODIFY] [src/types/battle/pvp.ts](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/src/types/battle/pvp.ts)

- Extender `RankedSeasonRulesConfig` con `themeKey: SeasonalThemeId`, `themeName: string`, `themeDescription: string`, y `rewardPokemon: SeasonalRewardPokemonConfig`.
- Declarar tipo branded `BattleCode = string & { readonly __brand: unique symbol }` y validador `isBattleCode(val: unknown): val is BattleCode`.
- Declarar interfaz canónica `BattleReplayRecord`:
  - `id: string`
  - `battleCode: BattleCode`
  - `seasonId: string`
  - `themeId: SeasonalThemeId`
  - `p1: ReplayCombatantSummary`
  - `p2: ReplayCombatantSummary`
  - `turnsCount: number`
  - `winnerSide: 'p1' | 'p2'`
  - `choiceStream: ShowdownChoiceStep[]`
  - `initialSeed: [number, number, number, number]`
  - `isTop10Archived: boolean`
  - `createdAt: string`
- Declarar tipo `SocialRankingsTab = 'season' | 'leaderboard' | 'podium' | 'theater'`.

#### [MODIFY] [src/data/system/rankedData.ts](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/src/data/system/rankedData.ts)

- Definir las 12 temáticas anuales canónicas `SEASONAL_ANNUAL_THEMES`:
  1. `monotype_clash` (Enero: Copa Monotipo)
  2. `kanto_classic` (Febrero: Clásico Kanto Gen 1)
  3. `little_cup` (Marzo: Little Cup primera fase evolutiva)
  4. `weather_masters` (Abril: Maestros del Clima)
  5. `dual_type_duo` (Mayo: Dúo Elemental)
  6. `no_legendaries` (Junio: Standard OU sin legendarios)
  7. `speed_warp` (Julio: Copa Velocidad y Trick Room)
  8. `elemental_triad` (Agosto: Tríada Fuego/Agua/Planta)
  9. `johto_kanto_frontier` (Septiembre: Kanto & Johto)
  10. `halloween_spook` (Octubre: Fantasma, Siniestro y Veneno)
  11. `titan_clash` (Noviembre: Dragón, Acero y Lucha)
  12. `masters_allstars` (Diciembre: Gran Torneo de Maestros All-Stars)
- Exportar helper $O(1)$ `getSeasonalThemeForMonth(month: number): SeasonalThemeConfig`.
- Mapeo de Pokémon Shiny temáticos por copa en `SEASONAL_REWARD_POKEMON_MAP` con asignación garantizada de 3 IVs perfectos (Diamante) y 4 IVs perfectos (Maestro).
- Propiedad `bannerImage: string` en cada tema apuntando a `/assets/ui/events/tournament_<theme>_full.webp`.

---

### 2. Banners de Arte Temático de Torneos (`_raw-assets` & Pipeline WebP)

#### [NEW] Assets en `_raw-assets/public/assets/ui/events/` (1376x768 PNG 16:9)

- Generar 12 ilustraciones emblemáticas de alta fidelidad Retro-Modern para cada temática anual:
  1. `tournament_monotype_full.png` (Copa Monotipo)
  2. `tournament_kanto_full.png` (Clásico Kanto)
  3. `tournament_little_cup_full.png` (Little Cup)
  4. `tournament_weather_masters_full.png` (Maestros del Clima)
  5. `tournament_dual_type_duo_full.png` (Dúo Elemental)
  6. `tournament_no_legendaries_full.png` (Sin Legendarios)
  7. `tournament_speed_warp_full.png` (Copa Velocidad & Trick Room)
  8. `tournament_elemental_triad_full.png` (Tríada Elemental)
  9. `tournament_johto_kanto_frontier_full.png` (Frontera Kanto & Johto)
  10. `tournament_halloween_spook_full.png` (Noche de Brujas)
  11. `tournament_titan_clash_full.png` (Choque de Titanes)
  12. `tournament_masters_allstars_full.png` (Gran Torneo de Maestros All-Stars)
- **Protocolo de Arte Atemporal**: Cero fechas grabadas, cero años, cero horarios ni marcas de agua en la imagen (mandato de `scripts/assets/AGENTS.md`).
- **Compilación Oficial**: Ejecutar `npm run assets:convert` para generar las versiones `.webp` optimizadas en `public/assets/ui/events/`.

---

### 2. Base de Datos y Persistencia Multi-Motor

#### [NEW] [database/migrations/20260907000000_create_battle_replays.sql](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/database/migrations/20260907000000_create_battle_replays.sql)

- Crear tabla `public.battle_replays`:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `battle_code VARCHAR(16) UNIQUE NOT NULL`
  - `season_id VARCHAR(64) NOT NULL`
  - `theme_id VARCHAR(64) NOT NULL`
  - `p1_user_id UUID REFERENCES auth.users(id)`
  - `p2_user_id UUID REFERENCES auth.users(id)`
  - `p1_data JSONB NOT NULL`
  - `p2_data JSONB NOT NULL`
  - `turns_count INT NOT NULL`
  - `winner_side VARCHAR(4) NOT NULL`
  - `choice_stream JSONB NOT NULL`
  - `initial_seed JSONB NOT NULL`
  - `is_top10_archived BOOLEAN DEFAULT FALSE`
  - `views_count INT DEFAULT 0`
  - `created_at TIMESTAMPTZ DEFAULT NOW()`
- Índices para búsqueda rápida por `battle_code`, `is_top10_archived`, `p1_user_id`, `p2_user_id` y `created_at`.
- Stored Procedure `fn_publish_battle_replay(payload JSONB)` con auto-detección de Top 10.
- Stored Procedure `fn_get_featured_replays()` para el feed público del Teatro.

#### [NEW] [database/migrations/20260907000000_create_battle_replays.sqlite.sql](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/database/migrations/20260907000000_create_battle_replays.sqlite.sql)

- Versión SQLite equivalente para persistencia offline y pruebas deterministas.

#### [MODIFY] [src/logic/db/rpcEmulations/rankedRpc.ts](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/src/logic/db/rpcEmulations/rankedRpc.ts)

- Añadir emulación TypeScript para `fn_publish_battle_replay` y `fn_get_featured_replays`.

---

### 3. Lógica de Juego y Motor de Repetición

#### [NEW] [src/logic/pvp/replayCodeGenerator.ts](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/src/logic/pvp/replayCodeGenerator.ts)

- Generador canónico de códigos de batalla con checksum: formato `BTL-XXXX-XXXX` (alfanumérico en mayúsculas).

#### [MODIFY] [src/logic/pvp/pvpTeamHelper.ts](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/src/logic/pvp/pvpTeamHelper.ts)

- Implementar `autoFillLegalTeamForTheme(availablePokemon: Pokemon[], theme: SeasonalThemeConfig, targetCount: number): Pokemon[]`.
- Selecciona el mejor lineup legal priorizando nivel más alto y mejores IVs totales, cumpliendo 100% de las restricciones de la copa.

#### [NEW] [src/logic/battle/replay/tacticalReplayEngine.ts](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/src/logic/battle/replay/tacticalReplayEngine.ts)

- Controlador del stream de repetición táctico:
  - Inicializa una instancia Showdown en modo espectador con la semilla original `initialSeed`.
  - Mantiene el estado de "Niebla de Guerra": conjunto $O(1)$ de movimientos, objetos y habilidades descubiertas por turno.
  - Métodos: `play()`, `pause()`, `nextTurn()`, `restart()`.

---

### 4. Interfaz de Usuario y Componentes

#### [NEW] [src/components/battle/BattleTacticalReplayer.vue](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/src/components/battle/BattleTacticalReplayer.vue)

- Barra de control flotante retro-moderna sobre la arena de batalla:
  - Indicador de Turno actual / Total de turnos (`TURNO 04 / 18`).
  - Botón Play / Pausa con animación GSAP.
  - Botón manual `[SIGUIENTE TURNO ▶]`.
  - Badge de estado con Niebla de Guerra activa.
  - Botón `[COPIAR CÓDIGO BTL]` con feedback toast.
  - Botón `[SALIR DEL TEATRO ✕]`.

#### [NEW] [src/components/social/SocialRankingsTheater.vue](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/src/components/social/SocialRankingsTheater.vue)

- Componente extraído para la 4ª pestaña de `SocialRankings.vue` (< 300 líneas):
  - Barra de búsqueda de Battle Code con validación instantánea y botón `[VER]`.
  - Feed de combates destacados del Top 10 del mes.
  - Tarjetas de batalla con avatares de entrenadores, tiers, número de turnos y botón directo de reproducción.

#### [MODIFY] [src/components/social/SocialRankings.vue](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/src/components/social/SocialRankings.vue)

- Añadir el selector de pestaña `teatro` (`🎭 TEATRO`) junto a `temporada`, `ranking` y `podio`.
- Montar `SocialRankingsTheater.vue` con transiciones animadas GSAP.

#### [NEW] [src/components/profile/ProfilePinnedReplaysCard.vue](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/src/components/profile/ProfilePinnedReplaysCard.vue)

- Tarjeta de perfil (< 250 líneas) que muestra hasta 5 repeticiones fijadas del jugador:
  - Miniaturas con resultado (Victoria 🏆 / Derrota 💀), fecha, ELO del rival y formato.
  - Botón de reproducción directa y botón de desanclar/eliminar.

#### [MODIFY] [src/components/modals/ProfileModal.vue](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/src/components/modals/ProfileModal.vue) & [TrainerProfileModal.vue](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/src/components/modals/TrainerProfileModal.vue)

- Incorporar `ProfilePinnedReplaysCard.vue` en el grid de tarjetas de perfil.

#### [NEW] [src/components/social/ChatBattleCodeBadge.vue](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/src/components/social/ChatBattleCodeBadge.vue)

- Mini-tarjeta interactiva para mensajes de chat que contienen un `BTL-XXXX-XXXX`:
  - Muestra icono de espadas cruzadas ⚔️, código de batalla y botón `[VER REPETICIÓN]`.

#### [MODIFY] [src/components/social/GlobalChat.vue](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/src/components/social/GlobalChat.vue) & [DirectChatWindow.vue](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/src/components/social/DirectChatWindow.vue)

- Renderizar `ChatBattleCodeBadge.vue` cuando un mensaje incluya el patrón de código de batalla.

#### [MODIFY] [src/components/modals/PvPChallengeModal.vue](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/src/components/modals/PvPChallengeModal.vue)

- Integrar banner de temática mensual activa.
- Añadir validación visual de reglas temáticas y el botón de asistencia `[AUTOCOMPLETAR CON EQUIPO LEGAL]` cuando algún Pokémon infrinja las restricciones.

---

## Plan de Verificación

### Pruebas Automatizadas

1. **Nivel 1: Pruebas Unitarias**
   - `tests/node/pvp/seasonalAnnualThemes.test.ts`: Validación de las 12 temáticas, rotación por mes y catálogo de recompensas.
   - `tests/node/pvp/assistedTeamAutoFill.test.ts`: Verificación del algoritmo de autocompletado asistido de equipo legal bajo restricciones temáticas.
   - `tests/node/pvp/replayCodeGenerator.test.ts`: Generación, formato y validación de `BattleCode` alfanumérico.
   - `tests/node/battle/tacticalReplayEngine.test.ts`: Flujo secuencial de turnos y revelación estricta por niebla de guerra.
   - `tests/unit/components/SocialRankingsTheater.spec.ts`: Montaje de la pestaña Teatro, feed y buscador.
   - `tests/unit/components/ProfilePinnedReplaysCard.spec.ts`: Renderizado de las 5 repeticiones fijadas.
   - `tests/unit/components/ChatBattleCodeBadge.spec.ts`: Detección y formato de códigos en el chat.
2. **Nivel 2: Integración & Persistencia Dual DB**
   - `tests/node/pvp/battleReplaysDualDb.test.ts`: Inserción, consulta, indexación y auto-archivo Top 10 tanto en SQLite como en PostgreSQL (`describeWithDatabase`).
3. **Nivel 3: Simulación E2E Playwright**
   - `scripts/e2e/battle/pvp_replay_tactical_spectator.simulation.ts`: Flujo completo de carga de repetición por Battle Code, avance turno por turno con "Siguiente Turno" y verificación visual de los elementos del arena.

### Comprobaciones de Calidad Obligatorias

- `npm run lint`: 0 errores de ESLint, vue-tsc, domain-types y markdown.
- `npm run audit`: 21/21 suites aprobadas con 0 errores.
- `npm run test`: 100% de tests aprobados sin regresiones.
