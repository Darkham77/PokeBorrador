---
name: project-standards
description: Core governance for the Poké Vicio project. Enforces Hybrid Retro-Modern identity, 500-line modularity, and Zero-Warning SASS/Vue standards. Use this as a Navigation Hub to access technical manuals for Phaser, Database, and Assets.
---

# Project Standards (Lean Core)

Este skill gobierna el ADN del proyecto. Los detalles de implementación técnica se delegan en manuales especializados para asegurar una base de reglas ligera y efectiva.

## 🧭 Navigation Hub

Consulta estos manuales para especificaciones detalladas de implementación:

| Dominio | Manual de Referencia |
| :--- | :--- |
| **Creación de Contenido** | [content_creation_manual.md](./references/content_creation_manual.md) |
| **Mecánicas de Batalla** | [battle_mechanics_manual.md](./references/battle_mechanics_manual.md) |
| **Mecánicas & UX** | [game_mechanics_manual.md](./references/game_mechanics_manual.md) |
| **Estándares UI/UX** | [ui_ux_standards.md](./references/ui_ux_standards.md) |
| **Fórmulas & Ratios** | [game_formulas_manual.md](./references/game_formulas_manual.md) |
| **Sistema de Ítems** | [item_system_manual.md](./references/item_system_manual.md) |
| **Guerra & Facciones** | [war_system_manual.md](./references/war_system_manual.md) |
| **Gimnasios & Rematch** | [gym_system_manual.md](./references/gym_system_manual.md) |
| **Social & Trade** | [trade_social_manual.md](./references/trade_social_manual.md) |
| **Arquitectura DB** | [dbrouter_manual.md](./references/dbrouter_manual.md) |
| **Validación & Calidad** | [validation_manual.md](./references/validation_manual.md) |
| **Guardado & Persistencia** | [save_system_manual.md](./references/save_system_manual.md) |
| **Testing & Simulación** | [browser_testing_manual.md](./references/browser_testing_manual.md) |
| **Phaser & Rendering** | [phaser_guidelines.md](./references/phaser_guidelines.md) |
| **Animaciones & FX** | [animation_standards.md](./references/animation_standards.md) |
| **GPU & Performance** | [gpu_optimization_manual.md](./references/gpu_optimization_manual.md) |
| **SASS & Estilos** | [sass_styling_manual.md](./references/sass_styling_manual.md) |
| **Asset Pipeline** | [asset_service_manual.md](./references/asset_service_manual.md) |
| **Mapa & Spawns** | [spawn_grid_manual.md](./references/spawn_grid_manual.md) |

### 🛠️ Migración & Soporte Técnico

- **Legacy Migration Hub**: [legacy_migration_manual.md](./references/legacy_migration_manual.md)
- **Notas Técnicas de DB**: [references/migration/](./references/migration/)

---

## 🏛️ Mandatos Principales (Core Mandates)

### 1. Identidad Hybrid Retro-Modern

- **Modern Shell**: Glassmorphism, gradientes, sombras HSL para contenedores.
- **Retro Heart**: Pixel Art y tipografía Sharp (`Press Start 2P`) para contenido de juego.
- **Pixel-Perfect**: Elementos pixelados DEBEN usar `@include pixelated`. La tipografía de estadísticas y encabezados siempre debe ser pixelada.

### 2. GPU & Rendering

- **GPU First**: Prioriza el renderizado acelerado por hardware. Ver [gpu_optimization_manual.md](./references/gpu_optimization_manual.md).
- **Sprite Standard**: Usa `@include sprite-render` para todos los assets del juego.
- **Organic Feel**: Desincroniza animaciones con semillas y varía velocidades.

### 3. Modularidad & Jerarquía

- **Regla de las 500 líneas**: Ningún archivo de lógica o estilo puede exceder las 500 líneas (excepto bases de datos masivas).
- **Zero-Invention**: Reutiliza `BaseModal`, `UnifiedCard` y mixins globales antes de crear estilos ad-hoc.
- **Modal Lifecycle**: Sincroniza el modo performance con las transiciones de modales.

### 4. Integridad de SASS y Build

- **Mandato de Capitalización**: Usa filtros capitalizados (`Scale()`, `Blur()`, `Linear-Gradient()`) para evitar colisiones con Dart Sass 2.0.
- **Estándar @use**: Prohibido el uso de `@import`. Usa `@use` y `@forward`.
- **Zero-Warning**: Mantén siempre 0 errores y 0 advertencias en `lint` y `vue-tsc`.
- **Escudo de Dependencias**: Scripts con librerías externas deben manejar `ImportError` y dar instrucciones de instalación.

### 5. CLI-First Debugging

- **Eficiencia sobre GUI**: Usa comandos `window.__VITE_DEBUG__` para simular estados. Es MANDATORIO verificar contenido nuevo vía CLI antes de commitear.

---

## 🏗️ Gobernanza de Artefactos (MANDATORIO)

Para asegurar el rigor y la trazabilidad, toda tarea compleja DEBE seguir el ciclo de vida de artefactos:

1. **Planning**: Crear `implementation_plan.md`. Esperar "ok" del usuario.
2. **Execution**: Mantener `task.md` como fuente de verdad.
3. **Closure**: Crear `walkthrough.md` con evidencia (capturas, tests) del éxito de la tarea.

---

## 🛠️ Aesthetic Audit Checklist

- [ ] **Architectural Reuse**: ¿He reutilizado componentes existentes?
- [ ] **GPU Acceleration**: ¿He aplicado promoción de capas en elementos pesados?
- [ ] **Pixel Parity**: ¿Todo el contenido de juego es pixelado y nítido?
- [ ] **CLI-First**: ¿He verificado el estado vía consola?
- [ ] **Zero-Warning**: ¿`npm run lint` y `build` pasan sin advertencias?
