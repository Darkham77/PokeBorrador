// ===== ENHANCED TRADE SYSTEM WITH POKEMON SELECTOR =====
// Extensión del sistema de trade para permitir seleccionar Pokémon de equipo y caja con filtros

// Variables globales para el selector de Pokémon en trade
let _tradePokeSelector = {
  side: null, // 'offer' o 'request'
  filter: { search: '', fav: false, breed: false, iv31: false },
  friendSave: null
};

// ── Abrir modal de selección de Pokémon para trade ────────────────────────
function openTradePokeSelector(side) {
  _tradePokeSelector.side = side;
  _tradePokeSelector.filter = { search: '', fav: false, breed: false, iv31: false };

  const isFriendSide = side === 'request';
  const sourceTeam = isFriendSide ? (_tradeFriendSave?.team || []) : (state.team || []);
  const sourceBox = isFriendSide ? (_tradeFriendSave?.box || []) : (state.box || []);
  const allPokes = [...sourceTeam, ...sourceBox];

  if (allPokes.length === 0) {
    notify(isFriendSide ? 'Tu amigo no tiene Pokémon.' : 'No tienes Pokémon disponibles.', '⚠️');
    return;
  }

  const sideLabel = isFriendSide ? 'del amigo' : 'tuyo';
  const sideColor = isFriendSide ? '#fbbf24' : '#a855f7';

  // Crear overlay
  const ov = document.createElement('div');
  ov.id = 'trade-poke-selector-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9700;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn 0.2s;';
  ov.innerHTML = `
    <div style="background:#0f172a;border:1px solid ${sideColor}44;border-radius:20px;padding:20px;max-width:480px;width:100%;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.8);">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-shrink:0;">
        <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:${sideColor};">
          🔄 SELECCIONAR POKÉMON ${isFriendSide ? 'DEL AMIGO' : 'TUYO'}
        </div>
        <button onclick="document.getElementById('trade-poke-selector-overlay').remove()" 
          style="background:none;border:none;color:#9ca3af;font-size:18px;cursor:pointer;line-height:1;">✕</button>
      </div>

      <!-- FILTROS -->
      <div style="margin-bottom:12px;flex-shrink:0;background:rgba(255,255,255,0.02);padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,0.05);">
        <input type="text" id="trade-selector-filter-name" placeholder="Buscar por nombre..." 
          style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);padding:10px;border-radius:8px;color:#fff;font-size:11px;margin-bottom:8px;outline:none;"
          oninput="window._updateTradeSelectorList()">
        
        <div style="display:flex;gap:6px;margin-bottom:8px;">
          <button id="btn-trade-filter-fav" onclick="window._toggleTradeSelectorFilter('fav')" 
            style="flex:1;padding:6px;font-size:9px;border:1px solid rgba(251,191,36,0.2);border-radius:8px;background:rgba(251,191,36,0.05);color:#fbbf24;cursor:pointer;transition:0.15s;">⭐ Fav</button>
          <button id="btn-trade-filter-breed" onclick="window._toggleTradeSelectorFilter('breed')" 
            style="flex:1;padding:6px;font-size:9px;border:1px solid rgba(239,68,68,0.2);border-radius:8px;background:rgba(239,68,68,0.05);color:#f87171;cursor:pointer;transition:0.15s;">❤️ Crianza</button>
          <button id="btn-trade-filter-iv31" onclick="window._toggleTradeSelectorFilter('iv31')" 
            style="flex:1;padding:6px;font-size:9px;border:1px solid rgba(34,197,94,0.2);border-radius:8px;background:rgba(34,197,94,0.05);color:#4ade80;cursor:pointer;transition:0.15s;">🧬 IV 31</button>
        </div>

        <div style="display:flex;gap:6px;font-size:9px;color:#6b7280;">
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer;flex:1;">
            <input type="checkbox" id="trade-selector-team-only" onchange="window._updateTradeSelectorList()" style="width:14px;height:14px;cursor:pointer;">
            <span>Solo equipo</span>
          </label>
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer;flex:1;">
            <input type="checkbox" id="trade-selector-box-only" onchange="window._updateTradeSelectorList()" style="width:14px;height:14px;cursor:pointer;">
            <span>Solo PC</span>
          </label>
        </div>
      </div>

      <!-- Pokémon cards container -->
      <div id="trade-selector-list" style="display:flex;flex-direction:column;gap:10px;overflow-y:auto;flex:1;padding-right:4px;">
        <!-- Se rellena dinámicamente -->
      </div>
    </div>`;
  document.body.appendChild(ov);

  // Inicializar lista
  window._updateTradeSelectorList();
}

// ── Actualizar lista de Pokémon en el selector ────────────────────────────
window._updateTradeSelectorList = function() {
  const listEl = document.getElementById('trade-selector-list');
  if (!listEl) return;

  const side = _tradePokeSelector.side;
  const isFriendSide = side === 'request';
  const sourceTeam = isFriendSide ? (_tradeFriendSave?.team || []) : (state.team || []);
  const sourceBox = isFriendSide ? (_tradeFriendSave?.box || []) : (state.box || []);

  const f = _tradePokeSelector.filter;
  const nameQuery = document.getElementById('trade-selector-filter-name')?.value.toLowerCase().trim() || '';
  const teamOnly = document.getElementById('trade-selector-team-only')?.checked || false;
  const boxOnly = document.getElementById('trade-selector-box-only')?.checked || false;

  // Filtrar por ubicación
  let allPokes = [];
  if (!boxOnly) allPokes = allPokes.concat(sourceTeam.map((p, i) => ({ ...p, _source: 'team', _index: i })));
  if (!teamOnly) allPokes = allPokes.concat(sourceBox.map((p, i) => ({ ...p, _source: 'box', _index: i })));

  // Aplicar filtros
  const filtered = allPokes.filter(p => {
    if (nameQuery && !p.name.toLowerCase().includes(nameQuery) && !p.id.toLowerCase().includes(nameQuery)) return false;
    const tags = p.tags || [];
    if (f.fav && !tags.includes('fav')) return false;
    if (f.breed && !tags.includes('breed')) return false;
    if (f.iv31 && !tags.includes('iv31')) return false;
    return true;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `<div style="text-align:center;color:#6b7280;padding:24px;font-size:11px;">No se encontraron Pokémon con los filtros actuales.</div>`;
  } else {
    listEl.innerHTML = filtered.map(p => _buildTradeSelectorCard(p)).join('');
  }

  // Actualizar estilos de botones de filtro
  const updateBtn = (id, active, color) => {
    const el = document.getElementById(id);
    if (el) {
      el.style.background = active ? color + '22' : 'rgba(255,255,255,0.05)';
      el.style.color = active ? '#fff' : color;
      el.style.border = active ? `1px solid ${color}` : `1px solid rgba(255,255,255,0.1)`;
    }
  };
  updateBtn('btn-trade-filter-fav', f.fav, '#fbbf24');
  updateBtn('btn-trade-filter-breed', f.breed, '#f87171');
  updateBtn('btn-trade-filter-iv31', f.iv31, '#4ade80');
};

// ── Construir tarjeta de Pokémon para el selector ────────────────────────
function _buildTradeSelectorCard(p) {
  const totalIvs = Object.values(p.ivs || {}).reduce((s, v) => s + (v || 0), 0);
  const tags = p.tags || [];
  const spriteUrl = (typeof getSpriteUrl === 'function') ? getSpriteUrl(p.id, p.isShiny) : '';

  const tagsHtml = tags.length ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
    ${tags.includes('fav') ? '<span style="background:rgba(251,191,36,0.2);color:#fbbf24;border:1px solid rgba(251,191,36,0.4);border-radius:6px;padding:1px 6px;font-size:10px;">⭐ Fav</span>' : ''}
    ${tags.includes('breed') ? '<span style="background:rgba(239,68,68,0.2);color:#f87171;border:1px solid rgba(239,68,68,0.4);border-radius:6px;padding:1px 6px;font-size:10px;">❤️ Crianza</span>' : ''}
    ${tags.includes('iv31') ? '<span style="background:rgba(34,197,94,0.2);color:#4ade80;border:1px solid rgba(34,197,94,0.4);border-radius:6px;padding:1px 6px;font-size:10px;">31 IV Max</span>' : ''}
  </div>` : '';

  const IV_LABELS = { hp: 'HP', atk: 'ATK', def: 'DEF', spa: 'SpA', spd: 'SpD', spe: 'VEL' };
  const ivBars = Object.entries(p.ivs || {}).filter(([stat]) => IV_LABELS[stat]).map(([stat, val]) => {
    const pct = Math.round((val / 31) * 100);
    const color = val >= 28 ? '#4ade80' : val >= 15 ? '#fbbf24' : '#f87171';
    return `<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">
      <span style="font-size:9px;color:#6b7280;width:26px;flex-shrink:0;">${IV_LABELS[stat] || stat}</span>
      <div style="flex:1;height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;"></div>
      </div>
      <span style="font-size:9px;color:${color};width:18px;text-align:right;">${val}</span>
    </div>`;
  }).join('');

  const shinyBadge = p.isShiny ? '<span style="font-size:11px;margin-left:4px;">✨</span>' : '';
  const sourceLabel = p._source === 'team' ? '<span style="font-size:8px;color:#3b82f6;background:rgba(59,139,255,0.2);padding:2px 6px;border-radius:4px;margin-left:4px;">⚡ Equipo</span>' : '<span style="font-size:8px;color:#9ca3af;background:rgba(255,255,255,0.05);padding:2px 6px;border-radius:4px;margin-left:4px;">📦 PC</span>';

  return `<div style="background:rgba(168,85,247,0.0d);border:1px solid rgba(168,85,247,0.2);border-radius:12px;padding:12px;transition:0.15s;"
      onmouseover="this.style.background='rgba(168,85,247,0.15)';this.style.borderColor='rgba(168,85,247,0.4)'"
      onmouseout="this.style.background='rgba(168,85,247,0.0d)';this.style.borderColor='rgba(168,85,247,0.2)'">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <div style="width:44px;height:44px;flex-shrink:0;position:relative;">
        ${spriteUrl
          ? `<img src="${spriteUrl}" width="44" height="44" style="image-rendering:pixelated;" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
             <span style="display:none;font-size:32px;line-height:44px;">${p.emoji || '❓'}</span>`
          : `<span style="font-size:32px;line-height:44px;">${p.emoji || '❓'}</span>`}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;font-weight:bold;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;">
          ${p.name || p.id}${shinyBadge}${sourceLabel}
        </div>
        <div style="font-size:10px;color:#9ca3af;">Nv.${p.level} · ${p.nature || '—'}</div>
        ${tagsHtml}
      </div>
    </div>
    <div style="margin-bottom:8px;">${ivBars}</div>
    <div style="font-size:10px;color:#a855f7;margin-bottom:8px;"><strong>IV Total: ${totalIvs}/186</strong></div>
    <button onclick="window._confirmTradePokemonSelect('${p._source}', ${p._index})"
      style="width:100%;padding:8px 10px;border:none;border-radius:8px;background:linear-gradient(135deg,#a855f7,#9333ea);color:#fff;font-size:11px;font-weight:bold;cursor:pointer;transition:0.15s;"
      onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
      ✓ Seleccionar
    </button>
  </div>`;
}

// ── Toggle de filtro ────────────────────────────────────────────────────────
window._toggleTradeSelectorFilter = function(key) {
  _tradePokeSelector.filter[key] = !_tradePokeSelector.filter[key];
  window._updateTradeSelectorList();
};

// ── Confirmar selección de Pokémon ──────────────────────────────────────────
window._confirmTradePokemonSelect = function(source, index) {
  const side = _tradePokeSelector.side;
  const isFriendSide = side === 'request';

  if (isFriendSide) {
    const poke = source === 'team' 
      ? (_tradeFriendSave?.team || [])[index]
      : (_tradeFriendSave?.box || [])[index];
    if (poke) {
      _tradeRequestPoke = poke;
      renderTradeRequestPokemon();
      updateTradeSummary();
    }
  } else {
    const poke = source === 'team'
      ? (state.team || [])[index]
      : (state.box || [])[index];
    if (poke) {
      _tradeOfferPoke = poke;
      renderTradeOfferPokemon();
      updateTradeSummary();
    }
  }

  // Cerrar el selector
  document.getElementById('trade-poke-selector-overlay')?.remove();
};
