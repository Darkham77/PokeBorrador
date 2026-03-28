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
let _adminConfig = null;
let _adminTab = 'events';
let _adminEntries = [];
let _prizeState = { type: 'money', amount: 0, item: 'Pokéball', qty: 1, species: 'magikarp', level: 5, nature: 'Serio', ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, shiny: false };

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
    // Verificamos eventos cuyo horario coincida o manual=true
    const { data: events, error } = await sb.from('events_config').select('*');
    if (error) throw error;
    
    _activeEvents = events.filter(ev => _isEventActiveNow(ev));
    _eventsLoaded = true;
    _updateEventBanner();
  } catch (e) {
    console.warn('[Events] Error cargando eventos:', e);
  }
}

function _isEventActiveNow(ev) {
  if (!ev.active) return false;
  if (ev.manual) return true;
  const sched = ev.schedule;
  if (!sched) return false;
  
  // Ajuste horario (ej. Argentina UTC-3)
  // Usamos el tiempo local del navegador ajustado a la zona horaria de Argentina si es necesario,
  // pero para simplificar y que coincida con lo que ve el usuario, usamos el objeto Date estándar.
  const now = new Date();
  // Si el servidor/entorno está en UTC, restamos 3 horas para Argentina. 
  // Si el usuario está en Argentina, su hora local ya es correcta.
  // Para que sea consistente con el panel "hs. (ARG)", forzamos el cálculo:
  const argTime = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires"}));
  const day = argTime.getDay();
  const hour = argTime.getHours() + argTime.getMinutes() / 60;
  
  if (sched.type === 'weekly' && sched.days) {
    if (!sched.days.includes(day)) return false;
    if (sched.startHour !== undefined && hour < sched.startHour) return false;
    if (sched.endHour !== undefined && hour >= sched.endHour) return false;
  }
  return true;
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
  const banner = document.getElementById('event-banner');
  if (!banner) return;
  if (_activeEvents.length === 0) {
    banner.style.display = 'none';
    return;
  }
  const html = _activeEvents.map(ev => `
    <span style="display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:6px 12px;font-size:10px;white-space:nowrap;color:#fff;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,0.2);">
      <span>${ev.icon}</span>
      <span>${ev.name}</span>
    </span>`).join('');
  banner.innerHTML = `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center;padding:8px 12px;">${html}</div>`;
  banner.style.display = 'block';
  banner.style.background = 'linear-gradient(to right, rgba(245,158,11,0.1), rgba(245,158,11,0.2), rgba(245,158,11,0.1))';
  banner.style.borderBottom = '1px solid rgba(245,158,11,0.3)';
}

// ── Concurso de Magikarp ──────────────────────────────────────────────────────
async function submitMagikarpEntry(pokemon) {
  if (!isEventActive('hora_magikarp') || !currentUser) return;
  const totalIvs = Object.values(pokemon.ivs || {}).reduce((a, b) => a + b, 0);
  try {
    // Supabase Upsert (usando event_id y player_id como clave única)
    const { data: existing } = await sb.from('competition_entries')
      .select('data')
      .eq('event_id', 'hora_magikarp')
      .eq('player_id', currentUser.id)
      .single();

    if (existing && (existing.data?.total_ivs || 0) >= totalIvs) {
      notify('Ya tenés una inscripción mejor en el concurso de Magikarp.', '🎣');
      return;
    }

    const { error } = await sb.from('competition_entries').upsert({
      event_id: 'hora_magikarp',
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
    notify(`¡Magikarp inscripto! IVs totales: ${totalIvs}/186`, '🎣');
  } catch (e) {
    console.warn('[Events] Error al inscribir Magikarp:', e);
    notify('Error al inscribir en el concurso.', '❌');
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
    const { data: awards, error } = await sb.from('awards')
      .select('*')
      .eq('winner_id', currentUser.id)
      .eq('claimed', false);
    
    if (error) throw error;
    for (const award of (awards || [])) {
      await _deliverAward(award);
    }
  } catch (e) {
    console.warn('[Events] Error al verificar premios:', e);
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
    if (tab === 'competition') _evLoadEntriesGlobal();
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
  const compEv = _adminConfig?.events?.find(e => e.id === 'hora_magikarp');
  const currentPrize = compEv?.config?.prize || null;

  const prizePreview = currentPrize
    ? `<div style="font-size:10px;color:#22c55e;margin-top:4px;">${_prizeSummary(currentPrize)}</div>`
    : `<div style="font-size:10px;color:#6b7280;margin-top:4px;">Sin configurar aún</div>`;

  const pokemonOptions = typeof POKEMON_DB !== 'undefined'
    ? Object.entries(POKEMON_DB).map(([k, v]) => `<option value="${k}" ${_prizeState.species === k ? 'selected' : ''}>${v.name}</option>`).join('')
    : '';

  const itemOptions = ALL_PRIZE_ITEMS.map(it => `<option value="${it}" ${_prizeState.item === it ? 'selected' : ''}>${it}</option>`).join('');
  const natureOptions = EV_NATURES.map(n => `<option value="${n}" ${_prizeState.nature === n ? 'selected' : ''}>${n}</option>`).join('');

  const statsFields = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
  const statLabels = { hp: 'PS', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Vel' };
  const ivInputs = statsFields.map(s => `
    <div style="text-align:center;">
      <div style="font-size:8px;color:#6b7280;margin-bottom:3px;">${statLabels[s]}</div>
      <input type="number" min="0" max="31" value="${_prizeState.ivs[s] ?? 31}"
        id="prize-iv-${s}"
        style="width:40px;padding:5px 2px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;text-align:center;font-size:11px;">
    </div>`).join('');

  return `
    <!-- Premio actual -->
    <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px;margin-bottom:16px;">
      <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#9ca3af;margin-bottom:6px;">PREMIO ACTUAL</div>
      ${prizePreview}
    </div>

    <!-- Constructor de premio -->
    <div style="background:rgba(255,255,255,0.04);border-radius:14px;padding:16px;margin-bottom:16px;">
      <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:#f59e0b;margin-bottom:14px;">🏆 CONFIGURAR PREMIO</div>

      <div style="margin-bottom:12px;">
        <div style="font-size:9px;color:#9ca3af;margin-bottom:6px;">TIPO DE PREMIO</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${[['money','💰 Dinero (₽)'],['bc','🪙 Battle Coins'],['item','📦 Ítem'],['pokemon','🐾 Pokémon']].map(([v,l]) => `
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer;background:rgba(0,0,0,0.3);border-radius:8px;padding:6px 10px;border:1px solid ${_prizeState.type===v?'#f59e0b':'rgba(255,255,255,0.08)'};">
              <input type="radio" name="prize-type" value="${v}" ${_prizeState.type===v?'checked':''} onchange="window._evPrizeType('${v}')" style="accent-color:#f59e0b;">
              <span style="font-size:10px;color:${_prizeState.type===v?'#f59e0b':'#9ca3af'};">${l}</span>
            </label>`).join('')}
        </div>
      </div>

      <!-- Money / BC -->
      <div id="prize-field-amount" style="display:${['money','bc'].includes(_prizeState.type)?'block':'none'};margin-bottom:12px;">
        <div style="font-size:9px;color:#9ca3af;margin-bottom:6px;">CANTIDAD ${_prizeState.type === 'bc' ? 'BC' : '₽'}</div>
        <input type="number" min="0" id="prize-amount" value="${_prizeState.amount}"
          oninput="_prizeState.amount=parseInt(this.value)||0"
          style="width:100%;padding:10px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:14px;box-sizing:border-box;">
      </div>

      <!-- Item -->
      <div id="prize-field-item" style="display:${_prizeState.type==='item'?'block':'none'};margin-bottom:12px;">
        <div style="font-size:9px;color:#9ca3af;margin-bottom:6px;">ÍTEM</div>
        <select id="prize-item" onchange="_prizeState.item=this.value"
          style="width:100%;padding:10px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:12px;margin-bottom:8px;box-sizing:border-box;">
          ${itemOptions}
        </select>
        <div style="font-size:9px;color:#9ca3af;margin-bottom:4px;">CANTIDAD</div>
        <input type="number" min="1" id="prize-qty" value="${_prizeState.qty}"
          oninput="_prizeState.qty=parseInt(this.value)||1"
          style="width:80px;padding:8px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:13px;">
      </div>

      <!-- Pokémon -->
      <div id="prize-field-pokemon" style="display:${_prizeState.type==='pokemon'?'block':'none'};margin-bottom:12px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
          <div>
            <div style="font-size:9px;color:#9ca3af;margin-bottom:4px;">ESPECIE</div>
            <select id="prize-species" onchange="_prizeState.species=this.value"
              style="width:100%;padding:8px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:11px;box-sizing:border-box;">
              ${pokemonOptions}
            </select>
          </div>
          <div>
            <div style="font-size:9px;color:#9ca3af;margin-bottom:4px;">NIVEL</div>
            <input type="number" min="1" max="100" id="prize-level" value="${_prizeState.level}"
              oninput="_prizeState.level=parseInt(this.value)||5"
              style="width:100%;padding:8px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:13px;box-sizing:border-box;">
          </div>
        </div>
        <div style="margin-bottom:10px;">
          <div style="font-size:9px;color:#9ca3af;margin-bottom:4px;">NATURALEZA</div>
          <select id="prize-nature" onchange="_prizeState.nature=this.value"
            style="width:100%;padding:8px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:11px;box-sizing:border-box;">
            ${natureOptions}
          </select>
        </div>
        <div style="margin-bottom:12px;">
          <div style="font-size:9px;color:#9ca3af;margin-bottom:6px;">GENÉTICA (IVs)</div>
          <div style="display:flex;justify-content:space-between;gap:4px;">${ivInputs}</div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" id="prize-shiny" ${_prizeState.shiny?'checked':''} onchange="_prizeState.shiny=this.checked" style="accent-color:#f59e0b;width:16px;height:16px;">
          <span style="font-size:10px;color:#f59e0b;">✨ ES SHINY</span>
        </label>
      </div>

      <button onclick="window._evSavePrize()"
        style="width:100%;padding:12px;border:none;border-radius:12px;background:rgba(255,255,255,0.07);color:#fff;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;">
        💾 GUARDAR PREMIO
      </button>
    </div>

    <!-- Participantes -->
    <div style="background:rgba(255,255,255,0.04);border-radius:14px;padding:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:#22c55e;">🎣 PARTICIPANTES</div>
        <button onclick="window._evLoadEntriesGlobal()" style="background:none;border:none;color:#6b7280;font-size:14px;cursor:pointer;">🔄</button>
      </div>
      <div id="admin-entries-container">
        <div style="font-size:11px;color:#6b7280;text-align:center;padding:20px;">Cargando...</div>
      </div>
    </div>`;
}

async function _evLoadEntries() {
  if (!isAdminUser()) return;
  try {
    const { data: entries, error } = await sb.from('competition_entries')
      .select('*')
      .eq('event_id', 'hora_magikarp');
    
    if (error) throw error;
    _adminEntries = (entries || []).sort((a, b) => (b.data?.total_ivs || 0) - (a.data?.total_ivs || 0));
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
  if (_prizeState.type === 'pokemon') {
    stats.forEach(s => {
      const el = document.getElementById(`prize-iv-${s}`);
      if (el) _prizeState.ivs[s] = parseInt(el.value) || 0;
    });
    const specEl = document.getElementById('prize-species');
    const lvEl = document.getElementById('prize-level');
    const natEl = document.getElementById('prize-nature');
    const shinyEl = document.getElementById('prize-shiny');
    if (specEl) _prizeState.species = specEl.value;
    if (lvEl) _prizeState.level = parseInt(lvEl.value) || 5;
    if (natEl) _prizeState.nature = natEl.value;
    if (shinyEl) _prizeState.shiny = shinyEl.checked;
  }
  
  const prize = _buildPrizeObject();
  const ev = _adminConfig?.events?.find(e => e.id === 'hora_magikarp');
  if (ev) {
    ev.config = ev.config || {};
    ev.config.prize = prize;
  }

  try {
    const { error } = await sb.from('events_config').update({
      config: ev.config
    }).eq('id', 'hora_magikarp');
    
    if (error) throw error;
    notify('¡Premio guardado! ' + _prizeSummary(prize), '🏆'); 
    _renderAdminPanel();
  } catch (e) { 
    console.error(e);
    notify('Error al guardar premio en Supabase.', '❌'); 
  }
}

function _buildPrizeObject() {
  if (_prizeState.type === 'money') return { type: 'money', amount: _prizeState.amount };
  if (_prizeState.type === 'bc') return { type: 'bc', amount: _prizeState.amount };
  if (_prizeState.type === 'item') return { type: 'item', item: _prizeState.item, qty: _prizeState.qty };
  if (_prizeState.type === 'pokemon') {
    return {
      type: 'pokemon',
      species: _prizeState.species,
      level: _prizeState.level,
      nature: _prizeState.nature,
      ivs: { ..._prizeState.ivs },
      shiny: _prizeState.shiny
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
  _prizeState.type = type;
  document.getElementById('prize-field-amount').style.display = ['money','bc'].includes(type) ? 'block' : 'none';
  document.getElementById('prize-field-item').style.display = type === 'item' ? 'block' : 'none';
  document.getElementById('prize-field-pokemon').style.display = type === 'pokemon' ? 'block' : 'none';
  document.querySelectorAll('input[name="prize-type"]').forEach(r => {
    r.parentElement.style.borderColor = r.value === type ? '#f59e0b' : 'rgba(255,255,255,0.08)';
    r.parentElement.querySelector('span').style.color = r.value === type ? '#f59e0b' : '#9ca3af';
  });
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
