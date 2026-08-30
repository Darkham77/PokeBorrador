# Purpose

Manage the logic and assets of modals.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Live Profile Reactivity**: Profile and trainer modal composables (e.g. `useTrainerProfile`) must dynamically read live active `gameStore.state` for the authenticated user (`isOwnProfile`) rather than static fetched snapshots, ensuring reactive state updates without requiring modal reopen.
- **Reusable Modal State Synchronization**: Reusable modal components that remain mounted in the background must synchronize their local state refs on open (`watch(() => props.show)`) and on game state mutations (`watch(() => gameStore.state.<field>)`) rather than relying solely on `onMounted`.
- **Concluded Competition Events & Reward Decoupling**: Global event modals (`WorldEventsModal.vue`) must maintain a dedicated, scrollable history of recent concluded reward-bearing competitions (`PastEventsList.vue`, capped at a maximum of 20 items) displaying podium winners and enabling direct reward claims. If an event is custom or not present in `events_config`, its title must display "Evento desconocido" instead of raw IDs (`custom_XXX`), its schedule must display the full date with day, month, year, and time (`DD/MM/YYYY · HH:mm hs`), and its info button (`ℹ️`) must open `EventDetailModal` when configured or be disabled (`disabled`) when archived/unknown. Non-competitive/passive bonus events without rewards must be excluded from this history, ensuring players can always inspect results and claim their deserved prizes even after an event's active schedule window has concluded.
- **Event Multi-Category Sub-Competition Slots (`EventCard.vue`)**: Multi-category competitions must render interactive category slots: a prominent Global IVs slot at the top, accompanied by species selector tabs for multi-species events to view and register each species' distinct intra-species Weight and Height slots. Opening Pokémon selection (`PokemonSelection`) MUST pre-filter the user's team and box via `allowedIds` calculated from `isPokemonEligibleForSubCompetition` (matching species and excluding Pokémon already enrolled in other categories of the event), preventing the selection of ineligible Pokémon.
- **Event Participant Sprites Pokédex Inspection**: All participant Pokémon sprites and pills rendered across event cards (`EventCard.vue`) and event detail modals (`EventDetailModal.vue`) MUST be interactive (`clickable`) and trigger `useModalStore().open('PokedexDetail', { speciesId, context: 'pokedex' })` on click, allowing users to inspect the species' Pokédex entry, base stats, and details directly from event views.
- **Upcoming 7-Day Schedule Grouping & Visual Dividers**: The 7-day upcoming events schedule (`WorldEventsModal.vue`) must group occurrences by calendar day (`upcomingDayGroups`), rendering same-day events inside a compact list (`gap: 4px`) preceded by a styled day header badge (`HOY · Viernes`, `MAÑANA · Sábado`, etc.) and a gradient divider line separating distinct days.
- **Multi-Species Competition Tabbed Panel Container**: Species selection for physical dimensions (Weight/Height) in `EventCard.vue` must be structured as a unified tabbed panel container (`.species-tabs-panel`), where the tabs strip forms the integrated top header with non-clipped hover effects and smooth horizontal scrolling. Each tab displays an active enrollment checkmark (`✓`) when the user has already entered a Pokémon for that species.
- **Canonical Formula Reuse & Zero Logic Duplication in UI Formatters**: Components and cards rendering competition metrics, IV totals, or physical dimensions MUST NOT reimplement manual conditional ladders or hardcoded formulas. They must import and delegate directly to canonical domain functions (`getTierFromTotalIvs` in `@/logic/pokemon/tierEngine`, `getPhysicalDimensionTier` in `@/logic/pokemon/physicalDimensionsMath`). Display formatters must dynamically calculate enriched labels (`186 / 186 IVs (S+)`, `10.5 kg / 11.5 kg (XXL · Titán)`) instead of falling back to legacy raw strings.
- **Modal Lifecycle, Identification & Universal Hierarchy Integration**: All modal components must be registered in `MODAL_REGISTRY` and orchestrated exclusively via `useModalStore().open(name, props)` instead of maintaining bespoke boolean flags in `uiStore`. Modals rendered in `ModalHost` automatically receive stack context from `ModalHierarchyProvider` (`provide('modalId')`), consumed by `BaseModal` (`inject('modalId')`). Modal components MUST define standard `Props { id?: string; show?: boolean }` (with default `show: true`), bind `:show="show"`, and emit `@close`. Hardcoding `:show="true"` or bypassing `props.show` is strictly forbidden.
- **Zero Concurrent Tween Collisions on Modal Opening**: Modal subcomponents (such as inventory item grids or category sidebars) MUST NOT trigger internal GSAP opacity or transform entrance tweens during the modal entrance animation tick. Any watchers handling tab/category resets upon modal opening MUST include an active guard (`if (!props.show) return`) to prevent overriding `BaseModal`'s entrance timeline.
- **Modal SFC Modularization, CSS Reintegration & Shared Type Contracts**:
  - When modularizing large modal components (>500 LOC) into sub-components (e.g. `WorldEventsUpcomingSchedule.vue`, `EventCategorySlotCard.vue`, `PastEventWinnerItem.vue`), developers MUST ensure 100% CSS and DOM visual parity. Scoped SCSS, mixins (`@include pixelated`), GSAP animation bindings (`v-gsap-nick`), and asset URLs must be strictly preserved or modularized into sub-sheets (`_event_species_tabs.scss`, `_event_category_slots.scss`).
  - Shared data types and interfaces consumed across multiple components or stores MUST be declared in canonical TypeScript contract files under `src/types/` (such as `src/types/system/stores.ts` for `CompetitionParticipant`), strictly prohibiting exporting TypeScript interfaces directly from Vue SFC files (`<script setup>`) to prevent type resolution failures and linter errors.

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
