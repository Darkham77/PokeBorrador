# Purpose

This directory contains reusable Vue UI components for both adventure simulation and studio editing workflows.

## Ownership

Game Prototyping / Adventure Suite.

## Local Contracts

- Components in this subtree must remain decoupled from production views in `src/`.
- UI interaction must follow Vue 3 Composition API conventions.

## Key Files

(No top-level code files)

## Work Guidance

- Group components into `adventure/` for in-game mechanics and `studio/` for editor canvas viewports.

## Verification

- `npm run auditor:dox-integrity`

## Child DOX Index

- [adventure/AGENTS.md](./adventure/AGENTS.md): Modal dialogs and in-game exploration overlays.
- [studio/AGENTS.md](./studio/AGENTS.md): Interactive studio viewports, toolbars, and inspection drawers.
