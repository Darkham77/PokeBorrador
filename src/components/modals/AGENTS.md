# Purpose

Manage the logic and assets of modals.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Live Profile Reactivity**: Profile and trainer modal composables (e.g. `useTrainerProfile`) must dynamically read live active `gameStore.state` for the authenticated user (`isOwnProfile`) rather than static fetched snapshots, ensuring reactive state updates without requiring modal reopen.
- **Reusable Modal State Synchronization**: Reusable modal components that remain mounted in the background must synchronize their local state refs on open (`watch(() => props.show)`) and on game state mutations (`watch(() => gameStore.state.<field>)`) rather than relying solely on `onMounted`.
- **Concluded Competition Events & Reward Decoupling**: Global event modals (`WorldEventsModal.vue`) must maintain a dedicated, scrollable history of recent concluded reward-bearing competitions (`PastEventsList.vue`, capped at a maximum of 20 items) displaying podium winners and enabling direct reward claims. Non-competitive/passive bonus events without rewards must be excluded from this history, ensuring players can always inspect results and claim their deserved prizes even after an event's active schedule window has concluded.
- **Event Multi-Category Sub-Competition Slots (`EventCard.vue`)**: Multi-category competitions must render interactive horizontal category slots/tabs (e.g. IVs, Weight, Height) displaying category-specific metrics, registered Pokémon instances, and individual participation actions without modal crowding. Opening Pokémon selection (`PokemonSelection`) MUST pre-filter the user's team and box via `allowedIds` calculated from `isPokemonEligibleForSubCompetition`, preventing the selection of ineligible Pokémon.
- **Canonical Formula Reuse & Zero Logic Duplication in UI Formatters**: Components and cards rendering competition metrics, IV totals, or physical dimensions MUST NOT reimplement manual conditional ladders or hardcoded formulas. They must import and delegate directly to canonical domain functions (`getTierFromTotalIvs` in `@/logic/pokemon/tierEngine`, `getPhysicalDimensionTier` in `@/logic/pokemon/physicalDimensionsMath`). Display formatters must dynamically calculate enriched labels (`186 / 186 IVs (S+)`, `10.5 kg / 11.5 kg (XXL · Titán)`) instead of falling back to legacy raw strings.
- **Modal Lifecycle, Identification & Universal Hierarchy Integration**: All modal components must be registered in `MODAL_REGISTRY` and orchestrated exclusively via `useModalStore().open(name, props)` instead of maintaining bespoke boolean flags in `uiStore`. Modals rendered in `ModalHost` automatically receive stack context from `ModalHierarchyProvider` (`provide('modalId')`), consumed by `BaseModal` (`inject('modalId')`). Modal components MUST define standard `Props { id?: string; show?: boolean }` (with default `show: true`), bind `:show="show"`, and emit `@close`. Hardcoding `:show="true"` or bypassing `props.show` is strictly forbidden.
- **Zero Concurrent Tween Collisions on Modal Opening**: Modal subcomponents (such as inventory item grids or category sidebars) MUST NOT trigger internal GSAP opacity or transform entrance tweens during the modal entrance animation tick. Any watchers handling tab/category resets upon modal opening MUST include an active guard (`if (!props.show) return`) to prevent overriding `BaseModal`'s entrance timeline.

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
