// ===== SISTEMA DE DOMINANCIA DE MAPAS (GUERRA DE FACCIONES) =====

function getCurrentWeekId() {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const week = Math.ceil(((now - jan4) / 86400000 + jan4.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getPreviousWeekId() {
  const now = new Date();
  now.setDate(now.getDate() - 7);
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const week = Math.ceil(((now - jan4) / 86400000 + jan4.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function isDisputePhase() {
  const day = new Date().getDay();
  // Lunes (1) a Viernes (5) es Fase de Disputa.
  // Sábado (6) y Domingo (0) es Fase de Dominancia.
  return (day >= 1 && day <= 5);
}

const WAR_MAP_IMAGES = {
  route1: 'ruta 1.png', route2: 'ruta 2.png', forest: 'bosque viridian.png',
  route22: 'ruta 22.png', route3: 'ruta 3.png', mt_moon: 'mt. moon.png',
  route4: 'ruta 4.png', route24: 'ruta 24.png', route25: 'ruta 25.png',
  route5: 'ruta 5.png', route6: 'ruta 6.png', route11: 'ruta 11.png',
  diglett_cave: 'cueva diglett.png', route9: 'ruta 9.png', rock_tunnel: 'tunel roca.png',
  route10: 'ruta 10.png', power_plant: 'central de energia.png', route8: 'ruta 8.png',
  pokemon_tower: 'torre pokemon.png', route12: 'ruta 12.png', route13: 'ruta 13.png',
  safari_zone: 'zona safari.png', seafoam_islands: 'islas espuma.png',
  mansion: 'mansion pokemon.png', route14: 'ruta 14.png', route15: 'ruta 15.png',
  route23: 'ruta 23.png', victory_road: 'calle victoria.png', cerulean_cave: 'cueva celeste.png'
};

async function chooseFaction(faction) {
  const userId = window.currentUser?.id;
  if (!userId) { notify('Debés iniciar sesión online para elegir facción.', '⛔'); return; }

  const isChange = !!state.faction;
  const cost = 25000;

  // Si ya tiene bando y quiere cambiar
  if (isChange) {
    if (state.faction === faction) {
      notify('Ya perteneces a este bando.', 'ℹ️');
      return;
    }
    if (state.money < cost) {
      notify(`Necesitás 🪙${cost.toLocaleString()} para cambiar de bando.`, '⛔');
      return;
    }
    
    // Confirmación extra
    if (!confirm(`¿Estás seguro de cambiar al Team ${faction === 'union' ? 'Unión' : 'Poder'}? Esto costará 🪙${cost.toLocaleString()} y perderás tus puntos de esta semana.`)) {
      return;
    }

    state.money -= cost;
    notify(`Cambiando de bando... -🪙${cost.toLocaleString()}`, '💸');
    
    // Resetear puntos de la semana actual
    const weekId = getCurrentWeekId();
    await window.sb.from('war_user_points').delete().eq('user_id', userId).eq('week_id', weekId);
  }
  
  const { error } = await window.sb
    .from('war_factions')
    .upsert({ user_id: userId, faction }, { onConflict: 'user_id' });
    
  if (!error) {
    state.faction = faction;
    if (typeof scheduleSave === 'function') scheduleSave();
    
    updateFactionBadge(); // Función auxiliar para actualizar el badge en toda la UI
    
    const modal = document.getElementById('faction-choice-modal');
    if (modal) modal.style.display = 'none';
    
    notify(`¡Ahora eres parte del Team ${faction === 'union' ? 'Unión' : 'Poder'}!`, '⚔️');
    
    if (typeof saveGame === 'function') saveGame(false);
    if (typeof renderWarPanel === 'function') renderWarPanel();
  } else {
    notify('Error al registrar facción. ' + error.message, '⛔');
  }
}

function updateFactionBadge() {
  const bdg = document.getElementById('player-faction-badge');
  if (bdg) {
    if (state.faction === 'union') {
      bdg.innerHTML = '<img src="assets/factions/union.png" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;filter:drop-shadow(0 0 3px rgba(59,130,246,0.5));"> Team Unión';
      bdg.className = 'faction-badge union';
    } else if (state.faction === 'poder') {
      bdg.innerHTML = '<img src="assets/factions/poder.png" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;filter:drop-shadow(0 0 3px rgba(239,68,68,0.5));"> Team Poder';
      bdg.className = 'faction-badge poder';
    } else {
      bdg.textContent = 'Sin Bando';
      bdg.className = 'faction-badge';
    }
  }
}

function openFactionSelection(isChange = false) {
  const modal = document.getElementById('faction-choice-modal');
  if (!modal) return;
  
  const desc = document.getElementById('faction-modal-desc');
  if (desc) {
    if (isChange) {
      desc.innerHTML = `Tu bando determina con quién disputás el control de Kanto.<br><span style="color:var(--yellow);font-weight:bold;">Cambiar cuesta 🪙25,000 y resetea tus puntos actuales.</span>`;
    } else {
      desc.innerHTML = `Tu bando determina con quién disputás el control de Kanto.<br>¡Elige con sabiduría!`;
    }
  }
  
  modal.style.display = 'flex';
}

async function loadPlayerFaction() {
  const userId = window.currentUser?.id;
  if (!userId) return;
  const { data } = await window.sb
    .from('war_factions')
    .select('faction')
    .eq('user_id', userId)
    .maybeSingle();
  if (data && data.faction) {
    state.faction = data.faction;
  }
}

function getAllowedPointsWithCap(mapId, pts) {
  const today = new Date().toDateString();
  if (!state.warDailyCap) state.warDailyCap = {};
  
  // Limpiar días anteriores para ahorrar espacio
  Object.keys(state.warDailyCap).forEach(date => {
    if (date !== today) delete state.warDailyCap[date];
  });

  if (!state.warDailyCap[today]) state.warDailyCap[today] = {};
  if (!state.warDailyCap[today][mapId]) state.warDailyCap[today][mapId] = 0;

  const current = state.warDailyCap[today][mapId];
  if (current >= 300) return 0;
  
  const allowed = Math.min(pts, 300 - current);
  state.warDailyCap[today][mapId] += allowed;
  return allowed;
}

// Devuelve la cantidad de monedas realmente sumadas (0 si el límite ya estaba alcanzado)
function addWarCoinsLocal(coins) {
  if (coins <= 0) return 0;
  
  // Lógica de límite diario (Máximo 50 monedas por día)
  const today = new Date().toDateString();
  if (!state.warDailyCoins) state.warDailyCoins = {};
  
  // Limpiar días anteriores para ahorrar espacio en el guardado
  Object.keys(state.warDailyCoins).forEach(date => {
    if (date !== today) delete state.warDailyCoins[date];
  });

  if (!state.warDailyCoins[today]) state.warDailyCoins[today] = 0;
  
  const currentDaily = state.warDailyCoins[today];
  if (currentDaily >= 50) return 0; // Ya alcanzó el límite
  
  let allowedCoins = coins;
  if (currentDaily + coins > 50) {
    allowedCoins = 50 - currentDaily;
  }
  
  if (allowedCoins <= 0) return 0;

  if (typeof state.warCoins !== 'number') state.warCoins = 0;
  state.warCoins += allowedCoins;
  state.warDailyCoins[today] += allowedCoins;
  
  if (typeof scheduleSave === 'function') scheduleSave();
  
  // Notificar al llegar exactamente al límite (solo 1 vez por día)
  if (state.warDailyCoins[today] >= 50) {
    notify('¡Límite diario alcanzado! Ya no podés ganar más Monedas de Guerra hoy.', '⚡');
  }

  return allowedCoins;
}

async function addWarPoints(mapId, eventType, success, overridePts = null) {
  if (!state.faction) return;
  if (!isDisputePhase()) return; 

  const PTS_TABLE = {
    capture:        { win: 5,  lose: 1 },
    trainer_win:    { win: 8,  lose: 2 },
    wild_win:       { win: 1,  lose: 0 }, // 1 PT por baja común
    fishing:        { win: 4,  lose: 1 },
    shiny_capture:  { win: 40, lose: 10 },
    event:          { win: 20, lose: 5 },
    guardian:       { win: 150, lose: 10 }
  };

  const ptRecord = PTS_TABLE[eventType] || { win: 1, lose: 0 };
  let pts = success ? ptRecord.win : ptRecord.lose;
  if (eventType === 'wild_win') pts = 1; // Forzar 1 PT por baja común para balance
  if (overridePts !== null) pts = overridePts;

  if (pts <= 0) return;

  // Verificar cap diario de PT para este mapa (300 PT/mapa/día)
  const today = new Date().toDateString();
  if (!state.warDailyCap) state.warDailyCap = {};
  if (!state.warDailyCap[today]) state.warDailyCap[today] = {};
  const currentMapPts = state.warDailyCap[today][mapId] || 0;
  if (currentMapPts >= 300) {
    // Notificar solo una vez por mapa por día
    if (!state.warDailyCapNotified) state.warDailyCapNotified = {};
    if (!state.warDailyCapNotified[today]) state.warDailyCapNotified[today] = {};
    if (!state.warDailyCapNotified[today][mapId]) {
      state.warDailyCapNotified[today][mapId] = true;
      const mapName = (window.FIRE_RED_MAPS || []).find(m => m.id === mapId)?.name || mapId;
      notify(`Ya no podés aportar más Puntos de Dominancia en ${mapName} por hoy.`, '🚫');
    }
    return;
  }

  const allowedPts = getAllowedPointsWithCap(mapId, pts);
  if (allowedPts <= 0) return;
  
  // A partir de aquí usamos allowedPts en lugar de pts original
  const weekId = getCurrentWeekId();

  try {
    // 1. Registro Global/Bando
    const { error: rpcError } = await window.sb.rpc('add_war_points', {
      p_week_id: weekId,
      p_map_id: mapId,
      p_faction: state.faction,
      p_points: allowedPts
    });
    if (rpcError) console.error('[WAR] Error en add_war_points RPC:', rpcError);

    // 2. Registro Individual (acumulativo, con errores visibles)
    const { data: existing, error: selErr } = await window.sb
      .from('war_user_points')
      .select('points')
      .eq('user_id', window.currentUser.id)
      .eq('week_id', weekId)
      .eq('map_id', mapId)
      .maybeSingle();

    if (selErr) {
      console.error('[WAR] Error al leer war_user_points:', selErr);
    } else if (existing) {
      const { error: updErr } = await window.sb
        .from('war_user_points')
        .update({ points: existing.points + allowedPts })
        .eq('user_id', window.currentUser.id)
        .eq('week_id', weekId)
        .eq('map_id', mapId);
      if (updErr) console.error('[WAR] Error al actualizar war_user_points:', updErr);
    } else {
      const { error: insErr } = await window.sb
        .from('war_user_points')
        .insert({
          user_id: window.currentUser.id,
          week_id: weekId,
          map_id: mapId,
          points: allowedPts
        });
      if (insErr) console.error('[WAR] Error al insertar war_user_points:', insErr);
    }

    // Actualizar acumulador local inmediatamente (fallback si BD falla)
    if (!state.warMyPtsLocal) state.warMyPtsLocal = {};
    if (!state.warMyPtsLocal[weekId]) state.warMyPtsLocal[weekId] = 0;
    state.warMyPtsLocal[weekId] += allowedPts;
    // Limpiar semanas anteriores
    Object.keys(state.warMyPtsLocal).forEach(wk => { if (wk !== weekId) delete state.warMyPtsLocal[wk]; });
    if (typeof scheduleSave === 'function') scheduleSave();

    // Lógica de Monedas Acumulativas
    if (!state.warPointsAccumulator) state.warPointsAccumulator = 0;
    state.warPointsAccumulator += allowedPts;
    
    if (state.warPointsAccumulator >= 10) {
      const newCoins = Math.floor(state.warPointsAccumulator / 10);
      const coinsActuallyAdded = addWarCoinsLocal(newCoins);
      state.warPointsAccumulator %= 10;

      // Verificar si ya estábamos en el límite ANTES de intentar sumar
      const todayStr = new Date().toDateString();
      const dailyTotal = state.warDailyCoins?.[todayStr] || 0;

      if (coinsActuallyAdded > 0) {
        // Se sumaron monedas normalmente
        if (dailyTotal < 50) {
          notify(`¡Ganaste ${coinsActuallyAdded} Moneda${coinsActuallyAdded > 1 ? 's' : ''} de Guerra!`, '⚡');
        }
        // Si dailyTotal >= 50, addWarCoinsLocal ya mostró el aviso de límite alcanzado
      } else {
        // No se sumó ninguna moneda porque el límite ya estaba alcanzado
        if (!state.warCoinCapNotifiedToday) {
          state.warCoinCapNotifiedToday = todayStr;
          notify('¡Límite diario alcanzado! No más Monedas de Guerra hasta mañana.', '🚫');
        } else if (state.warCoinCapNotifiedToday !== todayStr) {
          // Nuevo día, resetear flag
          state.warCoinCapNotifiedToday = null;
        }
      }
    }
    
    // Refrescar panel si está abierto
    renderWarPanel();
  } catch(e) { console.error("Error sumando PT", e); }
}

async function getMapDominanceStatus(mapId) {
  const weekId = getCurrentWeekId();

  if (!isDisputePhase()) {
    const { data: dom } = await window.sb
      .from('war_dominance')
      .select('winner_faction, union_points, poder_points')
      .eq('week_id', weekId)
      .eq('map_id', mapId)
      .maybeSingle();
    
    // Fallback: Si no hay datos oficiales de dominancia pero hay puntos del mapa
    // (común en Modo Test), devolvemos el ganador provisional.
    if (!dom) {
      const { data: pts } = await window.sb.from('war_points').select('faction, points').eq('week_id', weekId).eq('map_id', mapId);
      const u = pts?.find(p => p.faction === 'union')?.points || 0;
      const p = pts?.find(p => p.faction === 'poder')?.points || 0;
      const winner = u > p ? 'union' : (p > u ? 'poder' : null);
      if (winner) {
        return { phase: 'dominance', winner, union: u, poder: p };
      }
    }

    return { 
      phase: 'dominance', 
      winner: dom?.winner_faction || null, 
      union: dom?.union_points || 0, 
      poder: dom?.poder_points || 0 
    };
  }

  const { data: points } = await window.sb
    .from('war_points')
    .select('faction, points')
    .eq('week_id', weekId)
    .eq('map_id', mapId);

  const union = points?.find(p => p.faction === 'union')?.points || 0;
  const poder = points?.find(p => p.faction === 'poder')?.points || 0;
  const total = union + poder;
  const leading = total === 0 ? null : (union >= poder ? 'union' : 'poder');

  return { phase: 'dispute', leading, union, poder };
}

async function resolveWeekIfNeeded() {
  const currentWeekId = getCurrentWeekId();
  if (state.lastResolvedWeek === currentWeekId) return;

  // Solo resolvemos los resultados durante el fin de semana (fase de descanso)
  if (isDisputePhase()) return;

  // Buscamos todos los puntos acumulados por todos los jugadores en esta semana
  const { data: allPoints } = await window.sb
    .from('war_points')
    .select('map_id, faction, points')
    .eq('week_id', currentWeekId);

  if (!allPoints || allPoints.length === 0) {
    state.lastResolvedWeek = currentWeekId;
    if (typeof scheduleSave === 'function') scheduleSave();
    return;
  }

  const mapResults = {};
  allPoints.forEach(row => {
    if (!mapResults[row.map_id]) mapResults[row.map_id] = { union: 0, poder: 0 };
    mapResults[row.map_id][row.faction] += row.points;
  });

  for (const [mapId, pts] of Object.entries(mapResults)) {
    const winner = pts.union >= pts.poder ? 'union' : 'poder';
    await window.sb.from('war_dominance').upsert({
      week_id: currentWeekId,
      map_id: mapId,
      winner_faction: winner,
      union_points: pts.union,
      poder_points: pts.poder
    });
  }

  await distributeWeeklyWarCoins(currentWeekId);

  state.lastResolvedWeek = currentWeekId;
  if (typeof scheduleSave === 'function') scheduleSave();
  await loadActiveBonuses();
}

async function calculateUserWeeklyContribution(weekId) {
  const userId = window.currentUser?.id;
  if (!userId) return 0;
  const targetWeekId = weekId || getCurrentWeekId();
  
  const { data } = await window.sb
    .from('war_user_points')
    .select('points')
    .eq('user_id', userId)
    .eq('week_id', targetWeekId);
    
  let total = 0;
  data?.forEach(r => total += (r.points || 0));
  return total;
}

function getDefenseSlots(totalPoints) {
  // 1 Slot cada 700 puntos
  return Math.floor(totalPoints / 700);
}

async function checkFactionWeeklyWin(weekId) {
  const { data: dom } = await window.sb
    .from('war_dominance')
    .select('winner_faction')
    .eq('week_id', weekId);
  if (!dom) return false;
  let unionMapas = 0, poderMapas = 0;
  dom.forEach(row => {
    if (row.winner_faction === 'union') unionMapas++;
    else poderMapas++;
  });
  if (state.faction === 'union' && unionMapas >= poderMapas) return true;
  if (state.faction === 'poder' && poderMapas > unionMapas) return true;
  return false;
}

async function distributeWeeklyWarCoins(weekId) {
  const email = window.currentUser?.email;
  if (!email || !state.faction) return;

  // Calculamos la contribución total del usuario en la semana indicada
  const totalPtContributed = await calculateUserWeeklyContribution(weekId);
  let coins = 0;
  if (totalPtContributed >= 1501) coins = 150;
  else if (totalPtContributed >= 501) coins = 75;
  else if (totalPtContributed >= 101) coins = 35;
  else if (totalPtContributed >= 1) coins = 10;

  const didFactionWin = await checkFactionWeeklyWin(weekId);
  if (didFactionWin) coins += 50;

  if (coins > 0) {
    addWarCoinsLocal(coins);
    notify(`Fin de guerra. ¡Recibiste ${coins} Monedas de Guerra!`, '⚡');
  }
}

// ── SISTEMA DE GUARDIANES ──
function getArgentinaDateString() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
}

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
    { id: 'tauros',     lv: 45, pts: 300 }, { id: 'slowbro',    lv: 46, pts: 300 }, 
    { id: 'jolteon',    lv: 48, pts: 300 }, { id: 'vaporeon',   lv: 48, pts: 300 }, 
    { id: 'flareon',    lv: 48, pts: 300 }
  ],
  elite: [
    { id: 'dragonite',  lv: 60, pts: 750 }, { id: 'snorlax',    lv: 55, pts: 750 },
    { id: 'lapras',     lv: 55, pts: 750 }, { id: 'chansey',    lv: 50, pts: 750 },
    { id: 'cloyster',   lv: 52, pts: 750 }
  ]
};

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function isConflictZone(mapId) {
  const maps = window.FIRE_RED_MAPS || [];
  if (maps.length === 0) return false;
  
  const dateStr = getArgentinaDateString();
  const allMapIds = maps.map(m => m.id);
  const zones = [];
  let tempSeed = hashString(dateStr + "zones");
  // Reducido de 12 a 5 zonas por día
  while (zones.length < 5 && zones.length < allMapIds.length) {
    const idx = Math.abs(tempSeed) % allMapIds.length;
    const mId = allMapIds[idx];
    if (!zones.includes(mId)) zones.push(mId);
    tempSeed = hashString(tempSeed.toString());
  }
  return zones.includes(mapId);
}

function getGuardianForMap(mapId) {
  if (!isConflictZone(mapId)) return null;

  const dateStr = getArgentinaDateString();
  const seed = hashString(dateStr + mapId);
  
  const rarityRand = (seed % 100);
  let tier = 'common';
  if (rarityRand >= 90) tier = 'elite';
  else if (rarityRand >= 60) tier = 'rare';

  const pool = GUARDIAN_POOL[tier];
  const index = seed % pool.length;
  return pool[index];
}

const GUARDIAN_CHANCE = 0.015; // Reducido de 3% a 1.5% 

async function loadDailyGuardianCaptures() {
  const userId = window.currentUser?.id;
  if (!userId) return;

  const today = getArgentinaDateString();
  
  // Limpieza por cambio de día o primer carga
  if (state.lastGuardianFetch !== today) {
    state.dailyGuardianCaptures = [];
    state.lastGuardianFetch = today;
  }

  const { data, error } = await window.sb
    .from('guardian_captures')
    .select('map_id')
    .eq('capture_date', today)
    .eq('user_id', userId);
    
  if (!error && data) {
    state.dailyGuardianCaptures = data.map(c => c.map_id);
  } else {
    state.dailyGuardianCaptures = [];
  }
}

async function checkGuardianAppearance(mapId) {
  if (!getGuardianForMap(mapId)) return false;
  
  // Sincronizar fecha antes de chequear
  const today = getArgentinaDateString();
  if (state.lastGuardianFetch !== today) {
    await loadDailyGuardianCaptures();
  }

  // Si ya tenemos el cache, usarlo
  if (state.dailyGuardianCaptures) {
    if (state.dailyGuardianCaptures.includes(mapId)) return false;
  } 

  return Math.random() < GUARDIAN_CHANCE;
}

async function tryTriggerGuardian(mapId) {
  const appears = await checkGuardianAppearance(mapId);
  if (!appears) return false;

  const guardianData = getGuardianForMap(mapId);
  showGuardianAnnouncement(guardianData); 
  return guardianData;
}

function showGuardianAnnouncement(guardianData) {
  const name = (POKEMON_DB[guardianData.id]?.name || guardianData.id).toUpperCase();
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;padding:20px;';
  ov.innerHTML = `
    <div style="background:var(--card);border-radius:24px;padding:32px;max-width:380px;border:3px solid var(--yellow);text-align:center;">
      <div style="font-size:25px;animation:pulse 1s infinite;">⚠️</div>
      <div style="font-family:'Press Start 2P',monospace;font-size:12px;color:var(--yellow);margin:16px 0;">¡GUARDIÁN DETECTADO!</div>
      <div style="font-size:13px;color:#eee;margin-bottom:20px;">
        Un <strong style="color:var(--yellow);">${name}</strong> Nv. ${guardianData.lv} está custodiando este mapa.<br><br>
        <span style="font-size:11px;color:var(--gray);">Derrótalo o captúralo para reclamar los ${guardianData.pts} PT.</span>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" style="padding:14px;border-radius:12px;background:var(--yellow);color:var(--dark);font-family:'Press Start 2P',monospace;font-size:10px;cursor:pointer;border:none;">¡A LA BATALLA!</button>
    </div>
  `;
  document.body.appendChild(ov);
}

async function claimGuardianCapture(mapId, pokemon) {
  const userId = window.currentUser?.id;
  const today = getArgentinaDateString();

  const guardianData = getGuardianForMap(mapId);
  if (!guardianData) return false;
  const ptsAwarded = guardianData.pts || 150;

  const { error } = await window.sb
    .from('guardian_captures')
    .insert({
      capture_date: today,
      map_id: mapId,
      user_id: userId,
      winner_faction: state.faction,
      pts_awarded: ptsAwarded
    });

  if (error) {
    console.error('[GUARDIAN] Error salvando captura:', error);
    return false;
  }

  // Actualizar cache local inmediatamente
  if (!state.dailyGuardianCaptures) state.dailyGuardianCaptures = [];
  if (!state.dailyGuardianCaptures.includes(mapId)) state.dailyGuardianCaptures.push(mapId);

  pokemon.isGuardian = true;
  pokemon.guardianFaction = state.faction;
  pokemon.aura = state.faction === 'poder' ? 'white' : 'black';
  
  // Usar addWarPoints con override para centralizar monedas y guardado
  await addWarPoints(mapId, 'guardian', true, ptsAwarded);
  
  notify(`¡Capturaste al Guardián! Has reclamado ${ptsAwarded} PT para Team ${state.faction === 'union' ? 'Unión' : 'Poder'}.`, '🏆');
  return true;
}

async function recordGuardianDefeat(mapId, ptsAwarded) {
  const userId = window.currentUser?.id;
  const today = getArgentinaDateString();

  await window.sb
    .from('guardian_captures')
    .insert({
      capture_date: today,
      map_id: mapId,
      user_id: userId,
      winner_faction: state.faction,
      pts_awarded: Math.floor(ptsAwarded * 0.7) // 70% de puntos por derrota vs captura
    });

  await addWarPoints(mapId, 'guardian', true, Math.floor(ptsAwarded * 0.7));
  notify(`¡Guardián Derrotado! +${Math.floor(ptsAwarded * 0.7)} PT.`, '⚔️');
}

// ── BONOS ──
async function loadActiveBonuses() {
  if (isDisputePhase()) { state.activeBonuses = {}; return; }
  if (!state.faction) return;

  const weekId = getCurrentWeekId();
  const { data } = await window.sb
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

function hasDominanceBonus(mapId) {
  return !!state.activeBonuses?.[mapId];
}

function getDominanceShinyMultiplier(mapId) { return hasDominanceBonus(mapId) ? 1.3 : 1; }
function getDominanceExpMultiplier(mapId) { return hasDominanceBonus(mapId) ? 1.3 : 1; }
function hasDominanceIvBonus(mapId) { return hasDominanceBonus(mapId); }

async function initDominanceSystem() {
  await loadPlayerFaction();
  await loadActiveBonuses();
  await resolveWeekIfNeeded();

  if (!state.faction && window.currentUser) {
    if (typeof renderFactionModal === 'function') renderFactionModal(); 
  }
}

// ── UI RENDERING & SHOP ──

function renderFactionModal() {
  if (state.faction) return; 
  if ((state.trainerLevel || 1) < 10) return; // Restricción de nivel 10
  const modal = document.getElementById('faction-choice-modal');
  if (modal) modal.style.display = 'flex';
}

function renderWarTab() {
  renderWarPanel();
}

async function renderWarPanel() {
  await resolveWeekIfNeeded();
  const weekId = getCurrentWeekId();
  const dispute = isDisputePhase();
  const userId = window.currentUser?.id;

  // 1. Banner de Fase y Countdown
  const banner = document.getElementById('war-phase-banner');
  if (banner) {
    const nextPhaseName = dispute ? 'DOMINANCIA' : 'DISPUTA';
    const day = new Date().getDay();
    const daysUntil = dispute ? (6 - day) : (day === 0 ? 1 : 8 - day);
    
    banner.innerHTML = `<div style="padding:12px; border-radius:12px; text-align:center; font-family:'Press Start 2P',monospace; font-size:9px; margin-bottom:20px;
      ${dispute ? 'background:rgba(255,136,0,0.1); border:1px solid var(--dispute-color); color:var(--dispute-color);' : 'background:rgba(68,255,68,0.1); border:1px solid var(--union-color); color:var(--union-color);'}">
      ${dispute ? '⚔️ FASE DE DISPUTA' : '🏆 FASE DE DOMINANCIA'}<br>
      <span style="font-size:7px; opacity:0.8; margin-top:5px; display:inline-block;">Próxima fase en ${daysUntil} día${daysUntil>1?'s':''}</span>
    </div>`;
  }

  // 2. Datos de Dominancia (para el fin de semana)
  const { data: domData } = await window.sb
    .from('war_dominance')
    .select('map_id, winner_faction')
    .eq('week_id', weekId);

  let unionMaps = 0, poderMaps = 0;
  
  // Lógica de conteo: Si no hay datos de dominancia (común en Modo Test), 
  // usamos los puntos en disputa actuales como proyección.
  if (!domData || domData.length === 0) {
    const { data: ptsDataForScore } = await window.sb
      .from('war_points')
      .select('map_id, faction, points')
      .eq('week_id', weekId);
      
    if (ptsDataForScore) {
      const proy = {};
      ptsDataForScore.forEach(p => {
        if (!proy[p.map_id]) proy[p.map_id] = { union: 0, poder: 0 };
        proy[p.map_id][p.faction] += p.points;
      });
      Object.values(proy).forEach(p => {
        if (p.union > p.poder) unionMaps++;
        else if (p.poder > p.union) poderMaps++;
      });
    }
  } else {
    domData.forEach(r => {
      if (r.winner_faction === 'union') unionMaps++;
      else if (r.winner_faction === 'poder') poderMaps++;
    });
  }

  const domU = document.getElementById('union-maps');
  const domP = document.getElementById('poder-maps');
  const warScore = document.getElementById('war-score');
  
  if (warScore) {
    // Solo mostrar el marcador global durante la Fase de Dominancia (fines de semana)
    warScore.style.display = dispute ? 'none' : 'flex';
  }

  if (domU) domU.textContent = unionMaps;
  if (domP) domP.textContent = poderMaps;
  
  // 3. Datos de Puntos en Vivo (para la semana)
  const { data: ptsData } = await window.sb
    .from('war_points')
    .select('map_id, faction, points')
    .eq('week_id', weekId);

  // 4. Estadísticas Personales (Blindaje anti-errores)
  try {
    if (userId) {
      // Mi facción
      const myFacDisp = document.getElementById('war-my-faction');
      if (myFacDisp) {
        myFacDisp.textContent = state.faction === 'union' ? 'Unión' : (state.faction === 'poder' ? 'Poder' : 'Sin Bando');
        myFacDisp.style.color = state.faction === 'union' ? 'var(--union-color)' : (state.faction === 'poder' ? 'var(--poder-color)' : 'var(--gray)');
      }
      
      // Mis monedas
      const coinDisp = document.getElementById('war-coins-count');
      if (coinDisp) coinDisp.textContent = (state.warCoins || 0) - (state.warCoinsSpent || 0);

      const limitDisp = document.getElementById('war-coins-daily-limit');
      if (limitDisp) {
        const todayStr = new Date().toDateString();
        const dailyGot = (state.warDailyCoins && state.warDailyCoins[todayStr]) ? state.warDailyCoins[todayStr] : 0;
        limitDisp.textContent = `(${dailyGot}/50 Hoy)`;
        if (dailyGot >= 50) limitDisp.style.color = '#ef4444'; // Rojo si llegó al límite
        else limitDisp.style.color = 'rgba(255,214,10,0.6)';
      }

      // Mi contribución individual — primero mostramos el local, luego actualizamos desde BD
      const weekIdNow = getCurrentWeekId();
      const localPts = (state.warMyPtsLocal?.[weekIdNow]) || 0;
      const myContrDisp = document.getElementById('war-my-pts');
      if (myContrDisp && localPts > 0) myContrDisp.textContent = localPts.toLocaleString() + ' PT';

      // Consultar BD en paralelo y actualizar si el valor es mayor
      const myContr = await calculateUserWeeklyContribution();
      if (myContrDisp) {
        const finalPts = Math.max(myContr, localPts);
        myContrDisp.textContent = finalPts.toLocaleString() + ' PT';
        // Sincronizar local si la BD tiene más (ej. sesión anterior)
        if (myContr > localPts) {
          if (!state.warMyPtsLocal) state.warMyPtsLocal = {};
          state.warMyPtsLocal[weekIdNow] = myContr;
        }
      }

      // Slots de defensa (1 cada 4000 PT)
      const slots = getDefenseSlots(myContr);
      const slotsDisp = document.getElementById('war-defense-slots');
      if (slotsDisp) slotsDisp.textContent = slots;

      // 5. Mostrar mis defensores si no es fase de disputa
      const defSection = document.getElementById('war-my-defenders-section');
      if (defSection) {
        if (!dispute) {
          defSection.style.display = 'block';
          renderMyDefenders();
        } else {
          defSection.style.display = 'none';
        }
      }
    }
  } catch (err) {
    console.warn("Fallo al cargar stats personales de guerra:", err);
  }

  // 6. Grid de Kanto
  renderKantoWarGrid(ptsData || [], domData || []);
}

function renderKantoWarGrid(ptsData, domData) {
  const container = document.getElementById('war-kanto-map');
  if (!container) return;

  const dispute = isDisputePhase();
  let html = '';

  const mapsArray = window.FIRE_RED_MAPS || [];
  
  if (mapsArray.length === 0) {
    // Si los datos no están listos, reintentar en 500ms
    setTimeout(() => renderKantoWarGrid(ptsData, domData), 500);
    container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--gray); font-size:10px;">Cargando monitor...</div>';
    return;
  }
  // Filtrar mapas relevantes (con batallas) y asegurar unicidad por ID
  const seenMaps = new Set();
  const relevantMaps = mapsArray.filter(m => {
    if (!m.id || seenMaps.has(m.id)) return false;
    if (m.wild && Object.keys(m.wild).length > 0) {
      seenMaps.add(m.id);
      return true;
    }
    return false;
  });

  if (relevantMaps.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--gray); font-size:10px;">Monitor no disponible.</div>';
    return;
  }

  relevantMaps.forEach(map => {
    try {
      const isConflict = dispute && isConflictZone(map.id);
      
      // Puntos
      const pU = ptsData.find(p => p.map_id === map.id && p.faction === 'union')?.points || 0;
      const pP = ptsData.find(p => p.map_id === map.id && p.faction === 'poder')?.points || 0;
      const total = pU + pP;
      
      let pctU = 50, pctP = 50;
      if (total > 0) {
        pctU = (pU / total) * 100;
        pctP = (pP / total) * 100;
      }

      const domInfo = domData?.find(d => d.map_id === map.id);
      let winner = domInfo?.winner_faction;
      
      // Fallback para Modo Test: Si es fin de semana (simulado) y no hay ganador oficial, 
      // mostramos el ganador provisional basado en puntos.
      if (!dispute && !winner && total > 0) {
        winner = (pU > pP) ? 'union' : (pP > pU ? 'poder' : null);
      }

      const glowClass = winner === 'union' ? 'winner-glow-union' : (winner === 'poder' ? 'winner-glow-poder' : '');
      
      // Imagen
      const imgName = WAR_MAP_IMAGES[map.id] || 'default.png';
      const bgUrl = `maps/${imgName}`;

      // ── Contenido de la tarjeta según fase ──
      let cardInnerHtml = '';

      if (dispute) {
        // ── FASE DE DISPUTA: Barras de conquista ──
        cardInnerHtml = `
          <div class="war-card-overlay">
            <div class="war-card-top">
              <span class="war-card-name">${map.name}</span>
              ${isConflict ? '<span class="war-card-status-tag dispute">⚔️ GUERRA</span>' : ''}
            </div>

            <!-- BARRA CENTRAL GRANDE -->
            <div class="war-central-progress-box">
              <div class="war-central-labels">
                <span style="color:var(--union-color); text-shadow:0 1px 4px rgba(0,0,0,0.8);">UNIÓN</span>
                <span style="color:var(--poder-color); text-shadow:0 1px 4px rgba(0,0,0,0.8);">PODER</span>
              </div>
              <div class="war-central-bar">
                <div class="bar-union" style="width:${pctU}%"></div>
                <div class="bar-poder" style="width:${pctP}%"></div>
              </div>
              <div class="war-central-labels" style="font-size:8px; opacity:0.9; margin-top: 8px;">
                <span style="text-shadow:0 1px 3px rgba(0,0,0,0.8);">${pU} PT</span>
                <span style="text-shadow:0 1px 3px rgba(0,0,0,0.8);">${pP} PT</span>
              </div>
            </div>

            <div style="margin-top:auto; font-size:7px; color:rgba(255,255,255,0.6); font-family:'Press Start 2P'; text-align:center; margin-bottom: 8px; text-shadow:0 1px 4px rgba(0,0,0,0.8);">
               ${total > 0 ? (pU > pP ? 'Lidera Unión' : (pP > pU ? 'Lidera Poder' : 'Empate Técnico')) : 'Sin actividad'}
            </div>
          </div>
        `;
      } else {
        // ── FASE DE DOMINANCIA (FIN DE SEMANA): Overlay de facción ──
        const factionLabel = winner ? (winner === 'union' ? 'UNIÓN' : 'PODER') : null;
        const factionColor = winner === 'union' ? 'var(--union-color)' : (winner === 'poder' ? 'var(--poder-color)' : '#aaa');

        // Overlay: azul claro + blanco para Unión, negro + rojo oscuro para Poder
        let overlayBg = 'rgba(0,0,0,0.55)'; // neutral
        if (winner === 'union') overlayBg = 'linear-gradient(0deg, rgba(59,130,246,0.6) 0%, rgba(255,255,255,0.25) 100%)';
        if (winner === 'poder') overlayBg = 'linear-gradient(0deg, rgba(0,0,0,0.90) 0%, rgba(80,0,0,0.70) 100%)';

        cardInnerHtml = `
          <!-- Overlay de dominancia -->
          <div style="position:absolute; inset:0; background:${overlayBg}; border-radius:inherit; z-index:1; pointer-events:none;"></div>

          <!-- Label grande de facción -->
          ${factionLabel ? `
          <div style="position:absolute; inset:0; z-index:2; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; gap:6px;">
            <span style="font-family:'Press Start 2P',monospace; font-size:18px; color:${factionColor}; text-shadow: 0 0 20px ${factionColor}, 0 2px 8px rgba(0,0,0,0.9); letter-spacing:2px; text-align:center; line-height:1.3; ${winner === 'poder' ? 'text-shadow: 0 0 20px #ef4444, 0 0 40px rgba(239,68,68,0.4), 0 2px 8px rgba(0,0,0,0.9);' : 'text-shadow: 0 0 20px #3b82f6, 0 0 40px rgba(59,130,246,0.4), 0 2px 8px rgba(0,0,0,0.9);'}">
              ${factionLabel}
            </span>
            <span style="font-family:'Press Start 2P',monospace; font-size:7px; color:rgba(255,255,255,0.7); letter-spacing:1px;">
              ${map.name.toUpperCase()}
            </span>
          </div>` : `
          <div style="position:absolute; inset:0; z-index:2; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none;">
            <span style="font-family:'Press Start 2P',monospace; font-size:8px; color:rgba(255,255,255,0.4); text-align:center;">${map.name}</span>
            <span style="font-family:'Press Start 2P',monospace; font-size:6px; color:rgba(255,255,255,0.3); margin-top:6px;">SIN CONQUISTAR</span>
          </div>`}

          <!-- Botón PROTEGER (z-index alto para quedar encima del overlay) -->
          ${winner === state.faction ? `
          <div style="position:absolute; bottom:14px; left:14px; right:14px; z-index:10;">
            <button onclick="openSelectDefensePokeModal('${map.id}')"
                    style="width:100%; padding:10px 0; background:rgba(34,197,94,0.85); border:2px solid #4ade80; border-radius:12px; color:#fff; font-family:'Press Start 2P',monospace; font-size:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.2s; box-shadow: 0 0 18px rgba(34,197,94,0.5), 0 4px 12px rgba(0,0,0,0.5); text-shadow:0 1px 4px rgba(0,0,0,0.6);"
                    onmouseover="this.style.background='rgba(34,197,94,1)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 0 28px rgba(34,197,94,0.8), 0 8px 18px rgba(0,0,0,0.5)'"
                    onmouseout="this.style.background='rgba(34,197,94,0.85)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 0 18px rgba(34,197,94,0.5), 0 4px 12px rgba(0,0,0,0.5)'">
              🛡️ PROTEGER
            </button>
          </div>` : ''}

          <!-- Nombre del mapa en esquina superior izq (visible siempre) -->
          <div style="position:absolute; top:12px; left:14px; z-index:10;">
            <span style="font-family:'Press Start 2P',monospace; font-size:7px; color:rgba(255,255,255,0.85); text-shadow:0 1px 4px rgba(0,0,0,0.8);">
              ${!factionLabel ? map.name : ''}
            </span>
          </div>
        `;
      }

      html += `
        <div class="war-map-card ${!dispute ? (winner === 'union' ? 'dom-union' : winner === 'poder' ? 'dom-poder' : '') : glowClass}" style="background-image: url('${bgUrl}'); position:relative; overflow:hidden;">
          ${cardInnerHtml}
        </div>
      `;

    } catch (err) {
      console.warn(`Error al renderizar tarjeta de mapa para ${map.id}:`, err);
    }
  });
  
  container.innerHTML = html;
}

// ── SISTEMA DE DEFENSA DE FIN DE SEMANA ──

async function openSelectDefensePokeModal(mapId) {
  const myContr = await calculateUserWeeklyContribution();
  const maxSlots = getDefenseSlots(myContr);
  
  // Contar cuántos mapas ya estamos defendiendo esta semana
  const { data: activeDefenses } = await window.sb
    .from('war_defenders')
    .select('id')
    .eq('user_id', window.currentUser.id)
    .eq('week_id', getCurrentWeekId());
  
  const currentUsed = activeDefenses?.length || 0;
  
  if (currentUsed >= maxSlots) {
    notify(`Límite alcanzado (${maxSlots}/${maxSlots} slots). Necesitás más puntos para proteger más rutas.`, '⚠️');
    return;
  }

  const mapName = FIRE_RED_MAPS.find(m => m.id === mapId)?.name || mapId;
  
  const modalHtml = `
    <div id="defense-selector-modal" style="position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:10000; display:flex; flex-direction:column; align-items:center; padding:20px; overflow-y:auto;">
      <div style="width:100%; max-width:600px; background:#1e293b; border-radius:20px; border:2px solid var(--green); padding:24px; box-shadow:0 0 40px rgba(34,197,94,0.3);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <h2 style="font-family:'Press Start 2P', monospace; font-size:12px; color:var(--green); margin:0;">🛡️ PROTEGER ${mapName.toUpperCase()}</h2>
          <button onclick="document.getElementById('defense-selector-modal').remove()" style="background:none; border:none; color:var(--gray); cursor:pointer; font-size:18px;">✕</button>
        </div>
        
        <p style="font-size:11px; color:var(--gray); margin-bottom:20px;">Elegí un Pokémon para defender este mapa. Los rivales que lo derroten enfrentarán a tu campeón. (Solo podés enviar Pokémon que no estén en misiones).</p>
        
        <div id="defense-poke-list" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:12px; max-height:400px; overflow-y:auto; padding:10px; background:rgba(0,0,0,0.2); border-radius:12px; margin-bottom:20px;">
          <!-- Se llena dinámicamente -->
        </div>
        
        <div style="font-size:9px; color:var(--gray); text-align:center;">Slots disponibles: <span style="color:var(--green)">${maxSlots - currentUsed}</span> de ${maxSlots}</div>
      </div>
    </div>
  `;
  
  const div = document.createElement('div');
  div.innerHTML = modalHtml;
  document.body.appendChild(div.firstElementChild);
  
  renderDefensePokeList(mapId);
}

function renderDefensePokeList(mapId) {
  const container = document.getElementById('defense-poke-list');
  if (!container) return;
  
  // Obtener todos los Pokémon (equipo + caja)
  const allPoke = [...(state.team || []), ...(state.box || [])];
  
  let html = '';
  allPoke.forEach(p => {
    if (p.onMission || p.onDefense) return;
    
    // Asegurar que tenga un UID antes de mostrarlo en el modal
    if (!p.uid) {
      p.uid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2,9) + Date.now().toString(36);
    }
    
    html += `
      <div class="def-poke-card" onclick="confirmDefense('${mapId}', '${p.uid}')" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px; text-align:center; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='rgba(34,197,94,0.1)';this.style.borderColor='var(--green)'" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.1)'">
        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${POKEMON_SPRITE_IDS[p.id]}.png" style="width:60px; height:60px; image-rendering:pixelated;">
        <div style="font-size:10px; font-weight:bold; color:white; margin:5px 0;">${p.name}</div>
        <div style="font-size:9px; color:var(--gray);">Nv.${p.level}</div>
      </div>
    `;
  });
  
  if (!html) html = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--gray); font-size:10px;">No tenés Pokémon disponibles.</div>';
  
  container.innerHTML = html;
}

async function confirmDefense(mapId, pokemonUid) {
  const p = [...(state.team || []), ...(state.box || [])].find(x => x.uid === pokemonUid);
  if (!p) return;
  
  const mapName = FIRE_RED_MAPS.find(m => m.id === mapId)?.name || mapId;
  
  if (!confirm(`¿Estás seguro de enviar a ${p.name} a proteger ${mapName}? Quedará asignado allí hasta el lunes.`)) return;
  
  try {
    // Adjuntar nivel del entrenador al objeto del Pokémon (evita errores de columna)
    const pWithLevel = JSON.parse(JSON.stringify(p));
    pWithLevel.trainer_level = state.trainerLevel || 1;

    const { error } = await window.sb.from('war_defenders').insert({
      map_id: mapId,
      week_id: getCurrentWeekId(),
      user_id: window.currentUser.id,
      user_name: window.currentUser.user_metadata?.full_name || state.trainer || 'Entrenador Anónimo',
      user_sprite: state.playerClass ? PLAYER_CLASSES[state.playerClass].sprite : 'https://play.pokemonshowdown.com/sprites/trainers/red-lgpe.png',
      faction: state.faction,
      pokemon_uid: pWithLevel.uid,
      pokemon_data: pWithLevel
    });
    
    if (error) throw error;
    
    notify(`¡${p.name} ahora está protegiendo ${mapName}! 🛡️`, '✅');
    document.getElementById('defense-selector-modal')?.remove();
    renderWarPanel();
  } catch (err) {
    console.error("Error al desplegar defensa:", err);
    notify('Error al desplegar: ' + err.message, '❌');
  }
}

async function tryTriggerDefenderBattle(mapId) {
  // Solo los fines de semana
  if (isDisputePhase()) return false;
  
  // Chance de encontrar defensor (20% normal)
  if (Math.random() > 0.20) return false;
  
  const domInfo = await getMapDominanceStatus(mapId);
  const mapWinner = domInfo?.winner;
  
  // Solo peleamos en rutas enemigas.
  if (!mapWinner || mapWinner === state.faction) return false;
  
  try {
    const query = window.sb
      .from('war_defenders')
      .select('*')
      .eq('map_id', mapId)
      .eq('week_id', getCurrentWeekId());
      
    // No queremos encontrarnos a nosotros mismos
    query.neq('user_id', window.currentUser.id);

    const { data: defenders } = await query.limit(5);
    console.log("[WAR] Defensores encontrados en " + mapId, defenders);
      
    if (!defenders || defenders.length === 0) return false;
    
    // Elegir uno al azar
    const selected = defenders[Math.floor(Math.random() * defenders.length)];
    
    if (typeof startDefenderBattle === 'function') {
      console.log("[WAR] Iniciando batalla contra defensor:", selected.user_name);
      startDefenderBattle(selected);
      return true;
    } else {
      console.error("[WAR] Error: startDefenderBattle no está definida!");
      return false;
    }
  } catch (err) {
    console.warn("Fallo al buscar defensor de guerra:", err);
    return false;
  }
  
  return false;
}

const WAR_SHOP_ITEMS = [
  { id: 'everstone', name: 'Piedra Eterna', desc: 'Equipada en la guardería, asegura que la cría herede la naturaleza de este padre.', cost: 80, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/everstone.png' },
  { id: 'power_weight', name: 'Pesa Recia', desc: 'Equipada en la guardería, asegura heredar los IVs de PS (Vida) de este padre.', cost: 120, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/power-weight.png' },
  { id: 'power_bracer', name: 'Brazal Recio', desc: 'Equipada en la guardería, asegura heredar los IVs de Ataque de este padre.', cost: 120, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/power-bracer.png' },
  { id: 'power_belt', name: 'Cinto Recio', desc: 'Equipada en la guardería, asegura heredar los IVs de Defensa de este padre.', cost: 120, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/power-belt.png' },
  { id: 'power_lens', name: 'Lente Recia', desc: 'Equipada en la guardería, asegura heredar los IVs de At. Especial de este padre.', cost: 120, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/power-lens.png' },
  { id: 'power_band', name: 'Banda Recia', desc: 'Equipada en la guardería, asegura heredar los IVs de Def. Especial de este padre.', cost: 120, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/power-band.png' },
  { id: 'power_anklet', name: 'Franja Recia', desc: 'Equipada en la guardería, asegura heredar los IVs de Velocidad de este padre.', cost: 120, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/power-anklet.png' },
  
  // Inciensos
  { id: 'incense_fire', name: 'Incienso Fuego', desc: 'Atrae Pokémon de tipo Fuego durante 30 minutos.', cost: 150, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rose-incense.png' },
  { id: 'incense_water', name: 'Incienso Agua', desc: 'Atrae Pokémon de tipo Agua durante 30 minutos.', cost: 150, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/sea-incense.png' },
  { id: 'incense_grass', name: 'Incienso Planta', desc: 'Atrae Pokémon de tipo Planta durante 30 minutos.', cost: 150, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/luck-incense.png' },
  { id: 'incense_normal', name: 'Incienso Normal', desc: 'Atrae Pokémon de tipo Normal durante 30 minutos.', cost: 150, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/full-incense.png' },
  { id: 'incense_ghost', name: 'Incienso Fantasma', desc: 'Atrae Pokémon de tipo Fantasma durante 30 minutos.', cost: 150, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/pure-incense.png' },
  { id: 'incense_psychic', name: 'Incienso Psíquico', desc: 'Atrae Pokémon de tipo Psíquico durante 30 minutos.', cost: 150, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/odd-incense.png' },
];

function showWarShop() {
  const modal = document.getElementById('war-shop-modal');
  if (modal) {
    modal.style.display = 'flex';
    renderWarShop();
  }
}

function closeWarShop() {
  const modal = document.getElementById('war-shop-modal');
  if (modal) modal.style.display = 'none';
}

function renderWarShop() {
  const balance = (state.warCoins || 0) - (state.warCoinsSpent || 0);
  const balDisp = document.getElementById('war-shop-coins-modal');
  if (balDisp) balDisp.textContent = balance;

  const container = document.getElementById('war-shop-items');
  if (!container) return;

  container.innerHTML = WAR_SHOP_ITEMS
    .filter(item => !item.factionRequired || item.factionRequired === state.faction)
    .map(item => {
      const disabled = balance < item.cost;
      return `<div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid #333;border-radius:12px;margin-bottom:12px;background:rgba(255,255,255,0.02);transition:all 0.2s;${disabled?'opacity:0.6':''}" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='rgba(255,255,255,0.02)'">
        <div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.2);border-radius:10px;border:1px solid rgba(255,255,255,0.05);">
          <img src="${item.sprite}" alt="${item.name}" style="width:36px;height:36px;image-rendering:pixelated;">
        </div>
        <div style="flex:1;">
          <div style="font-weight:700;font-size:12px;color:white;margin-bottom:4px;">${item.name}</div>
          <p style="font-size:10px;color:#888;margin:0;line-height:1.4;">${item.desc}</p>
        </div>
        <button onclick="buyWarItem('${item.id}')" ${disabled?'disabled':''} style="background:${disabled?'#222':'linear-gradient(135deg,var(--yellow),#f0a500)'};color:${disabled?'#555':'#111'};border:none;border-radius:10px;padding:10px;font-family:'Press Start 2P',monospace;font-size:8px;font-weight:900;cursor:${disabled?'not-allowed':'pointer'};min-width:80px;box-shadow:${disabled?'none':'0 4px 12px rgba(255,214,10,0.2)'};">
          <i class="fa-solid fa-bolt-lightning"></i> ${item.cost}
        </button>
      </div>`;
    }).join('');
}

async function buyWarItem(itemId) {
  const item = WAR_SHOP_ITEMS.find(i => i.id === itemId);
  const balance = (state.warCoins || 0) - (state.warCoinsSpent || 0);
  if (!item || balance < item.cost) return;

  // Entrega del ítem al inventario usando su nombre como clave
  state.inventory[item.name] = (state.inventory[item.name] || 0) + 1;
  
  state.warCoinsSpent = (state.warCoinsSpent || 0) + item.cost;
  if (typeof scheduleSave === 'function') scheduleSave();
  renderWarShop();
  notify(`¡Compraste ${item.name}!`, '🛒');
}

/**
 * Incrementa el contador de victorias de un defensor en la DB.
 * Se llama cuando un atacante pierde contra un BOSS.
 */
async function incrementDefenderWins(recordId) {
  try {
    // Primero obtenemos el valor actual para no depender de RPC complicados
    const { data } = await window.sb.from('war_defenders').select('wins_count').eq('id', recordId).maybeSingle();
    if (data) {
      await window.sb.from('war_defenders')
        .update({ wins_count: (data.wins_count || 0) + 1 })
        .eq('id', recordId);
    }
  } catch (err) {
    console.warn("No se pudo incrementar victorias del defensor:", err);
  }
}

/**
 * Renderiza la lista de Pokémon que el usuario tiene defendiendo rutas.
 * Permite ver el botín acumulado y retirar al Pokémon.
 */
async function renderMyDefenders() {
  const container = document.getElementById('war-my-defenders-list');
  if (!container) return;
  
  container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray);font-style:italic;">Cargando tus defensores...</div>';
  
  try {
    const { data: defenders, error } = await window.sb
      .from('war_defenders')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('week_id', getCurrentWeekId());
      
    if (error) throw error;
    
    if (!defenders || defenders.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray);font-size:11px;">No tenés Pokémon defendiendo rutas actualmente.</div>';
      return;
    }
    
    container.innerHTML = defenders.map(def => {
      const startTime = new Date(def.created_at);
      const now = new Date();
      const hours = Math.floor((now - startTime) / (1000 * 60 * 60));
      const coins = Math.min(150, (def.wins_count || 0) * 5);
      const passiveXp = hours * 100; // Ejemplo: 100 XP por hora
      
      const map = FIRE_RED_MAPS.find(m => m.id === def.map_id);
      const poke = def.pokemon_data;
      
      // Construir Sprite seguro (fallback a PokeAPI oficial si falta el objeto sprites)
      const pokeId = POKEMON_SPRITE_IDS[poke.id] || 0;
      const spriteUrl = (poke.sprites && (poke.shiny ? poke.sprites.shiny : poke.sprites.front)) 
                        || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.shiny ? 'shiny/' : ''}${pokeId}.png`;
      
      return `<div style="background:rgba(255,255,255,0.03); border:1px solid #333; border-radius:12px; padding:12px; margin-bottom:10px; display:flex; align-items:center; gap:12px;">
        <img src="${spriteUrl}" style="width:40px; height:40px; image-rendering:pixelated;">
        <div style="flex:1;">
          <div style="font-weight:700; font-size:12px;">${poke.name} <span style="color:var(--gray); font-size:10px;">Lv.${poke.level}</span></div>
          <div style="font-size:10px; color:var(--yellow);">${map ? map.icon + ' ' + map.name : def.map_id}</div>
        </div>
        <div style="text-align:right; min-width:100px;">
          <div style="font-size:10px; color:#6BCB77;">💰 +${coins} Monedas</div>
          <div style="font-size:10px; color:#3b82f6;">⭐ +${passiveXp} EXP</div>
          <button onclick="claimDefenseRewards('${def.id}')" style="margin-top:4px; padding:4px 8px; font-size:8px; border-radius:4px; cursor:pointer; background:var(--red); color:white; border:none; font-family:'Press Start 2P';">RETIRAR</button>
        </div>
      </div>`;
    }).join('');
    
  } catch (err) {
    container.innerHTML = `<div style="color:var(--red); font-size:10px;">Error al cargar defensores: ${err.message}</div>`;
  }
}

/**
 * Reclama las recompensas de un defensor y lo devuelve al equipo/caja.
 */
async function claimDefenseRewards(recordId) {
  if (!confirm("¿Seguro que querés retirar a este Pokémon y reclamar sus recompensas?")) return;
  
  try {
    const { data: def, error: fetchErr } = await window.sb
      .from('war_defenders')
      .select('*')
      .eq('id', recordId)
      .maybeSingle();
      
    if (fetchErr || !def) throw new Error("No se encontró el registro de defensa.");
    
    // Calcular recompensas
    const startTime = new Date(def.created_at);
    const hours = Math.floor((new Date() - startTime) / (1000 * 60 * 60));
    const coins = Math.min(150, (def.wins_count || 0) * 5);
    const xpToGive = hours * 100;
    
    // 1. Dar monedas
    state.warCoins = (state.warCoins || 0) + coins;
    
        // 2. Dar XP al Pokémon (buscamos el original en equipo/caja)
    let found = false;
    let blockedByEverstone = false;
    const allPokes = [...(state.team || []), ...(state.box || [])];
    const poke = allPokes.find(p => p.uid === def.pokemon_uid);
    
    if (poke) {
      if (poke.level < 100) {
        poke.exp = (poke.exp || 0) + xpToGive;
        while (poke.exp >= poke.expNeeded && poke.level < 100) {
          if (typeof isLevelBlockedByEverstone === 'function' && isLevelBlockedByEverstone(poke)) {
            blockedByEverstone = true;
            break;
          }
          poke.exp -= poke.expNeeded;
          const pending = levelUpPokemon(poke);
          if (pending === null) {
            blockedByEverstone = true;
            break;
          }
        }
      }
      poke.onDefense = false;
      found = true;
    }
    
    // 3. Eliminar de la DB
    await window.sb.from('war_defenders').delete().eq('id', recordId);
    
    const blockMsg = blockedByEverstone ? ' No subio de nivel porque lleva Piedra Eterna.' : '';
    notify(`¡Defensor retirado! Ganaste ⚡${coins} y ${xpToGive} EXP.${blockMsg}`, '🛡️');
    
    if (typeof saveGame === 'function') saveGame(false);
    renderMyDefenders();
    renderWarPanel();
    
  } catch (err) {
    console.error("Error al reclamar:", err);
    notify("Error al reclamar recompensas: " + err.message, '❌');
  }
}


