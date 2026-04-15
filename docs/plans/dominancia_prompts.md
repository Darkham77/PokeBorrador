# 🗺️ Prompts para implementar el Sistema de Dominancia — Poké Vicio

> Usá cada prompt de forma **individual**, en orden. Antes de avanzar al siguiente, verificá que el juego cargue sin errores en la consola.
> 
> **Estado actual de la implementación:**
> - ✅ SQL schema creado (`db_dominance_schema.sql`) — **pendiente ejecutarlo en Supabase**
> - ✅ `src/legacy/js/04_state.js` — campos `faction`, `warCoins`, `warCoinsSpent`, `warDailyCap` añadidos al estado
> - ✅ `src/legacy/js/21_dominance.js` — lógica central creada (guardianes, puntos, bonos, UI)
> - ✅ `index.html` — tab Guerra añadido a la navegación, modales de bando y tienda inyectados, `<script>` de `21_dominance.js` añadido
> - ✅ `src/legacy/js/01_auth.js` — `serializeState()` incluye campos de guerra; `initDominanceSystem()` llamado al login; badge de facción en perfil
> - ⚠️ Algunos cambios de los pasos 5-11 pueden estar incompletos o con errores — esta guía te permite rehacerlos limpiamente

---

## PASO 0 — Antes de empezar: ejecutar el SQL en Supabase

No es un prompt para la IA. Debés vos mismo ir a **Supabase → SQL Editor** y ejecutar el archivo:

```
d:\Documentos\GitHub\PokeBorrador\db_dominance_schema.sql
```

Esto crea las tablas: `war_factions`, `war_points`, `war_dominance`, `guardian_captures`, `war_coins`, y la función RPC `add_war_points`.

---

## PROMPT 1 — Verificar el estado actual del archivo src/legacy/js/21_dominance.js

```
Abrí el archivo src/legacy/js/21_dominance.js y verificá que contenga las siguientes funciones. Si alguna falta, añadila al final sin tocar lo que ya existe:

1. `renderFactionModal()` — muestra el modal `#faction-choice-modal` si `state.faction === null`
2. `renderWarTab()` — llama a `renderWarPanel()`
3. `renderWarPanel()` — async, consulta Supabase war_dominance, actualiza contadores `#union-maps`, `#poder-maps`, `#war-coins-count`, y llama a `renderKantoWarGrid()`
4. `renderKantoWarGrid(domData)` — recorre `FIRE_RED_MAPS` y construye el HTML del panel de guerra basándose en si hay disputa o dominancia
5. `showWarShop()` y `closeWarShop()` — abren y cierran el modal `#war-shop-modal`
6. `renderWarShop()` — renderiza la lista de ítems de `WAR_SHOP_ITEMS` con precios y botones
7. `buyWarItem(itemId)` — descuenta `warCoinsSpent` y aplica el efecto del ítem

Si todas existen, respondé "Todo OK" y no modifiques nada.
```

---

## PROMPT 2 — Hook en src/legacy/js/06_encounters.js: Guardián en goLocation

```
En el archivo src/legacy/js/06_encounters.js, encontrá la función `goLocation(locId)`. Necesito hacer dos cambios quirúrgicos:

**Cambio 1:** Convertir la función a `async`:
- Cambiá `function goLocation(locId)` por `async function goLocation(locId)`

**Cambio 2:** Añadir `window.currentEncounterMapId = locId;` como primera línea dentro de la función, antes de cualquier otra lógica.

**Cambio 3:** DESPUÉS de la lógica de `accessDenied` (el bloque que retorna si el jugador no tiene suficientes medallas), añadir exactamente este bloque:

```js
// DOMINANCIA: Verificar Guardián
if (typeof tryTriggerGuardian === 'function') {
  const guardian = await tryTriggerGuardian(locId);
  if (guardian) {
    const enemy = makePokemon(guardian.id, guardian.lv);
    enemy.isGuardian = true;
    enemy.guardianPts = guardian.pts;
    startBattle(enemy, false, false, locId);
    return;
  }
}
```

No toques nada más en el archivo. Verificá que el juego cargue sin errores de consola.
```

---

## PROMPT 3 — Hook en src/legacy/js/04_state.js: multiplicador shiny de dominancia

```
En el archivo src/legacy/js/04_state.js, dentro de la función `makePokemon(id, level)`, encontrá este bloque:

```js
finalShinyRate = Math.max(1, finalShinyRate);
const isShiny = Math.random() < (1 / finalShinyRate);
```

Justo ANTES de esa línea `finalShinyRate = Math.max(1, finalShinyRate);`, añadir:

```js
// Multiplicador de Dominancia (Guerra)
if (typeof getDominanceShinyMultiplier === 'function' && window.currentEncounterMapId) {
  finalShinyRate = Math.floor(finalShinyRate / getDominanceShinyMultiplier(window.currentEncounterMapId));
}
```

No toques nada más en el archivo. Verificá que el juego cargue sin errores.
```

---

## PROMPT 4 — Hook en src/legacy/js/07_battle.js: puntos de guerra al ganar

```
En el archivo src/legacy/js/07_battle.js, dentro de la función `endBattle(won)`, encontrá este bloque exacto:

```js
setLog(`¡${b.enemy.name} fue derrotado!`, 'log-player');
awardBattleExperience();
```

DESPUÉS de `awardBattleExperience();`, añadir:

```js
// DOMINANCIA: Sumar Puntos de Territorio
if (typeof addWarPoints === 'function') {
  const wMapId = b.locationId || window.currentEncounterMapId;
  if (wMapId) {
    const wType = b.isGym ? 'trainer_win' : (b.isTrainer ? 'trainer_win' : 'wild_win');
    addWarPoints(wMapId, wType, true);
  }
}
```

No toques nada más. Verificá que el juego cargue sin errores.
```

---

## PROMPT 5 — Hook en src/legacy/js/07_battle.js: multiplicador EXP de dominancia

```
En el archivo src/legacy/js/07_battle.js, dentro de la función `awardBattleExperience(isCapture = false)`, encontrá estas líneas:

```js
const expMultiplier = isCapture ? 4 : ((b.isTrainer || b.isGym) ? 8 : 4);
const baseExp = Math.floor(b.enemy.level * expMultiplier);
```

Reemplazalas por:

```js
let expMultiplier = isCapture ? 4 : ((b.isTrainer || b.isGym) ? 8 : 4);

// Multiplicador de Dominancia (Guerra)
if (typeof getDominanceExpMultiplier === 'function' && b.locationId) {
  const domMult = getDominanceExpMultiplier(b.locationId);
  if (domMult > 1) {
    expMultiplier *= domMult;
    addLog(`<span style="color:var(--yellow);font-size:9px;">[DOMINANCIA: x${domMult}]</span>`, 'log-info');
  }
}

const baseExp = Math.floor(b.enemy.level * expMultiplier);
```

No toques nada más. Verificá que el juego cargue sin errores.
```

---

## PROMPT 6 — Hook en src/legacy/js/07_battle.js: captura de Guardián

```
En el archivo src/legacy/js/07_battle.js, encontrá la función `catchSuccess(enemy)`.

**Cambio 1:** Convertirla a async:
- Cambiá `function catchSuccess(enemy)` por `async function catchSuccess(enemy)`

**Cambio 2:** Dentro de la función, DESPUÉS de:
```js
caught.hp = Math.min(caught.maxHp, Math.max(1, enemy.hp));
```

Y ANTES de:
```js
if (!state.box) state.box = [];
```

Añadir este bloque:

```js
// DOMINANCIA: Interceptar captura de Guardián
if (enemy.isGuardian && typeof claimGuardianCapture === 'function') {
  const claimed = await claimGuardianCapture(b.locationId, caught);
  if (!claimed) {
    setLog(`¡Oh no! El Guardián ya fue capturado por otro entrenador antes de que la Pokéball pudiera transferirlo.`, 'log-enemy');
    const captureLoc = b.locationId;
    setTimeout(() => { if (typeof showScreen==='function') showScreen('game-screen'); }, 3000);
    return;
  }
}
```

No toques nada más. Verificá que el juego cargue sin errores.
```

---

## PROMPT 7 — CSS de Dominancia en style.css

```
Abrí el archivo style.css. Andá al final del archivo y añadí el siguiente bloque de estilos. No modifiques ninguna línea existente, solo agregá al final:

```css
/* ===== SISTEMA DE DOMINANCIA DE MAPAS ===== */

.faction-badge {
  display: inline-block;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 10px;
  font-weight: 700;
}
.faction-badge.union {
  background: rgba(0,100,0,0.3);
  color: #66ff66;
  border: 1px solid #44ff44;
}
.faction-badge.poder {
  background: rgba(80,0,80,0.3);
  color: #ff66ff;
  border: 1px solid #ff44ff;
}

#war-kanto-map > div {
  transition: background 0.2s;
}
#war-kanto-map > div:hover {
  background: rgba(255,255,255,0.09) !important;
}

.dom-badge {
  font-size: 9px;
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

#faction-choice-modal button:hover { transform: scale(1.03); }
#faction-choice-modal button:active { transform: scale(0.97); }

@keyframes guardianPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
```

Verificá que el juego cargue sin errores de consola.
```

---

## PROMPT 8 — Verificar badge de facción en perfil (src/legacy/js/01_auth.js)

```
En el archivo src/legacy/js/01_auth.js, dentro de la función `updateProfilePanel(user, profile)`, verificá que exista un bloque que actualice el elemento `#player-faction-badge` según `state.faction`.

Si NO existe, encontrá la línea donde termina el bloque `if (user && profile) { ... }` (cierra con `}`) y DESPUÉS de ese cierre de bloque, añadí:

```js
// Actualizar badge de facción
const factionBadge = document.getElementById('player-faction-badge');
if (factionBadge) {
  if (state.faction === 'union') {
    factionBadge.textContent = '🟢 Team Unión';
    factionBadge.className = 'faction-badge union';
  } else if (state.faction === 'poder') {
    factionBadge.textContent = '🟣 Team Poder';
    factionBadge.className = 'faction-badge poder';
  } else {
    factionBadge.textContent = 'Sin Bando';
    factionBadge.className = '';
  }
}
```

Si YA existe ese bloque, no toques nada, respondé "Ya estaba".
```

---

## PROMPT 9 — Verificar llamada a initDominanceSystem en el login (src/legacy/js/01_auth.js)

```
En el archivo src/legacy/js/01_auth.js, dentro de la función `onLogin(user)`, verificá que exista esta línea (o similar) cerca del final del bloque try:

```js
if (typeof initDominanceSystem === 'function') setTimeout(() => initDominanceSystem(), 1500);
```

Si NO existe, añadila justo ANTES de la línea `} catch (e) {` que cierra el bloque principal de `onLogin`.

Si YA existe, no toques nada, respondé "Ya estaba".
```

---

## PROMPT 10 — Prueba final del sistema

```
Necesito que hagas una revisión integral del Sistema de Dominancia implementado en Poké Vicio. Revisá lo siguiente **leyendo los archivos actuales** (no hagas cambios aún):

1. `src/legacy/js/21_dominance.js` — ¿Se define `initDominanceSystem`, `chooseFaction`, `tryTriggerGuardian`, `claimGuardianCapture`, `addWarPoints`, `renderWarPanel`, `renderWarShop`?

2. `src/legacy/js/06_encounters.js` — ¿`goLocation` es `async` y llama a `tryTriggerGuardian`?

3. `src/legacy/js/07_battle.js` — ¿`catchSuccess` es `async` y chequea `enemy.isGuardian`? ¿`endBattle` llama a `addWarPoints`? ¿`awardBattleExperience` aplica `getDominanceExpMultiplier`?

4. `src/legacy/js/04_state.js` — ¿`makePokemon` aplica `getDominanceShinyMultiplier`? ¿`INITIAL_STATE` tiene `faction`, `warCoins`, `warCoinsSpent`, `warDailyCap`?

5. `src/legacy/js/01_auth.js` — ¿`serializeState()` guarda `faction`, `warCoins`, `warCoinsSpent`, `warDailyCap`? ¿`onLogin` llama a `initDominanceSystem`?

6. `index.html` — ¿Existe `<div id="tab-war">` con el panel de guerra? ¿Existe `<div id="faction-choice-modal">`? ¿Existe `<div id="war-shop-modal">`? ¿Existe `<script src="src/legacy/js/21_dominance.js">`?

Reportá el estado de cada punto. Si hay algo faltante, hacé los cambios quirúrgicos necesarios.
```

---

## Notas de diseño (para referencia)

| Concepto | Detalle |
|---|---|
| Facciones | Team Unión (🟢) vs Team Poder (🟣) — elección permanente |
| Guardianes | 35+ Pokémon en pool (Común/Raro/Élite) — determinístico por fecha+mapa |
| Zonas de conflicto | 12 mapas rotativos diarios, elegidos por hash de la fecha |
| Chance encuentro | 3% por visita (`GUARDIAN_CHANCE = 0.03`) |
| Puntos de territorio | wild_win: 2pt · capture: 5pt · trainer_win: 8pt · guardian: 150-750pt |
| Cap diario | 300 PT por mapa por día (anti-farm) |
| Monedas de guerra | 1 moneda cada 10 PT ganados |
| Ciclo semanal | Lun–Vie = Disputa · Sáb–Dom = Dominancia (bonos activos) |
| Bonos de dominancia | EXP x1.25 · Shiny x2 en mapas dominados |
| Fase online only | El sistema requiere cuenta Supabase — modo local no participa |
