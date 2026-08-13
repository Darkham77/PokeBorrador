# Simulation Progress Handoff

Last updated: 2026-08-11
Status: IN_PROGRESS

## Latest Handoff — Held-Item Certification

The promotion of item fuzzer records to canonical terminal battle certificates
has RED/GREEN unit evidence (`certified_item_battle_cases.test.ts`, 1/1 PASS)
and strict type validation. The required fresh full fuzzer run is currently RED:
item rounds 34, 36, 38, 39, 43, 44, 46, and 47 reached the legacy artificial
`maxTurns = 150` cutoff without ending. Exact traces are retained in
`scratch/fuzzer_regeneration_20260811_held_items.err.log`.

This is a fuzzer-progress defect, not a timeout shortage. Do not increase a UI
timeout, omit the cases, or emit partial certificates. Remove the artificial
turn cutoff and change the direct legal scripted policy to a natural finishing
policy after the observed item objective. Then regenerate, validate the
canonical document, and migrate held-item Playwright to those immutable cases.

Update: the cutoff has been removed and `fuzzer_finishing_policy.test.ts` is
GREEN (1/1); after coverage, each direct scripted seat now selects its strongest
legal available move until the real Showdown battle ends. `validate:types` is
GREEN. The already-running pre-fix fuzzer was not interrupted; wait for it to
close before launching the fresh regeneration.

## Objective

Complete every simulation using official visible UI controls after the only allowed
exception: initialization of a current fuzzer-certified battle. Every Playwright
combat is a certified-choice replay. Synchronize tests through public typed events,
then finish with fresh full E2E, `npm run audit:full`, and `npm run build` evidence.
Do not weaken tests, the FSM, audit rules, or the five-second per-interaction limit.

## Non-Negotiable Rules

| Area | Current contract |
|---|---|
| UI | Tests click visible player or Debug-panel controls. No store, composable, debug-global, dispatched-DOM-event, or browser-side gameplay mutation. |
| Combat decision source | Every Playwright combat consumes the current fuzzer-certified seed, atomic `history`, derived `playerChoices` / `enemyChoices`, recorded game actions, and IPB flags through the shared runner. No manually constructed combat or real-AI browser decision stream is valid. |
| Battle injection | Only that current fuzzer-certified case may initialize its battle internally. Every later action is visible UI. |
| Synchronization | Arm a public typed source-event before the preceding UI action. No `waitForFunction`, store/FSM/DOM polling, sleeps, or turn counters. |
| NPCs | NPC encounters are combat-only; never expose or select flee. |
| Timing | Every UI interaction stays at `MAX_PER_ACTION_TIMEOUT_MS = 5000`. Whole-suite time may be justified separately. |
| Fuzzer | Direct deterministic legal objective heuristics are allowed only in certified generation. Certified history is immutable and is replayed by Playwright through UI. |
| Quality | For every source bug: capture the full failure, create a focused unit/Node regression, demonstrate RED then GREEN, then rerun the affected E2E scope. |

## Current Evidence

| Scope | Evidence | Result | Validity |
|---|---|---:|---|
| Fuzzer | `npm run sim:fuzzer` and `validate_certified_cases.ts` on 2026-08-11 | 684/684 moves, 28/28 abilities, 166/166 items; 61 terminal cases atomically flushed and validated. | Fresh, valid evidence. It includes immutable Potion, Antidote, and Revive `p1GameAction` entries and is now the only allowed source for those browser replays. |
| Debug Creator | `scratch/debug_creator_typed_ready_event_20260811.log` | 4/4 PASS, 31.6s | Current targeted proof. |
| Weather | `scratch/weather_base_wrapper_event_migration_20260811.log` | 2/2 PASS, 29.0s | Current targeted proof. |
| Capture | `scratch/capture_typed_events_full_20260811.log` | 4/4 PASS, 45.0s | Current targeted proof. |
| Ready-event contract | `tests/unit/battle/battle_events.spec.ts` | 2/2 PASS | Current targeted proof. |
| Ready-event dedupe | `tests/unit/battle/battle_ready_event_key.spec.ts` | 2/2 PASS | Current targeted proof. |
| Certified action type | RED then GREEN: `tests/node/battle/fuzzerCertifiedCaseIntegrity.test.ts` | 6/6 PASS | Invalid bag-action JSON is now rejected by the typed domain guard. |
| Type check | `npm run validate:types` | PASS | Last run after the certified bag-action type. |
| Certified medicine UI | `battle_healing_regression.simulation.ts` | 3/3 PASS | Fresh official-UI replays for Potion, Antidote (`tox`), and Revive. |
| Audit and build | Historical audit node stage and build were green before the current migration | NOT FINAL | Must rerun only after all E2E migration and full E2E pass. |

## Recent Fixes

| Date | Failure | Root cause | Regression evidence | Result |
|---|---|---|---|---|
| 2026-08-11 | Debug Creator worker startup stalled during SQLite migration | Login polled store readiness for five seconds while migration legitimately blocked creation of the debug API | `game-store-ready` public event; Debug Creator 4/4 | Fixed; UI login is unchanged. |
| 2026-08-11 | Weather cleanup left a flee confirmation modal | Test clicked visible flee but omitted visible confirmation | `debug_commands.spec.ts` 33/33; Weather 2/2 | Fixed with real confirmation control. |
| 2026-08-11 | Weather clear action rejected `null` | Map Debug action passed `null` into a strict weather ID guard | `debug_commands.spec.ts` 33/33 | Fixed at the source boundary. |
| 2026-08-11 | Ditto capture waited forever after Transformation | Readiness event was deduplicated across non-input FSM phases although the next real UI input was visible | E2E RED: `scratch/capture_typed_events_20260811.log`; unit `battle_ready_event_key.spec.ts` 2/2 GREEN; Capture 4/4 | Fixed without changing transitions, AI, or requests. |
| 2026-08-11 | Combat effects panel was unreachable from Debug navigation | The finite debug category list omitted the existing visible effects tab | E2E RED: `scratch/healing_status_ui_20260811.log`; unit `debug_panel_categories.spec.ts` 1/1 GREEN | Fixed with typed `DEBUG_PANEL_CATEGORIES`; no selector fallback. |
| 2026-08-11 | Debug panel remained beneath a newly started battle | Battle entry did not close transient UI layers before mounting the arena | E2E RED: `scratch/healing_status_panel_lifecycle_20260811.log`; type check GREEN | Fixed centrally; later battle modals remain allowed. |
| 2026-08-11 | Status-based healing had no legal target after a voluntary switch | The visible status action was overwritten by the Showdown worker on its next synchronization | E2E RED: `scratch/healing_status_team_sync_20260811.log`; node `battle_status_cheat.test.ts` 2/2 GREEN; E2E `scratch/healing_status_worker_parity_20260811.log` 1/1 GREEN | Fixed by a typed worker status-cheat message that returns requests and team state. |
| 2026-08-11 | A player medicine action silently damaged the enemy | `p1Skip` was translated to Showdown `default`, so the worker executed and hid an unrecorded player move | RED: `showdownEngineStrictness.test.ts` (`714 → 704`); GREEN: same file 7/7; `npm run validate:types` GREEN | Fixed with an explicit bag-medicine response path that uses the accepted P2 Showdown action and residual queue only. |
| 2026-08-11 | Certified JSON accepted an arbitrary bag action | The atomic-history validator ignored unknown game-action fields and had no canonical ItemId/slot guard | RED then GREEN: `fuzzerCertifiedCaseIntegrity.test.ts` 6/6; `npm run validate:types` GREEN | Fixed with `CertifiedBattleGameAction`: `bag-item` accepts only a canonical `ItemId` and team slot 1–6, and requires an empty P1 native choice plus an explicit P2 response. |
| 2026-08-11 | A certified medicine replay evaluated real enemy AI before reading its recorded choice | `runEnemyAction` performed AI switching, item evaluation, and move selection before overwriting the final string | RED then GREEN: `certifiedBagItemActionResolver.test.ts` 1/1; affected engine regressions 8/8; `npm run validate:types` GREEN | Fixed with a typed resolver that requires the exact visible item/target pair and makes the replay branch bypass all real-AI side effects. |
| 2026-08-11 | Antidote could not cure Showdown toxic poison | The item effect only matched `psn`, while Showdown emits the legal `tox` status | RED then GREEN: `antidoteToxicStatus.test.ts` 1/1; `npm run validate:types` GREEN | Fixed `clearStatus` with the explicit typed `poison` cure group (`psn` and `tox`), used only by Antidote. |
| 2026-08-11 | Medicine objective cases could not synchronize their post-item HP/status back into Showdown | The direct medicine generator set `uid` on the team set, but Showdown creates separate simulator Pokémon and had no UID mapping. | Reproduction log showed `uid:undefined` before and after both medicine sync attempts; `fuzzerMedicineCases.test.ts` and `npm run validate:types` are green after the mapping. | Fixed by assigning each certified team UID to its Showdown counterpart before the first turn; this is the same mapping used by the main fuzzer. |
| 2026-08-11 | Complete fuzzer aborted before its atomic case flush | Every `createShowdownBattle` reinstalled `Battle.prototype.spreadModify`; after enough factory calls, its nested fallback wrappers exhausted the stack. | RED: `showdownAdapterIdempotence.test.ts` (`Maximum call stack size exceeded` after 20,000 installations). GREEN: same test and `npm run validate:types`. | Fixed with a global-symbol idempotency marker, preserving exactly one wrapper across factories, workers, replayers, and hot reload. |
| 2026-08-11 | Certified Antidote replay could not open the target selector | The UI target validator accepted `psn` but rejected Showdown's legal `tox`, while the Antidote effect already cured both. | RED: `item_validation.spec.ts` 1 failure for `tox`; GREEN: 7/7 and `npm run validate:types`; certified medicine UI 3/3. | `canClearStatus` now owns the typed poison group (`psn` / `tox`) for validation and effect parity. |
| 2026-08-11 | Certified Antidote action was absent from the quick bag | Certified initialization used a fixed potion inventory rather than its immutable recorded bag actions. | RED: `certifiedBattleInventory.test.ts` could not load the missing projection; GREEN: 1/1 and certified medicine UI 3/3. | Initial injection derives a typed, minimal inventory from only recorded `bag-item` actions; later use remains visible UI. |
| 2026-08-11 | Held-item fuzzer runs were stored only as incomplete auxiliary records | The item runner retained real seed/history but discarded its terminal state and never invoked the canonical case validator. | RED: `certified_item_battle_cases.test.ts` failed because the promotion did not exist; GREEN: 1/1 and `npm run validate:types`. | The runner now requires organic termination, persists the actual final state, and promotes every item run through `certifyBattleCase`. |

## Public Event Contracts Added

| Event | Source completion boundary | Consumer |
|---|---|---|
| `battle-ready-for-input` | Battle store exposes a legal player input request | E2E latches before move, switch, item target, encounter start, or trainer start. |
| `battle-flow-completed` | Search loop has completed map cleanup | E2E latches before official battle exit or confirmed wild flee. |
| `game-store-ready` | Real game store becomes ready after login/load | E2E latches before official local-login click. |
| `battle-entering` | Battle store has closed the currently open UI stack before mounting a battle | Transient panels close without blocking later battle modals. |

## Current Design Decision

Playwright combat is exclusively a visible-UI replay of a current fuzzer-certified
case. The fuzzer's deterministic scripted heuristics generate legal decisions;
the browser reproduces the same seed, `history`, `playerChoices`,
`enemyChoices`, recorded game actions, and IPB flags through
`ShowdownBattleRunner`. Real AI
is not a browser-combat decision source. This contract was aligned on 2026-08-11
in `game-simulation`, `audit-simulations`, `project-standards`, their testing
references, and the E2E DOX contracts.

## Migration Inventory

| Simulation area | Status | Required work |
|---|---|---|
| Debug Creator | COMPLIANT | Keep as a regression target. |
| Weather | COMPLIANT | Keep as a regression target. |
| Capture | COMPLIANT | Keep as a regression target. |
| Shared battle wrapper | PARTIAL | Item, voluntary switch, and move actions now use event latches; audit all remaining helpers for private reads/polling. |
| Healing regression | COMPLIANT | Replaced manual HP, status, and revive battles with current terminal certified Potion, Antidote, and Revive replays; each uses the official quick bag and target selector. |
| Combat scenarios | REPLAY REQUIRED | No Playwright combat may use a manually constructed team, HP, encounter, or real-AI decision stream. Generate a certified fuzzer case first, then reproduce its choices via UI. |
| Held items | NONCOMPLIANT | Retain only certified initialization. Manual item scenarios must equip through Team Management and Inventory UI. |
| Heuristic AI | RE-AUDIT REQUIRED | Heuristics belong only to fuzzer generation. Browser combat must replay the generated certified decisions, never run the complete AI as an alternative source. |
| Search, breeding, missions, gyms, GTS, save | RE-AUDIT REQUIRED | Historical isolated passes exist but the source must be rescanned for prohibited polling/mutation and rerun after migration. |

## Static Compliance Inventory (2026-08-11)

The source audit is evidence of remaining work, not a reason to delete or
silence a simulator. Each listed flow must be migrated and rerun before the
full-suite acceptance claim.

| Scope | Current violation | Required migration |
|---|---|---|
| `base_simulation.ts` / `e2e_helpers.ts` | Browser store mutations and `waitForFunction` remain in shared helpers. | Replace with typed completion events and visible official navigation; preserve read-only assertions only. |
| `base_battle_simulation.ts` | Certified initialization is permitted, but fallback native auto-battle and direct browser helpers remain. | Consume atomic certified actions only; remove fallback decision paths. |
| `battle_manual_scenarios.simulation.ts` | Manual battle construction and state inspection. | Replace each combat with a current terminal certified case. |
| `heuristic_ai.simulation.ts` | Manual `startBattle`, real AI, polling, direct end-battle calls. | Move AI policy checks to Node diagnostics; replace any browser combat with certified UI replay. |
| `battle_held_items.simulation.ts` | Manual held-item battles plus auxiliary fuzzer records without canonical terminal history. | Promote objective held-item cases to the canonical certified battle document, then replay them through UI. |
| `search_loop_sequential.simulation.ts` | Debug mutation and polling. | Model the interaction through public events and visible controls; use a certified case whenever it enters combat. |
| `gts`, `breeding`, `missions`, `save` simulations | Direct store mutation and/or polling. | Build visible setup flows or narrowly-scoped approved non-combat fixtures, then synchronize only with public events/network responses. |

## Next Actions

1. Extend the fuzzer's typed certified-case domain with legal medicine-bag actions and objective-driven HP, status, and revive scenarios; keep the action distinct from native Showdown choices and certify its paired Showdown response without fabricating a `useitem:*` command.
2. Regenerate the fuzzer, then replace the healing-combat suite's manually constructed status, HP, and revive battles with those current certified cases and their exact choices.
3. Scan every combat `*.simulation.ts` for direct state mutation, `startBattle` outside certified setup, a real-AI decision source, `waitForFunction`, and other polling; remove invalid flows and retain read-only diagnostics only.
4. Add a focused RED/GREEN unit or Node regression for every discovered source defect, then rerun its certified Playwright replay.
5. Run every domain suite, then one persisted `npm run sim:e2e` full queue, `npm run audit:full`, and `npm run build`.

## Active Investigation — Medicine Replay Contract

Medicine-bag usage is a game-domain action, not a native Showdown choice, and
therefore cannot be represented honestly as an accepted `useitem:*` command.
The engine-side response bug is fixed and regression-tested. The atomic-history
domain now has `CertifiedBattleGameAction` / `bag-item`, validated against the
canonical typed item catalog and a 1–6 team slot. The remaining work is to
generate objective-driven terminal cases, replay that action through the shared
runner and visible bag UI, then replace the invalid manual healing suite.
6. Run `npm run audit:full`, `npm run validate:domain-types -- --errors-only --summary`, and `npm run build` without changing audit criteria.
7. Generate `simulation_report_<timestamp>.md` only when all acceptance evidence is fresh and green.

## Current Stop Point

The fresh fuzzer now atomically persists and validates 61 terminal cases,
including legal Potion, Antidote, and Revive objective actions. The migrated
medicine suite has passed all three terminal certified visible-UI replays. Next,
promote the existing held-item fuzzer objectives from the auxiliary document to
canonical terminal battle certificates, then migrate the remaining manual combat
simulations and audit every battle file for polling or non-certified decisions.

## Resolved Certified UI Replay Findings

| Finding | Resolution | Evidence |
|---|---|---|
| P2-only forced replacement | It is already consumed by the preceding recorded P1 action; there is no player action or additional event wait to fabricate. | `ShowdownBattleRunner` cursor regression: 4/4 PASS. |
| Dynamic `switch N` target | `battle-ready-for-input` now publishes the current typed `showdownSlot -> pokemonUid` projection. | RED then GREEN `battle_events.spec.ts`: 3/3 PASS. |
| Pointer hover destabilized move controls | The driver focuses the ID-selected official move button and presses `Enter`. | `TEST_BATCH=1` certified replay PASS. |

## Documentation Alignment — 2026-08-11

`project-standards` and its browser-testing references now explicitly define
the certified starting-state injection as the sole combat mutation exception.
It cannot perform a later interaction. Every later modal, menu, move, item,
target, switch, movement, confirmation, flee, and exit action uses the visible
official UI. Certified IPB healing remains allowed only as recorded parity
instrumentation, never as a UI substitute. This documents the same replay
contract already enforced by `game-simulation`.

## Certified Replay Progress — 2026-08-11

| Evidence | Result | Notes |
|---|---|---|
| RED `tests/unit/battle/battle_events.spec.ts` | Missing switch-slot projection was accepted | The valid readiness payload had no public way to resolve a dynamic Showdown `switch N`. |
| GREEN `tests/unit/battle/battle_events.spec.ts` | 3/3 PASS | `BattleReadyForInputDetail` now requires typed `playerSwitchSlots`; source projects them from the current mapped Showdown request. |
| `npm run validate:types` | PASS | Public projection is shared by the store and debug readiness boundary. |
| `TEST_BATCH=1` `battle_fsm_sync.simulation.ts` | PASS | Current case `case-45a0a2a53514` replayed via certified actions and official controls. Move controls use focus + `Enter` because hover tooltips make mouse clicks unstable; this is genuine keyboard activation, not a forced click. |

## Revive Certificate and UI Replay — PASS

| Evidence | Result |
|---|---|
| Fresh `npm run sim:fuzzer` | Persisted 61 terminal cases at 2026-08-11 15:02:10, including `case-40e5aed02206`. |
| `validate_certified_cases.ts` | PASS — 61 terminal cases with history-derived choice parity. |
| `TEST_CASE_ID=case-40e5aed02206` `battle_fsm_sync.simulation.ts` | PASS — no Playwright failure artifact. The exact certificate exercised legal faint, `switch 2`, visible bag target selection, Revive, and terminal replay. |

## Certified Medicine Replay — RED/GREEN

| Phase | Evidence | Result |
|---|---|---|
| RED | Playwright 3-way medicine replay | Antidote was absent from the fixed injected inventory. |
| GREEN | `certifiedBattleInventory.test.ts` | 1/1 PASS. Initialization now derives the minimal typed inventory from immutable bag actions. |
| RED | Playwright Antidote replay after inventory correction | The quick bag appeared but no target selector opened for Showdown `tox`. |
| GREEN | `item_validation.spec.ts` | 7/7 PASS. Antidote target validation uses the same typed poison group as its effect. |
| Final E2E | `battle_healing_regression.simulation.ts` | 3/3 PASS in parallel: Potion, Antidote, and Revive complete terminal certified replays through visible official controls. |
