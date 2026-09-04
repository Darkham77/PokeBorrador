# Purpose

Playwright E2E simulation suites for special calendar and competition events (fishing boost, Magikarp IVs contest, EXP multipliers, and reward claims).

## Ownership

QA / Automation Engineers.

## Local Contracts

- Multi-player event scenarios must use shared ephemeral databases (SQLite in RAM or PostgreSQL in Docker) without mutating live databases.
- **Dual Database Shared State Reset Contract**: When executing event simulation suites against PostgreSQL (`SIM_DB_DRIVER=postgres`), test seeders (`seedEventConfig`) and `BaseSimulation.setup()` MUST explicitly reset `last_awarded_at = NULL` and purge prior event awards, results, and entries (`competition_entries WHERE player_name = $1`). This prevents cross-test collision with PostgreSQL's 10-minute anti-double-awarding lockout in `fn_award_event_automated` and avoids duplicate enrollment constraint errors across sequential test runs.
- **Natural Player-Facing Interaction & Zero-Superuser Contract (Enfoque B)**: All event simulation interactions (initial enrollment, slot inspection, participant replacement via `EventSlotActionModal`, voluntary withdrawal, and reward claiming/discarding) must execute strictly through official visible UI controls (`#comp-slot-chip-*`, `#pokemon-select-*`, `#event-slot-change-btn`, `#event-slot-withdraw-btn`, `#award-claim-btn-*`). Simulating superuser backdoors, manual database state mutations, or admin permission injections to bypass player constraints is strictly forbidden.
- **Deterministic Test User UUID Derivation**: Multi-user simulation helpers (`loginTestUser`) MUST derive RFC4122-compliant UUIDv4 identifiers using SHA-256 hashes of test player names to ensure 100% collision-free identities across composite database constraints (`UNIQUE(event_id, category_id, player_id)`).
- Event simulations must interact with the application UI exclusively through deterministic element IDs (`#id`).
- Combat logs and event reward distributions must be verified using typed event listeners and store state assertions.

## Work Guidance

- Use `FishingEventSimulation` and `MagikarpContestSimulationWrapper` as reusable wrappers for event E2E test flows.
- Always reload SQLite binary snapshots (`initSQLite({ forceReload: true })`) before querying shared event awards across multiple browser contexts.

## Verification

- Run `npm run sim:e2e:events` to execute event scenario simulations.
