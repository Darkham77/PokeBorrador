# ⚖️ Balance y Probabilidades

Este documento detalla los valores numéricos y tasas de probabilidad que equilibran la experiencia de juego en Poké Vicio.

---

## ✨ Sistema Shiny

La probabilidad de encontrar un Pokémon Shiny está estandarizada para ofrecer un desafío justo pero alcanzable.

- **Tasa Base**: **1 entre 3,000** encuentros.
- **Modificadores**: Ciertas clases de jugador (como el _Coleccionista_) o el uso de objetos específicos pueden aumentar esta probabilidad.

---

## 🎲 Tasas de Encuentro (Encounters)

| Evento       | Probabilidad | Condición                              |
| :----------- | :----------- | :------------------------------------- |
| **Rival**    | 0.1%         | Cualquier encuentro en cualquier mapa. |
| **Pesca**    | 10%          | Al usar la caña en zonas con agua.     |
| **Articuno** | 1%           | En Islas Espuma (requiere Ticket).     |
| **Mewtwo**   | 0.1%         | En Cueva Celeste (requiere Ticket).    |

---

## 🤺 Encuentros con Entrenadores

El sistema utiliza un temporizador de "piedad" (_pity timer_) para asegurar que encuentres entrenadores regularmente:

- **Probabilidad Inicial**: 5%.
- **Incremento**: +5% cada 2 minutos.
- **Límite Máximo**: 20%.
- **Repelente**: Si está activo, la probabilidad se fija en un **30%** (buscando solo combates de nivel).

---

## 🎒 Objetos Equipados en Salvajes (Held Items)

Cuando encuentras un Pokémon salvaje, existe una probabilidad de que lleve un objeto equipado:

- **Objeto Común**: 50% de probabilidad.
- **Objeto Raro**: 5% de probabilidad.

---

## 🏛️ Rematch de Gimnasios (TM Rate)

Al derrotar a un Líder de Gimnasio en una revancha, puedes obtener una MT:

- **Modo Normal**: 3% de probabilidad.
- **Modo Difícil**: 5% de probabilidad.

---

## 📖 Referencias de Código

- Definición de Ratios: [ratios.ts](../../src/logic/ratios.ts)
- Generador de Pokémon: [pokemonFactory.ts](../../src/logic/pokemonFactory.ts)
- Lógica de encuentros: [encounters.ts](../../src/logic/encounters.ts)
