# TypeScript Conventions & Data Integrity Rules

> **Scope & Authority**: This document governs **compiler integrity, domain type enforcement, typed JSON wrappers, Java-style strict typing, zero-hiding security policies, and Fallow health governance (≥85/100)** across Poké Vicio.
>
> 🛑 **Domain Boundaries & Redirection**:
> - For full domain typing methodology and union derivation principles ➔ See [@/domain-type-first](../../../domain-type-first/SKILL.md).
> - For database schemas, Valibot parsing, and SQLite/Supabase DTOs ➔ See [Database & Persistence](./database_and_persistence.md) and [Save System Manual](../technical/save_system_manual.md).
> - For game engine states and constants ➔ See [Game Engine & State](./game_engine_and_state.md).

---

## 1. Zero-Ignore & Zero-Any Policies

- **Zero-Ignore Policy**: The use of `@ts-ignore`, `@ts-nocheck`, or any variant that bypasses TypeScript compiler checks is STRICTLY FORBIDDEN.
- **Zero-Any Policy**: The use of `any` is STRICTLY FORBIDDEN. This integrity is absolute: no `any` is allowed anywhere, including Web Workers (`showdown.worker.ts`), orchestrators, and E2E simulation files. All payloads, window objects, and intermediate states must have dedicated interfaces or be imported from their respective packages (such as `@pkmn/sim`).
- **No Type Assertions (`as ...`) Bypasses**: Using type assertions (`as Type`, `as PokemonStatus`, `as Move`, `as unknown as T`) to bypass compiler checks, evade strict schema validation, or force invalid objects into interfaces is STRICTLY PROHIBITED. Creating helper functions, getters, or composables solely to wrap and hide double casts (e.g., `const toPokemon = (d: unknown) => d as unknown as Pokemon // domain-ok`) is considered a severe anti-pattern — types MUST be properly declared using Discriminated Unions or explicit interfaces instead. All data boundaries (Web Workers, DB Router, Showdown Bridge) MUST use explicit boundary adapter functions instead of type casts.

## 2. Domain-Type-First Governance

- **Strict Type-First Mandate**: Every data type, domain constant, schema, DTO, or boundary contract MUST strictly follow the `@/domain-type-first` skill (`.agents/skills/domain-type-first/SKILL.md`). Unconstrained raw `string` declarations for finite domains, open index signatures (`[key: string]: unknown`), wildcard unions (`| string`), open sets/maps (`new Set<string>()`/`new Map()`), and inline type casts are STRICTLY FORBIDDEN.
- **No Naked Strings for Finite Domains**: It is STRICTLY FORBIDDEN to declare any field, parameter, or constant with type `string` when its value belongs to a finite domain. The domain type MUST be declared FIRST (via `as const` + `keyof`, `(typeof ARRAY)[number]`, or explicit union), and used at every declaration and call site.
  - Examples of domains requiring strict types: Pokémon natures (`NatureId`), Pokémon types (`PokemonType`), battle weather mechanics (`WeatherMechanical`), NPC archetypes (`NpcArchetype`), player classes (`PlayerClassId`), ranked tiers (`RankedTierId`), item categories, obtained methods (`ObtainedMethod`), volatile status keys (`VolatileStatusKey`), move categories, stat names, faction IDs (`FactionId`), mission IDs (`MissionId`).
- **Explicit Domain CSS Classes**: Never use runtime casing conversions (such as `:class="'prefix-' + id.toLowerCase()"`) in Vue templates or UI bindings to resolve CSS classes. Domain types and tier objects must explicitly declare and export typed `cssClass` properties matching exact stylesheet selectors to maintain compile-time type safety.
- **Absolute Prohibition on Ad-Hoc String Literal Unions**: Defining or casting string literal unions inline (e.g. `as 'p1' | 'p2'`, `: 'p1' | 'p2'`, `as 'player' | 'enemy'`) instead of consuming canonical domain types (e.g. `SideID`) is STRICTLY FORBIDDEN. The `npm run validate:domain-types` script audits all files and fails with ERROR when any ad-hoc literal union is used. Whenever a finite domain union is needed, consume or define a named canonical domain type alias exported from `@pkmn/sim` or domain contracts.
- **Absolute Prohibition on `Set`/`Map` for Domain Types**: It is STRICTLY FORBIDDEN to use `new Set<string>()`, `new Map()`, or any other mutable runtime data structure to represent or validate a finite domain of string values. The canonical pattern is:
  1. `export const MY_DOMAIN = ['a', 'b', 'c'] as const;`
  2. `export type MyDomain = (typeof MY_DOMAIN)[number];`
  3. Runtime validation via `(MY_DOMAIN as readonly string[]).includes(raw)`.
- **Strict Overload Signatures on Multi-Domain Resolvers & Routers**: Any centralized dispatcher, router, or resolver accepting a category discriminator (e.g. `getAssetUrl(type, rawId)`) MUST declare strict TypeScript function overloads linking each category to its canonical domain union (`ItemId`, `PokemonSpeciesId`, `MapRouteId`, `GymId`, etc.). Generic `(type: string, id: string | number)` declarations without domain overloads are strictly prohibited to prevent typos from bypassing compile-time checks.
- **Semantic Constant Naming & Value-Hardcoding Prohibition (`badConstantNames`)**: Constants declared to eliminate magic numbers MUST be named after their domain purpose or semantic role (e.g. `ARCHAEOLOGY_CAVE_BASE_WEIGHT`, `DEFAULT_DEBUG_FRIENDSHIP`). Including current numeric values in constant identifiers (e.g. `ARCHAEOLOGY_CAVE_BASE_WEIGHT_10`, `FRIENDSHIP_70`) is strictly prohibited as an anti-pattern. String literals containing formatting, fractions, or regex helpers (e.g. `"random(-10, 10)"`, `"1/16 HP"`) MUST be marked with `// no-magic` at line end.

  > ⚠️ **Anti-Cheat Rule**: `// magic-ok`, `// no-magic`, and `// number-ok` are escape hatches for **genuinely un-nameable** values only. Using them to suppress domain thresholds (probability cutoffs, costs, timings, stat floors) instead of declaring proper constants is **strictly forbidden** and considered cheating the auditor.

  **✅ ALLOWED (Genuinely Un-nameable Values):**
  - GSAP string helpers with embedded math: `"random(-10, 10)"`
  - Template strings embedding percentages/text: `"1/16 HP por turno"`
  - Rendering math formula coefficients: `(0.7 + seed * 0.8) * factor // magic-ok`
  - Nearest-match search sentinels: `let minDiff = 11 // magic-ok`
  - One-off shake keyframes in GSAP chains: `{ x: -4 }, { x: 4 } // magic-ok`

  **❌ FORBIDDEN (Domain Values That MUST Be Declared As Constants):**
  - Game probability thresholds: `if (randRoll < 10) diff = 'easy'` ➔ `const DIFF_EASY_THRESHOLD = 10`
  - Game economy values (costs, rewards): `cost: 5000` ➔ `const MISSION_6H_COST = 5_000`
  - Sleep/delay durations in application code: `await sleep(1000)` ➔ `const TRANSITION_DELAY_MS = 1_000`
  - Stat floor/ceiling business values: `ivFloor: 5` ➔ `const MISSION_6H_IV_FLOOR = 5`
  - Clamping bounds from game design: `Math.min(STAGE_MAX_BOUND, ...)` with undeclared bounds
- **Strict Data Schema & Zero-Ambiguity Rule**: It is STRICTLY FORBIDDEN to define ambiguous union types that mix multiple representations of missing or default data (e.g. mixing `''` and `null` in the same type definition for the same context). All domain types MUST follow single canonical representations.
- **Java-Style Strict Typing Mandate**:
  1. **Canonical Return Types (`mandatoryExplicitReturnTypes`)**: Exported functions, composables, and store methods MUST declare an explicit return type annotation (`: ReturnType`).
  2. **No Anonymous Inline Object Parameters (`noInlineAnonymousObjectTypes`)**: Function parameters MUST consume named `interface` or `type` contracts instead of inline anonymous `{ id: string }` shapes.
  3. **Exhaustive Switch Checking (`exhaustiveSwitchCheck`)**: Switches on domain unions MUST include exhaustiveness verification (`default: const _ex: never = val;`).
  4. **Strict Catch Narrowing (`strictCatchTypeNarrowing`)**: Accessing `.message` or `.code` on `catch (err)` variables without explicit narrowing (`if (err instanceof Error)`) is strictly forbidden.
  5. **Guarded Dynamic Indexing (`noUntypedDynamicIndex`)**: Dynamic bracket access `obj[key]` requires `key` to be a domain union or guarded with `in` / `isDomainId()`.
  6. **Typed Positional Tuples (`noLoosePositionalTuples`)**: Functions returning multi-element arrays MUST annotate explicit tuple return types (`: readonly [T1, T2]`) or `as const`.
  7. **Floating Promise Guard (`noFloatingPromises`)**: Async function calls MUST be explicitly handled with `await`, `void`, or `.catch()`.
  8. **Module Global State Guard (`noLeakedGlobalState`)**: Top-level `let`/`var` variables at module scope are prohibited outside of Pinia stores or classes (`// singleton-ok`).
  9. **Hot-Path Import Guard (`noDynamicImportInHotPath`)**: Dynamic `import()` inside loops, Vue computed properties, or GSAP timelines is prohibited to prevent combat animation jank.

## 3. Mandatory Typed Domain Data Wrappers for JSON Files

- It is STRICTLY FORBIDDEN to directly import raw `.json` files containing domain entities (items, species, abilities, moves, sets) in business logic, UI components, workers, or test scripts.
- Every `.json` data file MUST be imported and wrapped by a co-located TypeScript Data Wrapper module (e.g., `randomSetsData.ts`, `animatedSpriteData.ts`) that exports constants bounded by strict TypeScript domain union types (`ItemId`, `PokemonSpeciesId`, `AbilityId`, `PokemonMoveId`). Direct imports of un-typed JSON files will result in build failure.

## 4. Strict Zero-Hiding Security Mandate

- It is STRICTLY FORBIDDEN to suppress, hide, ignore, or bypass security vulnerabilities or audit errors (such as CWE path traversals, SSRF risks, or untrusted inputs) using ignore files (`.fallowrc.json`), inline comments (such as `// fallow-ignore-file security-sink` or `// fallow-ignore`), or configuration exclusions instead of fixing them at the code level.
- Using comments to silence security scanners is strictly prohibited. Every security finding detected by audit tools MUST be resolved at its source by implementing strict input validation, path sanitization (rejecting `..` and resolving absolute paths), and explicit boundary checks.

## 5. Fallow Configuration Maintenance & Health Score Mandate (Minimum 85/100)

- **Mandatory Score**: The overall codebase health score computed by Fallow (`npm run fallow:health`) MUST be at least **85/100**. Scores below 85 are strictly non-compliant.
- **Hotspot Optimization**: Whenever the score drops below 85, developers and AI agents MUST inspect Fallow's targets (`npm run fallow:health`), eliminate dead code, lower function/module complexity, and refactor iteratively until the score is strictly 85 or higher.
- **Pre-Commit Hygiene**: All structural complexity, unused variables, dead code, and duplication flagged by Fallow must be addressed before commits.
- **Config Maintenance**: When refactoring files, changing directory structures, or renaming modules, update `.fallowrc.json` (especially `ignoreExports` paths) to reflect the new paths, preventing stale references.

## 6. Strict Zero Error Suppression Mandate

- It is STRICTLY FORBIDDEN to hide, swallow, mask, or bypass errors using:
  - Ad-hoc silent truncations or arbitrary data cropping (e.g., arbitrarily truncating image frames or strings to avoid format errors).
  - Silent mock fallbacks or fake default objects (e.g., returning `{ feetY: 0.9, feetX: 0.5 }` instead of resolving canonical coordinates).
  - Empty `catch` blocks or silent swallowing of unexpected exceptions.
- **Fail Loudly & At the Source**: When assets, schemas, simulation steps, or domain invariants violate rules or technical limits, the code MUST throw an explicit, descriptive error immediately (`throw new Error(...)`) so the issue is resolved at the source (asset generation, fuzzer setup, or canonical database).

## 7. External Repositories Exclusion

- External reference codebases live under `external/` (e.g. `external/pokemon-showdown-code/`, `external/pokemon-showdown-ai/`).
- This entire directory MUST be completely excluded from project code audits, type-checking scopes, linting, and DOX documentation requirements. The `external/` entry is configured in `IGNORE_DIRS` in audit scripts and in ESLint/Fallow ignore patterns.

## 8. Node.js 26+ Modernization & Script Rules

- **Temporal Usage**: Use `Temporal` instead of `Date` for engine logic.
- **Node Imports**: Mandatory use of `node:` prefix for built-in imports (e.g. `import path from 'node:path'`).
- **CLI Flag Parsing**: All utility, database, and maintenance scripts accepting arguments MUST use `import { parseArgs } from 'node:util'` with explicit option dictionaries. Positional arguments without flag names are strictly prohibited.
- **Permission Model**: Utility scripts must use the Node.js 26 Permission Model (`--permission`). All maintenance scripts in `package.json` like `audit:fix` MUST use `--allow-fs-read=*` to allow reading `node_modules` and external dependencies across the filesystem.
- **Explicit Resource Management**: Mandatory use of `using` for file handles and database connections in Node scripts.
- **Native Test & Timer Promises**: Prefer `node:test` for pure logic unit tests (non-browser). Prefer `node:timers/promises` for delays in utility/maintenance scripts (Note: 0 timers remain strictly enforced in client/game logic).
- **Node.js 26 Native TypeScript Extension Standards**: When importing relative TypeScript modules within `scripts/` or `database/` executed directly via Node.js 26 (`--experimental-strip-types`), import paths MUST explicitly use the `.ts` extension (e.g., `import { foo } from './helpers.ts'`). Never use legacy `.js` aliases or omitted extensions in direct script execution.

## 9. Cross-Platform Path Standard

- For converting platform-specific filesystem paths (e.g., from `path.relative`) to POSIX format (such as browser URLs, assets keys, database indexes), you MUST use native split/join operations with separator tokens (`relPath.split(path.sep).join(path.posix.sep)`) instead of regex expressions or simple replace statements. This ensures generated files remain identical across Windows, Linux, and macOS.

## 10. Strict Schema Governance & Zero Optional Mandate for Domain Entities

- **No `optional()` on Intrinsically Mandatory Domain Fields**: Fields that are conceptually mandatory or part of core domain entities (e.g., `isShiny: boolean`, `uid: string`, `expNeeded: number`, `ready: boolean`, `status: PokemonStatus`) MUST NEVER be defined with `optional()` or `fallback()` in Valibot schemas or TypeScript domain contracts.
- **Static Migration Backfill Requirement**: If historical data lacks mandatory fields, the schema MUST NOT be relaxed to accommodate the omission. Instead, a static database migration MUST be authored in SQL to backfill canonical default values for all existing records.
- **Single Canonical Sentinel Policy**: Ambiguous or mixed sentinels (such as mixing `null`, `undefined`, and `''` for empty states) are strictly forbidden. For example, Pokémon status MUST strictly use empty string `''` as the sole canonical sentinel for un-afflicted status, preserving 1:1 parity with the Pokémon Showdown engine (`PokemonStatus`).


