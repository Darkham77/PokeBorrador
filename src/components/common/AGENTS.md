# Purpose

Manage the logic and assets of common.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Tooltip Wrapper Alignment in Flex Containers**: When consuming `PVTooltip` inside flex container layouts (e.g., vertical lists with `flex-direction: column`), parent containers MUST explicitly declare cross-axis alignment (`align-items: flex-start;` or similar) if child elements have dynamic intrinsic widths. This prevents the default `stretch` behavior from causing `.pv-tooltip-wrapper`'s internal `justify-content: center !important;` from misaligning shorter sibling elements.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
