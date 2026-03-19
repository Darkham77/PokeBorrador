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
          <div style="font-size:8px;color:var(--purple);margin-bottom:8px;font-family:'Press Start 2P',monospace;">OBJETO EQUIPADO:</div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:24px;">${h ? h.icon : '📦'}</span>
              <div>
                <div style="font-size:13px;font-weight:700;">${p.heldItem}</div>
              </div>
            </div>
            <button onclick="unequipItem('${context}', ${index})" style="font-family:'Press Start 2P',monospace;font-size:8px;padding:8px 12px;border:none;border-radius:8px;cursor:pointer;background:rgba(255,100,100,0.2);color:#ff6464;border:1px solid rgba(255,100,100,0.3);">QUITAR</button>
          </div>
        </div>`;
      }

      if (!usable.length && !equippable.length) {
        html += `<div style="color:var(--gray);font-size:12px;">No tenés objetos utilizables o equipables.</div>`;
      } else {
        if (usable.length) {
          html += `<div style="font-size:9px;color:var(--gray);margin-bottom:8px;">ITEMS CURATIVOS:</div>`;
          html += usable.map(([name, qty]) =>
            `<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);border-radius:10px;padding:10px 14px;margin-bottom:8px;">
              <div>
                <div style="font-size:13px;font-weight:700;">${name}</div>
                <div style="font-size:10px;color:var(--gray);">x${qty}</div>
              </div>
              <button onclick="useItemOutsideBattle('${name}', '${context}', ${index})" style="font-family:'Press Start 2P',monospace;font-size:8px;padding:8px 12px;border:none;border-radius:8px;cursor:pointer;background:rgba(107,203,119,0.2);color:var(--green);border:1px solid rgba(107,203,119,0.3);">USAR</button>
            </div>`
          ).join('');
        }
        
        if (equippable.length) {
          html += `<div style="font-size:9px;color:var(--gray);margin-top:12px;margin-bottom:8px;">ITEMS EQUIPABLES:</div>`;
          html += equippable.map(([name, qty]) =>
            `<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);border-radius:10px;padding:10px 14px;margin-bottom:8px;">
              <div>
                <div style="font-size:13px;font-weight:700;">${name}</div>
                <div style="font-size:10px;color:var(--gray);">x${qty}</div>
              </div>
              <button onclick="equipItem('${name}', '${context}', ${index})" style="font-family:'Press Start 2P',monospace;font-size:8px;padding:8px 12px;border:none;border-radius:8px;cursor:pointer;background:rgba(59,139,255,0.2);color:var(--blue);border:1px solid rgba(59,139,255,0.3);">EQUIPAR</button>
            </div>`
          ).join('');
        }
      }

      html += `<button onclick="document.getElementById('outside-item-overlay').remove()" style="margin-top:14px;width:100%;padding:10px;border:none;border-radius:10px;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-size:13px;">Cerrar</button>`;
      html += `</div>`;

      ov.innerHTML = html;
      ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
      document.body.appendChild(ov);
    }

    function equipItem(itemName, context, index) {
      const p = context === 'team' ? state.team[index] : state.box[index];
      if (!p) return;

      if (p.heldItem) { unequipItem(context, index, true); }

      p.heldItem = itemName;
      state.inventory[itemName]--;
      if (state.inventory[itemName] <= 0) delete state.inventory[itemName];

      document.getElementById('outside-item-overlay')?.remove();
      notify(`¡${p.name} ahora lleva ${itemName}!`, '✨');
      
      if (context === 'team') renderTeam();
      else renderBox();
      if (currentTab === 'bag') renderBag();
      scheduleSave();
    }

    function unequipItem(context, index, silent = false) {
      const p = context === 'team' ? state.team[index] : state.box[index];
      if (!p || !p.heldItem) return;

      const item = p.heldItem;
      state.inventory[item] = (state.inventory[item] || 0) + 1;
      p.heldItem = null;

      if (!silent) {
        document.getElementById('outside-item-overlay')?.remove();
        notify(`Recuperaste ${item} de ${p.name}.`, '📥');
        if (context === 'team') renderTeam();
        else renderBox();
        if (currentTab === 'bag') renderBag();
        scheduleSave();
      }
    }

    function useItemOutsideBattle(itemName, context, index) {
      const p = context === 'team' ? state.team[index] : state.box[index];
      if (!p) return;

      const fn = HEALING_ITEMS[itemName];
      if (!fn || !state.inventory[itemName]) return;

      const result = fn(p);
      if (result === null) { notify('No hace efecto.', '⚠️'); return; }

      state.inventory[itemName]--;
      if (!state.inventory[itemName]) delete state.inventory[itemName];

      document.getElementById('outside-item-overlay')?.remove();
      notify(`Usaste ${itemName}. ¡${p.name} ${result}!`, '✨');

      if (context === 'team') renderTeam();
      if (currentTab === 'map') renderMaps();
      if (currentTab === 'bag') renderBag();
      scheduleSave();
    }

    // ===== BATTLE SWITCH =====
    function showBattleSwitch(forced = false) {
      if (_battleLock && !forced) return;
      const b = state.battle;
      const eligible = state.team.filter(p => p.name !== b.player.name && p.hp > 0);

      let html = `<div style="font-family:'Press Start 2P',monospace;font-size:9px;color:var(--purple);margin-bottom:14px;">
    🔄 ${forced ? '¡ELEGÍ UN POKÉMON!' : 'CAMBIAR POKÉMON'}
  </div>`;

      if (eligible.length === 0) {
        html += `<div style="color:var(--gray);font-size:12px;">No tenés otros Pokémon disponibles.</div>
      <button onclick="closeBattleOverlay()" style="margin-top:14px;width:100%;padding:10px;border:none;border-radius:10px;
        background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-size:13px;">Cerrar</button>`;
      } else {
        html += state.team.map((p, idx) => {
          if (idx === b.playerTeamIndex || p.hp <= 0) return ''; // No mostrar el actual o debilitados
          const hpPct = Math.round(p.hp / p.maxHp * 100);
          const hpCol = hpPct > 50 ? 'var(--green)' : hpPct > 20 ? 'var(--yellow)' : 'var(--red)';
          return `<div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.05);
        border-radius:12px;padding:12px;margin-bottom:8px;">
        <img src="${getSpriteUrl(p.id)}"
          width="48" height="48" style="image-rendering:pixelated;"
          onerror="this.style.display='none'">
        <div style="flex:1;">
          <div style="font-weight:700;font-size:13px;">${p.name}</div>
          <div style="font-size:10px;color:var(--gray);">Nv.${p.level}</div>
          <div style="background:rgba(255,255,255,0.1);border-radius:4px;height:5px;margin-top:4px;overflow:hidden;">
            <div style="width:${hpPct}%;height:100%;background:${hpCol};border-radius:4px;"></div>
          </div>
          <div style="font-size:10px;color:${hpCol};margin-top:2px;">${p.hp}/${p.maxHp} HP</div>
        </div>
        <button onclick="switchBattlePokemonByIndex(${idx},${forced})" style="font-family:'Press Start 2P',monospace;font-size:8px;
          padding:8px 10px;border:none;border-radius:8px;cursor:pointer;
          background:rgba(199,125,255,0.2);color:var(--purple);border:1px solid rgba(199,125,255,0.3);">
          ¡IR!
        </button>
      </div>`;
        }).join('');
      }
      if (!forced) html += `<button onclick="closeBattleOverlay()" style="margin-top:8px;width:100%;padding:10px;border:none;border-radius:10px;
    background:rgba(255,255,255,0.06);color:var(--gray);cursor:pointer;font-size:12px;">Cancelar</button>`;

      // Para el forced switch usamos un overlay fijo en body para no interferir con battle-screen
      if (forced) {
        // Eliminar overlay anterior si existe
        document.getElementById('forced-switch-overlay')?.remove();
        const ov = document.createElement('div');
        ov.id = 'forced-switch-overlay';
        ov.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.88);display:flex;align-items:flex-end;justify-content:center;padding:16px;';
        ov.innerHTML = `<div style="background:var(--card);border-radius:20px;padding:20px;width:100%;max-width:400px;max-height:70vh;overflow-y:auto;">${html}</div>`;
        document.body.appendChild(ov);
      } else {
        showBattleOverlay(html, false);
      }
    }


    function switchBattlePokemonByIndex(teamIndex, forced) {
      const b = state.battle;
      const teamRef = state.team[teamIndex];
      if (!teamRef || teamRef.hp <= 0) return;

      console.log("Switching to:", teamRef.name, "Forced:", forced);

      // PRIMERO: resetear estado de batalla para que useMove no bloquee
      if (forced) {
        b.over = false;
        b.turn = 'player';
        _battleLock = false;
      }

      // Guardar el índice del Pokémon activo en la batalla para sincronizar HP después
      b.playerTeamIndex = teamIndex;

      // Usar referencia al Pokémon del equipo (evita desync de PP)
      b.player = teamRef;
      
      // TRACK participation for experience distribution
      if (b.participants && !b.participants.includes(teamRef.uid)) {
        b.participants.push(teamRef.uid);
      }
      
      b.playerStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 };
      b.player.confused = 0;
      b.player.flinched = false;
      b.player.choiceMove = null; // Clear Choice Band lock on switch

      // Limpiar animaciones previas (IMPORTANTE: si faineó, tiene anim-faint que lo oculta)
      const imgEl = document.getElementById('player-sprite-img');
      const emoEl = document.getElementById('player-sprite-emoji');
      if (imgEl) imgEl.classList.remove('anim-faint', 'anim-damage', 'anim-shake');
      if (emoEl) emoEl.classList.remove('anim-faint', 'anim-damage', 'anim-shake');

      // Eliminar AMBOS overlays posibles
      document.getElementById('forced-switch-overlay')?.remove();
      closeBattleOverlay();

      setLog(`¡${b.player.name} salió a combatir!`, 'log-player');

      // Actualizar UI
      updateBattleUI();
      renderMoveButtons();

      if (forced) {
        setBtns(true);
        showMoves(); // Esto es más robusto que solo poner display:grid

        // Cargar sprite con fallback
        const pData = POKEMON_DB[b.player.id];
        const emoji = pData ? pData.emoji : (b.player.emoji || '❓');
        if (imgEl && emoEl) {
          imgEl.src = '';
          imgEl.style.display = 'none';
          emoEl.style.display = 'block';
          emoEl.textContent = emoji;
          setTimeout(() => {
            const url = getBackSpriteUrl(b.player.id);
            if (url) {
              const testImg = new Image();
              testImg.onload = () => { imgEl.src = url; imgEl.style.display = 'block'; emoEl.style.display = 'none'; };
              testImg.onerror = () => { emoEl.style.display = 'block'; emoEl.textContent = emoji; };
              testImg.src = url;
            }
          }, 80);
        }
      } else {
        _battleLock = true;
        setBtns(false);
        setTimeout(() => enemyTurn(), 800);
      }
    }


    // ===== BATTLE OVERLAY (shared) =====
    function showBattleOverlay(html, noDismiss = false) {
      let ov = document.getElementById('battle-overlay');
      if (!ov) {
        ov = document.createElement('div');
        ov.id = 'battle-overlay';
        document.getElementById('battle-screen').appendChild(ov);
      }
      ov.style.cssText = 'position:absolute;inset:0;z-index:50;background:rgba(0,0,0,0.85);display:flex;align-items:flex-end;justify-content:center;padding:16px;border-radius:18px;';
      ov.innerHTML = `<div style="background:var(--card);border-radius:20px;padding:20px;width:100%;max-width:400px;max-height:70vh;overflow-y:auto;">${html}</div>`;
      if (!noDismiss) ov.addEventListener('click', e => { if (e.target === ov) closeBattleOverlay(); }, { once: true });
    }

    function closeBattleOverlay() {
      document.getElementById('battle-overlay')?.remove();
    }


    // ===== MOVE RELEARNER UI =====
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
