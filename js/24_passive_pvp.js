// ===== SISTEMA DE EQUIPOS PASIVOS, ELO Y MATCHMAKING RANKED =====
// Este archivo es un <script> inline — NO usar export/import.

// ── Constantes de Temporada ───────────────────────────────────────────
const SEASON_START = new Date('2026-04-01T00:00:00-03:00');
const SEASON_DURATION_MONTHS = 3;

function getSeasonEndDate() {
  const end = new Date(SEASON_START);
  end.setMonth(end.getMonth() + SEASON_DURATION_MONTHS);
  return end;
}

// ── Tiers de ELO ─────────────────────────────────────────────────────
function getEloTier(elo) {
  if (elo >= 2000) return { name: 'Maestro',  icon: '👑', color: '#FFD700' };
  if (elo >= 1600) return { name: 'Diamante', icon: '💎', color: '#89CFF0' };
  if (elo >= 1300) return { name: 'Platino',  icon: '🔶', color: '#E5C100' };
  if (elo >= 1100) return { name: 'Oro',      icon: '🥇', color: '#FFB800' };
  if (elo >= 900)  return { name: 'Plata',    icon: '🥈', color: '#9E9E9E' };
  return                   { name: 'Bronce',  icon: '🥉', color: '#c8a060' };
}

// ── Snapshot para equipo pasivo ───────────────────────────────────────
function buildPassiveSnapshot(p) {
  return {
    id: p.id,
    name: p.name,
    level: p.level,
    type: p.type,
    ability: p.ability || null,
    nature: p.nature || 'Serio',
    ivs: p.ivs || { hp:15, atk:15, def:15, spa:15, spd:15, spe:15 },
    maxHp: p.maxHp,
    atk: p.atk, def: p.def, spa: p.spa, spd: p.spd, spe: p.spe,
    moves: (p.moves || []).map(m => ({
      name: m.name,
      pp: m.maxPP || m.pp,
      maxPP: m.maxPP || m.pp,
      ppUps: m.ppUps || 0
    })),
    isShiny: p.isShiny || false,
  };
}

// ── Cargar ELO del jugador ────────────────────────────────────────────
async function loadPlayerElo() {
  if (!currentUser || !sb) return;
  const { data } = await sb.from('profiles')
    .select('elo_rating, pvp_wins, pvp_losses, pvp_draws')
    .eq('id', currentUser.id)
    .single();
  if (data) {
    state.eloRating   = data.elo_rating  || 1000;
    state.pvpStats    = {
      wins:   data.pvp_wins   || 0,
      losses: data.pvp_losses || 0,
      draws:  data.pvp_draws  || 0
    };
  }
}

// ── Renderizar el tab Rankeds ─────────────────────────────────────────
function renderRankedTab() {
  const elo   = state.eloRating || 1000;
  const stats = state.pvpStats  || { wins: 0, losses: 0, draws: 0 };
  const tier  = getEloTier(elo);

  // ELO display
  const eloEl = document.getElementById('ranked-elo-display');
  if (eloEl) {
    eloEl.textContent = elo;
    eloEl.style.color = tier.color;
    eloEl.style.textShadow = `0 0 20px ${tier.color}88`;
  }
  const tierEl = document.getElementById('ranked-tier-label');
  if (tierEl) tierEl.textContent = tier.icon + ' ' + tier.name;

  // Stats
  const wEl = document.getElementById('ranked-wins');   if (wEl) wEl.textContent = stats.wins;
  const lEl = document.getElementById('ranked-losses'); if (lEl) lEl.textContent = stats.losses;
  const dEl = document.getElementById('ranked-draws');  if (dEl) dEl.textContent = stats.draws;

  const total = stats.wins + stats.losses;
  const wrEl  = document.getElementById('ranked-winrate');
  if (wrEl) wrEl.textContent = total > 0 ? Math.round((stats.wins / total) * 100) + '%' : '—';

  // Season timer
  const timerEl = document.getElementById('ranked-season-timer');
  if (timerEl) {
    const now  = new Date();
    const end  = getSeasonEndDate();
    const diff = end - now;
    if (diff <= 0) {
      timerEl.textContent = 'La temporada ha finalizado.';
    } else {
      const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      timerEl.textContent = `Termina en ${days}d ${hours}h`;
    }
  }

  renderPassiveTeamPreview();

  // Si hay una búsqueda activa, restaurar el estado visual
  if (_matchmakingInterval) {
    _showSearchingUI(true);
  }
}

// ── Helper para obtener Pokémon válidos por UID ───────────────────────
function getPokemonByUid(uid) {
  if (!uid) return null;
  const inTeam = (state.team || []).find(p => p.uid === uid);
  if (inTeam) return inTeam;
  const inBox = (state.box || []).find(p => p.uid === uid);
  return inBox || null;
}

// ── Preview de equipo pasivo ──────────────────────────────────────────
function renderPassiveTeamPreview() {
  const el = document.getElementById('ranked-passive-team-preview');
  if (!el) return;
  
  const uids = state.passiveTeamUids || [];
  if (!uids.length) {
    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;width:100%;padding:10px;border:1px dashed rgba(255,255,255,0.2);border-radius:12px;">
        <span style="font-size:11px;color:rgba(255,255,255,0.3);">No configurado</span>
      </div>`;
    return;
  }
  
  let validCount = 0;
  validCount = uids.reduce((acc, uid) => acc + (getPokemonByUid(uid) ? 1 : 0), 0);
  
  const isValid = validCount === uids.length;
  const borderColor = isValid ? 'var(--green)' : 'var(--red)';
  const glow = isValid ? 'rgba(107,203,119,0.3)' : 'rgba(255,59,59,0.3)';
  const label = isValid ? '✅ EQUIPO PREPARADO' : '❌ EQUIPO NO PREPARADO (Pokémon faltante)';

  let htmlSprites = '';
  uids.forEach(uid => {
    const p = getPokemonByUid(uid);
    if (!p) {
      // Empty/Missing slot box
      htmlSprites += `<div style="width:40px;height:40px;border:1px dashed var(--red);border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(255,59,59,0.1);"><span style="color:var(--red);font-size:10px;">?</span></div>`;
      return;
    }
    const num = p.dexNum || p.id || '';
    const itemName = p.heldItem || null;
    let itemHtml = '';
    
    // Add item miniature logic if exists
    if (itemName && typeof ITEM_DATA !== 'undefined' && ITEM_DATA[itemName]) {
       if (ITEM_DATA[itemName].sprite) {
         itemHtml = `<img src="${ITEM_DATA[itemName].sprite}" style="position:absolute;bottom:-4px;right:-4px;width:16px;height:16px;image-rendering:pixelated;filter:drop-shadow(0 0 2px #000);">`;
       } else if (ITEM_DATA[itemName].icon) {
         itemHtml = `<span style="position:absolute;bottom:-4px;right:-4px;font-size:12px;filter:drop-shadow(0 0 2px #000);">${ITEM_DATA[itemName].icon}</span>`;
       }
    }

    const spriteUrl = typeof getSpriteUrl === 'function' ? getSpriteUrl(p.id, p.isShiny) : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${num}.png`;

    htmlSprites += `<div style="position:relative;width:40px;height:40px;background:rgba(255,255,255,0.05);border-radius:8px;display:flex;align-items:center;justify-content:center;border:1px solid ${isValid ? 'rgba(107,203,119,0.4)': 'rgba(255,59,59,0.4)'};">
      <img src="${spriteUrl}" style="width:100%;height:100%;image-rendering:pixelated;" title="${p.name}" onerror="this.style.display='none'">
      ${itemHtml}
    </div>`;
  });

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;width:100%;gap:10px;padding:12px;border:2px solid ${borderColor};border-radius:14px;box-shadow:0 0 15px ${glow};background:rgba(0,0,0,0.4);">
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;min-height:40px;">
        ${htmlSprites}
      </div>
      <div style="text-align:center;font-family:'Press Start 2P',monospace;font-size:7px;color:${borderColor};">
        ${label}
      </div>
    </div>
  `;
}

// ── Guardar equipo pasivo ─────────────────────────────────────────────
async function savePassiveTeam(active = true) {
  if (!currentUser) { notify('Debés estar logueado', '⚠️'); return; }
  
  const uids = state.passiveTeamUids || [];
  if (active && (!uids || !uids.length)) {
    notify('Tenés que armar tu equipo pasivo (Editar) antes de activarlo.', '⚠️'); 
    return;
  }
  
  if (!active) {
    // Apagar directamente
    const { error } = await sb.from('passive_teams').upsert({
      user_id: currentUser.id, team_data: [], elo_rating: state.eloRating || 1000, is_active: false, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    if (error) { notify('Error desactivando', '❌'); return; }
    notify('Equipo pasivo desactivado', '🔴');
    return;
  }

  // Active is True, let's validate and snapshot
  const teamObjs = uids.map(uid => getPokemonByUid(uid));
  if (teamObjs.some(p => !p)) {
    notify('Tu equipo contiene Pokémon que ya no existen. Editalo primero.', '⚠️');
    return;
  }
  
  const eligibleTeam = teamObjs.filter(p => p.hp > 0 && !p.onMission);
  if (!eligibleTeam.length) { notify('Tus Pokémon designados no tienen HP.', '⚠️'); return; }

  const snapshot  = eligibleTeam.map(buildPassiveSnapshot);
  const eloRating = state.eloRating || 1000;

  const { error } = await sb.from('passive_teams').upsert({
    user_id:    currentUser.id,
    team_data:  snapshot,
    elo_rating: eloRating,
    is_active:  active,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  if (error) { notify('Error guardando equipo: ' + error.message, '❌'); return; }
  notify('Equipo Rankeds activado correctamente ✓', '🤖');
}

// ── Editor Visual de Equipo (Rankeds Modal) ───────────────────────────
let _tempEditingUids = [];
let _passiveEditorSelectedUid = null;

function openPassiveTeamEditor() {
  const modal = document.getElementById('passive-team-editor-modal');
  if (!modal) return;
  _tempEditingUids = [...(state.passiveTeamUids || [])];
  _passiveEditorSelectedUid = null;
  
  // Limpiar vacíos o perdidos de the DB original for default
  _tempEditingUids = _tempEditingUids.filter(uid => getPokemonByUid(uid) !== null);

  modal.style.display = 'flex';
  _renderPassiveEditor();
}

function closePassiveTeamEditor() {
  document.getElementById('passive-team-editor-modal').style.display = 'none';
}

function _renderPassiveEditor() {
  const slotsEl   = document.getElementById('passive-editor-slots');
  const poolEl    = document.getElementById('passive-editor-pool');
  const previewEl = document.getElementById('passive-editor-preview');
  if (!slotsEl || !poolEl || !previewEl) return;
  
  // Render de los 6 Slots
  let htmlSlots = '';
  for (let i = 0; i < 6; i++) {
    const uid = _tempEditingUids[i];
    const p = uid ? getPokemonByUid(uid) : null;
    
    let spriteUrl = '';
    if (p) {
        spriteUrl = typeof getSpriteUrl === 'function' ? getSpriteUrl(p.id, p.isShiny) : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.dexNum||p.id}.png`;
    }

    htmlSlots += `
      <div onclick="if(typeof _selectPassiveEditorItem==='function')_selectPassiveEditorItem('${uid}')"
      style="width:50px;height:50px;border:2px dashed ${p ? 'var(--purple)' : 'rgba(255,255,255,0.2)'};border-radius:10px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);cursor:pointer;position:relative;">
        ${p ? `<img src="${spriteUrl}" style="width:100%;height:100%;image-rendering:pixelated;" onerror="this.style.display='none'">` : '<span style="color:#666;font-size:16px;">+</span>'}
        ${p && _tempEditingUids.includes(uid) ? `<div style="position:absolute;bottom:-4px;right:-4px;background:var(--green);border-radius:50%;width:12px;height:12px;display:flex;align-items:center;justify-content:center;"><span style="color:#000;font-size:8px;">✓</span></div>` : ''}
      </div>
    `;
  }
  slotsEl.innerHTML = htmlSlots;

  // Render Preview Panel
  if (_passiveEditorSelectedUid) {
    const sp = getPokemonByUid(_passiveEditorSelectedUid);
    if (sp) {
      previewEl.style.display = 'flex';
      const isEquipped = _tempEditingUids.includes(sp.uid);
      const itemName = sp.heldItem || 'Ninguno';
      let itemImg = '';
      if (itemName !== 'Ninguno' && typeof ITEM_DATA !== 'undefined' && ITEM_DATA[itemName]) {
        if (ITEM_DATA[itemName].sprite) {
           itemImg = `<img src="${ITEM_DATA[itemName].sprite}" style="width:16px;height:16px;image-rendering:pixelated;margin-right:4px;">`;
        } else if (ITEM_DATA[itemName].icon) {
           itemImg = `<span style="font-size:14px;margin-right:2px;">${ITEM_DATA[itemName].icon}</span>`;
        }
      }
      
      const spSpriteUrl = typeof getSpriteUrl === 'function' ? getSpriteUrl(sp.id, sp.isShiny) : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${sp.dexNum||sp.id}.png`;

      previewEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:16px;width:100%;">
          <div style="background:rgba(255,255,255,0.1);border-radius:12px;padding:8px;">
            <img src="${spSpriteUrl}" style="width:60px;height:60px;image-rendering:pixelated;" onerror="this.style.display='none'">
          </div>
          <div style="flex:1;">
            <div style="font-family:'Press Start 2P',monospace;font-size:12px;color:var(--yellow);margin-bottom:6px;">${sp.name} <span style="font-size:9px;color:var(--gray);">Lv${sp.level}</span></div>
            <div style="font-size:10px;color:rgba(255,255,255,0.8);margin-bottom:4px;display:flex;align-items:center;">
              <span style="font-weight:bold;margin-right:6px;">Objeto:</span> ${itemImg} ${itemName}
            </div>
            <div style="font-size:10px;color:rgba(255,255,255,0.8);margin-bottom:4px;">
              <span style="font-weight:bold;">Hab:</span> ${sp.ability || 'Genérica'} | <span style="font-weight:bold;">Nat:</span> ${sp.nature || 'Seria'}
            </div>
          </div>
        </div>
        <button onclick="_togglePassiveEditorSelection()" style="margin-top:12px;width:100%;font-family:'Press Start 2P',monospace;font-size:9px;padding:12px;border:none;border-radius:8px;cursor:pointer;
          background:${isEquipped ? 'var(--red)' : 'var(--green)'};color:${isEquipped ? '#fff' : '#000'};">
          ${isEquipped ? 'Quitar del Equipo' : 'Asignar al Equipo'}
        </button>
      `;
    } else {
      previewEl.style.display = 'none';
    }
  } else {
    previewEl.style.display = 'none';
  }
  
  // Render Pool (Equipo + Caja combinados)
  const allAvailable = [...(state.team || []), ...(state.box || [])].filter(p => !p.onMission);
  let htmlPool = '';
  
  allAvailable.forEach(p => {
    const isSelected = _tempEditingUids.includes(p.uid);
    const isPreviewing = _passiveEditorSelectedUid === p.uid;
    const poolSpriteUrl = typeof getSpriteUrl === 'function' ? getSpriteUrl(p.id, p.isShiny) : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.dexNum||p.id}.png`;
    
    let heldItemHtml = '';
    if (p.heldItem && typeof ITEM_DATA !== 'undefined' && ITEM_DATA[p.heldItem]) {
       if (ITEM_DATA[p.heldItem].sprite) {
         heldItemHtml = `<img src="${ITEM_DATA[p.heldItem].sprite}" style="position:absolute;top:2px;right:2px;width:12px;height:12px;image-rendering:pixelated;">`;
       } else if (ITEM_DATA[p.heldItem].icon) {
         heldItemHtml = `<span style="position:absolute;top:2px;right:2px;font-size:8px;">${ITEM_DATA[p.heldItem].icon}</span>`;
       }
    }

    htmlPool += `
      <div onclick="if(typeof _selectPassiveEditorItem==='function')_selectPassiveEditorItem('${p.uid}')"
      style="border:1px solid ${isPreviewing ? 'var(--purple)' : (isSelected ? 'var(--green)' : 'rgba(255,255,255,0.1)')};border-radius:8px;padding:4px;display:flex;flex-direction:column;align-items:center;cursor:pointer;background:${isPreviewing ? 'rgba(199,125,255,0.2)' : (isSelected ? 'rgba(107,203,119,0.1)' : 'rgba(0,0,0,0.3)')};opacity:${!isPreviewing && isSelected ? '0.5' : '1'};position:relative;">
        <img src="${poolSpriteUrl}" style="width:40px;height:40px;image-rendering:pixelated;" onerror="this.style.display='none'">
        <div style="font-family:'Press Start 2P',monospace;font-size:6px;margin-top:2px;text-align:center;word-break:break-all;">Lv${p.level}</div>
        ${heldItemHtml}
      </div>
    `;
  });
  
  poolEl.innerHTML = htmlPool;
}

function _selectPassiveEditorItem(uid) {
  if (uid === 'undefined' || !uid) return;
  _passiveEditorSelectedUid = uid;
  _renderPassiveEditor();
}

function _togglePassiveEditorSelection() {
  if (!_passiveEditorSelectedUid) return;
  if (_tempEditingUids.includes(_passiveEditorSelectedUid)) {
    // Quitar
    _tempEditingUids = _tempEditingUids.filter(u => u !== _passiveEditorSelectedUid);
  } else {
    // Agregar
    if (_tempEditingUids.length < 6) {
      _tempEditingUids.push(_passiveEditorSelectedUid);
    } else {
      notify('¡Tu equipo ya tiene 6 Pokémon!', '⚠️');
    }
  }
  _renderPassiveEditor();
}

function confirmPassiveTeamEdit() {
  state.passiveTeamUids = [..._tempEditingUids];
  scheduleSave();
  closePassiveTeamEditor();
  renderPassiveTeamPreview();
  notify('Alineación guardada localmente.', '💾');
}


// ── Buscar equipo pasivo para el fallback ─────────────────────────────
async function findPassiveOpponent() {
  if (!currentUser) return null;
  const myElo = state.eloRating || 1000;
  const range  = 200;

  const { data, error } = await sb.from('passive_teams')
    .select('user_id, team_data, elo_rating')
    .eq('is_active', true)
    .neq('user_id', currentUser.id)
    .gte('elo_rating', myElo - range)
    .lte('elo_rating', myElo + range)
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error || !data?.length) return null;
  return data[Math.floor(Math.random() * data.length)];
}

// ── Estado de Matchmaking ─────────────────────────────────────────────
let _matchmakingInterval = null;
let _matchmakingTimeout  = null;
let _matchmakingSeconds  = 60;
let _matchmakingQueueId  = null;   // Row en la tabla ranked_queue

// ── Entrada: Buscar Partida ───────────────────────────────────────────
async function startRankedMatchmaking() {
  if (!currentUser) { notify('Debés estar logueado', '⚠️'); return; }
  if (_matchmakingInterval) return; // Ya buscando

  const myTeam = (state.team || []).filter(p => p.hp > 0 && !p.onMission);
  if (!myTeam.length) { notify('Necesitás al menos 1 Pokémon con HP para buscar partida', '⚠️'); return; }

  // Registrar en la cola de matchmaking (tabla ranked_queue en Supabase)
  // Si la tabla no existe aún, sigue igual pero el matchmaking funcionará solo por fallback
  const myElo = state.eloRating || 1000;
  try {
    const { data: qRow, error: qErr } = await sb.from('ranked_queue').insert({
      user_id:    currentUser.id,
      elo_rating: myElo,
      status:     'searching',
    }).select('id').single();

    if (!qErr && qRow?.id) {
      _matchmakingQueueId = qRow.id;
    }
  } catch(e) {
    // La tabla puede no existir aún — el fallback a pasivo funciona igual
    console.warn('[Matchmaking] ranked_queue no disponible, modo fallback activo.');
  }

  _matchmakingSeconds = 60;
  _showSearchingUI(true);

  // Countdown visual cada segundo
  _matchmakingInterval = setInterval(() => {
    _matchmakingSeconds--;
    const timerEl = document.getElementById('ranked-search-timer');
    if (timerEl) {
      timerEl.textContent = _matchmakingSeconds;
      // Cambiar color cuando queda poco tiempo
      timerEl.style.color = _matchmakingSeconds <= 10 ? 'var(--red)' : 'var(--purple)';
    }

    // Cada 5 segundos, buscar un oponente humano en la cola
    if (_matchmakingSeconds % 5 === 0) {
      _checkForHumanOpponent();
    }

    if (_matchmakingSeconds <= 0) {
      _matchmakingFallbackToPassive();
    }
  }, 1000);
}

// ── Buscar oponente humano en la cola ────────────────────────────────
async function _checkForHumanOpponent() {
  if (!currentUser || !_matchmakingInterval) return;
  const myElo = state.eloRating || 1000;

  try {
    const { data, error } = await sb.from('ranked_queue')
      .select('id, user_id, elo_rating')
      .eq('status', 'searching')
      .neq('user_id', currentUser.id)
      .gte('elo_rating', myElo - 300)
      .lte('elo_rating', myElo + 300)
      .order('created_at', { ascending: true })
      .limit(1);

    if (error || !data?.length) return;

    const opponent = data[0];
    // Intentar "tomar" ese slot atómicamente
    const { error: matchErr } = await sb.from('ranked_queue')
      .update({ status: 'matched' })
      .eq('id', opponent.id)
      .eq('status', 'searching'); // Solo actualizar si sigue buscando

    if (matchErr) return; // Otro jugador llegó primero

    // Marcar el nuestro también
    if (_matchmakingQueueId) {
      await sb.from('ranked_queue')
        .update({ status: 'matched' })
        .eq('id', _matchmakingQueueId);
    }

    // ¡Rival encontrado! Iniciar PvP normal vía invite
    _matchmakingStop();
    notify('¡Rival encontrado! Iniciando batalla...', '⚔️');
    
    // Crear invitación forzada de Ranked Match
    if (typeof sb !== 'undefined') {
      await sb.from('battle_invites').insert({
        challenger_id: currentUser.id,
        opponent_id: opponent.user_id,
        status: 'ranked_match',
      });
      // El jugador anfitrión espera confirmación (si el rival es un fantasma, devolverá declined o timeout)
      const { data: rows } = await sb.from('battle_invites')
        .select('*').eq('challenger_id', currentUser.id).eq('status', 'ranked_match')
        .order('created_at', { ascending: false }).limit(1);
        
      if (rows && rows.length > 0) {
        const inviteId = rows[0].id;
        let checks = 0;
        const waitInterval = setInterval(async () => {
          checks++;
          const { data: currentInv } = await sb.from('battle_invites').select('status').eq('id', inviteId).single();
          
          if (currentInv?.status === 'ranked_accepted') {
            clearInterval(waitInterval);
            if (typeof startPvpBattle === 'function') startPvpBattle(rows[0], true, true);
          } else if (!currentInv || currentInv.status === 'declined' || checks > 10) {
            // Fantasma detectado o TimeOut (8 segundos)
            clearInterval(waitInterval);
            // Purgar de la DB el fantasma del rival solo por si acaso
            try { await sb.from('ranked_queue').delete().eq('user_id', opponent.user_id); } catch(e){}
            notify('El rival no respondió. Buscando IA...', '⚠️');
            _matchmakingFallbackToPassive();
          }
        }, 800);
      }
    }
  } catch(e) {
    // La tabla puede no existir — ignorar silenciosamente
  }
}

// ── Fallback: luchar contra equipo pasivo ─────────────────────────────
async function _matchmakingFallbackToPassive() {
  _matchmakingStop();
  notify('No se encontró rival. ¡Buscando un equipo pasivo...!', '🤖');

  const opponent = await findPassiveOpponent();
  if (!opponent) {
    notify('No hay equipos pasivos disponibles ahora. Intentá más tarde.', '😔');
    return;
  }

  const { data: oppProfile } = await sb.from('profiles')
    .select('username').eq('id', opponent.user_id).single();
  const oppName = oppProfile?.username || 'Entrenador';

  const enemyTeam = opponent.team_data.map(snap => ({
    ...snap,
    hp:          snap.maxHp,
    status:      null,
    sleepTurns:  0,
  }));

  const myTeam = (state.team || []).filter(p => p.hp > 0 && !p.onMission).slice(0, 6);
  if (!myTeam.length) { notify('Tu equipo no tiene Pokémon disponibles', '⚠️'); return; }

  notify(`¡Desafiando al equipo de ${oppName}! (ELO: ${opponent.elo_rating})`, '⚔️');

  state._passiveBattleOpponentId   = opponent.user_id;
  state._passiveBattleOpponentName = oppName;

  if (typeof startPassiveBattleMode === 'function') {
    startPassiveBattleMode(myTeam, enemyTeam, oppName, opponent.user_id);
  }
}

// ── Cancelar búsqueda ─────────────────────────────────────────────────
async function cancelRankedMatchmaking() {
  _matchmakingStop();
  // Limpiar TODA fila de la cola en Supabase bajo nuestro user_id (para matar el ghost queue)
  if (currentUser) {
    try {
      await sb.from('ranked_queue').delete().eq('user_id', currentUser.id);
    } catch(e) { /* ignorar */ }
  }
  _matchmakingQueueId = null;
  notify('Búsqueda cancelada', '✖️');
}

// ── Limpieza interna ──────────────────────────────────────────────────
function _matchmakingStop() {
  if (_matchmakingInterval) { clearInterval(_matchmakingInterval); _matchmakingInterval = null; }
  if (_matchmakingTimeout)  { clearTimeout(_matchmakingTimeout);   _matchmakingTimeout  = null; }
  _showSearchingUI(false);
}

function _showSearchingUI(searching) {
  const btn    = document.getElementById('btn-ranked-search');
  const status = document.getElementById('ranked-search-status');
  if (btn) {
    btn.style.display = searching ? 'none' : 'block';
  }
  if (status) {
    status.style.display = searching ? 'block' : 'none';
  }
}

// ── Reportar resultado de batalla (pasiva o PvP activo) ───────────────
async function reportPassiveBattleResult(opponentId, result) {
  const { data, error } = await sb.rpc('fn_report_passive_battle', {
    p_defender_id: opponentId,
    p_result:      result
  });
  if (error) {
    console.error('[PvP] Error reportando resultado:', error);
    notify('Error guardando resultado de batalla.', '⚠️');
    return;
  }
  const delta = data?.delta || 0;
  state.eloRating = data?.attacker_elo || state.eloRating;
  state.pvpStats  = state.pvpStats || { wins: 0, losses: 0, draws: 0 };
  if (result === 'win')  state.pvpStats.wins++;
  if (result === 'loss') state.pvpStats.losses++;
  if (result === 'draw') state.pvpStats.draws++;

  const sign = delta >= 0 ? '+' : '';
  notify(`Resultado registrado. ELO: ${sign}${delta} → ${state.eloRating}`, '📊');
}

// ── Tabla SQL opcional (ranked_queue) ─────────────────────────────────
// Ejecutar en Supabase si se quiere matchmaking real entre humanos:
/*
CREATE TABLE IF NOT EXISTS ranked_queue (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  elo_rating INTEGER NOT NULL DEFAULT 1000,
  status     TEXT NOT NULL DEFAULT 'searching',  -- 'searching' | 'matched' | 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ranked_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "queue_all" ON ranked_queue
  FOR ALL USING (auth.uid() = user_id);

-- Los jugadores pueden leer filas de otros buscadores (para matcheo)
CREATE POLICY "queue_select_others" ON ranked_queue
  FOR SELECT USING (status = 'searching');

-- Limpiar entradas viejas (> 2 min) automáticamente con pg_cron o desde cliente
*/
