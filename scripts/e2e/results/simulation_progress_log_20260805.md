# Simulation Run — 2026-08-05
Session: 082436

## Scope
Simulación completa de todo el juego y fuzzer desde cero tras cambios en el código.

## Status
Overall: IN_PROGRESS
Last action: Fix de refresco de pestañas GTS en GlobalMarketModal.vue validado. Ejecutando pase sim:e2e final.
Resumed at: sim:e2e

## Simulation Queue
- [x] sim:fuzzer (fuzzer cases regeneration) — PASS
- [x] sim:e2e:gyms (gym progression) — PASS
- [x] sim:e2e:gts (GTS transactions) — PASS
- [x] sim:e2e:breeding (breeding lifecycle) — PASS
- [x] sim:e2e:missions (daycare missions) — PASS
- [x] sim:e2e:save (save shield restrictions) — PASS
- [x] sim:e2e:ai (heuristic AI simulation) — PASS
- [x] sim:e2e:combat (battle FSM sync & manual scenarios) — PASS
- [ ] sim:e2e (full E2E cross-domain regression pass) — PENDING

## Active Fix — GTS Tab Refresh Fix in GlobalMarketModal.vue
Root cause: Al cambiar a la pestaña 'explore' no se invocaba gtsStore.fetchListings(), dejando la lista desactualizada durante transacciones dinámicas entre pestañas.
Files touched: src/components/modals/GlobalMarketModal.vue
Attempts: 1
Status: PASS

## Completed Fixes
| Simulation | Root Cause | Fix Applied | Attempts | Result |
|---|---|---|---|---|
| sim:e2e:gts | Listings not auto-fetched when navigating back to explore tab | Added watch(activeTab) calling fetchListings() in GlobalMarketModal.vue | 1 | PASS |

## Pending Simulations
- sim:e2e

## Structural Blockers (user review required)
| Simulation | Why a design decision is needed |
|---|---|

## Critical Decisions

## Coverage Gaps Detected
| Gap | Suggested simulation type |
|---|---|
