# Purpose

Define canonical TypeScript contracts and interfaces for centralized reward systems across the game.

## Ownership

State & Type Architects / Frontend Developers.

## Local Contracts

- **Canonical `as const` Unions**: Reward source categories must be derived from `UNIFIED_REWARD_SOURCES` via `(typeof UNIFIED_REWARD_SOURCES)[number]`.
- **Zero-Any Policy**: Reward items must be strictly typed via `UnifiedRewardItem` and `UnifiedRewardsSummary`.

## Work Guidance

- Ensure all dynamic open-text fields are documented with `// domain-ok: Open dynamic text or non-domain string payload`.
- Keep contracts pure, minimal, and fully decoupled from Vue rendering code.

## Verification

- Run `npm run validate:domain-types` and `npm run validate:types` to verify type compliance.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
