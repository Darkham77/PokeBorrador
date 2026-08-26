# Manual QA & Visual Verification Walkthrough

This document outlines the comprehensive manual testing protocol to verify all user interfaces, visual animations, game state transitions, modals, debug tools, breeding cycles, and persistence workflows refactored across the codebase.

---

## 🚀 0. Prerequisites & Environment Setup

1. **Launch the Local Development Server**:

   ```bash
   npm run dev
   ```

2. **Open the Game Client**:
   Navigate to `http://localhost:5173` in a modern Chromium or Firefox browser.
3. **Open Developer Tools Console** (`F12`):
   Ensure `Console` and `Network` tabs are visible for real-time state logging.

---

## 📋 1. Authentication & Trainer Profile Verification

### 1.1 Login & Guest Flow (`LoginView.vue` / `useLoginHandlers.ts`)

- **Step 1**: Open the app in an incognito window or clear local storage.
- **Step 2**: Click **"Jugar como Invitado"** (Guest Mode).
  - **Expected**: Smooth fade transition, player save initialized with starter Pokémon, redirects to Map view without errors.
- **Step 3**: Test Cloud/Supabase Login input validation:
  - Enter invalid email format -> Verify UI inline error message appears immediately.
  - Enter empty password -> Verify form submission is blocked.

### 1.2 Trainer Profile & Avatar (`TrainerProfileModal.vue` / `trainerProfileResolver.ts`)

- **Step 1**: Click on the player avatar in the top navigation bar.
- **Step 2**: Verify Trainer Profile Modal:
  - Player sprite/avatar renders pixel-perfect with correct gender/theme suffix.
  - Player stats (Pokémon caught, battles won, badges earned) load cleanly without hydration glitches.
  - Close the modal via close button (`X`) and backdrop click -> Verify smooth GSAP exit transition.

---

## ⚔️ 2. Battle Arena & Visual Animations (Core Refactor)

### 2.1 Wild Pokémon Battle Flow (`BattleArenaView.vue` / `BattleArenaHud.vue`)

- **Step 1**: Navigate to **Ruta 1** (`Route 1`) on the world map.
- **Step 2**: Click **"Buscar Pokémon"** (Wild Search) or enter a random wild battle:
  - **Visual Check**: Grass emergence animation plays smoothly.
  - **Visual Check**: Wild Pokémon silhouette appears and reveals into colored sprite without layout jumps.
  - **Visual Check (HUD Entry)**: Player HUD slides in from the right (`HUD_TRANSITION_X_OFFSET_PX`), enemy HUD slides in from the left.
- **Step 3**: Attack Execution:
  - Hover over a move -> Verify **Move Tooltip** (`MoveTooltipStatsGrid.vue`, `MoveTooltipStatus.vue`) renders accurate power, accuracy, type badge, PP counter, and damage formula details.
  - Select a move -> Verify player combatant attack animation triggers, damage flash occurs on enemy, HP bar smoothly depletes via GSAP timeline.
  - Verify battle log box at bottom displays battle events with proper color-coded tags (`log-damage`, `log-info`).
- **Step 4**: Defeating Wild Pokémon:
  - Knock out the enemy -> Verify enemy combatant faint animation (slides down with fade out), XP bar gain animation plays on player HUD.
  - Victory banner appears -> Click to return to Map view.

### 2.2 Forced Switch & Quick Team Drawer (`BattleQuickTeam.vue` / `BattleArenaControls.vue`)

- **Step 1**: In battle, let the active Pokémon faint (or use Debug Action Panel to set HP to 0).
- **Step 2**: Observe forced switch state:
  - Faint animation completes cleanly.
  - Battle state transitions to `battle-forced-switch-required`.
  - Quick Team drawer automatically slides open.
  - Living bench Pokémon are clickable; fainted slots are disabled with visual red indicator.
- **Step 3**: Select a living Pokémon:
  - Chosen Pokémon enters the field with entry hazards and abilities triggering smoothly.
  - Quick Team closes and normal combat controls restore.

### 2.3 Forced Recharge Turns (`Blast Burn` / `Hyper Beam` / `Giga Impact`)

- **Step 1**: Use `Blast Burn`, `Hyper Beam`, or `Giga Impact` against an enemy.
- **Step 2**: On the subsequent turn:
  - Move buttons are automatically clamped/locked to `Recharge`.
  - Turn executes the recharge state cleanly, logging "Must recharge!".
  - Normal move selection restores in the following turn.

### 2.4 Trainer & Rival Battles (`BattleTrainerEntities.vue` / `BattleTrainerSpeechBubble.vue`)

- **Step 1**: Trigger a Trainer or Rival battle (from Gyms, map events, or Admin Debug tab):
  - **Visual Check (Rival Alert)**: If rival battle, verify screen flicker flash and red `!` exclamation mark zoom-in animation play with proper sound effect.
  - **Visual Check (Trainer Entry)**: Trainer sprite slides in onto the arena with shadow (`.trainer-shadow`) aligned to base feet coordinates.
  - **Visual Check (Speech Bubble)**: Speech bubble appears above trainer (`.speech-bubble`), display speaker name and quote text (`trainerDialogText`).
  - **Visual Check (Retreat & Sendout)**: Speech bubble fades out, trainer slides off-screen, and Pokéball throw / Pokémon release animation triggers seamlessly.
- **Step 2**: Combatant Dynamic Camera (`useCombatCamera.ts`):
  - Verify arena container scales smoothly with subtle camera tilt/zoom during critical hits or powerful moves.

### 2.5 Battle Bag & In-Combat Item Usage (`battleItemUseHelper.ts` / `itemTargetValidator.ts`)

- **Step 1**: In battle, open the **Bag / Mochila**:
  - Select a **Potion**: Apply to an injured Pokémon -> Verify healing particle animation and HP bar refill.
  - Select a **Revive**: Verify only fainted Pokémon are selectable; healthy Pokémon are disabled/grayed out. Use on fainted mon -> HP restores to 50%.
  - Select an **X Attack / Ataque X**: Verify stat stage boost icon and floating indicator appear over active combatant.
  - Verify player's turn is consumed, enemy executes their turn immediately following item usage.

### 2.6 In-Battle Debug Action Panel (`DebugActionPanel.vue` / `DebugActionPanelQuickButtons.vue`)

- **Step 1**: In debug mode (`window.__VITE_DEBUG__ = true`), inspect the top debug bar:
  - Click **"KO Enemy"** -> Verify enemy faints immediately.
  - Click **"Heal Team"** -> Verify all team HP/PP max out.
  - Click **"Set Weather (Rain/Sun/Snow)"** -> Verify atmospheric weather visual changes on the fly.

---

## 🛠️ 3. Admin & Debug Tools Verification

### 3.1 Debug Pokémon Creator (`DebugPokemonCreator.vue` / `PokemonMovePicker.vue`)

- **Step 1**: Open **Admin Panel -> Creador de Pokémon**.
- **Step 2**: Species & Gender Legality:
  - Select `Miraidon` / `Mewtwo` -> Verify gender is locked to `N`.
  - Select `Blissey` -> Verify gender is locked to `F`.
  - Select `Tauros` -> Verify gender is locked to `M`.
- **Step 3**: Ability & Move Filtering:
  - Verify ability dropdown only contains legal Showdown Dex abilities for the selected species.
  - Open Move Picker -> Verify moves are categorized into Level-up learnsets vs TMs.
- **Step 4**: Click "Añadir al Equipo" -> Verify Pokémon is added with 100% legal stats and moves.

### 3.2 Individual Pokémon Editor (`IndividualPokemonEditor.vue`)

- **Step 1**: Open Individual Pokémon Editor from team/box.
- **Step 2**: Verify legality badge updates to Green ("100% Legal") for valid spreads, or Red with explicit warning text for impossible combinations.

---

## 🐣 4. Daycare & Egg Incubation Flow

### 4.1 Walked Eggs & Hatching (`WalkedEggsPanel.vue` / `breeding.ts`)

- **Step 1**: Open **Huevos / Crianza** modal.
- **Step 2**: Inspect egg card showing step progress (`currentSteps / maxSteps`).
- **Step 3**: Walk on the map or fight battles to accumulate steps.
- **Step 4**: When steps reach 100%:
  - **Visual Check**: Egg cracking animation triggers with rhythmic wobble and light bursts.
  - Egg hatches into Lv 1 newborn with inherited IVs, nature, and egg moves.
  - Claim newborn -> Deposited into party or PC Box.

---

## 🏆 5. Events, Missions & Past Events History

### 5.1 World Events & Missions (`WorldEventsModal.vue` / `EventMissions.vue`)

- **Step 1**: Open **Eventos Mundiales** modal.
- **Step 2**: Inspect active missions (e.g. "Catch 5 Fire-type Pokémon").
- **Step 3**: Complete mission -> Click **"Reclamar Recompensa"** -> Verify items/funds credited.

### 5.2 Past Events History & Podium (`PastEventsList.vue` / `PastEventCard.vue`)

- **Step 1**: Switch to **"Historial de Eventos"** tab.
- **Step 2**: Verify past events list with formatted dates in `GAME_TIMEZONE`.
- **Step 3**: Inspect Top 3 Leaderboard Podium (🥇 1st, 🥈 2nd, 🥉 3rd) with trainer avatars and scores.
- **Step 4**: Click **"Reclamar Premio"** for eligible placements -> Verify toast notice and button state changes to "Reclamado".

---

## 🎨 6. Visuals & GSAP Effects

### 6.1 Pokémon Center Healing (`HealModal.vue`)

- **Step 1**: Visit a Pokémon Center and talk to Nurse Joy.
- **Step 2**: Verify Pokéball placement animation, glowing light pulses, fanfare sound, and full restoration of team HP, PP, and status.

### 6.2 Status FX & Atmosphere Layer (`PVStatusFX.vue` / `AtmosphereLayer.vue`)

- **Step 1**: Apply Burn/Poison/Paralysis/Sleep/Freeze in combat -> Verify corresponding particle emitters.
- **Step 2**: Travel between rain, snow, sandstorm, and leaf-fall routes -> Verify smooth 60 FPS particle drift.

---

## 💾 7. Persistence & Save Verification

### 7.1 Auto-Save & Manual Persistence (`saveSanitizer.ts` / `saveSerializer.ts`)

- **Step 1**: Make state changes (buy items, heal team, change team order).
- **Step 2**: Click **"Guardar Partida"** (Save Game).
- **Step 3**: Refresh the page (`F5`) -> Verify 100% state restoration with zero missing fields or corrupted data.

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
