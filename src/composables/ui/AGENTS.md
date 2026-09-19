# Purpose

Manage the logic and assets of ui.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- `useSlotReorder.ts`: Composable managing slot reordering, tap-to-swap lifecycle, in-place replacements, and HTML5 drag-and-drop state without creating empty slots or duplicate entries.
- `useTooltipPosition.ts`: Composable managing dynamic tooltip anchor coordinates, intelligent flipping (`top`, `bottom`, `left`, `right`), horizontal/vertical edge nudging, and strict viewport max-height calculation (`calculateTooltipMaxHeight`). It accounts for safe edge padding (`PADDING_PX = 15`), trigger spacing (`GAP_PX = 12`), wrapper padding/border chrome (`TOOLTIP_CHROME_VERTICAL_PX = 24`), and scales available screen height by `--app-zoom` before converting to internal CSS dimensions.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
