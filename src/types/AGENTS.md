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

## Verification

- `npm run lint` or `vue-tsc --noEmit` to verify type system compilation.

## Child DOX Index

- [auth/](./auth/AGENTS.md): Authentication type definitions.
- [battle/](./battle/AGENTS.md): Battle engine data structures and configurations.
- [breeding/](./breeding/AGENTS.md): Daycare and cloning formulas parameters.
- [gym/](./gym/AGENTS.md): Gym metrics and rematch types.
- [inventory/](./inventory/AGENTS.md): Item structures.
- [pokemon/](./pokemon/AGENTS.md): Pokemon factory objects.
- [system/](./system/AGENTS.md): Database, environment config, and application store mappings.
