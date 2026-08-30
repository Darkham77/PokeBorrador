# Purpose

Manage the logic and assets of events.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Multi-Category Sub-Competition System & Flexible Criteria**: Global competition events support multiple concurrent sub-competitions (minimum 3 by default: IVs, Weight, Height, with support for arbitrary additional sub-categories like Level, Friendship, or Specific Stat IVs).
- **Multi-Species Competition Scoping (IV vs Physical Dimensions)**:
  - *Genetic IVs (`total_ivs`, `stat_iv`)*: Always evaluated globally across all participating event species in a shared category (`category_id: 'ivs'`).
  - *Physical Dimensions (`weight`, `height`)*: Evaluated strictly **intra-species** (`category_id: '<metric>_<species>'`, e.g. `weight_horsea`, `height_horsea`). Different species never compete against each other in weight or height unless explicitly configured as a global open event (such as `gran_concurso_sabado` with `competitionScope: 'global'`).
  - *Slot Availability & Anti-Duplication*: Players may occupy 1 slot for global IVs plus 1 slot per physical metric for each participating species, provided each registered Pokémon UID is unique.
- **Metric Evaluation Direction & Determinism**: IV-based sub-competitions strictly evaluate higher scores (`DESC`). Physical dimension metrics (Weight and Height) evaluate directionally (`max` or `min`), where unconfigured events resolve direction deterministically from the event's time cycle seed (matching Mulberry32 PRNG logic).
- **Sub-Competition Admission Filters & Global Inheritance**: Sub-competitions inherit global event admission constraints (e.g., target species whitelist, `requireCaughtDuringEvent`) while supporting optional category-specific filters (e.g. required natures, required abilities, gender, level caps). All criteria default to open/unrestricted ("any") unless explicitly configured with one or more valid values.
- **Candidate Pre-Filtering on Slot Selection**: When initiating Pokémon selection for a sub-competition slot, the system MUST pre-filter all candidates against the full combined criteria (global + category) using `isPokemonEligibleForSubCompetition`, restricting selection exclusively to eligible Pokémon.
- **Multi-Category Independent Awards**: Players can enter different Pokémon or the exact same Pokémon across all available sub-competitions. Winning multiple sub-competitions awards the distinct, independent thematic prizes of each won category without prize duplication or scalar multipliers.

- **Weekly Event Grid Contract (7-Day Daily Cycle)**: Every day of the week features a distinct active event. 4 days feature full-day passive bonus events (Monday, Wednesday, Friday, Sunday), and exactly 3 days feature competition events (Tuesday, Thursday, Saturday).
- **Competition Event Time Window & Scope**:
  - Weekday competitions (Tuesday and Thursday) operate in concentrated 3-4 hour evening windows (18:00 to 22:00) with focused thematic species.
  - Saturday competition is a Global Open Championship running all day (00:00 to 23:59) where any Pokémon caught during the day is eligible, offering top-tier prizes alongside the weekend 2x EXP bonus.
- **Monthly 4-Week Thematic Rotation**: Weekday competitions (Tuesday & Thursday) rotate weekly across 4 distinct monthly themes (Week 1: Magikarp/Aquatic & Bug Catching; Week 2: Exotic Marine & Safari Park; Week 3: Deep Sea & Ancient Fossils/Caves; Week 4: Mystic Waters & Haunted Night).
- **Modular Monthly Events Schedule & Conflict Prevention**:
  - *Monthly Community Day (`comunidad_mensual`)*: Runs strictly on the **last Sunday of each month** (`type: 'monthly', trigger: 'last_sunday'`, 00:00 to 23:59), featuring a designated Pokémon with 3x spawn and 4x shiny rate, completely avoiding Saturdays to eliminate schedule collisions with the Saturday Global Open Championship.
  - *Faction War Championship (`guerra_facciones_mensual`)*: Runs during the **2nd weekend of each month** (`type: 'monthly', trigger: 'second_weekend'`, Saturday 00:00 to Sunday 23:59), awarding 2x faction points and 2x Battle Coins during mid-month territorial battles.
- **Dynamic Event Window & Countdown Resolution**: All event time windows (`getEventCurrentWindow`) and upcoming occurrences (`getUpcomingEventOccurrences`) MUST support weekly recurring schedules and all modular monthly recurring schedules (`type: 'monthly'`, supporting triggers `last_sunday`, `second_weekend`, and `last_weekend`). Active event cards (`EventCard.vue`) and HUD buff overlays (`buffs.ts`) MUST dynamically compute remaining seconds and time labels against `getEventCurrentWindow`, ensuring real-time countdown updates across server time modifications without falling back to `0` or `'Indefinido'`.
- **Resilient Event Config Parsing & Wildcard '*' Open Tournament Contract**:
  - Event `config` and `schedule` properties MUST always be parsed via `safeParse` to prevent `SyntaxError` on malformed, primitive, or corrupted payloads.
  - Open competition events (`species: '*'`) signify global participation across all species and must NEVER be passed to `requirePokemonSpeciesId` or treated as literal Pokémon species identifiers.
  - Multi-species lists (comma-separated), rotation theme entries (`rotationTheme: 'weekly_4'`), and single species must always be resolved via `resolveWeeklyRotation` and filtered with `isPokemonSpeciesId(token)` before modifying spawn pools, computing rates, or rendering UI badges.
- **Automated Event Schema & Execution Integrity Testing**:
  - All database event seeds and dynamic configurations MUST be backed by Tier 1 unit tests (`events_future_proof_integrity.spec.ts`) and Tier 2 database migration integrity tests (`event_database_rewards_integrity.test.ts`), verifying encounter generation across all maps, minigames, and 52 calendar week transitions without runtime exceptions.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- Architectural separation of concerns across event sub-modules:
  - `eventEngine.ts`: Lean orchestrator, global multiplier resolution (`getGlobalMultipliers`, `getSpeciesBoosts`, `getMinigameBuffs`), and public API facade.
  - `eventSchedules.ts`: Pure scheduling predicates (`isEventActiveNow`, `getEventCurrentWindow`, `getUpcomingEventOccurrences`), weekly rotations, and monthly triggers (`last_sunday`, `second_weekend`, `last_weekend`).
  - `eventCompetitions.ts`: Sub-competition scoring (`evaluatePokemonForSubCompetition`), tiebreaking hierarchy (`isNewEntryBetter`), candidate pre-filtering, and eligibility resolution.
- Extract sub-competition scoring and tiebreaking helpers into pure modules with zero DOM or framework dependencies.

## Verification

- Run standard validation scripts.

## Child DOX Index

- *This domain module does not contain nested sub-directories with independent AGENTS.md files.*
