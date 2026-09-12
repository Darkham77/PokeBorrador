# Purpose

Manage the logic and assets of events.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Strict compliance with [ui_ux_standards.md](../../../.agents/skills/project-standards/references/core/ui_ux_standards.md).
- Zero template-level fallbacks for domain asset IDs: visual event components rely exclusively on fully validated store models guaranteed by store-level integrity guards.
- **Official Tooltip Component Mandate (`<PVTooltip>`)**: Native HTML `title="..."` attributes are strictly prohibited in Vue UI templates. All interactive chips, badges, participant icons, and action buttons requiring tooltips MUST wrap elements using the project's official `<PVTooltip :title="..." :description="...">` component.
- **Class Deployment Rules & Multi-Reward Transparency**: Mission cards representing class deployments (`EventMissions.vue`, `MissionCard.vue`) MUST provide explicit `rulesText` explaining the exact mechanics/sacrifices and an itemized `rewardsList` with individual `<PVTooltip>` wrappers, official item sprites (`getAssetUrl(ASSET_TYPES.ITEM, id)`), and descriptive tooltip text instead of generic placeholder text.
- **SSoT Event Name Reusability**: Event banners (`EventPendingAwardsBanner.vue`) and mission lists MUST use `getEventDisplayName` to guarantee 1:1 visual parity with active event cards and database weekly rotations.
- **Bounded Dynamic Collection Heights**: Variable-length reward collections (such as pending awards) must enforce a bounded `max-height` (e.g., `280px`) with custom retro scrollbar and `overflow-y: auto` to prevent unbounded vertical stretch in dashboards and modals.
- **GSAP Hover Inline Style Isolation**: When animating interactive elements (buttons, cards, badges) with GSAP on hover, avoid setting inline `backgroundColor` or `borderColor` without `clearProps: 'transform,scale,backgroundColor,background,borderColor'` on `mouseleave`. Always prioritize delegating color and background transitions to component CSS classes to prevent specificity collisions with conditional modifier classes like `.only-action`.
- **Sub-Competition Award Specificity & Semantic Badging (`EventPendingAwardsBanner.vue`)**: Award banners representing pending competition rewards MUST display the clean event name alongside a dedicated category pill with its resolved semantic metric icon (`resolveAwardCategory`), strictly prohibiting duplicating category names inside the event title text and forbidding ambiguous fallback labels.
- **Multi-Species Competition Tabs (`EventCardCategoryPreview.vue`)**: Multi-species competition event cards MUST render species selection micro-tabs (`.species-tabs-container`) with responsive wrapping (`flex-wrap: wrap`), species mini-sprites, and completion check pills (`✓`) to maintain a bounded preview height and prevent card elongation in dashboards.
- **Class Deployment Permanent Sacrifices vs. Returns Clarity**: Rocket deployments represent permanent transfers / black market sacrifices; descriptions and requirements MUST explicitly state that the Pokémon is lost permanently (does not return) while equipped held items safely return to the bag. Other class deployments (Trainer sparring, Breeder incubation) return the Pokémon with earned experience, level-ups, or genetic IV enhancements.
- **Clean Item Reward Labels & Zero Category Slash Ambiguity**: Item reward tags in mission cards and dialogs MUST display direct, unambiguous names and quantities (e.g. `1x Master Ball`, `1x Maxi Pepita`, `1x Pepita de Oro`), strictly avoiding confusing slash-category annotations (such as `Master Ball / Cápsulas` or `Maxi Pepita / Tesoros`).
- **Responsive Mission Header Actions**: When displaying counter badges alongside action buttons in compact headers (`EventMissions.vue`, `HomeView.vue`), verbose label prefixes (such as `"Refrescos: "`) MUST be wrapped in responsive classes (e.g. `.refresh-label`) and hidden at mobile breakpoints (`@media (max-width: 640px)`) to display only the compact numeric ratio (`3/3`), preventing action buttons from overflowing card boundaries.
- **Zero Duplicate Reward Data in Active Deployments Mandate (`MissionCard.vue`, `EventMissions.vue`)**:
  - When a deployment or mission card renders an itemized detailed breakdown (`RECOMPENSAS DETALLADAS` via `rewardsList`), the active operation status box (`.active-operation-box`) MUST NEVER render a plain-text duplicate summary of the same rewards (`BOTÍN FIJADO: ...`).
  - The operation box is reserved strictly for operational progress: status title, countdown timer, progress bar, and assigned entity.
  - Dynamically calculated or fixed reward values (such as money calculated from delivered Pokémon IVs/levels in Team Rocket deployments) MUST be injected directly into the corresponding item within `rewardsList` (e.g. `₽21.295 (Fijado)` with updated tooltip explanation), maintaining a single source of truth for rewards without redundant text duplication.

## Work Guidance

- Mission and event cards must receive 100% valid entities from stores. If a required property (such as `trainerSprite` or `targetId`) is missing, fail loudly via asset validation rather than silently substituting default placeholders in the template.
- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
