# Purpose

Manage the logic and assets of pokemon.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Unified Pokémon Sort Bar Standard (`PokemonSortBar.vue`)**: All Pokémon sort controls across the application (Storage/Box, Selection Modals, Market, etc.) MUST be implemented using the modular `<PokemonSortBar />` component (`src/components/pokemon/PokemonSortBar.vue`).
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
