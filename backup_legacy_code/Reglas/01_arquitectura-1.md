# 🏗️ Arquitectura del Proyecto

## Estructura de archivos

```
poke_vicio/
├── index.html              # App completa (904 líneas) — todos los módulos JS se incluyen aquí
├── style.css               # Estilos (2923 líneas) — tema oscuro, animaciones, responsive
├── login_guard.js          # Utilidad de seguridad de sesión
├── package.json            # Dependencias mínimas (serve-static, finalhandler)
├── assets/sprites/         # Fondos de batalla por zona y ciclo horario
│   ├── bosque_dawn/day/night.png
│   ├── montana_dawn/day/dusk/night.png
│   ├── playa_dawn/day/night.png
│   ├── puente_dawn/day/dusk/night.png
│   ├── ruta_dawn/day/night.png
│   ├── pvp_dawn/day/night.png
│   └── gimnasio.png
└── js/
    ├── 01_auth.js          # Autenticación Supabase + modo local, guardado
    ├── 02_pokemon_data.js  # DB de Pokémon, mapas, gimnasios, movimientos, tipos
    ├── 03_sprites.js       # URLs de sprites, SHINY_RATE, caché de imágenes
    ├── 04_state.js         # Estado global, tipos de entrenador, makePokemon()
    ├── 05_render.js        # HUD, ciclo día/noche, renderizado de tabs
    ├── 06_encounters.js    # Lógica de encuentros salvajes y gimnasios
    ├── 07_battle.js        # Motor de batalla completo
    ├── 08_shop.js          # Tienda, Centro Pokémon, sistema de nivel entrenador
    ├── 09_social.js        # Amigos, notificaciones en tiempo real
    ├── 10_trade.js         # Sistema de intercambio
    ├── 11_battle_ui.js     # UI de batalla, HEALING_ITEMS, mochila en batalla
    ├── 12_box_bag.js       # Caja PC, mochila, uso de ítems fuera de batalla
    ├── 13_evolution.js     # Evoluciones por nivel y por piedra
    ├── 14_pvp.js           # Batallas PvP en tiempo real vía Supabase Realtime
    └── 15_breeding.js      # Sistema de Guardería/Crianza
```

> ⚠️ **Importante:** Todos los módulos JS se cargan como `<script>` inline dentro de `index.html` y comparten el mismo scope global. No hay módulos ES6 ni bundler.

---

## Flujo de pantallas

```
auth-screen
    │
    ├─ login online  ──→ onLogin()  ──┐
    ├─ registro      ──→ doSignup() ──┤
    └─ login local   ──→ onLocalLogin()
                                      │
                         ┌────────────┘
                         ↓
                   title-screen  (selección de starter)
                         │
                         ↓
                   game-screen
                   ├── tab: map        (explorar zonas / gimnasios)
                   ├── tab: team       (ver equipo)
                   ├── tab: pokedex    (Pokédex)
                   ├── tab: shop       (tienda + tienda entrenador)
                   ├── tab: friends    (amigos, trades, PvP)
                   └── tab: gym        (lista de gimnasios)
                         │
                         ↓
                   battle-screen       (batalla salvaje, entrenador, gimnasio)
                         │
                         └──────────→ pvp-screen (batalla PvP)
```

---

## Modelo de pantallas

El sistema usa una función `showScreen(id)` que muestra/oculta divs con clase `.screen`:

```javascript
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.style.display = s.id === id ? 'block' : 'none';
    s.classList.toggle('active', s.id === id);
  });
}
```

Las tabs del juego usan `showTab(tabName)` de forma similar.

---

## Ciclo de vida de sesión

```
Carga página
    │
    ↓
sb.auth.getSession()  ──→ sesión activa → onLogin()
    │
    └─ sin sesión → mostrar auth-screen
                         │
                         ↓
                   login/signup → onLogin()
                         │
                         ↓
                   cargar game_saves desde Supabase
                         │
                         ├─ save encontrado → restaurar state, ir a game-screen
                         └─ sin save        → ir a title-screen (elegir starter)
```

### Auto-guardado

- **Cada 60 segundos** vía `setInterval`
- **Debounce de 2 segundos** tras cualquier acción importante (`scheduleSave()`)
- **Inmediato** en eventos únicos (elegir starter, capturar, ganar medalla)
- **Modo local:** `localStorage` con clave `pokemon_local_save_<userId>`
- **Modo online:** tabla `game_saves` en Supabase (`upsert` por `user_id`)

---

## Convenciones de código

- Variables globales en `let` o `const` a nivel de módulo/scope del `<script>`
- Estado del juego centralizado en el objeto `state` (ver `02_estado_del_juego.md`)
- Overlays/modales creados dinámicamente con `document.createElement` y removidos con `.remove()`
- Notificaciones toast vía `notify(msg, icon)` — duración 5 segundos
- Logs de batalla vía `setLog(msg)` (reemplaza) y `addLog(msg, cls)` (agrega)
- Guardado diferido siempre con `scheduleSave()`, inmediato con `saveGame(false)`
