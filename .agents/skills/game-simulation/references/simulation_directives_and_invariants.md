# Simulation Directives & Invariants

> **Scope & Authority**: This reference document governs the immutable behavioral laws, timeout limits, locator requirements, state synchronization, and determinism contracts for all Playwright E2E simulations across Poké Vicio.
>
> 🛑 **Parent Skill**: [game-simulation](../SKILL.md)

---

## 1. Strict Simulation Timeout Governance (10s Per-Action / Parameter-Configured Suite Budget)

### Per-Action Limit (`MAX_PER_ACTION_TIMEOUT_MS = 10000`)
- Every UI action and turn reaction once control is granted to the player or simulated AI (`isReady = true`, `WAIT_INPUT`, `SWITCH_MENU`, `over`) is strictly capped at **10 seconds** (the 10s Fail-Fast Rule).
- This timeout exclusively governs the **input response window** for selecting and submitting a choice through official visible UI controls.

### Engine Processing vs. Input Response Distinction
- The 10-second per-action limit **MUST NEVER** abort or truncate the battle engine while it is actively and legitimately processing multi-action turn animations, status effects, ability triggers, or log queues (`isProcessing.value || isIntroAnimating.value`).
- While the engine is actively executing a turn, the inactivity watchdog (`waitForBattleReady`) automatically resets its timer upon any observable activity (`battle-log-added`, GSAP tween execution, HP mutation, FSM substate progression).
- The timeout triggers if and only if the engine becomes completely deadlocked or inactive without granting control to the player/AI.

### Full Battle Log Preservation Mandate
- Live battle logs (`battleLogs`) in `battleLogHelper.ts` **MUST NEVER** be artificially truncated or capped to arbitrary small numbers (such as 30 entries).
- Full combat history must be preserved throughout the battle so players can freely scroll and review prior turns. `clearLogs()` cleanses memory upon battle completion.

### Suite Total Budget (`getSuiteTimeoutForBatch(turnCount?)`)
- Test timeouts must be configured by parameter via `getSuiteTimeoutForBatch(turnCount)`:
  - When replaying a certified batch with a known turn count (`turnCount > 0`), the test timeout budget scales proportionally: `Math.max(MAX_SUITE_TOTAL_TIMEOUT_MS, turnCount * MAX_PER_ACTION_TIMEOUT_MS)`.
  - When a simulation does NOT have pre-generated fuzzer turns to replay (e.g. GTS, gym progression, daycare lifecycle, UI features), it strictly defaults to `MAX_SUITE_TOTAL_TIMEOUT_MS = 180000` (3 minutes statically).
  - Magic numbers or runtime multiplier guessing during test execution are strictly prohibited.

### Invariant Axiom — A Timeout is Never a Time Shortage
- If an action or locator wait reaches 10s (`MAX_PER_ACTION_TIMEOUT_MS`), it is **100% GUARANTEED** to be an underlying structural bug, uninitialized store state, unrendered component, or unfulfilled reactive condition — **NEVER** a time shortage.
- EVERYTHING MUST ALWAYS BE EXCLUSIVELY DRIVEN BY TYPED PUBLIC EVENTS.
- Agents **MUST ALWAYS** find and fix the true root cause in state/reactivity/code, keeping all action timeouts strictly at 10s. Inflating timeouts (e.g. to 20s or 35s) or adding arbitrary sleeps to "wait for the UI" is strictly prohibited.

---

## 2. Event-Driven Architecture & Simulation as a Passive Joystick

### Passive Joystick Law
- The game FSM is the **SOLE authority** for execution flow and input readiness.
- A simulation test script is strictly a passive joystick: it **MUST ONLY** react to explicit FSM readiness states (`WAIT_INPUT`, `SWITCH_MENU`, `over`, `REWARDS_PHASE`, `SEARCH_PHASE`) and public typed application events (`battle-ready-for-input`, `battle-forced-switch-required`).
- Tests must NEVER mutate gameplay via debug methods, DOM dispatchers, or store actions.

### 100% ID-Based & UID-Based Element Locators
- Every UI interaction after test setup MUST locate elements strictly and exclusively by explicit ID (`page.locator('#<id>')`, `page.locator('[id="<id>"]')`) or dedicated UID/item data attributes:
  - Bench / active Pokémon: `data-pokemon-uid="${uid}"`
  - Inventory / shop items: `data-item-id="${id}"`
- Locating elements by text content, string matching, generic CSS class lists (`has-text(...)`, `:has-text(...)`), or XPath is **STRICTLY FORBIDDEN**.
- All interactive UI components in Vue templates MUST have unique, descriptive `id` or `:id` attributes.

### Official Keyboard Interaction
- When hover tooltips or pointer affordances keep a focused official control moving or unstable, the simulator MUST focus that ID-selected control and activate it with `Enter`.
- Keyboard activation is a genuine player interaction; it is required instead of force-clicks (`{ force: true }`), coordinate clicks, or synthetic event dispatch.

### NPC Combat-Only Invariant
- Trainer, rival, gym, and every other NPC encounter is combat-only.
- Its official UI MUST NOT offer fleeing, and a simulation MUST select the combat control only.
- A visible or executable NPC flee path is a game defect to fix in `src/`, never a test escape hatch.

### Battle-Initialization Exception (Narrow & Explicit)
- The sole permitted state injection is the initialization of a battle that reproduces a current, fuzzer-certified case.
- It may establish only the initial combat scenario (teams, seed, environment) and **MUST NOT** perform any subsequent gameplay action or transition.
- The test must then drive the battle exclusively through official visible UI controls. Manual scenarios without a fuzzer-certified battle have no injection exception.

### Certified IPB Healing Exception
- The Infinite Punching Bag healing cheat remains permitted exactly as recorded by the certified fuzzer turn flags (`p1Heal` / `p2Heal`) and only during its prescribed coverage phase.
- It is a deterministic parity instrument, not a UI substitute; it does not authorize internal calls for clicks, menus, modal closure, movement, choices, switching, fleeing, confirmation, or battle exit.

### GSAP Animation & Event Coordination
- All UI readiness and interaction synchronization between application components and Playwright simulations MUST be 100% event-driven and coordinated directly with GSAP animation completions (`onComplete`).
- When UI views, dialogs, overlays, or starter selection cards mount and finish their GSAP intro animations or entrance timelines, they MUST dispatch a typed public event (e.g. `GAME_UI_EVENTS.STARTER_SELECT_READY`, `GAME_UI_EVENTS.STORE_READY`, `BATTLE_UI_EVENTS.BATTLE_READY_FOR_INPUT`).
- Simulators MUST arm the event listener BEFORE triggering navigation or action and await the event cleanly.

### Public-Event-Only Synchronization & Zero-Timer Sync
- Every simulator wait MUST be armed before the UI action and resolved by a public, typed application event with 100% zero-timer synchronization.
- `page.waitForFunction`, store/FSM property polling, DOM-state polling, `sleep`, `page.waitForTimeout`, turn counters, and low-level condition loops are strictly forbidden as synchronization mechanisms.
- A missing event is a source-code defect: add the typed event at the real transition boundary in `src/`, then consume it without mutating gameplay.
- It is **STRICTLY FORBIDDEN** to use retry-loop helpers (such as `clickResilient`) that attempt repeated clicks on UI elements while a turn or animation is in progress and the button is disabled.
- Events follow real transitions: tests must never dispatch, forge, or directly call an event to advance the game.

### Strict Boundary Handling (Fail Fast, No Swallowing)
- It is STRICTLY FORBIDDEN to use `.catch(() => true)` or silent catch blocks during `page.evaluate()` or state checks. All errors MUST fail loudly immediately to expose state desynchronizations at their source.

---

## 3. Universal GSAP 100x Acceleration & Zero-Timer Parity

- All application animations, transition pauses, and delays use `gsapSleep` (from `@/logic/utils/gsapHelpers`) or GSAP timelines.
- This enables Playwright and headless battle simulations to scale execution time instantly (`gsap.globalTimeline.timeScale(100)`) without artificial timeouts, while preserving silky 1x playback for real users.
- GSAP acceleration is enforced at application startup in `src/main.ts` and intercepted via `page.addInitScript` in `e2e_helpers.ts`.
- Hardcoded `sleep(...)` or `setTimeout(...)` calls are strictly forbidden across `src/` to ensure simulations complete in seconds without hitting the 10s per-action or suite timeouts.

---

## 4. Comprehensive Fuzzer History Metadata on Disk

The fuzzer recorder MUST write complete, unambiguous state and decision metadata directly into `history` entries in `fuzzer_certified_cases.json` (`CertifiedBattleHistoryEntry`).

### History Entry Schema
```typescript
interface CertifiedBattleHistoryEntry {
  battleTurn: number;
  p1Choice: string;
  p2Choice: string;
  p1ActiveUid?: string;
  p2ActiveUid?: string;
  p1MoveId?: string;
  p2MoveId?: string;
  p1LockedMoveId?: string;
  p2LockedMoveId?: string;
  p1Trapped?: boolean;
  p2Trapped?: boolean;
  p1Volatiles?: readonly string[];
  p2Volatiles?: readonly string[];
  p1StatStages?: Record<string, number>;
  p2StatStages?: Record<string, number>;
  p1Status?: string;
  p2Status?: string;
  p1Hp?: number;
  p2Hp?: number;
  weather?: string;
  terrain?: string;
  p1SideConditions?: readonly string[];
  p2SideConditions?: readonly string[];
  p1ForceSwitch?: boolean;
  p2ForceSwitch?: boolean;
  p1Heal?: boolean;
  p2Heal?: boolean;
  p1PreHeal?: boolean;
  p2PreHeal?: boolean;
}
```

### Doubtful & Edge-Case State Logging
- Whenever any combat transition, state, or choice is doubtful, complex, or constrained (e.g. single-slot recharge moves, Outrage/Thrash locked moves, trapped states, forced switches, multi-turn charging moves), the fuzzer MUST record the exact decision and context with rich detail directly into the history on disk.

### Strict Runtime Parity Verification & Loud Desync Abort
- Replayers and Playwright simulators MUST consume these explicit history fields to verify active UIDs, enabled move slots, and locked states.
- If runtime game state diverges from the certified history on disk, execution MUST fail loudly and immediately with an explicit `[E2E-DESYNC]` error detailing the mismatch. Guessing choices, picking default moves, or using silent fallbacks is strictly prohibited.

---

## 5. Showdown Request as SSoT for Available & Locked Moves

- During battle, the active player's legal moves MUST be derived strictly and exclusively from Showdown's `|request|` payload (`side.pokemon[0].moves`).
- When a continuous locked move is executing (e.g. Outrage / Enfado, Thrash / Golpe, Petal Dance / Danza Pétalo), Showdown restricts the request to only the locked move (or disables all other move slots).
- `battleStore.availableMoves` MUST prioritize and match the active Showdown request. Deriving available moves from the static base Pokemon moveset causes the UI to offer illegal moves, leading to infinite decision loops, turn deadlock, or engine desync.

### Forced Recharge State Simulation Replay
- When replaying certified battles containing moves with forced recharge turns (e.g. *Hyper Beam*, *Giga Impact*, *Rock Wrecker* causing `|-mustrecharge|`), the active Pokémon is marked `trapped: true` by Showdown and voluntary switching is illegal.
- Battle replayers and test runners must inspect `isTrappedOrRecharging` (`isRecharging` / `active[0].moves[0].id === 'recharge'`) before attempting voluntary switches; if trapped/recharging, the replayer MUST execute `selectMove(0)` (the forced recharge action) to ensure deterministic battle progression.

### Showdown Locked Move Single-Slot Parity
- Multi-turn moves (*Shadow Force, Solar Beam, Fly, Dig, Recharge*) lock the active Pokémon and cause Showdown to return a single-move array (`moves.length === 1`).
- All choice builders and simulation helpers MUST normalize input choices to `move 1` whenever the legal move count is 1, and fall back to the first available move with valid PP if an out-of-range slot is requested.

---

## 6. Transient State Reset in Search Loop & Wild Encounters

- When entering or resetting the search loop / wild encounter flow (`enterSearchPhase`, `startWildBattle`), all transient combat and field flags (`cannotEscape`, `isProcessing`, `weather`, `terrain`, `introPending`, `turnActionPending`) MUST be explicitly reset in the store.
- Stale residual state from prior battles or map transitions must NEVER leak into new encounters.

---

## 7. Universal Rule of Fleeing (`uiConfig.allowFlee`)

- Fleeing is strictly permitted against wild Pokémon (`isWild === true` -> `uiConfig.allowFlee = true`).
- Fleeing is strictly prohibited against any NPC, Trainer, Gym Leader, or PvP opponent (`uiConfig.allowFlee = false`).
- The battle action UI (`BattleArenaControls`, `BattleActionButtons`) MUST bind button disabled/visible state exclusively to `uiConfig.allowFlee`.
- Checking low-level `cannotEscape` directly in templates or duplicating flee rules across components is strictly forbidden and audited by `validate_battle_ui_branching.ts`.

---

## 8. Absolute Pokémon Legality & Inviolable PP Conservation Mandate

### Pokémon Legality Mandate
- Every Pokémon generated or evaluated in fuzzers, battle runners, replayers, and E2E simulations MUST be 100% legal according to Pokémon Showdown canonical Gen 9 rules and the Poké Vicio Pokédex database.
- Generating synthetic or illegal Pokémon (e.g. assigning non-native abilities like *Illuminate* or *Rough Skin* to Mew, assigning non-learnable moves, or assigning invalid genders) is **STRICTLY FORBIDDEN**.
- All generated species must strictly use natural Showdown Dex abilities, biological genders matching species ratio rules, and valid learnsets across all fuzzers and simulators.
- When testing an ability, move, or mechanic, the generator MUST dynamically select a canonical species from the Showdown Dex that naturally possesses that ability or move.
- All generated teams MUST pass `PokemonLegalityValidator.assertTeamLegality` before generation and simulation execution.

### Inviolable PP Conservation and Replay Determinism Axiom
- Because the Node fuzzer certifies battles to completion deterministically, a Pokémon in a fuzzer or E2E browser simulation can **NEVER** run out of PP or select an exhausted move unexpectedly unless desynchronized.
- If a Pokémon in the fuzzer or browser simulation reaches a state with 0 PP or selects a move that is `disabled: true`, it is proof positive that a turn-count/cursor desynchronization occurred or that certified cheats/actions were misapplied.
- It is **STRICTLY FORBIDDEN** to introduce runtime fallbacks that automatically pick another legal move or patch over the desynchronization. The engine MUST fail loudly and immediately (`throw new Error(...)`) with full context to diagnose and fix the root cause.

---

## 9. Strict Visual Visibility Assertion Mandate (`.toBeVisible()`)

- In Playwright simulations verifying visual effects, weather layers, animations, and modal overlays, tests MUST NEVER rely on `.toBeAttached()`.
- An element can exist in the DOM while being completely invisible due to CSS (`display: none`, `.hidden`, `visibility: hidden`, `opacity: 0`).
- Simulators MUST assert `.toBeVisible()` on the specific visual container (e.g. `expect(page.locator('.weather-overlay')).toBeVisible()`) to prevent false-positive passes when visual layers are mistakenly hidden.

---

## 10. Pre-Reload Explicit Remote Save Mandate

- In persistence simulation tests validating state rehydration across page reloads under dual database mode (`driver=dual`), calling code MUST invoke an explicit remote save:
  ```typescript
  await gameStore.save(false, true, true);
  ```
- Calling code MUST await its full resolution before calling `page.reload()`.
- This ensures that remote PostgreSQL synchronization is immediately executed rather than deferred by the 60-second background save throttle.

---

## 11. Simulation Event Isolation & Opt-In Contract (`enableEvents: false`)

- All E2E Playwright simulations inheriting from `BaseBattleSimulation` or `BaseSimulation` MUST default to `enableEvents: false` in `BaseSimulationOptions` (automatically setting `eventStore.simEventsEnabled = false`).
- This ensures standard wild capture, gym, trainer, and dungeon simulation suites are never interrupted by unexpected event auto-enrollment modals (`EventAutoEnrollModal.vue`).
- Simulations specifically testing event features, competition records, or auto-enrollment flows MUST explicitly opt in by passing `{ enableEvents: true }` in their wrapper configuration.

---

## 12. Battle Modal Exclusivity

- Before opening the battle arena/modal, the battle-entry flow MUST close every currently open modal that is not part of the battle flow.
- The close must complete before the arena opens, leaving the battle as the only active modal layer.
- This releases obsolete controls, prevents stale overlays from intercepting pointer input, and keeps all player and simulator interactions on the visible official UI.
