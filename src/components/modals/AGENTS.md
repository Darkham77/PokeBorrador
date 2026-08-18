# Purpose

Manage the logic and assets of modals.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Live Profile Reactivity**: Profile and trainer modal composables (e.g. `useTrainerProfile`) must dynamically read live active `gameStore.state` for the authenticated user (`isOwnProfile`) rather than static fetched snapshots, ensuring reactive state updates without requiring modal reopen.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- [bc-shop/](./bc-shop/AGENTS.md): Domain module documentation for bc-shop.
- [class/](./class/AGENTS.md): Domain module documentation for class.
- [inventory/](./inventory/AGENTS.md): Domain module documentation for inventory.
- [reputation-shop/](./reputation-shop/AGENTS.md): Domain module documentation for reputation-shop.
- [shop/](./shop/AGENTS.md): Domain module documentation for shop.
- [war-shop/](./war-shop/AGENTS.md): Domain module documentation for war-shop.
