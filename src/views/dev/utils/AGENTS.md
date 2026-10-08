# Purpose

Utility helpers supporting developer-facing diagnostic tools and editors in `src/views/dev/`.

## Ownership

Frontend Core & Diagnostic Tooling Team.

## Local Contracts

- **Clipboard Resilience**: Clipboard operations in `shadowEditorClipboard.ts` MUST support both standard asynchronous Web API (`navigator.clipboard`) and synchronous in-memory fallback to guarantee deterministic behavior in automated headless tests and non-HTTPS local environments.
- **Strict Decimal Sanitation**: Number parsing from raw clipboard strings MUST sanitize commas into decimal points before numeric conversion (`.replace(',', '.')`) and clamp coordinates strictly to valid intervals.
- **Shadow Editor Catalog Builder (`shadowEditorCatalogHelpers.ts`)**: Modular entity catalog assembly (intercalated Pokémon Front/Back sprites, female variants, NPC full-body sprites, and Player/Trainer sprites) is decoupled from the composable state into pure lookup helpers to uphold modularity and minimal complexity.
- **Zero Production Leaks**: These utilities are intended strictly for dev-only views and test fixtures.

## Key Files

- [`shadowEditorCatalogHelpers.ts`](./shadowEditorCatalogHelpers.ts): Module implementation.
- [`shadowEditorClipboard.ts`](./shadowEditorClipboard.ts): Module implementation.

## Work Guidance

- Keep clipboard utilities pure, portable, and free of framework state dependencies.
- Provide explicit reset and peek methods for deterministic unit testing.

## Verification

- `npm run lint`
- `npm run auditor`
- `tests/unit/dev/shadow_editor.spec.ts`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
