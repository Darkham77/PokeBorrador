# Purpose

Manage the logic and assets of pvp.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Monthly Competitive Season (Ranked Reset)**: Competitive seasons run on a monthly cycle. At the end of each monthly season, player ELO undergoes a proportional soft reset: `newElo = Math.floor(Math.max(1000, 1000 + (currentElo - 1000) / 2))`, preventing high-tier players from overwhelming novices on Day 1 while retaining competitive progression.
- **Tier-Based Seasonal Payout**: Seasonal rewards (`fn_award_ranked_season_automated`) scale by the highest Tier attained during the season (Bronce, Plata, Oro, Platino, Diamante, Maestro) with minimum activity threshold (e.g. 5 completed matches). Maestro/Diamante tiers grant guaranteed shiny thematic Pokémon tied directly to that month's competitive cup (e.g. Shiny Kanto Starters for Kanto Classic, Shiny Gastly/Gengar for Halloween Cup, Shiny Riolu for Little Cup) with 3 guaranteed 31 IVs for Diamante and 4 guaranteed 31 IVs for Maestro (remaining stats randomized between 0-31 to preserve breeding/training progression) alongside dungeon tickets and Battle Coins, while intermediate tiers receive proportional coins and tickets. The Top 10 global podium receives exclusive distinction and bonus prizes.
- **Canonical ELO Rating Formula**: Post-match ELO updates follow canonical competitive ELO calculation based on rating differential between combatants ($E_A = 1 / (1 + 10^{(R_B - R_A) / 400})$, $\Delta R = K \cdot (S_A - E_A)$ with $K=32$ for initial tiers, $K=16$ for high tiers). Rating has an absolute floor at `MIN_INITIAL_ELO = 1000`. Defeating a higher-ranked opponent yields higher reward than beating a lower-ranked opponent.
- **Ranked vs Casual Match Mode Contract**: `PvPChallengeModal.vue` allows selecting `mode: 'ranked' | 'casual'`. In 'ranked' mode, teams must validate against seasonal rules (`validateTeamForRanked`), level normalization is fixed to Level 50 flat, and the battle outcome updates both combatants' ELO rating in `profiles.elo_rating`. In 'casual' mode, players can battle with any format/level without affecting ranking ELO or competitive stats.
- **Ranked Matchmaking Queue Contract**: The public queue table `public.ranked_queue` orchestrates automated matchmaking. `livePvPStore.startSearch()` inserts the player into the queue with their current ELO and polls for compatible opponents within rank tolerance (`isAllowedRankGap`). Upon match discovery, it creates a `battle_invites` record with `status: 'ranked_match'`, deletes both participants from `ranked_queue`, and seamlessly launches the competitive battle.
- **Offline Opponent Asynchronous Combat & Team Auto-Fill Contract**: When challenging any player who is currently offline, the match proceeds as an asynchronous combat against their dedicated PvP team (`pvpTeam` for 3v3 or `pvpTeam6` for 6v6) controlled by Showdown AI (`@pkmn/sim` / ScriptedAI). Dedicated PvP teams must NEVER be empty; if an offline player's saved PvP slots are incomplete, the engine automatically backfills missing slots using available Pokémon from their team or PC boxes. Combat outcomes are recorded to `public.passive_battle_reports` via RPC `record_passive_battle_result` to notify the defender upon their next login.
- **Rotating Seasonal Thematic Formats (Client Calendar + SQL Override)**: Competitive monthly seasons rotate across a canonical 12-month annual thematic calendar (e.g., Enero: Copa Monotipo, Febrero: Clásico Kanto, Marzo: Little Cup, Abril: Maestros del Clima, Mayo: Dúo Elemental, Junio: Sin Legendarios, Julio: Copa Velocidad, Agosto: Tríada Elemental, Septiembre: Kanto/Johto, Octubre: Halloween Fantasma/Siniestro, Noviembre: Duelo de Titanes, Diciembre: All-Stars de Maestros) declared in `src/data/system/rankedData.ts`. If an override or custom season is registered in the database table `ranked_seasons` / `ranked_rules_config`, the database definition takes precedence, allowing runtime format modifications without requiring code deployments.
- **Seasonal Format Compliance & Assisted Auto-Fill**: When entering Ranked matchmaking or challenging in Ranked mode, the player's team is validated against the active seasonal rules (`validateTeamForRanked`). If any slot violates format restrictions (banned species or prohibited types), the UI offers an assisted one-click auto-fill action ("Autocompletar con equipo legal") that scans the player's team and PC boxes for compliant Pokémon with the highest level/stats to fulfill the legal lineup.
- **Battle Replay Theater & Battle Code Contract**: Competitive matches can be published to `public.battle_replays`, storing the full Showdown turn-by-turn choice stream, initial seed, combatant metadata, and team configurations. Access follows a hybrid triple-layer model: (1) A public featured feed of Top 10 Hall of Fame matches in `SocialRankings.vue`, (2) A personal showcase of up to 5 pinned favorite replays in the player profile, and (3) A unique alphanumeric Battle Code (e.g. `BTL-A7X9-K24`) for sharing and launching replays directly from chat or search bar.
- **Tactical Step-by-Step Replay Player Engine**: The replay spectator UI mounts over the battle arena with tactical playback controls: Play, Pause, and manual "Next Turn" progression. Replays execute sequentially on the Showdown worker stream without arbitrary non-deterministic seeking, guaranteeing 1:1 event parity, flawless GSAP animation synchronization, and deep competitive decision analysis.
- **Strict Fog-of-War Replay Information Disclosure**: To protect competitors' private builds and preserve suspense, replays enforce strict authentic fog of war: Pokémon moves, held items, and abilities are revealed to spectators only dynamically as they are explicitly triggered or revealed in combat events, never disclosing unrevealed movesets or secret spreads.
- **Replay Upload & Top 10 Auto-Archival Policy**: Competitive replays are stored in `public.battle_replays` on-demand via a "Guardar y Generar Battle Code" prompt on the end-of-battle summary. However, if either combatant is ranked within the active season's Top 10 leaderboard, the system automatically persists the replay to the public Hall of Fame feed, ensuring high-tier competitive matches are readily available for community spectating. Replays include an automatic 30-day retention cycle aligned with monthly seasons.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- **Database Procedure Parity & Automated Awarding**: Season conclusion and payout distribution MUST execute via a dedicated PostgreSQL stored procedure `public.fn_award_ranked_season_automated(target_season_name TEXT)` with `SECURITY DEFINER` and full SQLite companion emulation (`rpcEmulations/rankedRpc.ts`). It must atomically evaluate Tiers, write rewards to `public.awards`, store podium history in `public.competition_results`, apply the proportional ELO soft reset to `profiles.elo_rating`, advance `ranked_rules_config` to the next month, and lock double awarding with `last_awarded_at`.
- Tier rewards must be claimed through the canonical `awards` table via `claim_award(award_id)`.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
