---
name: project-standards
description: Core governance for the Poké Vicio project. Enforces Hybrid Retro-Modern identity, 500-line modularity, and Zero-Warning SASS/Vue standards. Use this as a Navigation Hub to access technical manuals for Phaser, Database, and Assets.
---

# Project Standards (Lean Core)

This skill governs the project's DNA. Technical implementation details are delegated to specialized manuals to ensure a "Lean" and effective primary ruleset.

## 🧭 Navigation Hub

Refer to these manuals for complex implementation specifications:

| Domain | Manual |
| :--- | :--- |
| **Phaser & Rendering** | [phaser_guidelines.md](./references/phaser_guidelines.md) |
| **UI/UX & Aesthetics** | [ui_ux_standards.md](./references/ui_ux_standards.md) |
| **SASS Styling** | [sass_styling_manual.md](./references/sass_styling_manual.md) |
| **Database Architecture** | [dbrouter_manual.md](./references/dbrouter_manual.md) |
| **Sync & Security** | [security_and_sync_manual.md](./references/security_and_sync_manual.md) |
| **Asset Pipeline** | [asset_service_manual.md](./references/asset_service_manual.md) |

---

## 🏛️ Core Mandates

### 1. Hybrid Retro-Modern Identity

- **Modern UI Shell**: Use premium CSS (Glassmorphism, gradients) for layouts and containers.
- **Retro Heart**: Use Pixel Art and Sharp Typography for all game-world content and data.

### 2. The 500-Line Threshold

- **MANDATORY**: No `.vue`, `.js`, or `.scss` file may exceed 500 lines.
- **Exception**: Data-only definition files and external/legacy backups.
- **Action**: Refactor any violator file you touch before submitting.

### 3. Pure Vue Standard

- **FORBIDDEN**: Direct DOM manipulation (`querySelector`, `innerHTML`, etc.).
- **REQUIRED**: All UI state MUST be reactive (Refs, Reactive, Pinia).
- **Audit**: Run `python3 .agents/skills/project-standards/scripts/detect_hybrid_patterns.py` after UI changes.

---

## 🎨 SASS & Syntax Traps

### 1. Filter Collision (Dart Sass 2.0)

- **MANDATORY**: Use **Capitalization** (e.g., `Grayscale(1)`, `Brightness(1.2);`, `transform: Scale(1.5);`) for all CSS filters and transform functions.

> [!WARNING]
> **Colisión de Filtros SASS**: Es obligatorio usar **Capitalización** para `Brightness()` y `Scale()` en archivos `.vue` y `.scss`. El uso de minúsculas (ej: `scale(1.1)`) provoca que Sass intente procesarlos como funciones de color propias, resultando en errores de compilación críticos.

- **WHY**: Lowercase functions with unitless numbers (e.g., `scale(1.2)`) are intercepted by Dart Sass as color functions, causing build errors like `[sass] $color: 1.2 is not a color.`.
- **REGRESIÓN DETECTADA**: Colisión de Filtros SASS: Reforzar la regla de capitalización obligatoria para `Brightness()` y `Scale()` en archivos `.vue` y `.scss` para evitar conflictos con las funciones de color de Sass 2.0.
- **GPU Tip**: Prefer `opacity: X` property over `filter: Opacity(X)`.

### 2. SASS Math & Strings

- **REQUIRED**: Use namespaced functions (e.g., `math.random`, `string.unquote`).
- **Audit**: Run `python3 .agents/skills/project-standards/scripts/check_sass_traps.py` after styling changes.

---

## 🛰️ Realtime & Offline Simulation

### 1. Offline Event Emulation

- **REQUIRED**: In `offline` mode, features that normally rely on Realtime listeners (e.g., Chat, Battle events) MUST manually update the local store state after a successful DB operation to simulate the missing server broadcast.
- **Fail-Safe**: Do not block features in offline mode unless they are strictly non-functional without a network.

---

## ⚙️ Execution Governance

### 1. Dev Server Reuse

- Check for existing `vite` processes before running `npm run dev`. Reuse existing sessions.
- Monitor active terminal logs for runtime errors before declaring success.

### 2. Python Self-Healing

- Skill scripts MUST use `try/except ImportError` blocks with the `[PYTHON_DEPENDENCY_ERROR]` tag.

---

## 🏁 Final Audit Checklist

- [ ] **File Length**: No violator files (excluding exceptions).
- [ ] **Validations**: SASS Traps and Hybrid Patterns detection scripts pass.
- [ ] **Linting**: `npm run lint` passes with 0 errors.
- [ ] **Production Build**: `npm run build` passes without errors.
- [ ] **Tests**: `npm run test` passes; new logic has unit tests.
- [ ] **Aesthetics**: Hybrid contrast and Typography sharpness verified.
- [ ] **Sync**: Database changes follow Triple Parity rules.
