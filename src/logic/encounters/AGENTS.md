# Purpose

Generate wild Pokémon encounters, fishing pools, and archaeology spawns based on zone metadata.

## Ownership

Game Designers / Encounter Logic Developers.

## Local Contracts

- Keep encounter calculations decoupled from views.
- **Mandatory Field Modifiers Coordinator Consumption**: Wild, fishing, and archaeology encounter generators (`encounters.ts`, `fishingEncounterHelper.ts`, `encounterHelpers.ts`) MUST delegate all leader abilities, item buffs, incense filtering, level filtering, and shiny boosts to `resolveFieldEncounterModifiers` from `@/logic/rules/fieldRulesCoordinator`. Scattering ad-hoc `if (leader.ability === '...')` checks across encounter generators is strictly prohibited.
- Ensure spawn pool probabilities sum to 100% or follow standard spawn rates mapping.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
