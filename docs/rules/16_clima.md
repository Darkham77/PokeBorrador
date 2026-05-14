# 16. Clima, Ciclos y Estaciones

El mundo de **Poké Vicio** es un ecosistema vivo y dinámico. El paso del tiempo, el cambio de estaciones y los fenómenos atmosféricos no solo afectan la estética del juego, sino que alteran profundamente las mecánicas de combate, la aparición de Pokémon y las probabilidades de captura.

---

## El Ciclo de Tiempo

Para mantener un ritmo de juego ágil, el tiempo en el juego transcurre más rápido que en la realidad:

- **Velocidad**: 1 día real (24h) equivale a **3 días de juego** (ciclos de 8h).
- **Fases Horarias**: Cada fase dura **2 horas reales**:
  - 🌅 **Amanecer**: 04:00 - 08:00
  - ☀️ **Día**: 08:00 - 16:00
  - 🌇 **Atardecer**: 16:00 - 20:00
  - 🌙 **Noche**: 20:00 - 04:00

### Las Estaciones

Las estaciones cambian cada **Semana Real** (7 días) siguiendo esta secuencia: `Primavera -> Verano -> Otoño -> Invierno`

---

## 🌪️ Climas Extremos (Mecánicas Avanzadas)

Los climas extremos son variantes potenciadas de las condiciones normales. Generalmente son intrínsecos a ciertas rutas o activados por Pokémon legendarios y formas primigenias.

### ☀️ Ola de Calor (Tierra del Desenlace)

Inspirado en el calor abrasador de Groudon Primigenio.

- **Efecto Crítico**: Los ataques de tipo **Agua** fallan automáticamente (se evaporan antes de impactar), reduciendo su daño a **0x**.
- **Potenciación**: El daño de tipo Fuego se mantiene en 1.5x.
- **Visual**: Fuerte viñeteado naranja y pulsos de calor en la atmósfera.

### ☔ Tormenta (Mar Primigenio)

Inspirado en las lluvias torrenciales de Kyogre Primigenio.

- **Efecto Crítico**: Los ataques de tipo **Fuego** fallan automáticamente (se extinguen), reduciendo su daño a **0x**.
- **Potenciación**: El daño de tipo Agua se mantiene en 1.5x.
- **Visual**: Rayos frecuentes y oscurecimiento dinámico del campo.

### 🥶 Ola de Frío

Un descenso térmico extremo que afecta a todos los seres vivos.

- **Daño Residual**: Inflige daño por turno a todos los Pokémon, sin importar su tipo (a diferencia de la Tormenta Arena o Nieve).
- **Penalización**: Reduce la velocidad de los Pokémon que no sean de tipo Hielo al **50%**.

### 🌬️ Ventisca (Nieve Extrema)

Una tormenta de nieve de intensidad insoportable.

- **Daño Residual**: Inflige daño por turno a todos los Pokémon que no sean de tipo Hielo.
- **Defensa**: Los Pokémon de tipo Hielo reciben un bono de **+50% en Defensa Física**.
- **Visibilidad**: La precisión de todos los movimientos (excepto Ventisca) se reduce debido a la ceguera blanca.

### 🌀 Vientos Fuertes (Ráfaga Delta)

Inspirado en el poder de Rayquaza.

- **Protección Volador**: Elimina todas las debilidades del tipo **Volador**. Los ataques que normalmente serían supereficaces (Eléctrico, Hielo, Roca) pasan a hacer daño neutro.
- **Visual**: Remolinos de aire constantes en las esquinas de la pantalla.

---

## 🌦️ Jerarquía Climática

El sistema organiza los climas en niveles de intensidad dentro de cada familia. A mayor nivel, más drásticos son los efectos y bloqueos.

| Familia       | Nivel 1 (Normal)  | Nivel 2 (Potenciado) | Nivel 3 (Extremo) | Nivel 4 (Catastrófico) |
| :------------ | :---------------- | :------------------- | :---------------- | :--------------------- |
| **Calor**     | Sol (☀️)          | Sol Intenso (🔆)     | Ola de Calor (🔥) | --                     |
| **Frío**      | Frío (🧊)         | Ola de Frío (🥶)     | --                | --                     |
| **Agua**      | Lluvia (🌧️)       | Lluvia Fuerte (☔)   | Tormenta (⛈️)     | --                     |
| **Eléctrico** | T. Eléctrica (🌩️) | --                   | --                | --                     |
| **Hielo**     | Nieve (❄️)        | Granizo (🌨️)         | Ventisca (🌬️)     | --                     |
| **Viento**    | Viento (🍃)       | Vientos Fuertes (🌀) | --                | --                     |
| **Atmosfera** | Bruma (💨)        | Niebla (🌫️)          | --                | --                     |
| **Tierra**    | T. Arena (🏜️)     | T. Polvo (🌪️)        | --                | --                     |

---

## ⚔️ Impacto en el Combate

### Modificadores de Daño y Precisión

- **Sol / Ola de Calor**: Fuego (1.5x) / Agua (0.5x). **Trueno/Huracán**: 50% Precisión.
- **Lluvia / Tormenta**: Agua (1.5x) / Fuego (0.5x). **Trueno/Huracán**: 100% Precisión.
- **T. Eléctrica**: Eléctrico (1.5x) / Dragón (1.5x). Fuego (1.0x - Sin penalización). **Trueno/Huracán**: 100% Precisión.
- **Tormenta Arena**: Daño residual (1/16 PS) excepto para tipos Roca, Tierra y Acero. Los tipos Roca ganan +50% de Defensa Especial.
- **Nieve**: Los tipos Hielo ganan +50% de Defensa Física.

### Ciclo Horario Implícito

Si no hay un clima activo (está "Despejado"), se aplican bonos por la fase del día (no acumulables con climas):

- **Mañana/Día**: Movimientos Fuego (+20%). Trueno/Huracán: 50% Precisión.
- **Tarde/Noche**: Movimientos Agua (+20%). Trueno/Huracán: 100% Precisión.

---

## 🗺️ Influencia en Encuentros (Spawns)

La aparición de Pokémon en el mapa es un sistema dinámico regido por el tiempo y el clima. Un Pokémon puede aparecer si coincide su fase horaria habitual **O** si el clima actual favorece su tipo elemental.

### Tabla de Modificadores de Spawn

Las condiciones atmosféricas alteran las probabilidades de encuentro según el tipo elemental:

| Clima | Potencia (x1.5) | Penaliza (x0.4) | Bloquea (x0) |
| :-- | :-- | :-- | :-- |
| **Lluvia (🌧️)** | Agua, Bicho, Eléctrico | Fuego, Roca, Tierra | - |
| **Lluvia Fuerte (☔)** | Agua | Roca, Tierra | **Fuego** |
| **Tormenta (⛈️)** | Agua, Eléctrico, Dragón | Roca, Tierra | **Fuego, Volador, Bicho** |
| **T. Eléctrica (🌩️)** | Eléctrico, Dragón | Roca, Tierra | **Volador, Bicho** |
| **Sol (☀️)** | Fuego, Planta, Tierra | Agua, Hielo | - |
| **Sol Intenso (🔆)** | Planta, Fuego | - | **Agua, Hielo** |
| **Ola de Calor (🔥)** | Fuego, Tierra | Agua | **Hielo, Planta** |
| **Frío (🧊)** | Hielo | Bicho, Planta | - |
| **Ola de Frío (🥶)** | Hielo | Fuego, Volador | **Bicho, Planta** |
| **Nieve (❄️)** | Hielo, Acero | Fuego, Bicho, Volador | - |
| **Granizo (🌨️)** | Hielo | Fuego, Bicho, Volador, Planta | - |
| **Ventisca (🌪️)** | Hielo | Acero, Roca | **Fuego, Planta, Bicho, Volador** |
| **Niebla (🌫️)** | Fantasma, Psíquico, Siniestro | Volador | - |
| **Bruma (💨)** | Hada, Agua | Fuego | - |
| **Viento (🍃)** | Volador, Bicho, Psíquico | Tierra | - |
| **Vientos Fuertes (🌀)** | Volador, Dragón, Psíquico | - | **Bicho, Tierra** |
| **T. Arena (🏜️)** | Roca, Tierra, Acero | Volador, Bicho, Fuego | - |
| **T. Polvo (🌪️)** | Roca, Tierra | Bicho | **Volador** |

---

## 🚪 Visitantes y Exclusivos Climáticos

Cuando el clima cambia, el ecosistema de la ruta se altera, permitiendo la llegada de especies no nativas.

### La Cuota del 10%

Todos los **Visitantes** y **Exclusivos** de un clima comparten una **probabilidad combinada del 10%** del pool total. Dentro de ese porcentaje, cada especie tiene un peso relativo.

- **Visitantes**: Pokémon que normalmente no están en la ruta pero aparecen bajo condiciones específicas (ej: _Pikachu_ en Tormenta en Ruta 1).
- **Exclusivos**: Especies que **SOLO** pueden aparecer si ese clima está activo, ignorando cualquier ciclo horario (ej: _Castform_ en Lluvia, _Sunflora_ en Sol).

---

## 🗺️ Pronóstico y Regiones

### Variabilidad Regional

Cada ruta tiene un clima característico que cambia según la **Estación** y el **Momento del Día**. Por ejemplo, es más probable encontrar lluvia en Otoño o calor intenso durante el Verano al mediodía.

### Sincronización Global

El clima es una condición compartida por todos los entrenadores.

- Todos los jugadores en la misma zona verán el mismo clima simultáneamente.
- El clima cambia al inicio de cada hora.

---

## 🔴 Bonos de Captura

Ciertas Pokéballs ven alterada su eficacia según el entorno:

- **Dusk Ball**: **3.0x** de eficacia si es de **Noche**, en una **Cueva** o con **Niebla**.
- **Net Ball**: **3.5x** de eficacia contra tipos Agua/Bicho, o si hay **Lluvia/Tormenta**.

---

## ⚔️ El Clima en el Mundo vs. Combate

Es importante distinguir entre el clima de la ruta y el clima generado en una batalla:

1. **Estado Natural**: El clima de la ruta es el estado base del entorno donde caminas.
2. **Alteración Temporal**: Al entrar en combate, habilidades (como _Llovizna_) o movimientos (como _Danza Lluvia_) pueden cambiar el clima solo para esa batalla.
3. **Restauración**: Una vez que el combate termina, el entorno vuelve instantáneamente a su clima original. El clima usado en combate no afecta la atmósfera de la ruta al salir.
