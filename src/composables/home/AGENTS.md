# Purpose

Provide reactive composables for Home view orchestration, widget state management, and collapsible UI state persistence.

## Ownership

Frontend Developers.

## Local Contracts

- **Domain-Type Validation**: All collapsible widgets must register canonical IDs in `HOME_WIDGET_IDS` and be validated with `isHomeWidgetId`.
- **Browser Persistence**: Widget collapsed states must be persisted to browser storage using `safeStorage` under the dedicated key `pokevicio_home_collapsed_widgets`.
- **Module Singleton State**: Collapsed states are shared reactively across widgets and sub-accordions using module-scoped reactive state.
- **Generic Widget Notification Badges (`useHomeWidgetBadges.ts`)**: Generic reactive notification badge computation and dynamic provider registry across all `HomeWidgetId` domains. Publishes counts for pending rewards, active buffs/auras, ready-to-hatch eggs, active world events, daily missions and deployments, GTS market alerts, faction disputes, gym progression, ranked milestones, passive defense status, class mastery rank, and activity notifications.

## Work Guidance

- When adding new widgets or collapsible sections to `HomeView.vue`, declare their domain ID in `HOME_WIDGET_IDS` with strict typing.
- Maintain responsive, accessible controls using `HomeWidgetMinimizeBtn.vue` and `HomeCollapsibleWidget.vue`.
- Expose widget notifications through `useHomeWidgetBadges.ts` or register custom reactive providers via `registerWidgetBadge`.

## Verification

- Run `npx vitest run tests/unit/composables/useHomeWidgetsCollapse.spec.ts` to verify state toggling, defaults, and persistence.
- Run `npx vitest run tests/unit/composables/useHomeWidgetBadges.spec.ts` to verify badge calculations and provider registration.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
