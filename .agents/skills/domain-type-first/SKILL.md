---
name: domain-type-first
description: Use this skill whenever creating, modifying, reviewing, or generating a data type, domain type, finite constant list, interface field, DTO, data contract, generated database wrapper, validation script, or any code that represents a finite set of values. This skill MUST trigger for phrases such as "tipo de dato", "domain type", "data type", "constants", "ids", "status", "category", "mode", "kind", "type", "Record", "Set", "Map", "array of strings", generated JSON/TS databases, asset-generated databases, or npm scripts that regenerate data. It forces type-first design using strict TypeScript unions derived from canonical data and prevents loose runtime structures from becoming accidental domain contracts.
---

# Domain Type First

Use this skill before writing or editing any code that introduces, changes, or consumes a finite data domain.

The goal is simple: invalid domain values should fail at compile time. If TypeScript accepts an invalid value, the domain was designed incorrectly.

## Trigger Checklist

Apply this workflow when the task involves any of these:

- A new `type`, `interface`, DTO, schema, store state, generated wrapper, or data contract.
- Finite IDs such as Pokemon species, moves, abilities, items, maps, trainers, factions, statuses, weather, ranks, categories, modes, slots, phases, classes, tables, or routes.
- Constants declared as arrays, sets, maps, records, or object dictionaries.
- Generated data under `src/data/**`, generated wrappers from JSON, or npm scripts that regenerate source/data files.
- Validation logic for values that come from JSON, assets, saves, workers, APIs, or external payloads.
- Review/audit findings from `npm run validate:domain-types`.

If it is finite, design the domain type first.

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

## Audit Workflow

Before finishing a task that creates or modifies domain data:

## Ad-Hoc String Literal Union Auditor (`P_TYPECAST_STRING_UNION` & `P_AD_HOC_STRING_UNION_ANNOTATION`)

- **Purpose**: Detects inline string literal union casts (`as 'p1' | 'p2'`, `as 'player' | 'enemy'`) and inline string union type annotations (`: 'p1' | 'p2'`, `: 'player' | 'enemy'`) defined ad-hoc across files instead of consuming canonical domain types (e.g., `SideID` from `@pkmn/sim` or `BattleSide` from `@/types/battle/battle`).
- **Enforcement**: Integrated into both `scripts/validation/validate_domain_types.ts` (`npm run validate:domain-types`) and `.agents/skills/domain-type-first/scripts/audit_domain_types_portable.mjs`.
- **Severity**: `ERROR`. Flags every inline seat or combatant union assertion or parameter annotation as an error.
- **Resolution**:
  1. Replace inline `: 'player' | 'enemy'` parameter or property annotations with canonical `BattleSide`.
  2. Replace inline `: 'p1' | 'p2'` worker/engine annotations with `SideID`.
  3. Replace inline `as 'player' | 'enemy'` or `as 'p1' | 'p2'` casts with `as BattleSide` or `as SideID`.

1. Search for loose patterns in touched files:

```bash
rg -n "type .* = string|\\| string|string & \\{\\}|Record<string|Record<PropertyKey|\\[.*: string\\]|new Set|new Map|string\\[\\]|Array<string>|ReadonlyArray<string>|as\\s+['\"\`]p1['\"\`]|:\\s*['\"\`]player['\"\`]" <touched paths>
```

2. Run the project validator:

```bash
npm run validate:domain-types -- --errors-only --summary
```

3. If the target project does not have `validate:domain-types`, run the synchronized portable audit script from this skill:

```bash
node .agents/skills/domain-type-first/scripts/audit_domain_types_portable.mjs src --errors-only --summary
```

When using the skill outside this repository, copy `scripts/audit_domain_types_portable.mjs` into the target repo or run it directly from the skill directory with the target source roots as arguments. The script is dependency-free and accepts `--errors-only`, `--summary`/`-s`, and `--output=<path>`.

The portable script `.agents/skills/domain-type-first/scripts/audit_domain_types_portable.mjs` MUST remain synchronized 1:1 in AST patterns and severities with `scripts/validation/validate_domain_types.ts`.

4. If generator scripts were touched or generated data was involved, inspect the relevant npm commands in `package.json` and verify the generator template emits strict types.

5. If TypeScript now reports call sites passing raw strings, fix the call sites by using the domain type or an explicit boundary guard. Do not relax the domain to make the compiler quiet.

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
