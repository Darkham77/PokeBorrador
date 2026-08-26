# Purpose

Manage the logic and assets of modals.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Live Profile Reactivity**: Profile and trainer modal composables (e.g. `useTrainerProfile`) must dynamically read live active `gameStore.state` for the authenticated user (`isOwnProfile`) rather than static fetched snapshots, ensuring reactive state updates without requiring modal reopen.
- **Reusable Modal State Synchronization**: Reusable modal components that remain mounted in the background must synchronize their local state refs on open (`watch(() => props.show)`) and on game state mutations (`watch(() => gameStore.state.<field>)`) rather than relying solely on `onMounted`.
- **Concluded Competition Events & Reward Decoupling**: Global event modals (`WorldEventsModal.vue`) must maintain a dedicated, scrollable history of recent concluded reward-bearing competitions (`PastEventsList.vue`, capped at a maximum of 10 items) displaying podium winners and enabling direct reward claims. Non-competitive/passive bonus events without rewards must be excluded from this history, ensuring players can always inspect results and claim their deserved prizes even after an event's active schedule window has concluded.

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
