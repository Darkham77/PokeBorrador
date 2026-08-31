# Gym and Progression Manual (Poké Vicio)

This manual defines the behavior of Gym Leaders, their difficulty scaling, and the badge system.

## 🏅 Badge System & Progression

- **Linear Progress**: Gyms are unlocked sequentially based on the number of badges acquired (`badgesRequired`).
- **Level Obedience Control**: Badges determine the maximum level cap for Pokémon obedience and wild capture penalties ($BP$). SSoT formulas and behavioral states are governed in [`obedience_mechanics_manual.md`](obedience_mechanics_manual.md).
- **Gym Isolation**: Standard gyms maintain constant day lighting (`effectiveCycle = 'day'`) and block natural outdoor weather unless an explicit override (`fixedCycle` or `fixedWeather`) is configured.

### 1. Canonical Kanto Gym Leaders Registry
| # | Gym Leader | City / Location | Elemental Type | Badge | Required Badges | Level Cap | First Victory TM | Easy Ace | Hard Ace |
| :-: | :--- | :--- | :--- | :--- | :-: | :-: | :--- | :--- | :--- |
| **1** | **Brock** | Ciudad Plateada (`pewter_city`) | Rock | 💎 Medalla Roca | 0 | Lv 20 | `tm39` (Rock Tomb) | Onix (Lv 14) | Onix (Lv 68) |
| **2** | **Misty** | Ciudad Celeste (`cerulean_city`) | Water | 💧 Medalla Cascada | 1 | Lv 30 | `tm03` (Water Pulse) | Starmie (Lv 21) | Starmie (Lv 70) |
| **3** | **Lt. Surge** | Ciudad Carmín (`vermilion_city`) | Electric | ⚡ Medalla Trueno | 2 | Lv 40 | `tm34` (Shock Wave) | Raichu (Lv 24) | Raichu (Lv 72) |
| **4** | **Erika** | Ciudad Azulona (`celadon_city`) | Grass | 🌸 Medalla Arcoíris | 3 | Lv 50 | `tm19` (Giga Drain) | Vileplume (Lv 29) | Vileplume (Lv 74) |
| **5** | **Koga** | Ciudad Fucsia (`fuchsia_city`) | Poison | 💀 Medalla Alma | 4 | Lv 60 | `tm06` (Toxic) | Venomoth (Lv 43) | Venomoth (Lv 76) |
| **6** | **Sabrina** | Ciudad Azafrán (`saffron_city`) | Psychic | 👁️ Medalla Pantano | 5 | Lv 70 | `tm29` (Psychic) | Alakazam (Lv 43) | Alakazam (Lv 78) |
| **7** | **Blaine** | Isla Canela (`cinnabar_island`) | Fire | 🔥 Medalla Volcán | 6 | Lv 80 | `tm38` (Fire Blast) | Arcanine (Lv 47) | Arcanine (Lv 80) |
| **8** | **Giovanni** | Ciudad Verde (`viridian_city`) | Ground | 🌍 Medalla Tierra | 7 | Lv 100 | `tm26` (Earthquake) | Rhydon (Lv 50) | Rhydon (Lv 85) |

---

## 🧗 Difficulty Levels (Rematch)

Each gym can be faced in three difficulties:

### 1. Easy (Journey Mode)

- **Team**: 2-3 base Pokémon.
- **Levels**: 12 - 50.
- **Reward**: Badge and specific TM (first time).

### 2. Normal (Veteran Mode)

- **Team**: 4 evolved Pokémon.
- **Levels**: 30 - 70.
- **Reward**: Battle Coins and higher XP.

### 3. Hard (Master Mode)

- **Team**: 6 Pokémon with perfect IVs and strategic Held Items.
- **Levels**: 65 - 90+.
- **Reward**: Rare Held Items and possibility of exclusive TM (3% chance on Normal rematch, 5% chance on Hard rematch).

---

## 🧠 Leader Battle Logic

1. **The Ace**: The last Pokémon of the team is always the leader's "Ace" and usually carries an equipped item.
2. **AI Priority**: Leaders have an improved AI that prioritizes super-effective moves and status changes.
3. **Rewards**: The `rewardTM` is granted only on the first victory. In rematches, scaled money and XP are granted according to the difficulty using the internal `gymProgress` scaling factors.
4. **Progress Persistence**: Wins are tracked independently per difficulty in `game.state.gymProgress[gymId]`. A "Completed" status requires defeating the leader in all 3 modes.
5. **Dynamic UI Feedback**: Gym cards MUST show the estimated XP/Money rewards for the selected difficulty to set player expectations before the challenge.
6. **Difficulty Localization**: Gym card layouts and rematch views must translate difficulty levels to their localized Spanish representation (`FÁCIL`, `NORMAL`, `DIFÍCIL`) when rendering labels and victory statuses to ensure UI language consistency.
