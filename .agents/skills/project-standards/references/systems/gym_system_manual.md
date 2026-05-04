# Gym and Progression Manual (Poké Vicio)

This manual defines the behavior of Gym Leaders, their difficulty scaling, and the badge system.

## 🏅 Badge System

- **Linear Progress**: Gyms are locked by the number of badges required (e.g., Misty requires 1 badge, Surge requires 2).
- **Level Control**: Badges determine the maximum obedience level of Pokémon (Gen 1-4 rule).

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
- **Reward**: Rare Held Items and possibility of exclusive TM.

---

## 🧠 Leader Battle Logic

1. **The Ace**: The last Pokémon of the team is always the leader's "Ace" and usually carries an equipped item.
2. **AI Priority**: Leaders have an improved AI that prioritizes super-effective moves and status changes.
3. **Rewards**: The `rewardTM` is granted only on the first victory. In rematches, scaled money is granted according to the difficulty.
