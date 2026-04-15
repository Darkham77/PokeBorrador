# ⚔️ Sistema de Combate

## Tipos de batalla

| Tipo | Descripción | ¿Se puede capturar? | ¿Se puede huir? |
|---|---|---|---|
| Salvaje | Pokémon aleatorio de la zona | ✅ | ✅ |
| Entrenador | NPC aleatorio de la zona | ❌ | ❌ |
| Gimnasio | Líder con equipo fijo | ❌ | ❌ |
| PvP | Jugador vs Jugador online | ❌ | (rendirse) |

---

## Objeto `state.battle`

```javascript
state.battle = {
  enemy,            // Pokémon enemigo activo
  player,           // Pokémon del jugador activo (referencia a state.team[i])
  isGym,            // boolean
  gymId,            // string o null
  isTrainer,        // boolean
  enemyTeam,        // array completo del equipo enemigo (trainer/gym)
  trainerName,      // nombre del entrenador NPC
  playerTeamIndex,  // índice en state.team del Pokémon activo
  locationId,       // zona donde ocurre la batalla
  turn: 'player',   // siempre empieza el jugador
  over: false,

  // Turnos
  recharging: false,     // jugador debe recargar (Hiperrayo)
  enemyRecharging: false,

  // Modificadores de stage (se resetean al cambiar de Pokémon)
  playerStages: { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 },
  enemyStages:  { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 },

  // Velocidad — se calcula una vez por turno
  turnFirst: null,    // true si el jugador actúa primero este turno
}
```

---

## Fórmula de daño (Gen 4+ oficial)

```
base = floor( ((2×level/5 + 2) × power × A / D) / 50 ) + 2

A = atkStat × stageMult(atkStage)   [× 0.5 si burn en movimiento físico]
D = defStat × stageMult(defStage)

STAB  = 1.5 si moveType == attacker.type (o type2), si no 1.0
eff   = typeEffectiveness(moveType, defender.type) × typeEffectiveness(moveType, defender.type2)
item  = multiplicador del held item (ver tabla abajo)
rand  = random entre 0.85 y 1.00 (distribución uniforme)
crit  = 1.5 si golpe crítico (6% base, 12% con Lente Zoom)

finalDmg = max(1, floor(base × STAB × eff × rand × item × crit))
```

### Multiplicadores de held items en daño

| Ítem | Condición | Multiplicador |
|---|---|---|
| Carbón | Movimiento fuego | ×1.2 |
| Imán | Movimiento eléctrico | ×1.2 |
| Agua Mística | Movimiento agua | ×1.2 |
| Semilla Milagro | Movimiento planta | ×1.2 |
| Cinturón Negro | Movimiento lucha | ×1.2 |
| Cinta Elegida | Movimiento físico | ×1.5 |

### Mecánicas especiales de daño

| Mecánica | Condición | Efecto |
|---|---|---|
| Multi-golpe | `md.hits = '2-5'` | 2/3 hits (33% c/u) o 4/5 (17% c/u) |
| Multi-golpe fijo | `md.hits = 2` | Siempre 2 hits |
| Mov. Sísmico | `md.levelDmg = true` | Daño = nivel del atacante |
| Contraataque | `md.counter = true` | 2× último daño físico recibido |
| Drenado | `md.drain = true` | Recupera 50% del daño causado |
| Cascabel Concha | held item | Recupera 12.5% del daño causado |
| Retroceso | `md.recoil = N` | Atacante recibe `floor(daño / N)` de daño |
| AutoKO | `md.selfKO = true` | Atacante queda con 0 HP |
| Banda Focus | held item, HP lleno | Sobrevive con 1 HP si el golpe lo noqueaba |

---

## Orden de turno

```javascript
function playerActsFirstBySpeed(b) {
  const pSpe = getEffectiveSpeed(b.player, b.playerStages);
  const eSpe = getEffectiveSpeed(b.enemy, b.enemyStages);
  return pSpe > eSpe || (pSpe === eSpe && Math.random() < 0.5);
}
```

La parálisis reduce la velocidad efectiva a 50%:
```javascript
if (pokemon.status === 'paralyze') spe = max(1, floor(spe × 0.5));
```

El orden se calcula **una vez al inicio del turno** y se guarda en `b.turnFirst`.

---

## Verificaciones pre-ataque (en orden)

1. **Flinch** — si `b.player.flinched`, pierde el turno
2. **Parálisis** — 25% de probabilidad de no poder moverse
3. **Sueño** — cada turno decrementa `sleepTurns`; cuando llega a 0, despierta
4. **Congelamiento** — 80% de probabilidad de no poder moverse; 20% de descongelarse
5. **Recarga** — si `b.recharging` (turno posterior a Hiperrayo), pierde turno
6. **Confusión** — 50% de golpearse a sí mismo con daño fijo (power 40, tipo normal, físico)
7. **Chequeo de PP** — si el movimiento elegido tiene 0 PP, muestra "¡Sin PP!"
8. **Chequeo de precisión** — `rand × 100 > acc × stageMult(accStage - evaStage)`

---

## Efectos de estado aplicados por movimientos (`applyMoveEffect`)

Cada efecto tiene un nombre interno con un sufijo numérico opcional que indica la probabilidad:

| Efecto interno | Probabilidad | Descripción |
|---|---|---|
| `burn` | 100% | Quema |
| `burn_10` | 10% | Quema |
| `paralyze` | 100% | Parálisis |
| `paralyze_10` | 10% | Parálisis |
| `paralyze_30` | 30% | Parálisis |
| `poison` | 100% | Envenena |
| `poison_20` | 20% | Envenena |
| `freeze` | 100% | Congela |
| `freeze_10` | 10% | Congela |
| `sleep` | 100% | Duerme |
| `confuse` | 100% | Confunde (2–5 turnos) |
| `flinch_30` | 30% | Asusta (pierde turno si va segundo) |
| `rest` | 100% | Restaura HP y duerme 2 turnos |
| `teleport` | 100% | Huye de batalla salvaje |
| `leech_seed` | 100% | Planta drenadoras |
| `stat_up_self_atk` | 100% | +1 stage Ataque propio |
| `stat_up_self_def` | 100% | +1 stage Defensa propia |
| `stat_up_self_def_2` | 100% | +2 stages Defensa |
| `stat_up_self_spa_2` | 100% | +2 stages At. Esp. |
| `stat_up_self_spe_2` | 100% | +2 stages Velocidad |
| `stat_down_enemy_atk` | 100% | -1 stage Ataque rival |
| `stat_down_enemy_def` | 100% | -1 stage Defensa rival |
| `stat_down_enemy_spe` | 100% | -1 stage Velocidad rival |
| `stat_down_enemy_acc` | 100% | -1 stage Precisión rival |

**Inmunidades a estado:**
- Fuego → inmune a quemadura
- Eléctrico → inmune a parálisis
- Veneno / Acero → inmune a veneno
- Hielo → inmune a congelamiento

---

## Efectos de fin de turno (end-of-turn, en orden)

1. **Restos** (Leftovers) — recupera `floor(maxHp / 16)` HP
2. **Drenadoras** — resta `floor(maxHp / 8)` al infectado, transfiere al rival
3. **Quemadura** — resta `floor(maxHp / 8)` HP
4. **Veneno** — resta `floor(maxHp / 8)` HP

El orden se aplica primero al que actuó primero ese turno.

---

## Fin de batalla

### Victoria (won = true)

**Pokémon entrenador/gimnasio con equipo:**
- Si quedan Pokémon vivos en el `enemyTeam`, el siguiente salta a combatir
- Solo cuando todos caen se ejecuta la recompensa

**Recompensas:**
```javascript
// Dinero
moneyWon = isGym     ? enemy.level × 80
         : isTrainer ? enemy.level × 20 × 2   // entrenadores pagan doble
         :             enemy.level × 20

// Con Moneda Amuleto activa:
moneyWon × 2

// Battle Coins (solo trainers y gyms):
coins = floor(enemy.level × 2)

// EXP del entrenador (nivel del jugador):
trainerExp = isGym  ? enemy.level × 5
           :          enemy.level × 2
```

**Huevo por derrota de entrenador (5% de probabilidad):**
```javascript
if (isTrainer && Math.random() < 0.05) {
  // Pool: pichu, magby, elekid, cleffa, igglybuff, togepi, eevee
  addEgg(randomFromPool, 'encounter');
}
```

### Derrota (won = false)

- Si hay Pokémon vivos en el equipo → cambio forzado
- Si todos caen → cada Pokémon recupera `max(hp, floor(maxHp × 0.3))` (revive parcial automático)
- **No hay penalización de dinero** en la versión actual

---

## IA del enemigo

El enemigo elige movimientos **completamente al azar** entre sus movimientos con PP > 0:
```javascript
const validMoves = b.enemy.moves.filter(m => m.pp > 0);
const move = validMoves[Math.floor(Math.random() * validMoves.length)];
```

No hay ninguna IA estratégica. Si el enemigo queda sin PP, usa **Forcejeo**:
- Daño: `floor(enemy.atk × 0.5)` al jugador
- Auto-daño: `floor(enemy.maxHp / 4)`

---

## Tabla de efectividad de tipos

```
              Normal Fire  Water  Grass  Elec  Ice  Fight Poison Ground Flying Psych Bug  Rock  Ghost Dragon Dark  Steel
Normal        ×1    ×1    ×1     ×1     ×1    ×1   ×1    ×1     ×1     ×1     ×1    ×1   ×0.5  ×0    ×1     ×1    ×0.5
Fire          ×1    ×0.5  ×0.5   ×2     ×1    ×2   ×1    ×1     ×1     ×1     ×1    ×2   ×0.5  ×1    ×0.5   ×1    ×2
Water         ×1    ×2    ×0.5   ×0.5   ×1    ×1   ×1    ×1     ×2     ×1     ×1    ×1   ×2    ×1    ×0.5   ×1    ×1
Grass         ×1    ×0.5  ×2     ×0.5   ×1    ×1   ×1    ×0.5   ×2     ×0.5   ×1    ×0.5 ×2    ×1    ×0.5   ×1    ×0.5
Electric      ×1    ×1    ×2     ×0.5   ×0.5  ×1   ×1    ×1     ×0     ×2     ×1    ×1   ×1    ×1    ×0.5   ×1    ×1
...
```

Ver `TYPE_CHART` completo en `02_pokemon_data.js`. Los tipos `Dark` y `Fairy` están parcialmente implementados.

---

## Huir de batalla

```javascript
function runFromBattle() {
  if (isGym)     → "¡No podés huir!"
  if (isTrainer) → "¡No podés huir!"
  // Salvaje: huida instantánea, sin fórmula de probabilidad
  state.battle.over = true;
  showScreen('game-screen');
}
```

> ⚠️ **Falta implementar:** La fórmula oficial de huida (basada en velocidades). Actualmente la huida de batallas salvajes siempre tiene éxito.
