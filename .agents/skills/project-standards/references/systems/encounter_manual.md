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
- _Example_: A Staryu (Night) can appear during the _Day_ if it is _Raining_.

### 5.2 Modificadores de Spawn por Clima

Las condiciones atmosféricas afectan dinámicamente las probabilidades de encuentro según los tipos elementales del Pokémon.

| Clima | Potencia (x1.5) | Penaliza (x0.4) | Bloquea (x0) |
| :--- | :--- | :--- | :--- |
| **Lluvia (🌧️)** | Agua, Bicho, Eléctrico | Fuego, Roca, Tierra | - |
| **Tormenta (⛈️)** | Agua, Eléctrico, Dragón | Roca, Tierra | Fuego, Volador, Bicho |
| **Sol (☀️)** | Fuego, Planta, Tierra | Agua, Hielo | - |
| **Ola de Calor (🔥)** | Fuego, Tierra | Agua, Planta | Hielo |
| **Nieve (❄️)** | Hielo, Acero | Fuego, Bicho | - |
| **Ventisca (🌪️)** | Hielo | Acero, Roca | Fuego, Planta, Bicho, Volador |
| **Tormenta Arena (🏜️)** | Roca, Tierra, Acero | Volador, Bicho, Fuego | - |
| **Niebla (🌫️)** | Fantasma, Psíquico, Siniestro | Volador | - |
| **Viento (🍃)** | Volador, Bicho, Psíquico | Tierra | - |
| **Vientos Fuertes (🌀)** | Volador, Dragón, Psíquico | - | Bicho |
| **Bruma (🌫️)** | Hada, Agua | Fuego | - |
| **Tormenta Polvo (🌫️)** | Roca, Tierra | Volador, Bicho | - |

### 5.3 Weather Invasions (Visitors & Relative Weights)

When an atmospheric condition becomes active, the route's encounter pool is "invaded" by non-native Pokémon attracted by the weather.

- **Weighted Quota**: All visitors and exclusives for a weather condition share a combined **10% probability** of the total pool.
- **Internal Rarity**: Within that 10%, species follow relative weights defined in the map table (e.g., `{ pikachu: 95, zapdos: 5 }`).
- **Exclusive Weather Spawns**: Species flagged as **Weather Exclusive** (e.g., Castform) will ONLY appear if their specific weather condition is active, ignoring all time cycles.

### 5.4 Visual Feedback (Halo Cian FX & Coordinated Pulse)

Pokémon synchronized with the weather display visual effects based on their rarity status.

- **The Cyan Halo**: A vibrant cyan glow applied via `::before`.
  - **Parity Specs**: Inset `-2%`, `Blur(2px)`, Opacity base `0.6`, Scale Max `1.05`.
- **The Counter-Pulse (Coordinated Animation)**:
  - When a Pokémon has both Red Aura and Cyan Halo, their animations MUST be perfectly synchronized in **counter-phase**.
  - **Red Aura (Rare)**: 0% Small/Dim -> 50% Big/Bright.
  - **Cyan Halo (Weather)**: 0% Big/Bright -> 50% Small/Dim.
  - **Timing**: Both MUST use a 2s cycle and share the same `animation-delay` based on `var(--spawn-seed)`.

### 5.5 UI Representation (Tooltips)

Map tooltips use the following iconography to inform the player:

- **Hierarchy**:
  - `Aparición: ☀️ 🌙` (Cycle info)
  - `🌧️ Visitante/Exclusivo/Potenciado por el clima` (Weather info)
- **Fallback**: If no cycle or weather info is applicable, display `Habitante común`.
- **Unknown Pokémon**: Silhouette with hint: `Atmospheric anomaly detected`.

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
