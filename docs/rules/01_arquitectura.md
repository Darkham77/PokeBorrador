# 🏗️ Arquitectura del Proyecto — Poké Vicio

Esta sección define el núcleo técnico y la organización del proyecto Poké Vicio en su versión 2026. La arquitectura está diseñada para maximizar el rendimiento (GPU-First), garantizar la integridad de los datos (Híbrido Online/Offline) y mantener un código limpio mediante modularidad estricta.

## 🛠️ Stack Tecnológico (Modern Core)

El proyecto utiliza una infraestructura de vanguardia para garantizar fluidez y robustez:

- **Runtime**: **Node.js 26+** (Uso de `Temporal API`, Permission Model y `node:test`).
- **Frontend Framework**: **Vue 3** (Composition API con `<script setup>`).
- **Build Tool**: **Vite 7** (Optimizado para ESM y HMR instantáneo).
- **Lenguaje**: **TypeScript (Strict Mode)**. Política de **Zero-Ignore** y **Zero-Any**.
- **Estado Global**: **Pinia**. Gestión reactiva y tipada del estado.
- **Animaciones**: **GSAP 3**. Motor único para animaciones de combate y UI fluida.
- **Estilos**: **SASS (SCSS)**. Sistema de mixins centralizados y "SASS Trap Engine" para capitalización automática.
- **Base de Datos**: Híbrida mediante **DBRouter**:
  - **Online**: Supabase (PostgreSQL) para persistencia global y social.
  - **Offline**: SQLite (`node:sqlite`) para modo local y testing.

---

## 📂 Estructura de Archivos

El sistema sigue una organización modular basada en dominios de responsabilidad:

```text
poké-vicio/
├── index.html              # Punto de entrada de Vite
├── package.json            # Dependencias y scripts
├── vite.config.ts          # Configuración de Vite y plugins (SASS Traps, PWA)
├── public/                 # Activos estáticos servidos en la raíz (Sprites, Mapas)
├── database/               # Esquemas SQL, migraciones y validadores
├── scripts/                # Mantenimiento, auditoría y assets (Node 26+)
├── tests/                  # Suite de pruebas (Native Node Runner + Vitest)
└── src/                    # Código fuente
    ├── main.ts             # Entrada TS principal
    ├── App.vue             # Componente raíz
    ├── assets/             # SCSS global, mixins y variables
    ├── components/         # UI Components (Atomic Design, scoped styles)
    │   └── ui/             # Componentes base (BaseModal, UnifiedCard, Toast)
    ├── composables/        # Lógica de UI y hooks reactivos (useBattleHud, useBattleAnimations)
    ├── logic/              # Núcleo de negocio y cálculos
    │   ├── battle/         # Motor de combate y FSM (Máquina de Estados)
    │   ├── utils/          # Formateadores, Temporal-init y Helpers (logger)
    │   └── core/           # Climas, ciclos y fórmulas (Pure Modules)
    ├── router/             # Configuración de rutas (Vue Router)
    ├── stores/             # Estado global tipado con Pinia
    ├── types/              # Definiciones estrictas de interfaces y tipos
    └── views/              # Vistas principales (Login, Mapa, Batalla)
```

---

## 🧭 Flujo de Navegación (Vue Router)

El sistema utiliza **Vue Router** para gestionar las pantallas de forma limpia y reactiva:

```text
/                   ──→ LoginView.vue (Auth / Registro / Acceso Denegado)
/intro              ──→ IntroView.vue (Selección de starter)
/game               ──→ GameView.vue (Contenedor principal con HUD)
    ├── /map        ──→ MapView.vue (Exploración y encuentros)
    ├── /team       ──→ TeamView.vue (Gestión de equipo y stats)
    ├── /pokedex    ──→ PokedexView.vue (Registro de especies)
    ├── /shop       ──→ ShopView.vue (Economía y consumibles)
    ├── /social     ──→ SocialView.vue (Amigos y Chat)
    └── /gyms       ──→ GymView.vue (Desafíos y Rematches)
/battle             ──→ BattleView.vue (Encuentros salvajes / Entrenamiento)
/pvp                ──→ PvpView.vue (Combates online en tiempo real)
```

---

## ⚙️ Motores Principales

### 1. Sistema de Persistencia (DBRouter)

La arquitectura implementa un aislamiento absoluto entre contextos. El `DBRouter` decide dinámicamente si los datos se dirigen a la nube (**Supabase**) o a la persistencia local (**SQLite/OPFS**), permitiendo una experiencia de juego híbrida sin colisiones de datos.

### 2. Motor de Batalla (FSM + GSAP)

El combate se rige por una **Máquina de Estados Finita (FSM)** que garantiza un flujo determinista y libre de condiciones de carrera.

- **Sincronización**: Las transiciones de estado esperan promesas de GSAP (`awaitAnimation`).
- **Paridad**: El código debe mantener paridad 1:1 con los diagramas de Mermaid en la documentación oficial.
- **Orquestación**: Visuales desacoplados de la lógica mediante el uso de `useBattleAnimations`.

### 3. Identidad "Hybrid Retro-Modern"

- **Modern Shell**: Interfaz premium con carcasas sólidas (Shell), gradientes HSL y transiciones fluidas.
- **Retro Heart**: Contenido de juego (Pokémon, Items) procesado como Pixel Art nítido mediante el mixin `@include pixelated`.

---

## 🔄 Ciclo de Vida y Persistencia

### Autenticación y Carga

1. `LoginView` gestiona el acceso mediante `supabase.auth`.
2. Al validar la sesión, se cargan los datos desde el `ProfileService`.
3. El estado se inyecta en los stores de Pinia correspondientes.

### Guardado Automático (SaveService)

- Se utiliza `scheduleSave()` para encolar cambios de forma atómica.
- El sistema utiliza una función _debounced_ para evitar saturar la base de datos en acciones frecuentes.
- Se mantiene sincronización en tiempo real para estados críticos (GTS, PVP).

---

## 📜 Convenciones y Reglas de Oro

Para mantener la salud del repositorio, se aplican las siguientes reglas inamovibles:

1. **Ley de las 300/500 Líneas**: La modularización debe ser proactiva. A partir de las **300 líneas**, se recomienda la extracción de lógica a Composables. Ningún archivo de lógica o componente Vue puede exceder las **500 líneas**.
   - _Excepción_: Bases de datos masivas (ej. `pokemonDB.ts`), archivos de metadatos y módulos en `src/data/` están exentos para mantener la cohesión de los datos.
2. **Zero-Warning Policy**: Prohibido el uso de `@ts-ignore` o `any`. Todo debe estar tipado y pasar `npm run lint` sin advertencias.
3. **Temporal First**: Prohibido el uso de `Date` para lógica de juego. Usar siempre `Temporal` para timestamps y duraciones.
4. **GPU First**: Priorizar transformaciones CSS3 y `will-change` contextual para asegurar 60 FPS constantes.
5. **Auditoría Obligatoria**: Antes de cada commit, es mandatorio ejecutar `npm run audit`.

---

> 💡 **Nota:** Esta arquitectura evoluciona constantemente. Consulta los manuales específicos en `@/project-standards` para detalles sobre mecánicas o sistemas de datos.
