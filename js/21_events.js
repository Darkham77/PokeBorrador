// ===== SISTEMA DE EVENTOS =====
// Motor de eventos, panel de administrador y entrega de premios.

const ADMIN_EMAIL_EV = 'kodrol77@gmail.com';

const ALL_PRIZE_ITEMS = [
  'Poción', 'Super Poción', 'Hiper Poción', 'Poción Máxima',
  'Revivir', 'Revivir Máximo', 'Elixir', 'Elixir Máximo',
  'Antídoto', 'Cura Total', 'Repelente', 'Superrepelente', 'Máximo Repelente',
  'Pokéball', 'Súper Ball', 'Ultra Ball', 'Red Ball', 'Ocaso Ball', 'Turno Ball', 'Master Ball',
  'Piedra Eterna', 'Baya de Oro',
  'Pesa Recia', 'Brazal Recio', 'Cinto Recio', 'Lente Recia', 'Banda Recia', 'Franja Recia',
  'Restos', 'Cascabel Concha', 'Lente Zoom', 'Banda Focus',
  'Compartir EXP', 'Subida PP', 'Caramelo Raro', 'Huevo Suerte Pequeño', 'Cinta Elegida',
  'MT14 Ventisca', 'MT27 Retribución'
];

const EV_NATURES = [
  'Audaz', 'Firme', 'Pícaro', 'Manso', 'Serio', 'Osado', 'Plácido',
  'Agitado', 'Jovial', 'Ingenuo', 'Modesto', 'Moderado', 'Raro', 'Dócil',
  'Tímido', 'Activo', 'Alocado', 'Tranquilo', 'Grosero', 'Cauto'
];

const EV_DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// ── Estado del motor ──────────────────────────────────────────────────────────
let _activeEvents = [];
let _eventsLoaded = false;
let _eventPollInterval = null;
let _finishedEvents = [];
let _adminConfig = null;
let _adminTab = 'events';
let _adminEntries = [];
let _currentPrizeRank = 'first';
let _currentCompetitionId = 'hora_magikarp';
const _prizeTemplate = () => ({ type: 'money', amount: 0, item: 'Pokéball', qty: 1, species: 'magikarp', level: 5, nature: 'Serio', ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, shiny: false });
let _prizeStates = {
  first: _prizeTemplate(),
  second: _prizeTemplate(),
  third: _prizeTemplate()
};

// ── Auth token ────────────────────────────────────────────────────────────────
async function _evGetToken() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    return session?.access_token || null;
  } catch { return null; }
}

// ── Motor de eventos (Supabase) ────────────────────────────────────────────────
async function loadActiveEvents() {
  try {
    const { data: events, error } = await sb.from('events_config').select('*');
    if (error) throw error;
    
    _activeEvents = events.filter(ev => _isEventActiveNow(ev));

    // 2. Cargar resultados de los últimos 3 días (72hs)
    // Lo aislamos en su propio bloque para que si falla no bloquee los eventos activos
    try {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data: results, error: resError } = await sb.from('competition_results')
        .select('*, events_config(name, icon)')
        .gt('ended_at', threeDaysAgo);

      if (!resError && results) {
        _finishedEvents = results.map(r => ({
          ...r,
          name: r.events_config?.name || 'Evento Finalizado',
          icon: r.events_config?.icon || '🏁'
        }));
      }
    } catch (err) {
      console.warn('[Events] Error cargando resultados recientes:', err);
    }

    _eventsLoaded = true;
    _updateEventBanner();

    // Verificación automática de premios al cargar/actualizar
    checkAndDistributePrizes(events);
  } catch (e) {
    console.warn('[Events] Error:', e);
  }
}

function _isEventActiveNow(ev) {
  if (!ev.active) return false;
  if (ev.manual) return true;

  const now = new Date();
  
  // 1. Verificar por fechas absolutas si existen
  if (ev.start_at && ev.end_at) {
    const start = new Date(ev.start_at);
    const end = new Date(ev.end_at);
    if (now >= start && now <= end) return true;
  }

  // 2. Verificar por horario programado (Weekly)
  const sched = ev.schedule;
  if (!sched) return false;
  
  const argTime = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires"}));
  const day = argTime.getDay();
  const hour = argTime.getHours() + argTime.getMinutes() / 60;
  
  if (sched.type === 'weekly' && sched.days) {
    if (!sched.days.includes(day)) return false;
    if (sched.startHour !== undefined && hour < sched.startHour) return false;
    if (sched.endHour !== undefined && hour >= sched.endHour) return false;
    return true;
  }
  
  return false;
}

function isEventActive(id) {
  return _activeEvents.some(e => e.id === id);
}

function getEventBonus(type) {
  for (const ev of _activeEvents) {
    if (ev.config && ev.config[type + 'Mult']) return ev.config[type + 'Mult'];
  }
  return 1;
}

function _startEventPolling() {
  if (_eventPollInterval) clearInterval(_eventPollInterval);
  _eventPollInterval = setInterval(loadActiveEvents, 5 * 60 * 1000);
}

// ── Banner de eventos activos ─────────────────────────────────────────────────
function _updateEventBanner() {
  // Ahora los eventos se muestran como Buffs dorados en el panel lateral
  if (typeof updateBuffPanel === 'function') updateBuffPanel();
  
  // Refrescar la pestaña de Mapa si está abierta para actualizar el carrusel del HUD
  const mapTab = document.getElementById('tab-map');
  if (mapTab && mapTab.style.display !== 'none') {
    if (typeof renderMaps === 'function') renderMaps();
  }
}

function showEventDetail(evId) {
  const ev = _activeEvents.find(e => e.id === evId);
  if (!ev) return;

  const modal = document.getElementById('event-detail-modal');
  const content = document.getElementById('event-detail-content');
  if (!modal || !content) return;

  let configHtml = '';
  if (ev.config) {
    configHtml = '<div class="event-detail-config">';
    Object.entries(ev.config).forEach(([key, val]) => {
      let label = key.replace(/Mult$/, '');
      if (label === 'exp') label = 'Experiencia';
      if (label === 'money') label = 'Dinero (₽)';
      if (label === 'bc') label = 'Battle Coins';
      if (label === 'shiny') label = 'Probabilidad Shiny';
      
      configHtml += `
        <div class="config-item">
          <span class="config-label">${label.toUpperCase()}</span>
          <span class="config-value">x${val}</span>
        </div>`;
    });
    configHtml += '</div>';
  }

  content.innerHTML = `
    <div class="event-detail-icon">${ev.icon || '🎁'}</div>
    <div class="event-detail-title">${ev.name}</div>
    <div class="event-detail-desc">${ev.description || '¡Aprovechá este evento especial mientras esté activo!'}</div>
    ${configHtml}
  `;

  modal.style.display = 'flex';
}

// ── Concurso de Magikarp ──────────────────────────────────────────────────────
async function submitMagikarpEntry(pokemon, eventId = 'hora_magikarp') {
  if (!isEventActive(eventId) || !currentUser) return;
  const totalIvs = Object.values(pokemon.ivs || {}).reduce((a, b) => a + b, 0);
  try {
    const { data: existing } = await sb.from('competition_entries')
      .select('data')
      .eq('event_id', eventId)
      .eq('player_id', currentUser.id)
      .single();

    if (existing && (existing.data?.total_ivs || 0) >= totalIvs) {
      notify('Ya tenés una inscripción mejor en este concurso.', '🎣');
      return;
    }

    const { error } = await sb.from('competition_entries').upsert({
      event_id: eventId,
      player_id: currentUser.id,
      player_name: state.trainer || 'Jugador',
      player_email: currentUser.email,
      data: {
        pokemon_name: pokemon.name,
        ivs: pokemon.ivs,
        total_ivs: totalIvs,
        level: pokemon.level,
        isShiny: pokemon.isShiny || false
      },
      submitted_at: new Date().toISOString()
    });

    if (error) throw error;
    notify(`¡Registro exitoso! Puntuación actual: ${totalIvs}`, '🎣');
  } catch (e) {
    console.warn('[Events] Error al inscribir:', e);
    notify('Error al inscribir en el concurso.', '❌');
  }
}

// ── Verificación de récord antes de mostrar el diálogo ────────────────────────
async function checkMagikarpAndPrompt(pokemon) {
  if (!isEventActive('hora_magikarp') || !currentUser) return;
  
  const totalIvs = Object.values(pokemon.ivs || {}).reduce((a, b) => a + b, 0);
  
  try {
    // Verificar si el jugador ya tiene un Magikarp registrado
    const { data: existing } = await sb.from('competition_entries')
      .select('data')
      .eq('event_id', 'hora_magikarp')
      .eq('player_id', currentUser.id)
      .single();
    
    // Si existe un registro y el nuevo Magikarp no es mejor, no mostrar diálogo
    if (existing && (existing.data?.total_ivs || 0) >= totalIvs) {
      return; // Silenciosamente ignorar Magikarp peores
    }
    
    // Si el nuevo Magikarp es mejor (o no hay registro), mostrar el diálogo
    promptMagikarpSubmit(pokemon);
  } catch (e) {
    // Si hay error en la consulta, mostrar el diálogo de todas formas
    console.warn('[Events] Error verificando récord de Magikarp:', e);
    promptMagikarpSubmit(pokemon);
  }
}

function promptMagikarpSubmit(pokemon) {
  if (!isEventActive('hora_magikarp')) return;
  const totalIvs = Object.values(pokemon.ivs || {}).reduce((a, b) => a + b, 0);
  const ov = document.createElement('div');
  ov.id = 'magikarp-submit-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;';
  ov.innerHTML = `
    <div style="background:#1e293b;border-radius:20px;padding:24px;max-width:360px;width:100%;border:2px solid #22c55e44;text-align:center;">
      <div style="font-size:40px;margin-bottom:12px;">🎣</div>
      <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:#22c55e;margin-bottom:12px;">HORA DE PESCA ACTIVA</div>
      <div style="font-size:12px;color:#e2e8f0;margin-bottom:8px;">¡Capturaste un Magikarp con <strong style="color:#f59e0b;">${totalIvs}/186 IVs</strong>!</div>
      <div style="font-size:11px;color:#9ca3af;margin-bottom:20px;">¿Querés inscribirlo en el concurso?${pokemon.isShiny ? ' <span style="color:#fbbf24;">✨ ¡Es Shiny!</span>' : ''}</div>
      <div style="display:flex;gap:10px;">
        <button onclick="submitMagikarpEntry(_magikarpPrize);document.getElementById('magikarp-submit-overlay').remove()"
          style="flex:1;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#22c55e,#15803d);color:#fff;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;">
          🏆 INSCRIBIR
        </button>
        <button onclick="document.getElementById('magikarp-submit-overlay').remove()"
          style="flex:1;padding:12px;border:none;border-radius:12px;background:rgba(255,255,255,0.07);color:#9ca3af;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;">
          NO GRACIAS
        </button>
      </div>
    </div>`;
  window._magikarpPrize = pokemon;
  document.body.appendChild(ov);
}

// ── Entrega de premios ────────────────────────────────────────────────────────
async function checkPendingAwards() {
  if (!currentUser) return;
  try {
    const seventyTwoHoursAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: awards, error } = await sb.from('awards')
      .select('*')
      .eq('winner_id', currentUser.id)
      .eq('claimed', false)
      .gt('awarded_at', seventyTwoHoursAgo);
    
    if (error) throw error;
    // Guardamos en estado global para que el HUD sepa que hay premios pendientes
    state._pendingAwards = awards || [];
  } catch (e) {
    console.warn('[Events] Error al verificar premios pendientes:', e);
  }
}

async function claimAward(awardId) {
  if (!currentUser) return;
  try {
    const award = state._pendingAwards?.find(a => a.id === awardId);
    if (!award) return;

    const delivered = await _deliverAward(award);
    if (delivered) {
      state._pendingAwards = state._pendingAwards.filter(a => a.id !== awardId);
      notify('¡Premio reclamado con éxito!', '🎉');
      // Refrescar el carrusel del mapa si está abierto
      if (typeof renderMaps === 'function') renderMaps();
    }
  } catch (e) {
    console.warn('[Events] Error al reclamar premio:', e);
    notify('Error al reclamar el premio.', '❌');
  }
}

async function _deliverAward(award) {
  const prize = award.prize;
  if (!prize) return;

  let delivered = false;

  if (prize.type === 'money') {
    state.money = (state.money || 0) + (prize.amount || 0);
    notify(`🏆 Premio de torneo: ₽${(prize.amount || 0).toLocaleString()}`, '🎉');
    delivered = true;
  } else if (prize.type === 'bc') {
    state.battleCoins = (state.battleCoins || 0) + (prize.amount || 0);
    notify(`🏆 Premio de torneo: ${(prize.amount || 0).toLocaleString()} Battle Coins`, '🎉');
    delivered = true;
  } else if (prize.type === 'item') {
    state.inventory = state.inventory || {};
    state.inventory[prize.item] = (state.inventory[prize.item] || 0) + (prize.qty || 1);
    notify(`🏆 Premio de torneo: ${prize.qty || 1}x ${prize.item}`, '🎉');
    delivered = true;
  } else if (prize.type === 'pokemon') {
    if (typeof makePokemon === 'function' && POKEMON_DB[prize.species]) {
      const poke = makePokemon(prize.species, prize.level || 5);
      if (prize.nature) poke.nature = prize.nature;
      if (prize.ivs) poke.ivs = { ...poke.ivs, ...prize.ivs };
      if (prize.shiny) poke.isShiny = true;
      poke.originalTrainer = 'EVENTO';
      state.box = state.box || [];
      state.box.push(poke);
      const shinyTag = prize.shiny ? ' ✨' : '';
      notify(`🏆 Premio de torneo: ${POKEMON_DB[prize.species]?.name || prize.species}${shinyTag} añadido a tu PC`, '🎉');
      delivered = true;
    }
  }

  if (delivered) {
    if (typeof updateHud === 'function') updateHud();
    if (typeof saveGame === 'function') saveGame(false);
    try {
      await sb.from('awards').update({ 
        claimed: true, 
        claimed_at: new Date().toISOString() 
      }).eq('id', award.id);
    } catch (e) { console.warn('[Events] Error al marcar premio como reclamado:', e); }
  }
}

// ── Panel de Administrador ────────────────────────────────────────────────────
function isAdminUser() {
  return currentUser?.email === ADMIN_EMAIL_EV;
}

async function openAdminPanel() {
  if (!isAdminUser()) { notify('Sin acceso.', '🚫'); return; }
  const existing = document.getElementById('admin-panel-overlay');
  if (existing) existing.remove();

  try {
    const { data: events, error } = await sb.from('events_config').select('*').order('id');
    if (error) throw error;
    
    _adminConfig = { events };
    _renderAdminPanel();
    
    // Cargamos los participantes del concurso de inmediato
    await _evLoadEntries();
  } catch (e) {
    console.error('[Admin] Error:', e);
    notify('Error: ' + e.message, '❌');
  }
}

function _renderAdminPanel() {
  const existing = document.getElementById('admin-panel-overlay');
  if (existing) existing.remove();

  const ov = document.createElement('div');
  ov.id = 'admin-panel-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9800;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto;animation:fadeIn 0.2s;';

  const tab1Active = _adminTab === 'events';
  const tab2Active = _adminTab === 'competition';

  const eventsHtml = (_adminConfig?.events || []).map((ev, i) => _renderEventCard(ev, i)).join('');
  const compHtml = _renderCompetitionTab();

  ov.innerHTML = `
    <div style="background:#0f172a;border-radius:20px;padding:24px;width:100%;max-width:560px;border:2px solid #f59e0b44;box-shadow:0 8px 60px rgba(0,0,0,0.8);margin:auto;">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:28px;">🛡️</span>
          <div>
            <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:#f59e0b;">ADMINISTRADOR</div>
            <div style="font-size:9px;color:#6b7280;margin-top:3px;">Solo visible para ti (Online)</div>
          </div>
        </div>
        <button onclick="document.getElementById('admin-panel-overlay').remove()"
          style="background:none;border:none;color:#6b7280;font-size:24px;cursor:pointer;line-height:1;">✕</button>
      </div>

      <!-- Tabs -->
      <div style="display:flex;background:rgba(255,255,255,0.05);border-radius:12px;padding:4px;margin-bottom:20px;gap:4px;">
        <button onclick="window._evAdminSwitchTab('events')"
          style="flex:1;padding:10px;border:none;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;background:${tab1Active ? '#f59e0b' : 'transparent'};color:${tab1Active ? '#000' : '#9ca3af'};">
          ⚙️ EVENTOS
        </button>
        <button onclick="window._evAdminSwitchTab('competition')"
          style="flex:1;padding:10px;border:none;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;background:${tab2Active ? '#22c55e' : 'transparent'};color:${tab2Active ? '#000' : '#9ca3af'};">
          🎣 CONCURSO
        </button>
      </div>

      <!-- Events Tab -->
      <div id="admin-tab-events" style="display:${tab1Active ? 'block' : 'none'};">
        <div style="display:flex;flex-direction:column;gap:14px;" id="admin-events-list">
          ${eventsHtml}
        </div>
        <button onclick="window._evAdminSave()"
          style="width:100%;margin-top:16px;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;">
          💾 GUARDAR CAMBIOS
        </button>
      </div>

      <!-- Competition Tab -->
      <div id="admin-tab-competition" style="display:${tab2Active ? 'block' : 'none'};">
        ${compHtml}
      </div>
    </div>`;

  document.body.appendChild(ov);

  window._evAdminSwitchTab = (tab) => {
    _adminTab = tab;
    _renderAdminPanel();
    // Cargamos los participantes con un pequeño delay para que el DOM esté listo
    if (tab === 'competition') {
      setTimeout(() => _evLoadEntriesGlobal(), 100);
    }
  };

  window._evAdminSave = async () => {
    try {
      // Guardamos cada evento modificado
      for (const ev of (_adminConfig?.events || [])) {
        const { error } = await sb.from('events_config').update({
          active: ev.active,
          manual: ev.manual,
          schedule: ev.schedule,
          config: ev.config
        }).eq('id', ev.id);
        if (error) throw error;
      }
      notify('¡Cambios guardados!', '✅');
      await loadActiveEvents();
    } catch (e) { 
      console.error(e);
      notify('Error al guardar en Supabase.', '❌'); 
    }
  };
}

function _renderEventCard(ev, idx) {
  const sched = ev.schedule || {};
  const days = sched.days || [];
  const daysHtml = EV_DAY_NAMES.map((d, i) => `
    <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:10px;color:${days.includes(i) ? '#22c55e' : '#6b7280'};">
      <input type="checkbox" data-ev="${idx}" data-day="${i}" ${days.includes(i) ? 'checked' : ''}
        style="accent-color:#22c55e;cursor:pointer;" onchange="window._evDayToggle(${idx},${i},this.checked)">
      ${d}
    </label>`).join('');

  const hasHours = sched.startHour !== undefined;

  return `
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:22px;">${ev.icon}</span>
          <div>
            <div style="font-size:11px;font-weight:700;color:#e2e8f0;">${ev.name}</div>
            <div style="font-size:9px;color:#6b7280;margin-top:2px;">${ev.description}</div>
          </div>
        </div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;flex-shrink:0;">
          <input type="checkbox" data-ev="${idx}" data-field="active" ${ev.active ? 'checked' : ''}
            style="accent-color:#22c55e;width:16px;height:16px;cursor:pointer;" onchange="window._evFieldChange(${idx},'active',this.checked)">
          <span style="font-size:9px;color:${ev.active ? '#22c55e' : '#6b7280'};font-family:'Press Start 2P',monospace;">${ev.active ? 'ON' : 'OFF'}</span>
        </label>
      </div>

      <div style="background:rgba(245,158,11,0.08);border-radius:10px;padding:10px;margin-bottom:10px;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" data-ev="${idx}" data-field="manual" ${ev.manual ? 'checked' : ''}
            style="accent-color:#f59e0b;cursor:pointer;" onchange="window._evFieldChange(${idx},'manual',this.checked)">
          <div>
            <span style="font-size:9px;color:#f59e0b;font-family:'Press Start 2P',monospace;">ACTIVAR AHORA (MANUAL)</span>
            <div style="font-size:8px;color:#6b7280;margin-top:2px;">Ignora el horario programado</div>
          </div>
        </label>
      </div>

      <div style="font-size:9px;color:#9ca3af;margin-bottom:8px;font-family:'Press Start 2P',monospace;">DÍAS DE LA SEMANA (ARG)</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">${daysHtml}</div>

      ${hasHours ? `
      <div style="display:flex;gap:12px;align-items:center;">
        <div>
          <div style="font-size:8px;color:#9ca3af;margin-bottom:4px;">HORA INICIO</div>
          <input type="number" min="0" max="23" value="${sched.startHour ?? 0}"
            data-ev="${idx}" data-field="startHour"
            onchange="window._evHourChange(${idx},'startHour',this.value)"
            style="width:60px;padding:6px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;text-align:center;font-size:13px;">
        </div>
        <div style="color:#6b7280;padding-top:16px;">—</div>
        <div>
          <div style="font-size:8px;color:#9ca3af;margin-bottom:4px;">HORA FIN</div>
          <input type="number" min="0" max="24" value="${sched.endHour ?? 24}"
            data-ev="${idx}" data-field="endHour"
            onchange="window._evHourChange(${idx},'endHour',this.value)"
            style="width:60px;padding:6px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;text-align:center;font-size:13px;">
        </div>
        <div style="font-size:8px;color:#4b5563;padding-top:14px;">hs. (ARG)</div>
      </div>` : `
      <div style="font-size:9px;color:#4b5563;">⏰ Todo el día</div>`}
    </div>`;
}

function _renderCompetitionTab() {
  const compEvents = _adminConfig?.events || [];
  const compEv = compEvents.find(e => e.id === _currentCompetitionId) || compEvents[0];
  if (!compEv) return '<div style="color:#6b7280;text-align:center;padding:20px;">No hay eventos disponibles.</div>';

  const prizes = compEv.config?.prizes || {};
  
  const p1 = prizes.first ? _prizeSummary(prizes.first) : 'Sin configurar';
  const p2 = prizes.second ? _prizeSummary(prizes.second) : 'Sin configurar';
  const p3 = prizes.third ? _prizeSummary(prizes.third) : 'Sin configurar';

  const competitionOptions = compEvents.map(e => `<option value="${e.id}" ${_currentCompetitionId === e.id ? 'selected' : ''}>${e.icon} ${e.name}</button>`).join('');

  const prizePreview = `
    <div style="font-size:10px;margin-top:4px;display:flex;flex-direction:column;gap:4px;">
      <div style="color:#fbbf24;">🥇 1°. ${p1}</div>
      <div style="color:#94a3b8;">🥈 2°. ${p2}</div>
      <div style="color:#b45309;">🥉 3°. ${p3}</div>
    </div>`;

  const state = _prizeStates[_currentPrizeRank];

  const pokemonOptions = typeof POKEMON_DB !== 'undefined'
    ? Object.entries(POKEMON_DB).map(([k, v]) => `<option value="${k}" ${state.species === k ? 'selected' : ''}>${v.name}</option>`).join('')
    : '';

  const itemOptions = ALL_PRIZE_ITEMS.map(it => `<option value="${it}" ${state.item === it ? 'selected' : ''}>${it}</option>`).join('');
  const natureOptions = EV_NATURES.map(n => `<option value="${n}" ${state.nature === n ? 'selected' : ''}>${n}</option>`).join('');

  const statsFields = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
  const statLabels = { hp: 'PS', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Vel' };
  const ivInputs = statsFields.map(s => `
    <div style="text-align:center;">
      <div style="font-size:8px;color:#6b7280;margin-bottom:3px;">${statLabels[s]}</div>
      <input type="number" min="0" max="31" value="${state.ivs[s] ?? 31}"
        id="prize-iv-${s}"
        style="width:40px;padding:5px 2px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;text-align:center;font-size:11px;">
    </div>`).join('');

  return `
    <!-- Selector de Evento -->
    <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px;margin-bottom:16px;border:1px solid rgba(255,255,255,0.08);">
      <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#9ca3af;margin-bottom:8px;">SELECCIONAR EVENTO</div>
      <select onchange="window._evSwitchCompetition(this.value)"
        style="width:100%;padding:10px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:11px;box-sizing:border-box;">
        ${competitionOptions}
      </select>
    </div>

    <!-- Premio actual -->
    <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px;margin-bottom:16px;">
      <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#9ca3af;margin-bottom:6px;">PREMIO ACTUAL</div>
      ${prizePreview}
    </div>

    <!-- Constructor de premio -->
    <div style="background:rgba(255,255,255,0.04);border-radius:14px;padding:16px;margin-bottom:16px;">
      <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:#f59e0b;margin-bottom:14px;">🏆 CONFIGURAR PREMIO</div>

      <div style="display:flex;gap:4px;margin-bottom:12px;">
        ${[['first','🥇 1ro'],['second','🥈 2do'],['third','🥉 3ro']].map(([v,l]) => `
          <button onclick="window._evSwitchPrizeRank('${v}')"
            style="flex:1;padding:8px;border:none;border-radius:8px;font-family:'Press Start 2P',monospace;font-size:7px;cursor:pointer;background:${_currentPrizeRank===v?'#f59e0b':'rgba(255,255,255,0.05)'};color:${_currentPrizeRank===v?'#000':'#9ca3af'};">
            ${l}
          </button>`).join('')}
      </div>

      <div style="margin-bottom:12px;">
        <div style="font-size:9px;color:#9ca3af;margin-bottom:6px;">TIPO DE PREMIO</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${[['money','💰 Dinero (₽)'],['bc','🪙 Battle Coins'],['item','📦 Ítem'],['pokemon','🐾 Pokémon']].map(([v,l]) => `
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer;background:rgba(0,0,0,0.3);border-radius:8px;padding:6px 10px;border:1px solid ${state.type===v?'#f59e0b':'rgba(255,255,255,0.08)'};">
              <input type="radio" name="prize-type" value="${v}" ${state.type===v?'checked':''} onchange="window._evPrizeType('${v}')" style="accent-color:#f59e0b;">
              <span style="font-size:10px;color:${state.type===v?'#f59e0b':'#9ca3af'};">${l}</span>
            </label>`).join('')}
        </div>
      </div>

      <!-- Money / BC -->
      <div id="prize-field-amount" style="display:${['money','bc'].includes(state.type)?'block':'none'};margin-bottom:12px;">
        <div style="font-size:9px;color:#9ca3af;margin-bottom:6px;">CANTIDAD ${state.type === 'bc' ? 'BC' : '₽'}</div>
        <input type="number" min="0" id="prize-amount" value="${state.amount}"
          oninput="_prizeStates[_currentPrizeRank].amount=parseInt(this.value)||0"
          style="width:100%;padding:10px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:14px;box-sizing:border-box;">
      </div>

      <!-- Item -->
      <div id="prize-field-item" style="display:${state.type==='item'?'block':'none'};margin-bottom:12px;">
        <div style="font-size:9px;color:#9ca3af;margin-bottom:6px;">ÍTEM</div>
        <select id="prize-item" onchange="_prizeStates[_currentPrizeRank].item=this.value"
          style="width:100%;padding:10px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:12px;margin-bottom:8px;box-sizing:border-box;">
          ${itemOptions}
        </select>
        <div style="font-size:9px;color:#9ca3af;margin-bottom:4px;">CANTIDAD</div>
        <input type="number" min="1" id="prize-qty" value="${state.qty}"
          oninput="_prizeStates[_currentPrizeRank].qty=parseInt(this.value)||1"
          style="width:80px;padding:8px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:13px;">
      </div>

      <!-- Pokémon -->
      <div id="prize-field-pokemon" style="display:${state.type==='pokemon'?'block':'none'};margin-bottom:12px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
          <div>
            <div style="font-size:9px;color:#9ca3af;margin-bottom:4px;">ESPECIE</div>
            <select id="prize-species" onchange="_prizeStates[_currentPrizeRank].species=this.value"
              style="width:100%;padding:8px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:11px;box-sizing:border-box;">
              ${pokemonOptions}
            </select>
          </div>
          <div>
            <div style="font-size:9px;color:#9ca3af;margin-bottom:4px;">NIVEL</div>
            <input type="number" min="1" max="100" id="prize-level" value="${state.level}"
              oninput="_prizeStates[_currentPrizeRank].level=parseInt(this.value)||5"
              style="width:100%;padding:8px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:13px;box-sizing:border-box;">
          </div>
        </div>
        <div style="margin-bottom:10px;">
          <div style="font-size:9px;color:#9ca3af;margin-bottom:4px;">NATURALEZA</div>
          <select id="prize-nature" onchange="_prizeStates[_currentPrizeRank].nature=this.value"
            style="width:100%;padding:8px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:11px;box-sizing:border-box;">
            ${natureOptions}
          </select>
        </div>
        <div style="margin-bottom:12px;">
          <div style="font-size:9px;color:#9ca3af;margin-bottom:6px;">GENÉTICA (IVs)</div>
          <div style="display:flex;justify-content:space-between;gap:4px;">${ivInputs}</div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" id="prize-shiny" ${state.shiny?'checked':''} onchange="_prizeStates[_currentPrizeRank].shiny=this.checked" style="accent-color:#f59e0b;width:16px;height:16px;">
          <span style="font-size:10px;color:#f59e0b;">✨ ES SHINY</span>
        </label>
      </div>

      <button onclick="window._evSavePrize()"
        style="width:100%;padding:12px;border:none;border-radius:12px;background:rgba(255,255,255,0.07);color:#fff;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;">
        💾 GUARDAR PODIO
      </button>
    </div>

    <!-- Participantes -->
    <div style="background:rgba(255,255,255,0.04);border-radius:14px;padding:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:#22c55e;">🎣 PARTICIPANTES (${_adminEntries.length})</div>
        <div style="display:flex;gap:12px;align-items:center;">
          <button onclick="window._evClearEntries(_currentCompetitionId)" title="Reiniciar lista" 
            style="background:none;border:none;color:#ef4444;font-size:16px;cursor:pointer;opacity:0.7;padding:4px;transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">🗑️</button>
          <button onclick="window._evLoadEntriesGlobal()" style="background:none;border:none;color:#6b7280;font-size:16px;cursor:pointer;padding:4px;">🔄</button>
        </div>
      </div>
      <div id="admin-entries-container">
        <div style="font-size:11px;color:#6b7280;text-align:center;padding:20px;">Cargando...</div>
      </div>

      <button onclick="window._evAwardFullEvent(_currentCompetitionId)"
        style="width:100%;margin-top:16px;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#22c55e,#15803d);color:#fff;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;box-shadow:0 4px 15px rgba(34,197,94,0.3);">
        🏆 CERRAR Y PREMIAR PODIO
      </button>
    </div>`;
}

async function _evLoadEntries() {
  if (!isAdminUser()) return;
  try {
    const { data: entries, error } = await sb.from('competition_entries')
      .select('*')
      .eq('event_id', _currentCompetitionId);
    
    if (error) throw error;
    
    const compEv = _adminConfig?.events?.find(e => e.id === _currentCompetitionId);
    const sortBy = compEv?.config?.sortBy || 'data.total_ivs';
    
    _adminEntries = (entries || []).sort((a, b) => {
      const valA = sortBy.startsWith('data.') ? a.data?.[sortBy.split('.')[1]] : a[sortBy];
      const valB = sortBy.startsWith('data.') ? b.data?.[sortBy.split('.')[1]] : b[sortBy];
      return (valB || 0) - (valA || 0);
    });
    
    _renderEntriesTable();
  } catch (e) { 
    console.warn('[Events] Error cargando participantes:', e); 
  }
}

function _renderEntriesTable() {
  const container = document.getElementById('admin-entries-container');
  if (!container) return;
  if (_adminEntries.length === 0) {
    container.innerHTML = '<div style="font-size:11px;color:#6b7280;text-align:center;padding:20px;">Sin participantes aún.</div>';
    return;
  }
  
  const sortBy = _adminConfig?.events?.find(e => e.id === _currentCompetitionId)?.config?.sortBy || 'data.total_ivs';
  const scoreLabel = sortBy.includes('ivs') ? 'IVs' : 'Puntos';

  const rows = _adminEntries.map((entry, rank) => {
    const d = entry.data || {};
    const ivDetail = d.ivs ? Object.values(d.ivs).join('/') : '—';
    const shinyTag = d.isShiny ? ' ✨' : '';
    const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}.`;
    return `
      <div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:18px;flex-shrink:0;">${medal}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:11px;font-weight:700;color:#e2e8f0;margin-bottom:3px;">${entry.player_name}${shinyTag}</div>
          <div style="font-size:10px;color:#f59e0b;font-weight:800;">${d.total_ivs || '?'}/186 IVs</div>
          <div style="font-size:9px;color:#6b7280;margin-top:2px;">${ivDetail}</div>
          <div style="font-size:8px;color:#4b5563;margin-top:1px;">${new Date(entry.submitted_at).toLocaleString('es-AR')}</div>
        </div>
        <button onclick="window._evAwardEntry('${entry.player_id}', '${entry.player_name.replace(/'/g,"\\\\'")}')"
          style="padding:8px 10px;border:none;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;font-family:'Press Start 2P',monospace;font-size:7px;cursor:pointer;flex-shrink:0;white-space:nowrap;">
          🏆 PREMIAR
        </button>
      </div>`;
  }).join('');
  container.innerHTML = rows;
}

async function _evSavePrize() {
  if (!isAdminUser()) return;
  
  const stats = ['hp','atk','def','spa','spd','spe'];
  const state = _prizeStates[_currentPrizeRank];

  if (state.type === 'pokemon') {
    stats.forEach(s => {
      const el = document.getElementById(`prize-iv-${s}`);
      if (el) state.ivs[s] = parseInt(el.value) || 0;
    });
    const specEl = document.getElementById('prize-species');
    const lvEl = document.getElementById('prize-level');
    const natEl = document.getElementById('prize-nature');
    const shinyEl = document.getElementById('prize-shiny');
    if (specEl) state.species = specEl.value;
    if (lvEl) state.level = parseInt(lvEl.value) || 5;
    if (natEl) state.nature = natEl.value;
    if (shinyEl) state.shiny = shinyEl.checked;
  }
  
  const ev = _adminConfig?.events?.find(e => e.id === _currentCompetitionId);
  if (ev) {
    ev.config = ev.config || {};
    ev.config.prizes = {
      first: _buildPrizeObject(_prizeStates.first),
      second: _buildPrizeObject(_prizeStates.second),
      third: _buildPrizeObject(_prizeStates.third)
    };
    // Mantenemos el criterio si ya existe, sino total_ivs
    ev.config.sortBy = ev.config.sortBy || 'data.total_ivs';
  }

  try {
    const { error } = await sb.from('events_config').update({
      config: ev.config
    }).eq('id', _currentCompetitionId);
    
    if (error) throw error;
    notify('¡Podio guardado correctamente!', '🏆'); 
    _renderAdminPanel();
  } catch (e) { 
    console.error(e);
    notify('Error al guardar podio en Supabase.', '❌'); 
  }
}

function _buildPrizeObject(state) {
  if (!state) return null;
  if (state.type === 'money') return { type: 'money', amount: state.amount };
  if (state.type === 'bc') return { type: 'bc', amount: state.amount };
  if (state.type === 'item') return { type: 'item', item: state.item, qty: state.qty };
  if (state.type === 'pokemon') {
    return {
      type: 'pokemon',
      species: state.species,
      level: state.level,
      nature: state.nature,
      ivs: { ...state.ivs },
      shiny: state.shiny
    };
  }
  return null;
}

function _prizeSummary(prize) {
  if (!prize) return 'Sin configurar';
  if (prize.type === 'money') return `₽${(prize.amount || 0).toLocaleString()}`;
  if (prize.type === 'bc') return `${(prize.amount || 0).toLocaleString()} Battle Coins`;
  if (prize.type === 'item') return `${prize.qty || 1}x ${prize.item}`;
  if (prize.type === 'pokemon') {
    const name = (typeof POKEMON_DB !== 'undefined' && POKEMON_DB[prize.species]?.name) || prize.species;
    const shinyTag = prize.shiny ? ' ✨' : '';
    const totalIvs = Object.values(prize.ivs || {}).reduce((a, b) => a + b, 0);
    return `${name}${shinyTag} Nv.${prize.level} ${prize.nature} [${totalIvs}/186 IVs]`;
  }
  return 'Premio desconocido';
}

async function _evAwardEntry(winnerId, name) {
  if (!isAdminUser()) return;
  const compEv = _adminConfig?.events?.find(e => e.id === 'hora_magikarp');
  const prize = compEv?.config?.prize;
  if (!prize) { notify('Primero configurá el premio en la sección de abajo.', '⚠️'); return; }
  if (!confirm(`¿Otorgar el premio a ${name}?\\n\\nPremio: ${_prizeSummary(prize)}`)) return;
  
  try {
    // Buscamos el email del ganador (necesario para el sistema de premios actual o notificaciones)
    const { data: profile } = await sb.from('profiles').select('email').eq('id', winnerId).single();
    
    const { error } = await sb.from('awards').insert({
      winner_id: winnerId,
      winner_name: name,
      winner_email: profile?.email || '—',
      event_id: 'hora_magikarp',
      prize,
      awarded_at: new Date().toISOString()
    });
    
    if (error) throw error;
    notify(`✅ Premio enviado a ${name}. Lo recibirá al ingresar al juego.`, '🏆');
  } catch (e) {
    console.error(e);
    notify('Error al enviar premio.', '❌');
  }
}

window._evAwardEntry = _evAwardEntry;

window._evPrizeType = (type) => {
  const state = _prizeStates[_currentPrizeRank];
  state.type = type;
  document.getElementById('prize-field-amount').style.display = ['money','bc'].includes(type) ? 'block' : 'none';
  document.getElementById('prize-field-item').style.display = type === 'item' ? 'block' : 'none';
  document.getElementById('prize-field-pokemon').style.display = type === 'pokemon' ? 'block' : 'none';
  document.querySelectorAll('input[name="prize-type"]').forEach(r => {
    r.parentElement.style.borderColor = r.value === type ? '#f59e0b' : 'rgba(255,255,255,0.08)';
    r.parentElement.querySelector('span').style.color = r.value === type ? '#f59e0b' : '#9ca3af';
  });
};

window._evSwitchPrizeRank = (rank) => {
  _currentPrizeRank = rank;
  _renderAdminPanel();
};

window._evSwitchCompetition = (id) => {
  _currentCompetitionId = id;
  _renderAdminPanel();
  _evLoadEntries();
};

async function awardEvent(eventId, manual = false) {
  try {
    // 1. Obtener config del evento
    const { data: ev, error: evError } = await sb.from('events_config').select('*').eq('id', eventId).single();
    if (evError || !ev) return;

    // Evitar premiación doble si ya se hizo recientemente (ej. hace menos de 10 min)
    const lastAwarded = ev.config?.lastAwardedAt ? new Date(ev.config.lastAwardedAt) : new Date(0);
    if (!manual && (new Date() - lastAwarded < 10 * 60 * 1000)) return;

    const prizes = ev.config?.prizes;
    if (!prizes) return;

    // 2. Obtener participantes ordenados
    const { data: entries, error: entError } = await sb.from('competition_entries')
      .select('*')
      .eq('event_id', eventId);
    
    if (entError || !entries || entries.length === 0) {
      if (manual) notify('No hay participantes para premiar.', '⚠️');
      return;
    }

    // Ordenar (Asumimos Magikarp por ahora: total_ivs desc)
    const sorted = entries.sort((a, b) => (b.data?.total_ivs || 0) - (a.data?.total_ivs || 0));

    const winners = [
      { rank: 'first', entry: sorted[0] },
      { rank: 'second', entry: sorted[1] },
      { rank: 'third', entry: sorted[2] }
    ].filter(w => w.entry);

    // 3. Insertar premios individuales
    for (const winner of winners) {
      const prize = prizes[winner.rank];
      if (!prize) continue;

      await sb.from('awards').insert({
        winner_id: winner.entry.player_id,
        winner_name: winner.entry.player_name,
        winner_email: winner.entry.player_email,
        event_id: eventId,
        prize,
        awarded_at: new Date().toISOString()
      });
    }

    // 4. Guardar resultado histórico del podio
    const resultsData = winners.map(w => ({
      player_id: w.entry.player_id,
      player_name: w.entry.player_name,
      rank: w.rank,
      score: (sortBy.startsWith('data.') ? w.entry.data?.[sortBy.split('.')[1]] : w.entry[sortBy]) || 0,
      prize: prizes[w.rank],
      data: w.entry.data
    }));

    await sb.from('competition_results').insert({
      event_id: eventId,
      winners: resultsData,
      ended_at: new Date().toISOString()
    });

    // 5. Limpiar entradas y actualizar config
    await sb.from('competition_entries').delete().eq('event_id', eventId);
    
    const newConfig = { ...ev.config, lastAwardedAt: new Date().toISOString() };
    await sb.from('events_config').update({ config: newConfig }).eq('id', eventId);

    if (manual) notify(`¡Evento premiado con éxito! Se repartieron ${winners.length} premios.`, '🏆');
    else console.log(`[Events] Automatización: Evento ${eventId} premiado.`);
    
    if (isAdminUser()) openAdminPanel(); // Refrescar si está abierto
  } catch (e) {
    console.error('[Events] Error en awardEvent:', e);
  }
}

async function showEventResultsModal(eventId) {
  try {
    // 1. Cargar resultados y configuración del evento
    const { data: result, error: resError } = await sb.from('competition_results')
      .select('*')
      .eq('event_id', eventId)
      .order('ended_at', { ascending: false })
      .limit(1)
      .single();

    const { data: ev, error: evError } = await sb.from('events_config').select('name, icon, config').eq('id', eventId).single();

    if (resError || !result) { notify('No se encontraron resultados para este evento.', '❓'); return; }

    const winners = result.winners || [];
    const myAward = state._pendingAwards?.find(a => a.event_id === eventId);
    
    // 2. Construir el Modal
    const modal = document.createElement('div');
    modal.id = 'podium-modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(10px);animation:fadeIn 0.3s;';
    
    const p1 = winners.find(w => w.rank === 'first');
    const p2 = winners.find(w => w.rank === 'second');
    const p3 = winners.find(w => w.rank === 'third');

    const renderPodiumStep = (winner, rank) => {
      if (!winner) return '<div style="flex:1;"></div>';
      const isMe = winner.player_id === currentUser?.id;
      const isP1 = rank === 'first';
      const size = isP1 ? 120 : 90;
      const medal = rank === 'first' ? '🥇' : rank === 'second' ? '🥈' : '🥉';
      const color = rank === 'first' ? '#fbbf24' : rank === 'second' ? '#94a3b8' : '#b45309';
      
      // Intentamos obtener sprite si es pokemon
      let prizeImg = '';
      if (winner.prize?.type === 'pokemon') {
        const sprite = getSpriteUrl(winner.prize.species, winner.prize.shiny);
        prizeImg = `<img src="${sprite}" style="width:${isP1 ? 100 : 70}px; height:${isP1 ? 100 : 70}px; image-rendering:pixelated; filter:drop-shadow(0 0 10px ${color}88);">`;
      } else if (winner.prize?.type === 'item') {
        prizeImg = `<div style="font-size:${isP1 ? 60 : 40}px; filter:drop-shadow(0 0 10px ${color}44);">📦</div>`;
      } else {
        prizeImg = `<div style="font-size:${isP1 ? 60 : 40}px; filter:drop-shadow(0 0 10px ${color}44);">💰</div>`;
      }

      return `
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:10px; position:relative; animation: slideUp 0.5s ${rank === 'first' ? '0.1s' : rank === 'second' ? '0s' : '0.2s'} both;">
          <div style="font-size:24px; position:absolute; top:-30px;">${medal}</div>
          <div style="width:${size}px; height:${size}px; background:rgba(255,255,255,0.05); border:2px solid ${color}; border-radius:50%; display:flex; align-items:center; justify-content:center; overflow:hidden; box-shadow:0 0 20px ${color}33;">
            <div style="font-size:${isP1 ? 40 : 30}px;">👤</div>
          </div>
          <div style="text-align:center;">
            <div style="font-family:'Press Start 2P',monospace; font-size:9px; color:${isMe ? '#22c55e' : '#fff'}; margin-bottom:4px;">${winner.player_name}</div>
            <div style="font-size:10px; color:#64748b;">${winner.score} Pts</div>
          </div>
          <div style="margin-top:10px; background:rgba(255,255,255,0.03); padding:10px; border-radius:15px; border:1px solid ${color}44;">
             ${prizeImg}
             <div style="font-size:8px; color:${color}; margin-top:5px; font-weight:bold;">${_prizeSummary(winner.prize)}</div>
          </div>
        </div>`;
    };

    modal.innerHTML = `
      <div style="background:#0f172a; width:100%; max-width:600px; border-radius:30px; border:2px solid #334155; padding:40px; position:relative; overflow:hidden;">
        <div style="position:absolute; top:0; left:0; right:0; height:150px; background:linear-gradient(to bottom, #1e293b, transparent); z-index:0;"></div>
        
        <button onclick="document.getElementById('podium-modal-overlay').remove()" 
          style="position:absolute; top:20px; right:20px; background:rgba(255,255,255,0.05); border:none; color:#94a3b8; font-size:20px; cursor:pointer; z-index:10; width:40px; height:40px; border-radius:50%;">✕</button>

        <div style="position:relative; z-index:1; text-align:center; margin-bottom:40px;">
          <div style="font-size:40px; margin-bottom:10px;">🏆</div>
          <h2 style="font-family:'Press Start 2P',monospace; font-size:16px; color:#fbbf24; margin:0;">PODIO DEL EVENTO</h2>
          <div style="color:#64748b; font-size:12px; margin-top:8px;">${ev?.name || eventId}</div>
        </div>

        <div style="position:relative; z-index:1; display:flex; align-items:flex-end; gap:10px; margin-bottom:40px; min-height:280px;">
          ${renderPodiumStep(p2, 'second')}
          ${renderPodiumStep(p1, 'first')}
          ${renderPodiumStep(p3, 'third')}
        </div>

        <div style="position:relative; z-index:1; text-align:center;">
          ${myAward ? `
            <div style="margin-bottom:20px; padding:15px; background:rgba(34,197,94,0.1); border:1px solid #22c55e44; border-radius:15px; color:#22c55e; font-size:12px;">
              ¡Felicidades! Tenés un premio pendiente por reclamar.
            </div>
            <button onclick="claimAward('${myAward.id}'); document.getElementById('podium-modal-overlay').remove();"
              style="width:100%; padding:18px; border:none; border-radius:18px; background:linear-gradient(135deg, #22c55e, #15803d); color:#fff; font-family:'Press Start 2P',monospace; font-size:10px; cursor:pointer; box-shadow:0 10px 25px rgba(34,197,94,0.4); transform:scale(1); transition:transform 0.2s;"
              onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
              🎁 RECLAMAR RECOMPENSA
            </button>
          ` : `
            <div style="color:#64748b; font-size:11px; font-style:italic;">
              ${currentUser ? 'No tenés premios pendientes en este evento.' : 'Iniciá sesión para ver tus resultados.'}
            </div>
          `}
        </div>
      </div>`;

    document.body.appendChild(modal);

    // 3. Añadir Animaciones si no existen
    if (!document.getElementById('podium-animations')) {
      const style = document.createElement('style');
      style.id = 'podium-animations';
      style.innerHTML = `
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  } catch (e) {
    console.error('[Events] Error al mostrar podio:', e);
  }
}

window._evShowPodium = (eventId) => showEventResultsModal(eventId);

async function checkAndDistributePrizes(allEvents) {
  // Solo el admin o un proceso "autorizado" debería disparar esto para evitar colisiones masivas,
  // pero Supabase RLS y la lógica de lastAwardedAt mitigarán duplicados.
  for (const ev of allEvents) {
    const isActive = _isEventActiveNow(ev);
    const lastAwarded = ev.config?.lastAwardedAt ? new Date(ev.config.lastAwardedAt) : new Date(0);
    
    // Si NO está activo pero TIENE un criterio de premiación y NO ha sido premiado recientemente
    // (Y el tiempo actual es posterior al fin del evento programado)
    if (!isActive && ev.config?.prizes) {
      const sched = ev.schedule;
      if (sched && sched.type === 'weekly') {
        // Lógica simple: si terminó hace poco y no se ha premiado esta sesión
        // Para mayor precisión, compararíamos contra el bloque horario exacto.
        awardEvent(ev.id);
      }
    }
  }
}

window._evAwardFullEvent = async (eventId) => {
  if (!confirm('¿Estás seguro de cerrar el concurso y repartir los premios del podio ahora? Esto eliminará a los participantes actuales.')) return;
  await awardEvent(eventId, true);
};

window._evClearEntries = async (eventId) => {
  if (!confirm('¿Estás seguro de REINICIAR y ELIMINAR a todos los participantes de este evento? Esto no se puede deshacer.')) return;
  try {
    const { error } = await sb.from('competition_entries').delete().eq('event_id', eventId);
    if (error) throw error;
    notify('¡Participantes eliminados correctamente!', '🗑️');
    _evLoadEntries();
  } catch (e) {
    console.error(e);
    notify('Error al reiniciar tabla.', '❌');
  }
};

window._evSavePrize = _evSavePrize;

window._evFieldChange = (idx, field, val) => {
  if (_adminConfig?.events?.[idx]) {
    _adminConfig.events[idx][field] = val;
    // Forzamos re-render para actualizar el texto ON/OFF inmediatamente
    _renderAdminPanel();
  }
};

window._evDayToggle = (idx, day, checked) => {
  if (!_adminConfig?.events?.[idx]) return;
  const ev = _adminConfig.events[idx];
  ev.schedule = ev.schedule || { type: 'weekly', days: [] };
  const days = ev.schedule.days || [];
  if (checked && !days.includes(day)) days.push(day);
  if (!checked) ev.schedule.days = days.filter(d => d !== day);
  else ev.schedule.days = days;
};

window._evHourChange = (idx, field, val) => {
  if (!_adminConfig?.events?.[idx]) return;
  _adminConfig.events[idx].schedule = _adminConfig.events[idx].schedule || {};
  _adminConfig.events[idx].schedule[field] = parseInt(val) || 0;
};

window._evLoadEntriesGlobal = _evLoadEntries;

// Se renombra la función global para evitar colisión con la local y recursión infinita
window._evLoadEntriesGlobal = async () => {
  await _evLoadEntries();
};

// Se elimina _evReadFormIntoConfig ya que ahora guardamos directamente del objeto _adminConfig modificado por los eventos de los inputs

// ── Init ──────────────────────────────────────────────────────────────────────
(function _initEvents() {
  loadActiveEvents();
  _startEventPolling();
})();
