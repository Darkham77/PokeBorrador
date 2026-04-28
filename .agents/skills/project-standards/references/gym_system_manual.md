# Manual de Gimnasios y Progresión (Poké Vicio)

Este manual define el comportamiento de los Líderes de Gimnasio, su escalado de dificultad y el sistema de medallas.

## 🏅 Sistema de Medallas

- **Progreso Lineal**: Los gimnasios están bloqueados por cantidad de medallas requeridas (ej. Misty requiere 1 medalla, Surge requiere 2).
- **Control de Nivel**: Las medallas determinan el nivel máximo de obediencia de los Pokémon (Regla Gen 1-4).

---

## 🧗 Niveles de Dificultad (Rematch)

Cada gimnasio puede enfrentarse en tres dificultades:

### 1. Easy (Modo Viaje)

- **Equipo**: 2-3 Pokémon base.
- **Niveles**: 12 - 50.
- **Recompensa**: Medalla y MT específica (primera vez).

### 2. Normal (Modo Veterano)

- **Equipo**: 4 Pokémon evolucionados.
- **Niveles**: 30 - 70.
- **Recompensa**: Battle Coins y mayor XP.

### 3. Hard (Modo Maestro)

- **Equipo**: 6 Pokémon con IVs perfectos y Held Items estratégicos.
- **Niveles**: 65 - 90+.
- **Recompensa**: Held Items raros y posibilidad de TM exclusiva.

---

## 🧠 Lógica de Combate de Líderes

1. **El As (Ace)**: El último Pokémon del equipo es siempre el "As" del líder y suele llevar un objeto equipado.
2. **Prioridad de IA**: Los líderes tienen una IA mejorada que prioriza movimientos súper efectivos y cambios de estado.
3. **Rewards**: El `rewardTM` se otorga únicamente en la primera victoria. En rematches, se otorga dinero escalado según la dificultad.
