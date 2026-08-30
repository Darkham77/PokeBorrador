# Purpose

Manage the logic and assets of battle.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Pokéball Energy Beam Vector & TransformOrigin Geometry**:
  - When animating energy beam transitions (`catching` and `releasing`) via GSAP, `transformOrigin` MUST be specified using valid numeric percentage values aligned with the sprite's support line on the ground: `${feetXPct}% ${localGroundY.value}` (e.g. `50% 75%`). Using complex CSS `calc()` expressions inside GSAP `transformOrigin` is strictly forbidden because GSAP cannot parse arithmetic expressions and silently falls back to `bottom center` (100%), displacing the collapse anchor to the bottom of the container.
  - The target vector $(\Delta x, \Delta y)$ to the Pokéball center MUST be calculated relative to the ground origin as $\Delta x = 0$ and $\Delta y = -\text{pokeballSize} \times 0.35$, compensating for the Pokéball's CSS `translateY(-85%)` style.
  - Energy transitions MUST scale purely geometrically (`scale: 0 -> 1` or `scale: 1 -> 0`) with solid `opacity: 1`, without trailing opacity fades.
- **Lore-Proportional Item Sizing & 3D Perspective**:
  - All combat items rendered in the 3D arena (such as Poké Balls for switches, captures, and recalls) MUST derive their dimensions from `spatialCoordinator.ts` using side-specific constants (`BASE_POKEBALL_SIZE_PLAYER = 27` / 54px vs `BASE_POKEBALL_SIZE_ENEMY = 18` / 36px) multiplied by `OBJECT_SCALE`.
  - Sizing must preserve official lore proportions (e.g. 1:5 ratio with a 0.3m Pokémon like Rattata) and depth perspective between player foreground (300 units) and enemy background (200 units). Fixed CSS dimensions on combatant items in `.scss` files are strictly forbidden.
- **NPC Trainer Visual Lifecycle & GSAP State Choreography**:
  - **Step 1 (Entrance & Dialogue)**: The trainer slides in from off-screen right (`x: '150%'` to `x: '0%'`, `y: 0`, `scale: 1`, `transformOrigin: 'bottom center'`) and MUST remain stationary at center stage (`p2Pos`, `x: 0, y: 0`) at full size (`:w="baseEntitySizeEnemy"`, `scale: 1.0`) while displaying dialogue speech bubbles during `SEARCH_PHASE` / `SHOW_DIALOGS`. Dialogue speech bubbles (`BattleTrainerSpeechBubble` / `.battle-dialog-layer`) MUST be layered above the atmosphere layer (`AtmosphereLayer`) sharing the combat HUD z-index (`calc(var(--z-base) + 30)`) to remain unobstructed by weather particles or fog. Premature snapping to background retreat coordinates is strictly forbidden.
  - **Step 2 (Combat Confirmation & Retreat)**: Upon confirming combat ("LUCHAR"), the trainer retreats to their background standing position (`x: 300px, y: -120px, scale: 0.8`, `transformOrigin: 'bottom center'`) via GSAP (`triggerTrainerRetreat` using `TRAINER_RETREAT_X_OFFSET_PX`, `TRAINER_RETREAT_Y_OFFSET_PX`, `TRAINER_RETREAT_SCALE = 0.8`) and stays anchored there for the duration of `ACTIVE_BATTLE`.
  - **Step 3 (Standing In-Combat Entity & Mutual Exclusion)**: Standing trainer entities (`standingTrainerRef` / `.standing-trainer.enemy-trainer`) MUST use `:w="baseEntitySizeEnemy"` and CSS `transform: scale(0.8); transform-origin: bottom center;` to maintain seamless 0px/0% continuity with the GSAP retreat timeline. Presentation entities (`trainerRef`) and standing combatant entities MUST be strictly mutually exclusive via `:show-standing-trainers` and FSM states to prevent duplicate rendered instances.
  - **Step 4 (Battle Conclusion & Off-Camera Exit)**: Upon battle completion (victory, defeat, or fleeing), `triggerTrainerExit` animates the trainer moving off-screen to the right (`x: +=600px`).
  - **Step 5 (Team Rocket Flee Lore)**: Defeated or fleeing Team Rocket grunts (`trainerArchetype === 'rocket' | 'grunt'`) trigger the `flee` sound and rapid escape upon exit.
- **Battle Pixel-Art Integrity & Sprite Rendering**:
  - All animated battle entity containers and sprite layers (trainers, Pokémon combatants, atmosphere wrappers, status effect overlays, and sprite animators) MUST explicitly declare strict pixel-art rendering properties:

    ```scss
    image-rendering: -webkit-optimize-contrast !important;
    #{"image-rendering"}: crisp-edges !important;
    image-rendering: pixelated !important;
    -ms-interpolation-mode: nearest-neighbor !important;
    ```

  - Entity images MUST consume `@include sprite-render;` (from `src/styles/core/_gpu.scss`), which provisions dedicated GPU layer containment and pixel-art rendering.
  - Never use `@include pixelated;` for image/sprite rendering (which is strictly a typography/font mixin from `_layout.scss` for font smoothing and `font-pixel`).
- **GSAP Clock Standard & Zero-Timer Mandate (`gsapSleep`)**: All battle component animations, delays, transitions, and pauses (such as defeat screens, stage stabilization, and catch sequences) MUST be sequenced exclusively via GSAP (`gsapSleep` from `@/logic/utils/gsapHelpers` or `ctx.animations.awaitTween(...)`). Native `sleep(...)` and `setTimeout(...)` are strictly forbidden. This guarantees instant time-scaling in simulations (`gsap.globalTimeline.timeScale(...)`) while maintaining smooth 1x visual playback.
- **Showdown Single-Engine Delegation in UI**: UI components are strictly presentation and input dispatchers. Move calculations, damage, accuracy, boosts, and hazard resolutions are 100% owned by the Showdown worker engine. UI layers must never perform local calculations or manual ability/hazard executions.
- **UID-Based Element Binding & Selection Parity**: All interactive combatant and bench cards MUST bind unique HTML `id` attributes and canonical UID attributes (`data-pokemon-uid="${uid}"`) to ensure deterministic selection across UI replayers and Playwright tests without text-matching ambiguities.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- **Typed Template Refs & Expose Helpers**: When extracting child SFC subcomponents that expose DOM elements via `defineExpose`, always expose typed helper methods (e.g., `getTrainerElement(): HTMLElement | null`) instead of performing double type assertions (`as unknown as HTMLElement`) in parent watchers.
- **Scoped SCSS in Battle Subcomponents**: All extracted battle UI subcomponents must explicitly link their scoped stylesheet (`src="@/styles/components/_battle-arena-view.scss"`) to share design tokens, GPU layers, and mixins without CSS duplication.
- **Combat Grass & Emergence Layering (Mandatory Relative Z-Index)**: Front combat grass (`CombatGrass layer="front"`), back bush (`.back-bush-entity`), and all battle combatants (`BattleCombatant`) MUST ALWAYS use relative z-index bindings using CSS `calc(var(--z-map-spawns) + X)` values (e.g. `calc(var(--z-map-spawns) - 5)` for back bush, `calc(var(--z-map-spawns) + 1)` for front bush when behind, `calc(var(--z-map-spawns) + 2)` for enemy Pokémon, `calc(var(--z-map-spawns) + 3)` for front bush when covering, and `calc(var(--z-map-spawns) + 4)` for player Pokémon). Hardcoding small literal numeric z-indexes (`:z-index="2"`, `:z-index="4"`) is STRICTLY FORBIDDEN because inline styles override CSS cascade rules and cause automatic fixes or refactors to place Pokémon behind environmental layers. All intermediate FSM states between emergence jump start and active battle (such as `REORDER_TEAM`) MUST keep `bushIsBehind = true` to prevent z-index flicker during async worker initializations.
- **Complete Animation Bridge Mapping**: Local component animation bridge objects (such as `localAnimations` in `BattleArenaView.vue`) MUST explicitly map and forward ALL methods exported by domain animation composables (including `handleWithdrawRequest`, `handleReleaseRequest`, and `handleCatchRequest`). Omitting exported methods causes consumer state handlers to evaluate animation requests to `undefined`, silently bypassing critical animation sequences.
- **Strict MoveTooltip Type Alignment**: MoveTooltip SFC subcomponents (`MoveTooltipDamage.vue`, `MoveTooltipStatsGrid.vue`, `MoveTooltipStatus.vue`) MUST import and use the derived `ActiveMoveDetails` type exported by `useMoveTooltip.ts` for their `activeDetails` prop, ensuring 1:1 parity with composable calculations and zero type mismatch warnings.
- **Snappy Battle Animation Timings**: In-combat hit reactions (`PLAY_DAMAGE` / `-damage`) MUST use dedicated combat damage shake durations (`0.25s`) without trailing capture rest intervals. Physical attack dashes MUST follow snappy timings (~0.36s total: 0.08s windup, 0.14s strike, 0.14s return) to guarantee responsive retro-modern combat pacing.
- **Terrain & Atmosphere Visual Decoupling**: In `BattleArenaView.vue`, visual lighting and atmospheric tinting (`useWeatherVisuals`) must be resolved via `effectiveBattleVisual` (prioritizing `fieldConditions` such as electric/psychic/misty/grassy terrains with highest precedence), whereas weather particle layers (`AtmosphereLayer`) require validated `WeatherId` values to prevent runtime render exceptions.
- **Gym & Indoor Weather/Cycle Isolation**: In `BattleArenaView.vue`, gym combats (`isGym` / `locationId === 'gym'`), PvP battles (`locationId === 'pvp'`), and indoor arenas (`isIndoors` / `isCave` / `isCrystalCave`) MUST strictly enforce constant indoor daylight (`effectiveCycle = 'day'`) and block natural outdoor map weather (`effectiveBattleVisual = 'clear'`). Weather particles (`AtmosphereLayer`) and CSS atmosphere filters (`--atmosphere-filter`, `--weather-filter`) are strictly disabled inside interior arenas unless a battle move (*Rain Dance*, *Sunny Day*, etc.) or ability (*Drizzle*, *Drought*, etc.) actively casts in-combat weather (`battle.weather.type !== 'none' && battle.weather.type !== 'clear'`).
- **Combat Tooltip Typography & Symbol Fallbacks**: All combat move tooltip components (`MoveTooltip.vue`, `MoveTooltipStatsGrid.vue`, `MoveTooltipDamage.vue`, `MoveTooltipStatus.vue`, `MoveTooltipDetails.vue`, `MoveTooltipTactical.vue`) MUST import and consume typography tokens and mixins exclusively from `_move-tooltip-shared.scss`. Special symbols missing from the primary bitmap pixel font (`'Pokemon FireRed LeafGreen'`), such as the infinity symbol (`.infinity-val`, `.infinity-emoji`) or em-dashes (`.dash-val`), MUST explicitly override `font-family` with `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;`, enable antialiasing (`-webkit-font-smoothing: antialiased !important;`), and scale up to 13-14px (`font-weight: 900 !important;`) to guarantee identical visual weight, stroke thickness, and vertical alignment with 8px pixel font numerals.

## Verification

- Run `npm run lint`.

## Child DOX Index

- [./helpers/AGENTS.md](./helpers/AGENTS.md): Visual battle animation helpers and GSAP bridges.
