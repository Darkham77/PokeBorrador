# Purpose

Encapsulate reactive navigation state, notifications, tooltips, and GSAP dropdown animations.

## Ownership

Frontend Developers.

## Local Contracts

- Follow Composition API standards.
- Use GSAP for all transition animations.
- **Mathematical Notification Badge & Breakdown Parity**: The total badge counter (`totalHomeNotifications`) MUST strictly match the sum of items displayed across notification tooltip breakdown lines.
- **Granular Claim & Legacy Discard Categorization**: Breakdowns must account for all actionable notification states, including legacy discardable rewards (`isLegacy: true`), and must strictly differentiate GTS claim types (sales proceeds, purchased items/Pokémon, cancellation returns, and trade completions) rather than generic return labels.

## Work Guidance

- Maintain unitless animation parameters and coordinate lifecycle state with useUIStore.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
