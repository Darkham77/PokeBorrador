# Manual Verification & Gameplay Testing Guide

This guide provides an exhaustive, step-by-step test protocol to manually verify all features, visual animations, combat mechanics, debug tools, legality validations, breeding workflows, and persistence flows refactored across the codebase.

---

## 🛠️ 0. Environment Setup & Launch Protocol

1. **Start the Development Server**:

   ```bash
   npm run dev
   ```

2. **Open the Game in Browser**:
   - URL: `http://localhost:5173`
   - Recommended: Chromium or Firefox with Developer Tools (`F12`) open to the **Console** tab to observe debug logs.
3. **Optional (Admin / Debug Mode)**:
   - For rapid manual testing, open Console and verify `window.__VITE_DEBUG__` flags or utilize the in-game Debug Admin Panel (`Admin / Debug`).

---

## 🛡️ 1. Security & Anti-Corruption Verification (Markets, GTS, Box, Trade)

### 1.1 Team Rocket Black Market (Bulk Sales)

- **Target Component**: [`BoxView.vue`](file:///home/franco/Trabajos/PokeBorrador/src/components/box/BoxView.vue), [`box.ts`](file:///home/franco/Trabajos/PokeBorrador/src/stores/box.ts)
- **Steps**:
  1. Open the Pokémon Box in-game (`PC / Box`).
  2. If player class is **Team Rocket**, activate **Black Market Mode** (mass selection).
  3. Select multiple Pokémon with various IVs and levels.
  4. Verify the dynamic price calculation:
     - Higher level and higher total IVs increase the sale price proportionally according to `calculateRocketSellPrice()`.
     - Held items are safely returned to inventory upon sale.
  5. Attempt to select an illegal or flagged Pokémon (e.g. modified via debug console with an illegal move or unobtainable ability):
     - **Expected**: The system automatically excludes illegal Pokémon from the sell selection and sell value calculation (`getRocketSellValue()`), preventing exploitation.
  6. Confirm sale -> verify player money increments correctly and selected Pokémon are cleanly removed from the box.

### 1.2 Global Trade System (GTS) & Market Listings

- **Target Component**: [`MarketPublish.vue`](file:///home/franco/Trabajos/PokeBorrador/src/components/market/MarketPublish.vue), [`useMarketPublishPokemon.ts`](file:///home/franco/Trabajos/PokeBorrador/src/components/market/useMarketPublishPokemon.ts), [`marketRpc.ts`](file:///home/franco/Trabajos/PokeBorrador/src/logic/db/rpcEmulations/marketRpc.ts)
- **Steps**:
  1. Navigate to the **Mercado / GTS** view from the navigation menu.
  2. Click **"Publicar Oferta"** (Publish Listing).
  3. Select a legal Pokémon from your box, set a valid price (e.g., 500 PokéDollars), and submit:
     - **Expected**: Listing creates successfully, appears in "Mis Publicaciones" with status `active`, and returns a valid listing ID (`list_...`).
  4. **Security Test (Illegal Publish)**:
     - Attempt to publish a Pokémon with corrupted/illegal moves (e.g., a Lv 5 Pikachu with moves it cannot learn at that level) or unobtainable abilities.
     - **Expected**: Operation is immediately blocked with an explicit warning toast/modal: *"No se puede publicar un Pokémon ilegal en el mercado..."*.
  5. **Purchase & Escrow Test**:
     - Using another account or offline session, buy an active listing.
     - **Expected**: Buyer loses exact purchase funds, listing status updates to `sold`, and asset enters the `claim_queue` without data corruption.

### 1.3 P2P Direct Trade Security

- **Target Component**: [`tradeRpc.ts`](file:///home/franco/Trabajos/PokeBorrador/src/logic/db/rpcEmulations/tradeRpc.ts), [`trade.ts`](file:///home/franco/Trabajos/PokeBorrador/src/stores/trade.ts)
- **Steps**:
  1. Initiate a direct trade offer between two trainers.
  2. Attempt to offer an illegal Pokémon or an item that doesn't exist in the player's inventory.
  3. **Expected**: The trade transaction is aborted with a validation error; no Pokémon or items leave the trainer's box/bag.

---

## ⚔️ 2. Battle Engine & Combat Flow Verification

### 2.1 Battle Damage & Weather Multipliers

- **Target Component**: [`battleMath.ts`](file:///home/franco/Trabajos/PokeBorrador/src/logic/battle/battleMath.ts), [`battleTurn.ts`](file:///home/franco/Trabajos/PokeBorrador/src/logic/battle/battleTurn.ts)
- **Steps**:
  1. Enter a wild battle or trainer battle on a route with active weather (e.g., Rain, Sun, Sandstorm, Snow).
  2. **Water/Fire in Rain/Sun**:
     - Execute a Water-type move under Rain -> verify damage dealt shows the `1.5x` weather boost.
     - Execute a Fire-type move under Rain -> verify damage dealt shows the `0.5x` weather reduction.
  3. **Held Items Damage Modifiers**:
     - Equip a damage-boosting item (e.g. `Mystic Water`, `Choice Band`, `Life Orb`, `Choice Specs`).
     - Execute an attack -> verify damage calculation accurately reflects `calculateHeldItemDamageMultiplier()`.
  4. **Delta Stream / Strong Winds**:
     - In battles with Delta Stream active, attack a Flying-type Pokémon with Electric, Ice, or Rock moves.
     - **Expected**: Super-effective damage is reduced to neutral `1.0x` via `calculateDeltaStreamTypeEff()`.

### 2.2 Forced Switch & Faint Sequence (`battleFaintSequence.ts` / `BattleQuickTeam.vue`)

- **Target Component**: [`battleFaintSequence.ts`](file:///home/franco/Trabajos/PokeBorrador/src/logic/battle/battleFaintSequence.ts), [`BattleArenaControls.vue`](file:///home/franco/Trabajos/PokeBorrador/src/components/battle/BattleArenaControls.vue), [`BattleQuickTeam.vue`](file:///home/franco/Trabajos/PokeBorrador/src/components/battle/BattleQuickTeam.vue)
- **Steps**:
  1. Enter a battle with a party of 3+ Pokémon.
  2. Allow the active player Pokémon to reach 0 HP (or use the Debug Action Panel to set HP to 0).
  3. **Visual & UI Checks**:
     - Faint animation plays smoothly via GSAP (slide down + fade out).
     - The battle UI enters the forced switch state (`battle-forced-switch-required`).
     - The Quick Team drawer opens with available alive bench Pokémon.
     - Fainted Pokémon slots are visually disabled (`condition: "0 fnt"` / red strikethrough) and cannot be selected.
  4. Select a living bench Pokémon:
     - **Expected**: Chosen Pokémon switches into the battlefield with full entry animations, abilities trigger (e.g. Intimidate, Neutralizing Gas), and the turn resumes cleanly without hanging.
  5. **Team Wipeout (Whiteout)**:
     - If all party members are fainted -> Defeat screen appears, player is safely transported to the nearest Pokémon Center/Home without state corruption.

### 2.3 Forced Recharge Turns (`Blast Burn` / `Hyper Beam` / `Giga Impact`)

- **Target Component**: [`showdownBattleEngine.ts`](file:///home/franco/Trabajos/PokeBorrador/src/logic/battle/engine/showdownBattleEngine.ts)
- **Steps**:
  1. Teach a Pokémon `Blast Burn`, `Hyper Beam`, or `Giga Impact`.
  2. Execute the move in battle against an opponent.
  3. In the subsequent turn:
     - **Expected**: The battle controls automatically lock/clamp the action to the mandatory recharge turn (`Recharge`).
     - Attempting to select other moves or buttons is cleanly prevented by Showdown engine validation.
     - The recharge turn executes, showing the recharge message in the battle log, and normal move selection restores in the next turn.

### 2.4 In-Combat Item Usage (`battleItemUseHelper.ts` / `itemTargetValidator.ts`)

- **Target Component**: [`battleItemUseHelper.ts`](file:///home/franco/Trabajos/PokeBorrador/src/stores/battle/battleItemUseHelper.ts), [`itemTargetValidator.ts`](file:///home/franco/Trabajos/PokeBorrador/src/logic/battle/itemTargetValidator.ts)
- **Steps**:
  1. Open the Bag during battle:
     - **Potion / Super Potion / Hyper Potion**: Select an injured Pokémon -> verify healing particle animation and real-time HP bar refill.
     - **Revive / Max Revive**: Verify only fainted Pokémon are selectable; active and conscious Pokémon are disabled. Use on a fainted Pokémon -> verify HP restores to 50%/100% and slot becomes eligible for switching.
     - **Full Heal / Antidote / Parlyz Heal**: Use on an afflicted Pokémon -> verify status icon disappears immediately.
     - **X Attack / X Defense / X Speed**: Use on active Pokémon -> verify stat stage boost icon appears above the combatant.
  2. **Expected**: Item is deducted from bag inventory atomically, the player's turn action is resolved, and the opponent immediately attacks or reacts.

### 2.5 In-Battle Debug Action Panel (`DebugActionPanel.vue` / `DebugActionPanelQuickButtons.vue`)

- **Target Component**: [`DebugActionPanel.vue`](file:///home/franco/Trabajos/PokeBorrador/src/components/battle/DebugActionPanel.vue), [`DebugActionPanelQuickButtons.vue`](file:///home/franco/Trabajos/PokeBorrador/src/components/battle/DebugActionPanelQuickButtons.vue)
- **Steps**:
  1. In development mode (`window.__VITE_DEBUG__ = true`), enter any battle.
  2. Observe the debug bar above the arena:
     - **"KO Enemy"**: Instantly drops enemy HP to 0 -> verify faint sequence triggers.
     - **"Heal Team"**: Restores all party Pokémon HP/PP to max.
     - **"Refill PP"**: Refills all moves PP to full.
     - **"Set Weather"**: Click Rain / Sun / Sand / Snow -> verify atmospheric weather visual and battle field status change instantly.
     - **"Give Status"**: Apply Burn / Paralysis / Sleep -> verify status particles and battle log updates.

---

## 🛠️ 3. Debug Tools & Pokémon Legality Verification

### 3.1 Debug Pokémon Creator (`DebugPokemonCreator.vue` / `useDebugPokemonCreator.ts`)

- **Target Component**: [`DebugPokemonCreator.vue`](file:///home/franco/Trabajos/PokeBorrador/src/components/admin/debug/DebugPokemonCreator.vue), [`useDebugPokemonCreator.ts`](file:///home/franco/Trabajos/PokeBorrador/src/components/admin/debug/useDebugPokemonCreator.ts)
- **Steps**:
  1. Open the **Admin Panel -> Creador de Pokémon** (`DebugPokemonCreator`).
  2. **Species Selection**:
     - Search for a species (e.g. `Pikachu`, `Mewtwo`, `Miraidon`, `Tangela`).
     - Verify base stats, official types, and sprite preview update dynamically.
  3. **Biological Gender Enforcement**:
     - Select a genderless species (e.g., `Magnemite`, `Mewtwo`, `Miraidon`) -> Verify Gender selector is locked to `N` (None).
     - Select a female-only species (e.g., `Chansey`, `Blissey`) -> Verify Gender selector is locked to `F` (Female).
     - Select a male-only species (e.g., `Tauros`, `Hitmonchan`) -> Verify Gender selector is locked to `M` (Male).
     - Select a dual-gender species (e.g., `Pikachu`, `Eevee`) -> Verify both `M` and `F` options are available.
  4. **Natural Dex Abilities Filter**:
     - Verify the Ability dropdown ONLY displays canonical abilities from Showdown Dex for that species (e.g. `Static` or `Lightning Rod` for Pikachu; `Hadron Engine` for Miraidon).
  5. **Level-Accurate Move Picker (`PokemonMovePicker.vue`)**:
     - Open the move selector.
     - Verify moves are categorized into **Natural/Level-up Learnset** vs **TM/Egg Moves**.
     - Setting level to Lv 5 -> verify high-level moves (e.g. `Thunder` at Lv 60) are clearly marked or restricted.
  6. Click **"Crear y Añadir al Equipo"** (Add to Team) -> Verify created Pokémon passes all legality checks and appears in team without errors.

### 3.2 Individual Pokémon Editor (`IndividualPokemonEditor.vue`)

- **Target Component**: [`IndividualPokemonEditor.vue`](file:///home/franco/Trabajos/PokeBorrador/src/components/admin/debug/IndividualPokemonEditor.vue)
- **Steps**:
  1. Select an existing Pokémon from team or box to edit.
  2. Modify IVs (0-31), EVs (0-252, total <= 510), Nature, and Held Item.
  3. Verify the **Legality Indicator Badge**:
     - If all stats, moves, and abilities are legal -> Green badge: *"100% Legal"*.
     - If an illegal move or impossible EV spread is entered -> Red warning banner with exact violation details.
  4. Save changes -> Verify updated stats reflect immediately in team summary.

### 3.3 Debug Trainers Tab (`DebugTrainersTab.vue` / `useDebugTrainers.ts`)

- **Target Component**: [`DebugTrainersTab.vue`](file:///home/franco/Trabajos/PokeBorrador/src/components/admin/debug/DebugTrainersTab.vue), [`useDebugTrainers.ts`](file:///home/franco/Trabajos/PokeBorrador/src/components/admin/debug/useDebugTrainers.ts)
- **Steps**:
  1. Open **Admin Panel -> Entrenadores** tab.
  2. Select a preset trainer (e.g., Gym Leader Brock, Youngster Joey, Rival Blue).
  3. Inspect the trainer's legal team roster, movesets, levels, and held items.
  4. Click **"Iniciar Batalla de Prueba"** (Launch Test Battle):
     - **Expected**: Directly launches the trainer battle with proper trainer entry animations, speech bubbles, and AI heuristic behavior.

---

## 🐣 4. Daycare, Breeding & Egg Hatching Lifecycle

### 4.1 Daycare Egg Incubation & Step Walking (`WalkedEggsPanel.vue` / `breeding.ts`)

- **Target Component**: [`WalkedEggsPanel.vue`](file:///home/franco/Trabajos/PokeBorrador/src/components/breeding/WalkedEggsPanel.vue), [`breeding.ts`](file:///home/franco/Trabajos/PokeBorrador/src/stores/breeding.ts), [`daycareMissions.ts`](file:///home/franco/Trabajos/PokeBorrador/src/stores/daycareMissions.ts)
- **Steps**:
  1. Deposit two compatible Pokémon in the Daycare (or use debug tools to generate an egg).
  2. Open the **Huevos / Crianza** (Breeding) panel.
  3. Verify the incubation card:
     - Shows current egg sprite, required walk steps, and progress bar (`currentSteps / maxSteps`).
  4. Walk on the world map or complete battles to accumulate step counts:
     - Verify step counter increments in real-time.
  5. **Hatching Sequence**:
     - When step threshold is reached (100%):
     - **Visual Check**: Egg cracking animation triggers with rhythmic wobble and radiant light bursts.
     - Egg hatches into newborn Lv 1 Pokémon.
     - Inspect newborn stats: Verify inherited IVs (from parent items like `Destiny Knot`), inherited nature (from `Everstone`), and egg moves.
  6. Claim newborn Pokémon -> Verify it is deposited into the party or PC Box cleanly.

---

## 🏆 5. Events, Missions & Past Events History

### 5.1 World Events & Active Missions (`WorldEventsModal.vue` / `EventMissions.vue`)

- **Target Component**: [`WorldEventsModal.vue`](file:///home/franco/Trabajos/PokeBorrador/src/components/modals/WorldEventsModal.vue), [`EventMissions.vue`](file:///home/franco/Trabajos/PokeBorrador/src/components/events/EventMissions.vue), [`events.ts`](file:///home/franco/Trabajos/PokeBorrador/src/stores/events.ts)
- **Steps**:
  1. Open the **Eventos Mundiales** modal from the navigation bar.
  2. **Active Events View**:
     - Verify active event banner, countdown timer to event conclusion, and event rules.
  3. **Event Missions Tab**:
     - Inspect active missions (e.g. "Catch 5 Fire-type Pokémon", "Win 3 Gym Battles").
     - Progress bar shows current progress (`X / Total`).
     - Complete the objective -> Click **"Reclamar Recompensa"** (Claim Reward).
     - **Expected**: Rewards (PokéDollars, Rare Candies, Event Tickets) are credited to inventory, and mission card marks as completed.

### 5.2 Past Events History & Leaderboard Podium (`PastEventsList.vue` / `PastEventCard.vue`)

- **Target Component**: [`PastEventsList.vue`](file:///home/franco/Trabajos/PokeBorrador/src/components/modals/PastEventsList.vue), [`PastEventCard.vue`](file:///home/franco/Trabajos/PokeBorrador/src/components/modals/PastEventCard.vue)
- **Steps**:
  1. In the Events modal, switch to the **"Historial de Eventos"** (Past Events) tab.
  2. **Visual & UI Checks**:
     - Past events are listed in chronological order.
     - Each event displays its title, date range in `GAME_TIMEZONE`, and participant count.
     - **Leaderboard Podium**: Displays Top 3 winners (🥇 1st, 🥈 2nd, 🥉 3rd) with trainer avatars, badges, and final scores.
  3. **Claiming Historical Placement Rewards**:
     - If the player participated and has unclaimed placement rewards:
     - Click **"Reclamar Premio"** -> Verify reward toast appears, button updates to "Reclamado" (disabled), and claim state persists after reload.

---

## 🎨 6. Visuals, Animations & Retro-Modern Effects (GSAP Compliance)

### 6.1 Status Effects & Particle FX (`PVStatusFX.vue`)

- **Target Component**: [`PVStatusFX.vue`](file:///home/franco/Trabajos/PokeBorrador/src/components/common/PVStatusFX.vue), [`useParticleEngine.ts`](file:///home/franco/Trabajos/PokeBorrador/src/composables/effects/useParticleEngine.ts)
- **Steps**:
  1. Apply status conditions to combatants (Burn `brn`, Poison `psn`, Paralysis `par`, Sleep `slp`, Freeze `frz`).
  2. **Visual Checks**:
     - **Burn**: Pulsing red/orange heat glow and rising smoke particles.
     - **Poison**: Purple bubble particles emitting periodically.
     - **Paralysis**: Yellow electric spark flickers with subtle jitter.
     - **Sleep**: Floating 'Z' particles.
     - **Freeze**: Cyan ice crystal overlay.
  3. Verify timeline stability: Status effects should not accumulate memory leaks or crash when switching Pokémon repeatedly.

### 6.2 Atmospheric Weather Canvas (`atmosphere.worker.ts`)

- **Target Component**: [`AtmosphereLayer.vue`](file:///home/franco/Trabajos/PokeBorrador/src/components/world/AtmosphereLayer.vue), [`atmosphere.worker.ts`](file:///home/franco/Trabajos/PokeBorrador/src/logic/render/atmosphere.worker.ts)
- **Steps**:
  1. Navigate across routes with different weather types (Rain, Snow, Ashfall, Sandstorm, Leaves/Petals).
  2. **Visual Checks**:
     - Particles drift smoothly across the screen at stable 60 FPS without layout thrashing.
     - Drift speed and opacity calculations (`calculateAtmosphereDrift`, `calculateAtmosphereOpacity`) adapt smoothly to screen resizes.

### 6.3 Pokémon Center Healing Sequence (`HealModal.vue`)

- **Target Component**: [`HealModal.vue`](file:///home/franco/Trabajos/PokeBorrador/src/components/modals/HealModal.vue)
- **Steps**:
  1. Visit any Pokémon Center and talk to Nurse Joy (or click "Curar Equipo").
  2. **Visual Checks**:
     - Pokéballs are placed one-by-one onto the healing machine slots with sound cues.
     - Healing light flashes pulse across the machine.
     - Fanfare jingle plays upon completion.
     - Nurse Joy bows -> Team HP, PP, and status ailments are 100% restored.

---

## 💾 7. Database, Offline Fallback & Version Checks

### 7.1 App Version Compatibility (`checkAppVersionCompatibility`)

- **Target Component**: [`dbRouter.ts`](file:///home/franco/Trabajos/PokeBorrador/src/logic/db/dbRouter.ts)
- **Steps**:
  1. In standard gameplay, verify database connects without compatibility lockouts.
  2. When server version matches client version -> Game boots directly to main view.
  3. When client is outdated compared to server -> A non-blocking notice or update modal displays as required by configuration.

### 7.2 Healed Data Saves Verification (Tangela Move Healing)

- **Target Migration**: [`20260825110500_heal_tangela_local_moves.sql`](file:///home/franco/Trabajos/PokeBorrador/database/migrations/20260825110500_heal_tangela_local_moves.sql)
- **Steps**:
  1. Load a legacy save containing a Lv 1 Tangela.
  2. Check Tangela's move list in the Pokémon Summary screen.
  3. **Expected**: Tangela has valid level 1 moves (`Absorb` / `Ingrain`), and the illegal move `Tickle` has been safely replaced by the database migration.

### 7.3 Auto-Save & Manual Persistence (`saveSanitizer.ts` / `saveSerializer.ts`)

- **Target Component**: [`saveSanitizer.ts`](file:///home/franco/Trabajos/PokeBorrador/src/logic/auth/saveSanitizer.ts), [`saveSerializer.ts`](file:///home/franco/Trabajos/PokeBorrador/src/logic/auth/saveSerializer.ts)
- **Steps**:
  1. Perform various actions (catch a Pokémon, spend money, rearrange party, win a gym badge).
  2. Click **Guardar Partida** (Save Game) or allow battle end auto-save.
  3. Refresh the browser (`Ctrl+F5` / `Cmd+Shift+R`).
  4. **Expected**: The entire game state (inventory, team HP/PP, location, mission progress) restores with 100% fidelity with zero missing fields or NaN values.

---

## ⚡ 8. Fast Verification Cheat Sheet (Console Shortcuts)

Open DevTools Console (`F12`) and execute any of these helpers to jump directly into specific UI states:

```javascript
// Trigger a wild battle instantly
window.__VITE_DEBUG__?.triggerWildBattle?.('route1', 'pikachu', 15);

// Trigger a trainer battle
window.__VITE_DEBUG__?.triggerTrainerBattle?.('youngster', 10);

// Open Debug Pokemon Creator modal
useModalStore().open('DebugPokemonCreator');

// Open Past Events History modal
useModalStore().open('PastEventsList');

// Open Daycare / Walked Eggs modal
useModalStore().open('WalkedEggsPanel');

// Open Archaeology minigame
useModalStore().open('Archaeology', { pokemon: { id: 'aerodactyl', name: 'Aerodactyl' }, rarity: 50 });

// Trigger Save serialization check
useGameStore().scheduleSave();
```

---

## 🎯 9. Sign-off Criteria

A manual QA test pass is considered **100% Successful** when:

- [ ] No JavaScript runtime errors appear in the DevTools console.
- [ ] GSAP timelines execute smoothly at 60 FPS without stutter or premature clipping.
- [ ] Pokémon sprites, trainer entities, and shadows maintain pixel-art crispness (`image-rendering: pixelated`).
- [ ] HUD elements correctly show/hide between wild, trainer, gym, and minigame states.
- [ ] All created, traded, or published Pokémon strictly satisfy Showdown legality rules.
- [ ] State saves and reloads with zero data loss or undefined field errors.
