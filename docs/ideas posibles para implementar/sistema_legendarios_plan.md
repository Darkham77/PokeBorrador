# Plan de Implementación: Sistema de Pokémon Legendarios y Míticos

## 1. Contexto y Propósito

Este documento define la arquitectura y mecánicas para la búsqueda, encuentro y captura de Pokémon Legendarios y Míticos en **Poké Vicio**.

El objetivo es recuperar la emoción y el prestigio de los legendarios originales de la franquicia, evitando que se sientan como premios rutinarios o de fácil acceso. El sistema se divide en dos categorías según su rol en el mundo: **Aves Legendarias Errantes** y **Titanes de Endgame (Mewtwo y Mew)**.

### Principios Fundamentales
* **Dificultad Épica**: La tasa de aparición es inferior a la de un Pokémon Variocolor (más rara que 1/3,000), situándose entre **1/8,000 y 1/10,000**.
* **Capturas Múltiples Permitidas (Sin Límite Artificial)**: Los entrenadores pueden capturar más de un ejemplar a lo largo de su aventura si desean buscar mejores IVs, naturalezas competitivas o comerciarlos con otros jugadores.
* **Vigor Cero (100% Canónico / Incriables)**: Siguiendo fielmente la regla de los juegos originales de Pokémon (Grupo Huevo *"No Descubierto"*), todos los Pokémon Legendarios y Míticos nacen con **`vigor: 0`** permanente; no pueden reproducirse ni poner huevos en la Guardería.
* **Buffs de Cacería Temporales (60 Minutos)**: Los tickets de acceso otorgan un buff activo de 60 minutos que habilita la probabilidad de encuentro en su mapa correspondiente.
* **Economía de Tickets Negociables**: Los pases de acceso se pueden adquirir con monedas del juego (Battle Coins o Monedas de Guerra) y **vender libremente en el Mercado entre jugadores**.
* **Sinergia con el Lore y Radio Kanto**: Las aves sobrevuelan rutas reales de Kanto y la emisora oficial emite boletines periódicos con pistas sobre su posición actual.

---

## 2. Categoría 1: Las Aves Legendarias Errantes (Roaming Birds)

**Articuno, Zapdos y Moltres** no están atrapados en estatuas estáticas; están vivos y sobrevuelan Kanto a lo largo del día.

```text
               [Cronómetro del Servidor (Cada 30-60 min)]
                                   │
                                   ▼
             [Nueva Ruta Seleccionada para cada Ave]
                                   │
                 ┌─────────────────┴─────────────────┐
                 ▼                                   ▼
         [Pista en Radio Kanto]           [Probabilidad Activa]
    ("Plumas doradas sobre Ruta 10")      (1/8,000 solo en esa ruta)
```

### 2.1 Comportamiento y Desplazamiento
* **Ciclo de Vuelo**: Cada **30 a 60 minutos**, cada una de las tres aves cambia a una nueva ruta de forma determinista para todo el servidor.
* **Zonas Predilectas**:
  * **Articuno**: Rutas marítimas y frías (Rutas 19, 20, 21, Islas Espuma).
  * **Zapdos**: Rutas de tormenta y llanura (Rutas 9, 10, Central de Energía).
  * **Moltres**: Rutas montañosas y senderos altos (Ruta 23, Camino de Bicis / Ruta 17, Monte Moon).

### 2.2 Pistas de Rastreo en Radio Kanto
Radio Kanto emite pequeños avisos meteorológicos cuando un ave aterriza o sobrevuela una zona:
* *"📻 ¡Atención entrenadores! El observatorio informa de intensas corrientes gélidas en las inmediaciones de la Ruta 20..."*
* *"📻 ¡Boletín de Radio Kanto! Ráfagas de viento y chispas eléctricas detectadas sobre la Ruta 10..."*

### 2.3 Probabilidad y Combate
* **Tasa de Encuentro**: **1 entre 8,000** combates salvajes **únicamente** si el jugador se encuentra en la misma ruta que el ave. En cualquier otra ruta, la probabilidad es 0.
* **Mecánica de Combate (Fiel al Original)**:
  * El ave tiene una probabilidad del **50% de intentar huir en el primer turno** si no se aplican efectos de estado (Dormido o Congelado), habilidades trampa (Sombratrampa / Trampa Arena) o movimientos de bloqueo (Mal de Ojo / Telaraña).
  * Si el ave escapa o es derrotada por error en combate, **no desaparece del juego**: continúa volando y rotando entre rutas para que el jugador pueda volver a rastrearla.
  * Capturarla no bloquea futuras capturas: el jugador puede seguir cazando en el futuro si busca mejores estadísticas.

---

## 3. Categoría 2: Titanes de Endgame (Mewtwo y Mew)

### 3.1 Mecánica de Tickets como Buffs de Caza (60 Minutos)
Al activar un **Ticket Cueva Celeste** o **Ticket Antiguo** desde la mochila:
* Se añade un buff temporal de **60 minutos** en `useBuffsStore`.
* Aparece un icono de cuenta regresiva en el HUD de buffs del jugador.
* Durante esos 60 minutos, cada combate salvaje en el mapa correspondiente tiene activa la tirada de encuentro legendario (1/10,000). Al terminar el tiempo, la tirada se desactiva hasta consumir otro ticket.

### 3.2 Mewtwo (El Clon Supremo)
* **Ubicación**: El piso más profundo de la **Cueva Celeste (Cerulean Cave)**.
* **Condiciones de Entrada**:
  1. Ser **Campeón de la Liga Pokémon** (haber superado la Meseta Añil).
  2. Poseer el **Buff de Ticket Cueva Celeste (60 min)** activo.
* **Tasa de Aparición**: **1 entre 10,000** combates dentro de la Cueva Celeste.
* **Combate**: Nivel 70 en Showdown, con movimientos poderosos (Psíquico, Recuperación, Onda Certera) y un catch rate extremadamente exigente.

### 3.3 Mew (El Ancestro Genético)
* **Ubicación**: **Isla Lejana (Faraway Island)**, mapa secreto accesible en barco desde el Puerto de Carmín.
* **Condiciones de Entrada**:
  1. Poseer el **Buff de Ticket Antiguo (*Old Sea Map*) (60 min)** activo.
  2. El primer Ticket Antiguo se entrega como **Premio Máximo por completar los 150 Pokémon de la Pokédex de Kanto** (y se puede recomprar después).
* **Tasa de Aparición**: **1 entre 10,000** en la hierba mística de la Isla Lejana.
* **Combate**: Nivel 30/50, con movimientos singulares (Metrónomo, Transformación) y aura esquiva.

---

## 4. Crianza y Genética: Regla del Vigor 0

* **Canon Oficial de Pokémon**: En los juegos oficiales de Game Freak, todos los Pokémon Legendarios y Míticos pertenecen al Grupo Huevo *"No Descubierto"* (*Undiscovered*), siendo biológicamente incapaces de aparearse ni siquiera con Ditto.
* **Implementación en Poké Vicio**:
  * Todo ejemplar de Articuno, Zapdos, Moltres, Mewtwo o Mew capturado se inicializa con **`vigor: 0`** y una bandera `isLegendary: true`.
  * La Guardería Pokémon rechazará emparejar a estos Pokémon con el mensaje: *"No muestran ningún interés el uno por el otro"*.
  * Protege la economía del juego y asegura que cada legendario existente provenga de una captura real y no de granjas de huevos.

---

## 5. Economía y Comercio de Tickets

Para fomentar una economía saludable entre jugadores y evitar callejones sin salida:

```text
[Vías de Obtención de Tickets]
  ├─ Tienda de Battle Coins (BC): Ganadas en Gimnasios y Torre de Batalla
  ├─ Tienda de Monedas de Guerra: Ganadas en la Guerra de Facciones
  └─ Recompensa por Completar Pokédex (150 registrados)
             │
             ▼
      [Tickets Negociables (Buffs de 60 min)]
             │
             ▼
[Mercado Global entre Jugadores (PokéMarket)]
  └─ Los jugadores pueden vender sus tickets a cambio de Pokéyen a otros entrenadores
```

1. **Recompra con Monedas de Juego**:
   * Los tickets no son de pago real. Se pueden volver a comprar ilimitadamente en:
     * **Tienda de Battle Coins (BC Shop)**: Jugando combates competitivos y revanchas de gimnasios.
     * **Tienda de Guerra (War Shop)**: Participando en la dominancia de rutas semanal con tu facción.
2. **Negociabilidad en el Mercado**:
   * Los tickets son ítems comerciables (`tradable = true`).
   * Un jugador que no desee cazar en ese momento puede vender sus tickets en el **PokéMarket** para obtener grandes sumas de Pokéyen de otros jugadores interesados en la cacería.

---

## 6. Notificación Global de Captura

Toda captura exitosa de Articuno, Zapdos, Moltres, Mewtwo o Mew se considera un **Acontecimiento Histórico**:
* Interrumpe temporalmente la programación de **Radio Kanto**.
* Emite un aviso en tiempo real a todo el servidor vía Supabase Broadcast:
  * *"🏆 ¡HISTORIA EN KANTO! El entrenador [Nombre] (Team Unión) ha desafiado a la leyenda y capturado a [Mewtwo] en la Cueva Celeste. ¡Un hito legendario!"*

---

## 7. Arquitectura Técnica y Módulos

```text
src/
├── logic/encounters/
│   ├── roamingLegendaries.ts      # Cálculo horario de rutas de Articuno, Zapdos y Moltres
│   └── legendaryEncounterCheck.ts # Verificación de ticket activo y ratio 1/8000 o 1/10000
├── logic/items/
│   └── itemEffects.ts             # ticket_cerulean y ticket_old_sea_map añaden buff de 3600s
├── data/inventory/
│   └── items.json                 # Definición de tickets (tradable: true, duration: 3600)
├── logic/pokemon/
│   └── pokemonFactory.ts          # Asignación forzada de vigor: 0 para legendarios
└── stores/
    └── marketStore.ts             # Soporte para compra/venta de tickets en el mercado de jugadores
```

---

## 8. Registro de Decisiones (Decision Log)

| ID | Tema | Decisión | Alternativas Descartadas | Razón |
| :--- | :--- | :--- | :--- | :--- |
| **ADR-LEG-01** | Aves Legendarias | Errantes rotando cada 30-60 min con pistas en Radio Kanto. | Encuentros estáticos en el fondo de una mazmorra. | Dinamismo, fidelidad al lore de roaming Pokémon y emoción comunitaria. |
| **ADR-LEG-02** | Tasa de Aparición | 1/8,000 a 1/10,000 (más difícil que un Shiny). | Ratios comunes de 1% o 5%. | Preservar el misticismo, prestigio y rareza de un Pokémon Legendario. |
| **ADR-LEG-03** | Límite de Capturas | Capturas múltiples permitidas (búsqueda de mejores IVs/Naturaleza). | Límite forzoso de 1 ejemplar de por vida. | Permite optimización competitiva de IVs y comercio entre jugadores. |
| **ADR-LEG-04** | Vigor y Crianza | Vigor 0 permanente (incapaces de reproducirse en guardería). | Permitir cría con Ditto. | 100% fiel al canon oficial (Grupo Huevo "No Descubierto") y protege la economía del juego. |
| **ADR-LEG-05** | Formato del Ticket | Buff temporal de cacería activa de 60 minutos. | Entrada de un solo combate o duración de 5 minutos. | Da un tiempo de sesión de juego sólido (1 hora) y justo para farmear. |
| **ADR-LEG-06** | Comercio de Tickets | Tickets de acceso recomprables con monedas de juego y vendibles en el mercado. | Tickets intransferibles o exclusivos de un solo uso de por vida. | Estimula el mercado entre jugadores y da valor a las recompensas de guerra y gimnasios. |
