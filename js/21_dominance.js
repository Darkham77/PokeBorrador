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

async function addWarPoints(mapId, eventType, success) {
  if (!state.faction) return;
  if (!isDisputePhase()) return; 

  const PTS_TABLE = {
    capture:        { win: 5,  lose: 1 },
    trainer_win:    { win: 8,  lose: 2 },
    wild_win:       { win: 2,  lose: 0 },
    fishing:        { win: 4,  lose: 1 },
    shiny_capture:  { win: 40, lose: 10 },
    event:          { win: 20, lose: 5 },
  };

  const ptRecord = PTS_TABLE[eventType] || { win: 2, lose: 0 };
  const pts = success ? ptRecord.win : ptRecord.lose;
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
    addWarCoinsLocal(Math.floor(pts / 10));
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
  
  await addWarPoints(mapId, 'event', true); 
  await window.sb.rpc('add_war_points', {
    p_week_id: getCurrentWeekId(),
    p_map_id: mapId,
    p_faction: state.faction,
    p_points: ptsAwarded
  });
  
  notify(`¡Capturaste al Guardián! Has reclamado ${ptsAwarded} PT para Team ${state.faction === 'union' ? 'Unión' : 'Poder'}.`, '🏆');
  return true;
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

  const banner = document.getElementById('war-phase-banner');
  if (banner) {
    banner.innerHTML = `<div style="padding:10px;border-radius:8px;text-align:center;font-family:'Press Start 2P',monospace;font-size:10px;margin-bottom:16px;
      ${dispute ? 'background:#1a0f00;border:1px solid #ff8800;color:#ff8800;' : 'background:#001a00;border:1px solid #44ff44;color:#44ff44;'}">
      ${dispute ? '⚔️ Semana en Disputa — Lunes a Viernes' : '🏆 Fin de Semana de Dominancia'}
    </div>`;
  }

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
  
  const coinDisp = document.getElementById('war-coins-count');
  if (coinDisp) coinDisp.textContent = state.warCoins - (state.warCoinsSpent || 0);

  renderKantoWarGrid(domData || []);
}

function renderKantoWarGrid(domData) {
  const container = document.getElementById('war-kanto-map');
  if (!container) return;

  // Mostramos solo un subset de mapas clave o todos los mapas
  let html = '';
  FIRE_RED_MAPS.forEach(map => {
    const isConflict = isDisputePhase() && isConflictZone(map.id);
    let domBadge = '';
    
    if (isDisputePhase()) {
      if (isConflict) domBadge = '<span style="color:#ff8800;font-size:8px;">⚔️ En disputa hoy</span>';
      else domBadge = '<span style="color:#666;font-size:8px;">Tranquilo</span>';
    } else {
      const w = domData.find(d => d.map_id === map.id);
      if (w?.winner_faction === 'union') domBadge = '<span style="color:#66ff66;font-size:8px;">🟢 Unión</span>';
      else if (w?.winner_faction === 'poder') domBadge = '<span style="color:#ff66ff;font-size:8px;">🟣 Poder</span>';
      else domBadge = '<span style="color:#888;font-size:8px;">Empate</span>';
    }

    html += `<div style="background:rgba(255,255,255,0.05);padding:10px;border-radius:10px;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:10px;color:white;">🗺️ ${map.name}</span>
      ${domBadge}
    </div>`;
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
