# Purpose

Sub-modals and selectors for trainer class management and stats.

## Ownership

Frontend Developers.

## Local Contracts

- Handles layouts, class descriptions, and nodes rendering for the trainer class tree selection.
- `ClassDashboard.vue`: Class management dashboard displaying trainer avatars (with direct interactive gender selection, locked cooldown states, and confirmation warning), level requirements, bonuses, and class missions. Gender switches are bounded by the 30-day identity cooldown and immediately persist to `gameStore.state.gender` and `gameStore.state.last_renamed_at`.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
