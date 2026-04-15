# 🏗️ Arquitectura del Proyecto — Pokémon Online

## Estructura de archivos (Vue 3 + Vite)

```
pokemon-online/
├── index.html              # Punto de entrada de Vite
├── package.json            # Dependencias (Vue, Vite, Pinia, Vue Router)
├── vite.config.js          # Configuración de Vite y aliases
├── public/                 # Activos estáticos servidos en la raíz
│   ├── assets/             # Imágenes, iconos, banners
│   └── maps/               # Mapas de fondo por zona
├── database/               # Esquemas SQL y migraciones
├── tests/                  # Suite de pruebas unitarias e integración
├── scripts/                # Utilidades de mantenimiento y despliegue
└── src/                    # Código fuente de la aplicación
    ├── main.js             # Entrada JS principal
    ├── App.vue             # Componente raíz
    ├── assets/             # CSS global y recursos procesados por Vite
    ├── components/         # Componentes Vue reutilizables (HUD, Modales)
    ├── views/              # Vistas principales (Login, Mapa, Batalla)
    ├── stores/             # Estado global con Pinia (Sustituye a state.js)
    ├── router/             # Configuración de rutas (Vue Router)
    ├── logic/              # Lógica de negocio (Cálculos, DB de Pokémon)
    └── legacy/             # Código original en proceso de migración
        └── js/             # Scripts heredados del sistema anterior
```

> 💡 **Nota de Arquitectura:** El proyecto se encuentra en una fase de migración. La lógica pesada reside en `src/legacy/js/` pero está siendo modularizada gradualmente hacia `src/logic/` y stores de Pinia.

---

## Flujo de Navegación (Vue Router)

El sistema ahora utiliza **Vue Router** para gestionar las pantallas de forma limpia:

```
/                   ──→ LoginView.vue (Auth / Registro)
/intro              ──→ IntroView.vue (Selección de starter)
/game               ──→ GameView.vue (Contenedor principal)
    ├── /map        ──→ MapView.vue (Exploración)
    ├── /team       ──→ TeamView.vue (Gestión de equipo)
    ├── /pokedex    ──→ PokedexView.vue
    ├── /shop       ──→ ShopView.vue
    ├── /social     ──→ SocialView.vue
    └── /gyms       ──→ GymView.vue
/battle             ──→ BattleView.vue (Encuentros salvajes / Entrenamiento)
/pvp                ──→ PvpView.vue (Combates online)
```

---

## Gestión de Estado (Pinia)

El antiguo objeto global `state` ha sido reemplazado por **Pinia Stores**:

- **useUserStore**: Autenticación, perfiles y preferencias.
- **useGameStore**: Equipo Pokémon, mochila, dinero y progreso.
- **useMapStore**: Ubicación actual, ciclos de día/noche y encuentros.
- **useBattleStore**: Estado del combate activo y logs.

---

## Ciclo de Vida y Persistencia

### Autenticación
1. El componente `LoginView` interactúa con `supabase.auth`.
2. Al iniciar sesión, se cargan los datos desde la tabla `game_saves`.
3. El estado se sincroniza con los stores de Pinia.

### Guardado Automático
1. Se utiliza el helper `scheduleSave()` para encolar cambios.
2. Los cambios se persisten en Supabase (`game_saves`) mediante una función debounced.
3. Se mantiene compatibilidad con `localStorage` para el modo local.

---

## Convenciones de Desarrollo

- **Composition API**: Usar siempre `<script setup>`.
- **CSS**: Estilos globales en `src/assets/main.css` y estilos específicos *scoped* en componentes.
- **Legacy Hook**: Para interactuar con el código heredado, usar el bridge definido en `src/logic/legacyBridge.js`.
- **Nomenclatura**: Archivos Vue en `PascalCase`, carpetas y JS en `kebab-case`.
 Estado del juego centralizado en el objeto `state` (ver `02_estado_del_juego.md`)
- Overlays/modales creados dinámicamente con `document.createElement` y removidos con `.remove()`
- Notificaciones toast vía `notify(msg, icon)` — duración 5 segundos
- Logs de batalla vía `setLog(msg)` (reemplaza) y `addLog(msg, cls)` (agrega)
- Guardado diferido siempre con `scheduleSave()`, inmediato con `saveGame(false)`
