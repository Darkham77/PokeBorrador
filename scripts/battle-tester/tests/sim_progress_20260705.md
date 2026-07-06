# Simulation Run — 2026-07-05 (Limpieza y Regresión)
Session: 20260705

## Scope
Ejecución de todas las simulaciones de combate E2E desde cero para validar que no haya regresiones tras la consolidación del mapeo por UID y resolución de vulnerabilidades.

## Status
Overall: IN_PROGRESS
Last action: Creado el archivo de progreso. Iniciando suite de tests unitarios y de integración previos.
Resumed at: start

## Simulation Queue
- [x] test:node (unit) — PASS
- [ ] test (integration) — PENDING
- [ ] test:combat:fuzzer — PENDING (si se requiere regenerar)
- [ ] test:e2e:combat (lote #1) — IN PROGRESS
- [ ] test:e2e:combat (todos los lotes) — PENDING

## Active Fix — none
Root cause:
Files touched:
Attempts: 0
Status: PENDING

## Completed Fixes
| Simulation | Root Cause | Fix Applied | Attempts | Result |
|---|---|---|---|---|

## Pending Simulations (not yet started)
- Toda la suite de regresión de combate.

## Structural Blockers (user review required)
Ninguno.

## Critical Decisions
- Ejecutar primero los tests unitarios para validar la lógica sintáctica de `injectUidsIntoRequest` y el bridge de Showdown.
- Correr el Fuzzer de combates si es necesario para regenerar casos, y luego simular con Playwright.

## Coverage Gaps Detected
| Gap | Suggested simulation type |
|---|---|
