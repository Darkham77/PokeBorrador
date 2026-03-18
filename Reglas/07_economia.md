# 💰 Economía del Juego

## Monedas de Curso Legal: ₽ (Pokédólares)

### Estado inicial del jugador
```
Dinero inicial: ₽3.000
Pokéballs:      10
Pociones:       3
```

### Fuentes de ingreso

| Fuente | Fórmula | Ejemplo (Nv. 30) |
|---|---|---|
| Derrota Pokémon salvaje | `level × 20` | ₽600 |
| Derrota entrenador NPC | `level × 20 × 2` | ₽1.200 |
| Derrota líder de gimnasio | `level × 80` | ₽2.400 |
| Moneda Amuleto activa | `× 2` a todo lo anterior | — |

La Moneda Amuleto dura **30 minutos** y su efecto es:
```javascript
if ((state.amuletCoinUntil || 0) > Date.now()) moneyWon *= 2;
```

---

## Battle Coins 🪙

Moneda secundaria obtenida **solo** en batallas contra entrenadores y gimnasios.

### Fuentes
```javascript
coins = floor(enemy.level × 2)  // Al derrota cada Pokémon del entrenador/gym
```

### Tienda de Battle Coins (Trainer Shop)

Los ítems de la Trainer Shop solo se compran con Battle Coins y requieren un nivel mínimo de entrenador:

| Ítem | BC | Nivel req. | Efecto |
|---|---|---|---|
| Cinturón Negro | 250 | 4 | +20% daño Lucha |
| Carbón | 250 | 4 | +20% daño Fuego |
| Agua Mística | 250 | 4 | +20% daño Agua |
| Semilla Milagro | 250 | 4 | +20% daño Planta |
| Imán | 250 | 4 | +20% daño Eléctrico |
| Moneda Amuleto | 250 | 1 | Dinero × 2 por 30 min |
| Subida PP | 150 | 5 | +20% PP máx. de un movimiento |
| Recordador Movimientos | 150 | 1 | Reaprender último movimiento olvidado |
| Brazal Potencia | 120 | 5 | Herencia ATK en crianza |
| Fajín Potencia | 120 | 5 | Herencia DEF en crianza |
| Lente Potencia | 120 | 5 | Herencia SpA en crianza |
| Banda Potencia | 120 | 5 | Herencia SpD en crianza |
| Tobillera Potencia | 120 | 5 | Herencia SPE en crianza |
| Pesa Recia | 120 | 5 | Herencia HP en crianza |
| Compartir EXP | 300 | 4 | EXP aunque no luche |
| Lente Zoom | 400 | 5 | +Críticos |
| Lazo Destino | 200 | 5 | 5 IVs heredados |
| Caramelo Raro | 500 | 5 | +1 nivel al instante |
| Restos | 600 | 6 | Recupera 1/16 HP/turno |
| Cascabel Concha | 500 | 6 | Recupera 1/8 del daño infligido |
| Cinta Elegida | 800 | 7 | +50% Ataque (solo 1 movimiento) |
| Huevo Suerte | 500 | 7 | +50% EXP ganada |
| Banda Focus | 700 | 8 | Sobrevive con 1 HP |

---

## Tienda Principal (Poké Market)

Precios en ₽ y nivel de entrenador requerido:

### Pokéballs
| Ítem | Precio | Nivel req. | Ball mult |
|---|---|---|---|
| Pokéball | 200 | 1 | ×1 |
| Súper Ball | 600 | 3 | ×1.5 |
| Red Ball | 1.000 | 4 | ×3.5 (Agua/Bicho) |
| Ball Oscura | 1.000 | 4 | ×2 |
| Ultra Ball | 1.200 | 5 | ×2 |
| Ball Temporizadora | 1.000 | 6 | Sube con turnos |
| Master Ball | 9.999 | 9 | Garantizada |

### Pociones
| Ítem | Precio | Nivel req. | Efecto |
|---|---|---|---|
| Poción | 300 | 1 | +20 HP |
| Antídoto | 100 | 1 | Cura veneno |
| Despertar | 250 | 1 | Cura sueño |
| Repelente | 3000 | 1 | Bloquea nivel inferior 10 min |
| Superrepelente | 6000 | 3 | Bloquea nivel inferior 20 min |
| Máximo Repelente | 9000 | 5 | Bloquea nivel inferior 30 min |
| Cura Quemadura | 250 | 2 | Cura quemadura |
| Super Poción | 700 | 3 | +50 HP |
| Cura Total | 600 | 4 | Cura todos los estados |
| Éter | 1.200 | 4 | +10 PP a un movimiento |
| Hiper Poción | 1.200 | 5 | +200 HP |
| Revivir | 1.500 | 5 | Revive con 50% HP |
| Poción Máxima | 2.500 | 7 | HP completo |
| Revivir Máximo | 3.000 | 8 | Revive con HP completo |
| Elixir Máximo | 4.500 | 8 | Restaura todos los PP |

### Piedras de Evolución
| Ítem | Precio | Nivel req. |
|---|---|---|
| Piedra Fuego | 2.000 | 4 |
| Piedra Agua | 2.000 | 4 |
| Piedra Trueno | 2.000 | 4 |
| Piedra Hoja | 2.000 | 4 |
| Piedra Lunar | 2.500 | 5 |
| Piedra Solar | 3.000 | 6 |
| Piedra Hielo | 3.000 | 7 |
| Piedra Brillo | 3.500 | 7 |

### Vitaminas (permanentes)
| Ítem | Precio | Nivel req. | Efecto |
|---|---|---|---|
| Vitamina HP | 4.000 | 5 | +5% HP base permanente |
| Proteína | 4.000 | 5 | +8% Ataque permanente |
| Hierro | 4.000 | 5 | +8% Defensa permanente |

---

## Simulación de economía del jugador

Progresión estimada de ingresos por hora activa:

| Etapa | Zonas activas | Ingreso/hora (aprox.) |
|---|---|---|
| 0–2 medallas | Rutas 1–4, Forest | ₽3.000–6.000 |
| 2–4 medallas | Rutas 5–11, Cueva Diglett | ₽8.000–15.000 |
| 4–6 medallas | Rutas 8–12, Torre, Safari | ₽15.000–25.000 |
| 6–8 medallas | Mansión, Rutas 23, Victoria | ₽25.000–50.000 |

> Estimado con ~30 encuentros/hora y mezcla de salvajes y entrenadores.

---

## Gasto mínimo sugerido por etapa

| Medallas | Compras recomendadas | Costo estimado |
|---|---|---|
| 0–1 | Pokéballs ×20, Pociones ×5 | ₽5.500 |
| 1–3 | Súper Balls ×10, Super Pociones ×5 | ₽9.500 |
| 3–5 | Ultra Balls ×10, Hiper Pociones ×5, Piedras ×2 | ₽22.000 |
| 5–8 | Master Ball ×1, Revivir ×3, Elixir Máx ×1 | ₽23.000 |
