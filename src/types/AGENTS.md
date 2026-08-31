# Purpose

Define and govern the TypeScript types, contracts, and interfaces shared across the application modules.

## Ownership

State & Type Architects.

## Local Contracts

- **Zero-Any Policy**: The use of `any` is strictly forbidden. Custom interfaces or type definitions must be implemented for type safety.
- **Zero-Ignore Policy**: Bypassing checks with `@ts-ignore` or `@ts-nocheck` is strictly forbidden.
- **English ID Identifiers**: All identifiers (`id`) for data structures, inventory, maps, and events must be typed as English strings (no Spanish keys allowed).

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

## Verification

- `npm run audit:warnings-diff` to verify type system compilation and domain compliance.

## Child DOX Index

- [auth/](./auth/AGENTS.md): Domain module documentation for auth.
- [battle/](./battle/AGENTS.md): Domain module documentation for battle.
- [breeding/](./breeding/AGENTS.md): Domain module documentation for breeding.
- [gym/](./gym/AGENTS.md): Domain module documentation for gym.
- [home/](./home/AGENTS.md): Domain module documentation for home.
- [inventory/](./inventory/AGENTS.md): Domain module documentation for inventory.
- [pokemon/](./pokemon/AGENTS.md): Domain module documentation for pokemon.
- [system/](./system/AGENTS.md): Domain module documentation for system.
