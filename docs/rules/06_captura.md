# 🧮 Sistema de Captura y Huida

Este documento detalla las fórmulas y mecánicas que rigen la captura de Pokémon salvajes y las probabilidades de huida del combate. El sistema utiliza una combinación de mecánicas de la Generación 2 con refinamientos de la Generación 4+.

---

## 🎣 Fórmula de Captura

La captura no es un evento de un solo paso, sino que se divide en el cálculo de un **Índice de Captura Final** y una serie de comprobaciones (sacudidas) de la Pokéball.

### 1. Cálculo del Índice (a)

```javascript
a = Math.floor(CatchRate × BallMult × HP_Factor × StatusMult)
```

Donde:

- **CatchRate**: Valor base de la especie (0-255). Por ejemplo, Caterpie tiene 255, Mewtwo tiene 3.
- **BallMult**: Multiplicador según el tipo de Pokéball utilizada.
- **HP_Factor**: `(3 × MaxHP - 2 × HP_Actual) / (3 × MaxHP)`
  - A vida llena, este factor es **1.0**.
  - A 1 HP, este factor tiende a **3.0**.
- **StatusMult**:
  - **2.0** para Dormido o Congelado.
  - **1.5** para Paralizado, Quemado o Envenenado.
  - **1.0** para sin estado.

> [!NOTE] Si el valor final de **a** es mayor o igual a 255, el Pokémon se captura automáticamente sin necesidad de comprobar sacudidas.

### 2. Comprobación de Sacudidas (Algoritmo de Probabilidad)

Si el Pokémon no es capturado automáticamente, se calcula un valor de probabilidad **b**:

```javascript
b = Math.floor(65535 × (a / 255)^0.25)
```

La Pokéball realizará hasta **4 comprobaciones**. Para que el Pokémon sea capturado, se deben superar las 4 pruebas consecutivas:

- Se genera un número aleatorio entre 0 y 65535.
- Si el número es **menor que b**, la sacudida tiene éxito y pasa a la siguiente.
- Si falla en cualquier paso, el Pokémon rompe la bola y el número de sacudidas visuales corresponde a los éxitos acumulados.

### 3. Captura Crítica (Refinamiento Gen 5+)

Al lanzar una Pokéball, existe una probabilidad de ejecutar una **Captura Crítica**, reduciendo el proceso a **una sola sacudida** de alta tensión:

```javascript
CC = Math.floor((Math.min(255, a) × P) / 6)
```

Donde **P** es el multiplicador según las especies capturadas en la Pokédex (escala de 251 especies de Gen 1 y 2):

| Especies Capturadas | Multiplicador (**P**) |
| :-- | :-- |
| **Menos de 15** | 0 |
| **15 a 49** | 0.5 |
| **50 a 99** | 1.0 |
| **100 a 149** | 1.5 |
| **150 a 199** | 2.0 |
| **200 o más** | 2.5 |

- **Tirada Crítica**: Se genera un número aleatorio entre 0 y 255. Si es **menor que CC**, la captura se convierte en crítica.
- **Resolución de Sacudida Única**: En una captura crítica, se realiza únicamente **1 comprobación** contra **b**:
  - Si tiene éxito: el Pokémon se captura de inmediato tras **1 sacudida** visual y el festejo de estrellas.
  - Si falla: el Pokémon rompe la Pokéball inmediatamente (0 sacudidas).
- **FX & Audio**: Se reproduce un silbido 8-bit ascendente en el aire y un cartel flotante retro arcade `"¡CAPTURA CRÍTICA!"` con destellos dorados.

---

## 🔴 Multiplicadores de Pokéballs (`BallMult`)

| Pokéball | Multiplicador | Condición Especial |
| :-- | :-- | :-- |
| **Master Ball** | ∞ | Captura garantizada (ignora todas las fórmulas). |
| **Ultra Ball** | 2.0 | Sin condiciones. |
| **Super Ball** | 1.5 | Sin condiciones. |
| **Poké Ball** | 1.0 | Sin condiciones. |
| **Malla Ball** | 3.5 | Si el objetivo es tipo **Agua** o **Bicho**, o si hay **Lluvia/Tormenta**. |
| **Ocaso Ball** | 3.0 | Si es **Noche/Atardecer**, o si el combate ocurre en una **Cueva** o hay **Niebla**. |
| **Turno Ball** | 1.0 - 4.0 | `1.0 + (TurnoActual × 0.3)`. Máximo alcanzado en el turno 10. |

---

## 🏃 Probabilidad de Huida

La capacidad de escapar de un Pokémon salvaje depende de la velocidad de tu Pokémon activo y del número de intentos realizados.

### Fórmula de Huida (Regla Activa: Gen 2)

```javascript
f = Math.floor((Vel_Jugador × 32) / Math.floor(Vel_Enemigo / 4)) + 30 × Intentos
```

- **Intentos**: Empieza en 1 y aumenta en cada turno que fallas al intentar huir.
- **Éxito**: Si `f > 255`, la huida es garantizada. De lo contrario, se genera un número aleatorio (0-255); si es menor que `f`, logras escapar.

> [!TIP] Si tu Pokémon es significativamente más rápido que el salvaje, la huida será casi siempre garantizada desde el primer intento. El uso de estados que bajen la velocidad del rival (como parálisis) o movimientos que suban la tuya también facilitan la huida.

---

## 📖 Referencias de Código

- Lógica de captura: [battleFormulas.ts](../../src/logic/battle/battleFormulas.ts)
- Lógica de huida: [battleFormulas.ts](../../src/logic/battle/battleFormulas.ts)
- Definición de tipos de Pokéballs: [items.ts](../../src/data/items.ts)
