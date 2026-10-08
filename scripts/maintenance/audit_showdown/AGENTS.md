# Purpose

Audit scripts and DOX integrity verification tools.

## Ownership

Poké Vicio Development Team.

## Local Contracts

- Follow repository architecture, clean code standards, and strict domain typing.
- Ensure strict module decoupling and zero side-effects.

## Key Files

- `audit_4seat_compatibility.ts`: Module implementation.
- `audit_active_gen_ssot.ts`: Module implementation.
- `audit_catch_rate_math.ts`: Module implementation.
- `audit_fsm_event_parity.ts`: Module implementation.
- `audit_fsm_substate_parity.ts`: Module implementation.
- `audit_fsm_zero_timer.ts`: Module implementation.
- `audit_helpers.ts`: Module implementation.
- `audit_missing_animations.ts`: Module implementation.
- `audit_playwright_actionability.ts`: Module implementation.
- `audit_request_schema.ts`: Module implementation.
- `audit_shared_executor_duplication.ts`: Module implementation.
- `audit_showdown_ability_data.ts`: Module implementation.
- `audit_showdown_item_data.ts`: Module implementation.
- `audit_showdown_move_mechanics.ts`: Module implementation.
- `audit_showdown_protocol_tokens.ts`: Module implementation.
- `audit_showdown_status_null.ts`: Module implementation.
- `audit_silent_fallback_patterns.ts`: Module implementation.
- `audit_stat_stage_boosts.ts`: Module implementation.
- `audit_uid_mapping_integrity.ts`: Module implementation.
- `audit_weather_terrain_parity.ts`: Module implementation.
- `find_untested_showdown_effects.ts`: Module implementation.
- `parse_replay_log_desync.ts`: Module implementation.
- `run_audit_suite.ts`: Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- [__tests__/AGENTS.md](./__tests__/AGENTS.md)
