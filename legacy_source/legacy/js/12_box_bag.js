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

    /**
     * Helper to return a pokemon held item to the inventory.
     * To be used before releasing or sacrificing a pokemon.
     */
    window.returnHeldItem = function(p) {
      if (p && p.heldItem) {
        if (!state.inventory) state.inventory = {};
        state.inventory[p.heldItem] = (state.inventory[p.heldItem] || 0) + 1;
        const itemName = p.heldItem;
        p.heldItem = null;
        return itemName;
      }
      return null;
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
    let _boxSortMode = 'none'; // 'none', 'level', 'tier', 'type', 'pokedex'

    function toggleBoxFilters() {
      // Deactivated: UI handled by Vue (BoxView.vue)
    }

    function setBoxFilter(key, val) {
      _boxFilters[key] = val;
      // UI sync handled by Vue
      renderBox();
    }

    function setBoxSort(mode) {
      _boxSortMode = mode;
      // UI sync handled by Vue
      renderBox();
    }

    function resetBoxFilters() {
      _boxFilters = {
        tier: 'all', type: 'all', levelMin: 1, levelMax: 100,
        ivHP: 0, ivATK: 0, ivDEF: 0, ivSPA: 0, ivSPD: 0, ivSPE: 0,
        ivAny31: false, ivTotalMin: 0, ivTotalMax: 186,
        search: ''
      };
      _boxSortMode = 'none';
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
      // UI handled by Vue
      _boxReleaseMode = !_boxReleaseMode;
      _boxReleaseSelected.clear();
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
        const p = state.box[i];
        if (p) {
          releasedNames.push(p.name);
          returnHeldItem(p);
          state.box.splice(i, 1);
        }
      });


      _boxReleaseMode = false;
      toggleBoxReleaseMode();
      renderBox();
      scheduleSave();
      notify(`¡${releasedNames.join(', ')} ${releasedNames.length > 1 ? 'fueron soltados' : 'fue soltado'}!`, '🌿');
    }

    // ── Rocket Box Sell Mode ─────────────────────────────────────
    function toggleBoxRocketMode() {
      // UI handled by Vue
      if (state.playerClass !== 'rocket') return;
      _boxRocketMode = !_boxRocketMode;
      _boxRocketSelected.clear();
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
        const p = state.box[i];
        if (p) {
          returnHeldItem(p);
          state.box.splice(i, 1);
        }
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

    function openBoxTab() {
      if (!state.box) state.box = [];
      if (!state.boxCount) state.boxCount = 4;
      
      if (state.box.length > 0) {
        _currentBoxIndex = Math.min(Math.floor((state.box.length - 1) / 50), state.boxCount - 1);
      } else {
        _currentBoxIndex = 0;
      }
      renderBox();
    }

    function renderBox() {
      // UI now handled by Vue (BoxView.vue)
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
        onerror="this.style.display='none'">
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
        onerror="this.style.display='none'">
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
    <button onclick="document.getElementById('box-menu-overlay').remove();promptMoveToBox(${boxIndex})" style="width:100%;margin-top:8px;padding:10px;border:none;border-radius:10px;cursor:pointer;
      background:rgba(59,139,255,0.15);color:var(--blue);font-size:12px;font-weight:700;border:1px solid rgba(59,139,255,0.2);">
      📦 Mover a otra caja
    </button>
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

    function promptMoveToBox(boxIndex) {
      const p = state.box[boxIndex];
      if (!p) return;
      
      const targetBox = prompt(`¿A qué caja querés mover a ${p.name}? (1 a ${state.boxCount})`, (_currentBoxIndex + 1));
      if (targetBox === null) return;
      
      const boxNum = parseInt(targetBox);
      if (isNaN(boxNum) || boxNum < 1 || boxNum > state.boxCount) {
        notify('Número de caja inválido.', '⚠️');
        return;
      }
      
      movePokemonToBox(boxIndex, boxNum - 1);
    }

    function movePokemonToBox(boxIndex, targetBoxIndex) {
      const p = state.box[boxIndex];
      if (!p) return;
      
      const boxSize = 50;
      const targetStart = targetBoxIndex * boxSize;
      
      // Eliminar de la posición actual
      state.box.splice(boxIndex, 1);
      
      // Insertar al inicio de la caja destino
      state.box.splice(targetStart, 0, p);
      
      _currentBoxIndex = targetBoxIndex;
      renderBox();
      scheduleSave();
      notify(`¡${p.name} movido a la Caja ${targetBoxIndex + 1}!`, '📦');
    }

    function moveBoxToTeam(boxIndex) {
      document.getElementById('box-menu-overlay')?.remove();
      if (!state.box) state.box = [];
      if (state.team.length >= 6) { notify('Tu equipo está lleno (máx. 6).', '⚠️'); return; }
      const boxPoke = state.box[boxIndex];
      if (boxPoke?.onMission) { notify(`¡${boxPoke.name} está en una misión idle! Cobrá la recompensa primero.`, '📋'); return; }
      if (boxPoke?.inDaycare) { notify(`¡${boxPoke.name} está en la Guardería! Retiralo primero.`, '🏡'); return; }
      if (boxPoke?.onDefense) { notify(`¡${boxPoke.name} está defendiendo una ruta! Retiralo desde el panel de Guerra primero.`, '🛡️'); return; }
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
      if (boxPoke?.onDefense) { notify(`¡${boxPoke.name} está defendiendo una ruta! No se puede intercambiar.`, '🛡️'); return; }
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
      if (p?.onDefense) { notify(`¡${p.name} está defendiendo una ruta! No se puede soltar.`, '🛡️'); return; }
      if (!confirm(`¿Soltar a ${p.name} definitivamente?`)) return;
      document.getElementById('box-menu-overlay')?.remove();
      returnHeldItem(p);
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
      // MIGRACIÓN VUE: El renderizado de la mochila ahora es gestionado por BackpackView.vue.
      // Se desactiva la lógica de manipulación manual del DOM para evitar conflictos.
      /*
      const grid = document.getElementById('bag-grid');
      const empty = document.getElementById('bag-empty-warning');
      ...
      */
    }

