# Pokémon Capture Mechanics and Formulas Manual

> **Scope & Authority**: This manual is the Single Source of Truth for capture calculations, Poké Ball multipliers, status multipliers, shake checks, Critical Captures ($CC$), and generational algorithms in Poké Vicio.
> **Sources of Truth**:
> - Wild Encounter Logic: [`encounter_manual.md`](./encounter_manual.md)
> - Mathematical Formulas: [`../core/game_formulas_manual.md`](../core/game_formulas_manual.md)
> - Status Conditions: [`../battle/status_ailments_manual.md`](../battle/status_ailments_manual.md)
> - Items & Balls Database: [`item_system_manual.md`](./item_system_manual.md)

---

## 1. 🎯 Modern Capture Formula (Gen IX / Standard Engine)

Unless a guaranteed capture item (*Master Ball*) or event is active, the engine determines capture success using the **Modified Capture Rate** ($X$):

$$X = \left( \frac{3M - 2H}{3M} \cdot C \cdot B \cdot BP \cdot L \right) \cdot S \cdot D$$

If $X \ge 255$, the capture is **guaranteed** ($100\%$).

### Formula Parameters

| Variable | Description | Definition / Value Range |
| :--- | :--- | :--- |
| **$M$** | Target's Maximum HP | Integer $\ge 1$. |
| **$H$** | Target's Current HP | Integer between $1$ and $M$. At full health $\frac{3M-2H}{3M} = \frac{1}{3}$; near $0$ HP it approaches $1.0$. |
| **$C$** | Species Base Catch Rate | Intrinsic value between $3$ (Legendaries) and $255$ (Common species). |
| **$B$** | Ball Multiplier | Multiplier granted by the thrown Poké Ball ($1.0\times$ to $8.0\times$). |
| **$BP$** | Badge Penalty | $0.8^{\text{missing badges}}$ if target level exceeds player's badge obedience cap (otherwise $1.0$). |
| **$L$** | Low-Level Modifier | If level $\le 13$: $\frac{36 - 2 \cdot \text{level}}{10}$ (e.g. Lvl 1 = $3.4\times$, Lvl 13 = $1.0\times$). Otherwise $1.0$. |
| **$S$** | Status Ailment Bonus | **$2.5\times$** for Sleep (`SLP`) or Freeze (`FRZ`); **$1.5\times$** for Paralyze (`PAR`), Poison (`PSN`), Burn (`BRN`); **$1.0\times$** for None. |
| **$D$** | Difficulty / Field Modifier | Capture Powers ($1.1\times$ to $2.0\times$), Backstrike / Off-guard bonus ($2.0\times$). Defaults to $1.0$. |

---

## 2. ⚾ Poké Ball Multipliers Catalog ($B$)

| Poké Ball | Multiplier ($B$) | Condition / Logic |
| :--- | :--- | :--- |
| **Poké Ball** / **Premier Ball** / **Luxury Ball** / **Heal Ball** | $1.0\times$ | Standard baseline. |
| **Great Ball** / **Safari Ball** / **Sport Ball** | $1.5\times$ | General boost. |
| **Ultra Ball** | $2.0\times$ | High-tier standard ball. |
| **Master Ball** / **Park Ball** | $\infty$ | Always succeeds ($100\%$, skips formula). |
| **Net Ball** | $3.5\times$ | If target has Water or Bug type; $1.0\times$ otherwise. |
| **Dive Ball** | $3.5\times$ | When fishing, surfing, or in underwater terrain; $1.0\times$ otherwise. |
| **Nest Ball** | $\max\left(1.0, \frac{41 - \text{level}}{10}\right)$ | For targets under level 30 (Lvl 1 = $4.0\times$, Lvl 30+ = $1.0\times$). |
| **Repeat Ball** | $3.5\times$ | If target species is already registered as Caught in Pokédex; $1.0\times$ otherwise. |
| **Timer Ball** | $\min\left(4.0, 1.0 + \text{turns} \times \frac{1229}{4096}\right)$ | Increases per combat turn; reaches max $4.0\times$ on turn 11. |
| **Quick Ball** | $5.0\times$ | Turn 1 of combat only; $1.0\times$ on turn 2+. |
| **Dusk Ball** | $3.0\times$ | At night or inside cave / dungeon biomes; $1.0\times$ otherwise. |
| **Fast Ball** | $4.0\times$ | If target base Speed $\ge 100$; $1.0\times$ otherwise. |
| **Level Ball** | $8.0\times$ / $4.0\times$ / $2.0\times$ / $1.0\times$ | $8.0\times$ if $\lfloor \text{UserLevel}/4 \rfloor \ge \text{TargetLevel}$; $4.0\times$ if $\lfloor \text{UserLevel}/2 \rfloor \ge \text{TargetLevel}$; $2.0\times$ if $\text{UserLevel} > \text{TargetLevel}$; $1.0\times$ otherwise. |
| **Love Ball** | $8.0\times$ | Target is same species and opposite gender as active Pokémon; $1.0\times$ otherwise. |
| **Moon Ball** | $4.0\times$ | Target evolves via Moon Stone (Nidoran, Clefairy, Jigglypuff, Skitty, Munna); $1.0\times$ otherwise. |
| **Dream Ball** | $4.0\times$ | Target is asleep or has *Comatose*; $1.0\times$ otherwise. |
| **Beast Ball** | $5.0\times$ / $0.1\times$ | $5.0\times$ on Ultra Beasts; $0.1\times$ on standard Pokémon. |
| **Heavy Ball** | *Alters $C$ directly* | Flat bonus to base catch rate $C$ based on weight: $\ge 300\text{kg}: +30$, $\ge 200\text{kg}: +20$, $\ge 100\text{kg}: +0$, $<100\text{kg}: -20$. (Minimum $C = 1$). |

---

## 3. ✨ Critical Captures ($CC$)

A Critical Capture substantially reduces the breakout checks from 4 to 1, greatly boosting success odds:

$$CC = \left\lfloor \frac{\min(255, X) \cdot P \cdot Ch}{6} \right\rfloor$$

The roll succeeds if a random integer in $[0, 255] < CC$.

### Pokédex Completion Multiplier ($P$)

| Caught Species in Pokédex | Multiplier ($P$) |
| :--- | :--- |
| $> 600$ | $2.5\times$ |
| $451 - 600$ | $2.0\times$ |
| $301 - 450$ | $1.5\times$ |
| $151 - 300$ | $1.0\times$ |
| $31 - 150$ | $0.5\times$ |
| $0 - 30$ | $0\times$ (Critical capture disabled) |

*$Ch = 2$ if player holds Catching Charm; $1$ otherwise.*

---

## 4. 🔄 Shake Check Probability ($Y$)

When $X < 255$, the engine calculates the **ball shake threshold** ($Y$):

$$Y = \left\lfloor \frac{65536}{\left( \frac{255}{X} \right)^{0.1875}} \right\rfloor = \left\lfloor 65536 \cdot \left( \frac{X}{255} \right)^{0.75} \right\rfloor$$

### Breakout Resolution
1. **Critical Capture Active**: The target performs **1 breakout roll**. A random integer $r \in [0, 65535]$ is generated.
   - If $r < Y$, capture succeeds (1 mid-air shake + 1 wobble).
2. **Standard Capture**: The target performs **4 breakout rolls**. For each check $i \in \{1, 2, 3, 4\}$, generate $r_i \in [0, 65535]$.
   - If $r_i < Y$, the ball wobbles.
   - If all 4 checks pass ($r_i < Y$), the ball clicks shut and the Pokémon is **caught**.
   - If check $k$ fails ($r_k \ge Y$), the Pokémon breaks free after $k-1$ wobbles.

---

## 5. 📜 Generational Comparison Matrix

| Generation | Base Formula Type | Status Multipliers ($S$) | Shake Checks | Critical Capture |
| :--- | :--- | :--- | :--- | :--- |
| **Gen I (RBY)** | Lookup tables + HP/Ball thresholds | Sleep/Freeze $+25$, Rest $+12$ to catch roll | 0–3 wobbles based on $N \in [0, 255]$ | No |
| **Gen II (GSC)** | $X = \max(1, \lfloor \text{BallBonus} \cdot C \rfloor)$ + Status | Sleep/Freeze $+10$, Rest $+0$ | 0–3 wobbles | No |
| **Gen III–IV** | $X = \frac{3M - 2H}{3M} \cdot C \cdot B \cdot S$ | Sleep/Freeze $2.0\times$, PAR/PSN/BRN $1.5\times$ | 4 checks against $Y = \lfloor 1048560 / \sqrt{\sqrt{16711680/X}} \rfloor$ | No |
| **Gen V** | $X = \frac{3M - 2H}{3M} \cdot C \cdot B \cdot S \cdot G$ | Sleep/Freeze $2.0\times$, PAR/PSN/BRN $1.5\times$ | 4 checks against $Y = \lfloor 65536 / (255/X)^{0.1875} \rfloor$ | Yes |
| **Gen VI–VIII** | $X = \frac{3M - 2H}{3M} \cdot C \cdot B \cdot S \cdot D$ | Sleep/Freeze $2.5\times$, PAR/PSN/BRN $1.5\times$ | 4 checks against $Y = \lfloor 65536 / (255/X)^{0.1875} \rfloor$ | Yes |
| **Gen IX (Current)** | $X = (\frac{3M-2H}{3M} C \cdot B \cdot BP \cdot L) S \cdot D$ | Sleep/Freeze $2.5\times$, PAR/PSN/BRN $1.5\times$ | 4 checks against $Y = \lfloor 65536 / (255/X)^{0.1875} \rfloor$ | Yes |
