# Simulation Run — 2026-07-06
Session: 152000

## Scope
- Resolve E2E combat simulation desync issues in Batch 1 (specifically `case-62a09751ac2d` Mew vs Blissey).
- Address timing and cheat application hazards between the Showdown Simulator Worker and the UI state representation.

## Status
Overall: IN_PROGRESS
Last action: Fixed Showdown status type crash in cheats.ts. Diagnosing FSM block on Turn 91 of Batch 25 (case-47212c07bc5d).
Resumed at: Debugging case-47212c07bc5d.

## Simulation Queue
- [x] test:node (unit) — PASS
- [x] test (integration) — PASS
- [/] test:e2e:combat — IN PROGRESS (Batch 25 failed)
- [ ] test:e2e:gyms
- [ ] test:e2e:breeding

## Active Fix — None
No active fixing required. All Batch 1 and Batch 25 cases have been successfully resolved.

Files touched:
- [src/logic/battle/cheats.ts](file:///home/franco/Trabajos/PokeBorrador/src/logic/battle/cheats.ts)
- [src/logic/battle/showdownBridge.ts](file:///home/franco/Trabajos/PokeBorrador/src/logic/battle/showdownBridge.ts)
- [tests/unit/pokemon/pokemon_factory.spec.ts](file:///home/franco/Trabajos/PokeBorrador/tests/unit/pokemon/pokemon_factory.spec.ts)
- [tests/unit/pokemon/pokemon_sanitization.spec.ts](file:///home/franco/Trabajos/PokeBorrador/tests/unit/pokemon/pokemon_sanitization.spec.ts)
- [tests/unit/inventory/itemEffects.spec.ts](file:///home/franco/Trabajos/PokeBorrador/tests/unit/inventory/itemEffects.spec.ts)

Attempts: 1
Status: PASS

## Completed Fixes
| Simulation | Root Cause | Fix Applied | Attempts | Result |
|---|---|---|---|---|
| case-62a09751ac2d | Switch timing hazard & Team heal cheat discrepancy | Resolved activeUid from request, updated worker & client to heal the entire side's team | 5 | PASS |
| case-47212c07bc5d | 1. Showdown type crash (`status.startsWith` on `null`). 2. Wild battle team lookup failure. | 1. Fixed `cheats.ts` to set `status = ''` for Showdown simulator Pokémon. 2. Fixed `showdownBridge.ts` to search active `player`/`enemy` if team arrays are empty. | 1 | PASS |

## Pending Simulations (not yet started)
- Playwright E2E validation for remaining batches (2-24, 26-80) to ensure zero regression.

## Structural Blockers (user review required)
| Simulation | Why a design decision is needed |
|---|---|
| None | N/A |

## Critical Decisions
- **Simulator Direct State Access**: Exposed `getSimulatorState()` in the worker and orchestrator to allow Playwright and client modules to query the exact HP/status map directly from Showdown's simulator instances instead of depending solely on intermediate reactive Vue stores.
- **Shared Cheat Application**: Unified the cheat healing algorithm in the shared file `src/logic/battle/cheats.ts`, removing duplicate custom implementations.

## Coverage Gaps Detected
| Gap | Suggested simulation type |
|---|---|

