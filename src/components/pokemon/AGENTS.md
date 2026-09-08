# Purpose

Manage the logic and assets of pokemon.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Unified Pokémon Sort Bar Standard (`PokemonSortBar.vue`)**: All Pokémon sort controls across the application (Storage/Box, Selection Modals, Market, etc.) MUST be implemented using the modular `<PokemonSortBar />` component (`src/components/pokemon/PokemonSortBar.vue`).
- **Unified Pokémon Tag Bar Standard (`PokemonTagBar.vue`) & Single-Row Cohesion Mandate**: All Pokémon tag filter controls across the application (Storage/Box, Selection Modals, Daycare, etc.) MUST be implemented exclusively using the modular `<PokemonTagBar />` component (`src/components/pokemon/PokemonTagBar.vue`).
  1. **Responsive Minimization**: On viewports `<= 768px` or when `:compact="true"` is passed, tag text labels (`.tag-text`) MUST automatically hide (`display: none !important`), rendering only the icon in an icon-pill button. On small viewports (`<= 480px`), `.mini-label` must also hide.
  2. **Single-Row Action Cohesion via `#prefix`**: External action buttons operating alongside tags (such as "Limpiar Filtros" `[🧹]`) MUST NEVER be placed in an external flex row where `width: 100%` can force line breaks. They MUST be passed via the `<template #prefix>` slot directly into `.tag-items`, sharing `flex-wrap: nowrap` so all controls remain on the exact same row without breaking into isolated rows.
- **Zero Overflow Clipping on Hover/Transform Micro-Interactions**: Containers hosting interactive elements equipped with GSAP hover effects (`v-gsap-hover`, `scale(1.05)`, `translateY(-2px)`) MUST NEVER set `overflow: hidden` or `overflow-x: auto` on intermediate or immediate wrappers. In CSS, setting `overflow-x: auto` automatically forces `overflow-y: auto`, which crops the elevated borders of transformed buttons. Containers MUST declare `overflow: visible;` and provide sufficient vertical padding/breathing room (`min-height: 34px`, `padding: 5px 8px`) so micro-interactions never get visually sliced.
- **3-Character Strict Abbreviation Standard**: All sort option labels MUST use exactly 3-character uppercase abbreviations (`REC`, `LVL`, `IVS`, `TOT`, `DEX`, `CRI`, `PES`, `ALT`, `AMI`). Full words (such as `TOTAL`, `CRÍA`, `PESO`, `PDEX`) are strictly forbidden.
- **Left-Aligned Emoji Icon Semantic Containers**: Every sort option MUST render an emoji icon inside an approved `.icon` container immediately to the left of the 3-character label to visually disambiguate sorting criteria.
- **Pill Sizing, Generous Padding & Direction Arrow Contrast**: Sort pills MUST maintain generous, consistent horizontal padding (`padding: 6px 9px;`, `border-radius: 8px;`, `gap: 4px;`) across all views (Box, Modals, etc.). Active direction arrows (`▼`/`▲`) MUST be clearly legible with high contrast (`font-size: 8px; font-weight: bold; color: var(--yellow)`).
- **Modal Width & Symmetrical Row Centering**: Modals hosting the complete 9-button sort bar MUST allocate sufficient container width (`max-width: 640px`) to prevent line wrapping, and MUST center both the sort bar (`.pokemon-sort-bar .sort-items`) and tag filter rows (`.ps-tags-row-unified`) with `justify-content: center` to preserve symmetry with the top search input.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
