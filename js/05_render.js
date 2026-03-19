// ===== SCREENS =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ===== TABS =====
function showTab(tab, btnEl) {
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  // Limpiar estado activo en ambos menús
  document.querySelectorAll('.nav-btn, .hud-nav-btn').forEach(b => b.classList.remove('active'));

  const targetTab = document.getElementById('tab-' + tab);
  if (targetTab) targetTab.style.display = 'block';

  // Activar botones correspondientes en ambos menús
  document.querySelectorAll(`.nav-btn[data-tab="${tab}"], .hud-nav-btn[data-tab="${tab}"]`).forEach(b => {
    b.classList.add('active');
  });
  if (tab === 'team') renderTeam();
  if (tab === 'pokedex') renderPokedex();
  if (tab === 'gyms') renderGyms();
  if (tab === 'market') switchShopSection(_shopSection);
  if (tab === 'map') renderMaps();
  if (tab === 'daycare') renderDaycareUI();
  if (tab === 'box') renderBox();
  if (tab === 'bag') renderBag();
  if (tab === 'friends') renderFriends();
  // Al abrir la tab de amigos, ocultar el badge (el usuario ya lo está viendo)
  if (tab === 'friends') {
    const badge = document.getElementById('friends-nav-badge');
    if (badge) {
      badge.style.display = 'none';
      badge.textContent = '';
    }
  } else {
    refreshFriendsBadge();
  }
}

// ===== RENDER =====
function getHpClass(pct) {
  if (pct > 0.5) return 'hp-high';
  if (pct > 0.25) return 'hp-mid';
  return 'hp-low';
}

function renderTeam() {
  const grid = document.getElementById('team-grid');
  if (state.team.length === 0) {
    grid.innerHTML = '<div class="empty-state"><span class="empty-icon">🎒</span>No tenés Pokémon en tu equipo todavía.</div>';
    return;
  }
  const releasing = grid.dataset.releaseMode === 'true';
  grid.innerHTML = state.team.map((p, i) => {
    const pct = p.hp / p.maxHp;
    const selected = _releaseSelected.has(i);
    const selClass = releasing ? (selected ? 'release-selected' : 'release-selectable') : '';
    const checkMark = releasing && selected ? '<div class="release-check">✓</div>' : '';
    const clickFn = releasing ? `toggleReleaseSelect(${i})` : `openPokemonDetail(${i})`;
    const tierInfo = getPokemonTier(p);

    // Held item info
    let heldIcon = '';
    if (p.heldItem) {
      const item = SHOP_ITEMS.find(it => it.name === p.heldItem);
      heldIcon = `<div style="position:absolute;top:5px;left:5px;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);padding:3px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);z-index:2;display:flex;align-items:center;gap:4px;" title="Equipado: ${p.heldItem}">
            <span style="font-size:12px;">${item ? item.icon : '📦'}</span>
          </div>`;
    }

    // Tags display
    const tags = p.tags || [];
    const tagsHtml = tags.length ? `<div class="tag-display">
          ${tags.includes('fav') ? '<span class="tag-icon-small">⭐</span>' : ''}
          ${tags.includes('breed') ? '<span class="tag-icon-small">❤️</span>' : ''}
          ${tags.includes('iv31') ? '<span class="tag-icon-small">31</span>' : ''}
        </div>` : '';

    return `<div class="team-card ${selClass}" onclick="${clickFn}" style="cursor:pointer;position:relative;" draggable="${!releasing}" ondragstart="handleDragStart(event, ${i})" ondragover="handleDragOver(event)" ondrop="handleDrop(event, ${i})">
      ${checkMark}
      ${heldIcon}
      ${tagsHtml}
      <div style="position:absolute;top:5px;right:5px;background:${tierInfo.bg};color:${tierInfo.color};font-family:'Press Start 2P',monospace;font-size:6px;padding:2px 5px;border-radius:6px;border:1px solid ${tierInfo.color}44;line-height:1.4;z-index:2;">${tierInfo.tier}</div>
      <div style="height:80px;display:flex;align-items:center;justify-content:center;margin-bottom:4px;">
        <img id="team-sprite-${i}" src="" alt="${p.name}" style="width:72px;height:72px;image-rendering:pixelated;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5));display:none;pointer-events:none;">
        <span id="team-emoji-${i}" style="font-size:48px;pointer-events:none;">${p.emoji}</span>
      </div>
      <div class="team-pokemon-name">${p.name}${p.isShiny ? ' ✨' : ''} ${renderGenderBadge(p.gender)}</div>
      <div class="team-pokemon-level">Nv. ${p.level}</div>
      <div class="hp-bar-wrap"><div class="hp-bar ${getHpClass(pct)}" style="width:${pct * 100}%"></div></div>
      <div style="font-size:11px;color:var(--gray);margin-top:4px">${p.hp}/${p.maxHp} HP</div>
      ${releasing ? '' : `<div style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap;">
        <button onclick="event.stopPropagation(); openTeamItemMenu(${i})" style="flex:1;min-width:40%;font-family:'Press Start 2P',monospace;font-size:6px;color:var(--green);background:rgba(107,203,119,0.15);border:1px solid rgba(107,203,119,0.3);border-radius:6px;padding:6px;cursor:pointer;">🎒 OBJETO</button>
        <button onclick="event.stopPropagation(); openPokemonDetail(${i})" style="flex:1;min-width:40%;font-family:'Press Start 2P',monospace;font-size:6px;color:var(--purple);background:rgba(199,125,255,0.15);border:1px solid rgba(199,125,255,0.3);border-radius:6px;padding:6px;cursor:pointer;">👁️ DATOS</button>
        <button onclick="event.stopPropagation(); sendToBox(${i})" style="flex:1;min-width:100%;font-family:'Press Start 2P',monospace;font-size:6px;color:var(--blue);background:rgba(59,139,255,0.15);border:1px solid rgba(59,139,255,0.3);border-radius:6px;padding:6px;cursor:pointer;">📦 CAJA</button>
      </div>`}
    </div>`;
  }).join('');
  state.team.forEach((p, i) => {
    setTimeout(() => {
      const img = document.getElementById('team-sprite-' + i);
      const emo = document.getElementById('team-emoji-' + i);
      if (img && emo) loadSprite(img, emo, getSpriteUrl(p.id, p.isShiny), p.emoji);
    }, 30 * i);
  });
}

function sendToBox(index) {
  if (state.team.length <= 1) {
    notify('¡No puedes enviar a tu último Pokémon a la caja!', '⚠️');
    return;
  }
  if (!state.box) state.box = [];
  if (state.box.length >= 100) {
    notify('¡La Caja está llena!', '⚠️');
    return;
  }

  const p = state.team.splice(index, 1)[0];
  // Heal when sending to box
  p.hp = p.maxHp;
  p.status = null;
  p.sleepTurns = 0;
  state.box.push(p);

  notify(`¡${p.name} enviado a la Caja!`, '📦');
  renderTeam();
  renderBox(); // Ensure box is updated if accessed later
  scheduleSave();
}

// ── Drag & Drop Reorder ──────────────────────────────────────────────────
function handleDragStart(e, index) {
  if (document.getElementById('team-grid').dataset.releaseMode === 'true') {
    e.preventDefault(); return;
  }
  e.dataTransfer.setData('text/plain', index);
  e.dataTransfer.effectAllowed = 'move';
}
function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}
function handleDrop(e, targetIndex) {
  e.preventDefault();
  e.stopPropagation();
  const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
  if (draggedIndex === targetIndex || isNaN(draggedIndex)) return;

  const movedPokemon = state.team.splice(draggedIndex, 1)[0];
  state.team.splice(targetIndex, 0, movedPokemon);

  renderTeam();
  scheduleSave();
}

// ── Release mode ──────────────────────────────────────────────────────────
let _releaseSelected = new Set();

function toggleReleaseMode() {
  const grid = document.getElementById('team-grid');
  const isOn = grid.dataset.releaseMode === 'true';
  grid.dataset.releaseMode = isOn ? 'false' : 'true';
  _releaseSelected.clear();
  document.getElementById('btn-release-mode').style.display = isOn ? 'inline-block' : 'none';
  document.getElementById('btn-confirm-release').style.display = isOn ? 'none' : 'inline-block';
  document.getElementById('btn-cancel-release').style.display = isOn ? 'none' : 'inline-block';
  document.getElementById('release-hint').style.display = isOn ? 'none' : 'block';
  renderTeam();
}

function toggleReleaseSelect(index) {
  // Can't select if it would leave the team empty
  if (_releaseSelected.has(index)) {
    _releaseSelected.delete(index);
  } else {
    // Don't allow selecting all — must keep at least 1
    const wouldLeave = state.team.length - (_releaseSelected.size + 1);
    if (wouldLeave < 1) {
      notify('¡Debés conservar al menos un Pokémon!', '⚠️');
      return;
    }
    _releaseSelected.add(index);
  }
  renderTeam();
}

function confirmRelease() {
  if (_releaseSelected.size === 0) {
    notify('No seleccionaste ningún Pokémon.', '❓');
    return;
  }
  const names = [..._releaseSelected].map(i => state.team[i].name).join(', ');

  // Confirmation overlay
  const overlay = document.createElement('div');
  overlay.id = 'release-confirm-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="background:var(--card);border-radius:20px;padding:32px 24px;max-width:340px;width:100%;text-align:center;border:1px solid rgba(255,59,59,0.3);">
      <div style="font-size:48px;margin-bottom:12px;">🌿</div>
      <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:var(--red);margin-bottom:16px;">¿SOLTAR POKÉMON?</div>
      <div style="font-size:13px;color:var(--gray);line-height:1.6;margin-bottom:24px;">
        Vas a soltar a:<br>
        <strong style="color:var(--text);">${names}</strong><br><br>
        Esta acción es <strong style="color:var(--red);">permanente</strong> y no se puede deshacer.
      </div>
      <div style="display:flex;gap:12px;justify-content:center;">
        <button onclick="doRelease()" style="font-family:'Press Start 2P',monospace;font-size:8px;
          padding:12px 20px;border:none;border-radius:12px;cursor:pointer;
          background:linear-gradient(135deg,var(--red),#c0392b);color:#fff;">
          ¡SÍ, SOLTAR!
        </button>
        <button onclick="document.getElementById('release-confirm-overlay').remove()" style="font-family:'Press Start 2P',monospace;font-size:8px;
          padding:12px 20px;border:1px solid rgba(255,255,255,0.1);border-radius:12px;cursor:pointer;
          background:transparent;color:var(--gray);">
          CANCELAR
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function doRelease() {
  // Remove confirmation overlay
  document.getElementById('release-confirm-overlay')?.remove();

  const indices = [..._releaseSelected].sort((a, b) => b - a); // remove from end first
  const releasedNames = indices.map(i => state.team[i].name);

  indices.forEach(i => state.team.splice(i, 1));

  _releaseSelected.clear();

  // Exit release mode
  const grid = document.getElementById('team-grid');
  grid.dataset.releaseMode = 'false';
  document.getElementById('btn-release-mode').style.display = 'inline-block';
  document.getElementById('btn-confirm-release').style.display = 'none';
  document.getElementById('btn-cancel-release').style.display = 'none';
  document.getElementById('release-hint').style.display = 'none';

  renderTeam();
  updateHud();
  scheduleSave();
  notify(`¡${releasedNames.join(', ')} ${releasedNames.length > 1 ? 'fueron soltados' : 'fue soltado'}!`, '🌿');
}


function buildNatureTooltip(nature) {
  const data = NATURE_DATA[nature];
  if (!data) return `<div style="font-size:13px;font-weight:700;color:#FFD93D;">${nature}</div>`;
  let effect = '';
  if (data.up) {
    effect = `<span class="tooltip-up">⬆ +10% ${data.up}</span><br><span class="tooltip-down">⬇ -10% ${data.down}</span>`;
  } else {
    effect = `<span class="tooltip-neutral">Sin efecto en estadísticas</span>`;
  }
  return `<div class="tooltip-wrap">
    <div style="font-size:13px;font-weight:700;color:#FFD93D;text-decoration:underline dotted;text-underline-offset:3px;">${nature} ❓</div>
    <div class="tooltip-box"><span class="tooltip-title">${nature}</span>${effect}</div>
  </div>`;
}

function buildAbilityTooltip(ability) {
  const desc = ABILITY_DATA[ability] || 'Habilidad especial de este Pokémon.';
  return `<div class="tooltip-wrap">
    <div style="font-size:13px;font-weight:700;color:#6BCB77;text-decoration:underline dotted;text-underline-offset:3px;">${ability} ❓</div>
    <div class="tooltip-box"><span class="tooltip-title">${ability}</span>${desc}</div>
  </div>`;
}

function togglePokeTag(location, index, tag) {
  const p = location === 'team' ? state.team[index] : state.box[index];
  if (!p) return;
  if (!p.tags) p.tags = [];
  const tagIdx = p.tags.indexOf(tag);
  if (tagIdx > -1) p.tags.splice(tagIdx, 1);
  else p.tags.push(tag);

  if (location === 'team') {
    renderTeam();
    openPokemonDetail(index);
  } else {
    renderBox();
    openBoxPokemonDetail(index);
  }
  scheduleSave();
}

function openPokemonDetail(index) {
  const p = state.team[index];
  const pct = p.hp / p.maxHp;
  const hpClass = getHpClass(pct);
  const typeColors = { grass: '#6BCB77', fire: '#FF3B3B', water: '#3B8BFF', normal: '#aaa', electric: '#FFD93D', psychic: '#C77DFF', rock: '#c8a060', ground: '#c8a060', poison: '#C77DFF' };
  const typeColor = typeColors[p.type] || '#aaa';
  const tags = p.tags || [];

  const ivBars = Object.entries(p.ivs).map(([stat, val]) => {
    const labels = { hp: 'HP', atk: 'Ataque', def: 'Defensa', spa: 'At.Esp', spd: 'Def.Esp', spe: 'Velocidad' };
    const pct = (val / 31) * 100;
    const color = val >= 28 ? '#6BCB77' : val >= 15 ? '#FFD93D' : '#FF3B3B';
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <span style="font-size:10px;color:#888;width:65px;flex-shrink:0">${labels[stat]}</span>
      <div style="flex:1;background:rgba(255,255,255,0.1);border-radius:10px;height:8px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:10px;transition:width 0.5s;"></div>
      </div>
      <span style="font-size:11px;color:${color};width:24px;text-align:right;">${val}</span>
    </div>`;
  }).join('');

  const movesList = p.moves.map(m => {
    const power = (typeof MOVE_POWER !== 'undefined' ? MOVE_POWER[m.name] : 0) || 40;
    return `<div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;margin-bottom:4px;">${m.name}</div>
        <div style="font-size:11px;color:#888;">Poder: ${power}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#FFD93D;">PP</div>
        <div style="font-size:13px;font-weight:700;">${m.pp}/${m.maxPP}</div>
      </div>
    </div>`;
  }).join('');

  const statsHtml = [
    { label: 'HP', val: p.maxHp }, { label: 'Ataque', val: p.atk }, { label: 'Defensa', val: p.def },
    { label: 'At. Esp', val: p.spa || p.atk }, { label: 'Def. Esp', val: p.spd || p.def }, { label: 'Velocidad', val: p.spe || 40 }
  ].map(s => `<div style="text-align:center;background:rgba(255,255,255,0.05);border-radius:10px;padding:10px;">
    <div style="font-size:10px;color:#888;margin-bottom:4px;">${s.label}</div>
    <div style="font-size:16px;font-weight:900;color:#eaeaea;">${s.val}</div>
  </div>`).join('');

  const expPct = p.expNeeded ? Math.min(100, (p.exp || 0) / p.expNeeded * 100) : 0;

  const html = `<div style="background:#16213e;border-radius:24px;padding:28px;max-width:480px;width:92%;max-height:88vh;overflow-y:auto;border:2px solid ${typeColor}33;animation:fadeIn 0.3s ease;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:16px;">
        <div style="width:80px;height:80px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);border-radius:12px;">
          <img id="detail-sprite-img" src="${getSpriteUrl(p.id, p.isShiny)}" alt="${p.name}" style="width:72px;height:72px;image-rendering:pixelated;display:none;">
          <span id="detail-sprite-emoji" style="font-size:52px;">${p.emoji}</span>
        </div>
        <div>
          <div style="font-family:'Press Start 2P',monospace;font-size:12px;color:${typeColor};margin-bottom:6px;">${p.name}${p.isShiny ? ' ✨' : ''}</div>
          <div style="font-size:12px;color:#888;">Nivel ${p.level} · ${p.type.charAt(0).toUpperCase() + p.type.slice(1)}</div>
          <div style="font-size:11px;color:#555;margin-top:4px;">#${String(POKEMON_SPRITE_IDS[p.id] || '???').padStart(3, '0')}</div>
          <div style="display:flex;gap:12px;margin-top:10px;">
            <div class="poke-tag ${tags.includes('fav') ? 'active' : ''}" onclick="togglePokeTag('team', ${index}, 'fav')" title="Favorito">⭐</div>
            <div class="poke-tag ${tags.includes('breed') ? 'active' : ''}" onclick="togglePokeTag('team', ${index}, 'breed')" title="Crianza">❤️</div>
            <div class="poke-tag ${tags.includes('iv31') ? 'active' : ''}" onclick="togglePokeTag('team', ${index}, 'iv31')" title="IV 31">31</div>
          </div>
        </div>
      </div>
      <button onclick="closePokemonDetail()" style="background:rgba(255,255,255,0.1);border:none;border-radius:10px;color:#aaa;font-size:18px;cursor:pointer;padding:6px 12px;">✕</button>
    </div>

    <!-- HP -->
    <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:14px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:12px;font-weight:700;">HP</span>
        <span style="font-size:12px;color:#888;">${p.hp} / ${p.maxHp}</span>
      </div>
      <div style="background:rgba(255,255,255,0.1);border-radius:10px;height:10px;overflow:hidden;">
        <div style="width:${pct * 100}%;height:100%;border-radius:10px;" class="${hpClass}"></div>
      </div>
      <div style="margin-top:10px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:11px;color:#888;">EXP</span>
          <span style="font-size:11px;color:#C77DFF;">${p.exp || 0} / ${p.expNeeded || 0}</span>
        </div>
        <div style="background:rgba(255,255,255,0.1);border-radius:10px;height:6px;overflow:hidden;">
          <div style="width:${expPct}%;height:100%;background:linear-gradient(90deg,#C77DFF,#9b4dca);border-radius:10px;"></div>
        </div>
      </div>
    </div>

    <!-- Nature & Ability -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
      <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:12px;text-align:center;">
        <div style="font-size:10px;color:#888;margin-bottom:4px;">Naturaleza</div>
        ${buildNatureTooltip(p.nature || 'Serio')}
      </div>
      <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:12px;text-align:center;">
        <div style="font-size:10px;color:#888;margin-bottom:4px;">Habilidad</div>
        ${buildAbilityTooltip(p.ability || '—')}
      </div>
    </div>

    <!-- Stats -->
    <div style="margin-bottom:16px;">
      <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#C77DFF;margin-bottom:10px;">📊 ESTADÍSTICAS</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">${statsHtml}</div>
    </div>

    <!-- IVs -->
    <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:14px;margin-bottom:16px;">
      <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#C77DFF;margin-bottom:12px;">🧬 IVs</div>
      ${ivBars}
    </div>

    <!-- Moves -->
    <div>
      <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#C77DFF;margin-bottom:10px;">⚔️ MOVIMIENTOS</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">${movesList}</div>
    </div>
    ${(STONE_EVOLUTIONS[p.id] || (p.id === 'eevee')) ? `
    <button onclick="closePokemonDetail();showStonePicker(${index})"
      style="width:100%;margin-top:12px;padding:12px;border:none;border-radius:12px;cursor:pointer;
             font-family:'Press Start 2P',monospace;font-size:8px;
             background:rgba(255,217,61,0.15);color:var(--yellow);border:1px solid rgba(255,217,61,0.3);">
      💎 EVOLUCIONAR CON PIEDRA
    </button>` : ''}
    ${(EVOLUTION_TABLE[p.id] && p.level >= EVOLUTION_TABLE[p.id].level) ? `
    <div style="margin-top:10px;background:rgba(107,203,119,0.08);border:1px solid rgba(107,203,119,0.25);
      border-radius:10px;padding:10px 14px;font-size:11px;color:var(--green);text-align:center;">
      🌟 ¡Puede evolucionar! Ganás otra batalla y evoluciona.
    </div>` : ''}
  </div>`;

  let overlay = document.getElementById('pokemon-detail-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'pokemon-detail-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:160;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.onclick = (e) => { if (e.target === overlay) closePokemonDetail(); };
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = html;
  overlay.style.display = 'flex';
  // Load sprite
  setTimeout(() => {
    const img = document.getElementById('detail-sprite-img');
    const emo = document.getElementById('detail-sprite-emoji');
    if (img) loadSprite(img, emo, getSpriteUrl(p.id), p.emoji);
  }, 50);
}

function closePokemonDetail() {
  const overlay = document.getElementById('pokemon-detail-overlay');
  if (overlay) overlay.style.display = 'none';
}


// Real Pokédex numbers for Gen1
const POKEDEX_NUMBERS = {
  bulbasaur: 1, charmander: 4, squirtle: 7, caterpie: 10, weedle: 13, pidgey: 16,
  rattata: 19, pikachu: 25, jigglypuff: 39, geodude: 74, magikarp: 129, eevee: 133,
  zubat: 41, psyduck: 54
};

function renderGyms() {
  const list = document.getElementById('gym-list');
  const TYPE_ICON = {
    rock: '🪨', water: '💧', electric: '⚡', grass: '🌿',
    poison: '☠️', psychic: '🔮', fire: '🔥', ground: '🏜️',
    normal: '⬜', ice: '❄️', fighting: '🥊', flying: '🪶',
    ghost: '👻', dragon: '🐉', dark: '🌑', steel: '⚙️', bug: '🐛'
  };

  list.innerHTML = GYMS.map(gym => {
    const defeated = state.defeatedGyms?.includes(gym.id);
    const locked = state.badges < gym.badgesRequired;
    const typeColor = gym.typeColor || '#888';
    const onclick = (!defeated && !locked) ? `challengeGym('${gym.id}')` : '';

    // Pokémon team preview (sprites from PokeAPI)
    const teamHtml = gym.pokemon.map(id => {
      const num = POKEMON_SPRITE_IDS[id];
      const pData = POKEMON_DB[id];
      return num
        ? `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${num}.png"
                 width="36" height="36" style="image-rendering:pixelated;"
                 title="${pData?.name || id}"
                 onerror="this.style.display='none'">`
        : `<span style="font-size:22px;">${pData?.emoji || '❓'}</span>`;
    }).join('');

    // Ace = last Pokémon in array
    const aceIdx = gym.pokemon.length - 1;
    const aceLevel = gym.levels[aceIdx];

    // State badge
    const stateBadge = defeated
      ? `<div style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;background:rgba(107,203,119,0.15);border:1px solid rgba(107,203,119,0.4);font-size:10px;color:var(--green);font-weight:700;">✅ Completado — ${gym.badge} obtenida</div>`
      : locked
        ? `<div style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;background:rgba(255,59,59,0.1);border:1px solid rgba(255,59,59,0.2);font-size:10px;color:var(--red);">🔒 Requiere ${gym.badgesRequired} medalla${gym.badgesRequired !== 1 ? 's' : ''}</div>`
        : `<button onclick="${onclick}" style="padding:8px 20px;border:none;border-radius:20px;cursor:pointer;font-family:'Press Start 2P',monospace;font-size:7px;
                background:linear-gradient(135deg,${typeColor},${typeColor}99);color:#fff;font-weight:900;
                box-shadow:0 2px 12px ${typeColor}55;transition:all .2s;"
                onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                ⚔️ DESAFIAR
              </button>`;

    return `
          <div style="background:var(--card);border-radius:20px;overflow:hidden;
            border:2px solid ${defeated ? 'rgba(107,203,119,0.35)' : locked ? 'rgba(255,255,255,0.05)' : typeColor + '44'};
            transition:all .3s;opacity:${locked ? '0.5' : '1'};"
            ${!defeated && !locked ? `onmouseover="this.style.boxShadow='0 4px 24px ${typeColor}33'" onmouseout="this.style.boxShadow='none'"` : ''}>

            <!-- Colored header stripe -->
            <div style="background:linear-gradient(135deg,${typeColor}22,${typeColor}08);padding:16px 20px 0;
              border-bottom:1px solid ${typeColor}22;">
              <div style="display:flex;align-items:flex-start;gap:16px;">

                <!-- Left: info -->
                <div style="flex:1;min-width:0;">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                    <span style="font-size:18px;">${TYPE_ICON[gym.type] || '❓'}</span>
                    <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:${typeColor};">${gym.name}</div>
                  </div>
                  <div style="font-size:11px;color:var(--gray);margin-bottom:2px;">📍 ${gym.city}</div>
                  <div style="font-size:13px;font-weight:700;margin-bottom:4px;">Líder: <span style="color:#eee;">${gym.leader}</span></div>
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                    <span style="font-size:11px;background:${typeColor}22;color:${typeColor};padding:3px 8px;border-radius:10px;font-weight:700;border:1px solid ${typeColor}44;">
                      ${TYPE_ICON[gym.type]} ${gym.type.charAt(0).toUpperCase() + gym.type.slice(1)}
                    </span>
                    <span style="font-size:11px;color:var(--yellow);">${gym.badge} ${gym.badgeName}</span>
                    <span style="font-size:10px;color:var(--gray);">As: Nv.${aceLevel}</span>
                  </div>
                  <div style="font-size:11px;color:#888;font-style:italic;margin-bottom:12px;line-height:1.5;">
                    "${gym.quote}"
                  </div>
                </div>

                <!-- Right: gym image -->
                <div style="flex-shrink:0;width:96px;text-align:center;">
                  <img src="${gym.sprite}" alt="${gym.name}"
                    style="height:96px;width:auto;image-rendering:pixelated;filter:drop-shadow(0 2px 8px ${typeColor}66);"
                    onerror="this.outerHTML='<div style=\'font-size:52px;line-height:1;\'>${gym.badge}</div>'">
                </div>

              </div>
            </div>

            <!-- Bottom: team + action -->
            <div style="padding:12px 20px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
              <div>
                <div style="font-size:9px;color:var(--gray);margin-bottom:6px;font-weight:700;">EQUIPO</div>
                <div style="display:flex;align-items:center;gap:4px;">${teamHtml}</div>
              </div>
              ${stateBadge}
            </div>

          </div>`;
  }).join('');
}

// Sincronización de tiempo con API externa para evitar exploit de reloj local
let _serverTimeOffset = 0;
let _timeSynced = false;

async function syncServerTime() {
  try {
    const start = Date.now();
    const response = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC');
    const data = await response.json();
    const serverTime = new Date(data.datetime).getTime();
    const end = Date.now();
    const latency = (end - start) / 2;
    _serverTimeOffset = serverTime - (end - latency);
    _timeSynced = true;
    console.log('[TIME] Sincronizado con servidor UTC. Offset:', _serverTimeOffset);
  } catch (e) {
    console.error('[TIME] Error sincronizando tiempo:', e);
  }
}
syncServerTime();
setInterval(syncServerTime, 300000); // Re-sincronizar cada 5 min

function getDayCycle() {
  const now = new Date(Date.now() + _serverTimeOffset);
  const hour = now.getUTCHours(); // Usamos UTC para consistencia global

  // Ajuste de horas para ciclo día/noche (UTC)
  if (hour >= 6 && hour < 9) return 'morning';
  if (hour >= 9 && hour < 18) return 'day';
  if (hour >= 18 && hour < 21) return 'dusk';
  return 'night';
}

let _lastDayCycle = null;

function recalculateBalls() {
  const knownBalls = ['Pokéball', 'Súper Ball', 'Ultra Ball', 'Red Ball', 'Ball Oscura', 'Ball Temporizadora', 'Master Ball'];
  state.balls = knownBalls.reduce((sum, name) => sum + (state.inventory[name] || 0), 0);
}

// ===== BUFF TICK SYSTEM & HUD =====
function initBuffTick() {
  setInterval(() => {
    let changed = false;
    if (state.repelSecs > 0) { state.repelSecs--; changed = true; }
    if (state.shinyBoostSecs > 0) { state.shinyBoostSecs--; changed = true; }
    if (state.amuletCoinSecs > 0) { state.amuletCoinSecs--; changed = true; }

    if (changed) {
      updateBuffPanel();
      // Guardar cada 30 segundos si hay buffs activos para persistencia
      if (state.repelSecs % 30 === 0) scheduleSave();
    }
  }, 1000);
}
initBuffTick();

function updateEggProgressHud() {
  const container = document.getElementById('hud-eggs-progress');
  if (!container) return;

  if (!state.eggs || state.eggs.length === 0) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  container.innerHTML = state.eggs.map((egg, idx) => {
    const total = egg.totalSteps || 100;
    const progress = Math.min(100, Math.max(0, ((total - egg.steps) / total) * 100));
    const isReady = egg.ready || egg.steps <= 0;
    const color = egg.origin === 'breeding' ? 'var(--purple)' : 'var(--yellow)';

    return `
          <div class="hud-egg-card" ${isReady ? `onclick="startManualHatch(${idx})"` : ''} style="cursor: ${isReady ? 'pointer' : 'default'}; ${isReady ? 'border-color: var(--yellow); animation: pulseGlow 2s infinite;' : ''}">
            <div class="hud-egg-icon" style="${isReady ? 'animation: eggShake 1.5s infinite;' : ''}">🥚</div>
            <div class="hud-egg-info">
              <span class="hud-egg-label">${isReady ? '¡LISTO!' : (egg.origin === 'breeding' ? 'CRIANZA' : 'ENCUENTRO')}</span>
              <div class="hud-egg-bar-bg">
                <div class="hud-egg-bar-fill" style="width: ${progress}%; background: ${color};"></div>
              </div>
              <div class="hud-egg-time">${isReady ? 'ECLOSIONAR' : egg.steps + ' pasos'}</div>
            </div>
          </div>
        `;
  }).join('');
}

function updateBuffPanel() {
  const buffs = [
    { id: 'repel', secs: state.repelSecs },
    { id: 'shiny', secs: state.shinyBoostSecs },
    { id: 'amulet', secs: state.amuletCoinSecs }
  ];

  buffs.forEach(b => {
    const itemEl = document.getElementById(`buff-${b.id}`);
    if (!itemEl) return;

    if ((b.secs || 0) > 0) {
      const minutes = Math.floor(b.secs / 60);
      const seconds = b.secs % 60;
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      // Badge timer (siempre visible)
      const badge = document.getElementById(`buff-${b.id}-time`);
      if (badge) badge.textContent = timeStr;
      // Tooltip timer (visible al hover)
      const tip = document.getElementById(`buff-${b.id}-time2`);
      if (tip) tip.textContent = `⏱ ${timeStr} restante`;
      itemEl.style.display = 'flex';
    } else {
      itemEl.style.display = 'none';
    }
  });
}

function updateHud() {
  updateBuffPanel(); // Actualizar timers al refrescar HUD
  updateEggProgressHud(); // Actualizar progreso de huevos debajo del HUD
  // Robust badge count check (handles legacy array format)
  const badgeCount = (Array.isArray(state.badges) ? state.badges.length : (parseInt(state.badges) || 0));

  const cycle = getDayCycle();
  const cycleInfo = {
    morning: { icon: '\uD83C\uDF05', label: 'Amanecer', color: '#FFD93D' },
    day: { icon: '\u2600\uFE0F', label: 'Día', color: '#FFEEAD' },
    dusk: { icon: '\uD83C\uDF07', label: 'Atardecer', color: '#FF6B35' },
    night: { icon: '\uD83C\uDF19', label: 'Noche', color: '#9b4dca' }
  }[cycle] || { icon: '\u231A', label: 'Cargando', color: '#fff' };

  const timeIcon = document.getElementById('time-icon');
  const timeLabel = document.getElementById('time-label');
  if (timeIcon) timeIcon.textContent = cycleInfo.icon;
  if (timeLabel) {
    timeLabel.textContent = cycleInfo.label;
    timeLabel.style.color = cycleInfo.color;
  }

  if (cycle !== _lastDayCycle) {
    _lastDayCycle = cycle;
    const mapTab = document.getElementById('tab-map');
    if (mapTab && mapTab.style.display !== 'none') {
      renderMaps();
    }
  }

  const badgeEl = document.getElementById('badge-count');
  if (badgeEl) badgeEl.textContent = badgeCount;

  recalculateBalls();
  document.getElementById('ball-count').textContent = state.balls;
  document.getElementById('trainer-level').textContent = state.trainerLevel;

  const moneyEl = document.getElementById('hud-money');
  if (moneyEl) moneyEl.textContent = (state.money || 0).toLocaleString();

  const bcEl = document.getElementById('hud-bc');
  if (bcEl) bcEl.textContent = (state.battleCoins || 0).toLocaleString();

  const eggCountEl = document.getElementById('egg-count');
  if (eggCountEl) eggCountEl.textContent = state.eggs ? state.eggs.length : 0;

  const rank = getTrainerRank();
  if (rank) {
    const expPct = Math.min(100, (state.trainerExp / rank.expNeeded) * 100);
    const bar = document.getElementById('trainer-exp-bar');
    if (bar) bar.style.width = expPct + '%';
  }

  // Update Egg Counter in HUD
  const eggCont = document.getElementById('hud-egg-container');
  const eggText = document.getElementById('egg-count');
  if (eggCont && eggText) {
    const count = state.eggs ? state.eggs.length : 0;
    eggText.textContent = count;
  }
}

// Auto-update time every minute
setInterval(updateHud, 60000);


// ===== SETTINGS & ZOOM SYSTEM =====
function toggleSettings() {
  const modal = document.getElementById('settings-modal');
  if (modal.style.display === 'none' || modal.style.display === '') {
    modal.style.display = 'flex';
  } else {
    modal.style.display = 'none';
  }
}

function updateZoom(val) {
  const zoom = val / 100;
  // Aplicar zoom al contenedor principal
  const app = document.getElementById('app');
  if (app) {
    app.style.zoom = zoom;
    // Fallback para navegadores que no soportan zoom (Firefox)
    if (app.style.zoom === undefined || app.style.zoom === "") {
      app.style.transform = `scale(${zoom})`;
      app.style.transformOrigin = 'top center';
    }
  }

  // Actualizar etiqueta de valor
  const label = document.getElementById('zoom-value');
  if (label) label.textContent = val + '%';

  // Guardar en localStorage
  localStorage.setItem('poke_vicio_zoom', val);
}

// Cargar zoom guardado al iniciar
function initZoom() {
  const savedZoom = localStorage.getItem('poke_vicio_zoom') || 100;
  const slider = document.getElementById('zoom-slider');
  if (slider) slider.value = savedZoom;
  updateZoom(savedZoom);
}

// Ejecutar inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initZoom);
// Por si acaso el DOM ya cargó
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initZoom();
}
