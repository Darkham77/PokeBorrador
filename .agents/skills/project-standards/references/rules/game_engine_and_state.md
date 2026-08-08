# Game Engine, Visuals & State Rules

This document governs Pokémon Showdown integration, active generation SSoT, 4-seat compatibility, visual shell integrity, and entity identifier formatting across Poké Vicio.

## 1. Showdown Source of Truth & Active Generation SSoT

- **Source Code Reference**: The local directory `external/pokemon-showdown-code/` contains the official Pokémon Showdown source code (`https://github.com/pkmn/ps.git`) and MUST be used as the canonical source of truth for algorithms, battle engine logic, and state transitions.
- **Active Generation SSoT**: It is STRICTLY FORBIDDEN to hardcode the Pokémon Showdown generation (`genX`, `gen5`, etc.) anywhere in the codebase. All battle initializations and formats MUST dynamically reference `ACTIVE_GENERATION` (e.g. `gen${ACTIVE_GENERATION}customgame` or `getShowdownFormatId()`).

## 2. Mandatory 4-Seat Generic Compatibility Mandate

- Every battle orchestration, state synchronization, worker payload processing, and UI component MUST be strictly designed, modularized, and generalized to support up to 4 battle seats (`p1`, `p2`, `p3`, `p4`) dynamically.
- Hardcoding logic, branches, or state variables for only 2 seats (`p1`/`p2`) is STRICTLY FORBIDDEN. Refactor seat logic into parameterized loops without code duplication.

## 3. State Integrity & Zero-Cloning Mandate

- **No Pokémon Object Cloning**: It is STRICTLY FORBIDDEN to clone, shallow-copy (`{ ... }`), or replace Pokémon instances representing active combatants or team members to trigger Vue reactivity updates. Doing so breaks object reference parity.
- **UID-Based Resolution & In-Place Mutation**: Always pass unique identifiers (`uid`) and resolve objects dynamically via getters from the primary SSoT (`gameStore.state.team` or `gameStore.state.box`). Mutate object properties directly in-place on references.

## 4. Visual Shell, SASS Integrity & Game Performance

- **SASS Integrity**: SASS function capitalization is handled automatically by the Vite plugin (`vite-plugin-sass-traps.ts`) during HMR and build. Developers and agents write standard lowercase CSS filters/transforms, and Vite automatically formats them.
- **GPU Efficiency & Performance**: High-fidelity web video game requirement. All UI and logic implementations MUST prioritize GPU-accelerated rendering and FPS stability. Strict use of Texture Atlases, Object Pooling, layer promotion (`will-change: transform`), and filter chain optimizations (`pokemon-outline-performance`).
- **GBA Font Spanish Capitalization Constraint**: The primary pixel font lacks uppercase glyphs for 'Ñ' and accented vowels. Any uppercase conversion in the UI (e.g. move names) must preserve or convert these characters to their lowercase equivalents (replacing 'Ñ' with 'ñ') to ensure they render correctly.

## 5. Entity Identifier Formatting Rules

- **English Identifier Mandate**: Logical identifiers (`id`) for items, Pokémon, abilities, natures, moves, etc., MUST be strictly in English (using official Showdown format). Spanish is reserved exclusively for user-facing UI text.
- **Showdown ID Format**: All identifiers MUST be all lowercase, alphanumeric characters only (no spaces, no hyphens, no underscores). Correct non-conforming IDs across configs, code, and databases immediately upon discovery.
