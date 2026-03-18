# 📊 Pokémon y Estadísticas

## Fórmula de stats (Gen 4+ oficial)

### HP
```
maxHp = floor((base.hp × 2 + iv.hp) × level / 100 + level + 10)
```

### Resto de stats (Atk, Def, SpA, SpD, Spe)
```
stat_base = floor((base.stat × 2 + iv.stat) × level / 100 + 5)
stat_final = floor(stat_base × nature_mult)
```

Donde `nature_mult` es:
- `1.1` si la naturaleza potencia ese stat
- `0.9` si la naturaleza lo reduce
- `1.0` si no afecta

---

## IVs (Individual Values)

- Rango: **0 a 31** (entero aleatorio al crear el Pokémon)
- 6 stats: `hp`, `atk`, `def`, `spa`, `spd`, `spe`
- Generados con `Math.floor(Math.random() * 32)` — distribución uniforme
- Los IVs son **permanentes** y no cambian tras la evolución
- En crianza pueden **heredarse** (ver `10_crianza.md`)

### Impacto de los IVs

A nivel 50, un IV 31 vs IV 0 en un stat base 100:
```
IV31: floor((100×2 + 31) × 50/100 + 5) = floor(115.5 + 5) = 120
IV0:  floor((100×2 + 0)  × 50/100 + 5) = floor(100 + 5)   = 105
Diferencia: +15 puntos (≈ 14% más)
```

A nivel 100, la diferencia máxima entre IV0 e IV31 es **31 puntos** en cualquier stat no-HP.

---

## Naturalezas

Hay **20 naturalezas**. 5 son neutras (Hardy, Serio, Dócil, + 2 internas).
Las 15 activas tienen un stat +10% y otro -10%.

| Naturaleza | +10% | -10% |
|---|---|---|
| Audaz | Ataque | Def. Esp |
| Firme | Ataque | Velocidad |
| Pícaro | Ataque | Defensa |
| Manso | Ataque | At. Esp |
| Osado | Defensa | Ataque |
| Plácido | Defensa | At. Esp |
| Agitado | Defensa | Velocidad |
| Jovial | Defensa | Def. Esp |
| Modesto | At. Esp | Ataque |
| Moderado | At. Esp | Defensa |
| Ingenuo | At. Esp | Def. Esp |
| Raro | At. Esp | Velocidad |
| Tímido | Velocidad | Ataque |
| Activo | Velocidad | Defensa |
| Alocado | Velocidad | At. Esp |
| Tranquilo | Def. Esp | Velocidad |
| Grosero | Def. Esp | At. Esp |
| Cauto | Def. Esp | Ataque |

> Las naturalezas se asignan al azar (1/20 cada una). Actualmente **no son heredables** en crianza — es una oportunidad de mejora.

---

## Sistema de EXP

### Curva de niveles (Medium Fast modificada)

```javascript
function getExpNeeded(level) {
  return Math.floor(Math.pow(level + 1, 3) - Math.pow(level, 3));
}
```

Esta es la **derivada discreta** de la curva Medium Fast (level³), lo que significa que cada nivel requiere exactamente la diferencia entre el cubo del nivel siguiente y el actual.

Ejemplos:
| Nivel | EXP para subir |
|---|---|
| 1 | 7 |
| 5 | 91 |
| 10 | 331 |
| 20 | 1261 |
| 50 | 7651 |
| 100 | ∞ |

### EXP ganada en batalla

```javascript
// Pokémon salvaje derrotado:
baseExp = floor(enemy.level × 4)

// Entrenador o gimnasio derrotado:
baseExp = floor(enemy.level × 8)   // doble que salvaje

// Captura:
expGain = floor(enemy.level × 4 / 2) = floor(enemy.level × 2)  // 50% de derrota
```

### Ítem Huevo Suerte (held item)
```
expFinal = floor(baseExp × 1.5)
```

### Ítem Compartir EXP (held item)
El Pokémon portador recibe `floor(baseExp × 0.5)` aunque no haya participado en batalla.

---

## Shiny Rate

```javascript
const SHINY_RATE = 2000;  // 1/2000 por Pokémon creado

// Con Ticket Shiny activo (30 minutos):
const activeRate = Math.floor(SHINY_RATE / 10);  // = 200 → 1/200
```

La probabilidad se evalúa en `makePokemon()` con:
```javascript
const isShiny = Math.random() < (1 / activeRate);
```

### Probabilidades comparadas

| Condición | Tasa | Probabilidad |
|---|---|---|
| Normal | 1/2000 | 0.05% |
| Ticket Shiny activo | 1/200 | 0.5% |
| Huevo de crianza (fijo) | 1/512 | 0.195% |

---

## Género

```javascript
function assignGender(id) {
  if (GENDERLESS.includes(id)) return null;
  if (id.endsWith('_m')) return 'M';
  if (id.endsWith('_f')) return 'F';
  return Math.random() < 0.5 ? 'M' : 'F';  // 50/50
}
```

Pokémon asexuados: `articuno, ditto, electrode, magnemite, magneton, mew, mewtwo, moltres, porygon, starmie, staryu, voltorb, zapdos`

Pokémon con sexo fijo por ID: `nidoran_f`, `nidoran_m` (y otros con sufijo `_m`/`_f`)

---

## Evolución por nivel

Ver tabla completa en `09_evoluciones.md`. El proceso es:

1. Al subir de nivel, `levelUpPokemon()` llama a `checkEvolution(p)`
2. Si `p.level >= EVOLUTION_TABLE[p.id].level`, inicia la animación
3. `evolvePokemon()` actualiza `id`, `name`, `emoji`, `type`, recalcula stats con los mismos IVs
4. Los movimientos existentes se conservan
5. Si el evolutivo tiene habilidades nuevas, se asigna una al azar

## Multiplicadores de stage en batalla

```javascript
const STAGE_MULT = [0.25, 0.28, 0.33, 0.40, 0.50, 0.66, 1, 1.5, 2, 2.5, 3, 3.5, 4];
//                   -6    -5    -4    -3    -2    -1    0   +1   +2  +3   +4   +5   +6
```

El índice 6 corresponde al stage 0 (neutral). Función de acceso:
```javascript
function stageMult(stage) {
  return STAGE_MULT[Math.max(0, Math.min(12, stage + 6))];
}
```
