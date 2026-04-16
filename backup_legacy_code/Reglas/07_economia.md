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
| Compartir EXP | 400 | 4 | EXP aunque no luche |
| Lente Zoom | 400 | 5 | +Críticos |
| Lazo Destino | 200 | 5 | 5 IVs heredados |
| Caramelo Raro | 500 | 5 | +1 nivel al instante |
| Restos | 750 | 6 | Recupera 1/16 HP/turno |
| Cascabel Concha | 750 | 6 | Recupera 1/8 del daño infligido |
| Cinta Elegida | 800 | 7 | +50% Ataque (solo 1 movimiento) |
| Huevo Suerte Pequeño | 500 | 7 | +50% EXP ganada (30 min) |
| Banda Focus | 700 | 8 | Sobrevive con 1 HP |
| Ticket Shiny | 1000 | 1 | x2 Shiny rate |

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
| Super Poción | 600 | 3 | +50 HP |
| Cura Total | 600 | 4 | Cura todos los estados |
| Éter | 1.200 | 4 | +10 PP a un movimiento |
| Hiper Poción | 1.500 | 5 | +200 HP |
| Revivir | 2.000 | 5 | Revive con 50% HP |
| Poción Máxima | 2.500 | 7 | HP completo |
| Revivir Máximo | 3.000 | 8 | Revive con HP completo |
| Elixir Máximo | 4.500 | 8 | Restaura todos los PP |

### Piedras de Evolución
| Ítem | Precio | Nivel req. |
|---|---|---|
| Piedra Fuego | 3.000 | 4 |
| Piedra Agua | 3.000 | 4 |
| Piedra Trueno | 3.000 | 4 |
| Piedra Hoja | 3.000 | 4 |
| Piedra Lunar | 3.000 | 5 |
| Piedra Solar | 3.000 | 6 |
| Piedra Hielo | 3.000 | 7 |
| Piedra Brillo | 3.500 | 7 |

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
