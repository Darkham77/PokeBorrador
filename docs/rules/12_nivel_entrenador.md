# 🏆 Nivel de Entrenador y Progresión

El Nivel de Entrenador representa la experiencia acumulada del jugador y desbloquea funciones críticas del juego, como nuevos objetos en la tienda y mecánicas avanzadas.

---

## 📈 Rangos de Entrenador

A medida que acumulas experiencia, tu rango evoluciona. Cada rango requiere una cantidad específica de experiencia total acumulada.

| Nivel | Título                | EXP Necesaria |
| :---- | :-------------------- | :------------ |
| 1     | Novato                | 100           |
| 5     | Aventurero            | 1,400         |
| 10    | Campeón               | 8,500         |
| 15    | Maestro Pokémon       | 28,500        |
| 20    | Elegido de los Dioses | 61,000        |
| 25    | Místico de Kanto      | 106,000       |
| 30    | Deidad de Kanto       | 9,999,999     |

> [!NOTE] El Nivel 30 es actualmente el límite técnico (_Level Cap_), diseñado para ser un objetivo a muy largo plazo.

---

## 🔓 Desbloqueos de la Tienda (Market)

El acceso a mejores ítems está restringido por tu nivel de entrenador.

| Nivel     | Ítems Desbloqueados                                               |
| :-------- | :---------------------------------------------------------------- |
| **LV 3**  | Súper Ball, Super Poción                                          |
| **LV 5**  | Red Ball, Ocaso Ball, Cura Total, Compartir EXP, MT27 Retribución |
| **LV 8**  | Hiper Poción, Ultra Ball, Revivir, Lente Zoom, Subida de PP       |
| **LV 10** | Turno Ball, Restos, Cascabel Concha, Piedras de Evolución         |
| **LV 12** | Poción Máxima, Huevo Suerte Pequeño, Cinta Elegida, MT14 Ventisca |
| **LV 15** | Revivir Máximo, Elixir Máximo, Banda Focus                        |
| **LV 22** | Caramelo Raro                                                     |
| **LV 25** | Master Ball                                                       |

---

## ⚙️ Cómo Ganar Experiencia

La experiencia de entrenador se obtiene principalmente a través de:

- **Combates**: Ganar combates contra NPCs y en PvP.
- **Capturas**: Cada nueva captura suma experiencia.
- **Evoluciones**: Evolucionar Pokémon otorga bonificaciones de experiencia.
- **Misiones**: Completar misiones diarias y de clase.

---

## 📖 Referencias de Código

- Datos de rangos y desbloqueos: [trainer.ts](../../src/data/trainer.ts)
- Lógica de subida de nivel: [trainer.ts](../../src/stores/trainer.ts)
