# 🎒 Ítems

## Categorías

| Categoría | Dónde se compra | Moneda |
|---|---|---|
| `pokeballs` | Poké Market | ₽ |
| `pociones` | Poké Market | ₽ |
| `stones` | Poké Market | ₽ |
| `especial` | Poké Market o Trainer Shop | ₽ o BC |
| `held` | Trainer Shop | BC |
| `breeding` | Trainer Shop | BC |
| `utility` | Trainer Shop | BC |

---

## Ítems de curación (HEALING_ITEMS)

Usables desde la mochila fuera de batalla y desde el menú de mochila en batalla.

| Ítem | Efecto |
|---|---|
| Poción | +20 HP (no cura si HP está lleno) |
| Super Poción | +50 HP |
| Hiper Poción | +200 HP |
| Poción Máxima | HP al máximo |
| Revivir | Revive con 50% HP (solo si HP = 0) |
| Revivir Máximo | Revive con HP completo |
| Antídoto | Cura envenenamiento |
| Cura Quemadura | Cura quemadura |
| Despertar | Despierta de sueño |
| Cura Total | Cura todos los estados + HP completo |
| Éter | +10 PP a todos los movimientos |
| Elixir Máximo | Restaura todos los PP al máximo |
| Caramelo Raro | +1 nivel (hasta nivel 100) |
| Subida PP | +20% PP máx. del primer movimiento que no esté al máximo |
| Subida PP | +20% PP máx. del primer movimiento que no esté al máximo |
| Recordador de Movimientos | Permite elegir y recuperar cualquier movimiento olvidado del learnset (Solo fuera de combate) |

### MTs (Máquinas Técnicas)
| Ítem | Movimiento enseñado |
|---|---|
| MT Retribución | Retribución (Normal, 85 poder) |
| MT Terremoto | Terremoto (Tierra, 100 poder) |
| MT Ventisca | Ventisca (Hielo, 110 poder) |

---

## Ítems Globales (no requieren elegir Pokémon)

| Ítem | Efecto | Duración |
|---|---|---|
| Repelente | Bloquea Pokémon de nivel inferior al tuyo | 10 minutos |
| Superrepelente | Bloquea Pokémon de nivel inferior al tuyo | 20 minutos |
| Máximo Repelente | Bloquea Pokémon de nivel inferior al tuyo | 30 minutos |
| Ticket Shiny | Divide SHINY_RATE por 2 (1/1000 en vez de 1/2000) | 30 minutos |
| Moneda Amuleto | Duplica el dinero ganado en batallas | 30 minutos |
| Huevo Suerte Pequeño | Aumenta la EXP ganada en un 50% | 30 minutos |


---

## Held Items (ítems equipables)

Equipados en un Pokémon específico. Se activan automáticamente en batalla.

### Ofensivos

| Ítem | Efecto en batalla |
|---|---|
| Cinta Elegida | ×1.5 Ataque físico; solo puede usar el primer movimiento elegido ese combate |
| Lente Zoom | Críticos al 12% (vs. 6% base) |
| Carbón | ×1.2 a movimientos Fuego |
| Imán | ×1.2 a movimientos Eléctrico |
| Agua Mística | ×1.2 a movimientos Agua |
| Semilla Milagro | ×1.2 a movimientos Planta |
| Cinturón Negro | ×1.2 a movimientos Lucha |

### Defensivos / Sustain

| Ítem | Efecto en batalla |
|---|---|
| Restos | Recupera `floor(maxHp / 16)` al final de cada turno |
| Cascabel Concha | Recupera `floor(daño_infligido / 8)` al atacar |
| Banda Focus | Si HP lleno, sobrevive con 1 HP ante un golpe que lo noqueaba |

### Soporte

| Ítem | Efecto |
|---|---|
| Compartir EXP | El portador gana `floor(baseExp × 0.5)` aunque no luche |



### De Crianza

| Ítem | Stat garantizado | BC |
|---|---|---|
| Pesa Recia | HP | 120 |
| Brazal Potencia | Ataque | 120 |
| Fajín Potencia | Defensa | 120 |
| Lente Potencia | At. Especial | 120 |
| Banda Potencia | Def. Especial | 120 |
| Tobillera Potencia | Velocidad | 120 |
| Lazo Destino | 5 IVs (en vez de 3) | 200 |

---

## Piedras de evolución

| Piedra | Pokémon → Evolución |
|---|---|
| Piedra Trueno ⚡ | Pikachu → Raichu, Eevee → Jolteon |
| Piedra Luna 🌙 | Clefairy → Clefable, Jigglypuff → Wigglytuff, Nidorina → Nidoqueen*, Nidorino → Nidoking* |
| Piedra Hoja 🌿 | Gloom → Vileplume, Weepinbell → Victreebel, Exeggcute → Exeggutor |
| Piedra Agua 💧 | Poliwhirl → Poliwrath, Shellder → Cloyster, Staryu → Starmie, Eevee → Vaporeon |
| Piedra Fuego 🔥 | Growlithe → Arcanine, Vulpix → Ninetales*, Eevee → Flareon |
| Piedra Solar ☀️ | Gloom → Bellossom* |
| Piedra Hielo 🧊 | Eevee → Glaceon* |
| Piedra Brillo ✨ | Togetic → Togekiss* |

> `*` = Solo definidos en `STONE_EVOLUTIONS` pero pueden requerir que el Pokémon esté en el DB.

### Eevee tiene 3 opciones de piedra:
```javascript
'Piedra Agua'   → 'vaporeon'
'Piedra Trueno' → 'jolteon'
'Piedra Fuego'  → 'flareon'
```

---

## Uso de ítems en batalla

Desde el botón `MOCHILA` en pantalla de batalla, se puede usar cualquier ítem de `HEALING_ITEMS`.

Al usar un ítem en batalla:
1. Se aplica el efecto al Pokémon elegido
2. El turno del jugador se consume
3. El enemigo ataca normalmente

> ⚠️ No hay restricción de "no usar ítems en PvP". Sería bueno agregar esa limitación para el PvP competitivo.
