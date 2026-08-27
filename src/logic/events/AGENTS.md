# Purpose

Manage the logic and assets of events.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Multi-Category Sub-Competition System & Flexible Criteria**: Global competition events support multiple concurrent sub-competitions (minimum 3 by default: IVs, Weight, Height, with support for arbitrary additional sub-categories like Level, Friendship, or Specific Stat IVs).
- **Metric Evaluation Direction & Determinism**: IV-based sub-competitions strictly evaluate higher scores (`DESC`). Physical dimension metrics (Weight and Height) evaluate directionally (`max` or `min`), where unconfigured events resolve direction deterministically from the event's time cycle seed (matching Mulberry32 PRNG logic).
- **Sub-Competition Admission Filters & Global Inheritance**: Sub-competitions inherit global event admission constraints (e.g., target species whitelist, `requireCaughtDuringEvent`) while supporting optional category-specific filters (e.g. required natures, required abilities, gender, level caps). All criteria default to open/unrestricted ("any") unless explicitly configured with one or more valid values.
- **Candidate Pre-Filtering on Slot Selection**: When initiating Pokémon selection for a sub-competition slot, the system MUST pre-filter all candidates against the full combined criteria (global + category) using `isPokemonEligibleForSubCompetition`, restricting selection exclusively to eligible Pokémon.
- **Multi-Category Independent Awards**: Players can enter different Pokémon or the exact same Pokémon across all available sub-competitions. Winning multiple sub-competitions awards the distinct, independent thematic prizes of each won category without prize duplication or scalar multipliers.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- Extract sub-competition scoring and tiebreaking helpers into pure modules with zero DOM or framework dependencies.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
