# Purpose

Manage the logic and assets of inventory.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Dynamic Font Size Calculation (`fitText`)**: Numeric counters in `InventoryPills.vue` (Poké-Pesos, Battle Coins, War Coins) must dynamically downscale font size (`el.style.fontSize`) using empirical DOM `el.scrollWidth > maxW` checks against `parent.clientWidth - PILL_PADDING_SAFETY_PX`. This guarantees that large numbers (e.g. `111.201`, `999.999`) never overflow or truncate their final digits across responsive HUD breakpoints.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
