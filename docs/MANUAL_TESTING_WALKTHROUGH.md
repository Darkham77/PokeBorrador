# Manual QA & Visual Verification Walkthrough

This document outlines the comprehensive manual testing protocol to verify all user interfaces, visual animations, game state transitions, modals, and persistence workflows refactored across the codebase.

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

### 2.2 Trainer & Rival Battles (`BattleTrainerEntities.vue` / `BattleTrainerSpeechBubble.vue`)

- **Step 1**: Trigger a Trainer or Rival battle (e.g., from Gyms, map events, or Admin Debug tab):
  - **Visual Check (Rival Alert)**: If rival battle, verify screen flicker flash and red `!` exclamation mark zoom-in animation play with proper sound effect.
  - **Visual Check (Trainer Entry)**: Trainer sprite slides in onto the arena with shadow (`.trainer-shadow`) aligned to base feet coordinates.
  - **Visual Check (Speech Bubble)**: Speech bubble appears above trainer (`.speech-bubble`), display speaker name and quote text (`trainerDialogText`).
  - **Visual Check (Retreat & Sendout)**: Speech bubble fades out, trainer slides off-screen, and Pokéball throw / Pokémon release animation triggers seamlessly.
- **Step 2**: Combatant Dynamic Camera (`useCombatCamera.ts`):
  - Verify arena container scales smoothly with subtle camera tilt/zoom during critical hits or powerful moves.

### 2.3 Battle Bag & In-Combat Item Usage (`itemEffects.ts` / `itemGlobalBuffs.ts` / `itemTargetValidator.ts`)

- **Step 1**: In battle, open the **Bag / Mochila**:
  - Select a **Potion / Poción**: Apply to an injured Pokémon -> Verify healing particle animation and HP bar refill.
  - Select a **Revive / Revivir**: Verify only fainted Pokémon are selectable; healthy Pokémon are disabled/grayed out.
  - Select an **X Attack / Ataque X** or battle booster -> Verify stat stage boost icon and floating indicator appear over active combatant.
  - Verify player's turn is consumed, enemy executes their turn immediately following item usage (`turnActionResolver.ts`).

### 2.4 Fleeing & Escape Sequence (`battleTurn.ts`)

- **Step 1**: In a wild encounter, click **"Huir"** (Run):
  - **Visual Check**: Player Pokémon retreat animation plays (`escape-enemy` tween), battle exits cleanly to map.

---

## 🎮 3. Minigames & Modal Interactions

### 3.1 Archaeology Minigame (`ArchaeologyModal.vue` / `archaeologyGameHelper.ts`)

- **Step 1**: On a map with archaeology (or via Admin Debug modal -> Archaeology):
  - Open Archaeology modal.
  - **Interaction Check**: Select Dig Tool (Pico / Cepillo / Pala) and click dirt tiles on the grid.
  - Verify tile degradation layers (rock -> cracked -> dirt -> reveal) display correct sprite frames.
  - Complete uncovering an item/fossil -> Verify victory modal and reward dispatch into player inventory.
  - Click cancel/close -> Verify clean state reset without memory leaks or frozen UI.

### 3.2 Fishing Minigame (`useBattleArenaCoordinator.ts`)

- **Step 1**: Fish in a water route (e.g., Pallet Town / Route 21):
  - Verify fishing bobber animation and timing bite event.
  - Hook a Pokémon -> Verify minigame success transitions directly into the wild battle sequence (`initBattleSequence`).

### 3.3 Pokémon Selection Modal (`PokemonSelectionModal.vue`)

- **Step 1**: Open Team Management or Box view:
  - Click on a slot to switch Pokémon.
  - Filter by Type, Tier, or Level -> Verify list updates instantaneously without layout jitter.
  - Select a Pokémon -> Verify slot updates and team state persists.

---

## 💬 4. Social & Chat Systems

### 4.1 Chat & Private Messaging (`chatPrivate.ts` / `chatDateHelper.ts` / `chatSanitizer.ts`)

- **Step 1**: Open the Social Center (`SocialView.vue`).
- **Step 2**: Send a message in Global/Trade/Faction chat:
  - Verify text sanitization (HTML/scripts stripped, no XSS vulnerability).
  - Verify timestamp displays formatted relative/absolute time accurately.
- **Step 3**: Open Private Inbox with another user/bot:
  - Verify messages load in chronological order with unread badges clearing on focus.

### 4.2 Global Trade Station (GTS) (`gts.ts`)

- **Step 1**: Open GTS Modal.
- **Step 2**: Browse public listings -> Verify Pokémon sprite, level, nature, and asking price render properly.
- **Step 3**: Create a test trade listing -> Verify inventory/box deduction and listing card creation.

---

## 🧬 5. Evolution & Game State Persistence

### 5.1 Evolution Scene (`evolution.ts` / `EvolutionScene.vue`)

- **Step 1**: Level up a Pokémon ready to evolve (or use an Evolution Stone):
  - **Visual Check**: Evolution scene modal opens with dark backdrop.
  - Glowing silhouette pulsing animation alternates between pre-evolution and evolved form.
  - Confirm evolution -> Verify fanfare audio plays and new species is registered in Pokédex.
  - Cancel evolution (press `B` or cancel button) -> Verify evolution aborts and pre-evolution is preserved.

### 5.2 Auto-Save & Manual Persistence (`saveService.ts` / `saveSanitizer.ts` / `saveSerializer.ts`)

- **Step 1**: Make state changes (buy items, heal Pokémon, change party order).
- **Step 2**: Trigger manual save (Settings / Save button) or wait for battle conclusion auto-save.
  - Verify "Guardado exitoso" toast appears.
- **Step 3**: Refresh browser (`Ctrl+F5` / `Cmd+Shift+R`):
  - Verify entire state (team HP, PP, inventory quantities, coins, map coordinates) restores with 100% fidelity.

---

## ⚡ 6. Fast Verification Cheat Sheet (Console Shortcuts)

Open DevTools Console (`F12`) and execute any of these helpers to jump directly into specific UI states:

```javascript
// Trigger a wild battle instantly
window.__VITE_DEBUG__?.triggerWildBattle?.('route1', 'pikachu', 15);

// Trigger a trainer battle
window.__VITE_DEBUG__?.triggerTrainerBattle?.('youngster', 10);

// Open Archaeology minigame
useModalStore().open('Archaeology', { pokemon: { id: 'aerodactyl', name: 'Aerodactyl' }, rarity: 50 });

// Open Fishing minigame
useModalStore().open('Fishing', { pokemon: { id: 'magikarp', name: 'Magikarp' }, rarity: 30 });

// Trigger Save serialization check
useGameStore().scheduleSave();
```

---

## 🎯 7. Sign-off Criteria

A manual QA test pass is considered **100% Successful** when:

- [ ] No JavaScript runtime errors appear in the DevTools console.
- [ ] GSAP timelines execute smoothly at 60 FPS without stutter or premature clipping.
- [ ] Pokémon sprites, trainer entities, and shadows maintain pixel-art crispness (`image-rendering: pixelated`).
- [ ] HUD elements correctly show/hide between wild, trainer, gym, and minigame states.
- [ ] State saves and reloads with zero data loss or undefined field errors.
