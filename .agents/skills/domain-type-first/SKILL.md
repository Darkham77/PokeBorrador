---
name: domain-type-first
description: MANDATORY governance for defining, typing, declaring, modifying, refactoring, or reviewing ANY TypeScript data type, variable, constant, function parameter, return type, component prop, interface field, DTO, schema, store state, or finite domain. This skill MUST trigger whenever the user or task mentions defining or declaring types, variables, parameters, arguments, props, fields, constants, enums, unions, branded types, or schemas, in both Spanish and English (e.g., "tipo de dato", "tipar", "variable", "variables", "parametro", "parámetros", "prop", "props", "campo", "campos", "firma", "constante", "declarar", "data type", "type", "variable", "parameter", "parameters", "args", "return type", "interface", "schema", "state", "ids", "status", "category", "mode", "kind", "Record", "Set", "Map", "array of strings", generated JSON/TS databases). Enforces strict compile-time TypeScript unions derived from canonical data, eliminating naked strings, ad-hoc literal unions, loose any/unknown casts, and runtime fallbacks.
---

# Domain Type First

Use this skill before writing or editing any code that introduces, changes, or consumes a finite data domain, declares variables/parameters, or adds TypeScript types.

The goal is simple: invalid domain values should fail at compile time. If TypeScript accepts an invalid value, the domain was designed incorrectly.

## Trigger Checklist

Apply this workflow whenever the task involves any of the following:

- **Variables & Constants**: Declaring, typing, or modifying any variable (`const`, `let`, `ref()`, `reactive()`) holding domain values, statuses, identifiers, or configurations.
- **Function & Method Parameters**: Typing arguments, parameters, callbacks, composables inputs, handler signatures, or return types across `src/` and `scripts/`.
- **Component Props & State**: Declaring Vue component props, emits, Pinia store state fields, getters, or action payloads.
- **Types, Interfaces & Schemas**: Creating or updating any `type`, `interface`, DTO, Valibot schema, database model, generated wrapper, or data contract.
- **Finite Domain IDs & Values**: Finite identifiers such as Pokemon species, moves, abilities, items, maps, trainers, factions, statuses, weather, ranks, categories, modes, slots, phases, classes, tables, or routes across `src/` and `scripts/`.
- **Collections & Dictionaries**: Constants declared as arrays, sets, maps, records, or object dictionaries in `src/` and `scripts/`.
- **Generated Data & Boundary Validation**: Generated data under `src/data/**`, generated wrappers from JSON, npm scripts under `scripts/**`, or runtime boundary validators (`isDomainId`, `requireDomainId`).
- **Audit Findings**: Review/audit findings from `npm run validate:domain-types` or `npm run audit:warnings-diff`.

If it represents a finite domain, design and use the domain type first.

## Absolute Prohibition on Silent Domain ID Fallbacks (`noDomainIdFallbacks`)

- **Zero-Fallback Mandate**: It is STRICTLY FORBIDDEN to use silent fallbacks (`|| ''`, `?? ''`, `condition ? id : ''`) when resolving or assigning domain identifiers (`ItemId`, `PokemonSpeciesId`, `AbilityId`, `PokemonMoveId`).
- **Fail-Fast Boundary Validation**: Any lookup or resolution MUST use an explicit validator function (`requireItemId`, `requirePokemonSpeciesId`, etc.) that throws an explicit Error (`throw new Error(...)`) if the ID is missing or invalid.
- **Audit Engine Enforcement**: The audit rule `noDomainIdFallbacks` in `scripts/maintenance/audit_rules.ts` scans `src/` and `scripts/` during `npm run audit:warnings-diff` and will fail the commit if any domain ID fallback is introduced.

## Absolute Prohibition on Value-Hardcoding in Constant Names (`badConstantNames`)

- **Semantic Naming Mandate**: Constant names MUST describe their domain purpose or semantic role, NEVER hardcode their current numeric or string value into the identifier.
- **Forbidden Pattern**: `const ARCHAEOLOGY_CAVE_BASE_WEIGHT_10 = 10;`, `const DEFAULT_DEBUG_FRIENDSHIP_70 = 70;` (WRONG — hardcodes value in variable name).
- **Canonical Pattern**: `const ARCHAEOLOGY_CAVE_BASE_WEIGHT = 10;`, `const DEFAULT_DEBUG_FRIENDSHIP = 70;` (CORRECT — semantic & generic).
- **Audit Rule**: The rule `badConstantNames` automatically flags any `const CONST_NAME_123` containing numeric value suffixes in `src/` and `scripts/`.

## Absolute Prohibition on Literal Boolean Type Annotations (`noLiteralBooleanType`)

- **Canonical Boolean Mandate**: It is STRICTLY FORBIDDEN to use boolean literals (`true`, `false`) as type annotations when declaring variables, interface/type fields, type aliases, or function parameters (e.g. `var hola: true`, `let flag: false`, `field: true;`).
- **Forbidden Pattern**: `var hola: true`, `type Flag = false;`, `interface Event { ready: true; }` (WRONG — types as literal boolean instead of boolean type).
- **Canonical Pattern**: `var hola: boolean`, `type Flag = boolean;`, `interface Event { ready: boolean; }` (CORRECT — canonical boolean contract).

## Absolute Prohibition on Local Reinvention of Library Domain Types (`noLibraryDomainDuplicates`)

- **Direct Dependency Consumption**: It is STRICTLY FORBIDDEN to redeclare or invent local domain types or string literal arrays (`['p1', 'p2', 'p3', 'p4']`, `'M' | 'F' | 'N'`, `'brn' | 'par' | ...`) when an identical domain type is already exported by an installed library (`SideID`, `GenderName` from `@pkmn/sim`, `StatusName` from `@smogon/calc`, etc.).
- **Dynamic Auditor Indexing**: The auditor `scripts/validation/validate_domain_types.ts` dynamically indexes all exported union types from `node_modules/` `.d.ts` files at runtime and will fail if local code duplicates a library domain.

## Absolute Prohibition on Redundant 1:1 Type Aliases (`noRedundantTypeAliases`)

- **Zero-Passthrough Mandate**: It is STRICTLY FORBIDDEN to create 1-to-1 type aliases (`export type Foo = Bar;`) that merely rename an existing type without adding structural or domain value.
- **Forbidden Pattern**: `export type ActivePokemonStatus = StatusName;`, `export type PersistedPokemonGender = GenderName;`, `export type ReplaySeat = SideID;` (WRONG — unnecessary indirection).
- **Canonical Pattern**: Use `StatusName`, `GenderName`, `SideID` directly at all usage sites across the repository.

## Absolute Prohibition on Translated String Unions & Display Names in Contracts (`noTranslatedStringUnions`)

- **Canonical ID Mandate**: It is STRICTLY FORBIDDEN to create ad-hoc string literal unions or types holding translated/localized display names (e.g. `type GymReward = 'MT39 Tumba Rocas' | ...;`, `type BallName = 'Pokéball' | ...;`).
- **Domain IDs Only**: All domain contracts, functions, parameters, store states, Valibot schemas, calculations, and persistence layers MUST strictly consume and produce canonical domain IDs (`ItemId`, `MoveId`, `PokemonSpeciesId`, `MapRouteId`). Localized texts belong exclusively in UI display helpers (`getItemById(id).name`).
- **Forbidden Pattern**: `rewardTM: 'MT39 Tumba Rocas' | 'MT03 Pulso Agua'`, `function useItem(itemName: string)`
- **Canonical Pattern**: `rewardTM: ItemId`, `function useItem(itemId: ItemId)`

## Absolute Prohibition on `// domain-ok` Abuse on Domain Entities (`noDomainOkOnEntities`)

- **Prose-Only Mandate**: The `// domain-ok` suppression directive is STRICTLY RESERVED for purely narrative prose (e.g. NPC dialogue lines, lore quotes, battle victory speech strings).
- **Entity Prohibition**: It is STRICTLY FORBIDDEN to use `// domain-ok` on fields that represent entities, foreign keys, items, moves, pokemon, maps, gyms, or rewards to silence TypeScript errors. If TypeScript reports a mismatch, fix the underlying data contract to use the canonical domain ID.
## Nominal Branded Types for Domain IDs (`Brand<T, B>`)

- **Nominal Safety Mandate**: Finite domain identifiers (`PokemonSpeciesId`, `ItemId`, `PokemonMoveId`) SHOULD be defined as Nominal Branded Types using `Brand<T, B>` from `@/types/system/branding` to prevent accidental assignability across distinct domains.
- **Example**:
  ```ts
  import { type Brand, toBrand } from '@/types/system/branding';
  export type PokemonSpeciesId = Brand<string, 'PokemonSpeciesId'>;
  export const makePokemonSpeciesId = (raw: string): PokemonSpeciesId => toBrand(requirePokemonSpeciesId(raw));
  ```

## Result & Option Monad Standard (`Result<T, E>` / `Option<T>`)

- **Zero Null-Ambiguity Mandate**: Domain boundary functions performing fallible computations or lookups SHOULD consume or return `Option<T>` or `Result<T, E>` from `@/types/system/result` and `@/logic/utils/resultUtils`.
- **Example**:
  ```ts
  import { ok, err, type Result } from '@/logic/utils/resultUtils';
  export function parseItemQuantity(raw: unknown): Result<number, string> {
    const num = Number(raw);
    return !isNaN(num) && num > 0 ? ok(num) : err('Cantidad inválida');
  }
  ```

## Floating Promise & Architecture Rules (`noFloatingPromises`, `noLeakedGlobalState`, `noDynamicImportInHotPath`)

- **Floating Promise Guard (`noFloatingPromises`)**: Async calls MUST be handled explicitly with `await`, `void`, or `.catch()` (e.g. `void saveStateAsync();`).
- **Module Global State Guard (`noLeakedGlobalState`)**: Mutable `let`/`var` variables at top-level module scope are prohibited unless encapsulated in Pinia stores, classes, or marked `// singleton-ok`.
- **Hot-Path Import Guard (`noDynamicImportInHotPath`)**: Dynamic `import()` inside loops, Vue computed properties, or GSAP timelines is prohibited to avoid combat animation stutter.
- **Auto-Fixer Command**: Mechanical rules can be auto-repaired across the codebase by running:
  ```bash
  npm run audit:fix
  ```

## Canonical Patterns

Use one of these patterns as the source of truth.

### Tuple Domain

```ts
export const WEATHER_IDS = ['clear', 'rain', 'storm'] as const;
export type WeatherId = (typeof WEATHER_IDS)[number];
```

### Object-Key Domain

```ts
export const ITEM_DATA = {
  potion: { price: 300 },
  superpotion: { price: 700 },
} as const;

export type ItemId = keyof typeof ITEM_DATA;
```

### Generated JSON Domain

```ts
import dbJson from './items.json' with { type: 'json' };

export const ITEM_DATA = dbJson;
export type ItemId = keyof typeof ITEM_DATA;
```

### Partial Coverage Map

Use `Partial<Record<DomainId, Value>>` only when the map intentionally covers a subset of a strict domain.

```ts
export const WEATHER_BONUSES = {
  rain: 1.2,
  storm: 1.5,
} satisfies Partial<Record<WeatherId, number>>;
```

### Full Coverage Map

Use `Record<DomainId, Value>` when every domain member must be present.

```ts
export const TYPE_LABELS = {
  fire: 'Fuego',
  water: 'Agua',
} satisfies Record<PokemonType, string>;
```

## Boundary Validation

Runtime validation is allowed only at trust boundaries. It must validate into the strict type and fail loudly when invalid.

```ts
export function isWeatherId(value: string): value is WeatherId {
  return WEATHER_IDS.includes(value as WeatherId);
}

export function requireWeatherId(value: string): WeatherId {
  if (isWeatherId(value)) return value;
  throw new Error(`Invalid weather id: ${value}`);
}
```

Prefer existing project guards when available. Do not add silent fallbacks, normalizers, sanitizers, or compatibility adapters to make invalid data pass.

## Modular Top-Level Constants vs Inline Declarations

When declaring or validating literal domain arrays, **ALWAYS** prioritize declaring top-level module constants over cluttering functions with inline `([... ] as const satisfies readonly DomainType[]).includes(...)`.

### Recommended Pattern (Clean Top-Level Constant)

```ts
// Declare at module level
const RAINY_WEATHERS: readonly WeatherId[] = ['rain', 'heavy_rain', 'storm', 'thunderstorm'];

export function isRainy(weather: WeatherId): boolean {
  return RAINY_WEATHERS.includes(weather);
}
```

### Forbidden Cluttered Pattern (DO NOT USE)

```ts
// Anti-pattern: Inline tuple assertion cluttering code logic
export function isRainy(weather: WeatherId): boolean {
  return (['rain', 'heavy_rain', 'storm', 'thunderstorm'] as const satisfies readonly WeatherId[]).includes(weather);
}
```

*Exception*: Inline `[... ] as const` is only acceptable if it is a 1-2 element tiny inline check or in isolated throwaway test files where module-level hoisting provides no readability benefit.

## Forbidden Domain Patterns

Do not use these for finite domains:

- `type X = string`
- `type X = KnownValue | string` (STRICTLY FORBIDDEN: NEVER combine a finite domain type with `| string`. Either a field belongs to a strict finite domain type, or it is truly open dynamic text. Unions like `PokemonMoveId | string` or `GymId | string` are severe anti-patterns that erase compile-time type safety).
- `type X = KnownValue | (string & {})`
- Misusing `// domain-ok` escape hatches on lines containing wildcard uniones (e.g. `field?: DomainType | string; // domain-ok`). The `// domain-ok` annotation is ONLY permitted on fields that represent genuinely open, dynamic human or external text (such as usernames, messages, URLs, descriptions, or raw timestamps).
- `string[]`, `Array<string>`, or `ReadonlyArray<string>` for finite constants.
- `Record<string, T>` for known domain keys.
- `Record<PropertyKey, T>` for known domain keys.
- Open index signatures such as `[key: string]: T`.
- `new Set<string>(...)` to represent or validate a domain.
- `new Map<string, ...>(...)` to represent a domain map.
- Type assertions such as `as DomainId`, `as unknown as Record<...>`, `(OBJ as Record<string, T>)[key]`, `(ARRAY as readonly string[]).includes(...)`, or `as any` to force values into domain contracts or bypass index/inclusion checks during lookup.
- **Tuple Inclusion Cast Prohibition**: Casting tuple constants (e.g. `(REPLAY_SEATS as readonly string[]).includes(val)`) in business logic to bypass TypeScript's tuple inclusion check is STRICTLY FORBIDDEN. Annotate parameters with the domain union type directly (e.g. `val: ReplaySeat`) or encapsulate the check inside a dedicated `isDomainId` type guard.
- **Ad-Hoc String Literal Union Prohibition**: Defining or casting string literal unions inline (e.g. `as 'p1' | 'p2'`, `: 'p1' | 'p2'`, `as 'player' | 'enemy'`) instead of consuming canonical domain types (e.g. `SideID`) is STRICTLY FORBIDDEN. The `validate:domain-types` auditor flags all such occurrences as ERRORs. Whenever a finite domain union is needed, consume or define a named canonical domain type alias exported from `@pkmn/sim` or domain contracts.
- **Helper Cast Wrappers / Anti-Cheat Prohibition**: Creating helper functions, arrow getters, or composables (e.g. `const toPokemon = (d: unknown) => d as unknown as Pokemon // domain-ok`) solely to wrap and conceal double type assertions is STRICTLY FORBIDDEN. Refactor the underlying types using Discriminated Unions (e.g. `type Listing = { type: 'pokemon'; data: Pokemon } | { type: 'item'; data: Item }`) so TypeScript infers types naturally without any casts.

If code seems to need an inline cast (e.g., `(DATABASE as Record<string, T>)[key]`), it means the data boundary lacks a typed accessor helper or boundary guard. Instead of casting inline:

1. Create or export a typed boundary helper/accessor (e.g., `getPokemonCryFilename(speciesId: string): string`).
2. Implement the index check safely inside the data module (using `in`, `isDomainId()`, or `requireDomainId()`).
3. Call the clean helper from business logic without any inline `as` type assertions.


## Generated Data Workflow

When touching generated files or generated domain wrappers:

1. Find the npm script or source script that regenerates the file.
2. Patch the generator template first.
3. Patch the generated output only when needed to keep the working tree consistent.
4. Make generated outputs derive types from their generated JSON/object keys.
5. Avoid making generated wrappers open just because the raw JSON is large.

Examples:

- Asset-generated sprite databases should export template-literal path types or `keyof typeof RAW`.
- Item, move, ability, species, weather, and map databases should derive `ItemId`, `MoveId`, `AbilityId`, `PokemonSpeciesId`, `WeatherId`, or `MapId` from canonical data.
- Validation scripts may use runtime collections internally, but generated source contracts must remain type-first.

## Audit Workflow & Command Reference

The canonical domain type auditor is `scripts/validation/validate_domain_types.ts`. It scans both `src/` and `scripts/` directories automatically.

### Running the Domain Type Auditor

```bash
# Standard in-depth audit across src/ and scripts/
npm run validate:domain-types

# Compact summary mode (shows only violation count breakdowns)
npm run validate:domain-types -- --summary

# Save structured audit report to a file
npm run validate:domain-types -- --output=scratch/domain_types_report.txt

# Direct Node execution with native permissions
node --permission --experimental-strip-types --allow-fs-read=. --allow-fs-write=. scripts/validation/validate_domain_types.ts
```

### Full Verification Pipeline

Always verify domain types as part of the fast verification flow:

```bash
npm run lint
```

1. If generator scripts were touched or generated data was involved, inspect the relevant npm commands in `package.json` and verify the generator template emits strict types.
2. If TypeScript reports call sites passing raw strings, fix the call sites by using the domain type or an explicit boundary guard. Do not relax the domain to make the compiler quiet.

## Review Heuristics

Ask these before accepting a domain design:

- Where is the single source of truth?
- Can TypeScript reject a typo at the call site?
- Will regenerated data preserve this strict type?
- Is this truly open text, or a finite ID pretending to be text?
- Does the type allow missing/default state in exactly one canonical way?
- Is `Partial<Record<...>>` used only because coverage is intentionally partial?
- Are runtime validators failing loudly instead of normalizing or falling back?

## Output Expectations

When reporting work to the user:

- Name the canonical domain types introduced or reused.
- Mention any generator templates audited or changed.
- Report `validate:domain-types` results.
- If strict typing exposes `vue-tsc`/lint errors, describe them as real migration work rather than weakening the domain.
