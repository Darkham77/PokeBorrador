# Mystery Dungeon Equipment System Standards

This technical manual defines the specifications and mechanics for the **Mystery Dungeon Equipment System (Bands, Scarves, Ribbons, and Looplets)** to be implemented in future game updates for Poké Vicio.

---

## 🕹️ System Architecture & Held Mechanics

In specialized dungeon-crawling or roguelike game modes, Pokémon can equip a single slot of **Mystery Dungeon Equipment**. 

*   **Held Slot**: This slot is distinct from the traditional battle held item (e.g., Choice Band, Leftovers) or operates as the exclusive active accessory in dungeon modes.
*   **Persistent & Volatile Effects**: Equipment provides passive, persistent stat boosts (e.g., Defense +15) or triggers volatile combat/exploration effects (e.g., preventing specific status conditions or neutralizing weather damage).

---

## 🎗️ Complete Equipment Registry

The following catalog registers all official equipment types from `Weather_Band.md` for future coding reference:

### 1. Status Mitigation & Neutralization (Bands & Scarves)

*   **Weather Band** (`weatherband`):
    *   **Effect**: Shields the wearer completely from all environmental weather effects (residual damage, sandstorm/hail ticks, and accuracy/speed penalties). The field condition is treated as **Clear** exclusively for the wearer.
    *   **Sprite Asset**: `crafting/tier3/leftovers`
*   **Pecha Scarf** (`pechascarf`):
    *   **Effect**: Prevents the wearer from being Poisoned or Badly Poisoned.
    *   **Sprite Asset**: `crafting/tier3/fullheal`
*   **Persim Band** (`persimband`):
    *   **Effect**: Prevents the wearer from getting Confused.
    *   **Sprite Asset**: `crafting/tier3/fullheal`
*   **Heal Ribbon** (`healribbon`):
    *   **Effect**: Speeds up the natural HP recovery rate by 100%, but increases the food/energy consumption rate.
    *   **Sprite Asset**: `crafting/tier3/potion`
*   **Insomnia-Scope** (`insomniascope`):
    *   **Effect**: Prevents the wearer from falling Asleep or being put to sleep by status moves.
    *   **Sprite Asset**: `crafting/tier3/scopelens`
*   **No-Slip Cap** (`noslipcap`):
    *   **Effect**: Prevents equipped items in the toolbox/bag from getting sticky or gunked up by sticky traps.
    *   **Sprite Asset**: `crafting/tier3/everstone`

### 2. Stat-Altering Scenery Equipment

*   **Defense Scarf** (`defensescarf`):
    *   **Effect**: Provides a flat passive boost of **+15 Defense** to the wearer's base stats.
    *   **Sprite Asset**: `crafting/tier3/powerbelt`
*   **Power Band** (`powerband`):
    *   **Effect**: Boosts the physical Attack stat of the wearer by **+15**.
    *   **Sprite Asset**: `crafting/tier3/powerbracer`
*   **Special Band** (`specialband`):
    *   **Effect**: Boosts the Special Attack stat of the wearer by **+15**.
    *   **Sprite Asset**: `crafting/tier3/powerlens`
*   **Zinc Band** (`zincband`):
    *   **Effect**: Boosts the Special Defense stat of the wearer by **+15**.
    *   **Sprite Asset**: `crafting/tier3/powerband`
*   **Warp Scarf** (`warpscarf`):
    *   **Effect**: Has a 10% chance to warp (teleport) the wearer to a random tile on the floor map at the start of each action cycle.
    *   **Sprite Asset**: `crafting/tier3/everstone`
*   **Pierce Band** (`pierceband`):
    *   **Effect**: Causes thrown items (projectiles, gravelrocks, spikes) to pierce through enemies, dealing damage to all targets in a straight path. Thrown items are lost after piercing.
    *   **Sprite Asset**: `crafting/tier3/poisonbarb`
