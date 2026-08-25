# Purpose

Manage the logic and assets of events.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Strict compliance with [ui_ux_standards.md](../../../.agents/skills/project-standards/references/core/ui_ux_standards.md).
- Zero template-level fallbacks for domain asset IDs: visual event components rely exclusively on fully validated store models guaranteed by store-level integrity guards.

## Work Guidance

- Mission and event cards must receive 100% valid entities from stores. If a required property (such as `trainerSprite` or `targetId`) is missing, fail loudly via asset validation rather than silently substituting default placeholders in the template.
- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
