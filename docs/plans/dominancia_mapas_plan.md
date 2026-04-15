# Plan de Implementación: Sistema de Dominancia de Mapas

## Contexto del sistema

Poké Vicio es un juego clicker donde el jugador hace click en un mapa → se genera un evento
(Pokémon salvaje, entrenador, pesca, rival, etc.) → el jugador resuelve el combate.

El sistema de dominancia se **engancha en ese loop existente sin modificarlo**. No hay movimiento
libre, no hay puntos físicos que defender. Todo gira alrededor del resultado de los eventos
que ya existen.

---

## Concepto resumido

- Dos bandos permanentes elegibles al crear personaje: **Team Unión** (blanco) y **Team Poder** (negro)
- Ciclo semanal: Lunes–Viernes = Disputa de PT (Puntos de Territorio). Sábado–Domingo = Dominancia
- Cada evento resuelto en un mapa en disputa suma PT al bando del jugador
- El bando con más PT al cierre del viernes domina el mapa el fin de semana
- El mapa dominado otorga bonos temáticos (Shiny +30%, EXP+30%, Mejores IVs 30% chance, etc.) solo al bando ganador
- Una vez por día aparece el **Guardián del Territorio** al clickear un mapa: un Pokémon especial
  que solo puede capturar el primer jugador en lograrlo (validado contra Supabase)
- Los jugadores acumulan **Monedas de Guerra** canjeables en una tienda exclusiva

---

## Arquitectura general

```
Supabase (tablas nuevas)
  ├── war_factions         → bando de cada jugador
  ├── war_points           → PT acumulados por bando por mapa por semana
  ├── war_dominance        → qué bando dominó cada mapa en la semana actual
  └── guardian_captures    → registro del Guardián capturado hoy por mapa

JS nuevo
  └── src/legacy/js/21_dominance.js   → toda la lógica del sistema

Archivos modificados
  ├── src/legacy/js/06_encounters.js  → hook en goLocation() y en resolución de encuentros
  ├── src/legacy/js/01_auth.js        → guardar/cargar bando del jugador, monedas de guerra
  ├── src/legacy/js/04_state.js       → agregar campos al estado (bando, monedas de guerra)
  ├── index.html           → nuevas secciones de UI (panel de guerra, tienda, selector de bando)
  └── style.css            → estilos del sistema
```

---

## Paso 1 — Crear las tablas en Supabase

Ejecutar en el SQL Editor de Supabase:

```sql
-- Bando de cada jugador
CREATE TABLE war_factions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  faction TEXT NOT NULL CHECK (faction IN ('union', 'poder')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Puntos de territorio acumulados por semana
-- week_id = string tipo "2026-W14" (año-semana ISO)
CREATE TABLE war_points (
  id BIGSERIAL PRIMARY KEY,
  week_id TEXT NOT NULL,
  map_id TEXT NOT NULL,
  faction TEXT NOT NULL CHECK (faction IN ('union', 'poder')),
  points INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (week_id, map_id, faction)
);

-- Resultado de dominancia por semana
CREATE TABLE war_dominance (
  week_id TEXT NOT NULL,
  map_id TEXT NOT NULL,
  winner_faction TEXT NOT NULL CHECK (winner_faction IN ('union', 'poder')),
  union_points INTEGER DEFAULT 0,
  poder_points INTEGER DEFAULT 0,
  resolved_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (week_id, map_id)
);

-- Registro del Guardián capturado hoy por jugador
-- Cada jugador puede capturar al Guardián de un mapa una vez al día
CREATE TABLE guardian_captures (
  capture_date DATE NOT NULL,
  map_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  winner_faction TEXT NOT NULL,
  pts_awarded INTEGER NOT NULL DEFAULT 150,
  captured_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (capture_date, map_id, user_id)
);

-- Monedas de guerra acumuladas históricamente
CREATE TABLE war_coins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE war_factions ENABLE ROW LEVEL SECURITY;
ALTER TABLE war_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE war_dominance ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE war_coins ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura abierta (todos pueden leer el estado de guerra)
CREATE POLICY "Lectura pública" ON war_factions FOR SELECT USING (true);
CREATE POLICY "Lectura pública" ON war_points FOR SELECT USING (true);
CREATE POLICY "Lectura pública" ON war_dominance FOR SELECT USING (true);
CREATE POLICY "Lectura pública" ON guardian_captures FOR SELECT USING (true);

-- Políticas de escritura autenticada
CREATE POLICY "Insert propio" ON war_factions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update propio" ON war_factions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Upsert autenticado" ON war_points FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Update autenticado" ON war_points FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Insert autenticado" ON guardian_captures FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Lectura propia monedas" ON war_coins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Upsert propio monedas" ON war_coins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update propio monedas" ON war_coins FOR UPDATE USING (auth.uid() = user_id);
```

---

## Paso 2 — Agregar campos al estado del juego

**Archivo:** `src/legacy/js/04_state.js`

Dentro del objeto `DEFAULT_STATE` (o donde se define el estado inicial), agregar:

```js
faction: null,          // 'union' | 'poder' | null (no elegido)
warCoins: 0,            // monedas de guerra acumuladas
warCoinsSpent: 0,       // para calcular saldo disponible
warDailyCap: {},        // tope diario por mapa
lastResolvedWeek: null, // última semana procesada
activeBonuses: {},      // bonos de dominancia activos
```

Estos campos deben incluirse también en las funciones `serializeState()` y `deserializeState()`
en `src/legacy/js/01_auth.js` para que se guarden y carguen correctamente con el guardado existente.

---

## Paso 3 — Crear `src/legacy/js/21_dominance.js`

Este archivo contiene toda la lógica del sistema. Crearlo desde cero con las siguientes funciones:

### 3.1 Utilidades de semana

```js
// Devuelve el ID de semana actual tipo "2026-W14"
function getCurrentWeekId() {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const week = Math.ceil(((now - jan4) / 86400000 + jan4.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

// Devuelve true si estamos en Fase de Disputa (lunes=1 a viernes=5)
// Devuelve false si estamos en Fase de Dominancia (sábado=6 o domingo=0)
function isDisputePhase() {
  const day = new Date().getDay();
  return day >= 1 && day <= 5;
}
```

### 3.2 Elegir bando (se llama la primera vez que el jugador juega)

```js
async function chooseFaction(faction) {
  // faction: 'union' | 'poder'
  const userId = window.currentUser?.id;
  const email = window.currentUser?.email;
  const { error } = await window.sb
    .from('war_factions')
    .insert({ user_id: userId, email, faction });
  if (!error) {
    state.faction = faction;
    scheduleSave(); // función de guardado existente en 01_auth.js
    renderFactionUI();
  }
}

async function loadPlayerFaction() {
  const userId = window.currentUser?.id;
  if (!userId) return;
  const { data } = await window.sb
    .from('war_factions')
    .select('faction')
    .eq('user_id', userId)
    .single();
  if (data) state.faction = data.faction;
}
```

### 3.3 Sumar Puntos de Territorio

Esta función se llama al resolver cualquier evento en un mapa.

```js
// eventType: 'capture' | 'trainer_win' | 'wild_win' | 'fishing' | 'shiny_capture' | 'event'
// success: boolean
async function addWarPoints(mapId, eventType, success) {
  if (!state.faction) return;
  if (!isDisputePhase()) return; // no suma puntos durante dominancia

  // Tabla de puntos según tipo de evento
  const PTS_TABLE = {
    capture:        { win: 5,  lose: 1 },
    trainer_win:    { win: 8,  lose: 2 },
    wild_win:       { win: 2,  lose: 0 },
    fishing:        { win: 4,  lose: 1 },
    shiny_capture:  { win: 40, lose: 10 },
    event:          { win: 20, lose: 5 },
  };

  const pts = (PTS_TABLE[eventType] || { win: 2, lose: 0 })[success ? 'win' : 'lose'];
  if (pts === 0) return;

  const weekId = getCurrentWeekId();

  // Verificar tope diario (300 PT por jugador por mapa por día)
  // Esto requiere un contador local en estado que se resetea a medianoche
  if (!checkDailyCapNotReached(mapId, pts)) return;

  // Upsert de puntos del bando en Supabase
  await window.sb.rpc('add_war_points', {
    p_week_id: weekId,
    p_map_id: mapId,
    p_faction: state.faction,
    p_points: pts
  });

  // Sumar monedas de guerra al jugador (proporional, 1 moneda cada 10 PT)
  addWarCoinsLocal(Math.floor(pts / 10));

  // Actualizar UI del mapa
  updateMapDominanceUI(mapId);
}
```

**Nota:** Crear la función SQL `add_war_points` en Supabase para el upsert atómico:

```sql
CREATE OR REPLACE FUNCTION add_war_points(
  p_week_id TEXT, p_map_id TEXT, p_faction TEXT, p_points INTEGER
)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO war_points (week_id, map_id, faction, points)
  VALUES (p_week_id, p_map_id, p_faction, p_points)
  ON CONFLICT (week_id, map_id, faction)
  DO UPDATE SET points = war_points.points + p_points, updated_at = NOW();
END;
$$;
```

### 3.4 Tope diario de PT por jugador

```js
// En el estado local (no en Supabase), guardar cuántos PT aportó el jugador hoy por mapa
function checkDailyCapNotReached(mapId, pts) {
  const today = new Date().toDateString();
  if (!state.warDailyCap) state.warDailyCap = {};
  if (!state.warDailyCap[today]) state.warDailyCap = { [today]: {} }; // reset diario
  if (!state.warDailyCap[today][mapId]) state.warDailyCap[today][mapId] = 0;

  if (state.warDailyCap[today][mapId] >= 300) return false;
  state.warDailyCap[today][mapId] += pts;
  return true;
}
```

### 3.5 Leer estado de dominancia de un mapa

```js
async function getMapDominanceStatus(mapId) {
  const weekId = getCurrentWeekId();

  // Leer puntos actuales de la semana
  const { data: points } = await supabase
    .from('war_points')
    .select('faction, points')
    .eq('week_id', weekId)
    .eq('map_id', mapId);

  const union = points?.find(p => p.faction === 'union')?.points || 0;
  const poder = points?.find(p => p.faction === 'poder')?.points || 0;
  const total = union + poder;
  const leading = total === 0 ? null : (union >= poder ? 'union' : 'poder');

  // Si estamos en Fase de Dominancia, leer el resultado del fin de semana
  if (!isDisputePhase()) {
    const { data: dom } = await supabase
      .from('war_dominance')
      .select('winner_faction')
      .eq('week_id', weekId)
      .eq('map_id', mapId)
      .single();
    return { phase: 'dominance', winner: dom?.winner_faction || null, union, poder };
  }

  return { phase: 'dispute', leading, valor, mystic };
}
```

### 3.6 Resolver dominancia al cierre del viernes

Esta función corre en el cliente cuando se detecta que cambió de semana (comparando el weekId
guardado en el estado local con el weekId actual). No requiere un servidor dedicado.

```js
async function resolveWeekIfNeeded() {
  const currentWeekId = getCurrentWeekId();
  if (state.lastResolvedWeek === currentWeekId) return; // ya resuelto

  // Solo corre si estamos en Sábado o Domingo (fase de dominancia)
  if (isDisputePhase()) return;

  // Leer todos los puntos de la semana anterior
  const prevWeekId = getPreviousWeekId(); 
  const { data: allPoints } = await supabase
    .from('war_points')
    .select('map_id, faction, points')
    .eq('week_id', prevWeekId);

  if (!allPoints || allPoints.length === 0) return;

  // Agrupar por mapa y determinar ganador
  const mapResults = {};
  allPoints.forEach(row => {
    if (!mapResults[row.map_id]) mapResults[row.map_id] = { union: 0, poder: 0 };
    mapResults[row.map_id][row.faction] += row.points;
  });

  // Insertar resultados en war_dominance
  for (const [mapId, pts] of Object.entries(mapResults)) {
    const winner = pts.union >= pts.poder ? 'union' : 'poder';
    await supabase.from('war_dominance').upsert({
      week_id: prevWeekId,
      map_id: mapId,
      winner_faction: winner,
      union_points: pts.union,
      poder_points: pts.poder
    });
  }

  // Otorgar Monedas de Guerra al jugador según su contribución de la semana pasada
  await distributeWeeklyWarCoins(prevWeekId);

  state.lastResolvedWeek = currentWeekId;
  scheduleSave();
}
```

### 3.7 Distribuir Monedas de Guerra semanales

```js
async function distributeWeeklyWarCoins(weekId) {
  const email = window.currentUser?.email;
  if (!email || !state.faction) return;

  // Sumar todos los PT que aportó este jugador en la semana
  // (se calcula desde warDailyCap acumulado o desde una consulta a Supabase)
  // Por simplicidad, leer de Supabase cuánto aportó el bando y escalar
  // Usar la tabla war_points para obtener el total del bando e inferir participación

  // Tabla de recompensas por PT aportados (estimado local via warDailyCap)
  const totalPtContributed = calculateTotalPtThisWeek(); // desde warDailyCap

  let coins = 0;
  if (totalPtContributed >= 1501) coins = 150;
  else if (totalPtContributed >= 501) coins = 75;
  else if (totalPtContributed >= 101) coins = 35;
  else if (totalPtContributed >= 1) coins = 10;

  // Bonus si el bando ganó la mayoría de mapas
  const didFactionWin = await checkFactionWeeklyWin(weekId);
  if (didFactionWin) coins += 50;

  state.warCoins += coins;
  scheduleSave();
  if (coins > 0) showWarCoinsNotification(coins);
}
```

### 3.8 El Guardián del Territorio

```js
// Configuración de Guardianes: Pool extenso por rareza
const GUARDIAN_POOL = {
  common: [
    { id: 'arcanine',   lv: 45, pts: 150 }, { id: 'pidgeot',    lv: 42, pts: 150 },
    { id: 'nidoking',   lv: 44, pts: 150 }, { id: 'nidoqueen',  lv: 44, pts: 150 },
    { id: 'victreebel', lv: 43, pts: 150 }, { id: 'vileplume',  lv: 43, pts: 150 },
    { id: 'sandslash',  lv: 41, pts: 150 }, { id: 'fearow',     lv: 42, pts: 150 },
    { id: 'golem',      lv: 45, pts: 150 }, { id: 'raichu',     lv: 45, pts: 150 },
    { id: 'weezing',    lv: 40, pts: 150 }, { id: 'muk',        lv: 40, pts: 150 },
    { id: 'starmie',    lv: 44, pts: 150 }, { id: 'rapidash',   lv: 44, pts: 150 },
    { id: 'hypno',      lv: 42, pts: 150 }
  ],
  rare: [
    { id: 'gyarados',   lv: 50, pts: 300 }, { id: 'alakazam',   lv: 48, pts: 300 },
    { id: 'machamp',    lv: 48, pts: 300 }, { id: 'gengar',     lv: 48, pts: 300 },
    { id: 'exeggutor',  lv: 46, pts: 300 }, { id: 'pinsir',     lv: 47, pts: 300 },
    { id: 'scyther',    lv: 47, pts: 300 }, { id: 'kangaskhan', lv: 45, pts: 300 },
    { id: 'tauros',     lv: 45, pts: 300 }, { id: 'scyther',    lv: 46, pts: 300 },
    { id: 'slowbro',    lv: 46, pts: 300 }, { id: 'jolteon',    lv: 48, pts: 300 },
    { id: 'vaporeon',   lv: 48, pts: 300 }, { id: 'flareon',    lv: 48, pts: 300 }
  ],
  elite: [
    { id: 'dragonite',  lv: 60, pts: 750 }, { id: 'snorlax',    lv: 55, pts: 750 },
    { id: 'lapras',     lv: 55, pts: 750 }, { id: 'chansey',    lv: 50, pts: 750 },
    { id: 'aerodactyl', lv: 58, pts: 750 }, { id: 'cloyster',   lv: 52, pts: 750 }
  ]
};

// Función para verificar si un mapa es Zona de Conflicto hoy
function isConflictZone(mapId) {
  const dateStr = new Date().toISOString().split('T')[0];
  const allMapIds = FIRE_RED_MAPS.map(m => m.id);
  // Elegir 12 mapas de forma determinística
  const zones = [];
  let tempSeed = hashString(dateStr + "zones");
  while (zones.length < 12) {
    const idx = tempSeed % allMapIds.length;
    const mId = allMapIds[idx];
    if (!zones.includes(mId)) zones.push(mId);
    tempSeed = hashString(tempSeed.toString());
  }
  return zones.includes(mapId);
}

// Función para obtener el guardián del día de un mapa
function getGuardianForMap(mapId) {
  if (!isConflictZone(mapId)) return null;

  const dateStr = new Date().toISOString().split('T')[0];
  const seed = hashString(dateStr + mapId);
  
  const rarityRand = (seed % 100);
  let tier = 'common';
  if (rarityRand >= 90) tier = 'elite';
  else if (rarityRand >= 60) tier = 'rare';

  const pool = GUARDIAN_POOL[tier];
  const index = seed % pool.length;
  return pool[index];
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convertir a 32bit int
  }
  return Math.abs(hash);
}

// Probabilidad de que aparezca el Guardián al clickear (solo si no fue capturado hoy)
const GUARDIAN_CHANCE = 0.03; // 3%

async function checkGuardianAppearance(mapId) {
  if (!state.faction) return false;
  if (!GUARDIANS[mapId]) return false;

  // ¿Ya fue capturado hoy en este mapa?
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('guardian_captures')
    .select('winner_email')
    .eq('capture_date', today)
    .eq('map_id', mapId)
    .single();

  if (data) return false; // ya capturado hoy

  // RNG
  return Math.random() < GUARDIAN_CHANCE;
}

// Llamar a esta función ANTES de triggerear el encuentro normal en goLocation()
// Si retorna true, lanzar el encuentro con el Guardián en vez del normal
async function tryTriggerGuardian(mapId) {
  const appears = await checkGuardianAppearance(mapId);
  if (!appears) return false;

  const guardianData = GUARDIANS[mapId];
  showGuardianAnnouncement(guardianData); // mostrar banner especial antes del combate
  return guardianData;
}

// Al capturar exitosamente al Guardián (dentro del flujo de combate normal)
async function claimGuardianCapture(mapId, pokemon) {
  const userId = window.currentUser?.id;
  const today = new Date().toISOString().split('T')[0];

  const { error } = await window.sb
    .from('guardian_captures')
    .insert({
      capture_date: today,
      map_id: mapId,
      winner_id: userId,
      winner_faction: state.faction,
      pts_awarded: 150
    });

  if (error) {
    // Error de red o base de datos
    console.error("Error al registrar captura de Guardián:", error);
    return false;
  }

  // Éxito — marcar el Pokémon con flag de guardián
  pokemon.isGuardian = true;
  pokemon.guardianFaction = state.faction;
  
  const guardianData = getGuardianForMap(mapId);
  const ptsAwarded = guardianData?.pts || 150;

  await addWarPoints(mapId, 'event', true); 
  // Los PT del Guardián (según su rareza) se suman directo al bando en Supabase
  await window.sb.rpc('add_war_points', {
    p_week_id: getCurrentWeekId(),
    p_map_id: mapId,
    p_faction: state.faction,
    p_points: ptsAwarded
  });
  showGuardianCaptureSuccess(pokemon);
  return true;
}
```

### 3.9 Bonos activos de dominancia

```js
// Llamar al cargar el juego y al inicio de cada semana
async function loadActiveBonuses() {
  if (isDisputePhase()) { state.activeBonuses = {}; return; }
  if (!state.faction) return;

  const weekId = getCurrentWeekId();
  const { data } = await supabase
    .from('war_dominance')
    .select('map_id, winner_faction')
    .eq('week_id', weekId);

  state.activeBonuses = {};
  data?.forEach(row => {
    if (row.winner_faction === state.faction) {
      state.activeBonuses[row.map_id] = true;
    }
  });
}

// Retorna true si el jugador tiene bono activo en este mapa
function hasDominanceBonus(mapId) {
  return !!state.activeBonuses?.[mapId];
}

// Retorna el multiplicador de shiny para el mapa actual
function getShinyMultiplier(mapId) {
  return hasDominanceBonus(mapId) ? 2 : 1;
}

// Retorna el multiplicador de EXP para el mapa actual
function getExpMultiplier(mapId) {
  const base = hasDominanceBonus(mapId) ? 1.25 : 1;
  // Apilarlo con el multiplicador de eventos existente (doble EXP weekend, etc.)
  return base * (state.activeEventExpMult || 1);
}
```

---

## Paso 4 — Modificar `src/legacy/js/06_encounters.js`

### 4.1 Hook en `goLocation(locId)`

Al inicio de la función `goLocation`, antes de calcular el encuentro, agregar:

```js
async function goLocation(locId) {
  // ... validaciones existentes (hp, badges, etc.) ...

  // NUEVO: verificar si aparece el Guardián
  if (guardian) {
    const enemy = makePokemon(guardian.id, guardian.lv);
    startBattle(enemy, false, null, locId, false, [enemy], null, { isGuardian: true });
    return;
  }

  // ... resto del código existente de goLocation ...
}
```

### 4.2 Hook en la resolución de eventos

Al final de cada tipo de encuentro (cuando se determina si ganó, capturó, etc.),
agregar una llamada a `addWarPoints()`:

**Captura exitosa:**
```js
// Dentro de la función que maneja la captura exitosa de un Pokémon salvaje
// (buscar donde se llama captureWild() o equivalente)
const isShiny = capturedPokemon.shiny;
await addWarPoints(currentMapId, isShiny ? 'shiny_capture' : 'capture', true);
```

**Captura fallida (Pokémon se escapa):**
```js
await addWarPoints(currentMapId, 'capture', false);
```

**Victoria contra entrenador NPC:**
```js
await addWarPoints(currentMapId, 'trainer_win', true);
```

**Derrota contra entrenador NPC:**
```js
await addWarPoints(currentMapId, 'trainer_win', false);
```

**Pesca exitosa:**
```js
await addWarPoints(currentMapId, 'fishing', true);
```

### 4.3 Hook en el multiplicador de Shiny

Buscar donde se calcula `Math.random() < shinyChance` (en el archivo de encounters o en
`02_pokemon_data.js`) y multiplicar la chance base por `getShinyMultiplier(currentMapId)`:

```js
const shinyChance = BASE_SHINY_CHANCE * getShinyMultiplier(currentMapId);
const isShiny = Math.random() < shinyChance;
```

### 4.4 Hook en el multiplicador de EXP

Buscar donde se calcula la EXP ganada al final de un combate y multiplicar:

```js
const expGained = Math.floor(baseExp * getExpMultiplier(currentMapId));
```

### 4.5 Hook en el combate del Guardián (captura)

Dentro del flujo de combate (`src/legacy/js/07_battle.js`), donde se confirma que una captura
fue exitosa, verificar si era el Guardián y desviar a `claimGuardianCapture()`:

```js
// Al final de la lógica de captura exitosa
if (battleState.isGuardian) {
  const claimed = await claimGuardianCapture(battleState.mapId, capturedPokemon);
  if (!claimed) {
    // No agregar al equipo/box — fue capturado por otro
    return;
  }
}
// ... agregar al equipo/box normalmente ...
```

---

## Paso 5 — Modificar `src/legacy/js/01_auth.js`

### 5.1 Incluir nuevos campos en `serializeState()`

```js
function serializeState() {
  return {
    // ... campos existentes ...
    faction: state.faction,
    warCoins: state.warCoins,
    warCoinsSpent: state.warCoinsSpent,
    warDailyCap: state.warDailyCap,
    lastResolvedWeek: state.lastResolvedWeek,
    activeBonuses: state.activeBonuses,
  };
}
```

### 5.2 Incluir en `deserializeState(save)`

```js
function deserializeState(save) {
  // ... campos existentes ...
  state.faction = save.faction || null;
  state.warCoins = save.warCoins || 0;
  state.warCoinsSpent = save.warCoinsSpent || 0;
  state.warDailyCap = save.warDailyCap || {};
  state.lastResolvedWeek = save.lastResolvedWeek || null;
  state.activeBonuses = save.activeBonuses || {};
}
```

### 5.3 Al cargar el juego (después del login exitoso)

```js
// Agregar después de deserializar el estado:
await loadPlayerFaction();
await loadActiveBonuses();
await resolveWeekIfNeeded();
```

---

## Paso 6 — UI: Selector de Bando

Mostrar esta pantalla la primera vez que el jugador entra al juego y `state.faction === null`.
Puede ser un modal o una pantalla de onboarding que aparece después del login.

**En `index.html`**, agregar:

```html
<!-- Modal de elección de bando (oculto por defecto) -->
<div id="faction-modal" class="modal-overlay" style="display:none;">
  <div class="modal-box faction-modal-box">
    <h2 class="pixel-title">¡Elige tu Bando!</h2>
    <p>Esta decisión es permanente. Tu bando determina con quién disputás el control de Kanto.</p>
    <div class="faction-choice-row">
      <button class="btn-faction union" onclick="chooseFaction('union')">
        <span class="faction-icon">🟢</span>
        <span class="faction-name">Team Unión</span>
        <span class="faction-desc">Amistad. Armonía. Compañerismo.</span>
      </button>
      <button class="btn-faction poder" onclick="chooseFaction('poder')">
        <span class="faction-icon">🟣</span>
        <span class="faction-name">Team Poder</span>
        <span class="faction-desc">Poder. Herramientas. Eficiencia.</span>
      </button>
    </div>
  </div>
</div>
```

**En `src/legacy/js/21_dominance.js`**, agregar:

```js
function renderFactionModal() {
  if (state.faction) return; // ya eligió
  document.getElementById('faction-modal').style.display = 'flex';
}

function renderFactionUI() {
  document.getElementById('faction-modal').style.display = 'none';
  // Actualizar badge de bando en el perfil del jugador
  const badge = document.getElementById('player-faction-badge');
  if (badge) {
    badge.textContent = state.faction === 'union' ? '⚪ Unión' : '⚫ Poder';
    badge.className = `faction-badge ${state.faction}`;
  }
}
```

---

## Paso 7 — UI: Indicador de Dominancia en Mapas

**En `src/legacy/js/05_render.js`** (o donde se renderizan las Location Cards), agregar
un indicador visual sobre cada mapa.

Al renderizar cada mapa (`renderMaps()` o equivalente), agregar:

```js
// Al construir cada location card
const domStatus = await getMapDominanceStatus(locId);

let domBadge = '';
if (domStatus.phase === 'dispute') {
  const leadColor = domStatus.leading === 'union' ? '#44ff44' : 
                    domStatus.leading === 'poder' ? '#ff44ff' : '#888';
  domBadge = `<div class="dom-badge dispute" style="border-color:${leadColor}">
    ⚔️ En disputa
  </div>`;
} else if (domStatus.phase === 'dominance' && domStatus.winner) {
  const isMyFaction = domStatus.winner === state.faction;
  domBadge = `<div class="dom-badge dominance ${isMyFaction ? 'winning' : 'losing'}">
    ${domStatus.winner === 'union' ? '🟢' : '🟣'} Dominado
    ${isMyFaction ? '<span class="bonus-icon">✨ Bonos activos</span>' : ''}
  </div>`;
}

// Insertar domBadge en el HTML de la card del mapa
```

---

## Paso 8 — UI: Panel de Guerra

Agregar una nueva pestaña en el menú principal (al lado de Pokémon, Mochila, etc.).

**En `index.html`**, agregar el tab y el contenido:

```html
<!-- Tab nuevo -->
<button class="tab-btn" onclick="showTab('war')">⚔️ Guerra</button>

<!-- Contenido del Panel de Guerra -->
<div id="tab-war" class="tab-content" style="display:none;">
  <h2 class="pixel-title">Panel de Guerra</h2>
  
  <!-- Estado de la semana -->
  <div id="war-phase-banner"></div>
  
  <!-- Mapa de Kanto con colores -->
  <div id="war-kanto-map">
    <!-- Grid de mapas con color según dominancia -->
    <!-- Generado por renderWarPanel() -->
  </div>
  
  <!-- Contador de mapas dominados -->
  <div id="war-score">
    <span class="union-score">⚪ Unión: <span id="union-maps">0</span> mapas</span>
    <span class="poder-score">⚫ Poder: <span id="poder-maps">0</span> mapas</span>
  </div>

  <!-- Próximo Guardián -->
  <div id="next-guardian-info"></div>

  <!-- Mis monedas de guerra -->
  <div id="war-coins-display">
    🪙 Monedas de Guerra: <span id="war-coins-count">0</span>
    <button onclick="showWarShop()">🛒 Tienda de Guerra</button>
  </div>

  <!-- Top contribuidores de mi bando esta semana -->
  <div id="war-top-contributors"></div>
</div>
```

**En `src/legacy/js/21_dominance.js`**, agregar `renderWarPanel()`:

```js
async function renderWarPanel() {
  await resolveWeekIfNeeded();
  const weekId = getCurrentWeekId();
  const phase = isDisputePhase() ? 'Disputa' : 'Dominancia';

  // Banner de fase
  document.getElementById('war-phase-banner').innerHTML = 
    `<div class="phase-banner ${isDisputePhase() ? 'dispute' : 'dominance'}">
      ${isDisputePhase() ? '⚔️ Semana en Disputa — Lun a Vie' : '🏆 Fin de Semana de Dominancia'}
    </div>`;

  // Contar mapas dominados por cada bando
  const { data: domData } = await supabase
    .from('war_dominance')
    .select('map_id, winner_faction')
    .eq('week_id', weekId);

  let unionMaps = 0, poderMaps = 0;
  domData?.forEach(r => {
    if (r.winner_faction === 'union') unionMaps++;
    else poderMaps++;
  });

  document.getElementById('union-maps').textContent = unionMaps;
  document.getElementById('poder-maps').textContent = poderMaps;
  document.getElementById('war-coins-count').textContent = 
    state.warCoins - (state.warCoinsSpent || 0);

  // Renderizar grid de Kanto
  renderKantoWarGrid(domData || []);
}
```

---

## Paso 9 — UI: Tienda de Guerra

**En `index.html`**, agregar modal de tienda:

```html
<div id="war-shop-modal" class="modal-overlay" style="display:none;">
  <div class="modal-box">
    <h2 class="pixel-title">🛒 Tienda de Guerra</h2>
    <p>🪙 Saldo: <span id="war-shop-coins">0</span> monedas</p>
    <div id="war-shop-items">
      <!-- Generado por renderWarShop() -->
    </div>
    <button onclick="closeWarShop()">Cerrar</button>
  </div>
</div>
```

**En `src/legacy/js/21_dominance.js`**, definir el catálogo y renderizarlo:

```js
const WAR_SHOP_ITEMS = [
  {
    id: 'shiny_stone',
    name: 'Piedra Brillante',
    desc: 'Triplica la probabilidad shiny de un huevo',
    cost: 300,
    icon: '💎'
  },
  {
    id: 'tm_rare_1',
    name: 'MT99 — Llamarada',
    desc: 'Movimiento de fuego exclusivo de la tienda de guerra',
    cost: 200,
    icon: '🔥'
  },
  {
    id: 'cosmetic_frame_union',
    name: 'Marco Unión',
    desc: 'Decoración de perfil exclusiva para miembros de Team Unión',
    cost: 100,
    icon: '🟢',
    factionRequired: 'union'
  },
  {
    id: 'cosmetic_frame_poder',
    name: 'Marco Poder',
    desc: 'Decoración de perfil exclusiva para miembros de Team Poder',
    cost: 100,
    icon: '🟣',
    factionRequired: 'poder'
  },
  {
    id: 'title_conquistador',
    name: 'Título: Conquistador de Kanto',
    desc: 'Visible en tu perfil público',
    cost: 500,
    icon: '🏆'
  },
];

function renderWarShop() {
  const balance = state.warCoins - (state.warCoinsSpent || 0);
  document.getElementById('war-shop-coins').textContent = balance;

  const container = document.getElementById('war-shop-items');
  container.innerHTML = WAR_SHOP_ITEMS
    .filter(item => !item.factionRequired || item.factionRequired === state.faction)
    .map(item => `
      <div class="shop-item ${balance < item.cost ? 'disabled' : ''}">
        <span class="item-icon">${item.icon}</span>
        <div class="item-info">
          <strong>${item.name}</strong>
          <p>${item.desc}</p>
        </div>
        <button onclick="buyWarItem('${item.id}')" 
                ${balance < item.cost ? 'disabled' : ''}>
          🪙 ${item.cost}
        </button>
      </div>
    `).join('');
}

async function buyWarItem(itemId) {
  const item = WAR_SHOP_ITEMS.find(i => i.id === itemId);
  const balance = state.warCoins - (state.warCoinsSpent || 0);
  if (!item || balance < item.cost) return;

  // Aplicar efecto del ítem
  applyWarShopItem(item);
  
  state.warCoinsSpent = (state.warCoinsSpent || 0) + item.cost;
  scheduleSave();
  renderWarShop();
}

function applyWarShopItem(item) {
  switch (item.id) {
    case 'shiny_stone':
      // Agregar al inventario existente
      addToInventory('shiny_stone', 1);
      break;
    case 'tm_rare_1':
      addToInventory('tm_llamarada', 1);
      break;
    case 'cosmetic_frame_union':
    case 'cosmetic_frame_poder':
      state.profileFrame = item.id;
      break;
    case 'title_conquistador':
      state.title = 'Conquistador de Kanto';
      break;
  }
}
```

---

## Paso 10 — CSS en `style.css`

Agregar al final del archivo los estilos necesarios:

```css
/* ===== SISTEMA DE DOMINANCIA ===== */

.faction-modal-box {
  max-width: 500px;
  text-align: center;
}

.faction-choice-row {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 20px;
}

.btn-faction {
  flex: 1;
  padding: 20px;
  border-radius: 12px;
  border: 3px solid transparent;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: transform 0.2s, border-color 0.2s;
}

.btn-faction.union { background: #002a00; border-color: #44ff44; }
.btn-faction.poder { background: #2a002a; border-color: #ff44ff; }
.btn-faction:hover { transform: scale(1.05); }

.faction-icon { font-size: 2rem; }
.faction-name { font-family: 'Press Start 2P', monospace; font-size: 0.7rem; }
.faction-desc { font-size: 0.6rem; color: #aaa; }

/* Badge de dominancia en mapas */
.dom-badge {
  font-size: 0.55rem;
  padding: 3px 7px;
  border-radius: 8px;
  border: 1px solid;
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.dom-badge.dispute { border-color: #888; color: #ccc; background: #1a1a1a; }
.dom-badge.dominance.winning { border-color: gold; color: gold; background: #1a1500; }
.dom-badge.dominance.losing { border-color: #555; color: #888; background: #111; }
.bonus-icon { color: #ffe44d; margin-left: 4px; }

/* Panel de guerra */
.phase-banner {
  padding: 10px;
  border-radius: 8px;
  text-align: center;
  font-family: 'Press Start 2P', monospace;
  font-size: 0.6rem;
  margin-bottom: 16px;
}

.phase-banner.dispute { background: #1a0f00; border: 1px solid #ff8800; color: #ff8800; }
.phase-banner.dominance { background: #001a00; border: 1px solid #44ff44; color: #44ff44; }

/* Tienda de guerra */
.shop-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #333;
  border-radius: 8px;
  margin-bottom: 8px;
}

.shop-item.disabled { opacity: 0.5; }
.shop-item .item-icon { font-size: 1.5rem; }
.shop-item .item-info { flex: 1; }
.shop-item .item-info strong { font-size: 0.65rem; }
.shop-item .item-info p { font-size: 0.55rem; color: #aaa; margin: 4px 0 0 0; }

/* Faction badge en perfil */
.faction-badge { font-size: 0.6rem; padding: 2px 8px; border-radius: 10px; }
.faction-badge.union { background: #002a00; color: #66ff66; border: 1px solid #44ff44; }
.faction-badge.poder { background: #2a002a; color: #ff66ff; border: 1px solid #ff44ff; }
```

---

## Paso 11 — Inicialización al cargar el juego

En el punto de entrada del juego (después de login exitoso y carga del estado),
agregar en `src/legacy/js/21_dominance.js` una función `initDominanceSystem()`:

```js
async function initDominanceSystem() {
  await loadPlayerFaction();
  await loadActiveBonuses();
  await resolveWeekIfNeeded();

  if (!state.faction) {
    renderFactionModal(); // mostrar selector de bando si no eligió
  } else {
    renderFactionUI();
  }
}
```

Y llamarla desde donde se inicializa el resto del juego después del login.

---

## Orden de implementación recomendado

1. **Crear las tablas en Supabase** (Paso 1) — sin esto nada funciona
2. **Crear `src/legacy/js/21_dominance.js`** con todas las funciones (Paso 3)
3. **Actualizar estado** en `04_state.js` y `01_auth.js` (Pasos 2 y 5)
4. **Agregar hooks** en `06_encounters.js` y `07_battle.js` (Paso 4)
5. **UI básica**: modal de bando + indicadores en mapas (Pasos 6 y 7)
6. **Panel de Guerra y Tienda** (Pasos 8 y 9)
7. **CSS** (Paso 10)
8. **Inicialización** (Paso 11)
9. **Probar** el ciclo completo con dos cuentas de distintos bandos

---

## Notas importantes para el implementador

- El sistema de modo **Local** (LocalStorage sin Supabase) no puede participar en la
  guerra de bandos — mostrar un mensaje indicando que la guerra requiere cuenta online
- Los multiplicadores de EXP y Shiny deben **apilarse** con los eventos semanales
  existentes (`doble_exp`, etc.), no reemplazarlos
- El `warDailyCap` en el estado local se resetea automáticamente al detectar un nuevo día
  (comparando `new Date().toDateString()` con la key del objeto)
- La función `resolveWeekIfNeeded()` puede correr en el cliente de cualquier jugador —
  usar `upsert` en vez de `insert` en `war_dominance` para que sea idempotente
- El Guardián solo aparece durante la **Fase de Disputa** (Lunes–Viernes)
- Verificar siempre que `state.faction !== null` antes de mostrar cualquier UI de guerra
