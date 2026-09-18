# Purpose

Unit tests for database query router emulation, session security, state serialization, GTS/Black Market economy, event engines, modal hierarchy, and application lifecycle.

## Test Index

- [debug_system_suite.spec.ts](./debug_system_suite.spec.ts): Diagnostics, memory leak simulation, crash log inspection, and developer tooling tests.
- [domain_types_suite.spec.ts](./domain_types_suite.spec.ts): Compile-time and runtime validation for domain types and branded identifiers.
- [proxy_queries_suite.spec.ts](./proxy_queries_suite.spec.ts): Tests for SQL proxy query routing, joins, and filter projections.
- [system_app_lifecycle_and_stores_suite.spec.ts](./system_app_lifecycle_and_stores_suite.spec.ts): Cohesive domain suite consolidating app loading/session helpers, game store loading & timeouts, update store, error store, audio debouncing, and time utilities.
- [system_auth_and_session_suite.spec.ts](./system_auth_and_session_suite.spec.ts): Auth lifecycle, session tokens, login handlers, and logout update loop prevention.
- [system_core_utils_suite.spec.ts](./system_core_utils_suite.spec.ts): Core system utilities, math helpers, clone utilities, and array manipulation tests.
- [system_events_engine_suite.spec.ts](./system_events_engine_suite.spec.ts): Event scheduling, global multipliers, species boosts, minigame buffs, future-proof permutations, and comprehensive event types audit.
- [system_events_ui_suite.spec.ts](./system_events_ui_suite.spec.ts): Event UI components including BuffsOverlay badges, EventCard participating slots, and EventDetailModal sub-competitions.
- [system_infrastructure_and_schemas_suite.spec.ts](./system_infrastructure_and_schemas_suite.spec.ts): Database isolation, server infrastructure, friendly error mappings, daycare missions integrity, and validation schemas.
- [system_market_and_gts_suite.spec.ts](./system_market_and_gts_suite.spec.ts): Team Rocket Black Market sales logic and GTS marketplace store operations, listings, and claim queues.
- [system_navigation_and_modals_suite.spec.ts](./system_navigation_and_modals_suite.spec.ts): Modal stacking (LIFO), hierarchical performance modes, HUD navigation, and useBackNavigation history trap.
- [system_past_events_history_suite.spec.ts](./system_past_events_history_suite.spec.ts): Past events history listing, winners podium, and reward claiming workflows.
- [system_save_and_persistence_suite.spec.ts](./system_save_and_persistence_suite.spec.ts): Game state serialization, OPFS persistence, backup saves, and local user database isolation.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
