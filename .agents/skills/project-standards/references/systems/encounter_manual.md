# Encounter Systems Manual

## 1. Encounter Types

- **Wild**: Base probability according to the route.
- **Trainer**: Appear according to a "Pity" timer that increases by 5% every 2 minutes (max 20%).
- **Fishing**: Only on water routes, 10% base probability.
- **Defenders (Dominance Phase)**: 20% probability of finding a defender from the enemy faction on dominated maps during the weekend.

## 2. Guardians (Alpha Pokémon)

- **Spawn**: 1% probability on disputed maps.
- **Limit**: Only 1 guardian catch per map per day.

## 3. Repels and Incenses

- **Repel**: Blocks wild encounters whose levels are lower than the first Pokémon in the team. Increases the probability of Trainers to 30%.
- **Incense**: Filters the route's encounter pool to favor a specific **elemental type**.

## 4. Discovery & Pokedex Flags

The system uses two independent flags computed from the Pokédex state to determine visual representation:

1. **isSeen**: `seenPokedex.includes(id)`. Reveals name and types in tooltips.
2. **isCaught**: `pokedex.includes(id)`. Shows the actual sprite.
3. **Silhouette**: Unseen Pokémon (`isSeen = false`) show a solid black silhouette on the map to encourage exploration. In the Pokédex, they are shown as `???`.

---

## 5. Atmospheric & Temporal Influence

The appearance of Pokémon on the map is dynamically controlled by the intersection of the **Time Cycle** and **Weather Conditions**.

### 5.1 Combination Logic (Expandable Window)

To maximize player agency and world dynamism, the system uses an **OR (Additive)** logic:

- A Pokémon appears if the current **Time Phase** matches its schedule.
- **OR** if the current **Weather** favors its elemental type, even if it is outside its normal hours.

### 5.2 Source of Truth

All logic regarding weather generation, hierarchy, intensity tiers, and **spawn modifiers (Boost/Block)** is centralized in the [Time & Atmosphere Manual](../core/time_system_manual.md).

### 5.3 Advanced Weather Parity

Advanced weather types (Thunderstorm, Heatwave, blizzard, etc.) do NOT have automatic fallback to their base counterparts (Storm, Sun, Snow) in the encounter logic.

- **Mandatory Definition**: Every route with an advanced weather probability MUST have an explicit entry in `FIRE_RED_MAPS` weather configuration, or no visitors/exclusives will spawn during that event.
- **Legendary Patterns**: Extreme weather (L4) should be used as a trigger for legendary or pseudo-legendary "Exclusives" (1-5% chance) to reward exploration under dangerous conditions.

---

## 6. Calidad de los Encuentros (IVs y Potencial)

La generación de IVs no es puramente aleatoria; está fuertemente influenciada por el contexto del encuentro.

### 6.1 Lógica de Suelos (ivFloor)

El sistema aplica un `ivFloor` dinámico antes de la creación. El IV final de cada estadística es `Math.max(ivFloor, randomValue)`.

- **Cazabichos (Racha)**: El suelo es igual a la racha de capturas actual del jugador.
- **Misiones de Clase**:
  - 6h: Suelo 5.
  - 12h: Suelo 10.
  - 24h: Suelo 15.

### 6.2 El Método del Guardián (Doble Tirada)

Los Pokémon Guardianes utilizan un algoritmo de **Doble Tirada de Dados**. Se generan dos valores aleatorios y se selecciona el mayor, lo que desplaza la curva de probabilidad hacia valores altos.

- **Suelo Fijo**: Los Guardianes tienen un `ivFloor` inmutable de **12** en todas las estadísticas.

### 6.3 Bonos de Guerra (Dominancia)

Si un mapa está bajo el control total de la facción del jugador, se activa el **Bono de Dominancia**:

- **Efecto**: Todos los Pokémon salvajes capturados en ese mapa tienen un suelo garantizado de **15 IVs** en todas sus estadísticas.
