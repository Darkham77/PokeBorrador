# Purpose

Static battle datasets, move definitions, abilities, natures, and type matchups.

## Local Contracts

- **Canonical Showdown Nature IDs Mandate**: All nature declarations across factories, stores, breeding actions, and battle generators MUST strictly use canonical lowercase Showdown `NatureId` values (`'adamant'`, `'serious'`, `'hardy'`, etc.). Hardcoding Spanish terms (e.g., `'Serio'`, `'Firme'`) or capitalized strings (e.g., `'Hardy'`) is strictly forbidden.
- **Zero Silent Fallbacks in Domain Lookups**: Functions like `getNatureInfo(nature: NatureId)` and `toNatureId(raw: string)` must fail loudly (`throw new Error(...)`) when encountering invalid keys. Redundant string sanitation (`.toLowerCase().trim()`) or dynamic fallback values on typed domain IDs are strictly forbidden.
- **Abilities Single Source of Truth (`abilities.json`)**: `src/data/battle/abilities.json` is the sole Single Source of Truth (SSoT) for all ability metadata: Spanish names (`name`), bespoke emojis (`icon`), and structured rich descriptions (`desc`). Dual-effect abilities (in-battle + out-of-battle field passive) MUST explicitly separate mechanics using bullet points (`• Combate: ...\n• Campo: ...`), with exact numeric percentages and multipliers. Field-only abilities use `• Campo: ...`. 100% of abilities in `abilities.json` must declare a valid non-empty `name`, `desc`, and `icon`. Hardcoding duplicate string catalogs or icon dictionaries in logic modules or UI components is strictly prohibited.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
