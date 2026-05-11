# Aesthetic Audit Checklist

This checklist is used to verify the visual and functional integrity of the Poké Vicio project. Use it before every "Safe Commit".

## 1. Governance & Modularity

- [ ] **File Length**: Verified that no files exceed **500 lines** (Error). Files over **300 lines** have been reviewed for early modularization (Warning).
- [ ] **Architectural Reuse**: Verified that no new "islands" were created. Existing systems (`BaseModal`, `UnifiedCard`, `DBRouter`) are reused or extended.
- [ ] **Redundancy Audit**: `detect_css_redundancy.py` shows 0 critical overlaps for core components.
- [ ] **Validation Script Integrity**: Regex patterns in audit scripts (e.g. `detect_hybrid_patterns.py`) MUST use capturing groups for OR branches to prevent false positives.

## 2. UI & Aesthetics

- [ ] **Hybrid Check**: Are modern frames combined with pixel-art content?
- [ ] **Typography**: Is `@include pixelated;` used for all pixel fonts? Sizes are multiples of 8?
- [ ] **Relativity**: Are technical specs explained using symbolic names (`ENTITY_SIZE_P1/P2`) and logical relationships?
- [ ] **Outline Optimization**: Have I run `detect_outline_traps.py` to ensure no expensive Quad Drop-Shadows are present?
- [ ] **Prefixes**: Are `-webkit-backdrop-filter` and other Safari prefixes present?
- [ ] **Tokens**: Hardcoded hex colors replaced with variables; `$white` and `$black` used correctly.
- [ ] **Overlay Check**: Ensure modal overlays are siblings BEHIND the card, not parents, to avoid blurring content.
- [ ] **Nature Encoding**: Verified that stats in tooltips follow the Nature visual color code (Red: Atk, Yellow: Def, etc.).

## 3. Tooltips & Modals

- [ ] **PVTooltip Mandate**: All tooltips use `PVTooltip` component with `<Teleport to="body">`.
- [ ] **Zero Native Titles**: Native `title=""` attributes prohibited on standard HTML elements.
- [ ] **Tooltip Layers**: Tooltips in high-index layers (like Admin Panels) MUST use `var(--z-critical)` (999,999) via Teleport.
- [ ] **Close Button**: The "X" button is always visible and correctly positioned.
- [ ] **Stacking**: Does the modal behavior follow LIFO rules?

## 4. Admin & Debug

- [ ] **CLI-First Admin**: All administrative actions in the UI are delegated to `window.__VITE_DEBUG__` commands.
- [ ] **Admin Security**: All CLI commands are protected by `securityCheck()` with auto-ban protocols.
- [ ] **Debug UI**: All admin navigation and utility buttons implement `PVTooltip` and respect pixel-perfect font sizes.

## 5. Performance & Sync

- [ ] **GPU Audit**: `detect_gpu_gaps.py` passes with 0 critical gaps for core UI.
- [ ] **Performance Mode**: Use `uiStore.isAnyBlockingModalOpen` to trigger the map simplification mode.
  - **Entrance**: Activate simplification AFTER the first obscuring modal finishes its opening animation.
  - **Exit**: Restore the full map AS SOON AS the last obscuring modal starts its closing animation.
- [ ] **Discovery Logic**: Fog of War (Unknown/Seen/Caught) states follow standard opacities and filters.
- [ ] **Sync**: Database changes follow Triple Parity rules.
- [ ] **DB Parity**: WASM versions in `sqliteEngine.ts` match `index.html`.

## 6. Automated Validations

- [ ] **SASS Traps**: No lowercase `scale()`, `blur()`, etc., that cause build errors.
- [ ] **Hybrid Patterns**: `detect_hybrid_patterns.py` passes (0 errors).
- [ ] **Linting**: `npm run lint` passes with 0 errors.
- [ ] **Self-Healing**: Automated repair scripts (`fix_sass_traps.py`, `fix_hybrid_patterns.py`) have been executed if needed.
