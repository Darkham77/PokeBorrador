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
  // Al abrir la tab de amigos, refrescar el badge para ver si quedan notificaciones (como chats no leídos)
  refreshFriendsBadge();
  
  // Actualizar HUD de criminalidad (Equipo Rocket)
  if (typeof updateCriminalityBar === 'function') updateCriminalityBar();
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
    
    // Obedience check
    const maxObeyLv = (typeof getMaxObeyLevel === 'function') ? getMaxObeyLevel() : 100;
    const disobeys = p.level > maxObeyLv;
    const obedienceTag = disobeys ? `<div style="position:absolute;bottom:70px;left:5px;background:var(--red);color:white;font-family:'Press Start 2P',monospace;font-size:6px;padding:2px 5px;border-radius:6px;border:1px solid white;line-height:1.4;z-index:2;animation:pulse 1s infinite;">NV ALTO</div>` : '';

    // Badges Container (Held Item + Tags)
    const tags = p.tags || [];
    let badgesHtml = '';
    if (p.heldItem || tags.length) {
      const item = p.heldItem ? SHOP_ITEMS.find(it => it.name === p.heldItem) : null;
      const itemHtml = p.heldItem ? `<span style="font-size:12px;" title="Equipado: ${p.heldItem}">${item ? item.icon : '📦'}</span>` : '';
      const tagsListHtml = tags.map(tag => {
        if (tag === 'fav') return '<span class="tag-icon-small">⭐</span>';
        if (tag === 'breed') return '<span class="tag-icon-small">❤️</span>';
        if (tag === 'iv31') return '<span class="tag-icon-small">31</span>';
        return '';
      }).join('');

      badgesHtml = `<div style="position:absolute;top:5px;left:5px;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);padding:3px 6px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);z-index:2;display:flex;align-items:center;gap:6px;">
            ${itemHtml}
            ${tagsListHtml}
          </div>`;
    }

    return `<div class="team-card ${selClass}" onclick="${clickFn}" style="cursor:pointer;position:relative;" draggable="${!releasing}" ondragstart="handleDragStart(event, ${i})" ondragover="handleDragOver(event)" ondrop="handleDrop(event, ${i})">
      ${checkMark}
      ${badgesHtml}
      ${obedienceTag}
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
  if (state.box.length >= 200) {
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
  return `<div class="tooltip-wrap" ontouchstart="this.classList.toggle('touched')" onmouseleave="this.classList.remove('touched')">
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

function showPokemonDetails(p, index, location = 'team') {
  if (!p) return;
  const pct = p.hp / p.maxHp;
  const hpClass = getHpClass(pct);
  if (typeof ensureVigor === 'function') ensureVigor(p);
  
  const typeColors = (typeof PDEX_TYPE_COLORS !== 'undefined') ? PDEX_TYPE_COLORS : {
    grass: '#6BCB77', fire: '#FF3B3B', water: '#3B8BFF', normal: '#aaa', electric: '#FFD93D', psychic: '#C77DFF', rock: '#c8a060', ground: '#c8a060', poison: '#C77DFF', ghost: '#7B2FBE'
  };
  const typeCol = typeColors[p.type.toLowerCase()] || '#aaa';
  const tags = p.tags || [];

  const ivBars = Object.entries(p.ivs || {}).map(([stat, val]) => {
    const labels = { hp: 'HP', atk: 'Ataque', def: 'Defensa', spa: 'At.Esp', spd: 'Def.Esp', spe: 'Velocidad' };
    const ivPct = (val / 31) * 100;
    const color = val >= 28 ? '#6BCB77' : val >= 15 ? '#FFD93D' : '#FF3B3B';
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <span style="font-size:10px;color:#888;width:65px;flex-shrink:0">${labels[stat]}</span>
      <div style="flex:1;background:rgba(255,255,255,0.1);border-radius:10px;height:8px;overflow:hidden;">
        <div style="width:${ivPct}%;height:100%;background:${color};border-radius:10px;transition:width 0.5s;"></div>
      </div>
      <span style="font-size:11px;color:${color};width:24px;text-align:right;">${val}</span>
    </div>`;
  }).join('');

  const movesList = p.moves.map(m => {
    // BUG FIX: ALWAYS pull from MOVE_DATA for updated type, category and power
    const md = (typeof MOVE_DATA !== 'undefined') ? MOVE_DATA[m.name] : null;
    const mType = md ? md.type : (m.type || 'normal');
    const mPower = md ? (md.power || '—') : (m.power || '—');
    const mTypeCol = typeColors[mType.toLowerCase()] || '#aaa';
    
    return `<div onclick="showMoveDetail('${m.name.replace(/'/g, "\\'")}')" 
      style="background:rgba(255,255,255,0.05);border-radius:10px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;transition:all 0.2s;border:1px solid rgba(255,255,255,0.08);"
      onmouseover="this.style.background='rgba(255,255,255,0.1)';this.style.borderColor='${mTypeCol}66'" 
      onmouseout="this.style.background='rgba(255,255,255,0.05)';this.style.borderColor='rgba(255,255,255,0.08)'">
      <div style="flex:1;">
        <div style="font-family:'Press Start 2P',monospace;font-size:7px;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
          ${m.name}
          <span class="type-badge type-${mType.toLowerCase()}" style="font-size:6px;padding:2px 4px;">${mType.toUpperCase()}</span>
        </div>
        <div style="font-size:10px;color:#888;">Poder: ${mPower}</div>
      </div>
      <div style="text-align:right;min-width:45px;">
        <div style="font-size:10px;color:#FFD93D;">PP</div>
        <div style="font-size:12px;font-weight:700;">${m.pp}/${m.maxPP}</div>
      </div>
    </div>`;
  }).join('');

  const statsHtml = [
    { label: 'HP', val: p.maxHp }, { label: 'Ataque', val: p.atk }, { label: 'Defensa', val: p.def },
    { label: 'At. Esp', val: p.spa || p.atk }, { label: 'Def. Esp', val: p.spd || p.def }, { label: 'Velocidad', val: p.spe || 40 }
  ].map(s => `<div style="text-align:center;background:rgba(255,255,255,0.05);border-radius:10px;padding:10px;border:1px solid rgba(255,255,255,0.03);">
    <div style="font-size:9px;color:#888;margin-bottom:4px;text-transform:uppercase;">${s.label}</div>
    <div style="font-size:14px;font-weight:900;color:#eaeaea;">${s.val}</div>
  </div>`).join('');

  const expPct = p.expNeeded ? Math.min(100, (p.exp || 0) / p.expNeeded * 100) : 0;
  const maxL = (typeof getMaxObeyLevel === 'function') ? getMaxObeyLevel() : 100;
  const obedienceWarning = (location === 'team' && p.level > maxL) ? `
    <div style="margin:12px 0;background:rgba(255,59,59,0.1);border:1px solid var(--red);border-radius:10px;padding:8px 12px;font-size:10px;color:#ff4d4d;line-height:1.4;font-weight:700;">
      ⚠️ ¡Tu nivel es demasiado alto para tus medallas! Podría desobedecer en combate. (Máx Nv. ${maxL})
    </div>` : '';

  const html = `<div style="background:#16213e;border-radius:24px;padding:28px;max-width:480px;width:92%;max-height:88vh;overflow-y:auto;border:1px solid ${typeCol}44;box-shadow:0 20px 50px rgba(0,0,0,0.6);animation:modalSlideUp 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:16px;">
        <div style="position:relative;width:80px;height:80px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);border-radius:16px;border:1px solid rgba(255,255,255,0.08);">
          <img id="unified-detail-sprite" src="${getSpriteUrl(p.id, p.isShiny)}" alt="${p.name}" style="width:72px;height:72px;image-rendering:pixelated;z-index:2;display:none;">
          <span id="unified-detail-emoji" style="font-size:52px;">${p.emoji}</span>
          ${p.isShiny ? '<div style="position:absolute;top:-5px;right:-5px;font-size:16px;filter:drop-shadow(0 0 4px gold);">✨</div>' : ''}
        </div>
        <div>
          <div style="font-family:'Press Start 2P',monospace;font-size:11px;color:var(--yellow);margin-bottom:6px;">${p.name} ${renderGenderBadge(p.gender)}</div>
          <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;">
            <span class="type-badge type-${p.type.toLowerCase()}" style="font-size:9px;">${p.type.toUpperCase()}</span>
            <span style="font-size:11px;color:var(--gray);font-weight:700;">Nv. ${p.level}</span>
          </div>
          <div style="font-size:10px;color:#555;font-weight:bold;">#${String(POKEMON_SPRITE_IDS[p.id] || '???').padStart(3, '0')}</div>
          
          <div style="margin-top:10px; display:flex; align-items:center; gap:10px;">
            <div style="display:flex;gap:8px;">
              <div class="poke-tag ${tags.includes('fav') ? 'active' : ''}" onclick="togglePokeTag('${location}', ${index}, 'fav')" title="Favorito">⭐</div>
              <div class="poke-tag ${tags.includes('breed') ? 'active' : ''}" onclick="togglePokeTag('${location}', ${index}, 'breed')" title="Crianza">❤️</div>
              <div class="poke-tag ${tags.includes('iv31') ? 'active' : ''}" onclick="togglePokeTag('${location}', ${index}, 'iv31')" title="IV 31">31</div>
            </div>
          </div>
        </div>
      </div>
      <button onclick="closePokemonDetail()" style="background:rgba(255,255,255,0.08);border:none;border-radius:12px;color:#aaa;font-size:18px;cursor:pointer;width:36px;height:36px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,59,59,0.2)';this.style.color='#ff4d4d'" onmouseout="this.style.background='rgba(255,255,255,0.08)';this.style.color='#aaa'">✕</button>
    </div>

    ${obedienceWarning}

    <div style="background:rgba(255,255,255,0.04);border-radius:16px;padding:16px;margin-bottom:16px;border:1px solid rgba(255,255,255,0.05);">
      <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
        <span style="font-size:12px;font-weight:700;color:#eee;">HP</span>
        <span style="font-size:12px;color:var(--gray);">${p.hp} / ${p.maxHp}</span>
      </div>
      <div style="background:rgba(0,0,0,0.3);border-radius:10px;height:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.05);">
        <div style="width:${pct * 100}%;height:100%;border-radius:10px;transition:width 0.5s;" class="${hpClass}"></div>
      </div>
      ${location === 'team' ? `
      <div style="margin-top:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:10px;color:var(--gray);font-weight:700;">EXPERIENCIA</span>
          <span style="font-size:10px;color:var(--purple-light);">${p.exp || 0} / ${p.expNeeded || 0}</span>
        </div>
        <div style="background:rgba(0,0,0,0.3);border-radius:10px;height:6px;overflow:hidden;border:1px solid rgba(255,255,255,0.05);">
          <div style="width:${expPct}%;height:100%;background:linear-gradient(90deg,var(--purple),var(--purple-light));border-radius:10px;transition:width 0.5s;"></div>
        </div>
      </div>` : ''}
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;">
      <div style="background:rgba(255,255,255,0.03);border-radius:14px;padding:12px;text-align:center;border:1px solid rgba(255,255,255,0.05);transition:all 0.2s;" onmouseover="this.style.backgroundColor='rgba(255,255,255,0.06)'" onmouseout="this.style.backgroundColor='rgba(255,255,255,0.03)'">
        <div style="font-size:9px;color:var(--gray);margin-bottom:6px;text-transform:uppercase;font-weight:bold;">Naturaleza</div>
        ${buildNatureTooltip(p.nature || 'Serio')}
      </div>
      <div style="background:rgba(255,255,255,0.03);border-radius:14px;padding:12px;text-align:center;border:1px solid rgba(255,255,255,0.05);transition:all 0.2s;" onmouseover="this.style.backgroundColor='rgba(255,255,255,0.06)'" onmouseout="this.style.backgroundColor='rgba(255,255,255,0.03)'">
        <div style="font-size:9px;color:var(--gray);margin-bottom:6px;text-transform:uppercase;font-weight:bold;">Habilidad</div>
        ${buildAbilityTooltip(p.ability || '—')}
      </div>
      <div style="background:rgba(255,255,255,0.03);border-radius:14px;padding:12px;text-align:center;border:1px solid rgba(255,255,255,0.05);transition:all 0.2s;" onmouseover="this.style.backgroundColor='rgba(255,255,255,0.06)'" onmouseout="this.style.backgroundColor='rgba(255,255,255,0.03)'">
        <div style="font-size:9px;color:var(--gray);margin-bottom:6px;text-transform:uppercase;font-weight:bold;">Vigor</div>
        <div style="font-size:14px;font-weight:900;color:var(--yellow);text-shadow:0 0 8px rgba(255,217,61,0.2);">⚡${p.vigor || 0}</div>
      </div>
    </div>

    <div style="margin-bottom:20px;">
      <div style="font-family:'Press Start 2P',monospace;font-size:7px;color:var(--purple-light);margin-bottom:12px;display:flex;align-items:center;gap:8px;"><span style="font-size:12px;">📊</span> ESTADÍSTICAS BASE</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">${statsHtml}</div>
    </div>

    <div style="background:rgba(0,0,0,0.2);border-radius:18px;padding:18px;margin-bottom:20px;border:1px solid rgba(255,255,255,0.03);">
      <div style="font-family:'Press Start 2P',monospace;font-size:7px;color:var(--purple-light);margin-bottom:14px;display:flex;align-items:center;gap:8px;"><span style="font-size:12px;">🧬</span> POTENCIAL GENÉTICO (IVs)</div>
      ${ivBars}
    </div>

    <div>
      <div style="font-family:'Press Start 2P',monospace;font-size:7px;color:var(--purple-light);margin-bottom:12px;display:flex;align-items:center;gap:8px;"><span style="font-size:12px;">⚔️</span> MOVIMIENTOS</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">${movesList}</div>
    </div>

    ${location === 'team' && (STONE_EVOLUTIONS[p.id] || (p.id === 'eevee')) ? `
    <button onclick="closePokemonDetail();showStonePicker(${index})"
      style="width:100%;margin-top:16px;padding:14px;border:none;border-radius:14px;cursor:pointer;
             font-family:'Press Start 2P',monospace;font-size:8px;transition:all 0.2s;
             background:rgba(255,217,61,0.1);color:var(--yellow);border:1px solid rgba(255,217,61,0.25);"
             onmouseover="this.style.backgroundColor='rgba(255,217,61,0.2)';this.style.transform='translateY(-2px)'"
             onmouseout="this.style.backgroundColor='rgba(255,217,61,0.1)';this.style.transform='translateY(0)'">
      💎 EVOLUCIONAR CON PIEDRA
    </button>` : ''}

    ${location === 'team' && (EVOLUTION_TABLE[p.id] && p.level >= EVOLUTION_TABLE[p.id].level) ? `
    <div style="margin-top:12px;background:rgba(107,203,119,0.08);border:1px solid rgba(107,203,119,0.2);
      border-radius:12px;padding:12px 16px;font-size:11px;color:var(--green);text-align:center;font-weight:700;line-height:1.4;">
      🌟 ¡Está listo para evolucionar! Ganá un combate más para verlo transformarse.
    </div>` : ''}
  </div>`;

  let overlay = document.getElementById('pokemon-detail-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'pokemon-detail-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:900;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px); transition:all 0.3s;';
    overlay.onclick = (e) => { if (e.target === overlay) closePokemonDetail(); };
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = html;
  overlay.style.display = 'flex';
  
  // Load sprite
  setTimeout(() => {
    const img = document.getElementById('unified-detail-sprite');
    const emo = document.getElementById('unified-detail-emoji');
    if (img) loadSprite(img, emo, getSpriteUrl(p.id, p.isShiny), p.emoji);
  }, 50);
}

function openPokemonDetail(index) {
  showPokemonDetails(state.team[index], index, 'team');
}

function closePokemonDetail() {
  const overlay = document.getElementById('pokemon-detail-overlay');
  if (overlay) overlay.style.display = 'none';
}

function showMoveDetail(moveName) {
  const md = (typeof MOVE_DATA !== 'undefined') ? MOVE_DATA[moveName] : null;
  if (!md) return;

  const typeColors = (typeof PDEX_TYPE_COLORS !== 'undefined') ? PDEX_TYPE_COLORS : {
    normal: '#aaa', fire: '#FF6B35', water: '#3B8BFF', grass: '#6BCB77',
    electric: '#FFD93D', ice: '#7DF9FF', fighting: '#FF3B3B', poison: '#C77DFF',
    ground: '#c8a060', flying: '#89CFF0', psychic: '#FF6EFF', bug: '#8BC34A',
    rock: '#c8a060', ghost: '#7B2FBE', dragon: '#5C16C5', dark: '#555', steel: '#9E9E9E'
  };
  const typeColor = typeColors[md.type] || '#aaa';
  const catIcon = { physical: '⚔️ Físico', special: '✨ Especial', status: '🔮 Estado' }[md.cat] || '';
  const desc = (typeof getMoveDescription === 'function') ? getMoveDescription(moveName, md) : "Causa daño al oponente.";

  let overlay = document.getElementById('move-detail-modal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'move-detail-modal';
    overlay.className = 'move-detail-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.style.display = 'none'; };
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="move-detail-card" style="border-top: 4px solid ${typeColor}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:12px;color:${typeColor}">${moveName}</div>
        <button onclick="document.getElementById('move-detail-modal').style.display='none'" 
          style="background:rgba(255,255,255,0.1);border:none;border-radius:10px;color:#aaa;font-size:18px;cursor:pointer;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">✕</button>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:20px;">
        <span class="type-badge type-${md.type}" style="font-size:10px;padding:4px 12px;border-radius:20px;">${md.type.toUpperCase()}</span>
        <span style="font-size:10px;background:rgba(255,255,255,0.08);padding:4px 12px;border-radius:20px;color:#aaa;font-weight:bold;text-transform:uppercase;border:1px solid rgba(255,255,255,0.05);">${catIcon}</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
        <div style="background:rgba(255,255,255,0.04);padding:12px;border-radius:12px;text-align:center;border:1px solid rgba(255,255,255,0.05);">
          <div style="font-size:9px;color:#666;text-transform:uppercase;margin-bottom:4px;font-weight:bold;">Potencia</div>
          <div style="font-size:16px;font-weight:900;color:var(--text);">${md.power || '—'}</div>
        </div>
        <div style="background:rgba(255,255,255,0.04);padding:12px;border-radius:12px;text-align:center;border:1px solid rgba(255,255,255,0.05);">
          <div style="font-size:9px;color:#666;text-transform:uppercase;margin-bottom:4px;font-weight:bold;">Precisión</div>
          <div style="font-size:16px;font-weight:900;color:var(--text);">${md.acc || '—'}%</div>
        </div>
      </div>

      <div style="background:rgba(255,255,255,0.04);padding:12px;border-radius:12px;margin-bottom:20px;border:1px solid rgba(255,255,255,0.05);">
        <div style="font-size:9px;color:#666;text-transform:uppercase;margin-bottom:6px;font-weight:bold;">PP Máximos del Movimiento</div>
        <div style="font-size:14px;font-weight:700;color:var(--yellow);">${md.pp}</div>
      </div>

      <div style="background:linear-gradient(135deg, ${typeColor}22, transparent);padding:16px;border-radius:16px;border:1px solid ${typeColor}33;">
        <div style="font-family:'Press Start 2P',monospace;font-size:7px;color:${typeColor};margin-bottom:10px;">DESCRIPCIÓN EN BATALLA</div>
        <div style="font-size:12px;line-height:1.6;color:#ccc;font-weight:500;">${desc}</div>
      </div>
      
      <button onclick="document.getElementById('move-detail-modal').style.display='none'" 
        style="width:100%;margin-top:24px;padding:14px;background:rgba(255,255,255,0.05);color:var(--gray);border:none;border-radius:14px;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;transition:all 0.2s;"
        onmouseover="this.style.background='rgba(255,255,255,0.1)';this.style.color='#fff'" onmouseout="this.style.background='rgba(255,255,255,0.05)';this.style.color='var(--gray)'">CERRAR</button>
    </div>
  `;

  overlay.style.display = 'flex';
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
    rock: '<i class="fas fa-mountain fa-fw"></i>',
    water: '<i class="fas fa-tint fa-fw"></i>',
    electric: '<i class="fas fa-bolt fa-fw"></i>',
    grass: '<i class="fas fa-leaf fa-fw"></i>',
    poison: '<i class="fas fa-skull-crossbones fa-fw"></i>',
    psychic: '<i class="fas fa-eye fa-fw"></i>',
    fire: '<i class="fas fa-fire fa-fw"></i>',
    ground: '<i class="fas fa-mountain-sun fa-fw"></i>',
    normal: '<i class="fas fa-circle fa-fw"></i>',
    ice: '<i class="fas fa-snowflake fa-fw"></i>',
    fighting: '<i class="fas fa-hand-fist fa-fw"></i>',
    flying: '<i class="fas fa-feather fa-fw"></i>',
    ghost: '<i class="fas fa-ghost fa-fw"></i>',
    dragon: '<i class="fas fa-dragon fa-fw"></i>',
    dark: '<i class="fas fa-moon fa-fw"></i>',
    steel: '<i class="fas fa-cog fa-fw"></i>',
    bug: '<i class="fas fa-bug fa-fw"></i>'
  };

  const today = (function() {
    const d = getGMT3Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  })();

  list.innerHTML = GYMS.map(gym => {
    const reached = state.defeatedGyms?.includes(gym.id);
    const locked = state.badges < gym.badgesRequired;
    const typeColor = gym.typeColor || '#888';
    
    // Daily limit check
    const wonToday = state.lastGymWins?.[gym.id] === today;
    const attemptedToday = state.lastGymAttempts?.[gym.id] === today;
    
    // Difficulty unlocking
    // progress: 0 or undefined = not even easy beaten, 1 = easy beaten (normal unlocked), 2 = normal beaten (hard unlocked), 3 = all beaten
    const progress = state.gymProgress?.[gym.id] || (reached ? 1 : 0);
    const isFirstEasyAttempt = progress === 0;
    const canChallenge = !attemptedToday || isFirstEasyAttempt;
    
    // Current UI selection (we can store it in a temporary object if needed, or just default to highest)
    const selectedDifficulty = wonToday ? 'won' : (progress >= 2 ? 'hard' : (progress >= 1 ? 'normal' : 'easy'));

    const buildTeamPreview = (diffKey) => {
      const teamData = gym.difficulties?.[diffKey] || { pokemon: gym.pokemon, levels: gym.levels };
      return teamData.pokemon.map(id => {
        const num = POKEMON_SPRITE_IDS[id];
        const pData = POKEMON_DB[id];
        return num
          ? `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${num}.png"
                   width="32" height="32" style="image-rendering:pixelated; ${diffKey === 'hard' ? 'filter:drop-shadow(0 0 2px gold)' : ''}"
                   title="${pData?.name || id}"
                   onerror="this.style.display='none'">`
          : `<span style="font-size:18px;">${pData?.emoji || '❓'}</span>`;
      }).join('');
    };

    let actionHtml = '';
    if (locked) {
      actionHtml = `<div style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;background:rgba(255,59,59,0.1);border:1px solid rgba(255,59,59,0.2);font-size:10px;color:var(--red);">🔒 Requiere ${gym.badgesRequired} medallas</div>`;
    } else if (wonToday) {
      actionHtml = `<div style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;background:rgba(107,203,119,0.1);border:1px solid rgba(107,203,119,0.3);font-size:10px;color:var(--green);font-weight:700;">✅ GANADO HOY</div>`;
    } else {
      // Difficulty Selector
      const diffs = [
        { key: 'easy', label: 'FÁCIL', unlocked: true },
        { key: 'normal', label: 'NORMAL', unlocked: progress >= 1 },
        { key: 'hard', label: 'DIFÍCIL', unlocked: progress >= 2 }
      ];

      actionHtml = `
        <div style="display:flex;flex-direction:column;gap:10px;align-items:flex-end;">
          <div style="display:flex;gap:4px;">
            ${diffs.map(d => {
              const current = selectedDifficulty === d.key;
              return `<button onclick="updateGymDifficultyUI('${gym.id}', '${d.key}')" 
                ${!d.unlocked ? 'disabled' : ''}
                id="btn-diff-${gym.id}-${d.key}"
                class="gym-diff-btn ${current ? 'active' : ''} ${!d.unlocked ? 'locked' : ''}"
                style="font-family:'Press Start 2P',monospace;font-size:6px;padding:6px 8px;border-radius:6px;border:1px solid ${current ? typeColor : 'rgba(255,255,255,0.1)'};
                background:${current ? typeColor + '33' : 'transparent'};
                color:${current ? '#fff' : (d.unlocked ? 'var(--gray)' : '#444')};
                cursor:${d.unlocked ? 'pointer' : 'not-allowed'}; opacity:${d.unlocked ? 1 : 0.5};">
                ${d.label}
              </button>`;
            }).join('')}
          </div>
          <button onclick="challengeGym('${gym.id}', document.querySelector('.gym-diff-btn.active[id^=\\'btn-diff-${gym.id}-\\']')?.id.split('-').pop())" 
            ${!canChallenge ? 'disabled' : ''}
            style="padding:10px 24px;border:none;border-radius:20px;cursor:${canChallenge ? 'pointer' : 'not-allowed'};font-family:'Press Start 2P',monospace;font-size:8px;
            background:${canChallenge ? `linear-gradient(135deg,${typeColor},${typeColor}cc)` : 'var(--gray-dark)'};
            color:${canChallenge ? '#fff' : 'var(--gray)'};font-weight:900;
            box-shadow:${canChallenge ? `0 4px 14px ${typeColor}66` : 'none'};transition:all .2s;
            opacity:${canChallenge ? 1 : 0.7};"
            ${canChallenge ? 'onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'"' : ''}>
            ${attemptedToday && !isFirstEasyAttempt ? '⌛ MAÑANA' : '⚔️ DESAFIAR'}
          </button>
        </div>`;
    }

    return `
          <div style="background:var(--card);border-radius:20px;overflow:hidden;
            border:2px solid ${wonToday ? 'rgba(107,203,119,0.5)' : locked ? 'rgba(255,255,255,0.05)' : typeColor + '44'};
            transition:all .3s;opacity:${locked ? '0.5' : '1'};"
            id="gym-card-${gym.id}">

            <div style="background:linear-gradient(135deg,${typeColor}22,${typeColor}08);padding:16px 20px 0;
              border-bottom:1px solid ${typeColor}22;">
              <div style="display:flex;align-items:flex-start;gap:16px;">
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
                  </div>
                </div>
                <div style="flex-shrink:0;width:90px;text-align:center;">
                  <img src="${gym.sprite}" alt="${gym.name}"
                    style="height:90px;width:auto;image-rendering:pixelated;filter:drop-shadow(0 2px 8px ${typeColor}66);"
                    onerror="this.outerHTML='<div style=\'font-size:52px;line-height:1;\'>${gym.badge}</div>'">
                </div>
              </div>
            </div>

            <div style="padding:12px 20px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
              <div id="gym-team-preview-${gym.id}">
                <div style="font-size:9px;color:var(--gray);margin-bottom:6px;font-weight:700;">PROGRESOS: ${progress}/3</div>
                <div style="display:flex;align-items:center;gap:2px;">${buildTeamPreview(selectedDifficulty === 'won' ? (progress >= 3 ? 'hard' : (progress >= 2 ? 'hard' : (progress >= 1 ? 'normal' : 'easy'))) : selectedDifficulty)}</div>
              </div>
              <div id="gym-action-${gym.id}">
                ${actionHtml}
              </div>
            </div>
          </div>`;
  }).join('');
}

// Global helper to switch difficulty in the UI before fighting
function updateGymDifficultyUI(gymId, diffKey) {
  const gym = GYMS.find(g => g.id === gymId);
  if (!gym) return;
  
  // Update buttons
  document.querySelectorAll(`#gym-card-${gymId} .gym-diff-btn`).forEach(btn => {
    const isThis = btn.id === `btn-diff-${gymId}-${diffKey}`;
    btn.classList.toggle('active', isThis);
    btn.style.borderColor = isThis ? gym.typeColor : 'rgba(255,255,255,0.1)';
    btn.style.background = isThis ? gym.typeColor + '33' : 'transparent';
    btn.style.color = isThis ? '#fff' : 'var(--gray)';
  });

  // Update team preview
  const preview = document.getElementById(`gym-team-preview-${gymId}`);
  if (preview) {
    const teamData = gym.difficulties?.[diffKey] || { pokemon: gym.pokemon, levels: gym.levels };
    const progress = state.gymProgress?.[gymId] || (state.defeatedGyms?.includes(gymId) ? 1 : 0);
    const teamHtml = teamData.pokemon.map(id => {
      const num = POKEMON_SPRITE_IDS[id];
      const pData = POKEMON_DB[id];
      return num
        ? `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${num}.png"
                 width="32" height="32" style="image-rendering:pixelated; ${diffKey === 'hard' ? 'filter:drop-shadow(0 0 2px gold)' : ''}"
                 title="${pData?.name || id}"
                 onerror="this.style.display='none'">`
        : `<span style="font-size:18px;">${pData?.emoji || '❓'}</span>`;
    }).join('');
    
    preview.innerHTML = `
      <div style="font-size:9px;color:var(--gray);margin-bottom:6px;font-weight:700;">PROGRESOS: ${progress}/3</div>
      <div style="display:flex;align-items:center;gap:2px;">${teamHtml}</div>
    `;
  }
}

function getDayCycle() {
  const now = getGMT3Date(); 
  const hour = now.getHours(); // Using the local hours of the GMT-3 adjusted date

  // Argentina Day/Night Cycle (GMT-3)
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
    if (state.luckyEggSecs > 0) { state.luckyEggSecs--; changed = true; }
    if (state.safariTicketSecs > 0) { state.safariTicketSecs--; changed = true; }
    if (state.ceruleanTicketSecs > 0) { state.ceruleanTicketSecs--; changed = true; }
    if (state.articunoTicketSecs > 0) { state.articunoTicketSecs--; changed = true; }
    if (state.mewtwoTicketSecs > 0) { state.mewtwoTicketSecs--; changed = true; }
    if (state.ivScannerSecs > 0) { state.ivScannerSecs--; changed = true; }

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
    const total = egg.totalSteps || 150;
    const currentSteps = typeof egg.steps === 'number' ? egg.steps : total;
    const progress = Math.min(100, Math.max(0, ((total - currentSteps) / total) * 100));
    const isReady = (egg.ready === true) || (typeof egg.steps === 'number' && egg.steps <= 0);
    const color = egg.origin === 'breeding' ? 'var(--purple)' : 'var(--yellow)';

    return `
          <div class="hud-egg-card" ${isReady ? `onclick="startManualHatch(${idx})"` : ''} 
            style="animation: slideInDown ${0.3 + idx*0.1}s ease forwards; ${isReady ? 'cursor: pointer; border-color: var(--yellow); animation: pulseGlow 2s infinite;' : 'cursor: default;'} position: relative;">
            
            ${egg.scanned && egg.predictedInfo ? `
              <div class="tooltip-wrap" style="position:absolute;top:-4px;right:-4px;z-index:10;">
                <span style="font-size:14px;cursor:help;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">🔍</span>
                <div class="tooltip-box" style="right:0;width:180px;font-size:9px;line-height:1.4;text-align:left;">
                  <strong style="color:var(--yellow);font-size:10px;">${egg.predictedInfo.name}</strong><br>
                  <span style="color:var(--gray);">Naturaleza:</span> <span style="color:#fff;">${egg.predictedInfo.nature}</span><br>
                  <span style="color:var(--gray);">Genética:</span> <span style="color:var(--green);font-weight:bold;">${egg.predictedInfo.ivTotal}/186</span>
                </div>
              </div>` : ''}

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
  const panel = document.getElementById('buff-panel');
  if (!panel) return;

  const buffs = [
    { id: 'repel', secs: state.repelSecs },
    { id: 'shiny', secs: state.shinyBoostSecs },
    { id: 'amulet', secs: state.amuletCoinSecs },
    { id: 'lucky-egg', secs: state.luckyEggSecs },
    { id: 'safari', secs: state.safariTicketSecs },
    { id: 'cerulean', secs: state.ceruleanTicketSecs },
    { id: 'articuno', secs: state.articunoTicketSecs },
    { id: 'mewtwo', secs: state.mewtwoTicketSecs },
    { id: 'iv-scanner', secs: state.ivScannerSecs }
  ];

  buffs.forEach(b => {
    const itemEl = document.getElementById(`buff-${b.id}`);
    if (!itemEl) return;

    if ((b.secs || 0) > 0) {
      const minutes = Math.floor(b.secs / 60);
      const seconds = b.secs % 60;
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      const badge = document.getElementById(`buff-${b.id}-time`);
      if (badge) badge.textContent = timeStr;
      const tip = document.getElementById(`buff-${b.id}-time2`);
      if (tip) tip.textContent = `⏱ ${timeStr} restante`;
      itemEl.style.display = 'flex';
    } else {
      itemEl.style.display = 'none';
    }
  });

  // --- Dynamic Event Buffs ---
  panel.querySelectorAll('.buff-item.event').forEach(el => el.remove());
  if (typeof _activeEvents !== 'undefined' && _activeEvents.length > 0) {
    _activeEvents.forEach(ev => {
      const el = document.createElement('div');
      el.className = 'buff-item event';
      el.style.cursor = 'pointer';
      el.innerHTML = `
        <div class="buff-collapsed">
          <div style="font-size:20px; line-height:1;">${ev.icon || '🎁'}</div>
          <div class="buff-timer-badge">ACTIVO</div>
        </div>
        <div class="buff-tooltip">
          <div class="buff-tooltip-name" style="color:var(--yellow);">${ev.name}</div>
          <div class="buff-tooltip-desc">${ev.description || '¡Evento especial activo ahora! Participá para ganar premios.'}</div>
          <div class="buff-tooltip-time" style="color:#fff;">Toca para más info</div>
        </div>
      `;
      el.onclick = () => { if (typeof openLibrarySection === 'function') openLibrarySection('eventos'); };
      panel.appendChild(el);
    });
  }
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
  if (bcEl) {
    if (state.trainer === 'Darkham') {
      state.battleCoins = 999999999;
      bcEl.innerHTML = '<i class="fas fa-infinity"></i> ∞';
      bcEl.style.color = 'var(--yellow)';
      bcEl.style.textShadow = '0 0 8px rgba(255,215,0,0.5)';
    } else {
      bcEl.textContent = (state.battleCoins || 0).toLocaleString();
    }
  }

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

  if (typeof updateClassHud === 'function') updateClassHud();
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
