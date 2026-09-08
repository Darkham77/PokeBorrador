# Technical Backlog: PvP, Leagues, Tournaments & Admin Systems

This document specifies the pending architecture, mechanical design, and implementation requirements for major features identified across the PvP, League, Tournament, and Game Administration systems in Poké Vicio.

---

## 1. PvE Pokémon League (Indigo Plateau / Elite Four & Champion)

### Context & Narrative Contract

In `GymsView.vue` and world maps (`maps.ts`, Route 22), the game narrative explicitly directs trainers: *"Defeat the 8 Gym Leaders of Kanto to gain access to the Pokémon League"*. However, once all 8 badges are earned, no playable gauntlet currently exists.

### Technical Scope & Requirements

- **Location & Route Access**:
  - Implement Route 23 (Victory Road / *Calle Victoria*) gate verification checking `gameStore.state.badges >= 8`.
  - Indigo Plateau (*Meseta Añil*) lobby map with Pokémon Center nurse, mart vendor, and league challenge door.
- **Consecutive Gauntlet (The Elite Four & Champion)**:
  1. **Lorelei**: Ice/Water specialist (Dewgong, Cloyster, Slowbro, Jynx, Lapras).
  2. **Bruno**: Fighting/Rock specialist (Onix, Hitmonchan, Hitmonlee, Onix, Machamp).
  3. **Agatha**: Ghost/Poison specialist (Gengar, Golbat, Haunter, Arbok, Gengar).
  4. **Lance**: Dragon/Flying specialist (Gyarados, Dragonair, Dragonair, Aerodactyl, Dragonite).
  5. **Champion (Blue / Rival)**: Dynamic champion team based on player starter selection with competitive level 65-70 spread (Pidgeot, Alakazam, Rhydon, Exeggutor/Arcanine/Gyarados, Starter Ace).
- **Gauntlet Constraints**:
  - Bag item restrictions or limited item replenishment between rooms.
  - White-out/Defeat resets the gauntlet back to the lobby.
- **Hall of Fame & Rewards**:
  - Hall of Fame registration recording the player's winning 6 Pokémon with timestamps and stats.
  - Official cosmetic reward unlock: `av-class-entrenador` (*Campeón de Liga* in `cosmeticsData.ts`).
  - Post-game credits sequence and gym leader rematches unlock.

---

## 2. Elimination Tournament Engine (Brackets / Single & Double Elimination)

### Context

Currently, the codebase uses the term "Tournament" to denote monthly continuous ELO ladder seasons (`rankedData.ts`). A true elimination bracket tournament engine (Quarterfinals, Semifinals, Finals) is absent.

### Technical Scope & Requirements

- **Bracket Data Structures**:
  - Implement typed tournament nodes (`TournamentRound`, `TournamentMatch`, `TournamentBracketTree`):

    ```ts
    export interface TournamentMatch {
      id: string;
      roundIndex: number;
      matchIndex: number;
      player1Id?: string;
      player2Id?: string;
      winnerId?: string;
      battleCode?: BattleCode;
      status: 'pending' | 'in_progress' | 'completed' | 'bye';
    }
    ```

- **Interactive Bracket UI**:
  - Retro-modern interactive visual tree showing seedings, participant avatars, live combat statuses, and match winner advancements.
- **Registration & Matchmaking Coordinator**:
  - Fixed capacity lobbies (8, 16, or 32 participants).
  - Check-in grace window (e.g. 5 minutes before kickoff).
  - Round synchronization: Round $N+1$ matches only trigger once dependent Round $N$ matches resolve.
  - Bye handling for uneven participant numbers or early drops.

---

## 3. Scheduled Blitz / Flash Weekend Tournaments

### Technical Scope & Requirements

- **Automated Scheduling Engine**:
  - Cron / Temporal scheduled weekend blitz tournaments (e.g. Saturday 20:00 UTC, Sunday 18:00 UTC).
  - Entry requirements: Battle Coins, Tournament Tickets, or minimum trainer level.
- **Automated Reward Distribution**:
  - Champion trophy banner, profile badges, exclusive cosmetic titles, and Battle Coin jackpots distributed automatically upon final match completion.

---

## 4. In-Combat Ranked Trainer Sidebars (`BattleArenaView.vue`)

### Context

In legacy prototypes (`scratch/backup_legacy_code/js/14_pvp.js`, `_pvpBuildTrainerSideHtml`), ranked battles on widescreen viewports displayed floating side panels flanking the arena.

### Technical Scope & Requirements

- **Widescreen Flanking Panels**:
  - Left panel: Player full-body trainer sprite (`red-lgpe` or player class cosmetic sprite), trainer name, trainer level, current season ELO, medal icon, and win/loss stats.
  - Right panel: Opponent full-body trainer sprite, rival name, level, ELO, medal icon, and season stats.
- **Responsive Layout**:
  - Automatically hidden on small/mobile screens (< 1024px) via CSS breakpoints to preserve combat viewport area.
  - GSAP entrance animation on combat start.

---

## 5. Instant Manual Concede / Forfeit Button in Live PvP

### Technical Scope & Requirements

- **In-Game Surrender Action**:
  - Provide an explicit `[🏳️ RENDIRSE]` (Forfeit) action button in `BattleArenaControls.vue` during active PvP sessions.
  - Requires a confirm modal (`ConfirmModal.vue`) to prevent accidental clicks.
  - Immediately signals `pvp_forfeit` across the Supabase channel, awards the victory to the opponent, updates ELO deltas, and gracefully closes the combat session without waiting for the 90s two-strike AFK timer.

---

## 6. Community & Faction PvP Leagues

### Technical Scope & Requirements

- **Intra-Faction and Inter-Faction Leagues**:
  - Competitive leaderboards grouped by Faction (`union` vs `poder`).
  - Weekly faction duels where wins contribute to overall faction dominance points in `useWarStore`.
  - Clan / Guild division ladders with seasonal promotion/relegation tiers.

---

## 7. Bug-Catching Contest (National Park PvE Tournament)

### Technical Scope & Requirements

- **Timed Capture Event**:
  - 20-minute timed session inside a dedicated park map.
  - Player is provided 20 Park Balls; inventory bag is locked.
  - Only Bug-type Pokémon appear with unique species distributions (Pinsir, Scyther, Butterfree, Beedrill, etc.).
- **Scoring & NPC Competitors**:
  - Score algorithm based on species rarity, level, remaining HP percentage, and individual values (IVs).
  - NPC contenders (Cooltrainer Nick, Bug Catcher Sammy) generate simulated scores for realistic podium competitions.

---

## 8. In-Game Administrative Management Dashboard

### Technical Scope & Requirements

- **Live Ranked Season Overrides**:
  - Secure GUI for authorized administrative users to modify active season parameters (dates, level cap, allowed types, banned species) on live servers without raw SQL edits or static file deploys.
- **Manual Event & Prize Triggers**:
  - GUI to inspect live competition submissions, disqualify illegitimate entries, and manually trigger emergency award distributions.
