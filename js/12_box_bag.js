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
      ivHP: 0, ivATK: 0, ivDEF: 0, ivSPA: 0, ivSPD: 0, ivSPE: 0,
      ivAny31: false, ivTotalMin: 0, ivTotalMax: 186,
      search: ''
    };
    let _boxFiltersOpen = false;
    let _boxReleaseMode = false;
    let _boxReleaseSelected = new Set();
    let _boxRocketMode = false;
    let _boxRocketSelected = new Set();
    let _bagSellMode = false;
    let _bagSellSelected = {}; // { itemName: quantityToSell }
    let _currentBoxIndex = 0; // Caja actual visualizada (0 a state.boxCount-1)

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
      if (key === 'ivTotalMin') { const el = document.getElementById('box-iv-total-min-val'); if (el) el.textContent = val; }
      if (key === 'ivTotalMax') { const el = document.getElementById('box-iv-total-max-val'); if (el) el.textContent = val; }
      if (key === 'ivAny31') {
        const el = document.getElementById('box-filter-iv31');
        if (el) {
          el.style.background = val ? 'var(--yellow)' : 'rgba(255,255,255,0.1)';
          el.style.color = val ? 'var(--darker)' : '#eee';
          el.style.borderColor = val ? 'var(--yellow)' : 'rgba(255,255,255,0.15)';
        }
      }
      if (key === 'search') { const el = document.getElementById('box-search-input'); if (el && el.value !== val) el.value = val; }
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
        ivHP: 0, ivATK: 0, ivDEF: 0, ivSPA: 0, ivSPD: 0, ivSPE: 0,
        ivAny31: false, ivTotalMin: 0, ivTotalMax: 186,
        search: ''
      };
      // Reset inputs
      const searchEl = document.getElementById('box-search-input');
      if (searchEl) searchEl.value = '';

      // Reset sliders
      ['box-level-min', 'box-level-max', 'box-iv-total-min', 'box-iv-total-max', 'iv-hp', 'iv-atk', 'iv-def', 'iv-spa', 'iv-spd', 'iv-spe'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          if (id === 'box-level-max') el.value = 100;
          else if (id === 'box-iv-total-max') el.value = 186;
          else if (id === 'box-level-min') el.value = 1;
          else el.value = 0;
        }
      });
      ['box-level-min-val', 'box-level-max-val', 'box-iv-total-min-val', 'box-iv-total-max-val', 'iv-hp-val', 'iv-atk-val', 'iv-def-val', 'iv-spa-val', 'iv-spd-val', 'iv-spe-val'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          if (id === 'box-level-max-val') el.textContent = '100';
          else if (id === 'box-iv-total-max-val') el.textContent = '186';
          else if (id === 'box-level-min-val') el.textContent = '1';
          else el.textContent = '0';
        }
      });
      // Reset IV 31 button
      const iv31Btn = document.getElementById('box-filter-iv31');
      if (iv31Btn) {
        iv31Btn.style.background = 'rgba(255,255,255,0.1)';
        iv31Btn.style.color = '#eee';
        iv31Btn.style.borderColor = 'rgba(255,255,255,0.15)';
      }
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

        // IV Any 31
        if (f.ivAny31) {
          const has31 = Object.values(ivs).some(v => v === 31);
          if (!has31) return false;
        }

        // IV Total Range
        const total = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0);
        if (total < f.ivTotalMin || total > f.ivTotalMax) return false;

        // IV minimums
        if ((ivs.hp || 0) < f.ivHP) return false;
        if ((ivs.atk || 0) < f.ivATK) return false;
        if ((ivs.def || 0) < f.ivDEF) return false;
        if ((ivs.spa || 0) < f.ivSPA) return false;
        if ((ivs.spd || 0) < f.ivSPD) return false;
        if ((ivs.spe || 0) < f.ivSPE) return false;
        // Search
        if (f.search && !p.name.toLowerCase().includes(f.search.toLowerCase())) return false;
        return true;
      });
    }

    function _hasActiveFilters() {
      const f = _boxFilters;
      return f.tier !== 'all' || f.type !== 'all' || f.levelMin > 1 || f.levelMax < 100 ||
        f.ivHP > 0 || f.ivATK > 0 || f.ivDEF > 0 || f.ivSPA > 0 || f.ivSPD > 0 || f.ivSPE > 0 ||
        f.ivAny31 || f.ivTotalMin > 0 || f.ivTotalMax < 186 ||
        f.search !== '';
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
              ✓ SOLTAR
            </button>
            <button onclick="document.getElementById('box-release-confirm-overlay').remove()" style="font-family:'Press Start 2P',monospace;font-size:8px;
              padding:12px 20px;border:none;border-radius:12px;cursor:pointer;
              background:rgba(255,255,255,0.1);color:#fff;">
              CANCELAR
            </button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }

    function doBoxRelease() {
      document.getElementById('box-release-confirm-overlay')?.remove();
      const indices = [..._boxReleaseSelected].sort((a, b) => b - a);
      const releasedNames = [];
      indices.forEach(i => {
        releasedNames.push(state.box[i].name);
        state.box.splice(i, 1);
      });

      _boxReleaseMode = false;
      toggleBoxReleaseMode();
      renderBox();
      scheduleSave();
      notify(`¡${releasedNames.join(', ')} ${releasedNames.length > 1 ? 'fueron soltados' : 'fue soltado'}!`, '🌿');
    }

    // ── Rocket Box Sell Mode ─────────────────────────────────────
    function toggleBoxRocketMode() {
      if (state.playerClass !== 'rocket') return;
      _boxRocketMode = !_boxRocketMode;
      _boxRocketSelected.clear();

      const btnRocket = document.getElementById('btn-box-rocket-mode');
      const btnConfirm = document.getElementById('btn-box-confirm-rocket');
      const btnCancel = document.getElementById('btn-box-cancel-rocket');
      const hintRocket = document.getElementById('box-rocket-hint');
      const hintNormal = document.getElementById('box-normal-hint');
      const btnRelease = document.getElementById('btn-box-release-mode');

      if (btnRocket) btnRocket.style.display = _boxRocketMode ? 'none' : 'inline-block';
      if (btnConfirm) btnConfirm.style.display = _boxRocketMode ? 'inline-block' : 'none';
      if (btnCancel) btnCancel.style.display = _boxRocketMode ? 'inline-block' : 'none';
      if (hintRocket) hintRocket.style.display = _boxRocketMode ? 'block' : 'none';
      if (hintNormal) hintNormal.style.display = _boxRocketMode ? 'none' : 'block';
      if (btnRelease) btnRelease.style.display = _boxRocketMode ? 'none' : 'inline-block';

      renderBox();
    }

    function toggleBoxRocketSelect(index) {
      if (_boxRocketSelected.has(index)) {
        _boxRocketSelected.delete(index);
      } else {
        _boxRocketSelected.add(index);
      }
      renderBox();
    }

    function confirmBoxRocketSell() {
      if (_boxRocketSelected.size === 0) {
        notify('No seleccionaste ningún Pokémon.', '❓');
        return;
      }
      
      let totalPrice = 0;
      _boxRocketSelected.forEach(i => {
        const p = state.box[i];
        const ivs = p.ivs || {};
        const totalIv = Object.values(ivs).reduce((s, v) => s + (v || 0), 0);
        const price = Math.floor((p.level * 50 + (totalIv / 186) * 500) * 0.8);
        totalPrice += price;
      });

      const overlay = document.createElement('div');
      overlay.id = 'box-rocket-confirm-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;';
      overlay.innerHTML = `
        <div style="background:var(--card);border-radius:20px;padding:32px 24px;max-width:340px;width:100%;text-align:center;border:1px solid rgba(239,68,68,0.3);box-shadow: 0 0 30px rgba(239,68,68,0.2);">
          <div style="font-size:48px;margin-bottom:12px;">🚀</div>
          <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:#ef4444;margin-bottom:16px;">¿VENDER AL MERCADO NEGRO?</div>
          <div style="font-size:13px;color:var(--gray);line-height:1.6;margin-bottom:24px;">
            Vas a vender <strong>${_boxRocketSelected.size} Pokémon</strong>.<br><br>
            Ganancia total: <strong style="color:#22c55e;">₽${totalPrice.toLocaleString()}</strong><br>
            Criminalidad: <strong style="color:#ef4444;">+${_boxRocketSelected.size * 15}</strong><br><br>
            Esta acción es <strong style="color:#ef4444;">irreversible</strong>.
          </div>
          <div style="display:flex;gap:12px;justify-content:center;">
            <button onclick="doBoxRocketSell(${totalPrice})" style="font-family:'Press Start 2P',monospace;font-size:8px;
              padding:12px 20px;border:none;border-radius:12px;cursor:pointer;
              background:linear-gradient(135deg,#ef4444,#991b1b);color:#fff;box-shadow: 0 4px 12px rgba(239,68,68,0.3);">
              ✓ VENDER
            </button>
            <button onclick="document.getElementById('box-rocket-confirm-overlay').remove()" style="font-family:'Press Start 2P',monospace;font-size:8px;
              padding:12px 20px;border:none;border-radius:12px;cursor:pointer;
              background:rgba(255,255,255,0.1);color:#fff;">
              CANCELAR
            </button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }

    function doBoxRocketSell(totalPrice) {
      document.getElementById('box-rocket-confirm-overlay')?.remove();
      const indices = [..._boxRocketSelected].sort((a, b) => b - a);
      const count = indices.length;
      
      indices.forEach(i => {
        state.box.splice(i, 1);
      });

      state.money = (state.money || 0) + totalPrice;
      state.classData = state.classData || {};
      state.classData.blackMarketSales = (state.classData.blackMarketSales || 0) + count;
      
      // Aumentar criminalidad masiva (15 por cada uno)
      if (typeof addCriminality === 'function') {
        addCriminality(count * 15);
      }

      addClassXP(25 * count);
      
      _boxRocketMode = false;
      toggleBoxRocketMode(); // Reset buttons and state
      renderBox();
      updateHud();
      scheduleSave();
      notify(`¡${count} Pokémon vendidos por ₽${totalPrice.toLocaleString()}! 💰`, '🚀');
    }

    function switchBox(index) {
      _currentBoxIndex = index;
      renderBox();
    }

    function getBoxBuyCost() {
      const count = state.boxCount || 4;
      if (count < 4) return 500000;
      if (count === 4) return 500000;
      if (count === 5) return 1000000;
      // Duplicar a partir de ahí: 6->2M, 7->4M, 8->8M, 9->16M
      return 1000000 * Math.pow(2, count - 5);
    }

    function buyNewBox() {
      const cost = getBoxBuyCost();
      const maxBoxes = 10;
      if (state.boxCount >= maxBoxes) {
        notify('Ya alcanzaste el máximo de 10 cajas.', '⚠️');
        return;
      }
      if (state.money < cost) {
        notify(`No tenés suficiente dinero. Necesitás ₽${cost.toLocaleString()}.`, '❌');
        return;
      }

      const nextBoxNum = (state.boxCount || 4) + 1;
      if (!confirm(`¿Querés gastar ₽${cost.toLocaleString()} para comprar la Caja ${nextBoxNum}?`)) return;

      state.money -= cost;
      state.boxCount = (state.boxCount || 4) + 1;
      updateHud();
      renderBox();
      scheduleSave();
      notify(`¡Compraste la Caja ${state.boxCount}!`, '💰');
    }

    function renderBox() {
      if (!state.box) state.box = [];
      if (!state.boxCount) state.boxCount = 4;
      
      const grid = document.getElementById('box-grid');
      const badge = document.getElementById('box-count-badge');
      const warning = document.getElementById('box-full-warning');
      const resultsInfo = document.getElementById('box-results-info');
      const tabsContainer = document.getElementById('box-tabs-container');

      // Rocket buttons visibility
      const btnRocketMode = document.getElementById('btn-box-rocket-mode');
      if (btnRocketMode) {
        const isRocket = state.playerClass === 'rocket';
        btnRocketMode.style.display = (isRocket && !_boxReleaseMode && !_boxRocketMode) ? 'inline-block' : 'none';
        const isEmpty = state.box.length === 0;
        btnRocketMode.disabled = isEmpty;
        btnRocketMode.style.opacity = isEmpty ? '0.5' : '1';
      }

      const maxCapacity = state.boxCount * 50;
      badge.textContent = `${state.box.length}/${maxCapacity} Pokémon`;
      warning.style.display = state.box.length >= maxCapacity ? 'block' : 'none';

      // Render Tabs
      if (tabsContainer) {
        let tabsHtml = '';
        for (let i = 0; i < state.boxCount; i++) {
          const isActive = _currentBoxIndex === i;
          tabsHtml += `<button onclick="switchBox(${i})" style="padding:8px 12px; border-radius:10px; border:1px solid ${isActive ? 'var(--purple)' : 'rgba(255,255,255,0.1)'}; 
            background:${isActive ? 'rgba(199,125,255,0.2)' : 'rgba(255,255,255,0.05)'}; color:${isActive ? 'var(--purple-light)' : 'var(--gray)'}; 
            font-family:'Press Start 2P',monospace; font-size:7px; cursor:pointer; transition:all 0.2s;">
            CAJA ${i + 1}
          </button>`;
        }
        
        if (state.boxCount < 10) {
          const nextCost = getBoxBuyCost();
          tabsHtml += `<button onclick="buyNewBox()" title="Comprar nueva caja (₽${nextCost.toLocaleString()})" style="width:30px; height:30px; border-radius:50%; border:1px solid var(--green); 
            background:rgba(107,203,119,0.1); color:var(--green); font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; margin-left:4px;">
            +
          </button>`;
        }
        tabsContainer.innerHTML = tabsHtml;
      }

      // Disable release button if box is empty
      const btnRelease = document.getElementById('btn-box-release-mode');
      if (btnRelease) {
        const isEmpty = state.box.length === 0;
        btnRelease.disabled = isEmpty;
        btnRelease.style.opacity = isEmpty ? '0.5' : '1';
        btnRelease.style.cursor = isEmpty ? 'not-allowed' : 'pointer';
      }

      // Apply filters
      const isFiltered = _hasActiveFilters();
      
      // Determine which pokemon to show
      let displayList = [];
      if (isFiltered) {
        // If filtering, show all matches from all boxes
        displayList = state.box.map((p, i) => ({ p, i })).filter(({ p }) => _applyBoxFilters([p]).length > 0);
      } else {
        // If not filtering, show only current box
        const start = _currentBoxIndex * 50;
        const end = Math.min(start + 50, state.box.length);
        for (let i = start; i < end; i++) {
          displayList.push({ p: state.box[i], i: i });
        }
      }

      // Summary in filter header
      const summaryEl = document.getElementById('box-filter-summary');
      if (summaryEl) {
        if (isFiltered) {
          summaryEl.textContent = `${displayList.length} resultado${displayList.length !== 1 ? 's' : ''}`;
          summaryEl.style.color = 'var(--yellow)';
        } else { summaryEl.textContent = ''; }
      }

      // Results info bar
      if (resultsInfo) {
        if (isFiltered) {
          resultsInfo.textContent = `Mostrando ${displayList.length} de ${state.box.length} Pokémon`;
          resultsInfo.style.display = 'block';
        } else { resultsInfo.style.display = 'none'; }
      }

      if (state.box.length === 0) {
        grid.innerHTML = '<div class="empty-state"><span class="empty-icon">📦</span>La PC está vacía.<br>Los Pokémon capturados con el equipo lleno van aquí.</div>';
        return;
      }

      if (displayList.length === 0) {
        const emptyMsg = isFiltered ? 'Ningún Pokémon cumple los filtros activos.' : `La Caja ${_currentBoxIndex + 1} está vacía.`;
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:32px;text-align:center;">
          <span class="empty-icon" style="font-size:48px;display:block;margin-bottom:12px;">${isFiltered ? '🔍' : '📦'}</span>
          <div style="font-size:12px;color:var(--gray);">${emptyMsg}</div>
          ${isFiltered ? '<button onclick="resetBoxFilters()" style="margin-top:12px;padding:8px 16px;border:none;border-radius:10px;cursor:pointer;background:rgba(255,255,255,0.08);color:var(--gray);font-size:11px;">↺ Limpiar filtros</button>' : ''}
        </div>`;
        return;
      }

      grid.innerHTML = displayList.map(({ p, i }) => {
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

        const selected = _boxReleaseMode ? _boxReleaseSelected.has(i) : _boxRocketSelected.has(i);
        const isSelectionMode = _boxReleaseMode || _boxRocketMode;
        const selClass = isSelectionMode ? (selected ? 'release-selected' : 'release-selectable') : '';
        const checkMark = isSelectionMode && selected ? '<div class="release-check">✓</div>' : '';
        const onclickFn = _boxReleaseMode ? `toggleBoxReleaseSelect(${i})` : (_boxRocketMode ? `toggleBoxRocketSelect(${i})` : `openBoxPokemonMenu(${i})`);

        return `<div onclick="${onclickFn}" class="${selClass}" style="background:rgba(255,255,255,0.04);border:1px solid ${p.onMission ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.08)'};
      border-radius:12px;padding:10px 8px;text-align:center;cursor:pointer;transition:all .2s;position:relative;${p.onMission ? 'opacity:0.75;' : ''}"
      ${isSelectionMode ? '' : `onmouseover="this.style.borderColor='${p.onMission ? 'rgba(251,191,36,0.7)' : 'rgba(199,125,255,0.4)'}'" onmouseout="this.style.borderColor='${p.onMission ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.08)'}'"` }>
      <!-- Selection checkmark -->
      ${checkMark}
      <!-- Mission badge -->
      ${p.onMission ? `<div style="position:absolute;inset:0;border-radius:12px;background:rgba(251,191,36,0.07);pointer-events:none;z-index:1;"></div>
        <div style="position:absolute;top:5px;left:5px;background:#fbbf24;color:#000;border-radius:6px;font-size:7px;font-weight:bold;padding:2px 5px;z-index:3;letter-spacing:0.5px;">📋 MISIÓN</div>` : ''}
      <!-- Daycare badge -->
      ${p.inDaycare ? `<div style="position:absolute;inset:0;border-radius:12px;background:rgba(59,130,246,0.07);pointer-events:none;z-index:1;"></div>
        <div style="position:absolute;top:30px;left:5px;background:#3b82f6;color:#fff;border-radius:6px;font-size:7px;font-weight:bold;padding:2px 5px;z-index:3;letter-spacing:0.5px;">🏡 GUARDERÍA</div>` : ''}
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
      <div style="font-size:11px;color:var(--gray);">Nv.${p.level} · ${p.nature} · ${p.ability} · ⚡${p.vigor || 0}</div>
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
    ${state.playerClass === 'rocket' ? `<button onclick="document.getElementById('box-menu-overlay').remove();sellPokemonBlackMarket(state.box[${boxIndex}], ${boxIndex})" style="width:100%;margin-top:8px;padding:10px;border:none;border-radius:10px;cursor:pointer;background:rgba(239,68,68,0.15);color:#ef4444;font-size:12px;font-weight:700;border:1px solid rgba(239,68,68,0.3);box-shadow: 0 0 10px rgba(239,68,68,0.2);">🚀 Vender en Mercado Negro</button>` : ''}
    ${state.playerClass === 'criador' ? `<button onclick="document.getElementById('box-menu-overlay').remove();showGeneticAnalysis(state.box[${boxIndex}])" style="width:100%;margin-top:8px;padding:10px;border:none;border-radius:10px;cursor:pointer;background:rgba(168,85,247,0.15);color:#a855f7;font-size:12px;font-weight:700;border:1px solid rgba(168,85,247,0.3);">🔬 Análisis Genético</button>` : ''}
    <button onclick="releaseFromBox(${boxIndex})" style="width:100%;margin-top:8px;padding:10px;border:none;border-radius:10px;cursor:pointer;
      background:rgba(255,59,59,0.15);color:var(--red);${p.inDaycare ? 'opacity:0.5;cursor:not-allowed;' : ''}font-size:12px;font-weight:700;border:1px solid rgba(255,59,59,0.2);">
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
      showPokemonDetails(state.box[boxIndex], boxIndex, 'box');
    }

    function moveBoxToTeam(boxIndex) {
      document.getElementById('box-menu-overlay')?.remove();
      if (!state.box) state.box = [];
      if (state.team.length >= 6) { notify('Tu equipo está lleno (máx. 6).', '⚠️'); return; }
      const boxPoke = state.box[boxIndex];
      if (boxPoke?.onMission) { notify(`¡${boxPoke.name} está en una misión idle! Cobrá la recompensa primero.`, '📋'); return; }
      if (boxPoke?.inDaycare) { notify(`¡${boxPoke.name} está en la Guardería! Retiralo primero.`, '🏡'); return; }
      state.box.splice(boxIndex, 1);
      state.team.push(boxPoke);
      renderBox();
      renderTeam();
      scheduleSave();
      notify(`¡${boxPoke.name} se unió a tu equipo!`, '➕');
    }
    function swapBoxWithTeam(boxIndex, teamIndex) {
      document.getElementById('box-menu-overlay')?.remove();
      const boxPoke = state.box[boxIndex];
      if (boxPoke?.onMission) { notify(`¡${boxPoke.name} está en una misión idle! No se puede intercambiar.`, '📋'); return; }
      if (boxPoke?.inDaycare) { notify(`¡${boxPoke.name} está en la Guardería! No se puede intercambiar.`, '🏡'); return; }
      state.box.splice(boxIndex, 1);
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
      if (p?.onMission) { notify(`¡${p.name} está en una misión idle! No se puede soltar.`, '📋'); return; }
      if (p?.inDaycare) { notify(`¡${p.name} está en la Guardería! No se puede soltar.`, '🏡'); return; }
      if (!confirm(`¿Soltar a ${p.name} definitivamente?`)) return;
      document.getElementById('box-menu-overlay')?.remove();
      state.box.splice(boxIndex, 1);
      renderBox();
      scheduleSave();
      notify(`${p.name} fue liberado.`, '🌿');
    }

    // ===== BAG SYSTEM =====
    function toggleBagSellMode() {
      _bagSellMode = !_bagSellMode;
      _bagSellSelected = {};

      const btnSellMode = document.getElementById('btn-bag-sell-mode');
      const btnConfirm = document.getElementById('btn-bag-confirm-sell');
      const btnCancel = document.getElementById('btn-bag-cancel-sell');
      const hintSell = document.getElementById('bag-sell-hint');

      if (btnSellMode) btnSellMode.style.display = _bagSellMode ? 'none' : 'inline-block';
      if (btnConfirm) btnConfirm.style.display = _bagSellMode ? 'inline-block' : 'none';
      if (btnCancel) btnCancel.style.display = _bagSellMode ? 'inline-block' : 'none';
      if (hintSell) hintSell.style.display = _bagSellMode ? 'block' : 'none';

      renderBag();
    }

    function toggleBagSellSelect(itemName, maxQty) {
      if (_bagSellSelected[itemName]) {
        delete _bagSellSelected[itemName];
      } else {
        _bagSellSelected[itemName] = maxQty;
      }
      renderBag();
    }

    function updateBagSellQty(itemName, qty, maxQty) {
      qty = parseInt(qty);
      if (isNaN(qty) || qty < 1) qty = 1;
      if (qty > maxQty) qty = maxQty;
      _bagSellSelected[itemName] = qty;
      
      // Update total gain display if we add one later, for now just re-render or update label
      const confirmBtn = document.getElementById('btn-bag-confirm-sell');
      if (confirmBtn) {
        let totalGain = 0;
        Object.entries(_bagSellSelected).forEach(([name, q]) => {
          const itemInfo = SHOP_ITEMS.find(i => i.name === name);
          if (itemInfo) totalGain += Math.floor(itemInfo.price * 0.5) * q;
        });
        confirmBtn.textContent = totalGain > 0 ? `✅ VENDER (₽${totalGain.toLocaleString()})` : '✅ VENDER SELECCIÓN';
      }
    }

    function confirmBagSell() {
      const selectedEntries = Object.entries(_bagSellSelected);
      if (selectedEntries.length === 0) {
        notify('No seleccionaste ningún objeto para vender.', '❓');
        return;
      }

      let totalGain = 0;
      let summary = [];
      selectedEntries.forEach(([name, qty]) => {
        const itemInfo = SHOP_ITEMS.find(i => i.name === name);
        if (itemInfo) {
          const price = Math.floor(itemInfo.price * 0.5);
          totalGain += price * qty;
          summary.push(`${name} x${qty}`);
        }
      });

      if (!confirm(`¿Vender los siguientes objetos por ₽${totalGain.toLocaleString()}?\n\n${summary.join('\n')}`)) return;

      selectedEntries.forEach(([name, qty]) => {
        state.inventory[name] -= qty;
        if (state.inventory[name] <= 0) delete state.inventory[name];
      });

      state.money += totalGain;
      notify(`¡Vendiste objetos por ₽${totalGain.toLocaleString()}!`, '💰');
      
      _bagSellMode = false;
      toggleBagSellMode(); // This will reset and re-render
      updateHud();
      if (typeof scheduleSave === 'function') scheduleSave();
    }

    function renderBag(category = 'all') {
      const grid = document.getElementById('bag-grid');
      const empty = document.getElementById('bag-empty-warning');

      // Update tab active state
      document.querySelectorAll('#bag-tabs .market-tab-btn').forEach(btn => btn.classList.remove('active'));
      const activeTab = document.getElementById(`bag-tab-${category}`);
      if (activeTab) activeTab.classList.add('active');

      const searchInput = document.getElementById('bag-search-input');
      const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';

      const allItems = Object.entries(state.inventory || {}).filter(([name, qty]) => {
        if (qty <= 0) return false;
        if (searchQuery && !name.toLowerCase().includes(searchQuery)) return false;
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
        const isStone = itemInfo?.type === 'stone';
        const isUsable = !!HEALING_ITEMS[name] || isStone;
        const canSell = itemInfo && (itemInfo.market !== false || (itemInfo.price && itemInfo.price > 0));

        const tierCls = tierColors[tier];
        const typeTag = `<span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:8px;background:${typeTagColors[type] || '#666'}22;color:${typeTagColors[type] || '#aaa'};border:1px solid ${typeTagColors[type] || '#666'}44;">${typeTagLabels[type] || type}</span>`;

        const iconHtml = sprite 
          ? `<img src="${sprite}" width="40" height="40" style="image-rendering:pixelated;" onerror="this.style.display='none'">`
          : `<span style="font-size:32px">${icon}</span>`;

        if (_bagSellMode) {
          const isSelected = !!_bagSellSelected[name];
          const sellQty = _bagSellSelected[name] || qty;
          const sellPrice = itemInfo ? Math.floor(itemInfo.price * 0.5) : 0;
          
          return `<div class="market-card ${isSelected ? 'selected' : ''}" 
            style="${!canSell ? 'opacity:0.5; filter:grayscale(1);' : 'cursor:pointer;'} ${isSelected ? 'border:2px solid #4caf50; background:rgba(76,175,80,0.05);' : ''}"
            onclick="${canSell ? `toggleBagSellSelect('${name}', ${qty})` : ''}">
            <span class="market-tier-badge ${tierCls}">${tierLabels[tier]}</span>
            <div class="market-item-icon" style="margin-bottom:8px;">${iconHtml}</div>
            <div class="market-item-name" style="font-size:12px;margin-bottom:4px;">${name}</div>
            <div style="font-size:10px;color:var(--gray);margin-bottom:10px;">Posees: ${qty}</div>
            
            ${isSelected ? `
              <div style="margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1);" onclick="event.stopPropagation()">
                <div style="font-size:9px; color:var(--gray); margin-bottom:6px;">Cantidad a vender:</div>
                <div style="display:flex; align-items:center; gap:8px; justify-content:center;">
                  <button onclick="updateBagSellQty('${name}', ${_bagSellSelected[name] - 1}, ${qty})" style="width:24px;height:24px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);color:white;cursor:pointer;">-</button>
                  <input type="number" value="${sellQty}" min="1" max="${qty}" 
                    onchange="updateBagSellQty('${name}', this.value, ${qty})"
                    style="width:40px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:white; text-align:center; font-size:11px; padding:2px;">
                  <button onclick="updateBagSellQty('${name}', ${_bagSellSelected[name] + 1}, ${qty})" style="width:24px;height:24px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);color:white;cursor:pointer;">+</button>
                </div>
                <div style="font-size:10px; color:var(--yellow); margin-top:8px; font-weight:700;">+₽${(sellPrice * sellQty).toLocaleString()}</div>
              </div>
            ` : `<div style="font-size:10px; color:var(--gray);">Precio venta: ₽${sellPrice.toLocaleString()}</div>`}
          </div>`;
        }

        return `<div class="market-card" style="cursor:default;">
          <span class="market-tier-badge ${tierCls}">${tierLabels[tier]}</span>
          <div class="market-item-icon" style="margin-bottom:8px;">${iconHtml}</div>
          <div class="market-item-name" style="font-size:12px;margin-bottom:4px;">${name}</div>
          <div style="margin-bottom:8px;">${typeTag}</div>
          <div style="font-size:10px;color:var(--gray);margin-bottom:10px;line-height:1.4;min-height:28px;">${desc}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:10px;border-top:1px solid rgba(255,255,255,0.05);">
            <span style="font-size:11px;font-weight:700;color:var(--purple-light);">x${qty}</span>
            ${isUsable ? `<button onclick="${isStone ? `openBagStoneMenu('${name}')` : `openBagItemMenu('${name}')`}" style="padding:6px 12px;border:none;border-radius:8px;background:${isStone ? 'rgba(255,217,61,0.2);color:var(--yellow);border:1px solid rgba(255,217,61,0.3)' : 'var(--purple);color:white'};font-size:10px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(199,125,255,0.3);">USAR</button>` : ''}
          </div>
        </div>`;
      }).join('');
    }
