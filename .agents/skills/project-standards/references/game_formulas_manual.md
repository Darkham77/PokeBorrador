# Manual de Fórmulas y Ratios Matemáticos (Poké Vicio)

Este manual documenta las fórmulas matemáticas y constantes de balance que rigen el motor de juego. Cualquier cambio en estos valores debe ser reflejado aquí para mantener la coherencia del diseño.

## ⚔️ Fórmulas de Combate

### 1. Cálculo de Daño (Core V5)
Inspirado en Gen 4 con modificaciones para balance de juego web.
```text
Daño = Math.floor(((2 * Nivel / 5 + 2) * Poder * (A / D)) / 50) + 2
```
*Donde:*
- **A (Ataque)**: Incluye quemadura (x0.5) y multiplicadores de Naturaleza/Habilidad.
- **D (Defensa)**: Incluye multiplicadores de Naturaleza/Habilidad.
- **Modificadores Finales**: `Daño * STAB * Efectividad * Factor_Random (0.85-1.0) * Crítico * Clima * Items`.

### 2. Multiplicadores de Stage (-6 a +6)
| Stage | -6 | -5 | -4 | -3 | -2 | -1 | 0 | +1 | +2 | +3 | +4 | +5 | +6 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Stat** | 0.25 | 0.28 | 0.33 | 0.40 | 0.50 | 0.66 | 1.0 | 1.5 | 2.0 | 2.5 | 3.0 | 3.5 | 4.0 |
| **Acc/Eva** | 0.33 | 0.37 | 0.43 | 0.50 | 0.60 | 0.75 | 1.0 | 1.33 | 1.66 | 2.0 | 2.33 | 2.66 | 3.0 |

### 3. Fórmula de Captura
```text
Factor_HP = (3 * HP_Max - 2 * HP_Actual) / (3 * HP_Max)
FinalRate = Math.min(255, Math.floor(Ratio_Base * Multiplicador_Ball * Factor_HP * Multiplicador_Estado))
Captura = Random(0-255) < FinalRate
```
*Multiplicadores:*
- **Ball**: Poké (1.0), Super (1.5), Ultra (2.0), Master (Siempre 255).
- **Estado**: Sueño/Congelación (2.0), Otros estados (1.5).

---

## 📈 Ratios de Probabilidad Global

- **Shiny Rate**: 1 entre 3000 encuentros.
- **Rival (Blue)**: 0.1% de probabilidad en cualquier mapa.
- **Legendarios (Ticket Activo)**:
    - **Articuno**: 1% en Islas Espuma.
    - **Mewtwo**: 0.1% en Cueva Celeste.
- **Objetos Salvajes**: 50% de probabilidad (Común) / 5% (Raro).

---

## 🆙 Curva de Experiencia y Nivel

### 1. Experiencia Necesaria
El sistema utiliza un escalado dinámico por nivel:
```text
XP_Siguiente_Nivel = Math.floor(XP_Actual * 1.2)
```

### 2. Ganancia de EXP
```text
Exp = floor(ExpBase * Reparto * MultClase * MultGlobal)
```
- **ExpBase**: `Nivel_Enemigo * 4`.
- **Reparto**: 1.0 (Activo), 0.5 (Compartir EXP).

---

## 🧬 Estadísticas (Stats)

- **Puntos de Salud (PS)**:
  `PS = floor((Base * 2 + IV) * Nivel / 100 + Nivel + 10)`
- **Stats de Combate (Atk, Def, etc)**:
  `Stat = floor(floor((Base * 2 + IV) * Nivel / 100 + 5) * Naturaleza)`
  *Naturaleza*: Favorable (1.1), Desfavorable (0.9), Neutra (1.0).

---

## 🪙 Precios de Mercado Negro (Rocket)

Fórmula de valoración para la venta de Pokémon en el mercado ilegal:
```text
Precio = floor((Nivel * 50 + (TotalIVs / 186) * 500) * 0.8)
```
*Donde*: `TotalIVs` es la suma de los 6 stats (máx 186).

---

## 🎲 Ratios y Probabilidades (`GAME_RATIOS`)

- **Shiny Rate**: 1 en 3000 (Base). Afectado por multiplicadores de evento y dominancia de guerra.
- **Encuentro Rival**: 0.1% en cualquier mapa.
- **Pesca**: 10% base en mapas con agua.
- **Held Items (Salvajes)**: Común (50%), Raro (5%).
- **Gym TMs**: Normal (3%), Difícil (5%).

---

## ❄️ Sistema Determinista (Weather & PRNG)

### 1. Mulberry32 PRNG
Se utiliza una semilla basada en `hashString(mapId) + epochHour` para garantizar que el clima sea el mismo para todos los jugadores en la misma hora y ruta.

### 2. Avalanche Protocol
Para romper la correlación inicial de la semilla, el motor **DEBE** descartar los primeros 3 valores generados por el PRNG:
```js
const prng = mulberry32(seed);
prng(); // Discard 1
prng(); // Discard 2
prng(); // Discard 3
const finalValue = prng(); // Use this
```
