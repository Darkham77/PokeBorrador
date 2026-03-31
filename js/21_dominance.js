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
  return day >= 1 && day <= 5; // Lunes a Viernes
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
  if (state.faction) return; // Ya elegido
  const userId = window.currentUser?.id;
  const email = window.currentUser?.email;
  if (!userId) { notify('Debés iniciar sesión online para elegir facción.', '⛔'); return; }
  
  const { error } = await window.sb
    .from('war_factions')
    .insert({ user_id: userId, faction });
    
  if (!error || error.code === '23505') { // 23505 = conflict/already exists
    state.faction = faction;
    if (typeof scheduleSave === 'function') scheduleSave();
    const bdg = document.getElementById('player-faction-badge');
    if (bdg) {
      bdg.textContent = state.faction === 'union' ? '🟢 Unión' : '🟣 Poder';
      bdg.className = `faction-badge ${state.faction}`;
    }
    const modal = document.getElementById('faction-choice-modal');
    if (modal) modal.style.display = 'none';
    notify(`¡Te uniste al Team ${faction === 'union' ? 'Unión' : 'Poder'}!`, '⚔️');
    
    // Forzar guardado
    if (typeof saveGame === 'function') saveGame(false);
  } else {
    notify('Error al registrar facción. Reintentá. ' + error.message, '⛔');
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
  if (data && data.faction) {
    state.faction = data.faction;
  }
}

function checkDailyCapNotReached(mapId, pts) {
  const today = new Date().toDateString();
  if (!state.warDailyCap) state.warDailyCap = {};
  if (!state.warDailyCap[today]) state.warDailyCap = { [today]: {} };
  if (!state.warDailyCap[today][mapId]) state.warDailyCap[today][mapId] = 0;

  if (state.warDailyCap[today][mapId] >= 300) return false;
  state.warDailyCap[today][mapId] += pts;
  return true;
}

function addWarCoinsLocal(coins) {
  if (coins <= 0) return;
  if (typeof state.warCoins !== 'number') state.warCoins = 0;
  state.warCoins += coins;
  if (typeof scheduleSave === 'function') scheduleSave();
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

  const weekId = getCurrentWeekId();

  if (!checkDailyCapNotReached(mapId, pts)) return;

  try {
    await window.sb.rpc('add_war_points', {
      p_week_id: weekId,
      p_map_id: mapId,
      p_faction: state.faction,
      p_points: pts
    });
    
    // Nueva Lógica de Monedas Acumulativas
    if (!state.warPointsAccumulator) state.warPointsAccumulator = 0;
    state.warPointsAccumulator += pts;
    
    if (state.warPointsAccumulator >= 10) {
      const newCoins = Math.floor(state.warPointsAccumulator / 10);
      addWarCoinsLocal(newCoins);
      state.warPointsAccumulator %= 10;
      notify(`¡Ganaste ${newCoins} Moneda${newCoins>1?'s':''} de Guerra!`, '🪙');
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
      .single();
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

  if (isDisputePhase()) return;

  const prevWeekId = getPreviousWeekId(); 
  const { data: allPoints } = await window.sb
    .from('war_points')
    .select('map_id, faction, points')
    .eq('week_id', prevWeekId);

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
      week_id: prevWeekId,
      map_id: mapId,
      winner_faction: winner,
      union_points: pts.union,
      poder_points: pts.poder
    });
  }

  await distributeWeeklyWarCoins(prevWeekId);

  state.lastResolvedWeek = currentWeekId;
  if (typeof scheduleSave === 'function') scheduleSave();
  await loadActiveBonuses();
}

function calculateTotalPtThisWeek() {
  const cap = state.warDailyCap || {};
  let total = 0;
  Object.keys(cap).forEach(date => {
     Object.values(cap[date]).forEach(pts => total += pts);
  });
  return total;
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

  const totalPtContributed = calculateTotalPtThisWeek();
  let coins = 0;
  if (totalPtContributed >= 1501) coins = 150;
  else if (totalPtContributed >= 501) coins = 75;
  else if (totalPtContributed >= 101) coins = 35;
  else if (totalPtContributed >= 1) coins = 10;

  const didFactionWin = await checkFactionWeeklyWin(weekId);
  if (didFactionWin) coins += 50;

  if (coins > 0) {
    addWarCoinsLocal(coins);
    notify(`Fin de guerra. ¡Recibiste ${coins} Monedas de Guerra!`, '🪙');
  }
}

// ── SISTEMA DE GUARDIANES ──
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
    { id: 'aerodactyl', lv: 58, pts: 750 }, { id: 'cloyster',   lv: 52, pts: 750 }
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
  const dateStr = new Date().toISOString().split('T')[0];
  const allMapIds = FIRE_RED_MAPS.map(m => m.id);
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

const GUARDIAN_CHANCE = 0.03; 

async function checkGuardianAppearance(mapId) {
  if (!state.faction) return false;
  if (!getGuardianForMap(mapId)) return false;

  const today = new Date().toISOString().split('T')[0];
  const { data } = await window.sb
    .from('guardian_captures')
    .select('winner_faction')
    .eq('capture_date', today)
    .eq('map_id', mapId)
    .maybeSingle();

  if (data) return false; 

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
      <div style="font-size:50px;animation:pulse 1s infinite;">⚠️</div>
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
  const today = new Date().toISOString().split('T')[0];

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
    if (error.code === '23505') notify('El Guardián ya fue capturado por alguien más hoy.', 'ℹ️');
    return false;
  }

  pokemon.isGuardian = true;
  pokemon.guardianFaction = state.faction;
  
  // Usar addWarPoints con override para centralizar monedas y guardado
  await addWarPoints(mapId, 'guardian', true, ptsAwarded);
  
  notify(`¡Capturaste al Guardián! Has reclamado ${ptsAwarded} PT para Team ${state.faction === 'union' ? 'Unión' : 'Poder'}.`, '🏆');
  return true;
}

async function recordGuardianDefeat(mapId, ptsAwarded) {
  const userId = window.currentUser?.id;
  const today = new Date().toISOString().split('T')[0];

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

function getDominanceShinyMultiplier(mapId) { return hasDominanceBonus(mapId) ? 2 : 1; }
function getDominanceExpMultiplier(mapId) { return hasDominanceBonus(mapId) ? 1.25 : 1; }

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
  domData?.forEach(r => {
    if (r.winner_faction === 'union') unionMaps++;
    else poderMaps++;
  });

  const domU = document.getElementById('union-maps');
  const domP = document.getElementById('poder-maps');
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

      // Mi contribución
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
      const mondayStr = monday.toISOString().split('T')[0];

      const { data: myMatches } = await window.sb
        .from('guardian_captures')
        .select('pts_awarded')
        .eq('user_id', userId)
        .gte('capture_date', mondayStr);
      
      const totalContributed = myMatches?.reduce((sum, m) => sum + m.pts_awarded, 0) || 0;
      const myPtsDisp = document.getElementById('war-my-pts');
      if (myPtsDisp) myPtsDisp.textContent = totalContributed + " PT";
    }
  } catch (err) {
    console.warn("Fallo al cargar stats personales de guerra:", err);
  }

  renderKantoWarGrid(ptsData || [], domData || []);
}

function renderKantoWarGrid(ptsData, domData) {
  const container = document.getElementById('war-kanto-map');
  if (!container) return;

  const dispute = isDisputePhase();
  let html = '';

  const mapsArray = window.FIRE_RED_MAPS || [];
  // Filtrar mapas relevantes (con batallas)
  const relevantMaps = mapsArray.filter(m => m.wild && Object.keys(m.wild).length > 0);

  if (relevantMaps.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--gray); font-size:10px;">Monitor no disponible.</div>';
    return;
  }

  relevantMaps.forEach(map => {
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

    const domInfo = domData.find(d => d.map_id === map.id);
    const winner = domInfo?.winner_faction;
    const glowClass = winner === 'union' ? 'winner-glow-union' : (winner === 'poder' ? 'winner-glow-poder' : '');
    
    // Imagen
    const imgName = WAR_MAP_IMAGES[map.id] || 'default.png';
    const bgUrl = `maps/${imgName}`;

    html += `
      <div class="war-map-card ${glowClass}" style="background-image: url('${bgUrl}');">
        <div class="war-card-overlay">
          <div class="war-card-top">
            <span class="war-card-name">${map.name}</span>
            ${isConflict ? '<span class="war-card-status-tag dispute">⚔️ GUERRA</span>' : ''}
            ${!dispute && winner ? `<span class="war-card-status-tag dominance">${winner.toUpperCase()} DOMINA</span>` : ''}
          </div>

          <!-- BARRA CENTRAL GRANDE -->
          <div class="war-central-progress-box">
            <div class="war-central-labels">
              <span style="color:var(--union-color)">UNIÓN</span>
              <span style="color:var(--poder-color)">PODER</span>
            </div>
            <div class="war-central-bar">
              <div class="bar-union" style="width:${pctU}%"></div>
              <div class="bar-poder" style="width:${pctP}%"></div>
            </div>
            <div class="war-central-labels" style="font-size:5px; opacity:0.8;">
              <span>${pU} PT</span>
              <span>${pP} PT</span>
            </div>
          </div>
          
          <div style="font-size:6px; color:rgba(255,255,255,0.5); font-family:'Press Start 2P'; text-align:center;">
             ${total > 0 ? (pU > pP ? 'Lidera Unión' : (pP > pU ? 'Lidera Poder' : 'Empate Técnico')) : 'Sin actividad'}
          </div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

const WAR_SHOP_ITEMS = [
  { id: 'shiny_stone', name: 'Piedra Brillante', desc: 'Triplica la probabilidad shiny de un huevo.', cost: 300, icon: '💎' },
  { id: 'tm_rare_1', name: 'MT99 — Llamarada', desc: 'Movimiento MT exótico.', cost: 200, icon: '🔥' },
  { id: 'cosmetic_frame_union', name: 'Marco Unión', desc: 'Decoración de perfil exclusiva.', cost: 100, icon: '🟢', factionRequired: 'union' },
  { id: 'cosmetic_frame_poder', name: 'Marco Poder', desc: 'Decoración de perfil exclusiva.', cost: 100, icon: '🟣', factionRequired: 'poder' },
  { id: 'title_conquistador', name: 'Título: Conquistador de Kanto', desc: 'Visible en tu perfil público.', cost: 500, icon: '🏆' },
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
  const balance = state.warCoins - (state.warCoinsSpent || 0);
  const balDisp = document.getElementById('war-shop-coins-modal');
  if (balDisp) balDisp.textContent = balance;

  const container = document.getElementById('war-shop-items');
  if (!container) return;

  container.innerHTML = WAR_SHOP_ITEMS
    .filter(item => !item.factionRequired || item.factionRequired === state.faction)
    .map(item => {
      const disabled = balance < item.cost;
      return `<div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid #333;border-radius:8px;margin-bottom:8px;${disabled?'opacity:0.5':''}">
        <span style="font-size:24px;">${item.icon}</span>
        <div style="flex:1;">
          <strong style="font-size:11px;color:white;">${item.name}</strong>
          <p style="font-size:9px;color:#aaa;margin:4px 0 0 0;">${item.desc}</p>
        </div>
        <button onclick="buyWarItem('${item.id}')" ${disabled?'disabled':''} style="background:${disabled?'#333':'var(--yellow)'};color:${disabled?'#888':'var(--dark)'};border:none;border-radius:8px;padding:8px;font-family:'Press Start 2P',monospace;font-size:8px;font-weight:900;cursor:${disabled?'not-allowed':'pointer'};">
          🪙 ${item.cost}
        </button>
      </div>`;
    }).join('');
}

async function buyWarItem(itemId) {
  const item = WAR_SHOP_ITEMS.find(i => i.id === itemId);
  const balance = state.warCoins - (state.warCoinsSpent || 0);
  if (!item || balance < item.cost) return;

  if (item.id === 'shiny_stone') {
    addToInventory('shiny_stone', 1);
  } else if (item.id === 'tm_rare_1') {
    addToInventory('tm_llamarada', 1);
  } else if (item.id.startsWith('cosmetic_frame_')) {
    state.profileFrame = item.id;
  } else if (item.id === 'title_conquistador') {
    state.title = 'Conquistador de Kanto';
  }
  
  state.warCoinsSpent = (state.warCoinsSpent || 0) + item.cost;
  if (typeof scheduleSave === 'function') scheduleSave();
  renderWarShop();
  notify(`Compraste ${item.name}!`, '🛒');
}
