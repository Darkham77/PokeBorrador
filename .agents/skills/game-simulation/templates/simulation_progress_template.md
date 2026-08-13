# 🎮 Estado Dinámico de Simulación y Certificación E2E (15 Simuladores E2E)

Última actualización: YYYY-MM-DD

---

## 📊 Pipeline Completo de Simuladores (Orden Exacto de Ejecución de `npm run sim:e2e`)

> *Orden determinista generado por `npm run sim:e2e:table` (ordenado por complejidad/cantidad de casos y ruta relativa).*

| # | Archivo de Simulación (`*.simulation.ts`) | Casos | Comando de Ejecución Directa | Estado |
|:---|:---|:---|:---|:---|
| **0** | `scripts/e2e/fuzzer/runners/run_all_fuzzers.ts` | 227 | `npm run sim:fuzzer` | ⏳ Pendiente |
| **1** | `scripts/e2e/battle/battle_manual_scenarios.simulation.ts` | 1 | `npx playwright test scripts/e2e/battle/battle_manual_scenarios.simulation.ts` | ⏳ Pendiente |
| **2** | `scripts/e2e/battle/debug_ash_save.simulation.ts` | 1 | `npx playwright test scripts/e2e/battle/debug_ash_save.simulation.ts` | ⏳ Pendiente |
| **3** | `scripts/e2e/battle/search_loop_sequential.simulation.ts` | 1 | `npx playwright test scripts/e2e/battle/search_loop_sequential.simulation.ts` | ⏳ Pendiente |
| **4** | `scripts/e2e/breeding/breeding_lifecycle.simulation.ts` | 1 | `npx playwright test scripts/e2e/breeding/breeding_lifecycle.simulation.ts` | ⏳ Pendiente |
| **5** | `scripts/e2e/gts/gts_transactions.simulation.ts` | 1 | `npx playwright test scripts/e2e/gts/gts_transactions.simulation.ts` | ⏳ Pendiente |
| **6** | `scripts/e2e/gyms/gym_progression.simulation.ts` | 1 | `npx playwright test scripts/e2e/gyms/gym_progression.simulation.ts` | ⏳ Pendiente |
| **7** | `scripts/e2e/missions/daycare_missions.simulation.ts` | 1 | `npx playwright test scripts/e2e/missions/daycare_missions.simulation.ts` | ⏳ Pendiente |
| **8** | `scripts/e2e/battle/battle_weather_effects.simulation.ts` | 2 | `npx playwright test scripts/e2e/battle/battle_weather_effects.simulation.ts` | ⏳ Pendiente |
| **9** | `scripts/e2e/save/save_shield_restrictions.simulation.ts` | 2 | `npx playwright test scripts/e2e/save/save_shield_restrictions.simulation.ts` | ⏳ Pendiente |
| **10** | `scripts/e2e/battle/battle_capture.simulation.ts` | 4 | `npx playwright test scripts/e2e/battle/battle_capture.simulation.ts` | ⏳ Pendiente |
| **11** | `scripts/e2e/battle/debug_creator.simulation.ts` | 4 | `npx playwright test scripts/e2e/battle/debug_creator.simulation.ts` | ⏳ Pendiente |
| **12** | `scripts/e2e/battle/heuristic_ai.simulation.ts` | 6 | `npx playwright test scripts/e2e/battle/heuristic_ai.simulation.ts` | ⏳ Pendiente |
| **13** | `scripts/e2e/battle/battle_fsm_sync.simulation.ts` | 227 | `npx playwright test scripts/e2e/battle/battle_fsm_sync.simulation.ts` | ⏳ Pendiente |
| **14** | `scripts/e2e/battle/battle_healing_regression.simulation.ts` | 227 | `npx playwright test scripts/e2e/battle/battle_healing_regression.simulation.ts` | ⏳ Pendiente |
| **15** | `scripts/e2e/battle/battle_held_items.simulation.ts` | 227 | `npx playwright test scripts/e2e/battle/battle_held_items.simulation.ts` | ⏳ Pendiente |
| **Final** | `scripts/e2e/run_sequential_simulations.ts` | Todo | `npm run sim:e2e` | ⏳ Pendiente tras validación individual |

---

## 📜 Libro Mayor Completo e Ininterrumpido de Correcciones (Commit Ledger)

| ID | Área / Componente | Causa Raíz / Problema Detectado | Corrección Aplicada | Archivos Modificados |
|---|---|---|---|---|
| **FIX-01** | ... | ... | ... | ... |

---

## 🧪 Tests de Reproducción de Casos Extraídos (Vitest Inmutable)

| ID | Caso / Fixture Extraído | Test de Unidad de Reproducción | Estado | Causa Raíz Diagnosticada y Reparada |
|:---|:---|:---|:---|:---|
| **FIX-XXX** | `tests/fixtures/battle/case_xxx.json` | `tests/node/battle/reproduce_case_xxx.test.ts` | 🟢 **PASS** | ... |
