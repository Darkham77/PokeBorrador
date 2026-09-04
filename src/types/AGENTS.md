# Purpose

Define and govern the TypeScript types, contracts, and interfaces shared across the application modules.

## Ownership

State & Type Architects.

## Local Contracts

- **Zero-Any Policy**: The use of `any` is strictly forbidden. Custom interfaces or type definitions must be implemented for type safety.
- **Zero-Ignore Policy**: Bypassing checks with `@ts-ignore` or `@ts-nocheck` is strictly forbidden.
- **English ID Identifiers**: All identifiers (`id`) for data structures, inventory, maps, and events must be typed as English strings (no Spanish keys allowed).
- **Canonical `as const` Array Derivations**: Finite domains must be declared as `as const` arrays and their types derived via `(typeof ARRAY)[number]`. Inline string literal unions (`'a' | 'b' | 'c'`) are prohibited across the codebase.
- **Root Contract First Mandate**: Root data entities, models, and battle contracts (e.g. `PurePokemon`, `PureMove`, `PureBattleWeather`) MUST type their identifier and domain fields with exact canonical domain types (`PokemonSpeciesId`, `PokemonMoveId`, `WeatherId`, `AbilityId`, `ItemId`). This eliminates downstream defensive type-narrowing (such as `typeof id === 'string'`) in consuming pure functions.
- **Prohibition on Mixed Domain Literal Unions (`noMixedDomainLiteralUnions`)**: Never combine domain union types with ad-hoc sentinel strings (e.g. `WeatherId | 'clear'`, `PokemonType | 'all'`). When creating composite filter or sentinel domains, declare a dedicated `as const` array deriving the filter type cleanly (`export const MARKET_TYPE_FILTERS = ['all', ...POKEMON_TYPES] as const; export type MarketTypeFilter = (typeof MARKET_TYPE_FILTERS)[number];`).
- **Canonical Domain Pureness & Container Nullability**: `null` and `undefined` must NEVER be part of canonical catalogue domain unions (e.g. `WeatherId`, `PokemonSpeciesId`, `ItemId`). Nullability belongs exclusively to the container property or state variable (e.g. `weather: WeatherId | null`).
- **Centralized Minigame Difficulties**: All minigames (Pesca, Minería / Arqueología, etc.) must consume `MinigameDifficulty` / `MINIGAME_DIFFICULTIES` from `src/types/battle/battle.ts`.

## Work Guidance

- Keep types and interfaces decoupled from rendering engines where possible to avoid cycle dependencies.
- Ensure that external API models (e.g. database query return shapes) have explicit TypeScript representations.
- Declare polyfills and global definitions (like Temporal API extensions) cleanly inside `env.d.ts` using correct, specific typing.
- **SVG className Object Type-Safety**: SVG elements use `SVGAnimatedString` for `.className`. To prevent exceptions during global delegation, query `classList` (e.g. `el.classList.contains()`) instead of string-matching on `.className`.
- **JSDoc Integrity**: When editing code, always verify the preservation of the `/**` opening tags. Deleting them breaks JSDoc transformation and builds.
- **ESLint Empty Catch Block Compliance**: Empty catch blocks are prohibited. When catching exceptions that can be ignored, name the error variable `_e` and write an explanatory comment inside the catch block.
- **Temporal API Typings**: Custom or polyfilled Temporal API properties (e.g. year, month) must be declared with formal types (like `ZonedDateTime` interface) in `env.d.ts`, not as `unknown` or `any`.
- **Generic Key Access Type-Safety**: For dynamic property access, use TypeScript generic index constraints: `<K extends keyof T>(obj: T, key: K, fallback: T[K])` instead of casting to `any`.
- **Empty Object Union Avoidance (`{}`)**: Merging fallbacks like `const x = data[key] || {}` is prohibited as the compiler infers `{}`. Use explicit conditional checks (e.g., `const x = data[key]; const val = x ? x.name : defaultVal;`).
- **Export Only When Consumed Externally**: Only apply `export` to types or interfaces if they are consumed outside of the declaring file to avoid dead export warnings.
- **Named Interface Parameters**: Function parameters must consume named interfaces rather than inline anonymous object literals (`{ id: string }`).
- **No Inline Type Imports**: Parameter and property types must use explicit top-level type imports (`import type { ... } from '...'`) instead of inline `import('...').Type`.

## Verification

- Run `npm run audit` to verify type contracts, domain integrity, and project rules.

## Child DOX Index

- [auth/](./auth/AGENTS.md): Domain module documentation for auth.
- [battle/](./battle/AGENTS.md): Domain module documentation for battle.
- [breeding/](./breeding/AGENTS.md): Domain module documentation for breeding.
- [inventory/](./inventory/AGENTS.md): Domain module documentation for inventory.
- [pokemon/](./pokemon/AGENTS.md): Domain module documentation for pokemon.
- [system/](./system/AGENTS.md): Domain module documentation for system.
