# Purpose

Manage the logic and assets of events.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Strict compliance with [ui_ux_standards.md](../../../.agents/skills/project-standards/references/core/ui_ux_standards.md).
- Zero template-level fallbacks for domain asset IDs: visual event components rely exclusively on fully validated store models guaranteed by store-level integrity guards.
- **Official Tooltip Component Mandate (`<PVTooltip>`)**: Native HTML `title="..."` attributes are strictly prohibited in Vue UI templates. All interactive chips, badges, participant icons, and action buttons requiring tooltips MUST wrap elements using the project's official `<PVTooltip :title="..." :description="...">` component.
- **SSoT Event Name Reusability**: Event banners (`EventPendingAwardsBanner.vue`) and mission lists MUST use `getEventDisplayName` to guarantee 1:1 visual parity with active event cards and database weekly rotations.
- **Bounded Dynamic Collection Heights**: Variable-length reward collections (such as pending awards) must enforce a bounded `max-height` (e.g., `280px`) with custom retro scrollbar and `overflow-y: auto` to prevent unbounded vertical stretch in dashboards and modals.
- **GSAP Hover Inline Style Isolation**: When animating interactive elements (buttons, cards, badges) with GSAP on hover, avoid setting inline `backgroundColor` or `borderColor` without `clearProps: 'transform,scale,backgroundColor,background,borderColor'` on `mouseleave`. Always prioritize delegating color and background transitions to component CSS classes to prevent specificity collisions with conditional modifier classes like `.only-action`.

## Work Guidance

- Mission and event cards must receive 100% valid entities from stores. If a required property (such as `trainerSprite` or `targetId`) is missing, fail loudly via asset validation rather than silently substituting default placeholders in the template.
- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
