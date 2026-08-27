# Friendship & Happiness Mechanics Manual (Gen I – IX)

This document is the single source of truth (SSoT) for the **Friendship** (historically referred to as **Happiness**, and internally as *Friendliness*, *Loyalty*, or *Taming*) mechanic across all mainline Pokémon generations (Generation I through Generation IX). It details the mathematical foundations, generation-by-generation behavioral shifts, the Affection divergence/convergence lifecycle, modifiers, action tables, evolution thresholds, and engine implementation rules.

---

## 1. Executive Summary & Core Paradigm Shifts

Friendship is an internal 1-byte unsigned integer metric (`0` to `255`) that tracks the bond and emotional attachment between a Pokémon and its Trainer.

```
0 ──────────────── 99 ──────────────── 199 ──────── 220 ──────── 255
[   Distrust    ]  [   Neutral/Warming   ]  [ Friendly ]  [ Max Bond ]
                              (Gen VIII+ Evo: 160)   (Gen II-VII Evo: 220)
```

### Generational Evolution Timeline

| Era | Games | Core Defining Mechanics & Paradigm Shifts |
| :--- | :--- | :--- |
| **Gen I** | Yellow | **Prototype Starter Only**: Only applies to the starter Pikachu. Tracks emotions via dialogue popups. Exploitable potion interactions. |
| **Gen II** | Gold, Silver, Crystal | **Universal Introduction**: Expanded to all Pokémon. Base friendship set to 70 (Friend Ball: 200, Eggs: 120). Introduced friendship evolution (threshold 220), Return, Frustration, and grooming. |
| **Gen III** | Ruby, Sapphire, Emerald, FRLG, Colosseum, XD | **Species Diversity & Modifiers**: Species-specific base friendship introduced (0 to 140). Added Luxury Ball (+1), Soothe Bell (+50%), Met Location (+1), and EV-reducing Berries (Emerald). |
| **Gen IV** | Diamond, Pearl, Platinum, HGSS | **UI Feedback & Compound Bonuses**: Pokétch app / walking Pokémon mood indicators. Massages (Ribbon Syndicate), Footprint Ribbon, high-friendship Move Tutors (Draco Meteor, Ultimate Starters). Soothe Bell compounds after Luxury Ball. |
| **Gen V** | Black, White, B2W2 | **Pass Powers & Facilities**: Befriending Pass Powers (+1 to +3). Join Avenue Beauty Salon and Café. Stat Wings (+3/+2/+1). Level 100 Pokémon can gain friendship freely. |
| **Gen VI** | X, Y, ORAS | **The Great Split (Friendship vs. Affection)**: Introduction of Pokémon-Amie and **Affection** (*Afecto*) as a separate 0–255 / 5-hearts stat. Affection grants in-battle bonuses (1 HP survival, crits, EXP boost) and evolves Sylveon. Friendship remains separate for Return/Frustration/classic evolutions. |
| **Gen VII** | Sun, Moon, USUM, Let's Go | **Refresh & First Merge Test**: SM/USUM continues separate Affection (Pokémon Refresh / Poké Beans / Isle Avue). *Let's Go Pikachu/Eevee* executes the **first merge**: eliminates separate affection, links in-battle perks to Friendship, and introduces up to +10% raw stat multiplier based on friendship. |
| **Gen VIII** | Sword, Shield, BDSP, Legends: Arceus | **The Unified Era**: Affection is permanently merged into Friendship. Base friendship lowered from **70 to 50** for most species. Evolution threshold lowered from **220 to 160** (including Sylveon). Return and Frustration are **removed**. Pokémon Camp Curry cooking. In PLA: resource gathering grants friendship; manual menu evolution. |
| **Gen IX** | Scarlet, Violet | **Picnic & Soft Cap**: Base friendship remains 50. Standard gameplay (battles/walking) **soft-caps at 160**. Reaching 161–255 requires Picnic activities (Pokémon Wash, Sandwiches) or EV items/berries. In-battle perks activate at 220+. Auto-battle (Let's Go mode) grants friendship. |

---

## 2. Base Friendship & Initial Values

When a Pokémon is caught, hatched, or generated, its starting friendship is assigned according to specific rules:

### Standard Base Friendship by Category

| Category / Threshold | Species Examples | Notes |
| :--- | :--- | :--- |
| **0 Base Friendship** | Buneary, Type: Null, Silvally, Regigigas, Mewtwo, Darkrai, Deoxys, Necrozma, Ghetsis's Hydreigon | Distrustful, synthetic, artificial, or hyper-aggressive Pokémon. |
| **35 Base Friendship** | Most Legendary & Mythical Pokémon (e.g., Articuno, Zapdos, Moltres, Rayquaza, Dialga, Palkia, Giratina, Reshiram, Zekrom, Kyurem, Zacian, Zamazenta, Koraidon, Miraidon), Ultra Beasts, certain Dragon-types (Dratini, Bagon, Deino). | Aloof or powerful legendary creatures. |
| **50 Base Friendship** | **Default for ~90% of species in Gen VIII & Gen IX**. | Modern series standard starting value. |
| **70 Base Friendship** | **Default for ~90% of species in Gen II through Gen VII**. | Legacy series standard starting value. |
| **100 Base Friendship** | Pokémon hatched from Eggs in *Brilliant Diamond & Shining Pearl*. | BDSP-specific egg hatch value. |
| **120 Base Friendship** | Standard Egg Hatching (Gen II–VII, SwSh, SV). Starter Pokémon in certain spin-offs/sub-series. | Freshly hatched baby Pokémon. |
| **140 Base Friendship** | Cleffa, Clefairy, Clefable, Igglybuff, Jigglypuff, Wigglytuff, Chansey, Blissey, Togepi, Togetic, Togekiss, Marill, Azumarill, Happiny, Audino, Shaymin. | Naturally cheerful, gentle, or affectionate species. |
| **200 Base Friendship** | Any Pokémon caught in a **Friend Ball** (*Amigo Ball*). | Overrides species base friendship upon capture. |

### Trading & Memory Retention

- **Gens II–V**: Trading a Pokémon immediately resets its friendship to its species **Base Friendship** value.
- **Gen VI–IX**: When traded to a new trainer, friendship resets to the species Base Friendship. However, if traded back to its **Original Trainer (OT)**, the Pokémon restores the exact friendship value it had prior to being traded away.

---

## 3. Evolution & Move Formulas

### Friendship Evolution Thresholds

A Pokémon that evolves via friendship checks its current friendship value whenever it triggers an evolution condition (leveling up, or using the evolution item/prompt in PLA):

$$\text{Can Evolve} = \begin{cases} \text{Friendship} \ge 220 & \text{Generations II – VII} \\ \text{Friendship} \ge 160 & \text{Generations VIII – IX} \end{cases}$$

#### Complete Friendship Evolution Roster

| Base Pokémon | Evolution | Additional Condition |
| :--- | :--- | :--- |
| **Golbat** | Crobat | Level up with high friendship. |
| **Chansey** | Blissey | Level up with high friendship. |
| **Pichu** | Pikachu | Level up with high friendship. |
| **Cleffa** | Clefairy | Level up with high friendship. |
| **Igglybuff** | Jigglypuff | Level up with high friendship. |
| **Togepi** | Togetic | Level up with high friendship. |
| **Eevee** | Espeon | Level up during Day (no Fairy move in Gen 8+). |
| **Eevee** | Umbreon | Level up during Night (no Fairy move in Gen 8+). |
| **Eevee** | Sylveon | Gen 6–7: 2+ Hearts of Affection + Fairy move. Gen 8+: High Friendship (160+) + Fairy move. |
| **Azurill** | Marill | Level up with high friendship. |
| **Budew** | Roselia | Level up during Day with high friendship. |
| **Buneary** | Lopunny | Level up with high friendship (Starts at 0 friendship!). |
| **Chingling** | Chimecho | Level up during Night with high friendship. |
| **Riolu** | Lucario | Level up during Day with high friendship. |
| **Woobat** | Swoobat | Level up with high friendship. |
| **Swadloon** | Leavanny | Level up with high friendship. |
| **Type: Null** | Silvally | Level up with high friendship (Starts at 0 friendship!). |
| **Alolan Meowth** | Alolan Persian | Level up with high friendship. |
| **Snom** | Frosmoth | Level up during Night with high friendship. |

---

### Friendship-Dependent Move Formulas

#### Return (*Retribución*) — Physical Normal (Gen II – VII)

$$\text{Power} = \max\left(1, \left\lfloor \frac{\text{Friendship}}{2.5} \right\rfloor\right)$$

- At **0 Friendship**: Base Power = $1$
- At **70 Friendship** (Base): Base Power = $\lfloor 70 / 2.5 \rfloor = 28$
- At **255 Friendship** (Max): Base Power = $\lfloor 255 / 2.5 \rfloor = 102$

#### Frustration (*Frustración*) — Physical Normal (Gen II – VII)

$$\text{Power} = \max\left(1, \left\lfloor \frac{255 - \text{Friendship}}{2.5} \right\rfloor\right)$$

- At **0 Friendship** (Max Hatred): Base Power = $\lfloor 255 / 2.5 \rfloor = 102$
- At **70 Friendship** (Base): Base Power = $\lfloor 185 / 2.5 \rfloor = 74$
- At **255 Friendship** (Max Friendship): Base Power = $1$

#### Partner Moves (*Let's Go, Pikachu! & Let's Go, Eevee!*)

- **Pika Papow** (Pikachu) & **Veevee Volley** (Eevee):

$$\text{Power} = \max\left(20, \left\lfloor \frac{\text{Friendship} \times 100}{255} \right\rfloor + 20\right) \quad \text{(Ranges from 20 to 102)}$$

#### Let's Go Stat Boost Formula (LGPE)

In *Pokémon: Let's Go, Pikachu! & Eevee!*, friendship linearly amplifies Attack, Defense, Special Attack, Special Defense, and Speed (excluding HP) by up to 10%:

$$\text{Stat}_{\text{Final}} = \left\lfloor \text{Stat}_{\text{Base}} \times \left(1.0 + \frac{\text{Friendship}}{255} \times 0.10\right) \right\rfloor$$

---

## 4. Friendship vs. Affection (The Gen VI & VII Fork)

In Generations VI and VII, Game Freak bifurcated the emotional mechanics into two distinct subsystems:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          GENERATION VI & VII                           │
├───────────────────────────────────┬────────────────────────────────────┤
│       FRIENDSHIP (Amistad)        │         AFFECTION (Afecto)         │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Scale: 0 to 255                 │ • Scale: 0 to 255 (1 to 5 Hearts)  │
│ • Hidden stat (Evaluator NPCs)    │ • Visible UI in Amie / Refresh     │
│ • Governs:                        │ • Governs:                         │
│   - Traditional Evolutions        │   - Sylveon Evolution (2+ Hearts)  │
│   - Return / Frustration Power    │   - In-Battle Avoidance & Crits    │
│   - High-tier Move Tutors         │   - 1 HP Focus Band Endure chance  │
│   - Footprint Ribbon              │   - Passive Status Healing         │
│ • Raised via:                     │ • Raised via:                      │
│   - Walking, Level-up, Vitamins   │   - Petting (touchscreen)          │
│   - Massages, Soothe Bell, Berries│   - Feeding Poké Puffs/Poké Beans  │
└───────────────────────────────────┴────────────────────────────────────┘
```

### In-Battle Affection Perks Table (Gens VI–VII Affection / Gen VIII–IX Unified Friendship)

Starting in Gen VIII, these perks trigger strictly when **Friendship** reaches Tier 4 (220+ friendship):

| Tier / Hearts | Friendship Value (Gen 8+) | In-Battle Effect Description | Activation Probability |
| :---: | :---: | :--- | :---: |
| **Tier 1** (1 Heart) | 100 – 149 | Special dialogue entry messages upon entering battle. | 100% (Visual only) |
| **Tier 2** (2 Hearts) | 150 – 189 | **EXP Multiplier**: Boosts battle Exp. Points gained. | **1.2× EXP** ($\approx 4915/4096$) |
| **Tier 3** (3 Hearts) | 190 – 219 | **Endure Fatal Hit**: Survives a hit that would KO it with 1 HP. | **10.0%** chance |
| **Tier 4** (4 Hearts) | 220 – 254 | **Enhanced Endure**: Chance to survive fatal hit with 1 HP.<br>**Shake Off Status**: Cleanses Burn/Paralysis/Poison/Sleep/Freeze at end of turn.<br>**Evasion Boost**: Lowers attacker's effective accuracy. | **15.0%** chance<br>**20.0%** per turn<br>**-10%** opponent accuracy |
| **Tier 5** (5 Hearts) | 255 | **Master Endure**: Highest survival rate.<br>**Critical Hit Boost**: Doubles the critical hit stage rate (e.g., Stage 0 becomes 1/12 instead of 1/24 in Gen 6, or 1/8 instead of 1/16). | **25.0%** chance<br>**2× Critical Stage** |

*Note: In-battle affection/friendship perks are automatically disabled in official PvP / Competitive multiplayer battles and Battle Facilities (Battle Tower, Battle Maison, Battle Tree).*

---

## 5. Master Action Tables & Modifiers

Friendship gain operates under a **diminishing returns** model divided into three brackets:
- **Bracket 1**: `0 – 99` (Distrustful → Quickest gains)
- **Bracket 2**: `100 – 199` (Neutral → Moderate gains)
- **Bracket 3**: `200 – 255` (Friendly → Slowest gains)

### Global Modifiers & Multipliers

1. **Luxury Ball (*Lujo Ball*)**: Adds **+1** to any positive friendship gain event (Gen III onward).
2. **Met Location Bonus**:
   - *Pokémon Crystal*: Doubles the friendship gain from leveling up if at met location.
   - *Gen III, V, VI, VII*: Adds **+1** to positive gains if performed at the map where the Pokémon was caught.
3. **Soothe Bell (*Campana Alivio*)**: Increases positive friendship gains by **+50%** ($\times 1.5$, rounded down).
   - *Gen III*: Applied directly to base gain before modifiers: $\lfloor \text{Gain} \times 1.5 \rfloor + \text{Bonus}$.
   - *Gen IV+*: Applied **compounded** after additive modifiers: $\lfloor (\text{Base} + \text{Lux} + \text{Met}) \times 1.5 \rfloor$.
4. **Pass / O-Powers (Gen V & VI)**:
   - *Befriending Power Lv. 1 / 2 / 3*: Adds $+1 / +2 / +3$ flat bonus to all positive changes.

---

### Core Generation Action Matrix

| Event / Action | Bracket: 0–99 | Bracket: 100–199 | Bracket: 200–255 | Applicable Generations |
| :--- | :---: | :---: | :---: | :--- |
| **Level Up** | **+5** | **+3** | **+2** | All Gens (I–IX) |
| **Walking** (128 / 512 steps, 50% chance) | **+1** | **+1** | **+1** | All Gens (II–IX) |
| **Vitamins** (Protein, Iron, Carbos, etc.) | **+5** | **+3** | **+2** | All Gens (I–IX) |
| **Stat Wings / Feathers** (Gen V+) | **+3** | **+2** | **+1** | Gen V–IX |
| **EV-Reducing Berries** (Pomeg, Kelpsy, etc.) | **+10** | **+5** | **+2** | Gen III (Emerald)–IX |
| **Gym Leader / E4 / Champion / Red Battle** | **+3** | **+2** | **+1** | Gen I–VII |
| **Learning TM / HM / TR** | **+5** | **+3** | **+2** | Gen I–IV (removed in V+) |
| **Using Battle Items in Combat** (X Attack, etc.)| **+1** | **+1** | **0** | Gen I–VII |
| **Fainting in Battle** (vs equal/lower level) | **-1** | **-1** | **-1** | All Gens (I–IX) |
| **Fainting in Battle** (vs foe $\ge 30$ levels higher)| **-5** | **-5** | **-5** | Gen III–V |
| **Herbal Medicine: EnergyPowder / Heal Powder** | **-5** | **-5** | **-10** | Gen II–IX |
| **Herbal Medicine: Energy Root** | **-10** | **-10** | **-15** | Gen II–IX |
| **Herbal Medicine: Revival Herb** | **-15** | **-15** | **-20** | Gen II–IX |

---

### Specialized Generational Systems

#### Generation I (Pokémon Yellow Starter Pikachu)

- **Potion / Item Glitch**: Attempting to use a Potion or Status item on Pikachu at full health fails to consume the item, but **still awards +5 / +3 / +2 friendship**. This allows maxing Pikachu's friendship in minutes at the start of Viridian City.
- **Depositing in PC**: Causes **-1 friendship** per deposit.
- **Trade**: Overwriting OT resets friendship to 0.

#### Generation II & IV Grooming (Haircut Brothers & Daisy)

- **Goldenrod Underground Haircut Younger Brother**:
  - 50% chance: +1 / +1 / +1
  - 25% chance: +3 / +3 / +1
  - 25% chance: +5 / +3 / +2
- **Goldenrod Underground Haircut Older Brother**:
  - 75% chance: +1 / +1 / +1
  - 25% chance: +3 / +3 / +1
- **Daisy Oak Grooming (Pallet Town 3:00 PM – 4:00 PM)**: +3 / +3 / +1 (also cleans Pokémon in HGSS).

#### Generation IV & V Massages & Join Avenue

- **Veilstone Massage Girl (DPPt/BDSP)**: Flat **+3** friendship gain (awards an accessory/seal).
- **Ribbon Syndicate Spa (DPPt/BDSP)**: Awards **+10** (0–99), **+20** (100–199), **+30** (200–255).
- **Castelia City Massage (BW/B2W2)**: Flat **+5** friendship gain.
- **Join Avenue Beauty Salon (B2W2)**:
  - *Make-Up / Brush / Relax*: Huge flat boosts ranging from **+10 to +40** friendship.
  - *Café Meals (Friendship Lunch / Dinner)*: Boosts friendship by **+10 to +48**.

#### Generation VIII: Pokémon Camp & Curry Cooking (SwSh)

Cooking curry in Pokémon Camp grants massive party-wide friendship and EXP scaling with the cooking rating:

| Curry Class | Friendship Boost (Party-wide) | Exp. Gained | Wild Visit Chance |
| :--- | :---: | :---: | :---: |
| **Koffing Class** (Burnt) | **+1** | Low | 0% |
| **Wobbuffet Class** (Ordinary) | **+2** | Moderate | 0% |
| **Milcery Class** (Tasty) | **+4** | High | 10% |
| **Copperajah Class** (Delicious) | **+7** (Sociability +15) | Very High | 20% |
| **Charizard Class** (Masterpiece) | **+10** (Sociability +20) | Maximum | 25% |

#### Generation VIII: Legends: Arceus Mechanics

- Pokémon gain **+1 friendship** every time they are sent out to gather resources from trees, ore deposits, or crates.
- Winning wild battles and level-ups increase friendship.
- Fainting inflicts **-1 friendship**.
- Evolution does not trigger automatically on level up; when friendship reaches **160+**, the Poké Ball icon in the satchel flashes, allowing manual evolution via menu.

#### Generation IX: Scarlet & Violet (Picnic, Wash & Soft-Cap)

- **The 160 Soft Cap**: In Pokémon Scarlet and Violet, passive walking, battles, and leveling up **stop granting friendship once the value reaches 160**.
- **Breaking the 160 Ceiling**: To progress from 161 to 255 (to earn the Best Friends Ribbon or unlock in-battle Tier 4 perks), the player must engage in:
  1. **Pokémon Wash**: Scrubbing and rinsing Pokémon during a picnic grants **+20 Friendship** per wash, heals status, and restores HP.
  2. **Sandwich Making**: Eating sandwiches during a picnic grants party-wide friendship bonuses.
  3. **Vitamins & Mochi**: Protein, Carbos, Health Mochi, Fresh-Start Mochi (+5/+3/+2).
  4. **EV-reducing Berries**: Pomeg, Kelpsy, Qualot, Hondew, Grepa, Tamato (+10/+5/+2).
- **Auto-Battle (Let's Go Mode)**: Defeating wild Pokémon in Let's Go auto-battle grants friendship up to the 160 threshold.

---

## 6. Friendship Evaluator NPCs & Dialogue Matrix

Across all regions, dedicated NPCs evaluate the lead Pokémon's friendship value:

| Region & Location | NPC | Threshold Ranges & Dialogue Quotes |
| :--- | :--- | :--- |
| **Kanto** (Pallet Town) | Daisy Oak | • **0–49**: *"It's not very friendly toward you."*<br>• **50–99**: *"It's quite cute."*<br>• **100–149**: *"It's warming up to you."*<br>• **150–199**: *"It's friendly towards you. It looks happy."*<br>• **200–254**: *"It trusts you. It adores you."*<br>• **255**: *"It couldn't possibly love you more! It makes me happy just seeing it!"* |
| **Johto** (Goldenrod City) | Lady near Bike Shop | • **0–49**: *"I get the feeling that it really hates you."*<br>• **50–99**: *"You should treat it better. It's not used to you."*<br>• **100–149**: *"It's cute."*<br>• **150–199**: *"It's friendly toward you. It looks sort of happy."*<br>• **200–254**: *"I get the feeling that it really trusts you."*<br>• **255**: *"It adores you! It couldn't possibly love you more. I even feel jealous!"* |
| **Hoenn** (Verdanturf Town) | Woman in house | • **0–49**: *"It's very wary. It has scary viciousness in its eyes."*<br>• **50–99**: *"It's not used to you yet."*<br>• **100–149**: *"It's getting used to you."*<br>• **150–199**: *"It likes you quite a lot."*<br>• **200–254**: *"It seems to be very happy. It obviously likes you a whole lot."*<br>• **255**: *"It adores you. It can't possibly love you any more."* |
| **Sinnoh** (Hearthome City) | Fan Club Chairman / Pokétch App | • **0–49**: 0 Hearts. Pokémon drifts away from finger.<br>• **50–149**: 0 Hearts. Pokémon turns toward finger.<br>• **150–219**: 1 Small Heart.<br>• **220–254**: 2 Small Hearts (Ready to evolve!).<br>• **255**: 2 Large Pulsing Hearts (Eligible for Footprint Ribbon). |
| **Galar** (Hammerlocke) | Boy in house | • **0–49**: *"You two don't seem quite used to each other yet."*<br>• **50–99**: *"It's warming up to you."*<br>• **100–159**: *"You're getting along pretty well!"*<br>• **160–219**: *"You two are quite good friends!"* (Ready to evolve!)<br>• **220–254**: *"You two are the best of friends!"*<br>• **255**: *"You two are simply inseparable!"* (Awards **Best Friends Ribbon**). |
| **Paldea** (Cascarrafa) | Woman with Marill | • **0–49**: *"What happened between you two? It looks really angry..."*<br>• **50–99**: *"You're still getting to know each other."*<br>• **100–159**: *"You're getting along well, but you can get closer!"*<br>• **160–219**: *"You're good friends! You can count on each other!"* (Ready to evolve!)<br>• **220–254**: *"You're great friends! You get along swimmingly!"*<br>• **255**: *"You're the best of friends! You couldn't be closer!"* (Awards **Best Friends Ribbon**). |

---

## 7. Common Misconceptions & Engine Edge Cases

1. **Obedience is NOT Friendship**:
   - Pokémon obedience (disobeying commands, loafing around, taking naps) is governed **strictly by Gym Badges / Stamps** and whether the Pokémon is an "Outsider" (traded) or overleveled.
   - Friendship has **zero effect** on obedience. A Pokémon with 255 Friendship will still disobey if it exceeds the badge level cap.
2. **Items Held**:
   - Giving a Pokémon an item to hold (like Leftovers or Choice Band) has **no effect** on friendship. Only holding the **Soothe Bell** modifies gains.
3. **PC Storage System**:
   - Depositing or storing Pokémon in the PC box does **not** lower friendship in Gen II–IX (it only caused -1 loss in Pokémon Yellow).
4. **Low HP & Non-Faint Status**:
   - Entering low HP (red health) or being inflicted with Status ailments (Sleep, Burn, Paralysis) does **not** decrease friendship. Only actual **Fainting** ($0\text{ HP}$) inflicts a friendship penalty.
5. **Gen IV Underflow Glitch**:
   - In Pokémon Diamond & Pearl (v1.0), using an Energy Root or Revival Herb on a Pokémon with low friendship during battle could cause an 8-bit unsigned integer underflow below 0, wrapping the value around to $\approx 250\text{+} $ friendship instantly.
6. **Poison Tick Outside of Battle**:
   - In Generation IV, fainting from poison in the overworld was removed in HGSS (Pokémon survives with 1 HP). In Gen II–III, overworld poison faint triggered standard -1 faint penalty.

---

## 8. Implementation Standards for Poké Vicio Engine

When implementing or extending friendship mechanics in `src/logic/` or `src/stores/`:

1. **Domain-Type-First Integrity**:
   - Friendship MUST be strictly typed as a bounded number contract (`0 <= friendship <= 255`).
   - Use named domain constants:
     ```ts
     export const FRIENDSHIP_BOUNDS = {
       MIN: 0,
       MAX: 255,
       GEN_8_EVO_THRESHOLD: 160,
       LEGACY_EVO_THRESHOLD: 220,
       AFFINITY_PERK_THRESHOLD: 220,
       DEFAULT_BASE: 50,
       LEGACY_BASE: 70,
       FRIEND_BALL_BASE: 200,
       EGG_HATCH_BASE: 120,
     } as const;
     ```
2. **Zero-Ignore & Strict Typing**:
   - Never cast raw numbers directly to friendship without clamping (`Math.max(0, Math.min(255, value))`).
3. **Event-Driven Evolution Dispatching**:
   - Level-up events must evaluate friendship evolution synchronously against the active generation config (`ACTIVE_GENERATION`).
4. **Showdown Serialization Parity**:
   - When converting Pokémon objects to Pokémon Showdown worker sets (`@pkmn/sim`), the `happiness` field must always match the internal `friendship` value (defaults to 255 in competitive sets unless running Return/Frustration simulations).
