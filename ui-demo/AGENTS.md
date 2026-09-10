# Purpose

Root directory for the UI-Demo subproject, providing an isolated interactive sandbox and technical showcase for retro-modern pixelated UI controls, themes, and official game components.

## Ownership

Frontend / UI Engineers.

## Local Contracts

- Executable via `npm run ui-demo`.
- Strictly reuses and extends official game components from `src/` without duplicating business logic or styles.
- Complies with all repository auditors, ESLint rules, and type checks.
- Zero-timer event synchronization and GSAP-only animations.

## Work Guidance

- Entry point: `index.html` mounts `src/main.ts`.
- Run locally with `npm run ui-demo`.
- All subdirectories must maintain their own DOX `AGENTS.md` file.

## Verification

- `npm run lint`
- `npm run audit`

## DOX Directory Navigation Index

- [src/AGENTS.md](./src/AGENTS.md): UI-Demo application source code and root layout.
