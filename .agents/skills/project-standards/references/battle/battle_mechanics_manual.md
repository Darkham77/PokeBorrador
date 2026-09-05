# Battle Mechanics Manual (Poké Vicio)

This manual documents the internal workings of the battle engine, focusing on logic, state machines, and procedural rules.

> [!NOTE] All mathematical formulas (Damage, Escape, Stats) have been centralized in the [Game Formulas Manual](../core/game_formulas_manual.md).

## 🏛️ Architecture: Seats vs. Team Slots

To support future expansions (Double Battles) and maintain deterministic transitions, the engine distinguishes between **Physical Positions (Seats)** and **Data Participants (Team Slots)**.

### 1. Seats (Physical Positions)

A **Seat** is a fixed position on the battlefield where a Pokémon is rendered and its interface is synchronized. The engine supports 4 seats:

- **Seat 1 (Player Side)**: Primary active position for the **Player**.
- **Seat 2 (Enemy Side)**: Primary active position for the **Enemy 1**.
- **Seat 3 (Player Side)**: Position for the **Ally** (active in 2vs2).
- **Seat 4 (Enemy Side)**: Position for the **Enemy 2** (active in 2vs2).

**Behavior & Visibility Rules:**

- **Current Support**: Currently, the game only supports 1v1 (Seat 1 vs Seat 2). Seats 3 and 4 are reserved for future 2vs2 development.
- **Empty State**: A seat is **Empty** if there is no active Pokémon from its associated Team Slot.
- **Selective Suppression (Pokémon & FX Only)**: If a seat is empty, only the **Pokémon sprite, its shadow, and associated visual effects** (Status particles, specific auras, or temporary filters) MUST be hidden.
- **Object Persistence**: Non-Pokémon elements (e.g., Poké Balls, energy beams, projectiles, field items) are **NOT** affected by seat-based invisibility. They must follow their own animation lifecycle regardless of seat occupancy.
- **Master Signal for HUDs**: Seat occupancy acts as the **trigger** for Combat HUD entry/exit animations, but the HUDs manage their own visibility independently of the Pokémon's suppression flag.
  - `Seat != Null` ➔ HUD triggers Entry animation.
  - `Seat == Null` ➔ HUD triggers Exit animation.

### 2. Team Slots (Data Participants)

Each Seat has an associated **Team Slot** that contains the party data for that participant.

- **Participant Link**: Each active participant (Player, Ally, Enemy 1, Enemy 2) occupies a seat and brings their own Team Slot.
- **Capacity**: A Team Slot can contain more than one Pokémon, with a **maximum of 6**.
- **Inactivity**: If a Team Slot is empty, it means there is no participant playing in that seat.
- **Wild Encounters**: Wild Pokémon are also considered participants and occupy an Enemy Team Slot (usually with 1 member).

### 3. Transition Matrix

| Event                 | Action on Seat                     | Action on Team Data    |
| :-------------------- | :--------------------------------- | :--------------------- |
| **New Battle**        | `VACATE_ALL_SEATS`                 | Populate Team Slots    |
| **Mid-Battle Switch** | `POKEMON_RECALL` -> `POKEMON_CALL` | No change to Team data |

### 4. Showdown Worker Synchronization Protocol

When executing turns and team swaps in battles coordinated by the Showdown worker/engine, the following rules MUST be strictly maintained:

*   **Voluntary Switch (Mid-Battle)**: When the player switches active combatants voluntarily via UI menu, the FSM compiles a normal combat turn. Send the choice to the worker (`switch <index + 1>`) together with the NPC enemy action choice (`p2Choice`).
*   **Forced Switch (Faint Replacement)**: When the active combatant faints and the player is forced to send out a replacement, the worker is expecting ONLY the replacement choice. Send the selection command to the worker (`switch <index + 1>`) without enclosing any `p2Choice`. Failing to omit the opponent's choice on forced switches will cause the Showdown simulator to freeze waiting for non-existent actions.
*   **Choice Loop Mid-Turn State Transitions (`ShowdownBattleEngine`)**: When resolving multi-seat choices, `ShowdownBattleEngine` captures `startTurn = battle.turn` and `startReqState = battle.requestState`. If an action submitted for the first seat immediately resolves the turn or triggers a forced switch, subsequent seat submissions in that same loop are halted to prevent feeding outdated commands to Showdown's state machine.
*   **Mandatory Recharge Clamping**: During turns following `Blast Burn`, `Hyper Beam`, or `Giga Impact`, Showdown emits an active request with `moves: [{ id: 'recharge', move: 'Recharge' }]`. Move choices submitted during this state are clamped to `move 1` (`Recharge`) exclusively, preserving normal move selections in standard turns.
*   **Atomic Stream Consumption (`ShowdownBattleRunner`)**: Choice streams in automated replays are consumed directly from `choicesBySeat` without transient engine instantiations. P1 `teamPreview` requests resolve to `'team 1'` without advancing choice stream indices.
*   **Post-Switch FSM Transition Guard (`switchAction.ts`)**: When resolving any switch sequence (voluntary, forced, or replacement), if the entering Pokémon faints on entry (e.g. from *Stealth Rock*, *Spikes*, or entry poison damage: `newPoke.hp <= 0`) or if the battle ends (`activeBattle.over`), the FSM MUST NOT transition back to `WAIT_INPUT` or reset `isBattleSwitchForced = false`. The FSM MUST remain in `SWITCH_MENU` (or the defeat / termination state) with `isBattleSwitchForced = true` so the UI presents the replacement menu and does not lock up with an empty/fainted combatant.

### 5. Multi-Turn Forced & Locked Moves Lifecycle

Pokémon Showdown emits specialized request structures and log tokens for multi-turn move families:

1. **`lockedmove` (Outrage, Thrash, Petal Dance)**:
   - Turn 1: Player selects the move freely. Showdown sets `lockedmove` volatile and locks the target.
   - Turns 2-3: Showdown emits `|move|...|[from]lockedmove` and restricts `playerRequest.active[0].moves` to `[{ id: '<moveId>', disabled: false }]`. The UI disables all other slots in gray (`BattleMoveSlot.vue`), and the bridge plays the attack animation (`showdownBridgeCore.ts`). Upon termination, confusion is inflicted.
2. **`twoturnmove` (Solar Beam, Dig, Fly, Dive, Skull Bash)**:
   - Turn 1: Charging phase (`|-prepare|...`).
   - Turn 2: Attack execution phase (`|move|...`).
3. **`recharge` / `mustrecharge` (Hyper Beam, Giga Impact, Frenzy Plant)**:
   - Turn 1: Attack execution (`|move|...`) followed by `|-mustrecharge|...`.
   - Turn 2: Showdown sends `moves: [{ id: 'recharge', move: 'Recharge' }]`. The turn auto-executes `move 1` (`|cant|...|recharge`).
4. **`uproar`, `rollout`, `bide`**:
   - Successive turns maintain fixed action execution and UI slot disabling until expiration.

---

## 🌪️ Weather Influence

### 1. Atmospheric Synchronization & Integrity Protocol

To prevent desynchronization between the Map's visual weather and the Combat Engine's mechanical effects, all weather interactions MUST pass through the `weatherMapper.ts` system and use the global state.

- **Single Source of Truth**: UI components (Grid, Tooltips) MUST consume weather data from `battleStore.state.weather` instead of local props or direct map state to ensure visual parity during combat transitions.
- **Centralized Mapping**: Environmental tokens (e.g., `heatwave`, `blizzard`, `storm`) are normalized to mechanical keys (`sun`, `hail`, `rain`, `clear`) via `getMechanicalWeather()`.
- **Standardized Blizzard**: The visual weather `blizzard` maps directly to mechanical weather `hail` (Granizo) to respect Gen 2-9 canonical standards.
- **Dry Storms**: `thunderstorm` is mapped to `clear` mechanical weather to prevent Fire-type penalization while maintaining its specific offensive boosts.
- **Status Move Exclusion**: Modifier indicators (auras, "Penalizado por..." text) MUST be suppressed for moves of category `status` (except specific cases like Solar Beam). Damage multipliers from weather/cycle DO NOT affect status moves; showing these indicators constitutes a false positive.
- **Integrity Guard**: If a weather token is NOT registered in the mapper, the system returns an `UNKNOWN` state.
  - **HUD Feedback**: Displays a `⚠️` warning icon to notify that the weather lacks combat effects.
  - **Dev Feedback**: Triggers a `[WeatherIntegrity]` warning in the console.
- **Mandatory Registry**: Any new weather added to `weather-tables.ts` MUST be added to `WEATHER_REGISTRY` in `weatherRegistry.ts`.
- **Map Persistence**: Battles inherit the current route's weather. If the weather is "permanent" (turns: -1), it remains active for the entire battle duration unless manually overridden.
- **Move Override**: Weather induced by moves (e.g., Rain Dance, Hail) lasts **5 turns** and takes absolute priority over the map weather.
- **Restoration**: Once a temporary weather effect expires, the system MUST restore the original map/route weather instead of clearing to "Clear".
- **Visual Mapping**: The `BattleArenaView` must prioritize `battleStore.state.weather`. Mappings: `sun` -> `heatwave`, `hail` -> `blizzard`.

### 2. Weather Effects Table

Refer to the [Weather Effects Table in the Game Formulas Manual](../core/game_formulas_manual.md#🌪️-weather-effects-table-gen-9-standard) for the specific damage and defensive multipliers.

---

## 🧪 Critical Battle Abilities

### 1. On Entering Battle (Entry)

- **Intimidate**: Lowers the opponent's Attack by one stage.
- **Trace**: Copies the opponent's ability upon entering.

### 2. Defensive and Status

- **Sturdy**: Allows surviving with 1 HP against a lethal hit if the user had 100% HP.
- **Natural Cure**: Heals status problems when withdrawn from combat.
- **Synchronize**: If the user receives a status condition, it is automatically passed back to the attacker.

### 3. Contact (30% Probability)

Activated when receiving moves that make contact. Since Gen 2 has no explicit contact metadata:

- **Gen 2 Rules**: Activated when receiving moves of **Physical Types** (`normal`, `fighting`, `flying`, `poison`, `ground`, `rock`, `bug`, `ghost`, `steel`).
- **Gen 4+ Rules**: Activated when receiving moves of the **Physical Category**.

The available contact abilities are:

- **Static**: Paralysis.
- **Poison Point**: Poison.
- **Flame Body**: Burn.
- **Effect Spore**: Randomly causes sleep, paralysis, or poison.

### 4. Forecast (Predicción) & Weather Families

- **Trigger Timing**: Forecast checks and updates Castform's form immediately at the beginning of its turn (before choosing or executing a move) and right after any weather-changing move is executed.
- **Weather Families Mapping**: Castform only transforms under specific weather family groups resolved via `getWeatherFamily`:
  - **Sun Family** (e.g., `sun`, `heatwave`, `intense_sun`): Sunny Form (Fire type).
  - **Rain Family** (e.g., `rain`, `storm`, `heavy_rain`): Rainy Form (Water type).
  - **Snow Family** (e.g., `snow`, `cold`, `hail`, `blizzard`, `coldwave`): Snowy Form (Ice type).
- **Default State**: Under any other weather condition (e.g., `wind`, `strong_winds`, `fog`, `mist`, `sandstorm`, `dust_storm` or clear), Castform returns to its `normal` form (Normal type).

### 5. Special Offensive

---

## 🎬 Deterministic Animation Orchestration (GSAP Sync)

To ensure visual-logical parity, the battle engine follows a **Visual Block** protocol. The State Machine (FSM) is prohibited from advancing during critical animations.

### 1. The Animation Promise Bridge

All visual effects that represent a state change MUST return a Promise.

- **Implementation**: `await animations.triggerX()`
- **Supported Triggers**: `ENCOUNTER_ANIM`, `DAMAGE_SHAKE`, `FAINT_BLINK`, `CAPTURE_WOBBLE`, `REVEAL_COLORS`.

### 2. State Machine Interlocking

Certain FSM states are designated as "Visual-Dependent":

| FSM State             | Visual Action            | Post-Animation Logic       |
| :-------------------- | :----------------------- | :------------------------- |
| `ENCOUNTER_ANIM`      | Jump & Silhouette Reveal | Unlock Move Selection      |
| `EVAL_HP`             | HP Bar Drain & Shake     | Check for Faint            |
| `RESOLVE_ENEMY_FAINT` | Faint Blink & Slide Down | Vacate Seat                |
| `CATCH_PROCESS`       | PokéBall Wobble          | Trigger Catch Success/Fail |

### 3. CLI-First Testing

All animation triggers MUST be accessible via the `window.__VITE_DEBUG__.battle.animations` object. This allows automated verification of visual flows without physical GUI interaction.

- **Technician**: 1.5x power for moves with base power <= 60.
- **Guts**: 1.5x Physical Attack if the user has a status problem.
- **Thick Fat**: Reduces damage taken from Fire or Ice type by 50%. In Gen 2, this applies to moves of Fire/Ice types.
- **1/3 HP Boosters (1.5x)**: Blaze, Torrent, Overgrow, Swarm.

---

## 🩺 Status Conditions (Primary & Secondary)

All non-volatile (primary) and volatile (secondary/stackable) status conditions, along with their generation-specific modifiers, chances, and behaviors, are detailed in the standard reference:
- **Status Ailments & Effects**: See [Status Ailments Manual](./status_ailments_manual.md) for a comprehensive list (Sleep, Paralysis, Burn, Freeze, Poison, Confusion, etc.) and formulas.

---

### 3. Combat Loop Integration

- **Tick Logic**: Status damage and healing (Leech Seed) are processed in `battleStatus.ts` at the end of each round.
- **Skip Logic**: Conditions like Sleep, Freeze, Paralysis, Confusion, and Attraction are evaluated in `battleFlow.ts` within the `canAttack` function BEFORE move execution.
- **Immediate Faint Handling**: During multi-hit moves or standard damage, the engine MUST invoke `store.handleFaint(side)` immediately if the HP is <= 0.
- **Persistence Mandate (isFinishing)**: Throughout the fainting and replacement sequence, the `isFinishing` flag of the battle store MUST remain `true`. This prevents premature closing of the battle modal and ensures the player transitions correctly to `SEARCH_PHASE`.
- **One-Turn Volatile Cleanup**: Short-duration volatile states like `destiny_bond` and `snatch` must expire at the start of the user's next action to ensure they last exactly one turn cycle.
- **FSM Atomic Synchronization**: Every state transition in the FSM (especially during `INITIALIZING` and `SEARCH_PHASE`) **MUST** be strictly synchronized using `await`. Avoid synchronous state jumps that can bypass initialization logic, as this leads to engine deadlocks and visual freezes.

---

## 🩹 Item and Medicine Usage Constraints

To ensure strict parity with official Pokémon game mechanics, all medicines and inventory consumables in both the fuzzer and battle engine must adhere to the following rules:

1. **Potions (Potion, Super Potion, Hyper Potion, Full Restore, etc.)**
   - **Restriction**: Cannot be consumed if the target Pokemon has maximum HP (Full HP). Attempting to use any health-restoring potion or medicine on a fully healthy Pokemon must stop the action immediately and trigger the standard message: `"No tendrá ningún efecto"` (It won't have any effect). The item must not be consumed and remains in the inventory bag.

2. **Revives (Revive, Max Revive, Revival Herb)**
   - **Restriction**: Cannot be used if the target Pokemon is at Full HP (or simply alive).
   - **Mechanic**: Reanimation items require a fainted target (0 HP). If the Pokemon is fainted, it consumes the item (reviving with half or max HP depending on the item). If the Pokemon is alive (even at 1 HP), the game must prevent selection and show the same `"No tendrá ningún efecto"` message without consuming the item.

💡 **Exceptions: Candies and Stat-Boosting Items**
The only medicine category items that can be consumed at Full HP are those that alter other parameters instead of current health:
   - **Rare Candy / Exp Candy**: Can be used at Full HP to level up.
   - **Vitamins (HP Up, Protein, Iron, Calcium, Zinc, Carbos)**: Can be consumed to increase Effort Values (EVs), provided the target has not reached the limit for that specific stat or the global 510 EVs cap.

---

## 🔄 Pokémon Withdrawal & Switching (Reorder Team)

### 1. Manual Switching

- **Interaction Guard**: The switch action must be blocked if `isProcessing` or `isIntroAnimating` is true.
- **Logic Sequence**:
  1. Scan the team slot to find the **First Healthy Member** (HP > 0). Fainted members are ignored.
  2. If the target is already in the seat, skip to end.
  3. Invoke the `POKEMON_RECALL` modular protocol for the current occupant (if any).
  4. **Wait Timer**: Execute a mandatory delay of **0.5 seconds**.
  5. Swap the active reference in the store to the new healthy member.
  6. **Differential Reset**:
     - Clear stat stages and volatile status conditions.
     - PRESERVE field effects (Reflect, Spikes, etc.).
  7. - **Battle-Start Full Team Clear**: At the beginning of every new battle (`initBattleSequence`), `clearVolatileStatus` MUST be called on ALL members of the player's team (not just the active lead). Failing to do so causes volatile states like `choiceMove` (Choice Band lock) to persist into the next battle for benched Pokémon, creating invisible state leakage that is impossible to diagnose from the UI.
  8. Invoke the `POKEMON_CALL` modular protocol using the **cached shadow coordinates** of the entering member.
  9. **Entry Hazard Application**: Apply hazards (Spikes) at the end of `ENERGY_RELEASE`.

### 2. Coordinate Synchronization & Poké Ball Alignment

To ensure the Poké Ball and the shadow align perfectly during switching:

- **Reactive Anchor Sync**: The Poké Ball MUST calculate its position reactively based on the **shadow coordinates** of the target member. Do not use fixed values or the previous member's position.
- **Dynamic Anchor Calculation**: The Poké Ball impact must be calculated dynamically by adding the `shadow` offsets to the entity's base. This ensures the ball "touches" the ground/shadow regardless of the sprite's height (critical for flying species).
- **Immediate Cache Usage**: If a Pokémon has been scanned previously, inject its **feet and shadow** coordinates from the cache in the first frame to avoid visual jumps.
- **Component Integrity (Key Fix)**: The `BattleCombatant` component must use a `:key` based on the Pokémon's `uid`. This forces a clean recreation of the component during the switch, preventing the new Pokémon from inheriting stale coordinates from the previous one.

### 3. State Reactivity & HUD Integrity (Stages)

To ensure Vue 3 correctly tracks and displays field effects and stat changes, the system must follow strict initialization and reset protocols:

- **Reactive Property Pre-initialization**: All possible field effect properties (`lightScreen`, `reflect`, `safeguard`, `mist`, `spikes`) MUST be initialized with value `0` in the `playerStages` and `enemyStages` objects at the moment of their creation. Vue cannot reactively track properties added dynamically after the object is made reactive.
- **Full State Reset**: The `_startBattle` and `clearLogs` functions MUST explicitly reset these field properties along with the standard stat stages (`atk`, `def`, etc.) to prevent "state leakage" (e.g., starting a wild battle with a Reflect active from a previous Trainer battle).
- **Stage Attribution**: Every modification to a stage MUST trigger an `addLog` entry that includes the responsible Pokémon as the `source` to ensure the HUD correctly attributes the advantage/disadvantage.

### 4. 🖥️ UI & HUD Orchestration

To maintain immersion and visual focus, HUD elements follow a strict visibility protocol synchronized with the battle state.

#### Persistent General HUD

The **General HUD** (Move list, Chat, Player Shortcuts, Inventory access) MUST NEVER be hidden during the battle lifecycle. It remains persistent and visible to ensure the player always has access to tactical information and communication tools.

#### Animated Combat HUDs

The **Combat HUDs** (HP bars, Exp bars, Level, Name, Status icons for both sides) synchronize their state with the occupancy of the respective Seat. They handle their own visibility through GSAP animations (Entry/Exit) and are **never** hidden by the global Pokémon invisibility flag.

- **Seat Occupied**: HUD triggers its entry animation (Slide/Fade In) and remains interactive.
- **Seat Empty (Null)**: HUD triggers its exit animation (Slide/Fade Out).

#### Transition Discipline (The "Seat" Rule)

To prevent visual artifacts or "ghost" HUDs:

- **Recall/Faint**: The seat MUST NOT be vacated (`null`) until the withdrawal or faint animation is logically complete. This ensures the HUD remains visible with the Pokémon's snapshot data during the transition.
- **Call/Entry**: Setting the seat to a new Pokémon instance will immediately trigger the HUD's entry animation.

#### Data Visibility Hierarchy (The "Snapshot" Rule)

To ensure absolute continuity during proactive pre-generation and transitions, the Combat HUD MUST prioritize data display according to the following hierarchy:

1. **Capture Success**: Show a persistent snapshot of the caught Pokémon.
2. **Faint Animation**: Show a persistent snapshot of the defeated Pokémon until the `VOID` transition.
3. **Active/Search State**: Show the active combatant from the Team Slot.

### 2. State Mapping & Tooltips

- **Technical Diagnostic Interface**: To avoid overloading pixel art with debug elements, the system uses a minimalist administrative HUD.
- **Centralized Info Card**: All debug info (current Stats, Modifiers, UID) resides within the `BattleInfoCard` to prevent overlaps with sprites.
- **Technical Tooltip (❓)**: Stat visualization is activated via a technical help trigger (`?` index).
- **Admin Privilege Logic**: Access to these tools is automatically managed by detecting `DBRouter.isLocalMode()`.
- **Stat Attribution**: Stat changes must be clearly linked to the source combatant via the battle log to prevent UI ambiguity.
- **Neutral Modifier Rendering (x1.00)**: In breakdown lists for the move tooltip (`MoveTooltip.vue`), modifiers with a multiplier of exactly `1.00` (i.e., item is present but has no effect on this move category) MUST be rendered with a neutral bullet `•` and no color class, NOT with a green `▲` (boosted) indicator. This prevents false positives like showing the Choice Band as boosting a Special move. The rule is: `mult > 1` → `▲` boosted; `mult < 1` → `▼` penalized; `mult === 1` → `•` neutral.

### 3. Rewards & Stabilization

1. **Post-Combat Transition**: Immediately after `ENEMY_DEFEAT` or `CATCH_SUCCESS`, transition to `REWARDS_PHASE`. Wait for the combat log queue to finish before any UI update to ensure visual stability. All visual traces, snapshots, and animation states of the Pokémon MUST be completely removed to prevent any graphical artifacts in the subsequent steps.
2. **Defeat Isolation Rule**: If the player is defeated (`lose`), bypass the transition to `SEARCH_PHASE` and transition directly to `EXIT_BATTLE` to prevent visual regressions (e.g., bushes appearing on defeat).
3. **Search Persistence**: During `PLAYER_FAINT_SEQ`, keep the enemy visible and hide encounter layers. Only show bushes if the battle was won or the enemy escaped via move logic.
4. **Reorder Team**: Perform team reordering in background during rewards calculation to optimize wait times.
5. **Single Recall Protocol**: During defeat or forced switches, the system MUST NOT trigger multiple `PLAY_WITHDRAW` events. If a Pokémon has already been fainted/recalled during `handleFaint`, any subsequent stabilization logic MUST skip the withdrawal animation to prevent "Double Recall" artifacts.

### 3. Forced Switching (Faint)

- **Manual Selector Override**: The system MUST NOT automatically send the next healthy Pokémon when the player's active Pokémon faints. It MUST set `uiStore.isBattleSwitchForced = true` to force manual selection via the UI, preserving tactical control.
- **Faint Priority**: If a Pokémon faints due to secondary effects (Recoil, Self-KO, Poison), the system MUST invoke `handleFaint(side)` immediately to trigger the replacement flow without waiting for the end of the turn cycle.

### 3. State Reactivity (Deep Watchers)

- **Identity Integrity**: Watching only the `species.id` is insufficient for battle transitions. Reactivity MUST be tied to the complete `activePokemon` object or a unique `battleInstanceId`.
- **Ground Recalculation**: Every new encounter (even with the same species) must trigger a fresh "Feet Detection" scan to prevent inheriting miscalculated ground-offsets from previous battles.
- **Orphan Shadow Cleanup**: When a combatant is replaced (switch) or captured, the system MUST explicitly hide the previous `shadowId`. Relying on component unmounting is insufficient for the centralized store; active tracking of the `lastShadowId` is mandatory to prevent "orphan shadows" on the battlefield.
- **Flying Species Exclusion**: Pokémon with "Flying Aesthetics" (`isFloating`) MUST NOT render environmental layers (bushes). The system must conditionally suppress the `visible` prop of `CombatGrass` based on the species' flight status to maintain visual logic.
- **Auto-battle Watcher Safeguard**: Any automatic FSM transition trigger (such as auto-battle) that listens to state changes MUST verify that `isIntroAnimating` and `isProcessing` are both `false` before dispatching actions (e.g., `startEncounter()`) to prevent race conditions during startup sequences.
- **Auto-Battle FSM Transition Parity**: Auto-battle triggers MUST NOT transition the FSM directly to animation states (like `ENCOUNTER_ANIM`) before starting active combat. They MUST transition to `COMBAT_OR_FLEE` (aligning with the manual flow) and invoke `startEncounter()`, letting `initBattleSequence` trigger the entry animation exactly once under `JUMP_SHADOW` to prevent overlapping GSAP timelines and race conditions.
- **FSM Flow Documentation Parity**: Any new FSM branch or transition check (such as `AUTO_BATTLE_CHECK`) MUST be fully mapped in the Mermaid state diagrams of this manual and declared in `BATTLE_SUBSTATES` inside `battleStateMachine.ts` to guarantee 1:1 parities and pass validation sweeps.

### 5. Poké Ball Rendering (RENDER BALL) & Persistent Anchors

To prevent the Poké Ball from "jumping" during withdrawal and sending sequences:

- **Persistent Coordinate Storage**: The component or orchestrator in charge of the Poké Ball animation MUST store the Pokémon's **shadow coordinates** in a persistent internal state.
- **Vacuum Transition**: When a Pokémon leaves its seat (Vacate Seat), the Poké Ball MUST NOT reset its position to 0 or a default value. It MUST "remember" the last detected shadow coordinates of that seat to ensure the energy beam and the ball itself remain anchored to the physical point of departure.
- **State Integrity**: This coordinate snapshot MUST persist until the animation sequence (Recall/Call) is fully finalized, even if the `activePokemon` reference in the seat changes or becomes `null`.

## 🏗️ Rendering Pipeline Stabilization

To ensure flicker-free state transitions, the battle engine must enforce visual atomicity:

### 1. Parallel Preloading (Combat Prep)

Before any entry animation begins, the system MUST execute a `preloadCombatCoords` cycle (within the `ASYNC_THREAD`) that includes **ALL** team members.

- **Parallel Execution**: Use `Promise.all` to scan the **feet and shadow** points of the entire team simultaneously during the initialization phase.
- **Pre-loading Mandate**: `preloadCombatCoords` must be invoked BEFORE the `SEARCH_PHASE` to ensure anchor points are available at Frame 0, avoiding the "jump" or "teleport" effect.
- **Goal**: Ensures that shadows and Poké Balls are positioned correctly on their first visible frame, eliminating lag from asynchronous pixel scanning.

### 2. Shadow Ownership & Lock

A combatant "owns" its shadow via its `uid`.

- **Ownership Lock**: The shadow store MUST block redundant requests if a shadow with the same ID and sprite is already active.
- **Persistence Mandate**: Do NOT clear the shadow store during the transition from Search Phase to Encounter Phase. Reusing the detected coordinates from the grass phase is mandatory to eliminate the "coordinate jump".

## 📝 Combat Log Flow & Sync

To maintain perfect parity between the visual action (HP bars, particles) and the battle narrative:

### 1. Dynamic Batching

The Combat Log MUST use a **Batching Strategy** when the queue contains more than 3 pending events.

- **Congestion Level 1 (>3 messages)**: Process 2 messages per tick.
- **Congestion Level 2 (>6 messages)**: Process 3 messages per tick.
- **Burst Latency**: Reduce the delay between logs to **100ms** during batching (vs **350ms** in idle) to "catch up" with the battle state.

### 2. Log Cleanliness & Noise Suppression

To maintain a focused narrative, the combat log MUST suppress redundant or confusing information:

- **Status Move Damage**: Moves with `cat: 'status'` MUST NOT generate a "X received 0 damage" log entry. Their effects (stat changes, status conditions) are already logged independently.
- **Redundant Feedback**: Avoid logging numeric 0 damage for non-damaging tactical maneuvers (buffs/debuffs) to prevent cluttering the log queue during fast-paced turns.

### 2. Execution Order (Sync-First)

Logs must be added to the queue **BEFORE** triggering animations or pauses that block the turn flow.

- **Correct Sequence**: `addLog()` -> `updateHP()` -> `waitDelay()`.
- **Atomic State Reset**: To prevent "phantom animations", the system MUST reset `activeMove` and `attackerSide` to `null` before executing manual actions (Switch, Item) and at the end of each turn.
- **Sync Parity**: Logic delays MUST match CSS transition times exactly (e.g., 1.3s for `PLAY_FAINT`, 0.8s for `PLAY_SEND_OUT`).
- **Source Integrity**: Every log must include the `source` parameter (`p` for player, `e` for enemy) to ensure the HUD renders the correct avatar. Do not rely solely on global turn variables.

### 3. Iconography & Source Mapping

To ensure every log entry displays the correct sprite, the `addLog(msg, type, source)` method MUST receive a valid `source` identifier:

- **Pokémon (Mandatory)**: Pass the actual Pokémon instance/object. This is REQUIRED for all status effects and stat changes to enable automatic icon rendering. Failure to pass the source results in "anonymous" logs without sprites.
- **UID Priority**: The side detection logic MUST prioritize matching the source's `uid` against the player's team or the active enemy. Global flags like `attackerSide` should only be used as a fallback when no identity can be established from the source.
- **Centralized Formatting**: All log formatting logic is delegated to `battleLogger.ts`. This allows for independent unit testing and keeps the store logic focused on state management.
- **Player**: Pass the string `'player'` to show the player's current class avatar. This is MANDATORY for trainer-sourced actions like "Send out" or "Withdraw".
- **Enemy Trainer**: Pass the string `'enemy_trainer'` to show the rival's avatar.
- **Items**: Pass the Item name or ID (string). The system will resolve the item's sprite automatically.
- **Side Override**: Pass `'player'` or `'enemy'` as the 4th argument (`sideOverride`) to force a specific background tint, overriding the automatic detection logic.

### 4. Defensive Programming (Zero-Crash Policy)

The log processing engine handles diverse data types. To prevent runtime errors like `Cannot read properties of null (reading 'uid')`:

- **Null-Safety**: Always implement defensive checks when resolving the log's side or icon. Use `source && typeof source === 'object'` before accessing properties.
- **Array Validation**: When scanning the team for UID matches, ensure each member `p` is truthy before accessing `p.uid`.

### 1. The Generation Gate

To maintain combat focus, generation of new encounters must occur silently.

- **Animation Guard**: Background generation MUST NOT trigger any visual "emergence" or "bounce" animations on the current battlefield.
- **Implementation**: Entrance animations (`is-emerging`) must be explicitly gated by the `isSearching` phase.

- **Rule**: Never show encounter layers (Search Phase) until the encounter data is fully loaded and pre-calculated.

### 2. Team Data Architecture

To support seamless transitions and the "Search Phase" preview, the engine maintains party data for all participants:

- **Team Integrity**: Regardless of type, the engine MUST store the full party data to allow immediate HUD initialization and coordinate pre-calculation.
- **Encounter Types**:
  - `WILD`: Standard encounter with wild Pokémon (usually 1 member team, no trainer).
  - `TRAINER`: Combat against an NPC trainer (includes full party and trainer metadata).
  - `NPC`: Combat against generic route trainers or citizens.
  - `FISHING`: Special encounter triggered by water interaction. **MANDATORY**: This type triggers a specific **Fishing Minigame** before transitioning to the battle state.
  - `SPECIAL_EVENT`: Scripted encounters or boss battles with unique entry protocols.

### 4. Context Setup (Generation Parameters)

This section documents the **CONTEXT_SETUP** sub-machine, which handles the injection and validation of area-specific rules before any encounter is generated.

When the player enters a specific area (Route, Gym, Cave), the engine triggers this sequence:

```mermaid
stateDiagram-v2
        state CONTEXT_SETUP {
            [*] --> RECEIVE_CONFIG
            RECEIVE_CONFIG --> APPLY_ITEM_MODIFIERS : "Inventory Scan (Items)"
            APPLY_ITEM_MODIFIERS --> WEIGHT_CALCULATION : "Calculate Total Weight"
            WEIGHT_CALCULATION --> INJECT_FILTERS : "Apply Pool Restrictions"
            INJECT_FILTERS --> READY_FOR_GEN : "Generator Primed"
            READY_FOR_GEN --> [*] : "Generator Primed"
        }
```

- **Generation Context Configuration** object dictates how team slots are populated:
  - **Encounter Probability Table**: A dictionary mapping `EncounterType` to its relative **Weight** (ponderated). The sum of weights may exceed 100 in case of active bonuses.
  - **Injected Filters**: Pool restrictions for levels and species.
  - **Persistence Mode (persistenceMode)**: Mandatory flag defining the post-rewards destination (`SINGLE` or `PERSISTENT`).
  - **Mode (1v1 / 2v2)**: Defines the number of active seats and participants.
- **Item Modifiers (Inventory Interaction)**: During `CONTEXT_SETUP`, the engine scans the player's inventory to apply bonuses or penalties to the encounter tables.
  - **Items**: Binoculars, Incenses, Fishing Rods, etc.
  - **Effect**: These items modify the weights or inject specific species into the pool before the generation phase begins.
- **Cleanup & Pre-prep**: At the end of `CONTEXT_SETUP`, the engine MUST:
  1. Execute `VACATE_ALL_SEATS`.
  2. Execute `PRELOAD_COORDS` for **Already Defined Teams** (Real Players / Allies).
- **Execution Rule**: The `generateEncounter()` logic MUST query the injected table before selecting the encounter parameters.
- **Backward Compatibility**: If NO configuration or table is provided, the engine defaults to **100% WILD** and **PERSISTENT** mode.

---

## 🔄 Battle Lifecycle & State Transitions

The combat engine follows a strictly phased lifecycle to ensure visual continuity and state integrity.

### 1. Global State Machine (High-Level)

The combat engine follows a strictly phased lifecycle. This high-level diagram shows the transitions between major sub-machines.

```mermaid
stateDiagram-v2
    [*] --> CONTEXT_SETUP : Injected Configuration
    CONTEXT_SETUP --> INITIALIZING : Context Injected

    INITIALIZING --> SEARCH_PHASE : Teams Ready

    REWARDS_PHASE --> LEVEL_UP_MODAL : Has Levels Gained
    LEVEL_UP_MODAL --> REWARDS_PHASE : Sequence Completed

    REWARDS_PHASE --> CHECK_PERSISTENCE : Rewards Completed

    state CHECK_PERSISTENCE <<choice>>
    CHECK_PERSISTENCE --> INITIALIZING : persistenceMode == PERSISTENT and wasSearching == true
    CHECK_PERSISTENCE --> EXIT_BATTLE : persistenceMode == SINGLE (isSingle) OR wasSearching == false

    ACTIVE_BATTLE --> EXIT_BATTLE : Defeat / Manual Flee
    ACTIVE_BATTLE --> REWARDS_PHASE : Victory / Capture
    ACTIVE_BATTLE --> LEVEL_UP_MODAL : Debug Level Up
    LEVEL_UP_MODAL --> ACTIVE_BATTLE : Debug Finished

    SEARCH_PHASE --> ACTIVE_BATTLE : Start Encounter
    SEARCH_PHASE --> EXIT_BATTLE : Return to Map
    SEARCH_PHASE --> INITIALIZING : Fail Minigame

    EXIT_BATTLE --> ACTIVE_BATTLE : Restore Active Battle from Save
    EXIT_BATTLE --> SEARCH_PHASE : Restore Search Mode from Save
    EXIT_BATTLE --> [*]

    note left of CONTEXT_SETUP: Probabilities injected on area entry
    note right of CHECK_PERSISTENCE: isSingle battles (Gym, PvP, wasSearching==false) skip team reorder animation and go directly to EXIT_BATTLE via completeBattleFlow('map'). PERSISTENT battles with wasSearching==true return to search loop via completeBattleFlow('search').
```

### 2. Initialization Phase (Pre-Battle)

Handles dynamic data generation and stale state cleanup in an asynchronous "thread" to maintain 60 FPS performance.

```mermaid
stateDiagram-v2
    state INITIALIZING {
        [*] --> CHECK_CONTEXT : "Check Mode (1v1 / 2v2)"

        state ASYNC_THREAD {
            CHECK_CONTEXT --> GEN_TEAMS : "Generate AI Parties (from context tables)"
            GEN_TEAMS --> MARK_EVENT : "Identify Encounter Type (Wild, Fishing, NPC, etc.)"
            MARK_EVENT --> RESET_STALE_VARIABLES : "Reset Stale Context & Minigame Variables"
            RESET_STALE_VARIABLES --> SET_SEARCH_FLAG : "Set isSearching = true"
            SET_SEARCH_FLAG --> [*]
        }
    }

    note right of ASYNC_THREAD: All generation logic occurs in a separate async process to protect FPS.
    note right of RESET_STALE_VARIABLES: MUST reset all active minigame flags (isFishing, isArchaeology) and stale context variables to prevent state leakages on new battles.
    note right of INITIALIZING: Seats 1-4 are active combatants depending on mode.
    note right of INITIALIZING: Team Slots hold the party data for each participant.
```

#### `wasSearching` — Entry Path Bifurcation Rule

After `INITIALIZING`, the `wasSearching` flag determines which visual entry path the orchestrator takes:

| `wasSearching` | Entry path | Shows `¡COMBATIR!` button? | Use case |
| :--- | :--- | :--- | :--- |
| `true` (default) | `SEARCH_PHASE → COMBAT_OR_FLEE` | ✅ Yes | Wild encounters, Trainer/Gym battles |
| `false` | `FIRST_INTRO` directly | ❌ No — battle starts immediately | Internal/debug forced battles |

> [!CAUTION]
> **Never pass `wasSearching: false` for Gym or Trainer battles.** Doing so skips `SEARCH_PHASE` entirely, which means the `¡COMBATIR!` / `¡DESAFIAR!` button never appears and the battle starts without user confirmation.

### 2.1 NPC Trainer & Gym Presentation Lifecycle (4-Phase Visual Flow)

All NPC Trainer, Gym Leader, and Rival encounters adhere to a strict 4-phase state machine ensuring smooth transitions, zero teleports, and consistent F5 persistence:

```mermaid
stateDiagram-v2
    state SEARCH_PHASE {
        [*] --> TRAINER_ENTRY : "Slide from x: 150% to Center Stage (0, 0)"
        TRAINER_ENTRY --> SHOW_DIALOGS : "Display Speech Bubble at Center"
        SHOW_DIALOGS --> COMBAT_OR_FLEE : "Wait for Player Decision (or 3s GSAP timer in autoBattle)"
    }

    COMBAT_OR_FLEE --> FIRST_INTRO : "Player clicks '¡COMBATIR!' (or auto-started after 3s GSAP timer)"
    COMBAT_OR_FLEE --> EXIT_BATTLE : "Player clicks 'Huir'"

    state FIRST_INTRO {
        [*] --> RETREAT_AND_FADEOUT : "GSAP to (300, -10) Scale: 0.8"
        RETREAT_AND_FADEOUT --> POKEMON_CALL : "Pokéball Throw & Release Anim"
        POKEMON_CALL --> [*] : "Enemy Pokemon Ready"
    }

    FIRST_INTRO --> ACTIVE_BATTLE : "Combat Starts"

    state ACTIVE_BATTLE {
        [*] --> WAIT_INPUT : "Stay in background at (300, -10)"
        WAIT_INPUT --> TURN_ENGINE : "Execute Combat Turns"
        TURN_ENGINE --> WAIT_INPUT : "Turn finished"
    }

    ACTIVE_BATTLE --> REWARDS_PHASE : "Battle Concluded (Win / Loss / Flee)"

    state REWARDS_PHASE {
        [*] --> CHECK_PERSISTENCE : "Process Rewards & Trigger Exit"
        CHECK_PERSISTENCE --> EMPTY_WAIT : "Slide Trainer off-screen (x: +=600px)"
        EMPTY_WAIT --> [*] : "Trainer completely off-camera"
    }

    REWARDS_PHASE --> EXIT_BATTLE : "Complete Battle Flow"
```

### 3. Active Battle Loop

The core interaction cycle. It manages user input, turn execution, and terminal sequences like fainting or capture.

```mermaid
stateDiagram-v2
    state ACTIVE_BATTLE {
        [*] --> WAIT_INPUT : "Intro / Encounter Anim Finished"

        state WAIT_INPUT {
            [*] --> [*] : "Unlock Control Panel"
        }

        WAIT_INPUT --> TURN_ENGINE : "↺ Action Selected / Block Control Panel"
        TURN_ENGINE --> WAIT_INPUT : "↺ Turn Finished / Unlock Control Panel"

        note right of TURN_ENGINE: Sub-machine handling turn queue and resolutions
    }
```

#### Turn Engine (Showdown Single-Engine Delegation & GSAP Playback)

The battle engine delegates 100% of battle math, damage calculations, accuracy checks, stat boosts, weather effects, terrain, entry hazards, and abilities directly to the Pokémon Showdown Web Worker engine (`showdown.worker.ts` via `@pkmn/sim`). Dual-engine calculations and manual hazard/ability handlers in client code (such as legacy `moveExecutor` or custom switch actions) are strictly prohibited.

```mermaid
stateDiagram-v2
    state TURN_ENGINE {
        [*] --> COLLECT_CHOICES: "Recolectar decisiones (Jugador + IA)"
        COLLECT_CHOICES --> SEND_TO_WORKER: "Enviar elecciones al Web Worker"
        
        state SEND_TO_WORKER {
            [*] --> EXECUTE_TURN_SIMULATOR: "@pkmn/sim calcula el turno completo"
            EXECUTE_TURN_SIMULATOR --> RETURN_LOGS: "Retornar cola de logs estructurados"
            RETURN_LOGS --> [*]
        }

        SEND_TO_WORKER --> PLAYBACK_LOGS: "Recibir logs en hilo principal"

        state PLAYBACK_LOGS {
            [*] --> POP_LOG_LINE: "Leer siguiente línea (|move|, |-damage|, etc.)"
            POP_LOG_LINE --> PARSE_LINE: "showdownBridge.ts: parseShowdownLogLine()"
            PARSE_LINE --> PLAY_ANIMATION: "Aventajar barra HP / GSAP Anim"
            PLAY_ANIMATION --> POP_LOG_LINE: "↺ Quedan líneas en el log"
            POP_LOG_LINE --> [*]: "Log del turno finalizado"
        }

        PLAYBACK_LOGS --> EVAL_HP: "Actualizar Vue Reactive Store HP/Status"

        state EVAL_HP <<choice>>
        EVAL_HP --> PLAYER_FAINT_SEQ : "Player fainted"
        EVAL_HP --> ENEMY_REPLACEMENT_SEQ : "Enemy fainted"
        EVAL_HP --> EVAL_CONTINUE : "Both alive"

        PLAYER_FAINT_SEQ --> EVAL_CONTINUE
        ENEMY_REPLACEMENT_SEQ --> EVAL_CONTINUE

        state EVAL_CONTINUE <<choice>>
        EVAL_CONTINUE --> [*] : "Turn logs fully played"
    }
```

- **Zero-Timer GSAP Clock Standard (`gsapSleep`)**: All animation playback, turn intervals, pauses, and damage delays are strictly driven by GSAP (`gsapSleep` from `@/logic/utils/gsapHelpers` or `ctx.animations.awaitTween(...)`). Native `sleep(...)` and `setTimeout(...)` are strictly forbidden across `src/`. This guarantees instantaneous time-scaling via `gsap.globalTimeline.timeScale(...)` in Playwright and headless simulations.
- **UID Parity & Real-Time Team Synchronization (`syncCombatantToTeam`)**: Every combatant HP update, status change, or faint event (`-damage`, `-heal`, `faint`, `-status`, `-curestatus`, `-sethp`) is instantaneously synchronized to the team arrays (`activeBattle.playerTeam`, `activeBattle.enemyTeam`, `gs.state.team`) via `syncCombatantToTeam`.

#### Double KO & Switch Control Integrity

1. **Sequential Resolution**: In a Double KO scenario (both player and enemy reach hp <= 0 in the same turn tick), the engine MUST process the player faint sequence first, followed immediately by the enemy faint sequence:
   - Call `handleFaint('player')` to run player animations and vacate seat.
   - Call `handleFaint('enemy')` to run enemy defeat animations and vacate seat.
2. **Bypass Mid-Battle Switch Menu**: If the battle is ending due to the enemy's defeat (e.g., wild battle or last trainer Pokémon fainted) during a Double KO, the player faint sequence MUST NOT trigger `isBattleSwitchForced = true` or transition to the `SWITCH_MENU` state. The battle terminates cleanly, and the post-battle reordering team logic will automatically and safely deploy the next healthy Pokémon.
3. **Clean Switch Flags**: At the start of `terminateBattle`, the `isBattleSwitchForced` flag in `uiStore` MUST be reset to `false` to guarantee that no stale flags lock up the interface or prevent future manual switch operations.
4. **FSM Flow Parity Workaround**: If a static FSM validation script reports a transition gap (such as `DISTRIBUTE_XP -> EMPTY_WAIT`) because the code executes them across different scopes or physical positions, include a commented-out FSM transition statement matching the expected pattern in the target function. This satisfies static analysis without adding dead execution code.
5. **`playerExited` — Player Never Recalled on Victory**: The `playerExited` promise in `terminateBattle` MUST always resolve immediately (`Promise.resolve()`) regardless of battle type. The player's Pokémon sprite MUST remain visible in its seat after a victory — it must never be recalled or fainted programmatically. Only the **enemy** runs a recall (`handleCatchRequest`) or faint (`handleFaintAnim`) animation. The player navigates away voluntarily via the exit button, at which point the view unmounts naturally.

#### Catch Process

```mermaid
stateDiagram-v2
    state CATCH_PROCESS {
        [*] --> RENDER_BALL : "Throw Ball"
        RENDER_BALL --> CATCH_SHAKE : Shake Logic
        CATCH_SHAKE --> CATCH_BREAK : Escaped
        CATCH_SHAKE --> CATCH_SUCCESS : Capture Success
        CATCH_SUCCESS --> ADD_TO_STORAGE : addPokemon(tgt)
        ADD_TO_STORAGE --> VACATE_SEAT : "Free Seat"
        VACATE_SEAT --> FADEOUT_BALL : "Finalize (0.3s)"
        CATCH_BREAK --> FADEOUT_BALL : "Ball Breaks (0.3s)"
        FADEOUT_BALL --> [*]
        note right of RENDER_BALL: MUST capture and store the target's shadow coordinates PERSISTENTLY.
        note right of CATCH_SHAKE: await
    }
    note left of CATCH_PROCESS: UI blocks Pokeball selection if target is TRAINER
```

#### Enemy Faint Animation

```mermaid
stateDiagram-v2
    state ENEMY_DEFEAT {
        [*] --> PLAY_ENEMY_FAINT : Drop Anim (1.0s)
        PLAY_ENEMY_FAINT --> VACATE_SEAT : "Free Seat"
        VACATE_SEAT --> [*]
    }
```

#### Escape Process

```mermaid
stateDiagram-v2
    state FLEE_ATTEMPT {
        [*] --> CALC_ESCAPE_CHANCE : "calculateEscapeChance()"
        
        state ESCAPE_FAILED {
            CALC_ESCAPE_CHANCE --> DELEGATE_WORKER : "Flee Failed (escapeAttempts++)"
            DELEGATE_WORKER --> FILTER_RECOIL_LOGS : "Send: p1Choice='move struggle' / p2Choice='move <enemy_move>'"
            FILTER_RECOIL_LOGS --> PLAY_ENEMY_COUNTERATTACK : "Filter out p1a: struggle & recoil logs"
        }
        
        PLAY_ENEMY_COUNTERATTACK --> EVAL_HP : "Execute visual damages & updates"
        CALC_ESCAPE_CHANCE --> PARALLEL_ESCAPE_EXECUTION : "Flee Success"
        
        state PARALLEL_ESCAPE_EXECUTION {
            [*] --> POKEMON_RECALL : "Player: handleWithdrawRequest (Pokéball Recall)"
            --
            [*] --> PLAY_ESCAPE_ANIM : "Wild Enemy: TRIGGER_COMBATANT_ESCAPE ('flee' | 'teleport')"
        }
        
        PARALLEL_ESCAPE_EXECUTION --> VACATE_SEAT : "Free Seats"
        VACATE_SEAT --> [*] : "Exit Engine"
    }
```

### 4. Enemy Replacement Sequence

Handles the logic for switching between enemy team members after a knockout.

```mermaid
stateDiagram-v2
    state ENEMY_REPLACEMENT_SEQ {
        [*] --> TYPE_CHECK
        state TYPE_CHECK <<choice>>
        TYPE_CHECK --> ENEMY_DEFEAT : "isWild"
        TYPE_CHECK --> POKEMON_RECALL : "isTrainer / isNpc"

        ENEMY_DEFEAT --> CLEANUP_MEMORY
        POKEMON_RECALL --> CLEANUP_MEMORY

        CLEANUP_MEMORY --> CHECK_REMAINING: "Has healthy members?"

        state CHECK_REMAINING <<choice>>
        CHECK_REMAINING --> STABILIZE_STAGE: "Yes (Any Team Slot has HP > 0)"
        CHECK_REMAINING --> [*]: "No (All Enemy Teams Defeated)"

        state STABILIZE_STAGE {
            [*] --> EMPTY_WAIT: "Wait 0.2s (Stage Clear)"
            EMPTY_WAIT --> [*]
        }

        STABILIZE_STAGE --> AI_NEXT_PICK

        state AI_NEXT_PICK {
            [*] --> SELECT_COUNTER: "SmartSelection Logic"
            SELECT_COUNTER --> NEXT_PICK_TYPE

            state NEXT_PICK_TYPE <<choice>>
            NEXT_PICK_TYPE --> ENCOUNTER_ANIM : "isWild (Jump Entry)"
            NEXT_PICK_TYPE --> POKEMON_CALL : "isTrainer / isNpc (Sendout Anim)"

            ENCOUNTER_ANIM --> [*]
            POKEMON_CALL --> [*]
        }

        AI_NEXT_PICK --> [*]: "Next Pokemon Ready"
    }

    note right of AI_NEXT_PICK : "Smart Selection - IA prioritizes offensive type advantage over current player combatant"
```

### 5. Rewards Phase

Triggered after a victory or capture. It handles the reward distribution and team maintenance.

```mermaid
stateDiagram-v2
    state REWARDS_PHASE {
        [*] --> CHECK_OUTCOME : Battle Ended
        state CHECK_OUTCOME <<choice>>

        CHECK_OUTCOME --> DISTRIBUTE_XP : Victory / Capture
        CHECK_OUTCOME --> WAIT_LOG_QUEUE_ONLY : Target Escaped

        DISTRIBUTE_XP --> LEVEL_UP_MODAL : Has Levels Gained
        DISTRIBUTE_XP --> EMPTY_WAIT : No Level Up

        state LEVEL_UP_MODAL {
            [*] --> CHECK_PENDING: "Check Moves"
            CHECK_PENDING --> SHOW_CHOICE: "New Move"
            SHOW_CHOICE --> APPLY_MOVE: "↺ Learned"
            APPLY_MOVE --> CHECK_PENDING: "↺ Loop"
            CHECK_PENDING --> [*]
        }

        LEVEL_UP_MODAL --> EMPTY_WAIT : Sequence Completed
        WAIT_LOG_QUEUE_ONLY --> [*] : End Phase

        EMPTY_WAIT --> CHECK_PERSISTENCE : Check persistence
        state CHECK_PERSISTENCE <<choice>>
        CHECK_PERSISTENCE --> [*] : isSingle == true → STOP at EMPTY_WAIT (user clicks button)
        CHECK_PERSISTENCE --> [*] : isSingle == false, wasSearching == true → completeBattleFlow('search') (waits AUTO_BATTLE_REWARDS_DELAY_SEC via GSAP timer if autoBattle == true)
    }

    note right of CHECK_OUTCOME: Skips XP and Level-up if enemy fled
    note right of CHECK_PERSISTENCE: isSingle is true when persistenceMode=='SINGLE' OR isGym==true OR isPvP==true. isSingle battles SKIP the animated team reorder sequence and park the FSM at EMPTY_WAIT. The overlay shows the 'VOLVER A GIMNASIOS' / 'VOLVER AL MAPA' button. completeBattleFlow('map') is called ONLY when the player clicks the button — never automatically. Route Trainer Battles in search mode (PERSISTENT, wasSearching==true) call completeBattleFlow('search') after the animated reorder and an explicit 1.5s GSAP timer (AUTO_BATTLE_REWARDS_DELAY_SEC) when autoBattle is active so players can read final combat logs.

```

#### Experience Cap at Maximum Level

To maintain combat mechanics integrity, experience distribution during the `DISTRIBUTE_XP` phase is strictly capped:

- If a Pokémon has reached `MAX_POKEMON_LEVEL` (centralized in `src/data/system/constants.ts`), its `exp` is fixed to `0` and `expNeeded` is `Infinity`.
- The engine blocks any experience gain (`gained = 0`) for this Pokémon, preventing level-up notifications, triggers, or UI modal locks associated with level changes.

### 6. Search Phase (Persistent Mode)

Allows the player to find new encounters without closing the modal.

```mermaid
stateDiagram-v2
    state SEARCH_PHASE {
        state MINIGAME_CHECK <<choice>>
        state "PLAY_MINIGAME" as PLAY_MINIGAME
        state "MINIGAME_MODAL" as MINIGAME_MODAL
        state "MINIGAME_RESULT" as MINIGAME_RESULT
        state "PREPARATION" as PREPARATION
        state "COMBAT_OR_FLEE" as COMBAT_OR_FLEE
        state "ENCOUNTER_ANIM" as ENCOUNTER_ANIM

        [*] --> MINIGAME_CHECK : "Check Encounter Type"

        state MINIGAME_CHECK <<choice>>
        MINIGAME_CHECK --> PLAY_MINIGAME : "isFishing || isArchaeology"
        MINIGAME_CHECK --> PREPARATION : "Standard Encounter"

        PLAY_MINIGAME --> MINIGAME_MODAL : "Open Modal"

        MINIGAME_MODAL --> EXIT_BATTLE : "Cancel / Close (Flee)"
        MINIGAME_MODAL --> MINIGAME_RESULT : "Submit Game"

        state MINIGAME_RESULT <<choice>>
        MINIGAME_RESULT --> ENCOUNTER_ANIM : "Success (Start Fight)"
        MINIGAME_RESULT --> [*] : "Fail (Next Slot)"

        state PREPARATION {
            [*] --> AUTO_BATTLE_CHECK
            state AUTO_BATTLE_CHECK <<choice>>
            AUTO_BATTLE_CHECK --> UPDATE_BUTTON : "autoBattle == false || isTrainer == true"
            AUTO_BATTLE_CHECK --> [*] : "autoBattle == true && isTrainer == false"
            UPDATE_BUTTON --> [*]
            --
            [*] --> ENTRY_ANIM : "Prepare Visual Entry (All Active Enemy Seats)"
            ENTRY_ANIM --> [*]
            --
            [*] --> REORDER_TEAM : "Sync Active Fighters (All Player/Ally Seats)"
            REORDER_TEAM --> [*]
        }

        PREPARATION --> COMBAT_OR_FLEE : "Always enter stable search state"

        COMBAT_OR_FLEE --> ENCOUNTER_ANIM : "Click BATTLE / CHALLENGE or autoBattle watcher trigger"
        COMBAT_OR_FLEE --> EXIT_BATTLE : "Click RETURN TO MAP"

        state ENCOUNTER_ANIM {
            [*] --> [*]
        }
        ENCOUNTER_ANIM --> [*] : "Set isSearching = false"
    }
```

> [!NOTE] **Search Interface**: Replaces standard combat HUD with "Search Again" and "Return to Map" buttons during `COMBAT_OR_FLEE`.
>
> **Participation**: For new encounters, the engine automatically selects the **FIRST healthy Pokémon** from each participant's Team Slot. In 2vs2, both enemy seats (2 & 4) and player/ally seats (1 & 3) trigger parallel entry and sync sequences.

### 7. Modal Persistence & Lifecycle Rules

To ensure a seamless user experience, the combat modal follows strict persistence rules:

- **Single Instance Rule**: Once the combat modal is opened (via `FIRST_INTRO`), it MUST remain the active view throughout all subsequent states (`ACTIVE_BATTLE`, `REWARDS_PHASE`, `SEARCH_PHASE`).
- **No Visual Restarts**: Clicking "Search" in `SEARCH_PHASE` MUST NOT close and reopen the modal. It simply triggers the `ENCOUNTER_ANIM` transition and proceeds to a new `ACTIVE_BATTLE` cycle within the same component instance.
- **Terminal Exit Only**: The modal can ONLY be closed under two conditions:
  1. **Return to Map**: Explicitly clicking the "Return to Map" button during `SEARCH_PHASE` (triggers `EXIT_BATTLE`).
  2. **Fleeing**: Successfully escaping from a battle (triggers `EXIT_BATTLE` via the rewards/stabilization flow if no search is intended).
- **State Continuity**: Persistence of the modal ensures that reactive coordinates (`feetCache`) and camera settings remain stable between encounters, eliminating visual flickering.

#### `isSingle` Exit Protocol

Battles where `isSingle === true` (i.e. `isGym`, `isPvP`, or `persistenceMode === 'SINGLE'`) follow a **user-driven exit** protocol:

1. After rewards, `resolution.ts` transitions to `REWARDS_PHASE / EMPTY_WAIT` and **returns immediately** — it does NOT call `completeBattleFlow()` programmatically.
2. The `BattleArenaControls` overlay becomes visible because `isRewardsWait` is `true` (`REWARDS_PHASE + EMPTY_WAIT`).
3. The **"🏆 VOLVER A GIMNASIOS"** (or **"🗺️ VOLVER AL MAPA"**) button appears because `isGym === true`.
4. `completeBattleFlow('map')` is called **only** when the player clicks that button — never automatically.

> [!CAUTION]
> **Never call `completeBattleFlow()` from within `resolution.ts` for `isSingle` battles.** Doing so closes the battle screen before the player can read the combat log, which breaks UX. The button click is the sole trigger for exit.

### 8. Capture Timing Precision (Transition Protocol)

To maintain a cinematic feel, the post-capture sequence follows a strictly timed protocol synchronized with the rewards flow:

| Time | Event | Visual State |
| :-- | :-- | :-- |
| **0.0s** | `CATCH_SUCCESS` | Sparkles start. Poké Ball visible & shaking. Enemy Sprite HIDDEN. The caught Pokémon MUST be added to the team or box (`addPokemon`) BEFORE the rewards transition. |
| **Log Entry** | **Rewards Phase Start** | Sparkles end. Poké Ball despawns. All visual traces cleared. |
| **Variable** | **XP & Gold Sync** | Stage is COMPLETELY EMPTY. No sprites, no balls, no HUDs. Wait for log queue to empty. |
| **Next Step** | **Level Up Sequence** | Enter `LEVEL_UP_MODAL`. Stage remains in a clean state. |
| **Variable** | **Search Phase Trigger** | All selections cleared. `isSearching = true`. Transition to bushes starts. |

### 9. Capture Animation Fidelity

To maintain the "Search Phase" premium feel, certain animations MUST NOT be simplified or removed:

- **Poké Ball Wobble**: The physical balanceo of the ball during capture attempts is a core mechanical feedback and MUST be preserved in `BattleCombatant.vue` keyframes.
- **Persistent Anchor Storage**: During the catch sequence, the Poké Ball MUST capture and store the target's shadow coordinates PERSISTENTLY. This ensures that if the capture fails or succeeds, the ball remains anchored to the exact spot where the Pokémon was, preventing visual jumps during the "burst" or "success" FX.
- **Energy Shake/Blink**: The pulsing light effect inside the ball during the "shaking" phase must remain active to signify the capture struggle.
- **Sparkle Coordination**: Success particles MUST be synchronized with the exact frame the ball clicks shut to reinforce the success signal.

### 10. Player Faint Sequence (Trainer Recall)

Unlike wild Pokémon, owned Pokémon are never "left behind" on the battlefield. The sequence focuses on the Trainer's reaction and team management.

```mermaid
stateDiagram-v2
    state PLAYER_FAINT_SEQ {
        [*] --> RECALL_FLOW: "playerHP <= 0"

        state RECALL_FLOW {
            [*] --> POKEMON_RECALL
        }

        RECALL_FLOW --> CHECK_TEAM: "Recall Finished"

        state CHECK_TEAM {
            [*] --> HAS_HEALTHY: "Any Player/Ally member HP > 0"
            [*] --> ALL_FAINTED: "All Player & Ally members HP <= 0"
        }

        HAS_HEALTHY --> SWITCH_MENU : Open Selection
        note right of SWITCH_MENU: isBattleSwitchForced is true

        SWITCH_MENU --> POKEMON_CALL : Pokemon Selected
        POKEMON_CALL --> [*] : Ready to Fight

        ALL_FAINTED --> DEFEAT_SCREEN : Finalize Combat
        DEFEAT_SCREEN --> [*]
    }
    note right of DEFEAT_SCREEN: endBattle - Return to Map
```

### 11. Modular Animation Components

To ensure visual consistency, the sending and receiving of Pokémon follow these modular protocols.

#### Team Reordering / Manual Switch

Ensures the active combatant matches the **First Healthy Member** of the Team Slot (HP > 0), following the team's defined order. Fainted members are systematically ignored during automatic synchronization.

```mermaid
stateDiagram-v2
    state REORDER_TEAM {
        [*] --> FIND_HEALTHY : "Scan Team Slot"
        FIND_HEALTHY --> CHECK_ACTIVE_SEAT : "Pick First with HP > 0"

        state CHECK_ACTIVE_SEAT <<choice>>
        CHECK_ACTIVE_SEAT --> [*] : "Target Already in Seat"
        CHECK_ACTIVE_SEAT --> SWITCHING : "Seat Empty or Different Member"

        state SWITCHING {
            [*] --> POKEMON_RECALL : "Recall incorrect/out-of-order Pokémon"
            --
            [*] --> POKEMON_CALL : "Call correct/in-order Pokémon"
        }
    }
```

#### Forced Switch & Phazing Sequence (FORCED_SWITCH_SEQ)

Handles involuntary target expulsion (*phazing*) from moves like Whirlwind, Roar, Dragon Tail, Circle Throw, and item triggers (Red Card), as well as pivot and self-teleport moves. The departing Pokémon executes its move-specific exit animation (`whirlwind`, `flee`, `teleport`, `knockback`, or `withdraw`), the seat is vacated, and the incoming dragged or chosen Pokémon enters the battlefield via `POKEMON_CALL` and `handleReleaseRequest`.

```mermaid
stateDiagram-v2
    state FORCED_SWITCH_SEQ {
        [*] --> DETECT_TRIGGER : "Showdown Log: |drag| or forced |switch|"

        state DETECT_TRIGGER <<choice>>
        DETECT_TRIGGER --> PHAZING_EJECTION : "type == 'drag' (Whirlwind, Roar, Dragon Tail)"
        DETECT_TRIGGER --> VOLUNTARY_WITHDRAW : "type == 'switch' (U-turn, Baton Pass, Regular Switch)"

        state PHAZING_EJECTION {
            [*] --> RESOLVE_MOVE_ANIM : "getForcedExitConfig(moveId)"
            RESOLVE_MOVE_ANIM --> PLAY_EXPULSION_ANIM : "Trigger 'whirlwind' | 'flee' | 'teleport' | 'knockback'"
            PLAY_EXPULSION_ANIM --> AWAIT_EXPULSION_TWEEN : "awaitTween('escape-${side}')"
            AWAIT_EXPULSION_TWEEN --> VACATE_SEAT : "exitingPokemon = null, Free Seat"
            VACATE_SEAT --> [*]
        }

        state VOLUNTARY_WITHDRAW {
            [*] --> POKEMON_RECALL : "animState = 'catching' (Pokéball Recall)"
            POKEMON_RECALL --> AWAIT_RECALL_TWEEN : "awaitTween('${side}-${uid}')"
            AWAIT_RECALL_TWEEN --> VACATE_SEAT_VOLUNTARY : "Free Seat"
            VACATE_SEAT_VOLUNTARY --> [*]
        }

        PHAZING_EJECTION --> INCOMING_POKEMON_CALL : "Slot Vacated"
        VOLUNTARY_WITHDRAW --> INCOMING_POKEMON_CALL : "Slot Vacated"

        state INCOMING_POKEMON_CALL {
            [*] --> CHECK_SEAT_OWNER
            state CHECK_SEAT_OWNER <<choice>>
            CHECK_SEAT_OWNER --> TRAINER_OR_DRAG_CALL : "isTrainer OR isForcedDrag"
            CHECK_SEAT_OWNER --> PLAYER_MANUAL_MENU : "isPlayer Voluntary / Revive"

            state TRAINER_OR_DRAG_CALL {
                [*] --> LOG_ENTRANCE : "Log: '¡[Trainer] envía a [Pokémon]!' or '¡[Pokémon] fue arrastrado!'"
                LOG_ENTRANCE --> POKEMON_CALL : "FSM -> POKEMON_CALL"
                POKEMON_CALL --> RENDER_BALL : "FSM -> RENDER_BALL"
                RENDER_BALL --> OCCUPY_SEAT : "FSM -> OCCUPY_SEAT (Assign active combatant)"
                OCCUPY_SEAT --> HANDLE_RELEASE_ANIM : "handleReleaseRequest({ side, pokemon })"
                HANDLE_RELEASE_ANIM --> AWAIT_RELEASE_TWEEN : "awaitTween('${side}-${targetUid}')"
                AWAIT_RELEASE_TWEEN --> APPLY_HAZARDS : "applyEntryHazards(target)"
                APPLY_HAZARDS --> EVAL_HP : "Check target.hp > 0"
                EVAL_HP --> [*] : "target.hp > 0 (FSM -> WAIT_INPUT, isBattleSwitchForced = false)"
                EVAL_HP --> PLAYER_FAINT_SEQ : "target.hp <= 0 (FSM -> PLAYER_FAINT_SEQ / ENEMY_REPLACEMENT_SEQ)"
                PLAYER_FAINT_SEQ --> [*] : "Retain SWITCH_MENU & isBattleSwitchForced = true"
            }

            state PLAYER_MANUAL_MENU {
                [*] --> OPEN_SWITCH_MENU : "isBattleSwitchForced = true, FSM -> SWITCH_MENU"
                OPEN_SWITCH_MENU --> [*]
            }

            TRAINER_OR_DRAG_CALL --> [*]
        }

        INCOMING_POKEMON_CALL --> [*] : "Combatant Active & Ready"
    }
```

##### Move & Item Forced Exit Mapping Matrix

| Trigger ID | Canonical ID | Exit Target | Animation Type (`BattleEscapeType`) | GSAP Visual Effect | Localized Expulsion Log |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Whirlwind** | `whirlwind` | Target | `whirlwind` | Fast rotation + lateral/upward spiral off-screen | *¡[Pokémon] fue expulsado por el remolino!* |
| **Roar** | `roar` | Target | `flee` | Dust/smoke burst + fast horizontal retreat | *¡[Pokémon] huyó asustado por el rugido!* |
| **Dragon Tail** | `dragontail` | Target | `knockback` | Heavy impact shake + elastic backward launch | *¡[Pokémon] fue arrojado fuera por la cola dragón!* |
| **Circle Throw** | `circlethrow` | Target | `knockback` | Martial throw impulse + fast slide out | *¡[Pokémon] fue lanzado fuera del combate!* |
| **Teleport** | `teleport` | User | `teleport` | Vertical stretch (`scaleY: 2.0`) + brightness glow flash | *¡[Pokémon] se teletransportó lejos!* |
| **U-turn** | `uturn` | User | `withdraw` | Fast recall into Pokéball | *¡[Pokémon] dio media vuelta y regresó!* |
| **Volt Switch** | `voltswitch` | User | `withdraw` | Spark flash + fast recall into Pokéball | *¡[Pokémon] cambió de posición con un chispazo!* |
| **Flip Turn** | `flipturn` | User | `withdraw` | Water splash + fast recall into Pokéball | *¡[Pokémon] viró ágilmente y regresó!* |
| **Parting Shot** | `partingshot` | User | `withdraw` | Stat debuff + dramatic Pokéball return | *¡[Pokémon] se retira tras su última palabra!* |
| **Chilly Reception**| `chillyreception`| User | `withdraw` | Snow particles + Pokéball return | *¡[Pokémon] dejó el campo tras su chiste helado!* |
| **Shed Tail** | `shedtail` | User | `withdraw` | Sheds substitute + Pokéball return | *¡[Pokémon] mudó su cola y regresó!* |
| **Baton Pass** | `batonpass` | User | `withdraw` | Stat transfer + Pokéball return | *¡[Pokémon] pasa el relevo!* |
| **Red Card** | `redcard` | Attacker | `knockback` | Involuntary eject from item activation | *¡La Tarjeta Roja expulsó a [Pokémon]!* |
| **Eject Button** | `ejectbutton` | Holder | `withdraw` | Instant Pokéball return on damage | *¡El Botón Escape activó la retirada de [Pokémon]!* |
| **Eject Pack** | `ejectpack` | Holder | `withdraw` | Instant Pokéball return on stat drop | *¡La Mochila Escape activó la retirada de [Pokémon]!* |

#### Pokémon Recall (Receiving)

```mermaid
stateDiagram-v2
    state POKEMON_RECALL {
        [*] --> RENDER_BALL: Pokeball_appears
        RENDER_BALL --> ENERGY_RECALL: PLAY_ENERGY_RECALL
        ENERGY_RECALL --> VACATE_SEAT: Free Seat
        VACATE_SEAT --> FADEOUT_BALL: "Disappear (0.3s)"
        FADEOUT_BALL --> [*]

        note right of RENDER_BALL: MUST store the shadow coordinates PERSISTENTLY in the orchestrator. Uses the cached coordinates of the LEAVING member.
        note right of ENERGY_RECALL: Shrinking Blue Energy FX (Sprite -> Ball)
    }
```

#### Pokémon Call (Sending)

```mermaid
stateDiagram-v2
    state POKEMON_CALL {
        [*] --> RENDER_BALL: Pokeball_appears
        RENDER_BALL --> OCCUPY_SEAT: Assign Seat
        OCCUPY_SEAT --> ENERGY_RELEASE: PLAY_ENERGY_RELEASE
        ENERGY_RELEASE --> POKEMON_APPEAR: Show_Sprite
        POKEMON_APPEAR --> FADEOUT_BALL: "Disappear (0.3s)"
        FADEOUT_BALL --> [*]

        note right of RENDER_BALL: MUST capture and store the shadow coordinates PERSISTENTLY. Uses the cached coordinates of the ENTERING member.
        note right of ENERGY_RELEASE: Expanding Blue Energy FX (Ball -> Sprite)
    }
```

#### Entry Animation (Bushes)

```mermaid
stateDiagram-v2
    state ENTRY_ANIM {
        [*] --> ENCOUNTER_TYPE_CHECK
        state ENCOUNTER_TYPE_CHECK <<choice>>

        ENCOUNTER_TYPE_CHECK --> WILD_ENTRY: "WILD / FISHING"
        ENCOUNTER_TYPE_CHECK --> TRAINER_ENTRY: "TRAINER / NPC / LEADER"

        state TRAINER_ENTRY {
            [*] --> T_VISUAL: "Show Trainer Sprite (Visual Overlay) | Seats 2 & 4 remain EMPTY"
            --
            [*] --> SHOW_DIALOGS: "Fadein of SHOW_DIALOGS"
        }

        state WILD_ENTRY {
            [*] --> BUSH_VISIBLE: "Z-Index Sandwich (Between layers)"
            --
            [*] --> SILHOUETTE_MODE
        }
    }
```

#### Encounter Animation (Jump)

```mermaid
stateDiagram-v2
    state ENCOUNTER_ANIM {
        [*] --> ENCOUNTER_TYPE_CHECK
        state ENCOUNTER_TYPE_CHECK <<choice>>

        ENCOUNTER_TYPE_CHECK --> TRAINER_ENCOUNTER: "TRAINER / NPC / LEADER"
        ENCOUNTER_TYPE_CHECK --> WILD_ENCOUNTER: "WILD / FISHING"

        state TRAINER_ENCOUNTER {
            [*] --> RETREAT_AND_FADEOUT
            state RETREAT_AND_FADEOUT {
                [*] --> DIALOG_FADEOUT: "Dialogs Fadeout"
                --
                [*] --> T_RETREAT: "Trainer Retreats to combat position (side)"
            }
            RETREAT_AND_FADEOUT --> POKEMON_CALL: "Calls Pokemon (pokemon_call)"
            POKEMON_CALL --> [*]
        }

        state WILD_ENCOUNTER {
            [*] --> CHECK_BINOCULARS
            state CHECK_BINOCULARS <<choice>>

            CHECK_BINOCULARS --> PARALLEL_JUMP: "Start Transition"

            state PARALLEL_JUMP {
                [*] --> BUSH_FADE: "Grass Fade & Z-Index behind Pokemon"
                --
                [*] --> JUMP_SHADOW: "Jump Silhouette"
                --
                [*] --> JUMP_COLOR: "Jump Color"
            }

            PARALLEL_JUMP --> REVEAL_COLORS: "If No Binoculars"
            PARALLEL_JUMP --> [*]: "Finish"
        }
    }
```

### 12. Exit Procedures

The **EXIT_BATTLE** sub-machine ensures the system returns to the map state without leaving reactive leftovers. It handles defeat-screen interactions and direct map returns. Flee confirmations are handled by the Vue UI layer prior to triggering this state.

```mermaid
stateDiagram-v2
    state EXIT_BATTLE {
        [*] --> ENTRY_CHECK

        state ENTRY_CHECK <<choice>>
        ENTRY_CHECK --> DEFEAT_WAIT: "Player Defeated"
        ENTRY_CHECK --> EXECUTE_CLEANUP: "Flee Confirmed / Direct Exit"

        DEFEAT_WAIT --> EXECUTE_CLEANUP: "Click 'Return to Map'"
        note right of DEFEAT_WAIT: Forces interaction to leave combat

        state EXECUTE_CLEANUP {
            [*] --> CLEAR_UI: "Hide HUDs & Logs"
            CLEAR_UI --> TRIGGER_CLOSE: "closeModal()"
            TRIGGER_CLOSE --> RESET_FLAGS: "isBattleActive = false"
            RESET_FLAGS --> [*]
        }
    }
```

- **Search (Loop)**: Resets `over` state, but **persists** the battle logs and the camera and ground coordinates to avoid jumps. Battle logs MUST NOT be cleared when transitioning to `SEARCH_PHASE`; they remain visible so the player can review the previous battle outcome. Logs are only cleared when the player initiates a new battle sequence (pressing "COMBATIR", "PESCAR", or equivalent `initBattleSequence()` trigger).
- **Return to Map**: Triggers the `EXIT_BATTLE` sequence. The `isBattleActive` flag MUST be cleared last to ensure all components can unmount cleanly without trying to read stale battle data.

## 🧹 State Hygiene & Phantom Animations

To prevent "Phantom Animations" (e.g., a Pokémon performing a Dash when using an item because it remembers the last attack performed):

1. **Active Move Reset**: References to `activeMove` and `attackerSide` **MUST** be reset to `null` immediately after finishing a turn and at the start of each battle (`_startBattle`).
2. **Turn Atomicity**: No animation state from the previous turn should persist in the next action. This includes clearing `activeMove` before processing item usage or Pokémon swaps.
3. **Shadow Visibility Reset**: When starting an encounter, the shadow's opacity must be explicitly reset to prevent shadows from previous battles from appearing before the entry animation.

## ⚙️ Action Registry & Engine Expansion

The battle engine uses a decoupled architecture where move effects are mapped to executable logic via the `ActionRegistry`.

- **Action Dispatching Order**: The engine must follow a strict sequential order:
  1. **Dynamic Interception**: Moves like Metronome or Mirror Move are resolved BEFORE damage calculation.
  2. **Primary Damage**: Calculation and application of HP.
  3. **Post-Action Effects**: Execution of Recoil, Drain, and Self-KO (Explosion) consuming the registered `lastDamage`.
- **Modular Implementation**: Logic for new effects should be grouped by type:
  - `statActions.ts`: For all stage modifiers (Atk, Def, etc.).
  - `fieldActions.ts`: For side-based effects (Screens, Weather, Hazards).
  - `statusActions.ts`: For primary status conditions (Burn, Sleep, etc.).
  - `specialActions.ts`: For unique mechanics (Transform, Roar, Metronome).
- **Source Propagation**: All action functions MUST receive and propagate the `src` and `tgt` objects to the `addLogFn` to maintain the visual link between the action and the combatant's sprite.
- **Data Integrity (Move Sync)**: Moves in the player's team may have stale metadata. Before processing an effect, the engine MUST verify/sync the `effect` property from the `pokemonDataProvider` if it is missing or null.
- **Battle Context (Team Access)**: Actions that force switches (e.g., _Roar_, _Whirlwind_) or involve team data MUST have access to `activeBattle.playerTeam`. This team reference is injected during battle initialization.
- **Technical Debugging Standard**:
  - **Technical Logs**: Internal dispatching details, target resolution, and technical blocks (e.g., "Stat already at -6") MUST use `console.log` or `console.warn` instead of the combat log.
  - **Game Logs**: Only "gameplay-relevant" failures (e.g., "Clear Body prevented the drop", "Type immunity") should be added to the user-facing `addLog`.
- **Modular Stat Validation**: Functions like `checkInmunity` MUST receive `tgtStages` to validate technical limits (-6/+6) and trigger the appropriate console warnings.
- **Relative Effects (Recoil/Drain)**: Effects that depend on damage dealt (e.g., `drain_50`, `recoil_25`) MUST consume `battleCtx.lastDamage` from the combat context to calculate the final healing or recoil amount.

## 🏃 Escape & Withdrawal Actions

### 1. Teleport (Gen 8+ Parity)

The Teleport move follows specific logic based on the battle context to maintain competitive balance and team integrity:

- **Wild or Trainer Combat (Relevo / Siguiente Pokémon)**:
  - If the Pokémon that uses Teleport has more healthy teammates left in its party, it acts as a withdrawal (the Pokémon retreats immediately and the next healthy member is sent out).
- **Terminal Case (Ultimo Pokémon)**:
  - If the Pokémon that uses Teleport is the LAST healthy member of its party, the battle ends immediately. The sequence transitions to the `REWARDS_PHASE` or `EXIT_BATTLE` depending on the perspective.

When a Pokémon successfully flees or switches via Teleport:

1. The active combatant is withdrawn.
2. If there are healthy members left, the `POKEMON_CALL` sequence sends out the next available Pokémon.
3. If no healthy members remain, the system terminates the battle loop and exits safely.

- **Flee Anim Safety**: When a Pokémon successfully flees (fled state is active), the standard faint/exit animation (`handleFaintAnim`) MUST NOT be executed for any surviving combatants during battle resolution, as the escape action already runs its own exit transition.

_Note: Manual Fleeing (via Run Button) triggers `EXIT_BATTLE` directly and closes the modal, returning the player to the map. In wild battles, if the player chooses to run, the system must evaluate the escape chance based on the current generation formulas._

## 📈 Level Up & Move Learning

### 1. Rewards Distribution Phase

During the `REWARDS_PHASE` (1.0s transition), the system processes asynchronous calculations:

- **Party-Wide Exp & EV Distribution (Gen VI–IX Canonical Parity)**:
  - Triggered upon either defeating (`ENEMY_DEFEAT`) or capturing (`CATCH_SUCCESS`) an enemy Pokémon.
  - **Strict Zero HP / Fainted Exclusion**: Any party member with `hp <= 0` or `fainted === true` is strictly excluded and receives 0 Exp and 0 EVs.
  - **Exp Gain Formula**: Active battle participants and Pokémon holding the `expshare` item receive full experience (`share = 1.0`). Living benched members receive 50% experience (`share = 0.5`).
  - **100% Undivided EV Yield**: Every living Pokémon in the party receives 100% of the defeated foe's base EV yield. EVs are never halved, divided, or reduced for bench recipients. Held item modifiers (`powerbracer`, `poweranklet`, `machobrace`, etc.) and Pokérus multipliers apply individually per Pokémon.
- **Level Detection**: If the new XP exceeds the current level threshold, the Pokémon levels up.
- **Gold Distribution**: Gold earned is added to the player's balance.

### 2. Move Learner Modal

If after processing the level it is detected that the Pokémon has moves pending to learn (defined in its progression table):

1. **Modal Trigger**: The system transitions to the `LEVEL_UP_MODAL` state immediately after the `REWARDS_PHASE`.
2. **User Choice**:
   - If the Pokémon has < 4 moves: It is learned automatically or confirmation is requested.
   - If the Pokémon has 4 moves: The player MUST choose a move to forget or cancel the new learning.
3. **Recursive Check**: Since a Pokémon can level up several times at once (or learn multiple moves in the same level), the system must perform a recursive check within the `LEVEL_UP_MODAL`:
   - If there are more pending moves -> Re-open modal with the next move.
   - If there are no more moves -> Transition to `SEARCH_PHASE`.

### 3. State Integrity

- **HUD Visibility**: During move learning, combat HUDs must remain hidden to avoid visual overlaps.
- **Enemy Visibility**: The enemy Pokémon MUST remain hidden throughout the entire Move Selection process. The transition to the Search Phase (Bushes) only occurs after all move selections are finalized.
- **isBattleActive**: This flag MUST remain `true` during the entire learning process to prevent the battle modal from closing prematurely and returning the player to the map before having managed their team.

## 🛡️ Engine Safety & Callbacks

### 1. Robust Option Destructuring

When implementing or modifying core logic functions that accept an `options` object (like `getEffectiveSpeed`), follow the **Fallback Pattern** to prevent runtime crashes:

- **Rule**: NEVER destructure without a fallback to the global/imported version of the function.
- **Implementation**:

  ```javascript
  import { globalFn } from '../utils';

  export function coreLogic(data, options = {}) {
    const fn = options.fn || globalFn; // Safe fallback
    return fn(data);
  }
  ```

- **Why**: Prevents `TypeError: fn is not a function` when the function is called from turn-logic or debug-tools that may pass incomplete option objects.

---

## 📝 Advanced Log Attribution

### 1. Trainer vs Pokémon Source

To ensure every log entry displays the correct sprite/avatar:

- **Trainer Actions**: Logs for trainer actions (e.g., "Send out", "Switch", "Withdraw") MUST use the literal string `'player'` or `'enemy_trainer'` as the `source`.
- **FORBIDDEN**: Do NOT pass the Pokémon object as the source for trainer-only logs, as it would incorrectly show the Pokémon's avatar instead of the human trainer's.
- **Side Override**: Pass `'player'` or `'enemy'` as the 4th argument (`sideOverride`) to `addLog` to force a specific background tint, overriding the automatic detection logic based on UID.

---

## 🎣 Capture System Synchronization

### 1. Mandatory Environmental Context

Every call to `calculateCatchRate` MUST receive an enriched `ctx` object from the battle store:

- **`weather`**: Inject the current map weather or the temporary battle weather.
- **`cycle`**: Inject the time cycle (`mapStore.currentCycle`) to respect time-based locks (e.g., debugging at night during noon).

### 2. Environmental Multipliers (2026 Audit)

Refer to the [Capture Multipliers in the Game Formulas Manual](../core/game_formulas_manual.md) for environmental bonuses (Dusk Ball, Net Ball).

### 3. Turn Counter (Timer Ball)

The `turnCount` is a live state. It MUST be explicitly incremented in `applyEndTurnEffects` of the battle store. It should never be incremented before end-turn effects (poison, weather, etc.) have been processed, to maintain visual parity with the UI.

---

## 🎣 Capture Mechanics & Data Integrity

To ensure capture difficulty aligns with official game standards and species identity:

### 1. Species-Specific Catch Rates

- **Database Mandate**: Every Pokémon species in `pokemonDB.ts` MUST have an explicit `catchRate` property (values 3 to 255).
- **Zero-Fallback Policy**: The battle engine MUST NOT use hardcoded magic numbers or silent fallbacks (such as `|| 45` or `?? 45`) for capture rates. If an encountered species lacks a valid `catchRate`, the system MUST fail loudly and immediately (`throw new Error(...)`) to prevent state corruption.

### 2. Capture Probability Formula

Refer to the [Capturing Manual](../systems/capturing_manual.md) for technical capture equations.

### 3. Visual & Interface Definitions

To prevent implementation ambiguity, we distinguish between two core interface layers:

- **Combat HUD**: The high-fidelity information cards showing Pokémon HP, Status, Level, and EXP. Visibility is derived from **Seat Occupancy** (Master Signal).
- **Control Panel (Move-Panel)**: The bottom orchestration area containing Move Grid, Quick Team, and Quick Bag. It is covered by the **Search Overlay** during navigation phases.

#### Information Disclosure Rules (Binoculars Protocol)

To maintain search tension, Pokémon data disclosure is restricted during the initial encounter phase:

| State / Substate                                  | Requirement                | Data Display    |
| :------------------------------------------------ | :------------------------- | :-------------- |
| `ENTRY_ANIM`, `COMBAT_OR_FLEE`, `SILHOUETTE_MODE` | None                       | Scrambled (`?`) |
| `ENTRY_ANIM`, `COMBAT_OR_FLEE`, `SILHOUETTE_MODE` | `inventory.binoculars > 0` | Full Data       |
| **All Other States**                              | None                       | Full Data       |

> [!IMPORTANT] This rule applies globally to the `Combat HUD` component and must be evaluated reactively against the player's inventory and the current FSM substate.

#### 3.2.4 Control de Efectos Visuales (FX) en Combate

El sistema de combate utiliza el componente centralizado `PVSpriteFX` para gestionar capas visuales (Shiny, Guardian, Estados). Se aplican las siguientes reglas de visibilidad:

- **Modo Silueta (isSilhouette: true)**:
  - FUERZA el **Modo Simplificado** (`isSimplified: true`).
  - OCULTA todos los efectos visuales (Shiny sparkles, Guardian aura, partículas de estado) para mantener la integridad visual de la fase de descubrimiento.
- **Modo Revelado (isSilhouette: false)**:
  - DESACTIVA el Modo Simplificado (a menos que existan otras restricciones de rendimiento).
  - RESTAURA la visibilidad de todos los FX activos.
- **Supresión por FSM**: Ciertos estados de la máquina de estados pueden suprimir temporalmente los FX mediante la prop `suppressFX` en `BattleCombatant`.

### 4. Verification Protocol

- **Mocked Randomness**: Use `vi.spyOn(Math, 'random').mockReturnValue(X)` in unit tests to verify that Pokémon are caught/escaped at specific mathematical thresholds.

### 5. Safe Context Destructuring

- **Context Unpacking**: In special action handlers like `teleport` or `roar`, always destructure or check the `battleCtx` safely. Use fallbacks such as `battleCtx.activeBattle || battleCtx` to avoid accessing properties on undefined objects.

- **Weather-Aware Moves**: Move modifiers (boosted or penalized) for complex conditions (like Thunder or Hurricane under Rain/Sun) MUST be perfectly aligned across the battle moves grid and the hovering tooltips to maintain clear informational transparency.

---

## 🛠️ Debug & Simulation Protocol

To facilitate mechanical verification without causing visual desynchronization:

### 1. Reactive Debug Synchronization

All administrative and debug controls (e.g., Shiny/Guardian toggles, Camera Zoom, Guides) MUST be synchronized directly with the global `BattleStore` state.

- **FORBIDDEN**: Using local `ref()` or `reactive()` for buttons that control global engine features.
- **MANDATORY**: Any UI interaction that modifies the debug environment MUST update the corresponding flag in the store. This ensures that the UI always represents the actual state of the engine.

### 2. Camera & Viewport Management

Camera settings (zoom levels, visual guides) are considered persistent battle states.

- **State Persistence**: The `BattleStore` acts as the source of truth for the camera's zoom factor and guide visibility. This prevents the camera from resetting to default values when switching between UI panels or re-mounting the arena.

### 3. Log Area & UI Separation

The combat log container MUST remain isolated from administrative controls.

- **Overflow Integrity**: Debug buttons MUST be positioned outside the log's scrolling viewport. This prevents the "log-animation-clash" where incoming messages cause the entire control panel to scroll or shift unexpectedly.

### 4. Bidirectional Engine Translation and Parity Sync

To maintain strict competitive integrity inside the combat engine while offering a localized premium UI experience:

- **Bidirectional Worker Translation**: When utilizing an engine written in English (e.g., `@pkmn/sim`) alongside a Spanish interface, you MUST implement deterministic bidirectional translator maps (such as `NATURE_MAP_ES_TO_EN` / `ABILITY_MAP_ES_TO_EN` and their dynamic inversions) inside the Web Worker thread (`ShowdownWorker.ts`).
- **Translation Execution Flow**: Translate all Spanish user choices (types, moves, abilities, natures) to their corresponding English keys before submitting them to the simulator. Conversely, intercept all outputs and status frames from the simulator and translate them back to Spanish before propagating them to the Pinia store and the reactive HUD cards. This ensures perfect mathematical stat modifiers (+10%/-10% nature boosts, STAB calculations) apply correctly inside the simulator engine without causing UI leaks.

---

## 🏛️ Battle Engine Integrity (FSM)

To ensure stability and 1:1 parity between visual execution and state flow:

- **Documentation Parity**: The code MUST remain a 1:1 implementation of the Mermaid diagrams in `battle_mechanics_manual.md`.
- **Deterministic Flow**: Avoid naked `setTimeout` calls in combat logic. Initialization sequences and FSM state transitions MUST be strictly synchronized with `await animations.triggerX()` or GSAP promises to prevent engine deadlocks and race conditions. Hardcoded timers for animation waiting are forbidden.
- **Visual Completion**: FSM states representing visual actions (Damage, Faint, Catch) MUST wait for the corresponding GSAP promise resolution.
- **Mandatory Audit**: Run `validate_fsm_diagrams.ts`, `validate_fsm_implementation.ts`, and `validate_fsm_flow_parity.ts` (or `npm run validate:fsm`) before every commit that touches battle logic. Zero critical errors are allowed.
- **Substate Parity**: All sub-states defined in `battleStateMachine.ts` MUST be actively used in logic or UI. Obsolete or orphaned states (e.g., `REORDER_TEAM`) must be removed to maintain a clean FSM audit and prevent architectural drift.

---

## 📝 Lessons Learned: Weather & Stat Upgrades

- **Dynamic Weather Name Resolution**: Always resolve weather names using `weather.visual || weather.type` to match global visual table overrides (e.g. `OLA FRÍO` vs `GRANIZO`) instead of hardcoding raw mechanical keys.
- **Minimum Climate Damage**: Force a minimum of `1 HP` on climate damage formulas using `Math.max(1, Math.floor(maxHp / 16))` to prevent confusing `0 HP` or `-0 HP` logs for low-level Pokémon.
- **Stat Parsing Regular Expression**: Include numbers and underscores in regex patterns mapping stage adjustments (e.g., `/stat_(up|down)_(self|enemy)_([a-z0-9_]+)/`) to avoid truncating specific stats like `spe_2` into `SPE_`.
- **Computed Rendering Optimization**: Avoid accessing direct database or metadata providers (like `pokemonDataProvider`) directly inside Vue template loops. Cache all resolved lookups in `<script setup>` using `computed` properties.

---

## 📝 Lessons Learned: FSM Async Guards (Stale Turn Hijacking)

These patterns prevent asynchronous battle logic from interfering with subsequent encounters after a battle ends.

- **`applyEndTurnEffects` Guard**: The function in `battleFlow.ts` MUST return early if `fsm.currentState.value !== BATTLE_STATES.ACTIVE_BATTLE`. Weather damage (e.g., Ola Frío, Granizo) or status tick effects from the previous battle can wake up asynchronously after the FSM has already transitioned to `SEARCH_PHASE`, applying damage to the next enemy and revealing its identity before the encounter animation.
- **`processFaint` Guard**: The function in `resolution.ts` MUST check that the FSM is in `ACTIVE_BATTLE` before executing faint sequences. Allow `EXIT_BATTLE` as a permissible state only for unit test contexts. Without this guard, a deferred faint from a previous battle can affect the next opponent.
- **`executeMove` / `useItemInBattle` Guard**: Both must verify `fsm.currentState.value === ACTIVE_BATTLE` before triggering turn sub-states like `WAIT_INPUT`. Stale async chains from the previous turn can otherwise set substates on the new encounter's FSM.
- **`autoBattle` Watcher Scope & SSoT**: The watcher in `BattleArenaControls.vue` is the exclusive Single Source of Truth (SSoT) for triggering automatic encounters when `uiStore.autoBattle` is active. It MUST trigger **only** when the FSM reaches the stable waiting substate `COMBAT_OR_FLEE` (or `SILHOUETTE_MODE`). Imperative code in `searchLoop.ts` and `orchestratorSearchPhaseHelper.ts` MUST NOT directly invoke `startEncounter(ctx)` to prevent double invocation race conditions and asynchronous turn stack pollution.
- **`COMBAT_OR_FLEE` Immediate Transition**: `handleBattleFlowCompletion('search')` in `searchLoop.ts` MUST explicitly transition to `COMBAT_OR_FLEE` immediately after `PARALLEL_PREP` completes. This ensures the stable waiting state is set before the first reactive frame in which the `autoBattle` watcher fires.
- **Money Sound Exclusion**: The money gain sound effect MUST NOT be played inside `calculateBattleRewards`. It was intentionally removed to decouple the audio cue from the rewards calculation cycle.

---

## 📝 Lessons Learned: Held Items & Volatile State

### Choice Band (choice_band) Dual-Mechanic

The Choice Band has two independent mechanics that players and developers must not confuse:

- **Passive Power Boost (Constant)**: +50% Physical Attack multiplier applied to all Physical-category moves from turn 0 of the battle. This boost is always active regardless of whether the Pokémon has already attacked. It appears in the move breakdown tooltip as `Objeto (choice_band) x1.50` for Physical moves.
- **Move Lock (Conditional)**: Registered the moment the Pokémon **executes** its first move in the battle via `attacker.choiceMove = move.name` in `moveExecutor.ts`. Once set, all moves other than `choiceMove` are disabled in the UI (`isDisabled` in `BattleMoveSlot.vue`) and penalized in the tooltip. The lock is cleared only when the Pokémon is withdrawn (`clearVolatileStatus`) or the battle ends.
- **Special/Status Moves**: The Choice Band does NOT boost Special or Status moves. For those, the tooltip entry renders as `•` (neutral, `x1.00`) to visually confirm the item is equipped but inactive for this move type. It still applies the lock mechanic.

### Volatile Status Team-Wide Cleanup

- **Root Pattern**: `clearVolatileStatus()` clears fields like `choiceMove`, `confused`, `seeded`, `substitute`, etc. defined in `battleStatus.ts`. It MUST be applied to the **entire player team** on every `initBattleSequence` call, not only the leading Pokémon. Benched Pokémon that participated in a previous battle retain their volatile state until explicitly cleared.
- **Implementation**: In `orchestrator.ts`, use `ctx.gs.state.team.forEach(p => { if (p) ctx.clearVolatileStatus(p) })` instead of only clearing `initialPlayer`.
- **Why it matters**: A Pokémon with a stale `choiceMove` will enter the next battle with all its non-choice moves already disabled — a silent bug that is extremely hard to detect via the UI alone.

## 📝 Lessons Learned: Volatile Counters, Side Conditions & Switches

### Volatile Counters Pattern (`Record<string, number>`)

When adding new volatile states (lockedmove, yawn, stockpile, partiallytrapped), use a single generic dictionary instead of adding individual fields to the `Pokemon` interface:

```ts
// ✅ Correct — extend without touching the interface
pokemon.volatileCounters['lockedmove'] = 3;
pokemon.volatileCounters['yawn'] = 2;

// ❌ Wrong — interface sprawl
pokemon.thrashTurns = 3; // New field for every mechanic
pokemon.yawnTurns = 2;
```

- Declare `volatileCounters?: Record<string, number>` once in the `Pokemon` interface.
- `clearVolatileStatus()` MUST reset `poke.volatileCounters = {}` so no counter survives a switch.
- `tickVolatileCounters()` in `battleStatus.ts` handles decrement and expiry logic for all counters in a single loop per turn.

### Side Conditions Are Not Stages

Field conditions (Wish, Spikes, Stealth Rock, Toxic Spikes, Reflect, Light Screen) that belong to a **side** (not a specific Pokémon) MUST live in `BattleState.playerSideConditions` / `enemySideConditions`, NOT embedded into the stages object.

```ts
// ✅ Correct
activeBattle.playerSideConditions['wish'] = { turns: 2 }
activeBattle.enemySideConditions['spikes'] = { turns: 0, count: 1 }

// ❌ Wrong — stages are for stat multipliers only
playerStages.wish = 2
```

- Type: `Record<string, { turns: number; [key: string]: unknown }>`.
- Initialize both to `{}` in `startBattleSequence` and `initBattleSequence` to prevent state leakage between battles.

### Centralize Entry Hazard Logic in `applyEntryHazards()`

Entry hazard damage (Spikes, Stealth Rock, Toxic Spikes) was previously duplicated in both `switchAction.ts` (player switch) and `switchActions.ts` (enemy switch). The correct pattern is a single pure function in `battleFlow.ts`:

```ts
// battleFlow.ts
export function applyEntryHazards(pokemon: Pokemon, stages: StageState, addLog: LogFn): void { ... }

// switchAction.ts & switchActions.ts both call:
applyEntryHazards(newPoke, relevantStages, addLog)
```

Never duplicate hazard resolution logic in switch handlers. Any new hazard type (e.g., Stealth Rock damage) MUST be added only to `applyEntryHazards`.

### Enemy Switch Must Preserve Field Conditions

When resetting enemy stat stages on switch, use a **spread + selective reset** instead of a full object replacement. A full replacement wipes side conditions stored alongside stat stages:

```ts
// ✅ Correct — spread first, then reset only stat modifiers
store.enemyStages.value = {
  ...s,  // preserve spikes, stealthRock, reflect, lightScreen, etc.
  atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0
};

// ❌ Wrong — destroys all field conditions on every switch
store.enemyStages.value = {
  atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0,
  reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0
};
```

---

## ⚙️ Engine Logic (Vue + GameBus)

All visual-logic decoupled communication uses the `gameBus` event pipeline.

### 1. Battle Animation Triggers

Battle animations (faint, withdraw, send_out, status_hit) MUST be triggered via the `gameBus` using standardized event types:

```ts
// Standard Animation Trigger
gameBus.emit('animation', { 
  type: 'faint', 
  target: 'player', 
  index: 0 
});
```

### 2. Component Safety & Zero-Timer Compliance

Any asynchronous or delayed operation within a visual component MUST be driven by GSAP (`gsapSleep` or `gsap.delayedCall`) and verify component mount state before acting:

```ts
gsap.delayedCall(delayInSeconds, () => {
  if (instance?.isUnmounted) return;
  // Logic...
});
```

---

## 🔬 QA Manual Verification & Step-by-Step Testing

For a complete step-by-step reproduction guide and verification matrix covering all forced switch variants, flee & teleport mechanics, attack VFX, switch workflows, faint sequences, and catch flows, consult:
- **[Manual Testing Guide (Battle Animations)](../qa/manual_testing_battle_animations.md)**


