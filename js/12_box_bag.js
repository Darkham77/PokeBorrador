    // ===== BOX SYSTEM =====

    // ── Tier system (based on sum of all 6 IVs, max = 186) ──────
    // S+: 186 (all perfect)  S: 168–185  A: 140–167
    // B: 112–139             C: 84–111   D: 56–83    F: 0–55
    const BOX_TIER_CONFIG = {
      'S+': { min: 186, max: 186, color: '#FFD700', bg: 'rgba(255,215,0,0.18)', label: 'S+' },
      'S': { min: 168, max: 185, color: '#FFB800', bg: 'rgba(255,184,0,0.14)', label: 'S' },
      'A': { min: 140, max: 167, color: '#6BCB77', bg: 'rgba(107,203,119,0.14)', label: 'A' },
      'B': { min: 112, max: 139, color: '#3B8BFF', bg: 'rgba(59,139,255,0.14)', label: 'B' },
      'C': { min: 84, max: 111, color: '#C77DFF', bg: 'rgba(199,125,255,0.14)', label: 'C' },
      'D': { min: 56, max: 83, color: '#FF9632', bg: 'rgba(255,150,50,0.14)', label: 'D' },
      'F': { min: 0, max: 55, color: '#FF3B3B', bg: 'rgba(255,59,59,0.14)', label: 'F' },
    };

    function getPokemonTier(p) {
      const ivs = p.ivs || {};
      const total = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0);
      for (const [tier, cfg] of Object.entries(BOX_TIER_CONFIG)) {
        if (total >= cfg.min && total <= cfg.max) return { tier, total, ...cfg };
      }
      return { tier: 'F', total, ...BOX_TIER_CONFIG['F'] };
    }

    // ── Active filters state ─────────────────────────────────────
    let _boxFilters = {
      tier: 'all', type: 'all', levelMin: 1, levelMax: 100,
      ivHP: 0, ivATK: 0, ivDEF: 0, ivSPA: 0, ivSPD: 0, ivSPE: 0
    };
    let _boxFiltersOpen = false;
    let _boxReleaseMode = false;
    let _boxReleaseSelected = new Set();

    function toggleBoxFilters() {
      _boxFiltersOpen = !_boxFiltersOpen;
      const body = document.getElementById('box-filter-body');
      const chevron = document.getElementById('box-filter-chevron');
      if (body) body.style.display = _boxFiltersOpen ? 'block' : 'none';
      if (chevron) chevron.style.transform = _boxFiltersOpen ? 'rotate(180deg)' : 'rotate(0deg)';
    }

    function setBoxFilter(key, val) {
      _boxFilters[key] = val;
      // Sync slider labels
      if (key === 'levelMin') { const el = document.getElementById('box-level-min-val'); if (el) el.textContent = val; }
      if (key === 'levelMax') { const el = document.getElementById('box-level-max-val'); if (el) el.textContent = val; }
      const ivMap = { ivHP: 'iv-hp-val', ivATK: 'iv-atk-val', ivDEF: 'iv-def-val', ivSPA: 'iv-spa-val', ivSPD: 'iv-spd-val', ivSPE: 'iv-spe-val' };
      if (ivMap[key]) { const el = document.getElementById(ivMap[key]); if (el) el.textContent = val; }
      // Active state on tier buttons
      if (key === 'tier') {
        document.querySelectorAll('[data-tier]').forEach(b => {
          b.classList.toggle('box-filter-active', b.dataset.tier === val);
          b.style.outline = b.dataset.tier === val ? '2px solid currentColor' : 'none';
        });
      }
      // Active state on type buttons
      if (key === 'type') {
        document.querySelectorAll('[data-type]').forEach(b => {
          b.classList.toggle('box-filter-active', b.dataset.type === val);
          b.style.outline = b.dataset.type === val ? '2px solid currentColor' : 'none';
        });
      }
      renderBox();
    }

    function resetBoxFilters() {
      _boxFilters = {
        tier: 'all', type: 'all', levelMin: 1, levelMax: 100,
        ivHP: 0, ivATK: 0, ivDEF: 0, ivSPA: 0, ivSPD: 0, ivSPE: 0
      };
      // Reset sliders
      ['box-level-min', 'box-level-max', 'iv-hp', 'iv-atk', 'iv-def', 'iv-spa', 'iv-spd', 'iv-spe'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = id.includes('max') ? 100 : (id.includes('level-min') ? 1 : 0);
      });
      ['box-level-min-val', 'box-level-max-val', 'iv-hp-val', 'iv-atk-val', 'iv-def-val', 'iv-spa-val', 'iv-spd-val', 'iv-spe-val'].forEach((id, i) => {
        const el = document.getElementById(id); if (el) el.textContent = i === 1 ? '100' : i === 0 ? '1' : '0';
      });
      document.querySelectorAll('[data-tier]').forEach(b => {
        b.style.outline = b.dataset.tier === 'all' ? '2px solid currentColor' : 'none';
      });
      document.querySelectorAll('[data-type]').forEach(b => {
        b.style.outline = b.dataset.type === 'all' ? '2px solid currentColor' : 'none';
      });
      renderBox();
    }

    function _applyBoxFilters(box) {
      return box.filter((p, i) => {
        const f = _boxFilters;
        const ivs = p.ivs || {};
        // Tier
        if (f.tier !== 'all') {
          const { tier } = getPokemonTier(p);
          if (tier !== f.tier) return false;
        }
        // Type
        if (f.type !== 'all' && p.type !== f.type) return false;
        // Level
        if (p.level < f.levelMin || p.level > f.levelMax) return false;
        // IV minimums
        if ((ivs.hp || 0) < f.ivHP) return false;
        if ((ivs.atk || 0) < f.ivATK) return false;
        if ((ivs.def || 0) < f.ivDEF) return false;
        if ((ivs.spa || 0) < f.ivSPA) return false;
        if ((ivs.spd || 0) < f.ivSPD) return false;
        if ((ivs.spe || 0) < f.ivSPE) return false;
        return true;
      });
    }

    function _hasActiveFilters() {
      const f = _boxFilters;
      return f.tier !== 'all' || f.type !== 'all' || f.levelMin > 1 || f.levelMax < 100 ||
        f.ivHP > 0 || f.ivATK > 0 || f.ivDEF > 0 || f.ivSPA > 0 || f.ivSPD > 0 || f.ivSPE > 0;
    }

    // ── Box Release Mode ─────────────────────────────────────────
    function toggleBoxReleaseMode() {
      _boxReleaseMode = !_boxReleaseMode;
      _boxReleaseSelected.clear();

      const btnRelease = document.getElementById('btn-box-release-mode');
      const btnConfirm = document.getElementById('btn-box-confirm-release');
      const btnCancel = document.getElementById('btn-box-cancel-release');
      const hintRelease = document.getElementById('box-release-hint');
      const hintNormal = document.getElementById('box-normal-hint');

      if (btnRelease) btnRelease.style.display = _boxReleaseMode ? 'none' : 'inline-block';
      if (btnConfirm) btnConfirm.style.display = _boxReleaseMode ? 'inline-block' : 'none';
      if (btnCancel) btnCancel.style.display = _boxReleaseMode ? 'inline-block' : 'none';
      if (hintRelease) hintRelease.style.display = _boxReleaseMode ? 'block' : 'none';
      if (hintNormal) hintNormal.style.display = _boxReleaseMode ? 'none' : 'block';

      renderBox();
    }

    function toggleBoxReleaseSelect(index) {
      if (_boxReleaseSelected.has(index)) {
        _boxReleaseSelected.delete(index);
      } else {
        _boxReleaseSelected.add(index);
      }
      renderBox();
    }

    function confirmBoxRelease() {
      if (_boxReleaseSelected.size === 0) {
        notify('No seleccionaste ningún Pokémon.', '❓');
        return;
      }
      const names = [..._boxReleaseSelected].map(i => state.box[i].name).join(', ');

      const overlay = document.createElement('div');
      overlay.id = 'box-release-confirm-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;';
      overlay.innerHTML = `
        <div style="background:var(--card);border-radius:20px;padding:32px 24px;max-width:340px;width:100%;text-align:center;border:1px solid rgba(255,59,59,0.3);">
          <div style="font-size:48px;margin-bottom:12px;">🌿</div>
          <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:var(--red);margin-bottom:16px;">¿SOLTAR POKÉMON DE LA CAJA?</div>
          <div style="font-size:13px;color:var(--gray);line-height:1.6;margin-bottom:24px;">
            Vas a soltar a:<br>
            <strong style="color:var(--text);">${names}</strong><br><br>
            Esta acción es <strong style="color:var(--red);">permanente</strong> y no se puede deshacer.
          </div>
          <div style="display:flex;gap:12px;justify-content:center;">
            <button onclick="doBoxRelease()" style="font-family:'Press Start 2P',monospace;font-size:8px;
              padding:12px 20px;border:none;border-radius:12px;cursor:pointer;
              background:linear-gradient(135deg,var(--red),#c0392b);color:#fff;">
              ¡SÍ, SOLTAR!
            </button>
            <button onclick="document.getElementById('box-release-confirm-overlay').remove()" style="font-family:'Press Start 2P',monospace;font-size:8px;
              padding:12px 20px;border:1px solid rgba(255,255,255,0.1);border-radius:12px;cursor:pointer;
              background:transparent;color:var(--gray);">
              CANCELAR
            </button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }

    function doBoxRelease() {
      document.getElementById('box-release-confirm-overlay')?.remove();

      const indices = [..._boxReleaseSelected].sort((a, b) => b - a);
      const releasedNames = indices.map(i => state.box[i].name);

      indices.forEach(i => state.box.splice(i, 1));

      _boxReleaseSelected.clear();
      toggleBoxReleaseMode(); // This will also handle UI reset and renderBox()

      updateHud();
      scheduleSave();
      notify(`¡${releasedNames.join(', ')} ${releasedNames.length > 1 ? 'fueron soltados' : 'fue soltado'}!`, '🌿');
    }

    function renderBox() {
      if (!state.box) state.box = [];
      const grid = document.getElementById('box-grid');
      const badge = document.getElementById('box-count-badge');
      const warning = document.getElementById('box-full-warning');
      const resultsInfo = document.getElementById('box-results-info');

      badge.textContent = `${state.box.length}/100 Pokémon`;
      warning.style.display = state.box.length >= 100 ? 'block' : 'none';

      // Disable release button if box is empty
      const btnRelease = document.getElementById('btn-box-release-mode');
      if (btnRelease) {
        const isEmpty = state.box.length === 0;
        btnRelease.disabled = isEmpty;
        btnRelease.style.opacity = isEmpty ? '0.5' : '1';
        btnRelease.style.cursor = isEmpty ? 'not-allowed' : 'pointer';
      }

      // Apply filters
      const filtered = _applyBoxFilters(state.box);
      const isFiltered = _hasActiveFilters();

      // Summary in filter header
      const summaryEl = document.getElementById('box-filter-summary');
      if (summaryEl) {
        if (isFiltered) {
          summaryEl.textContent = `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`;
          summaryEl.style.color = 'var(--yellow)';
        } else { summaryEl.textContent = ''; }
      }

      // Results info bar
      if (resultsInfo) {
        if (isFiltered) {
          resultsInfo.textContent = `Mostrando ${filtered.length} de ${state.box.length} Pokémon`;
          resultsInfo.style.display = 'block';
        } else { resultsInfo.style.display = 'none'; }
      }

      if (state.box.length === 0) {
        grid.innerHTML = '<div class="empty-state"><span class="empty-icon">📦</span>La Caja está vacía.<br>Los Pokémon capturados con el equipo lleno van aquí.</div>';
        return;
      }

      if (filtered.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:32px;text-align:center;">
          <span class="empty-icon" style="font-size:48px;display:block;margin-bottom:12px;">🔍</span>
          <div style="font-size:12px;color:var(--gray);">Ningún Pokémon cumple<br>los filtros activos.</div>
          <button onclick="resetBoxFilters()" style="margin-top:12px;padding:8px 16px;border:none;border-radius:10px;
            cursor:pointer;background:rgba(255,255,255,0.08);color:var(--gray);font-size:11px;">↺ Limpiar filtros</button>
        </div>`;
        return;
      }

      // Build cards — filtered array has real box indices mapped
      const indexedFiltered = state.box.map((p, i) => ({ p, i })).filter(({ p }) => {
        const ivs = p.ivs || {};
        const f = _boxFilters;
        if (f.tier !== 'all' && getPokemonTier(p).tier !== f.tier) return false;
        if (f.type !== 'all' && p.type !== f.type) return false;
        if (p.level < f.levelMin || p.level > f.levelMax) return false;
        if ((ivs.hp || 0) < f.ivHP || (ivs.atk || 0) < f.ivATK || (ivs.def || 0) < f.ivDEF) return false;
        if ((ivs.spa || 0) < f.ivSPA || (ivs.spd || 0) < f.ivSPD || (ivs.spe || 0) < f.ivSPE) return false;
        return true;
      });

      grid.innerHTML = indexedFiltered.map(({ p, i }) => {
        const sid = getSpriteId(p.id);
        const url = getSpriteUrl(p.id, p.isShiny);
        const hpPct = Math.round(p.hp / p.maxHp * 100);
        const hpCol = hpPct > 50 ? 'var(--green)' : hpPct > 20 ? 'var(--yellow)' : 'var(--red)';
        const tierInfo = getPokemonTier(p);
        const ivTotal = tierInfo.total;

        // Badges Container (Held Item + Tags)
        const tags = p.tags || [];
        let badgesHtml = '';
        if (p.heldItem || tags.length) {
          const item = p.heldItem ? SHOP_ITEMS.find(it => it.name === p.heldItem) : null;
          const itemHtml = p.heldItem ? `<span style="font-size:10px;" title="Equipado: ${p.heldItem}">${item ? item.icon : '📦'}</span>` : '';
          const tagsListHtml = tags.map(tag => {
            if (tag === 'fav') return '<span class="tag-icon-small">⭐</span>';
            if (tag === 'breed') return '<span class="tag-icon-small">❤️</span>';
            if (tag === 'iv31') return '<span class="tag-icon-small">31</span>';
            return '';
          }).join('');

          badgesHtml = `<div style="position:absolute;top:5px;left:5px;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);padding:2px 4px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);z-index:2;display:flex;align-items:center;gap:4px;">
                ${itemHtml}
                ${tagsListHtml}
              </div>`;
        }

        const selected = _boxReleaseSelected.has(i);
        const selClass = _boxReleaseMode ? (selected ? 'release-selected' : 'release-selectable') : '';
        const checkMark = _boxReleaseMode && selected ? '<div class="release-check">✓</div>' : '';
        const onclickFn = _boxReleaseMode ? `toggleBoxReleaseSelect(${i})` : `openBoxPokemonMenu(${i})`;

        return `<div onclick="${onclickFn}" class="${selClass}" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
      border-radius:12px;padding:10px 8px;text-align:center;cursor:pointer;transition:all .2s;position:relative;"
      ${_boxReleaseMode ? '' : 'onmouseover="this.style.borderColor=\'rgba(199,125,255,0.4)\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.08)\'"'}>
      <!-- Release checkmark -->
      ${checkMark}
      <!-- Tier and Held Item badges -->
      ${badgesHtml}
      <div style="position:absolute;top:5px;right:5px;background:${tierInfo.bg};color:${tierInfo.color};
        font-family:'Press Start 2P',monospace;font-size:6px;padding:2px 5px;border-radius:6px;
        border:1px solid ${tierInfo.color}44;line-height:1.4;">${tierInfo.tier}</div>
      <img src="${url}"
        width="56" height="56" style="image-rendering:pixelated;"
        onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <span style="display:none;font-size:32px;line-height:1;">${p.emoji}</span>
      <div style="font-size:9px;font-weight:700;margin-top:4px;">${p.name}${p.isShiny ? ' ✨' : ''}</div>
      <div style="font-size:9px;color:var(--gray);">Nv.${p.level}</div>
      <div style="font-size:8px;color:${tierInfo.color};margin-top:1px;">IVs: ${ivTotal}/186</div>
      <div style="background:rgba(255,255,255,0.1);border-radius:3px;height:4px;margin-top:4px;overflow:hidden;">
        <div style="width:${hpPct}%;height:100%;background:${hpCol};border-radius:3px;"></div>
      </div>
    </div>`;
      }).join('');
    }

    function openBoxPokemonMenu(boxIndex) {
      const p = state.box[boxIndex];
      if (!p) return;
      const sid = getSpriteId(p.id);

      const canAddToTeam = state.team.length < 6;
      const addBtn = canAddToTeam ? `<button onclick="moveBoxToTeam(${boxIndex})" style="width:100%;margin-bottom:12px;padding:10px;border:none;border-radius:10px;cursor:pointer;
        background:rgba(59,139,255,0.15);color:var(--blue);font-size:12px;font-weight:700;border:1px solid rgba(59,139,255,0.2);">
        ➕ Agregar al equipo
      </button>` : '';
      const swapTitle = canAddToTeam
        ? (state.team.length ? `<div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--purple);margin-bottom:10px;">O CAMBIAR POR:</div>` : '')
        : `<div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--purple);margin-bottom:10px;">¿CON QUIÉN LO CAMBIÁS?</div>`;

      // Build team selection for swap
      const teamOptions = state.team.map((t, ti) => {
        const tsid = getSpriteId(t.id);
        return `<div onclick="swapBoxWithTeam(${boxIndex},${ti})" style="display:flex;align-items:center;gap:10px;
      background:rgba(255,255,255,0.05);border-radius:10px;padding:10px;margin-bottom:6px;cursor:pointer;
      border:1px solid rgba(255,255,255,0.08);"
      onmouseover="this.style.borderColor='rgba(199,125,255,0.4)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'">
      <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${getSpriteId(t.id)}.png"
        width="36" height="36" style="image-rendering:pixelated;" 
        onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <span style="display:none;font-size:24px;line-height:1;">${t.emoji}</span>
      <div style="flex:1;">
        <div style="font-size:12px;font-weight:700;">${t.name}</div>
        <div style="font-size:10px;color:var(--gray);">Nv.${t.level} · ${t.hp}/${t.maxHp} HP</div>
      </div>
      <span style="font-size:10px;color:var(--purple);">↔️</span>
    </div>`;
      }).join('');

      const ov = document.createElement('div');
      ov.id = 'box-menu-overlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:16px;';
      ov.innerHTML = `<div style="background:var(--card);border-radius:20px;padding:24px;width:100%;max-width:380px;max-height:80vh;overflow-y:auto;">
    <div style="text-align:center;margin-bottom:16px;">
      <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${getSpriteId(p.id)}.png"
        width="72" height="72" style="image-rendering:pixelated;"
        onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <span style="display:none;font-size:52px;line-height:1;">${p.emoji}</span>
      <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:var(--yellow);margin-top:8px;">${p.name}</div>
      <div style="font-size:11px;color:var(--gray);">Nv.${p.level} · ${p.nature} · ${p.ability}</div>
      <div style="margin-top:12px; display:flex; align-items:center; gap:12px; justify-content:center;">
        <span class="tag-label" style="margin-bottom:0;">Destacar:</span>
        <div style="display:flex;gap:10px;">
          <div class="poke-tag ${p.tags?.includes('fav') ? 'active' : ''}" onclick="togglePokeTag('box', ${boxIndex}, 'fav')" title="Favorito">⭐</div>
          <div class="poke-tag ${p.tags?.includes('breed') ? 'active' : ''}" onclick="togglePokeTag('box', ${boxIndex}, 'breed')" title="Crianza">❤️</div>
          <div class="poke-tag ${p.tags?.includes('iv31') ? 'active' : ''}" onclick="togglePokeTag('box', ${boxIndex}, 'iv31')" title="IV 31">31</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--gray);margin-top:2px;">${p.hp}/${p.maxHp} HP${p.status ? ' · <span style="color:var(--red);">' + p.status.toUpperCase() + '</span>' : ''}</div>
    </div>
    <button onclick="document.getElementById('box-menu-overlay').remove();openBoxPokemonDetail(${boxIndex})" style="width:100%;margin-bottom:12px;padding:10px;border:none;border-radius:10px;cursor:pointer;
      background:rgba(199,125,255,0.15);color:var(--purple);font-size:12px;font-weight:700;border:1px solid rgba(199,125,255,0.3);">
      👁️ Ver Detalles
    </button>
    ${addBtn}
    ${swapTitle}
    ${teamOptions}
    <button onclick="openBoxItemMenu(${boxIndex})" style="width:100%;margin-top:10px;padding:10px;border:none;border-radius:10px;cursor:pointer;
      background:rgba(107,203,119,0.15);color:var(--green);font-size:12px;font-weight:700;border:1px solid rgba(107,203,119,0.2);">
      🎒 Usar Objeto
    </button>
    <button onclick="releaseFromBox(${boxIndex})" style="width:100%;margin-top:8px;padding:10px;border:none;border-radius:10px;cursor:pointer;
      background:rgba(255,59,59,0.15);color:var(--red);font-size:12px;font-weight:700;border:1px solid rgba(255,59,59,0.2);">
      🌿 Soltar a ${p.name}
    </button>
    <button onclick="document.getElementById('box-menu-overlay').remove()" style="width:100%;margin-top:8px;padding:10px;border:none;
      border-radius:10px;cursor:pointer;background:rgba(255,255,255,0.06);color:var(--gray);font-size:12px;">
      Cancelar
    </button>
  </div>`;
      ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
      document.body.appendChild(ov);
    }

    function openBoxPokemonDetail(boxIndex) {
      const p = state.box[boxIndex];
      if (!p) return;
      const pct = p.hp / p.maxHp;
      const hpClass = getHpClass(pct);
      const typeColors = { grass: '#6BCB77', fire: '#FF3B3B', water: '#3B8BFF', normal: '#aaa', electric: '#FFD93D', psychic: '#C77DFF', rock: '#c8a060', ground: '#c8a060', poison: '#C77DFF', bug: '#8BC34A', flying: '#89CFF0', ghost: '#7B2FBE', dragon: '#5C16C5', ice: '#7DF9FF', fighting: '#FF3B3B', dark: '#555', steel: '#9E9E9E' };
      const typeColor = typeColors[p.type] || '#aaa';
      const ivBars = Object.entries(p.ivs || {}).map(([stat, val]) => {
        const labels = { hp: 'HP', atk: 'Ataque', def: 'Defensa', spa: 'At.Esp', spd: 'Def.Esp', spe: 'Velocidad' };
        const bp = (val / 31) * 100;
        const color = val >= 28 ? '#6BCB77' : val >= 15 ? '#FFD93D' : '#FF3B3B';
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="font-size:10px;color:#888;width:65px;flex-shrink:0">${labels[stat]}</span>
        <div style="flex:1;background:rgba(255,255,255,0.1);border-radius:10px;height:8px;overflow:hidden;">
          <div style="width:${bp}%;height:100%;background:${color};border-radius:10px;"></div>
        </div>
        <span style="font-size:11px;color:${color};width:24px;text-align:right;">${val}</span>
      </div>`;
      }).join('');
      const movesList = (p.moves || []).map(m => {
        const md = MOVE_DATA[m.name] || {};
        const power = md.power || 40;
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
      const html = `<div style="background:#16213e;border-radius:24px;padding:28px;max-width:480px;width:92%;max-height:88vh;overflow-y:auto;border:2px solid ${typeColor}33;animation:fadeIn 0.3s ease;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="width:80px;height:80px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);border-radius:12px;">
            <img id="box-detail-sprite-img" src="" alt="${p.name}" style="width:72px;height:72px;image-rendering:pixelated;display:none;">
            <span id="box-detail-sprite-emoji" style="font-size:52px;">${p.emoji}</span>
          </div>
          <div>
            <div style="font-family:'Press Start 2P',monospace;font-size:12px;color:${typeColor};margin-bottom:6px;">${p.name}</div>
            <div style="font-size:12px;color:#888;">Nivel ${p.level} · ${p.type.charAt(0).toUpperCase() + p.type.slice(1)}</div>
            <div style="font-size:11px;color:#555;margin-top:4px;">#${String(POKEMON_SPRITE_IDS[p.id] || '???').padStart(3, '0')}</div>
            <div style="margin-top:12px; display:flex; align-items:center; gap:12px;">
              <span class="tag-label" style="margin-bottom:0;">Destacar:</span>
              <div style="display:flex;gap:10px;">
                <div class="poke-tag ${p.tags?.includes('fav') ? 'active' : ''}" onclick="togglePokeTag('box', ${boxIndex}, 'fav')" title="Favorito">⭐</div>
                <div class="poke-tag ${p.tags?.includes('breed') ? 'active' : ''}" onclick="togglePokeTag('box', ${boxIndex}, 'breed')" title="Crianza">❤️</div>
                <div class="poke-tag ${p.tags?.includes('iv31') ? 'active' : ''}" onclick="togglePokeTag('box', ${boxIndex}, 'iv31')" title="IV 31">31</div>
              </div>
            </div>
          </div>
        </div>
        <button onclick="document.getElementById('box-detail-overlay').style.display='none'" style="background:rgba(255,255,255,0.1);border:none;border-radius:10px;color:#aaa;font-size:18px;cursor:pointer;padding:6px 12px;">✕</button>
      </div>
      <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:14px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:12px;font-weight:700;">HP</span>
          <span style="font-size:12px;color:#888;">${p.hp} / ${p.maxHp}</span>
        </div>
        <div style="background:rgba(255,255,255,0.1);border-radius:10px;height:10px;overflow:hidden;">
          <div style="width:${pct * 100}%;height:100%;border-radius:10px;" class="${hpClass}"></div>
        </div>
      </div>
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
      <div style="margin-bottom:16px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#C77DFF;margin-bottom:10px;">📊 ESTADÍSTICAS</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">${statsHtml}</div>
      </div>
      <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:14px;margin-bottom:16px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#C77DFF;margin-bottom:12px;">🧬 IVs</div>
        ${ivBars}
      </div>
      <div>
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#C77DFF;margin-bottom:10px;">⚔️ MOVIMIENTOS</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">${movesList}</div>
      </div>
    </div>`;
      let overlay = document.getElementById('box-detail-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'box-detail-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:400;display:flex;align-items:center;justify-content:center;padding:20px;';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.style.display = 'none'; };
        document.body.appendChild(overlay);
      }
      overlay.innerHTML = html;
      overlay.style.display = 'flex';
      setTimeout(() => {
        const img = document.getElementById('box-detail-sprite-img');
        const emo = document.getElementById('box-detail-sprite-emoji');
        if (img) loadSprite(img, emo, getSpriteUrl(p.id), p.emoji);
      }, 50);
    }

    function moveBoxToTeam(boxIndex) {
      document.getElementById('box-menu-overlay')?.remove();
      if (!state.box) state.box = [];
      if (state.team.length >= 6) { notify('Tu equipo está lleno (máx. 6).', '⚠️'); return; }
      const boxPoke = state.box.splice(boxIndex, 1)[0];
      if (!boxPoke) return;
      state.team.push(boxPoke);
      renderBox();
      renderTeam();
      scheduleSave();
      notify(`¡${boxPoke.name} se unió a tu equipo!`, '➕');
    }
    function swapBoxWithTeam(boxIndex, teamIndex) {
      document.getElementById('box-menu-overlay')?.remove();
      const boxPoke = state.box.splice(boxIndex, 1)[0];
      const teamPoke = state.team.splice(teamIndex, 1, boxPoke)[0];
      // El que va a la caja se cura completamente
      teamPoke.hp = teamPoke.maxHp;
      teamPoke.status = null;
      teamPoke.sleepTurns = 0;
      teamPoke.moves.forEach(m => { m.pp = m.maxPP; });
      state.box.splice(boxIndex, 0, teamPoke);
      renderBox();
      renderTeam();
      scheduleSave();
      notify(`¡${boxPoke.name} entró al equipo, ${teamPoke.name} fue a la Caja!`, '🔄');
    }

    function releaseFromBox(boxIndex) {
      const p = state.box[boxIndex];
      if (!confirm(`¿Soltar a ${p.name} definitivamente?`)) return;
      document.getElementById('box-menu-overlay')?.remove();
      state.box.splice(boxIndex, 1);
      renderBox();
      scheduleSave();
      notify(`${p.name} fue liberado.`, '🌿');
    }

    // ===== BAG SYSTEM =====
    function renderBag(category = 'all') {
      const grid = document.getElementById('bag-grid');
      const empty = document.getElementById('bag-empty-warning');

      // Update tab active state
      document.querySelectorAll('#bag-tabs .market-tab-btn').forEach(btn => btn.classList.remove('active'));
      const activeTab = document.getElementById(`bag-tab-${category}`);
      if (activeTab) activeTab.classList.add('active');

      const allItems = Object.entries(state.inventory || {}).filter(([name, qty]) => {
        if (qty <= 0) return false;
        return !!SHOP_ITEMS.find(i => i.name === name);
      });

      const filteredItems = allItems.filter(([name, qty]) => {
        if (category === 'all') return true;
        const itemInfo = SHOP_ITEMS.find(i => i.name === name);
        if (!itemInfo) return false;

        if (category === 'potion') return itemInfo.cat === 'pociones';
        if (category === 'ball') return itemInfo.cat === 'pokeballs';
        if (category === 'etc') return !['pociones', 'pokeballs'].includes(itemInfo.cat);
        return true;
      });

      if (filteredItems.length === 0) {
        grid.style.display = 'none';
        empty.style.display = 'block';
        return;
      }

      grid.style.display = 'grid';
      empty.style.display = 'none';

      const tierColors = { common: 'tier-common', rare: 'tier-rare', epic: 'tier-epic', legend: 'tier-legend' };
      const tierLabels = { common: 'Común', rare: 'Raro', epic: 'Épico', legend: 'Legendario' };
      const typeTagColors = { stone: '#f5a623', held: '#7ed321', usable: '#4a90e2' };
      const typeTagLabels = { stone: 'Piedra', held: 'Equipable', usable: 'Usable' };

      grid.innerHTML = filteredItems.map(([name, qty]) => {
        const itemInfo = SHOP_ITEMS.find(i => i.name === name);
        const icon = itemInfo?.icon || '📦';
        const desc = itemInfo?.desc || 'Objeto de entrenador.';
        const sprite = itemInfo?.sprite || '';
        const tier = itemInfo?.tier || 'common';
        const type = itemInfo?.type || 'usable';
        const isUsable = !!HEALING_ITEMS[name] || name === 'Caramelo Raro';

        const tierCls = tierColors[tier];
        const typeTag = `<span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:8px;background:${typeTagColors[type] || '#666'}22;color:${typeTagColors[type] || '#aaa'};border:1px solid ${typeTagColors[type] || '#666'}44;">${typeTagLabels[type] || type}</span>`;

        return `<div class="market-card">
          <span class="market-tier-badge ${tierCls}">${tierLabels[tier]}</span>
          <div class="market-item-icon">
            ${sprite ? `<img src="${sprite}" width="40" height="40" style="image-rendering:pixelated;">` : `<span style="font-size:32px">${icon}</span>`}
          </div>
          <div class="market-item-name">${name}</div>
          ${typeTag}
          <div class="market-item-desc" style="margin-top:4px;">${desc}</div>
          <div class="market-item-price" style="margin-top:auto;">Cantidad: ${qty}</div>
          <button class="market-buy-btn" onclick="openBagUseMenu('${name}')" 
            ${!isUsable ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
            ${isUsable ? 'USAR' : 'NO USABLE'}
          </button>
        </div>`;
      }).join('');
    }

    function openBagUseMenu(itemName) {
      const GLOBAL_ITEMS = ['Repelente', 'Superrepelente', 'Máximo Repelente', 'Ticket Shiny', 'Moneda Amuleto'];
      if (GLOBAL_ITEMS.includes(itemName)) {
        const fn = HEALING_ITEMS[itemName];
        if (!fn || !state.inventory[itemName]) return;
        const result = fn(null);
        if (result === null) { notify('No se puede usar ahora.', '⚠️'); return; }
        state.inventory[itemName]--;
        if (!state.inventory[itemName]) delete state.inventory[itemName];
        notify('¡' + itemName + ' ' + result + '!', '✨');
        renderBag();
        if (typeof scheduleSave === 'function') scheduleSave();
        return;
      }
      const usableTeam = state.team;
      if (!usableTeam.length) return;

      const ov = document.createElement('div');
      ov.id = 'bag-use-overlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:16px;';

      let html = `<div style="background:var(--card);border-radius:20px;padding:24px;width:100%;max-width:340px;">
    <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:var(--yellow);margin-bottom:16px;">¿EN QUIÉN USAR ${itemName.toUpperCase()}?</div>
    <div style="display:flex;flex-direction:column;gap:8px;">`;

      usableTeam.forEach((p, i) => {
        const hpPct = Math.round(p.hp / p.maxHp * 100);
        const hpCol = hpPct > 50 ? 'var(--green)' : hpPct > 20 ? 'var(--yellow)' : 'var(--red)';
        const statusText = p.status ? `<span style="background:rgba(255,59,59,0.2);color:var(--red);padding:2px 4px;border-radius:4px;font-size:9px;">${p.status.toUpperCase()}</span>` : '';

        html += `<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.05);border-radius:12px;padding:10px 14px;">
      <div>
        <div style="font-size:12px;font-weight:700;margin-bottom:4px;">${p.name} Nv.${p.level} ${statusText}</div>
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="width:60px;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;"><div style="width:${hpPct}%;height:100%;background:${hpCol};"></div></div>
          <span style="font-size:10px;color:var(--gray);">${p.hp}/${p.maxHp}</span>
        </div>
      </div>
      <button onclick="applyBagItem('${itemName}', ${i})" style="font-family:'Press Start 2P',monospace;font-size:7px;padding:8px 12px;background:rgba(199,125,255,0.15);color:var(--purple);border:1px solid rgba(199,125,255,0.3);border-radius:8px;cursor:pointer;">APLICAR</button>
    </div>`;
      });

      html += `</div>
    <button onclick="document.getElementById('bag-use-overlay').remove()" style="margin-top:12px;width:100%;padding:10px;background:rgba(255,255,255,0.1);color:#fff;border:none;border-radius:10px;cursor:pointer;">Cerrar</button>
  </div>`;

      ov.innerHTML = html;
      ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
      document.body.appendChild(ov);
    }

    function applyBagItem(itemName, teamIndex) {
      const p = state.team[teamIndex];
      if (!p || !state.inventory[itemName]) return;

      const fn = HEALING_ITEMS[itemName];
      if (!fn) return;

      const result = fn(p);
      if (result === null) { notify('No tiene ningún efecto.', '⚠️'); return; }

      state.inventory[itemName]--;
      if (!state.inventory[itemName]) delete state.inventory[itemName];

      document.getElementById('bag-use-overlay')?.remove();
      notify(`Usaste ${itemName}. ¡${p.name} ${result}!`, '✨');

      renderBag();
      renderTeam();
      scheduleSave();
    }

