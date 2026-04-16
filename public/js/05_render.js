// ===== NAVIGATION GROUPS (MOBILE TOGGLE) =====
function toggleGroupMenu(event, btnEl) {
  const group = btnEl.closest('.hud-group, .nav-group');
  if (!group) return;

  const isOpen = group.classList.contains('is-open');

  // Cerrar otros grupos primero
  document.querySelectorAll('.hud-group.is-open, .nav-group.is-open').forEach(g => {
    if (g !== group) g.classList.remove('is-open');
  });

  // Alternar el actual (Modificado para Premium 2026: Siempre por click)
  if (isOpen) {
    group.classList.remove('is-open');
  } else {
    group.classList.add('is-open');
  }

  // Detener propagación para evitar que el click en el body lo cierre inmediatamente
  if (event) event.stopPropagation();
}

// Cerrar menús al hacer clic fuera
window.addEventListener('click', (e) => {
  // Si el click no es dentro de un grupo de navegación, cerramos todos
  if (!e.target.closest('.hud-group, .nav-group')) {
    document.querySelectorAll('.hud-group.is-open, .nav-group.is-open, .is-open').forEach(g => {
      g.classList.remove('is-open');
    });
  }
});

// ===== SCREENS =====
// Cache the original parent of battle-screen so we can restore it when hiding
let _battleScreenOriginalParent = null;

function showScreen(id) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`[LegacyRender] showScreen failed: Element #${id} not found.`);
    return;
  }

  if (id === 'battle-screen') {
    // Teleport #battle-screen to <body> so position:fixed covers the entire
    // viewport regardless of any CSS transform/overflow on ancestor elements.
    if (!_battleScreenOriginalParent) {
      _battleScreenOriginalParent = el.parentElement;
    }
    if (el.parentElement !== document.body) {
      document.body.appendChild(el);
    }
    el.style.display = 'flex';
    el.classList.add('active');
    // Game-screen stays visible underneath (battle overlays it via z-index)
  } else {
    // Move battle-screen back to original parent and hide it
    const bs = document.getElementById('battle-screen');
    if (bs) {
      bs.style.display = 'none';
      bs.classList.remove('active');
      if (_battleScreenOriginalParent && bs.parentElement === document.body) {
        _battleScreenOriginalParent.appendChild(bs);
      }
    }
    // Clear all .screen elements and activate the requested one
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
  }
}

// ===== TABS =====
function showTab(tab, btnEl) {
  const targetTab = document.getElementById('tab-' + tab);
  if (!targetTab) {
    console.warn(`[LegacyRender] showTab failed: Element #tab-${tab} not found.`);
    return;
  }
  
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  // Limpiar estado activo en ambos menús
  document.querySelectorAll('.nav-btn, .hud-nav-btn').forEach(b => b.classList.remove('active'));

  targetTab.style.display = 'block';

  // Activar botones correspondientes en ambos menús
  document.querySelectorAll(`.nav-btn[data-tab="${tab}"], .hud-nav-btn[data-tab="${tab}"]`).forEach(b => {
    b.classList.add('active');
    
    // Si está dentro de un grupo (HUD Redesign), activar también el padre
    const group = b.closest('.hud-group, .nav-group');
    if (group) {
      const groupBtn = group.querySelector('.group-btn');
      if (groupBtn) groupBtn.classList.add('active');
    }
  });

  // Cerrar menús de grupo (HUD/Móvil)
  // Forzamos el cierre inmediato y también con un pequeño delay para mayor seguridad
  const closeMenus = () => {
    document.querySelectorAll('.hud-group, .nav-group, .is-open').forEach(g => {
      g.classList.remove('is-open');
    });
  };
  
  closeMenus();
  setTimeout(closeMenus, 50);
  setTimeout(closeMenus, 150);

  if (tab === 'team') renderTeam();
  if (tab === 'pokedex') renderPokedex();
  if (tab === 'gyms') renderGyms();
  if (tab === 'market') renderMarket();
  if (tab === 'trainer-shop') renderTrainerShop();
  if (tab === 'online-market') {
     if (typeof renderOnlineMarket === 'function') renderOnlineMarket();
  }
  if (tab === 'map') renderMaps();
  if (tab === 'daycare') renderDaycareUI();
  if (tab === 'box') {
    if (typeof openBoxTab === 'function') openBoxTab();
    else renderBox();
  }
  if (tab === 'bag') renderBag();
  if (tab === 'friends') renderFriends();
  if (tab === 'war') {
    if (typeof renderWarTab === 'function') renderWarTab();
  }
  if (tab === 'ranked') {
    if (typeof renderRankedTab === 'function') renderRankedTab();
    else if (typeof loadPlayerElo === 'function') loadPlayerElo();
  }

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
  if (typeof window.triggerVueSync === 'function') window.triggerVueSync();
  const grid = document.getElementById('team-grid');
  if (!grid) return; // Vue manages this now
  if (state.team.length === 0) {
    grid.innerHTML = '<div class="empty-state"><span class="empty-icon">🎒</span>No tenés Pokémon en tu equipo todavía.</div>';
    return;
  }
  const releasing = grid.dataset.releaseMode === 'true';
  const rocketSelling = grid.dataset.rocketMode === 'true';
  const isSelectMode = releasing || rocketSelling;
  const ui = window.uiSelectionState || {};

  grid.innerHTML = state.team.map((p, i) => {
    const pct = p.hp / p.maxHp;
    const isSelected = releasing ? (window._releaseSelected?.includes?.(i)) : (rocketSelling ? ui.teamRocketSelected?.includes?.(i) : false);
    
    let selClass = '';
    if (releasing) selClass = isSelected ? 'release-selected' : 'release-selectable';
    else if (rocketSelling) selClass = isSelected ? 'rocket-selected' : 'rocket-selectable';

    const checkMark = isSelectMode && isSelected ? `<div class="${releasing ? 'release-check' : 'rocket-check'}">✓</div>` : '';
    
    let clickFn = `openPokemonDetail(${i})`;
    if (releasing) clickFn = `toggleReleaseSelect(${i})`;
    else if (rocketSelling) clickFn = `window.toggleTeamRocketSelect(${i})`;

    if (p.onMission) clickFn = `notify('¡Este Pokémon está en una misión!', '📋')`;
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
      const itemHtml = p.heldItem ? (item && item.sprite ? `<img src="${item.sprite}" title="Equipado: ${p.heldItem}" style="width:16px;height:16px;image-rendering:pixelated;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">` : `<span style="font-size:12px;" title="Equipado: ${p.heldItem}">${item ? item.icon : '📦'}</span>`) : '';
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

    return `<div class="team-card ${selClass}" onclick="${clickFn}" style="cursor:${p.onMission ? 'not-allowed' : 'pointer'};position:relative;${p.onMission ? 'opacity:0.6;' : ''}" draggable="${!isSelectMode && !p.onMission}" ondragstart="handleDragStart(event, ${i})" ondragover="handleDragOver(event)" ondrop="handleDrop(event, ${i})">
      ${checkMark}
      ${badgesHtml}
      ${obedienceTag}
      ${p.onMission ? `<div style="position:absolute;top:5px;right:${tierInfo && tierInfo.tier ? '45px' : '5px'};background:#fbbf24;color:#000;border-radius:6px;font-size:6px;font-weight:bold;padding:2px 5px;z-index:3;">📋 MISIÓN</div>` : ''}
      <div style="position:absolute;top:5px;right:5px;background:${tierInfo.bg};color:${tierInfo.color};font-family:'Press Start 2P',monospace;font-size:6px;padding:2px 5px;border-radius:6px;border:1px solid ${tierInfo.color}44;line-height:1.4;z-index:2;">${tierInfo.tier}</div>
      <div style="height:80px;display:flex;align-items:center;justify-content:center;margin-bottom:4px;">
        <img id="team-sprite-${i}" src="" alt="${p.name}" style="width:72px;height:72px;image-rendering:pixelated;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5));display:none;pointer-events:none;">
      </div>
      <div class="team-pokemon-name">${p.name}${p.isShiny ? ' ✨' : ''} ${renderGenderBadge(p.gender)}</div>
      <div class="team-pokemon-level">Nv. ${p.level}</div>
      <div class="hp-bar-wrap"><div class="hp-bar ${getHpClass(pct)}" style="width:${pct * 100}%"></div></div>
      <div style="font-size:11px;color:var(--gray);margin-top:4px">${p.hp}/${p.maxHp} HP</div>
      ${isSelectMode ? '' : `<div style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap;">
        <button onclick="event.stopPropagation(); openTeamItemMenu(${i})" style="flex:1;min-width:40%;font-family:'Press Start 2P',monospace;font-size:6px;color:var(--green);background:rgba(107,203,119,0.15);border:1px solid rgba(107,203,119,0.3);border-radius:6px;padding:6px;cursor:pointer;">🎒 OBJETO</button>
        <button onclick="event.stopPropagation(); openPokemonDetail(${i})" style="flex:1;min-width:40%;font-family:'Press Start 2P',monospace;font-size:6px;color:var(--purple);background:rgba(199,125,255,0.15);border:1px solid rgba(199,125,255,0.3);border-radius:6px;padding:6px;cursor:pointer;">👁️ DATOS</button>
        <button onclick="event.stopPropagation(); sendToBox(${i})" style="flex:1;min-width:100%;font-family:'Press Start 2P',monospace;font-size:6px;color:var(--blue);background:rgba(59,139,255,0.15);border:1px solid rgba(59,139,255,0.3);border-radius:6px;padding:6px;cursor:pointer;">📦 CAJA</button>
      </div>`}
    </div>`;
  }).join('');
  state.team.forEach((p, i) => {
    setTimeout(() => {
      const img = document.getElementById('team-sprite-' + i);
      if (img) {
        loadSprite(img, null, getSpriteUrl(p.id, p.isShiny));
        // Apply Aura
        img.classList.remove('aura-white-mini', 'aura-black-mini');
        if (p.aura) img.classList.add('aura-' + p.aura + '-mini');
      }
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
  if (state.team[index].onMission) {
    e.preventDefault();
    notify('¡Este Pokémon está en una misión!', '📋');
    return;
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

function showPokemonDetails(p, index, location = 'team', extraData = null) {
  // Now handled by Vue (PokemonDetailModal.vue) via stateBridge.js
  if (typeof window.uiStore?.openPokemonDetail === 'function') {
    window.uiStore.openPokemonDetail(p, index, location, extraData);
  }
}

function openPokemonDetail(index) {
  showPokemonDetails(state.team[index], index, 'team');
}

function openFactionChoice() {
  const modal = document.getElementById('faction-choice-modal');
  if (modal) {
    modal.style.display = 'flex';
    // Forzar z-index para estar por encima de otros modales si es necesario
    modal.style.zIndex = '10000';
  } else {
    console.error("No se encontro faction-choice-modal");
  }
}
window.openFactionChoice = openFactionChoice;

function closePokemonDetail() {
  // Now handled by Vue via stateBridge.js
  if (typeof window.uiStore?.closePokemonDetail === 'function') {
    window.uiStore.closePokemonDetail();
  }
}

function showMoveDetail(moveName) {
  // Now handled by Vue via stateBridge.js
  if (typeof window.uiStore?.openMoveDetail === 'function') {
    window.uiStore.openMoveDetail(moveName);
  }
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
          : '';
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
                    <span class="type-badge type-${gym.type.toLowerCase()}" style="font-size:11px; padding:3px 10px;">
                      ${TYPE_ICON[gym.type] || ''} ${gym.type}
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
        : '';
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
window.getDayCycle = getDayCycle; // Fix for "getDayCycle is not defined" error in modules

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
    if (state.incenseSecs > 0) { state.incenseSecs--; changed = true; }

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
              <div class="hud-egg-time">${isReady ? 'ECLOSIONAR' : Math.ceil(egg.steps) + ' pasos'}</div>
            </div>
          </div>
        `;
  }).join('');
}

function updateBuffPanel() {
  const panel = document.getElementById('buff-panel');
  if (!panel) return;

  // Evitar actualizaciones de DOM pesadas si estamos en combate para prevenir flickering
  if (state.battle) return;

  const buffs = [
    { id: 'repel', secs: state.repelSecs },
    { id: 'shiny', secs: state.shinyBoostSecs },
    { id: 'amulet', secs: state.amuletCoinSecs },
    { id: 'lucky-egg', secs: state.luckyEggSecs },
    { id: 'safari', secs: state.safariTicketSecs },
    { id: 'cerulean', secs: state.ceruleanTicketSecs },
    { id: 'articuno', secs: state.articunoTicketSecs },
    { id: 'mewtwo', secs: state.mewtwoTicketSecs },
    { id: 'iv-scanner', secs: state.ivScannerSecs },
    { id: 'incense', secs: state.incenseSecs }
  ];

  buffs.forEach(b => {
    const itemEl = document.getElementById(`buff-${b.id}`);
    if (!itemEl) return;

    if ((b.secs || 0) > 0) {
      // Especial handling for Incense
      if (b.id === 'incense' && state.incenseType) {
        const typeNames = { fire: 'Fuego', water: 'Agua', grass: 'Planta', normal: 'Normal', ghost: 'Fantasma', psychic: 'Psíquico' };
        const typeSprites = {
          fire: 'incense.png', water: 'sea-incense.png', grass: 'rose-incense.png',
          normal: 'luck-incense.png', ghost: 'pure-incense.png', psychic: 'odd-incense.png'
        };
        const typeName = typeNames[state.incenseType] || 'Desconocido';
        const typeSprite = typeSprites[state.incenseType] || 'incense.png';
        
        const titleEl = itemEl.querySelector('.buff-tooltip-name');
        if (titleEl) titleEl.textContent = `💨 Incienso ${typeName}`;
        
        const descEl = itemEl.querySelector('.buff-tooltip-desc');
        if (descEl) descEl.textContent = `Atrae Pokémon de tipo ${typeName} durante 30 min.`;
        
        const imgEl = itemEl.querySelector('.buff-sprite');
        if (imgEl) imgEl.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${typeSprite}`;
      }

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

  // --- Dynamic Event Buffs (Active Only) ---
  panel.querySelectorAll('.buff-item.event').forEach(el => el.remove());
  
  if (typeof _activeEvents !== 'undefined' && _activeEvents.length > 0) {
    _activeEvents.forEach(ev => {
      const el = document.createElement('div');
      el.className = 'buff-item event';
      el.style.cursor = 'pointer';
      el.innerHTML = `
        <div class="buff-collapsed">
          <div style="font-size:20px; line-height:1;">${ev.icon || '🎁'}</div>
        </div>
        <div class="buff-tooltip">
          <div class="buff-tooltip-name" style="color:var(--yellow);">${ev.name}</div>
          <div class="buff-tooltip-desc">${ev.description || '¡Evento especial activo ahora! Participá para ganar premios.'}</div>
          <div class="buff-tooltip-time" style="color:#fff;">Toca para más info</div>
        </div>
      `;
      el.onclick = () => { if (typeof showEventDetail === 'function') showEventDetail(ev.id); };
      panel.appendChild(el);
    });
  }
}

function updateHud() {
  if (typeof window.triggerVueSync === 'function') window.triggerVueSync();
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

  /*
  const timeIcon = document.getElementById('time-icon');
  const timeLabel = document.getElementById('time-label');
  if (timeIcon) timeIcon.textContent = cycleInfo.icon;
  if (timeLabel) {
    timeLabel.textContent = cycleInfo.label;
    timeLabel.style.color = cycleInfo.color;
  }
  */

  if (cycle !== _lastDayCycle) {
    _lastDayCycle = cycle;
    const mapTab = document.getElementById('tab-map');
    if (mapTab && mapTab.style.display !== 'none') {
      renderMaps();
    }
  }

  /*
  const badgeEl = document.getElementById('badge-count');
  if (badgeEl) badgeEl.textContent = badgeCount;

  recalculateBalls();
  const ballEl = document.getElementById('ball-count');
  if (ballEl) ballEl.textContent = state.balls;
  const tLevelEl = document.getElementById('trainer-level');
  if (tLevelEl) tLevelEl.textContent = state.trainerLevel;

  const nameEl = document.getElementById('hud-name');
  if (nameEl) {
    nameEl.textContent = state.trainer || 'Entrenador';
    nameEl.className = 'trainer-name' + (state.nick_style ? ' ' + state.nick_style : '');
  }

  const moneyEl = document.getElementById('hud-money');
  if (moneyEl) moneyEl.textContent = (state.money || 0).toLocaleString();

  const bcEl = document.getElementById('hud-bc');
  if (bcEl) {
    bcEl.textContent = (state.battleCoins || 0).toLocaleString();
    bcEl.style.color = '';
    bcEl.style.textShadow = '';
  }

  const eggCountEl = document.getElementById('egg-count');
  if (eggCountEl) eggCountEl.textContent = state.eggs ? state.eggs.length : 0;
  */

  /*
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
  */

  if (typeof updateClassHud === 'function') updateClassHud();
}

// Auto-update time every minute
setInterval(updateHud, 60000);


// ===== SETTINGS & ZOOM SYSTEM =====
function toggleSettings() {
  const modal = document.getElementById('settings-modal');
  if (!modal) {
    if (typeof window.toggleSettings === 'function' && window.toggleSettings !== toggleSettings) {
      window.toggleSettings();
    }
    return;
  }
  if (modal.style.display === 'none' || modal.style.display === '') {
    modal.style.display = 'flex';
  } else {
    modal.style.display = 'none';
  }
}

function updateZoom(val) {
  const zoom = val / 100;
  const zoomable = document.getElementById('zoomable-content');
  
  // Set global CSS variable for scaling calculations in CSS
  document.documentElement.style.setProperty('--app-zoom', zoom);
  
  if (zoomable) {
    // Volver a usar 'zoom' que es nativo en Chrome/Edge y no rompe el layout box
    zoomable.style.zoom = zoom;
    
    // Forzar redibujo de los modales internos si es necesario
    const overlays = zoomable.querySelectorAll('.modal-overlay');
    overlays.forEach(o => { o.style.transform = 'translateZ(0)'; });

    // Fallback ligero para Firefox
    if (zoomable.style.zoom === undefined || zoomable.style.zoom === "") {
        zoomable.style.transform = `scale(${zoom})`;
        zoomable.style.transformOrigin = 'top center';
    } else {
        zoomable.style.transform = 'none';
        zoomable.style.width = '100%';
        zoomable.style.height = 'auto';
    }
  }

  const label = document.getElementById('zoom-value');
  if (label) label.textContent = val + '%';

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
