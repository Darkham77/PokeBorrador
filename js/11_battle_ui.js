    // ===== BATTLE BAG =====
    const HEALING_ITEMS = {
      'Poción': p => { if (p.hp === p.maxHp) return null; const h = Math.min(p.maxHp, p.hp + 20); const g = h - p.hp; p.hp = h; return `restauró 20 HP (ahora ${p.hp}/${p.maxHp})`; },
      'Super Poción': p => { if (p.hp === p.maxHp) return null; const h = Math.min(p.maxHp, p.hp + 50); const g = h - p.hp; p.hp = h; return `restauró 50 HP`; },
      'Hiper Poción': p => { if (p.hp === p.maxHp) return null; const h = Math.min(p.maxHp, p.hp + 200); const g = h - p.hp; p.hp = h; return `restauró 200 HP`; },
      'Poción Máxima': p => { if (p.hp === p.maxHp) return null; p.hp = p.maxHp; return `restauró todo el HP`; },
      'Revivir': p => { if (p.hp > 0) return null; p.hp = Math.floor(p.maxHp / 2); return `fue revivido con ${p.hp} HP`; },
      'Caramelo Raro': p => {
        if (p.level >= 100) return null;
        const pending = levelUpPokemon(p);
        const lvResult = `subió al nivel ${p.level}`;
        if (pending && pending.length > 0) {
          const queue = pending.map(mv => ({ pokemon: p, move: mv }));
          setTimeout(() => processLearnMoveQueue(queue, () => {}), 300);
        }
        return lvResult;
      },
      'Revivir Máximo': p => { if (p.hp > 0) return null; p.hp = p.maxHp; return `fue revivido con HP máximo`; },
      'Antídoto': p => { if (p.status !== 'poison') return null; p.status = null; return `fue curado del veneno`; },
      'Cura Quemadura': p => { if (p.status !== 'burn') return null; p.status = null; return `fue curado de las quemaduras`; },
      'Despertar': p => { if (p.status !== 'sleep') return null; p.status = null; p.sleepTurns = 0; return `se despertó`; },
      'Cura Total': p => { if (!p.status && p.hp === p.maxHp) return null; p.hp = p.maxHp; p.status = null; p.sleepTurns = 0; return `fue curado completamente (Max HP + curado)`; },
      'Éter': p => { p.moves.forEach(m => { m.pp = Math.min(m.maxPP, m.pp + 10); }); return `recuperó PP`; },
      'Elixir Máximo': p => { p.moves.forEach(m => { m.pp = m.maxPP; }); return `recuperó todos los PP`; },
      'Vitamina HP': p => { const gain = Math.max(5, Math.floor(p.maxHp * 0.05)); p.maxHp += gain; p.hp += gain; return `aumentó sus PS en ${gain}`; },
      'Proteína': p => { const gain = Math.max(3, Math.floor((p.atk||50) * 0.08)); p.atk = (p.atk||50) + gain; return `aumentó su Ataque en ${gain}`; },
      'Hierro': p => { const gain = Math.max(3, Math.floor((p.def||50) * 0.08)); p.def = (p.def||50) + gain; return `aumentó su Defensa en ${gain}`; },
      'Subida PP': p => { const m = p.moves && p.moves.find(mv => mv.maxPP && mv.maxPP < 99); if (!m) return null; const b = Math.max(1, Math.floor(m.maxPP * 0.2)); m.maxPP += b; m.pp = Math.min(m.pp + b, m.maxPP); return `aumentó los PP de ${m.name} en ${b}`; },
      'MT Retribución': p => { if (p.moves && p.moves.find(m => m.name === 'Retribución')) return null; if (!p.moves) p.moves = []; if (p.moves.length >= 4) p.moves.shift(); p.moves.push({ name: 'Retribución', pp: 20, maxPP: 20 }); return `aprendió Retribución`; },
      'MT Terremoto': p => { if (p.moves && p.moves.find(m => m.name === 'Terremoto')) return null; if (!p.moves) p.moves = []; if (p.moves.length >= 4) p.moves.shift(); p.moves.push({ name: 'Terremoto', pp: 10, maxPP: 10 }); return `aprendió Terremoto`; },
      'MT Ventisca': p => { if (p.moves && p.moves.find(m => m.name === 'Ventisca')) return null; if (!p.moves) p.moves = []; if (p.moves.length >= 4) p.moves.shift(); p.moves.push({ name: 'Ventisca', pp: 5, maxPP: 5 }); return `aprendió Ventisca`; },
      'Recordador de Movimientos': p => {
        if (state.battle) return null; // Restricción: No usar en combate
        const ls = (typeof POKEMON_DB !== 'undefined' && POKEMON_DB[p.id] && POKEMON_DB[p.id].learnset) || [];
        const known = new Set((p.moves || []).map(m => m.name));
        const forgotten = ls.filter(l => l.lv <= p.level && !known.has(l.name));
        
        if (!forgotten.length) return null;
        
        // Abrir interfaz de selección profesional
        setTimeout(() => openMoveRelearnerMenu(p, forgotten), 100);
        return 'está recordando sus raíces...';
      },
      'Repelente': _ => { state.repelSecs = (state.repelSecs || 0) + 10 * 60; return `activó el Repelente (10 min)`; },
      'Superrepelente': _ => { state.repelSecs = (state.repelSecs || 0) + 20 * 60; return `activó el Superrepelente (20 min)`; },
      'Máximo Repelente': _ => { state.repelSecs = (state.repelSecs || 0) + 30 * 60; return `activó el Máximo Repelente (30 min)`; },
      'Ticket Shiny': _ => { state.shinyBoostSecs = (state.shinyBoostSecs || 0) + 30 * 60; return `activó el Ticket Shiny (30 min)`; },
      'Moneda Amuleto': _ => { state.amuletCoinSecs = (state.amuletCoinSecs || 0) + 30 * 60; return `activó la Moneda Amuleto (30 min)`; },
    };

    function showBattleBag() {
      if (_battleLock) return;
      const b = state.battle;
      const usable = Object.entries(state.inventory || {})
        .filter(([name, qty]) => qty > 0 && HEALING_ITEMS[name]);

      // Build overlay
      let html = `<div style="font-family:'Press Start 2P',monospace;font-size:9px;color:var(--yellow);margin-bottom:14px;">🎒 MOCHILA</div>`;
      if (!usable.length) {
        html += `<div style="color:var(--gray);font-size:12px;">No tenés objetos curables.</div>`;
      } else {
        html += usable.map(([name, qty]) =>
          `<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);
        border-radius:10px;padding:10px 14px;margin-bottom:8px;">
        <div>
          <div style="font-size:13px;font-weight:700;">${name}</div>
          <div style="font-size:10px;color:var(--gray);">x${qty}</div>
        </div>
        <button onclick="showBattleItemTarget('${name}')" style="font-family:'Press Start 2P',monospace;font-size:8px;
          padding:8px 12px;border:none;border-radius:8px;cursor:pointer;
          background:rgba(107,203,119,0.2);color:var(--green);border:1px solid rgba(107,203,119,0.3);">
          USAR
        </button>
      </div>`
        ).join('');
      }

      showBattleOverlay(html);
    }

    function showBattleItemTarget(itemName) {
      const b = state.battle;
      let html = `<div style="font-family:'Press Start 2P',monospace;font-size:9px;color:var(--yellow);margin-bottom:14px;">
        💊 USAR ${itemName.toUpperCase()}
      </div>`;

      html += state.team.map((p, idx) => {
        const hpPct = Math.round(p.hp / p.maxHp * 100);
        const hpCol = hpPct > 50 ? 'var(--green)' : hpPct > 20 ? 'var(--yellow)' : 'var(--red)';
        const isCurrent = idx === b.playerTeamIndex;
        
        return `<div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.05);
          border-radius:12px;padding:10px;margin-bottom:8px;${isCurrent ? 'border:1px solid var(--yellow);' : ''}">
          <img src="${getSpriteUrl(p.id)}" width="40" height="40" style="image-rendering:pixelated;">
          <div style="flex:1;">
            <div style="font-weight:700;font-size:12px;">${p.name} ${isCurrent ? '<span style="color:var(--yellow);font-size:8px;">(EN BATTLE)</span>' : ''}</div>
            <div style="background:rgba(255,255,255,0.1);border-radius:4px;height:4px;margin-top:4px;overflow:hidden;">
              <div style="width:${hpPct}%;height:100%;background:${hpCol};"></div>
            </div>
            <div style="font-size:9px;color:${hpCol};margin-top:2px;">${p.hp}/${p.maxHp} HP ${p.status ? `<span style="margin-left:5px;">${statusIcon(p.status)}</span>` : ''}</div>
          </div>
          <button onclick="useBagItem('${itemName}', ${idx})" style="font-family:'Press Start 2P',monospace;font-size:7px;
            padding:6px 10px;border:none;border-radius:8px;cursor:pointer;
            background:rgba(107,203,119,0.2);color:var(--green);border:1px solid rgba(107,203,119,0.3);">
            ELEGIR
          </button>
        </div>`;
      }).join('');

      html += `<button onclick="showBattleBag()" style="margin-top:8px;width:100%;padding:10px;border:none;border-radius:10px;
        background:rgba(255,255,255,0.06);color:var(--gray);cursor:pointer;font-size:12px;">Volver</button>`;

      showBattleOverlay(html, false);
    }

    function useBagItem(itemName, teamIndex) {
      const b = state.battle;
      const fn = HEALING_ITEMS[itemName];
      if (!fn || !state.inventory[itemName]) return;

      const target = state.team[teamIndex];
      if (!target) return;

      const result = fn(target);
      if (result === null) { notify('No se puede usar en este momento.', '⚠️'); return; }

      state.inventory[itemName]--;
      if (!state.inventory[itemName]) delete state.inventory[itemName];

      // If target is the active pokemon, sync battle object
      if (teamIndex === b.playerTeamIndex) {
        b.player.hp = target.hp;
        b.player.status = target.status;
        if (target.moves) b.player.moves = JSON.parse(JSON.stringify(target.moves));
        updateBattleUI();
      }

      closeBattleOverlay();
      setLog(`Usaste ${itemName}. ¡${target.name} ${result}!`, 'log-catch');

      // Item use costs a turn — enemy attacks
      _battleLock = true;
      setBtns(false);
      setTimeout(() => enemyTurn(), 800);
    }

    function openTeamItemMenu(teamIndex) {
      _openItemMenuFor('team', teamIndex);
    }

    function openBoxItemMenu(boxIndex) {
      document.getElementById('box-menu-overlay')?.remove();
      _openItemMenuFor('box', boxIndex);
    }

    function _openItemMenuFor(context, index) {
      const p = context === 'team' ? state.team[index] : state.box[index];
      if (!p) return;

      const items = Object.entries(state.inventory || {})
        .filter(([name, qty]) => qty > 0);

      const usable = items.filter(([name]) => HEALING_ITEMS[name]);
      const equippable = items.filter(([name]) => {
        const item = SHOP_ITEMS.find(i => i.name === name);
        return item && item.type === 'held';
      });

      const ov = document.createElement('div');
      ov.id = 'outside-item-overlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:16px;';

      let html = `<div style="background:var(--card);border-radius:20px;padding:24px;width:100%;max-width:340px;text-align:left;">`;
      html += `<div style="font-family:'Press Start 2P',monospace;font-size:9px;color:var(--yellow);margin-bottom:14px;">🎒 MOCHILA PARA ${p.name.toUpperCase()}</div>`;

      // Currently equipped item
      if (p.heldItem) {
        const h = SHOP_ITEMS.find(i => i.name === p.heldItem);
        html += `<div style="background:rgba(199,125,255,0.1);border:1px solid rgba(199,125,255,0.3);border-radius:12px;padding:12px;margin-bottom:20px;">
          <div style="font-size:8px;color:var(--purple);margin-bottom:8px;font-family:'Press Start 2P',monospace;">
            EQUIPADO ACTUALMENTE
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="font-weight:700;">${h.icon} ${p.heldItem}</div>
            <button onclick="unEquipItem('${context}', ${index})"
              style="background:rgba(255,59,59,0.2);color:var(--red);border:none;border-radius:8px;padding:6px 10px;font-size:10px;cursor:pointer;">
              QUITAR
            </button>
          </div>
        </div>`;
      }

      // Usable items
      if (usable.length) {
        html += `<div style="font-size:8px;color:var(--green);margin-bottom:8px;font-family:'Press Start 2P',monospace;">OBJETOS USABLES</div>`;
        html += usable.map(([name, qty]) => {
          const item = SHOP_ITEMS.find(i => i.name === name);
          return `<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);border-radius:10px;padding:10px;margin-bottom:6px;">
            <div>
              <div style="font-weight:700;">${item.icon} ${name}</div>
              <div style="font-size:10px;color:var(--gray);">x${qty}</div>
            </div>
            <button onclick="applyOutsideItem('${name}', '${context}', ${index})"
              style="background:rgba(107,203,119,0.2);color:var(--green);border:none;border-radius:8px;padding:6px 10px;font-size:10px;cursor:pointer;">
              USAR
            </button>
          </div>`;
        }).join('');
      }

      // Equippable items
      if (equippable.length) {
        html += `<div style="font-size:8px;color:var(--blue);margin:16px 0 8px;font-family:'Press Start 2P',monospace;">OBJETOS EQUIPABLES</div>`;
        html += equippable.map(([name, qty]) => {
          const item = SHOP_ITEMS.find(i => i.name === name);
          return `<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);border-radius:10px;padding:10px;margin-bottom:6px;">
            <div>
              <div style="font-weight:700;">${item.icon} ${name}</div>
              <div style="font-size:10px;color:var(--gray);">x${qty}</div>
            </div>
            <button onclick="equipItem('${context}', ${index}, '${name}')"
              style="background:rgba(59,139,255,0.2);color:var(--blue);border:none;border-radius:8px;padding:6px 10px;font-size:10px;cursor:pointer;">
              EQUIPAR
            </button>
          </div>`;
        }).join('');
      }

      html += `<button onclick="document.getElementById('outside-item-overlay').remove()"
        style="width:100%;margin-top:20px;padding:12px;border:none;border-radius:10px;cursor:pointer;background:rgba(255,255,255,0.06);color:var(--gray);font-size:12px;">
        Cerrar
      </button></div>`;

      ov.innerHTML = html;
      ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
      document.body.appendChild(ov);
    }

    function applyOutsideItem(itemName, context, index) {
      const p = context === 'team' ? state.team[index] : state.box[index];
      if (!p) return;

      const fn = HEALING_ITEMS[itemName];
      if (!fn) return;

      const result = fn(p);
      if (result === null) { notify('No tiene ningún efecto.', '⚠️'); return; }

      state.inventory[itemName]--;
      if (!state.inventory[itemName]) delete state.inventory[itemName];

      document.getElementById('outside-item-overlay')?.remove();
      notify(`Usaste ${itemName}. ¡${p.name} ${result}!`, '✨');

      if (context === 'team') renderTeam();
      else renderBox();
      scheduleSave();
    }

    function equipItem(context, index, itemName) {
      const p = context === 'team' ? state.team[index] : state.box[index];
      if (!p) return;
      // Unequip old item if any
      if (p.heldItem) {
        state.inventory[p.heldItem] = (state.inventory[p.heldItem] || 0) + 1;
      }
      p.heldItem = itemName;
      state.inventory[itemName]--;
      if (!state.inventory[itemName]) delete state.inventory[itemName];
      document.getElementById('outside-item-overlay')?.remove();
      notify(`${p.name} ahora lleva ${itemName}.`, '🎒');
      if (context === 'team') renderTeam();
      else renderBox();
      scheduleSave();
    }

    function unEquipItem(context, index) {
      const p = context === 'team' ? state.team[index] : state.box[index];
      if (!p || !p.heldItem) return;
      const oldItem = p.heldItem;
      state.inventory[oldItem] = (state.inventory[oldItem] || 0) + 1;
      p.heldItem = null;
      document.getElementById('outside-item-overlay')?.remove();
      notify(`${oldItem} fue guardado en la mochila.`, '🎒');
      if (context === 'team') renderTeam();
      else renderBox();
      scheduleSave();
    }

    // ===== POKEMON TAGS =====
    function togglePokeTag(context, index, tag) {
      const p = context === 'team' ? state.team[index] : state.box[index];
      if (!p) return;
      if (!p.tags) p.tags = [];
      if (p.tags.includes(tag)) {
        p.tags = p.tags.filter(t => t !== tag);
      } else {
        p.tags.push(tag);
      }
      // Re-render menus if open
      if (document.getElementById('team-menu-overlay')) openTeamMenu(index);
      if (document.getElementById('box-menu-overlay')) openBoxPokemonMenu(index);
      if (document.getElementById('box-detail-overlay')) openBoxPokemonDetail(index);
      // Re-render main views
      if (context === 'team') renderTeam();
      else renderBox();
      scheduleSave();
    }

    // ===== MOVE LEARNING & RELEARNING =====
    let _learnMoveQueue = [];

    function processLearnMoveQueue(queue, onComplete) {
      _learnMoveQueue = queue;
      const next = _learnMoveQueue.shift();
      if (!next) { if (onComplete) onComplete(); return; }

      const { pokemon, move } = next;
      if (pokemon.moves.length < 4) {
        pokemon.moves.push({ name: move.name, pp: move.pp, maxPP: move.pp });
        notify(`${pokemon.name} aprendió ${move.name}.`, '✨');
        if (typeof renderTeam === 'function') renderTeam();
        processLearnMoveQueue(_learnMoveQueue, onComplete);
      } else {
        showLearnMoveMenu(pokemon, move, () => {
          processLearnMoveQueue(_learnMoveQueue, onComplete);
        });
      }
    }

    function showLearnMoveMenu(pokemon, newMove, onComplete) {
      const ov = document.createElement('div');
      ov.id = 'learn-move-overlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;padding:20px;';

      let html = `<div style="background:var(--card);border-radius:20px;padding:24px;width:100%;max-width:380px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:var(--yellow);margin-bottom:10px;">APRENDER MOVIMIENTO</div>
        <div style="font-size:13px;margin-bottom:16px;">${pokemon.name} quiere aprender <b>${newMove.name}</b>, pero ya sabe 4 movimientos. ¿Olvidar alguno?</div>
        <div style="display:flex;flex-direction:column;gap:8px;">`;

      pokemon.moves.forEach((m, i) => {
        html += `<button onclick="replaceMove(${pokemon.uid}, ${i}, '${newMove.name}', ${newMove.pp})"
          style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:12px;color:#fff;cursor:pointer;text-align:left;">
          <div>
            <div style="font-weight:700;">${m.name}</div>
            <div style="font-size:10px;color:var(--gray);">PP ${m.pp}/${m.maxPP}</div>
          </div>
          <span style="font-size:10px;color:var(--red);">OLVIDAR</span>
        </button>`;
      });

      html += `</div>
        <button onclick="skipLearnMove('${newMove.name}', onComplete)"
          style="margin-top:16px;width:100%;padding:12px;background:rgba(255,59,59,0.2);color:var(--red);border:none;border-radius:12px;cursor:pointer;font-weight:700;">
          No aprender ${newMove.name}
        </button>
      </div>`;

      ov.innerHTML = html.replace('onComplete', `() => { document.getElementById('learn-move-overlay').remove(); ${onComplete.toString()}() }`);
      document.body.appendChild(ov);
    }

    function replaceMove(pokemonUid, moveIndex, newMoveName, newMovePP) {
      const p = state.team.find(pk => pk.uid === pokemonUid) || state.box.find(pk => pk.uid === pokemonUid);
      if (!p) return;
      const oldMove = p.moves[moveIndex];
      p.moves[moveIndex] = { name: newMoveName, pp: newMovePP, maxPP: newMovePP };
      document.getElementById('learn-move-overlay').remove();
      notify(`${p.name} olvidó ${oldMove.name} y aprendió ${newMoveName}.`, '✨');
      if (typeof renderTeam === 'function') renderTeam();
      if (typeof renderBox === 'function') renderBox();
    }

    function skipLearnMove(moveName, onComplete) {
      document.getElementById('learn-move-overlay').remove();
      notify(`No se aprendió ${moveName}.`, '❌');
      onComplete();
    }

    function openMoveRelearnerMenu(pokemon, forgottenMoves) {
      const ov = document.createElement('div');
      ov.id = 'move-relearner-overlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);';
      
      let html = `<div style="background:var(--card);border-radius:24px;padding:28px;width:100%;max-width:400px;border:2px solid var(--purple);box-shadow:0 0 30px rgba(155,77,255,0.3);">
        <div style="text-align:center;margin-bottom:20px;">
          <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:var(--purple);margin-bottom:10px;">RECORDADOR DE MOVIMIENTOS</div>
          <div style="font-size:14px;font-weight:700;color:#fff;">¿Qué movimiento debe recordar ${pokemon.name}?</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;max-height:300px;overflow-y:auto;padding-right:5px;" class="custom-scroll">`;

      forgottenMoves.forEach(mv => {
        html += `<button onclick="confirmRelearnMove('${pokemon.uid}', '${mv.name}', ${mv.pp})" 
          style="display:flex;justify-content:space-between;align-items:center;background:rgba(155,77,255,0.1);border:1px solid rgba(155,77,255,0.3);border-radius:12px;padding:12px 16px;color:#fff;cursor:pointer;transition:all 0.2s;"
          onmouseover="this.style.background='rgba(155,77,255,0.2)';this.style.transform='translateX(5px)'"
          onmouseout="this.style.background='rgba(155,77,255,0.1)';this.style.transform='translateX(0)'">
          <div style="text-align:left;">
            <div style="font-weight:700;font-size:13px;">${mv.name}</div>
            <div style="font-size:10px;color:var(--gray);">Nv. ${mv.lv || '—'}</div>
          </div>
          <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--purple);">PP ${mv.pp}/${mv.pp}</div>
        </button>`;
      });

      html += `</div>
        <button onclick="document.getElementById('move-relearner-overlay').remove()" 
          style="margin-top:20px;width:100%;padding:12px;background:rgba(255,255,255,0.05);color:var(--gray);border:none;border-radius:12px;cursor:pointer;font-weight:700;">
          CANCELAR
        </button>
      </div>`;

      ov.innerHTML = html;
      document.body.appendChild(ov);
    }

    function confirmRelearnMove(pokemonUid, moveName, movePP) {
      const p = state.team.find(pk => pk.uid === pokemonUid) || state.box.find(pk => pk.uid === pokemonUid);
      if (!p) return;

      document.getElementById('move-relearner-overlay').remove();

      // Efecto visual de "brillo" en la pantalla
      const flash = document.createElement('div');
      flash.style.cssText = 'position:fixed;inset:0;z-index:2000;background:#fff;opacity:0.8;pointer-events:none;transition:opacity 0.5s;';
      document.body.appendChild(flash);
      setTimeout(() => { flash.style.opacity = '0'; setTimeout(() => flash.remove(), 500); }, 50);

      if (p.moves.length < 4) {
        p.moves.push({ name: moveName, pp: movePP, maxPP: movePP });
        notify(`¡${p.name} ha recordado ${moveName.toUpperCase()}!`, '🧠');
        if (typeof renderTeam === 'function') renderTeam();
        if (typeof renderBox === 'function') renderBox();
      } else {
        // Si tiene 4 movimientos, usar la interfaz de aprendizaje existente para elegir cuál olvidar
        const newMove = { name: moveName, pp: movePP, maxPP: movePP };
        if (typeof showLearnMoveMenu === 'function') {
          showLearnMoveMenu(p, newMove, () => {
            notify(`¡${p.name} recordó ${moveName}!`, '✨');
            if (typeof renderTeam === 'function') renderTeam();
            if (typeof renderBox === 'function') renderBox();
          });
        } else {
          // Fallback si no existe la función (aunque debería estar en state.js)
          p.moves.shift();
          p.moves.push(newMove);
          notify(`¡${p.name} recordó ${moveName}!`, '✨');
        }
      }
      if (typeof scheduleSave === 'function') scheduleSave();
    }
