# Purpose

Manage the logic and assets of ui.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- `useSlotReorder.ts`: Composable managing slot reordering, tap-to-swap lifecycle, in-place replacements, and HTML5 drag-and-drop state without creating empty slots or duplicate entries.
- `useTooltipPosition.ts`: Composable managing dynamic tooltip anchor coordinates, intelligent flipping (`top`, `bottom`, `left`, `right`), horizontal/vertical edge nudging, and strict viewport max-height calculation (`calculateTooltipMaxHeight`). It accounts for safe edge padding (`PADDING_PX = 15`), trigger spacing (`GAP_PX = 12`), wrapper padding/border chrome (`TOOLTIP_CHROME_VERTICAL_PX = 24`), and scales available screen height by `--app-zoom` before converting to internal CSS dimensions.

## Key Files

- `useBodyClass.ts`: Module implementation.
- `useElementVisibility.ts`: Module implementation.
- `useGameAnnouncer.ts`: Module implementation.
- `useGridTransitions.ts`: Module implementation.
- `useGsapTransition.ts`: Module implementation.
- `useInputAnimations.ts`: Module implementation.
- `useMainLayout.ts`: Module implementation.
- `useStatHover.ts`: Module implementation.
- `useVirtualPosition.ts`: Module implementation.
- `useWindowListener.ts`: Module implementation.
- [`useSlotReorder.ts`](./useSlotReorder.ts): Module implementation.
- [`useTooltipPosition.ts`](./useTooltipPosition.ts): Module implementation.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
