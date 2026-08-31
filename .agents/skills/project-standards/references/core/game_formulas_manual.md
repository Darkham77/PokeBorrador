# Game Formulas and Mathematical Ratios Manual (Poké Vicio)

> **Scope & Authority**: This manual documents the pure mathematical formulas, probability ratios, statistical calculations, and game balance constants that govern the Poké Vicio engine.
> **Sources of Truth**:
> - Combat Execution: [`../battle/battle_mechanics_manual.md`](../battle/battle_mechanics_manual.md)
> - Status Conditions: [`../battle/status_ailments_manual.md`](../battle/status_ailments_manual.md)
> - Capture Mechanics: [`../systems/capturing_manual.md`](../systems/capturing_manual.md)
> - EV & Training Engine: [`../systems/ev_mechanics_manual.md`](../systems/ev_mechanics_manual.md)
> - Obedience & Level Caps: [`../systems/obedience_mechanics_manual.md`](../systems/obedience_mechanics_manual.md)

---

## 1. ⚙️ Global Engine Configuration

The battle engine formulas module (`battleFormulas.ts`) is driven by centralized generation constants:

- **`CURRENT_GENERATION`**: `9` (Default species, learnset, and move data base).
- **`ACTIVE_RULE_SET`**: `9` (Active combat formulas, critical hit calculations, and STAB modifiers).

### Bridge Integrity (Parameter Drift Prevention)
The bridge between the UI and the math core (`battleFormulas.ts`) **MUST** pass all context parameters (stages, weather, terrain, day cycle) explicitly to the pure math functions. Never assume implicit parameter derivation.

---

## 2. 🧬 Pokémon Core Stat Calculations

### 1. Maximum Hit Points (HP)

$$\text{HP} = \left\lfloor \frac{\left(2 \cdot \text{Base}_{\text{HP}} + \text{IV}_{\text{HP}} + \left\lfloor \frac{\text{EV}_{\text{HP}}}{4} \right\rfloor\right) \cdot \text{Level}}{100} \right\rfloor + \text{Level} + 10$$

- **Shedinja Exception**: Shedinja's maximum HP is hardcoded to $1$.

### 2. Combat Stats ($\text{Atk}, \text{Def}, \text{SpA}, \text{SpD}, \text{Spe}$)

$$\text{Stat} = \left\lfloor \left( \left\lfloor \frac{\left(2 \cdot \text{Base} + \text{IV} + \left\lfloor \frac{\text{EV}}{4} \right\rfloor\right) \cdot \text{Level}}{100} \right\rfloor + 5 \right) \cdot \text{Nature} \right\rfloor$$

- **Nature Multiplier**:
  - Beneficial ($+10\%$): $1.1$
  - Hindering ($-10\%$): $0.9$
  - Neutral: $1.0$

#### Complete 25-Nature Statistical & Flavor Matrix
| Nature | Boosted Stat ($+10\%$) | Lowered Stat ($-10\%$) | Preferred Flavor | Disliked Flavor |
| :--- | :--- | :--- | :--- | :--- |
| **Hardy** | — (Neutral) | — (Neutral) | — | — |
| **Lonely** | Attack | Defense | Spicy | Sour |
| **Brave** | Attack | Speed | Spicy | Sweet |
| **Adamant** | Attack | Sp. Attack | Spicy | Dry |
| **Naughty** | Attack | Sp. Defense | Spicy | Bitter |
| **Bold** | Defense | Attack | Sour | Spicy |
| **Docile** | — (Neutral) | — (Neutral) | — | — |
| **Relaxed** | Defense | Speed | Sour | Sweet |
| **Impish** | Defense | Sp. Attack | Sour | Dry |
| **Lax** | Defense | Sp. Defense | Sour | Bitter |
| **Timid** | Speed | Attack | Sweet | Spicy |
| **Hasty** | Speed | Defense | Sweet | Sour |
| **Jolly** | Speed | Sp. Attack | Sweet | Dry |
| **Naive** | Speed | Sp. Defense | Sweet | Bitter |
| **Serious** | — (Neutral) | — (Neutral) | — | — |
| **Modest** | Sp. Attack | Attack | Dry | Spicy |
| **Mild** | Sp. Attack | Defense | Dry | Sour |
| **Quiet** | Sp. Attack | Speed | Dry | Sweet |
| **Bashful** | — (Neutral) | — (Neutral) | — | — |
| **Rash** | Sp. Attack | Sp. Defense | Dry | Bitter |
| **Calm** | Sp. Defense | Attack | Bitter | Spicy |
| **Gentle** | Sp. Defense | Defense | Bitter | Sour |
| **Sassy** | Sp. Defense | Speed | Bitter | Sweet |
| **Careful** | Sp. Defense | Sp. Attack | Bitter | Dry |
| **Quirky** | — (Neutral) | — (Neutral) | — | — |

### 3. Total Power (TOT / TOTAL)

$$\text{Total Power} = \text{BST} + \sum_{i \in \text{stats}} \text{IV}_i + \sum_{i \in \text{stats}} \left\lfloor \frac{\text{EV}_i}{4} \right\rfloor$$

- **BST**: Sum of all 6 base stats ($\text{HP} + \text{Atk} + \text{Def} + \text{SpA} + \text{SpD} + \text{Spe}$).
- **Genetic IVs**: Sum of all 6 genetic IVs ($0$ to $186$).
- **Trained EVs**: Sum of $\lfloor \text{EV}_i / 4 \rfloor$ (adds up to $+127$ points for 510 total EVs).

---

## 3. ⚔️ Stat Stages & Combat Modifiers

In battle, stats can be boosted or lowered across stages from $-6$ to $+6$.

### 1. Regular Stat Stages ($\text{Atk}, \text{Def}, \text{SpA}, \text{SpD}, \text{Spe}$)

$$\text{Multiplier}(S) = \frac{\max(2, 2 + S)}{\max(2, 2 - S)}$$

| Stage ($S$) | Multiplier Fraction | Decimal | Percentage Change |
| :---: | :---: | :---: | :---: |
| **$-6$** | $\frac{2}{8}$ | $0.25\times$ | $-75\%$ |
| **$-5$** | $\frac{2}{7}$ | $\approx 0.285\times$ | $-71.4\%$ |
| **$-4$** | $\frac{2}{6}$ | $\approx 0.333\times$ | $-66.7\%$ |
| **$-3$** | $\frac{2}{5}$ | $0.40\times$ | $-60\%$ |
| **$-2$** | $\frac{2}{4}$ | $0.50\times$ | $-50\%$ |
| **$-1$** | $\frac{2}{3}$ | $\approx 0.666\times$ | $-33.3\%$ |
| **$0$** | $\frac{2}{2}$ | $1.00\times$ | Baseline |
| **$+1$** | $\frac{3}{2}$ | $1.50\times$ | $+50\%$ |
| **$+2$** | $\frac{4}{2}$ | $2.00\times$ | $+100\%$ |
| **$+3$** | $\frac{5}{2}$ | $2.50\times$ | $+150\%$ |
| **$+4$** | $\frac{6}{2}$ | $3.00\times$ | $+200\%$ |
| **$+5$** | $\frac{7}{2}$ | $3.50\times$ | $+250\%$ |
| **$+6$** | $\frac{8}{2}$ | $4.00\times$ | $+300\%$ |

### 2. Accuracy and Evasion Stages

$$\text{AccMultiplier}(S) = \frac{\max(3, 3 + S)}{\max(3, 3 - S)}$$

| Stage ($S$) | Fraction | Decimal |
| :---: | :---: | :---: |
| **$-6$** | $\frac{3}{9}$ | $0.333\times$ |
| **$-5$** | $\frac{3}{8}$ | $0.375\times$ |
| **$-4$** | $\frac{3}{7}$ | $\approx 0.428\times$ |
| **$-3$** | $\frac{3}{6}$ | $0.50\times$ |
| **$-2$** | $\frac{3}{5}$ | $0.60\times$ |
| **$-1$** | $\frac{3}{4}$ | $0.75\times$ |
| **$0$** | $\frac{3}{3}$ | $1.00\times$ |
| **$+1$** | $\frac{4}{3}$ | $\approx 1.333\times$ |
| **$+2$** | $\frac{5}{3}$ | $\approx 1.666\times$ |
| **$+3$** | $\frac{6}{3}$ | $2.00\times$ |
| **$+4$** | $\frac{7}{3}$ | $\approx 2.333\times$ |
| **$+5$** | $\frac{8}{3}$ | $\approx 2.666\times$ |
| **$+6$** | $\frac{9}{3}$ | $3.00\times$ |

### 3. Critical Hit Probability (Gen VII+)

| Critical Stage ($C$) | Probability Fraction | Percentage |
| :---: | :---: | :---: |
| **$0$** | $\frac{1}{24}$ | $\approx 4.17\%$ |
| **$+1$** | $\frac{1}{8}$ | $12.5\%$ |
| **$+2$** | $\frac{1}{2}$ | $50\%$ |
| **$+3$ or higher** | $\frac{1}{1}$ | $100\%$ (Guaranteed) |

- **Damage Multiplier**: $1.5\times$ standard ($2.0\times$ if the attacker has *Sniper*).
- **Stage Bypass**: Critical hits ignore negative Attack/SpA stages on the attacker and positive Defense/SpD stages on the defender.

---

## 4. 🧬 Individual Values (IVs) Generation

### 1. Standard Wild Roll
```text
IV = floor(Random(0, 31))
```

### 2. Competitive Re-roll (Guardians / Alphas)
```text
IV_Final = max(ivFloor, max(Random(0, 31), Random(0, 31)))
```
*Where `ivFloor` is `12` for Guardians/Alphas.*

### 3. Faction War / Contextual Floors
```text
IV_Effective = max(ContextualBonus, IV_Generated)
```
- **ContextualBonus**: `15` for Map Dominance, `Streak` for Bug Catchers, or `N` for specialized quest rewards.

---

## 5. 🌪️ Weather Combat Multipliers

| Weather | Damage Boost | Damage Reduction | Defensive Boost | Residual Damage | Special Effects |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Sun** | Fire ($1.5\times$) | Water ($0.5\times$) | — | — | Solar Beam (Instant), Synthesis (66%), Thunder/Hurricane (50% Acc) |
| **Rain** | Water ($1.5\times$) | Fire ($0.5\times$) | — | — | Thunder/Hurricane (100% Acc), Synthesis (25%) |
| **Sandstorm** | — | — | Rock ($1.5\times$ SpD) | $\frac{1}{16}$ HP (Non-Rock/Ground/Steel) | Solar Beam (50% Pow), Synthesis (25%) |
| **Snow** | — | — | Ice ($1.5\times$ Def) | **NONE** | Blizzard (100% Acc), Synthesis (25%), Solar Beam (50% Pow) |
| **Hail** | — | — | — | $\frac{1}{16}$ HP (Non-Ice) | Blizzard (100% Acc), Synthesis (25%), Solar Beam (50% Pow) |
| **Fog** | — | — | — | — | **Accuracy: 60% (All moves)**, Solar Beam (50% Pow) |
| **Strong Winds** | — | — | — | — | **Delta Stream**: Removes flying weaknesses. |

---

## 6. 🆙 Experience & Level Progression

### 1. Next Level Experience
```text
Next_Level_XP = floor(Current_XP * 1.2)
```

### 2. EXP Yield per Defeated Foe
```text
Exp_Yield = floor(Enemy_Level * 4 * Distribution * ClassMultiplier * GlobalMultiplier)
```
- **Distribution**: `1.0` (Active combatant), `0.5` (EXP Share).
- **Max Level Cap**: `100` (`MAX_POKEMON_LEVEL` in `src/data/system/constants.ts`).

---

## 7. 📏 Physical Dimensions (Height & Weight)

Pokémon dimensions follow a deterministic Gaussian distribution (Irwin-Hall $n=4$) centered on canonical species values with $\pm 15\%$ maximum variation:

```text
gaussian  = (prng() + prng() + prng() + prng()) / 4.0   // Mean ~0.5
factor    = 1 + (gaussian - 0.5) * 2 * 0.15             // Range [0.85, 1.15]
Dimension = Base_Dimension * factor
```

### Dimension Tiers
| Tier | ID | Delta Range | UI Glow / Aura |
| :--- | :--- | :--- | :--- |
| **Miniature** | `XXS` | $< -12.5\%$ | Cyan Ice Diamond Glow |
| **Small** | `XS` | $[-12.5\%, -9.0\%)$ | Blue Ice |
| **Short** | `S` | $[-9.0\%, -6.0\%)$ | Slate Blue |
| **Standard** | `M` | $[-6.0\%, +6.0\%]$ | Neutral Gray |
| **Tall** | `L` | $(+6.0\%, +9.0\%]$ | Amber Gold |
| **Large** | `XL` | $(+9.0\%, +12.5\%]$ | Orange Flame |
| **Titan** | `XXL` | $> +12.5\%$ | Legendary Gold Aura |

---

## 8. 🪙 Economy & Black Market Math

### Rocket Black Market Valuation
```text
Price = floor((Level * 50 + (TotalIVs / 186) * 500) * 0.8)
```
*Where `TotalIVs` is the sum of all 6 genetic IVs (max 186).*

---

## 9. 📈 Global Game Probability Ratios (`GAME_RATIOS`)

- **Shiny Baseline**: $1$ in $3000$ wild encounters.
- **Rival (Blue) Encounter**: $0.1\%$ on any overworld map.
- **Legendaries (with active ticket)**:
  - Articuno: $1.0\%$ (Seafoam Islands).
  - Mewtwo: $0.1\%$ (Cerulean Cave).
- **Fishing Trigger**: $10\%$ base on water tiles.
- **Wild Held Items**: Common $50\%$, Rare $5\%$.
- **Gym TM Drop Rates**: Normal difficulty $3\%$, Hard difficulty $5\%$.

---

## 10. 🎮 Minigame Mathematical Models

### 1. Fishing Rhythm Mechanics
Difficulty factor scales inversely with species spawn rarity:
```text
Difficulty_Factor = 101 - Rarity
```

- **Total Rhythm Notes**: $\min(22, 5 + \lfloor \text{Difficulty\_Factor} / 7 \rfloor)$ (Range: 5 to 22 notes).
- **Ring Collapse Duration**: $\text{round}(\max(380, 1100 - (\text{Difficulty\_Factor} \cdot 7.5)) \cdot 1.1)$ (Range: 418ms to 1202ms).
- **Precision Hit Window**: $\max(100, 190 - (\text{Difficulty\_Factor} / 1.3))$ (Range: 113ms to 189ms).

### 2. Archaeology & Fossil Excavation
- **Encounter Rate**: Caves $10\%$, Mountains $5\%$, Others $0\%$.
- **Excavation Reward Weights**:
  - Fossils: $45\%$
  - Evolutionary Stones: $25\%$
  - Ores & Gems: $30\%$ (Common $20\%$, Rare $10\%$).

### 3. Game Corner Roulette Payouts (Gen III Specification)
The roulette features 12 slots (4 species: Wynaut, Azurill, Skitty, Makuhita $\times$ 3 colors: Yellow, Green, Purple). Balls remain in occupied slots for up to 6 spins before a table reset.

$$\text{Payout Multiplier} = \frac{12}{\text{Empty Winning Slots}}$$

| Bet Type | Base Winning Slots | Empty Table Multiplier | 1 Empty Slot Left | 2 Empty Slots Left | 3 Empty Slots Left |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Specific Slot** | $1$ | $12\times$ | $12\times$ | — | — |
| **Species Column** | $3$ | $4\times$ | $12\times$ | $6\times$ | $4\times$ |
| **Color Row** | $4$ | $3\times$ | $12\times$ | $6\times$ | $4\times$ |

- **Ball Collision**: If a ball lands on an occupied slot, it bounces to an adjacent slot at random.
- **Rescue Mechanics**: If stuck between two occupied slots, a rescue Pokémon (Taillow/Shroomish) dislodges the ball into an empty slot.

---

## 11. 🦖 Daycare Genetic DNA Cloning Math

### 1. Cloning Cost Formula
$$\text{Cost} = 3000 + 1000 \cdot N$$
*Where $N$ is the number of additional sacrificed fossils ($0 \le N \le 6$). Maximum cost is $\$9,000$.*

### 2. Genetic IV Re-rolls
- **Guaranteed Rolls**: $1 + \lfloor N / 2 \rfloor$ independent rolls per stat, selecting the maximum.
- **Odd Sacrifice Bonus**: If $N$ is odd ($1, 3, 5$), grants an additional $50\%$ probability for an extra roll.

### 3. Shiny Probability Inheritance
$$\text{Shiny\_Probability} = \frac{1 + 0.25 \cdot N}{4096}$$
*Reaches up to a $2.5\times$ multiplier ($N=6$) compared to the baseline $1/4096$ Shiny rate.*

---

## 12. 🚔 Team Rocket Criminality & Police Scaling Math

All police scaling and criminality resolution formulas are pure functions implemented in [`src/logic/player/classMath.ts`](file:///c:/Users/franc/Trabajo/Juegos/Pokemon-Online/src/logic/player/classMath.ts).

### 1. Police Extra Level Bonus (`calculatePoliceBonusLevel`)
$$\text{bonusLv} = \lfloor \frac{\max(0, \text{criminality} - 100)}{10} \rfloor$$
- Every $+10\%$ criminality above $100\%$ awards $+1$ enemy level bonus.

### 2. Effective Police Level with Clamping Safeguard (`calculatePoliceEffectiveLevel`)
$$\text{effectivePoliceLv} = \max(1, \min(\text{MAX\_POKEMON\_LEVEL}, \text{baseMapLv} + 5 + \text{bonusLv}))$$
- Enforces strict bounds $1 \le \text{level} \le 100$, preventing illegal Pokémon generation errors or corrupt box saves.

### 3. Dynamic Police Team Size (`calculatePoliceTeamSize`)
$$\text{policeTeamSize}(\text{crim}) = \begin{cases} \text{random}(3, 4) & \text{if } \text{crim} < 140\% \text{ (Local Patrol)} \\ \text{random}(4, 5) & \text{if } 140\% \le \text{crim} < 200\% \text{ (Heavy Squad)} \\ 6 & \text{if } \text{crim} \ge 200\% \text{ (Full SWAT Team)} \end{cases}$$

### 4. Arrest Bail upon Defeat (`calculatePoliceBail`)
$$\text{Bail} = \lfloor \text{classLevel}^2 \times 80 \times \left(\frac{\text{criminality}}{100}\right) \rfloor$$

### 5. Police Encounter Probability (`calculatePoliceEncounterChance`)
$$\text{tChance} = \left(\frac{\text{criminality}}{10}\right) \times \text{trainerBonus}$$

---

## 13. 👑 Pokémon Obedience & Level Cap Formulas

> 📖 **Complete SSoT Manual**: Consult [`../systems/obedience_mechanics_manual.md`](../systems/obedience_mechanics_manual.md) for full generational tables, anti-cheat flags, behavioral states, and dialogue tables.

Obedience checks occur when a Pokémon's evaluation level $L$ (Met Level $L_{\text{met}}$ in Gen IX/Modern, current level for outsider Pokémon) exceeds the trainer's current obedience cap $C$ ($L > C$).

### 1. Primary Obedience Probability ($P(\text{obey})$)

$$\text{Gen I – IV Classic Formula}: P(\text{obey}) = \frac{C}{L + C}$$

$$\text{Gen V – IX Modern Quadratic Formula}: P(\text{obey}) \approx \left(\frac{C}{L + C}\right)^2$$

- **Deterministic RNG Check (Gen V+)**:
  1. Roll $R_1 \in [0, 255]$. Pass if $\lfloor (L + C) \times R_1 / 256 \rfloor < C$.
  2. Roll $R_2 \in [0, 255]$. Pass if $\lfloor (L + C) \times R_2 / 256 \rfloor < C$.
  3. If both pass $\implies$ Pokémon obeys.

### 2. Disobedience Failure Outcome Distribution

Let $\Delta = L - C$ (level differential) and $R_3 \in [0, 255]$:

$$\text{Outcome}(R_3) = \begin{cases} \text{Sleep Induction} & \text{if } R_3 < \Delta \text{ (unless immune via Vital Spirit, Insomnia, Terrain)} \\ \text{Confusion Self-Damage} & \text{if } \Delta \le R_3 < 2\Delta \\ \text{Passive Inaction (Loafing)} & \text{if } R_3 \ge 2\Delta \end{cases}$$

### 3. Confusion Self-Damage Formula

$$\text{Damage}_{\text{Confusion}} = \left\lfloor \left( \left\lfloor \frac{\left\lfloor \frac{2 \cdot \text{Level}}{5} \right\rfloor + 2}{50} \cdot 40 \cdot \frac{\text{Atk}_{\text{stat}}}{\text{Def}_{\text{stat}}} \right\rfloor + 2 \right) \cdot \text{Random}(0.85, 1.00) \right\rfloor$$



