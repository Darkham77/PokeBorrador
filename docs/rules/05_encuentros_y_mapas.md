# 🗺️ Encuentros y Mapas

## Ciclo Día/Noche

El ciclo se basa en la **hora local del dispositivo del jugador**:

```javascript
function getDayCycle() {
  const hour = new Date().getHours();
  if (hour >= 6  && hour < 9)  return 'morning';  // Alba: 6:00–8:59
  if (hour >= 9  && hour < 18) return 'day';       // Día: 9:00–17:59
  if (hour >= 18 && hour < 21) return 'dusk';      // Crepúsculo: 18:00–20:59
  return 'night';                                   // Noche: 21:00–5:59
}
```

El ciclo afecta:
- Qué Pokémon aparecen en cada zona
- Las tasas de aparición de cada Pokémon
- El fondo de batalla (sprite de escenario)
- El ícono y color del HUD

---

## Sistema de encuentros al explorar

Al llamar `goLocation(locId)`, se ejecuta en orden:

```
1. ¿Equipo vivo? → Si no, mostrar aviso de curar
2. Progresar huevos (hatchEggs)
3. ¿Repelente activo? → Si sí, bloquear y mostrar tiempo restante
4. Tirar dado de entrenador
   - rand × 100 < trainerChance (min 5%, max 20%)
   - Si sí → generateTrainerBattle(locId)
   - Si no → continuar a encuentro salvaje
5. Seleccionar Pokémon por tasa ponderada
6. Generar nivel aleatorio dentro del rango de la zona
7. startBattle(enemy, ...)
```

### Algoritmo de selección de Pokémon por tasa

```javascript
const wildPool  = loc.wild[cycle];   // array de IDs
const wildRates = loc.rates[cycle];  // array de tasas (mismo largo)
const totalRate = sum(wildRates);

let rand = Math.random() × totalRate;
// Recorre el pool acumulando tasas hasta superar rand
// El primer Pokémon cuya tasa acumulada supera rand es el seleccionado
```

---

## Sistema de Pity de Entrenadores

```javascript
// Estado inicial / tras login:
state.trainerChance = 5;  // 5%

// Al encontrar un entrenador:
state.trainerChance = 5;  // reset a 5%

// Cada 2 minutos SIN encontrar entrenadores:
if (trainerChance < 20) trainerChance += 5;
// Tope máximo: 20%
```

Esto crea un sistema de **pity suave**: si el jugador no ve entrenadores, la probabilidad sube gradualmente hasta un máximo del 20%. Al encontrar uno, vuelve a 5%.

> El jugador puede resetear manualmente via botón en el perfil: `resetEncounterPity()`

---

## Tabla de mapas completa

| ID | Nombre | Medallas req. | Niveles | Pokémon día |
|---|---|---|---|---|
| `route1` | Ruta 1 | 0 | 2–5 | Pidgey, Rattata |
| `route2` | Ruta 2 | 0 | 3–5 | Pidgey, Rattata, Caterpie, Weedle |
| `forest` | Bosque Viridian | 0 | 3–6 | Caterpie, Metapod, Weedle, Kakuna, Pikachu (10%), Nidoran♀/♂ (5% c/u) |
| `route22` | Ruta 22 | 0 | 3–5 | Rattata, Spearow, Mankey, Nidoran♀/♂ |
| `route3` | Ruta 3 | 1 | 6–12 | Pidgey, Spearow, Jigglypuff, Nidoran♀/♂, Mankey |
| `mt_moon` | Mt. Moon | 1 | 8–12 | Zubat (60%), Geodude (25%), Paras (10%), Clefairy (5%) |
| `route4` | Ruta 4 | 1 | 10–14 | Rattata, Spearow, Ekans, Sandshrew, Mankey |
| `route24` | Ruta 24 | 2 | 12–16 | Pidgey, Oddish, Bellsprout, Abra (15%), Venonat |
| `route25` | Ruta 25 | 2 | 12–16 | Pidgey, Oddish, Bellsprout, Abra, Metapod, Kakuna |
| `route5` | Ruta 5 | 2 | 13–16 | Pidgey, Meowth, Oddish, Bellsprout, Abra, Tangela, Mr. Mime (2%) |
| `route6` | Ruta 6 | 2 | 13–16 | Pidgey, Meowth, Oddish, Bellsprout, Psyduck, Mankey, Tangela |
| `route11` | Ruta 11 | 3 | 15–19 | Spearow, Ekans, Sandshrew, Drowzee |
| `diglett_cave` | Cueva Diglett | 2 | 15–31 | Diglett (95%), Dugtrio (5%) |
| `route9` | Ruta 9 | 3 | 14–18 | Spearow, Rattata, Ekans, Sandshrew, Nidoran♀/♂ |
| `rock_tunnel` | Túnel Roca | 3 | 16–21 | Zubat (50%), Geodude (40%), Machop (5%), Onix (5%) |
| `route10` | Ruta 10 | 3 | 16–20 | Spearow, Ekans, Sandshrew, Voltorb, Magnemite |
| `power_plant` | Central Energía | 5 | 30–35 | Pikachu (25%), Magnemite (25%), Magneton, Voltorb, Electrode, Electabuzz |
| `route8` | Ruta 8 | 4 | 18–22 | Pidgey, Meowth, Ekans, Sandshrew, Growlithe, Vulpix, Abra, Tangela, Mr. Mime (2%), Lickitung (1%) |
| `pokemon_tower` | Torre Pokémon | 4 | 20–25 | Gastly (día 100%, noche: Gastly 70%, Haunter 20%, Cubone 10%) |
| `route12` | Ruta 12 | 4 | 22–26 | Pidgey, Oddish, Bellsprout, Venonat, Weepinbell, Gloom, Snorlax (5%), Farfetch'd (8%) |
| `route13` | Ruta 13 | 5 | 24–28 | Pidgey, Pidgeotto, Oddish, Bellsprout, Venonat, Ditto (10%), Farfetch'd (10%) |
| `safari_zone` | Zona Safari | 5 | 25–35 | 14 Pokémon raros: Scyther, Pinsir, Chansey, Tauros, Kangaskhan... |
| `seafoam_islands` | Islas Espuma | 6 | 30–40 | Seel, Dewgong, Shellder, Horsea, Krabby, Golduck, Slowbro, Jynx |
| `mansion` | Mansión Pokémon | 7 | 32–38 | Koffing, Weezing, Grimer, Muk, Ponyta, Rapidash, Magmar, Vulpix, Growlithe |
| `route23` | Ruta 23 | 8 | 40–45 | Spearow, Fearow, Ekans, Arbok, Sandshrew, Sandslash, Mankey, Primeape |
| `victory_road` | Calle Victoria | 8 | 42–50 | Machop, Machoke, Geodude, Graveler, Onix, Marowak, Hitmonlee, Hitmonchan |
| `cerulean_cave` | Cueva Celeste | 8 | 50–65 | Kadabra, Rhydon, Golduck, Magneton, Parasect, Venomoth, Dragonair (5%), Chansey (5%) |

### Exclusivos nocturnos notables

- **Bosque Viridian (noche):** Zubat reemplaza a Caterpie/Metapod
- **Ruta 11 (noche):** Hypno (10%) aparece en vez de Drowzee
- **Cueva Celeste (noche):** Dragonite (20%) en vez de Dragonair
- **Mt. Moon (madrugada):** Clefairy solo de noche

---

## Gimnasios

| # | ID | Líder | Tipo | Pokémon (niveles) | Medallas req. |
|---|---|---|---|---|---|
| 1 | `pewter` | Brock | Roca | Geodude (12), Onix (14) | 0 |
| 2 | `cerulean` | Misty | Agua | Staryu (18), Starmie (21) | 1 |
| 3 | `vermilion` | Lt. Surge | Eléctrico | Voltorb (21), Pikachu (24), Raichu (28) | 2 |
| 4 | `celadon` | Erika | Planta | Victreebel (29), Tangela (24), Vileplume (29) | 3 |
| 5 | `fuchsia` | Koga | Veneno | Koffing (37), Muk (39), Koffing (37), Weezing (43) | 4 |
| 6 | `saffron` | Sabrina | Psíquico | Kadabra (38), Mr. Mime (37), Jynx (38), Alakazam (43) | 5 |
| 7 | `cinnabar` | Blaine | Fuego | Growlithe (42), Ponyta (40), Rapidash (42), Arcanine (47) | 6 |
| 8 | `viridian` | Giovanni | Tierra | Rhyhorn (45), Dugtrio (42), Nidoqueen (44), Nidoking (45), Rhydon (50) | 7 |

### Recompensa de gimnasio
```javascript
moneyWon = enemy.level × 80  // (el nivel del último Pokémon del líder)
coins    = floor(enemy.level × 2)
badge++  // solo la primera vez
```

---

## Entrenadores NPC aleatorios

Hay 10 tipos de entrenadores con pools fijos de Pokémon:

| Tipo | Pool de Pokémon |
|---|---|
| Caza Bichos | Caterpie, Metapod, Weedle, Kakuna, Paras, Venonat |
| Ornitólogo | Pidgey, Spearow, Doduo |
| Científico | Magnemite, Voltorb, Ditto, Grimer |
| Luchador | Mankey, Machop |
| Pescador | Magikarp, Goldeen, Poliwag |
| Nadador | Psyduck, Tentacool, Staryu, Horsea |
| Domador | Growlithe, Vulpix, Ponyta, Ekans |
| Médium | Abra, Drowzee |
| Motorista | Koffing, Grimer, Rattata |
| Montañero | Geodude, Sandshrew, Rhyhorn |

**Generación del equipo del entrenador:**
```javascript
teamSize = Math.floor(Math.random() × 3) + 1  // 1, 2, o 3 Pokémon
trainerLv = loc.lv[0] + 2  // Nivel base de la zona + 2
```

**Recompensa al derrotar entrenador:**
```javascript
moneyWon = enemy.level × 20 × 2  // Doble que salvaje
coins    = floor(enemy.level × 2)
// 5% de probabilidad de recibir un huevo de encuentro
```
