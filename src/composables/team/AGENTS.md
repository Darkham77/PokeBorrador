# Purpose

Manage reusable team state, format assembly, and slot manipulation composables.

## Ownership

Frontend Developers / Team Management Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- Adhere strictly to the 500/1000 SLOC Single Responsibility Principle (SRP).

## Work Guidance

- Ensure clean decoupling between Vue presentation modals (`TeamManagementModal.vue`) and business logic.
- Manage format rules (Adventure, 3v3 PvP, 6v6 PvP, Faction War) through centralized composables.

## Verification

- Run `npm run lint`.
- Run `npm run test:unit`.
- Run `npm run audit:dox`.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
