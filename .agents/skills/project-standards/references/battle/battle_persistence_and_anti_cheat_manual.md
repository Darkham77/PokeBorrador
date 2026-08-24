# Battle Persistence & Anti-Cheat Governance Manual

This manual governs the active battle persistence architecture, page refresh (F5) rehydration protocols, and the strict non-persistence anti-cheat policy for minigames across Poké Vicio.

---

## 1. Core Architecture of Battle Persistence

### 1.1 In-Flight Combat Serialization (`saveSerializer.ts`)
When a player is engaged in an active battle (wild, trainer, or gym), the game state serialized to storage (IndexedDB, OPFS, SQLite, Supabase) includes a snapshot of `activeBattle`:
- **Combatants**: Active `player` and `enemy` instances with exact current HP, status, and UID identity.
- **Battle Metadata**: `turnCount`, `escapeAttempts`, `isTrainer`, `trainerName`, `trainerSprite`, `trainerArchetype`, `quote`, `enemyTeam`, `enemyTeamIndex`, `participants`, `isGym`, `isRival`, `wasSearching`.
- **Field & Side Context**: `weather`, `terrain`, `fieldConditions`, `playerSideConditions`, `enemySideConditions`, `pendingSlotEffects`.
- **Stages & History**: `playerStages`, `enemyStages`, and `battleLogs` array snapshot.
- **Safety Flags**: `over: false` and `minigame: null`.

### 1.2 Combat Rehydration Lifecycle (`orchestratorRestoreHelper.ts`)
Upon game boot or page reload (`F5`):
1. **Validation**: Check if `d.over` is true. If the saved battle was already completed, it is discarded immediately (`activeBattle = null`), transitioning to `EXIT_BATTLE`.
2. **Minigame Interception**: If `isBattleMinigame(d)` is true, the minigame is discarded and the system invokes `resumeSearchMode(ctx, d)` to return to the search loop without awarding rewards or persisting minigame state.
3. **Active Combat Restoration**:
   - Resolves the active player Pokémon from `gs.state.team` by `UID`.
   - Resolves the active enemy Pokémon from `d.enemy` or `d.enemyTeam[enemyTeamIndex]`.
   - Injects saved stat stages (`playerStages`, `enemyStages`) and historical logs (`battleLogs`).
   - Re-initializes the Showdown Web Worker via `initWorkerForBattle(ctx, playerPoke, enemyPoke)`.
   - Sets `ctx.isProcessing.value = false` and `d.over = false`.
   - Transitions the FSM directly to `ACTIVE_BATTLE / WAIT_INPUT`.

---

## 2. Anti-Cheat Page Refresh (F5) Governance

### 2.1 Combat Resumption Mandate
- **Rule**: Refreshing the browser during active combat MUST NOT reset the combat, roll a new enemy, cure Pokémon, or allow escaping unpunished.
- **SSoT**: The battle MUST resume with 100% fidelity: exact same opponent UID, identical HP, current stat stages, and full combat log history.

### 2.2 Strict Minigame Non-Persistence (Anti-Exploit Drop)
- **Rule**: Minigames (Fishing, Archaeology) MUST NEVER be saved to persistent storage.
- **Why**: Prevents players from refreshing when close to losing or failing a rhythm/fossil minigame to attempt re-rolls.
- **Action**: When F5 is pressed during a minigame, the minigame state is dropped, the modal closes, and the player returns cleanly to `/map` in search mode.

---

## 3. Playwright E2E Simulation Standards

### 3.1 Anti-Cheat Simulation Suite (`battle_anti_cheat_refresh.simulation.ts`)
Automated E2E suites MUST verify:
1. **Wild Combat F5**: 3rd encounter restored with exact Pokémon species, UID, HP, and turn count.
2. **Trainer Combat F5**: 3rd encounter restored with exact trainer archetype, quote, full enemy team, active UID, and turn count.
3. **Fishing Minigame F5**: Minigame discarded; game returns cleanly to `/map` search mode.
4. **Archaeology Minigame F5**: Minigame discarded; game returns cleanly to `/map` search mode.

### 3.2 Sequential Loop Synchronization Rule
When executing sequential encounters in Playwright:
- `executeNativeAutoBattle(page)` MUST explicitly wait for `store.state.over === false && store.currentFsmState === 'ACTIVE_BATTLE'` before entering the turn-driving loop, preventing premature termination on stale `over: true` flags from previous combats.
