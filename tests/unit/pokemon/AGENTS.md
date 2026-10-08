# Purpose

Unit tests for Pokemon domain logic, factory generation, evolution, breeding, legality verification, save sanitization, storage management, and UI presentation components.

## Ownership

Poké Vicio Development Team.

## Local Contracts

### Suites Directory

- [`pokemon_core_domain_suite.spec.ts`](./pokemon_core_domain_suite.spec.ts): Box filters, nickname/emoji search, total power (BST + IVs), core creation, tier engine, Ash account resilience.
- [`pokemon_box_and_storage_suite.spec.ts`](./pokemon_box_and_storage_suite.spec.ts): Box storage limits, team management, competition selection modals, search/filter persistence.
- [`pokemon_evolution_and_breeding_suite.spec.ts`](./pokemon_evolution_and_breeding_suite.spec.ts): Breeding compatibility, egg incubation, evolution stones/levels, legendary vigor depletion, Ditto capture.
- [`pokemon_sanitization_and_resilience_suite.spec.ts`](./pokemon_sanitization_and_resilience_suite.spec.ts): Save data sanitization, unreleased/disabled species purging, Save Shield guarantees, stats recalculation, active buff timers.
- [`pokemon_factory_and_capture_suite.spec.ts`](./pokemon_factory_and_capture_suite.spec.ts): Factory creation, level limits, learnset pending move queues, capture formula, ball multipliers.
- [`pokemon_legality_and_integrity_suite.spec.ts`](./pokemon_legality_and_integrity_suite.spec.ts): Move/ability legality checks, TM preservation, level-scaled move repair, POKEMON_DB integrity, nature translations.
- [`pokemon_ui_and_sprites_suite.spec.ts`](./pokemon_ui_and_sprites_suite.spec.ts): Detail UI components, stat bars, tooltips, friendship seal badges, sprite silhouette & aura canvas rendering.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
