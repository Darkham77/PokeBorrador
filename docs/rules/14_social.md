# 👥 Funciones Sociales y Conectividad

Poké Vicio no es solo una aventura en solitario; incluye un robusto sistema social que permite interactuar con otros entrenadores a nivel global.

---

## 🤝 Sistema de Amigos

El sistema de amigos permite mantener un seguimiento de tus conocidos y facilitar las interacciones directas (combates e intercambios).

### Características

- **Búsqueda de Jugadores**: Puedes buscar a cualquier entrenador por su nombre de usuario.
- **Estado de Conexión**: Sabrás si tus amigos están online en tiempo real (indicador verde).
- **Perfiles**: Al ver a un amigo, puedes ver su nivel de entrenador, medallas obtenidas, clase de jugador y su equipo actual.

---

## 🔄 Intercambios (Trade)

Los intercambios son la base de la colaboración. Permiten enviar Pokémon a otros jugadores, lo cual es requisito para ciertas evoluciones.

### Tipos de Intercambios

1. **Intercambio Directo**: Realizado a través de la lista de amigos.
2. **Ofertas de Intercambio**: Puedes enviar una oferta a un jugador desconectado; este la recibirá al iniciar sesión.
3. **Historial**: Se mantiene un registro de los intercambios realizados para garantizar la seguridad de los Pokémon.

---

## 🏅 Rankings Mundiales (Leaderboards)

Compite por ser el mejor en diferentes categorías. El Top 100 se actualiza en tiempo real.

- **Ranking de ELO**: Basado en el rendimiento en combates PvP clasificatorios.
- **Ranking de Nivel**: Basado en la experiencia total del entrenador.
- **Ranking de Medallas**: Basado en el progreso en los gimnasios de la región.

---

## 🔔 Notificaciones en Tiempo Real

El sistema utiliza **Supabase Realtime** para informarte al instante sobre:

- **Nuevas Solicitudes de Amistad**: Recibe una alerta visual y sonora.
- **Invitaciones a Combate**: Desafíos directos que puedes aceptar o rechazar al momento.
- **Estado de Intercambios**: Notificaciones cuando una oferta es aceptada o cuando un Pokémon ha llegado a tu caja.

---

## 📖 Referencias de Código

- Gestión social: [social.ts](../../src/stores/social.ts)
- Motor de intercambio: [trade.ts](../../src/stores/trade.ts)
- Sistema de Realtime: [supabase.ts](../../src/logic/supabase.ts)
