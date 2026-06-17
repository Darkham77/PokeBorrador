# Purpose

Extract reusable, reactive view logic, state interactions, and lifecycles out of Vue views.

## Ownership

Frontend Developers.

## Local Contracts

- **Composition API Standard**: All composables must adhere to standard Vue 3 Composition API rules, wrapping states in reactive hooks.
- **GSAP Orchestration Protocol**: Composables that execute visual transitions must use native GSAP orchestration features and deterministic triggers (`onComplete`, timeline sequencing) instead of numerical `setTimeout` delays.

## Work Guidance

- Ensure that any dynamic coordinate variables returned by positioning composables are exposed as unitless numbers (relying on CSS calc multiplication for unit conversions).
- Clean up window events, resize hooks, and observers inside composables using `onUnmounted` or correct lifecycle hooks to prevent memory leaks.

## Child DOX Index

- [adventure/](./adventure/): World movement, simulations, camera coordinates tracking, and layout scales.
- [map/](./map/): Map card animations and sprite observers.
- [modals/](./modals/): Interactive modal triggers and queue handlers.
