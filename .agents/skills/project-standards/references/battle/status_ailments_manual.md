# Status Ailments and Conditions Manual

> **Scope & Authority**: This manual serves as the Single Source of Truth for all **Major (Persistent)** and **Minor (Volatile)** Status Conditions, triggers, recovery rules, ability interactions, and Showdown engine parity in Poké Vicio.
> **Sources of Truth**:
>
> - Engine delegation: `@pkmn/sim` (`showdown.worker.ts` / `external/pokemon-showdown-code/`)
> - Combat Orchestration: [`battle_mechanics_manual.md`](./battle_mechanics_manual.md)
> - Mathematical Formulas: [`../core/game_formulas_manual.md`](../core/game_formulas_manual.md)

---

## 1. 🏛️ Overview and Classification

In Pokémon combat, status ailments are divided into two distinct architectural categories:

1. **Major Status Conditions (Persistent)**:
   - Displayed in the HUD next to the Pokémon's HP bar (`BRN`, `PAR`, `PSN`, `TOX`, `SLP`, `FRZ`).
   - Persist across switches and after battle until cured by items, Pokémon Center, or specific abilities.
   - **Mutual Exclusivity**: A Pokémon can only be afflicted with ONE major status condition at a time. It is immune to all other major conditions while afflicted.
   - **Showdown Representation**: Simulator clears status using `''` (empty string), never `null`.

2. **Volatile Status Conditions (Minor)**:
   - Invisible in summary screens; active only during the battle.
   - Automatically clear upon switching out (with exceptions passed by Baton Pass).
   - Can stack freely on top of each other and on top of a major status condition (e.g. Confused + Seeded + Burned).

---

## 2. 🔴 Major Status Conditions

### 1. Burn (`BRN` / `brn`)

- **Primary Effect**: Halves the damage dealt by physical attacks (Attack stat is halved during damage calculation, unless the attacker has _Guts_ or uses _Facade_).
- **Residual Damage**: Causes the afflicted Pokémon to lose $\frac{1}{8}$ ($12.5\%$) of its maximum HP at the end of each turn.
  - _Ability Modifiers_: Pokémon with _Heatproof_ only take $\frac{1}{16}$ ($6.25\%$) residual damage.
  - _Stat Boosts_: Pokémon with _Flare Boost_ gain $+50\%$ Special Attack while burned.
- **Immunities**: Fire-type Pokémon are immune to burns. Abilities _Water Veil_, _Water Bubble_, and _Thermal Exchange_ grant complete immunity.
- **Defrosting Property**: Using or being hit by certain Fire-type moves (_Flame Wheel_, _Flare Blitz_, _Scald_, _Scorching Sands_) cures freezing.

### 2. Freeze (`FRZ` / `frz`)

- **Primary Effect**: The Pokémon is completely immobilized and unable to execute moves.
- **Thaw Probability**: Every turn, a frozen Pokémon has a $20\%$ chance to naturally thaw out before selecting its move.
- **Instant Thaw Moves**: Using _Flame Wheel_, _Flare Blitz_, _Fusion Flare_, _Sacred Fire_, _Scald_, _Pyro Ball_, or _Scorching Sands_ automatically thaws the user on that turn. Being hit by a damaging Fire-type move immediately thaws the target.
- **Immunities**: Ice-type Pokémon cannot be frozen. Harsh sunlight (_Sunny Day_, _Drought_, _Desolate Land_) and the _Magma Armor_ ability prevent freezing.

### 3. Paralysis (`PAR` / `par`)

- **Speed Reduction**: Cuts the Pokémon's effective Speed stat by $50\%$ (in Gen 7+; was $75\%$ in Gen 1-6).
- **Full Paralysis**: At the start of each turn, there is a $25\%$ chance the Pokémon is "fully paralyzed" and unable to act.
- **Immunities**: Electric-type Pokémon are completely immune to paralysis (Gen 6+). Pokémon with the _Limber_ ability are immune.
- **Abilities**: Pokémon with _Quick Feet_ ignore the Speed penalty and gain $+50\%$ Speed when paralyzed.

### 4. Poison (`PSN` / `psn`)

- **Regular Poison**: The Pokémon loses $\frac{1}{8}$ ($12.5\%$) of its maximum HP at the end of each turn.
- **Bad Poison / Toxic (`TOX` / `tox`)**:
  - Incremental damage counter $T$ starts at $1$.
  - At the end of turn $T$, the Pokémon loses $T \times \frac{1}{16}$ of maximum HP (Turn 1: $6.25\%$, Turn 2: $12.5\%$, Turn 3: $18.75\%$, Turn 4: $25\%$, up to $\frac{15}{16}$).
  - The counter $T$ resets to $1$ when switching out, but the condition remains bad poison.
- **Immunities**: Poison and Steel-type Pokémon are immune to poisoning (unless inflicted by a Pokémon with the _Corrosion_ ability).
- **Beneficial Interactions**: _Poison Heal_ heals $\frac{1}{8}$ HP per turn instead of taking damage. _Toxic Boost_ grants $+50\%$ physical Attack. _Merciless_ guarantees critical hits against poisoned targets.

### 5. Sleep (`SLP` / `slp`)

- **Duration**: Lasts between $1$ and $3$ turns (randomly rolled as a sleep counter from $2$ to $4$).
- **Counter Decrement**: The counter decrements by $1$ at the beginning of each turn. When it reaches $0$, the Pokémon wakes up and acts on that same turn.
- **Rest**: Self-induced sleep from _Rest_ always sets the counter to exactly $3$ (sleeps for $2$ full turns, wakes on turn 3).
- **Sleep Moves**: Sleeping Pokémon can only use _Snore_ and _Sleep Talk_. _Wake-Up Slap_ and _Dream Eater_ interact specifically with sleeping targets.
- **Immunities**: _Insomnia_, _Vital Spirit_, _Sweet Veil_ (team), and _Electric Terrain_ / _Misty Terrain_ (grounded) prevent sleep. _Early Bird_ decrements the sleep counter by $2$ each turn.

---

## 3. 🟣 Volatile Status Conditions (Minor)

| Volatile Condition                                   | Inflicted By                                                                                                                                                            | Mechanical Effect                                                                                                                                                                                                                                                                   | Duration & Removal                                                                                                                                           |
| :--------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Confusion** (`confusion`)                          | _Confuse Ray_, _Swagger_, _Water Pulse_, _Hurricane_, _Teeter Dance_, _Outrage_ recoil                                                                                  | 33% chance to hit self with 40 BP typeless physical attack based on user's stats.                                                                                                                                                                                                   | Lasts 1–4 active turns; cured on switch-out, _Persim Berry_, or _Own Tempo_.                                                                                 |
| **Flinch** (`flinch`)                                | _Fake Out_, _Air Slash_, _Iron Head_, _Rock Slide_, _King's Rock_                                                                                                       | Prevents target from executing its move on the current turn. Attacker must move first.                                                                                                                                                                                              | Lasts only the current turn. _Inner Focus_ grants immunity.                                                                                                  |
| **Leech Seed** (`leechseed`)                         | _Leech Seed_                                                                                                                                                            | Drains $\frac{1}{8}$ of target's max HP each turn and heals the user/active slot.                                                                                                                                                                                                   | Lasts until target switches out. Grass types are immune. _Liquid Ooze_ damages instead.                                                                      |
| **Infatuation** (`attract`)                          | _Attract_, _Cute Charm_, _G-Max Cuddle_                                                                                                                                 | 50% chance to be immobilized by love. Target must be of opposite gender.                                                                                                                                                                                                            | Lasts until either Pokémon switches out. _Oblivious_ grants immunity.                                                                                        |
| **Curse** (`curse`)                                  | _Curse_ (used by Ghost-type)                                                                                                                                            | Target loses $\frac{1}{4}$ of max HP each turn; user sacrifices $50\%$ max HP on cast.                                                                                                                                                                                              | Lasts until afflicted target switches out.                                                                                                                   |
| **Nightmare** (`nightmare`)                          | _Nightmare_                                                                                                                                                             | Sleeping target loses $\frac{1}{4}$ of max HP each turn while asleep.                                                                                                                                                                                                               | Clears automatically when target wakes up or switches out.                                                                                                   |
| **Trapped / Bound** (`trapped` / `partiallytrapped`) | _Shadow Tag_, _Arena Trap_, _Magnet Pull_, _Mean Look_, _Block_, _Spider Web_, _Fire Spin_, _Whirlpool_, _Wrap_, _Bind_, _Clamp_, or multi-turn charging moves (_Bide_) | Target is immobilized and cannot switch out or flee. Partial traps deal $\frac{1}{8}$ max HP damage per turn ($\frac{1}{6}$ with _Binding Band_). In Showdown, signaled by `trapped: true` or `maybeTrapped: true`. Displayed in the battle HUD with the **`🪤`** (ATRAPADO) badge. | Lasts while the source effect, ability, or move is active (partial traps: 4–5 turns, 7 with _Grip Claw_). Ghost-type Pokémon are immune to trapping effects. |
| **Taunt** (`taunt`)                                  | _Taunt_                                                                                                                                                                 | Target is prevented from using status (non-damaging) moves.                                                                                                                                                                                                                         | Lasts 3 turns. _Oblivious_ and _Aroma Veil_ grant immunity.                                                                                                  |
| **Encore** (`encore`)                                | _Encore_                                                                                                                                                                | Forces target to repeat its previously used move.                                                                                                                                                                                                                                   | Lasts 3 turns. Dynamax/Terastallized forms may have immunity.                                                                                                |
| **Disable** (`disable`)                              | _Disable_, _Cursed Body_                                                                                                                                                | Blocks the target's last used move from being selected.                                                                                                                                                                                                                             | Lasts 4 turns. Only one move can be disabled at a time.                                                                                                      |
| **Perish Song** (`perishsong`)                       | _Perish Song_                                                                                                                                                           | All active Pokémon faint in 3 turns unless switched out.                                                                                                                                                                                                                            | Clears immediately on switch-out. _Soundproof_ grants immunity.                                                                                              |
| **Yawn** (`yawn`)                                    | _Yawn_, _G-Max Snooze_                                                                                                                                                  | Target becomes drowsy; falls asleep at the end of the next turn.                                                                                                                                                                                                                    | Clears if switched out before sleep triggers, or if another status is applied.                                                                               |
| **Salt Cure** (`saltcure`)                           | _Salt Cure_                                                                                                                                                             | Target loses $\frac{1}{8}$ max HP per turn ($\frac{1}{4}$ if Water or Steel type).                                                                                                                                                                                                  | Lasts until switch-out. _Purifying Salt_ grants immunity.                                                                                                    |

---

## 4. 🛡️ Global Status Cleaners & Protection

### Universal Moves

- **`Heal Bell` / `Aromatherapy`**: Cures all major status conditions across the entire active party.
- **`Safeguard`**: Protects the user's side of the field from all major statuses and confusion for 5 turns.
- **`Misty Terrain`**: Protects all grounded Pokémon from major statuses and confusion.
- **`Rest`**: Fully restores HP and cures all status conditions, replacing them with 2 turns of sleep.
- **`Psycho Shift`**: Transfers the user's major status to the target.
- **`Facade`**: Base power doubles from 70 to 140 when the user is burned, paralyzed, or poisoned, and ignores burn's Attack penalty.
- **`Hex` / `Infernal Parade`**: Base power doubles from 65 to 130 if the target is afflicted with any major status condition.
- **`Jungle Healing` / `Lunar Blessing`**: Cures all major status conditions from the user and active allies while restoring $25\%$ of maximum HP.
- **`Healing Wish` / `Lunar Dance`**: User faints to fully restore the incoming switch-in Pokémon (HP, PP, and all status conditions).
- **`Purify`**: Cures the target's major status and restores $50\%$ of the user's maximum HP.

### Universal Abilities

- **`Natural Cure`**: Cures all major status ailments when the Pokémon is switched out.
- **`Shed Skin`**: Has a $33.3\%$ chance to cure major status ailments at the end of every turn.
- **`Hydration`**: Cures all major status ailments at the end of the turn if Rain is active.
- **`Leaf Guard`**: Prevents major status conditions while Harsh Sunlight is active.
- **`Purifying Salt`**: Complete immunity to all major status conditions, and halves damage taken from Ghost-type moves.
- **`Shields Down`**: Immune to all major status conditions while Meteor Form is active ($>50\%$ HP).
- **`Guts` / `Marvel Scale` / `Quick Feet`**: Gain $+50\%$ Attack, Defense, or Speed respectively when afflicted with a major status condition.
- **`Toxic Boost` / `Flare Boost`**: Gain $+50\%$ physical Attack (when Poisoned) or $+50\%$ Special Attack (when Burned).
- **`Poison Heal`**: Restores $\frac{1}{8}$ max HP per turn instead of taking poison damage.
- **`Synchronize`**: When inflicted with burn, paralysis, or poison, mirrors the same condition onto the opponent.

### Universal Healing Items

- **`Lum Berry`**: Consumed automatically to cure any major status condition or confusion.
- **`Full Heal` / `Full Restore` / `Heal Powder`**: Cures any major status condition and confusion on use.
- **Specific Berries**: `Cheri Berry` (Paralysis), `Chesto Berry` (Sleep), `Pecha Berry` (Poison), `Rawst Berry` (Burn), `Aspear Berry` (Freeze), `Persim Berry` (Confusion).
