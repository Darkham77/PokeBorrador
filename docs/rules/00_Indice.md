# 📖 Manual de Desarrollo — Pokémon Online

> **"Te reto a dejar de jugarlo"**

Este directorio contiene la documentación técnica completa del juego **Pokémon Online**, ahora migrado a una arquitectura moderna con **Vue 3**, **Vite** y **Supabase**.

---

## 📂 Índice de archivos

| Archivo | Contenido |
|---|---|
| `01_arquitectura.md` | Estructura de archivos (Vue/Vite), flujo de pantallas |
| `02_estado_del_juego.md` | Stores de Pinia (`state`), persistencia, autenticación |
| `03_pokemon_y_stats.md` | Fórmulas de stats, IVs, naturalezas, niveles, EXP |
| `04_combate.md` | Sistema de batalla completo, daño, turnos, estatus |
| `05_encuentros_y_mapas.md` | Mapas, ciclo día/noche, tasas de aparición, gimnasios |
| `06_captura.md` | Fórmula de captura, Pokéballs, algoritmo de sacudidas |
| `07_economia.md` | Dinero, Battle Coins, tienda, desbloqueos por nivel |
| `08_items.md` | Todos los ítems: pociones, held items, piedras, especiales |
| `09_evoluciones.md` | Tabla de evoluciones por nivel y por piedra |
| `10_crianza.md` | Sistema de Guardería, compatibilidad, herencia de IVs |
| `11_huevos.md` | Ciclo de huevos, pasos, eclosión manual |
| `12_nivel_entrenador.md` | Rangos, EXP del entrenador, desbloqueos |
| `13_pvp.md` | Sistema PvP online, turnos simultáneos, protocolo |
| `14_social.md` | Amigos, intercambios, notificaciones en tiempo real |
| `15_balance_y_probabilidades.md` | Análisis de balance, probabilidades, recomendaciones |
| `17_clases.md` | Sistema de especialidades (Rocket, Cazabichos, etc.) |

---

## 🛠️ Stack Tecnológico

- **Frontend:** [Vue 3](https://vuejs.org/) (Composition API) + [Vite](https://vitejs.dev/)
- **Estado Global:** [Pinia](https://pinia.vuejs.org/) (Sustituye al objeto `state` global)
- **Rutas:** [Vue Router](https://router.vuejs.org/) (Sustituye a `showScreen()`)
- **Backend:** [Supabase](https://supabase.com) (PostgreSQL + Auth + Realtime + Vercel Functions)
- **Sprites:** PokeAPI GitHub CDN + `/public/assets`
- **Fuentes:** Google Fonts (`Press Start 2P`, `Nunito`)

## 🗃️ Tablas Supabase requeridas

```
profiles        — username, email, created_at
game_saves      — user_id, save_data (JSON), updated_at
friendships     — requester_id, addressee_id, status
trade_offers    — sender_id, receiver_id, pokemon_data, status
battle_invites  — challenger_id, opponent_id, status, created_at
```

## ⚡ Arranque rápido (Entorno de Desarrollo)

```bash
npm install
npm run dev       # Vite server en localhost:5173
```
Configurá tu archivo `.env` con las credenciales de Supabase antes de iniciar.
