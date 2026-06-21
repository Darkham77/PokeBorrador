# Reporte de Contradicciones y Reglas de Clima vs. Pokémon Oficial

Este reporte detalla las reglas de clima ("clima") implementadas en el proyecto **Poké Vicio** y cómo contrastan tanto con la lógica real del motor de combate del juego como con las mecánicas oficiales de Pokémon (Showdown / Gen 3-9).

Se han identificado tres tipos de discrepancias principales:

1. **Contradicción Ficha vs. Código (UI vs. Engine)**: Modificadores que se anuncian visualmente en la descripción del clima (`WEATHER_REGISTRY`), pero que no están implementados en el código de combate (`battleMath.ts` o `moveExecutor.ts`).
2. **Contradicción Proyecto vs. Pokémon Oficial**: Mecánicas del proyecto diseñadas intencionalmente de forma diferente a los juegos oficiales de Pokémon.
3. **Mecánicas de Ciclo Horario Solapadas**: Efectos climáticos condicionados por el día/noche que no existen en los juegos oficiales.

---

## 1. Modificadores de Daño de Movimientos (Potencia de Tipos)

| Clima en Juego | Tipo de Move | Efecto Declarado (UI) | Implementado en Engine | Regla Pokémon Oficial (Showdown) |
| :--- | :--- | :--- | :--- | :--- |
| **Sol (`sun`)** | Planta / Tierra | ▲ Potenciado | ❌ **No (1.0x)** | No se potencian por Sol. |
| **Sol (`sun`)** | Hielo | ▼ Penalizado | ❌ **No (1.0x)** | No se penaliza por Sol. |
| **Ola Calor (`heatwave`)** | Tierra | ▲ Potenciado | ❌ **No (1.0x)** | Clima no oficial. |
| **Lluvia (`rain`)** | Eléctrico / Dragón | ▲ Potenciado (1.5x) | **Sí (1.5x)** | No se potencian en Lluvia (solo precisión). |
| **Lluvia (`rain`)** | Bicho | ▲ Potenciado | ❌ **No (1.0x)** | No se potencia en Lluvia. |
| **Lluvia (`rain`)** | Roca / Tierra | ▼ Penalizado | ❌ **No (1.0x)** | No se penalizan en Lluvia. |
| **Tormenta (`storm`)** | Eléctrico / Dragón | ▲ Potenciado (1.5x) | **Sí (1.5x)** | Clima no oficial. |
| **T. Eléctrica (`thunderstorm`)** | Eléctrico / Dragón | ▲ Potenciado (1.5x) | **Sí (1.5x)** | Clima no oficial. |
| **T. Arena (`sandstorm`)** | Roca / Tierra / Acero | ▲ Potenciado | ❌ **No (1.0x)** | No se potencia la potencia de movimientos. |
| **T. Arena (`sandstorm`)** | Volador / Bicho / Fuego | ▼ Penalizado | ❌ **No (1.0x)** | No se penalizan por Tormenta de Arena. |
| **Nieve (`snow`)** | Hielo / Acero | ▲ Potenciado | ❌ **No (1.0x)** | No potencian movimientos (solo Defensa a tipo Hielo). |
| **Nieve (`snow`)** | Fuego / Bicho / Volador | ▼ Penalizado | ❌ **No (1.0x)** | No se penalizan por Nieve. |
| **Granizo (`hail`)** | Fuego / Bicho / Volador / Planta | ▼ Penalizado | ❌ **No (1.0x)** | No se penalizan por Granizo. |
| **Niebla / Bruma (`fog` / `mist`)** | Fantasma / Hada / Psíquico / Siniestro | ▲ Potenciado | ❌ **No (1.0x)** | No potencian daño (Niebla reduce precisión). |
| **Viento / V. Fuertes (`wind`)** | Volador / Bicho / Psíquico | ▲ Potenciado | ❌ **No (1.0x)** | Delta Stream no aumenta potencia. |

---

## 2. Inmunidades y Bloqueos de Daño (x0)

El registro de clima declara inmunidades completas a ciertos tipos elementales para determinados climas, pero **estas inmunidades no están programadas en la comprobación de efectividad de tipos** (`getCombinedEff` de `battleMath.ts`):

* **Ola Calor (`heatwave`)**: Declarado: *Inmune a Hielo y Planta (x0)* $\rightarrow$ ❌ **No implementado en código**.
* **Sol Abrasador (`intense_sun`)**: Declarado: *Inmune a Agua y Hielo (x0)* $\rightarrow$ ❌ **Solo Agua es bloqueada (x0)** mediante el multiplicador de clima en el cálculo de daño; Hielo sigue recibiendo daño normal.
* **Tormenta (`storm`)**: Declarado: *Inmune a Fuego, Volador y Bicho (x0)* $\rightarrow$ ❌ **Solo Fuego es bloqueado (x0)**; Volador y Bicho reciben daño normal.
* **Tormenta de Polvo (`dust_storm`)**: Declarado: *Inmune a Volador (x0)* $\rightarrow$ ❌ **No implementado en código**.
* **Ventisca (`blizzard`)**: Declarado: *Inmune a Fuego, Planta, Bicho y Volador (x0)* $\rightarrow$ ❌ **No implementado en código**.
* **Ola Frío (`coldwave`)**: Declarado: *Inmune a Bicho y Planta (x0)* $\rightarrow$ ❌ **No implementado en código**.
* **Corrientes Delta (`strong_winds`)**: Declarado: *Inmune a Bicho y Tierra (x0)* $\rightarrow$ ❌ **No implementado en código**.

---

## 3. Efectos en Estadísticas (Stats)

* **Granizo (`hail`) + Defensa Hielo**: En `getEffectiveStatPure`, se aplica un aumento del **+50% en Defensa** para Pokémon de tipo Hielo bajo `snow` (correcto en Gen 9) pero **también bajo `hail` (Granizo)**. Oficialmente, Granizo nunca aumentó la defensa física.
* **Ola Frío (`coldwave`)**: Reduce la velocidad general un **-50%** a no Hielos. Clima y efecto completamente personalizados.
* **Tormenta de Arena (`sandstorm`)**: Aumento del **+50% en SpD** para tipos Roca. (Correcto con las reglas oficiales).

---

## 4. Precisión de Movimientos y Reglas Especiales

* **Trueno / Vendaval (`thunder` / `hurricane`)**:
  * Tienen **100% de precisión** bajo Lluvia o Tormenta Eléctrica, pero en este motor también son afectadas por el **Ciclo Horario**: si el clima es Despejado (`clear`) y es de noche o atardecer (`night`/`dusk`), se activa un estado virtual de lluvia (`isRainActive`) que les otorga 100% de precisión.
  * Tienen **50% de precisión** bajo Sol o ciclo de día/mañana despejado.
* **Rayo Solar / Cuchilla Solar (`solar_beam` / `solar_blade`)**:
  * Se cargan instantáneamente en Sol, pero también en un día despejado (`clear` + `day`/`morning`).
  * Tienen daño reducido al 50% y requieren carga bajo cualquier otro clima adverso.
* **Niebla / Bruma (`fog` / `mist`)**:
  * Niebla reduce la precisión de todos los movimientos al **60%** (80% si es Bruma/Mist). En los juegos oficiales, la Niebla de la 4ª generación reducía la precisión a un 9/10 (aproximadamente un 10% menos de precisión), no un golpe tan drástico.
