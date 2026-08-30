# Purpose

Static battle datasets, move definitions, abilities, natures, and type matchups.

## Local Contracts

- **Zero Silent Fallbacks in Domain Lookups**: Functions like `getNatureInfo(nature: NatureId)` and `toNatureId(raw: string)` must fail loudly (`throw new Error(...)`) when encountering invalid keys. Redundant string sanitation (`.toLowerCase().trim()`) on typed domain IDs is strictly forbidden.
- **Abilities Single Source of Truth (`abilities.json`)**: `src/data/battle/abilities.json` is the sole Single Source of Truth (SSoT) for all ability metadata: Spanish names (`name`), bespoke emojis (`icon`), and structured rich descriptions (`desc`). Dual-effect abilities (in-battle + out-of-battle field passive) MUST explicitly separate mechanics using bullet points (`• Combate: ...\n• Campo: ...`), with exact numeric percentages and multipliers. Field-only abilities use `• Campo: ...`. 100% of abilities in `abilities.json` must declare a valid non-empty `name`, `desc`, and `icon`. Hardcoding duplicate string catalogs or icon dictionaries in logic modules or UI components is strictly prohibited.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
