    // ===== BATTLE BAG =====
    const teachTM = (p, tmId, moveName) => {
      if (state.battle && !state.battle.over) return;
      
      const shopItem = SHOP_ITEMS.find(i => i.id.toLowerCase() === tmId.toLowerCase());
      const inventoryName = shopItem ? shopItem.name : `MT ${moveName}`;
      
      if (!state.inventory[inventoryName] || state.inventory[inventoryName] <= 0) {
        notify(`¡No tenés la ${inventoryName}!`, '📀');
        return;
      }
      const moveData = MOVE_DATA[moveName];
      if (!TM_COMPAT[p.id]?.includes(tmId)) return null;
      if (p.moves && p.moves.some(m => m.name === moveName)) return null;
      if (p.moves.length >= 4) {
        showLearnMoveMenu(p, { ...moveData, name: moveName, maxPP: moveData.pp }, (learned) => {
          if (learned) {
            state.inventory[inventoryName]--;
            if (!state.inventory[inventoryName]) delete state.inventory[inventoryName];
          }
          if (typeof renderBag === 'function') renderBag();
          if (typeof scheduleSave === 'function') scheduleSave();
        });
        return 'deferred';
      }
      p.moves.push({ name: moveName, pp: moveData.pp, maxPP: moveData.pp });
      state.inventory[inventoryName]--;
      if (!state.inventory[inventoryName]) delete state.inventory[inventoryName];
      return `aprendió ${moveName}`;
    };

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
      'Éter': p => { p.moves.forEach(m => { const cap = (m.maxPP > 0) ? m.maxPP : (MOVE_DATA[m.name]?.pp || 35); if (!m.maxPP || m.maxPP <= 0) m.maxPP = cap; m.pp = Math.min(cap, (isNaN(m.pp) ? 0 : m.pp) + 10); }); return `recuperó PP`; },
      'Elixir Máximo': p => { p.moves.forEach(m => { const cap = (m.maxPP > 0) ? m.maxPP : (MOVE_DATA[m.name]?.pp || 35); if (!m.maxPP || m.maxPP <= 0) m.maxPP = cap; m.pp = cap; }); return `recuperó todos los PP`; },
      'Subida PP': p => {
        if (!p.moves || p.moves.length === 0) return null;
        
        const ov = document.createElement('div');
        ov.id = 'pp-up-move-selector';
        ov.style.cssText = 'position:fixed;inset:0;z-index:700;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px);animation:fadeIn 0.2s ease;';
        
        // Definir colores de tipos localmente para evitar ReferenceError
        const typeColors = {
          'normal': '#A8A878', 'fire': '#F08030', 'water': '#6890F0', 'electric': '#F8D030',
          'grass': '#78C850', 'ice': '#98D8D8', 'fighting': '#C03028', 'poison': '#A040A0',
          'ground': '#E0C068', 'flying': '#A890F0', 'psychic': '#F85888', 'bug': '#A8B820',
          'rock': '#B8A038', 'ghost': '#705898', 'dragon': '#7038F8', 'dark': '#705848',
          'steel': '#B8B8D0', 'fairy': '#EE99AC'
        };

        let html = `<div style="background:var(--card);border-radius:24px;padding:28px;width:100%;max-width:400px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 20px 50px rgba(0,0,0,0.6);">
          <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:var(--yellow);margin-bottom:24px;text-align:center;line-height:1.6;">¿A QUÉ MOVIMIENTO DE ${p.name.toUpperCase()} SUBIR PP?</div>
          <div style="display:grid;gap:12px;">`;
        
        p.moves.forEach((m, i) => {
          const ppUps = m.ppUps || 0;
          const isMaxed = ppUps >= 3;
          const moveData = MOVE_DATA[m.name] || { type: 'normal', pp: 35 };
          const typeCol = typeColors[moveData.type] || '#aaa';
          
          html += `<button onclick="applyPPUpToMove(${state.team.indexOf(p)}, ${i})" 
            ${isMaxed ? 'disabled' : ''}
            style="display:flex;flex-direction:column;align-items:flex-start;padding:14px;background:rgba(255,255,255,0.05);border:1px solid ${isMaxed ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'};border-radius:16px;cursor:${isMaxed ? 'not-allowed' : 'pointer'};transition:all 0.2s;text-align:left;position:relative;overflow:hidden;${isMaxed ? 'opacity:0.5;' : ''}"
            onmouseover="${isMaxed ? '' : "this.style.background='rgba(255,255,255,0.1)';this.style.transform='translateX(4px)';this.style.borderColor='var(--yellow)'"}"
            onmouseout="${isMaxed ? '' : "this.style.background='rgba(255,255,255,0.05)';this.style.transform='translateX(0)';this.style.borderColor='rgba(255,255,255,0.1)'"}">
            <div style="display:flex;justify-content:space-between;width:100%;align-items:center;margin-bottom:4px;">
              <span style="font-weight:700;font-size:14px;color:#fff;">${m.name}</span>
              <span style="font-size:9px;padding:2px 8px;border-radius:6px;background:${typeCol}33;color:${typeCol};border:1px solid ${typeCol}55;text-transform:uppercase;font-weight:700;">${moveData.type}</span>
            </div>
            <div style="font-size:11px;color:var(--gray);">PP: ${m.pp}/${m.maxPP}</div>
            <div style="display:flex;gap:4px;margin-top:8px;">
              ${[1, 2, 3].map(step => `<div style="width:20px;height:4px;border-radius:2px;background:${ppUps >= step ? 'var(--yellow)' : 'rgba(255,255,255,0.1)'};"></div>`).join('')}
            </div>
            ${isMaxed ? '<div style="position:absolute;right:10px;bottom:10px;font-size:10px;color:var(--yellow);font-weight:700;">MÁXIMO</div>' : ''}
          </button>`;
        });
        
        html += `</div>
          <button onclick="document.getElementById('pp-up-move-selector').remove()" 
            style="margin-top:20px;width:100%;padding:14px;background:rgba(255,255,255,0.05);border:none;border-radius:16px;color:var(--gray);font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;">CANCELAR</button>
        </div>`;
        
        ov.innerHTML = html;
        document.body.appendChild(ov);
        return 'deferred';
      },
      'MT01 Puño Certero': p => teachTM(p, 'TM01', 'Puño Certero'),
      'MT02 Garra Dragón': p => teachTM(p, 'TM02', 'Garra Dragón'),
      'MT03 Hidropulso': p => teachTM(p, 'TM03', 'Hidropulso'),
      'MT04 Paz Mental': p => teachTM(p, 'TM04', 'Paz Mental'),
      'MT05 Rugido': p => teachTM(p, 'TM05', 'Rugido'),
      'MT06 Tóxico': p => teachTM(p, 'TM06', 'Tóxico'),
      'MT07 Granizo': p => teachTM(p, 'TM07', 'Granizo'),
      'MT08 Corpulencia': p => teachTM(p, 'TM08', 'Corpulencia'),
      'MT09 Recurrente': p => teachTM(p, 'TM09', 'Recurrente'),
      'MT10 Poder Oculto': p => teachTM(p, 'TM10', 'Poder Oculto'),
      'MT11 Día Soleado': p => teachTM(p, 'TM11', 'Día Soleado'),
      'MT12 Mofa': p => teachTM(p, 'TM12', 'Mofa'),
      'MT13 Rayo Hielo': p => teachTM(p, 'TM13', 'Rayo Hielo'),
      'MT14 Ventisca': p => teachTM(p, 'TM14', 'Ventisca'),
      'MT15 Hiperrayo': p => teachTM(p, 'TM15', 'Hiperrayo'),
      'MT16 Pantalla de Luz': p => teachTM(p, 'TM16', 'Pantalla de Luz'),
      'MT17 Protección': p => teachTM(p, 'TM17', 'Protección'),
      'MT18 Danza Lluvia': p => teachTM(p, 'TM18', 'Danza Lluvia'),
      'MT19 Gigadrenado': p => teachTM(p, 'TM19', 'Gigadrenado'),
      'MT20 Velo Sagrado': p => teachTM(p, 'TM20', 'Velo Sagrado'),
      'MT21 Frustración': p => teachTM(p, 'TM21', 'Frustración'),
      'MT22 Rayo Solar': p => teachTM(p, 'TM22', 'Rayo Solar'),
      'MT23 Cola Férrea': p => teachTM(p, 'TM23', 'Cola Férrea'),
      'MT24 Rayo': p => teachTM(p, 'TM24', 'Rayo'),
      'MT25 Trueno': p => teachTM(p, 'TM25', 'Trueno'),
      'MT26 Terremoto': p => teachTM(p, 'TM26', 'Terremoto'),
      'MT27 Retribución': p => teachTM(p, 'TM27', 'Retribución'),
      'MT28 Excavar': p => teachTM(p, 'TM28', 'Excavar'),
      'MT29 Psíquico': p => teachTM(p, 'TM29', 'Psíquico'),
      'MT30 Bola Sombra': p => teachTM(p, 'TM30', 'Bola Sombra'),
      'MT31 Demolición': p => teachTM(p, 'TM31', 'Demolición'),
      'MT32 Doble Equipo': p => teachTM(p, 'TM32', 'Doble Equipo'),
      'MT33 Reflejo': p => teachTM(p, 'TM33', 'Reflejo'),
      'MT34 Onda Voltio': p => teachTM(p, 'TM34', 'Onda Voltio'),
      'MT35 Lanzallamas': p => teachTM(p, 'TM35', 'Lanzallamas'),
      'MT36 Bomba Lodo': p => teachTM(p, 'TM36', 'Bomba Lodo'),
      'MT37 Tormenta de Arena': p => teachTM(p, 'TM37', 'Tormenta de Arena'),
      'MT38 Llamarada': p => teachTM(p, 'TM38', 'Llamarada'),
      'MT39 Tumba Rocas': p => teachTM(p, 'TM39', 'Tumba Rocas'),
      'MT40 Golpe Aéreo': p => teachTM(p, 'TM40', 'Golpe Aéreo'),
      'MT41 Tormento': p => teachTM(p, 'TM41', 'Tormento'),
      'MT42 Imagen': p => teachTM(p, 'TM42', 'Imagen'),
      'MT43 Daño Secreto': p => teachTM(p, 'TM43', 'Daño Secreto'),
      'MT44 Descanso': p => teachTM(p, 'TM44', 'Descanso'),
      'MT45 Atracción': p => teachTM(p, 'TM45', 'Atracción'),
      'MT46 Ladrón': p => teachTM(p, 'TM46', 'Ladrón'),
      'MT47 Ala de Acero': p => teachTM(p, 'TM47', 'Ala de Acero'),
      'MT48 Intercambio': p => teachTM(p, 'TM48', 'Intercambio'),
      'MT49 Robo': p => teachTM(p, 'TM49', 'Robo'),
      'MT50 Sofoco': p => teachTM(p, 'TM50', 'Sofoco'),
      'Recordador de Movimientos': p => {
        if (state.battle && !state.battle.over) return null; // Restricción: No usar en combate activo
        
        // Reunir movimientos de la especie actual y evoluciones previas
        let currentId = p.id;
        const allPossibleMoves = [];
        const seenCurrentMoves = new Set((p.moves || []).map(m => m.name));
        const processedIds = new Set();
        
        while (currentId && !processedIds.has(currentId)) {
          processedIds.add(currentId);
          const dbEntry = (typeof POKEMON_DB !== 'undefined' && POKEMON_DB[currentId]);
          if (dbEntry && dbEntry.learnset) {
            dbEntry.learnset.forEach(m => {
              // Si ya conoce el movimiento, ignorar
              if (seenCurrentMoves.has(m.name)) return;
              
              // Solo añadir si el nivel es alcanzado
              if (m.lv <= p.level) {
                const existing = allPossibleMoves.find(am => am.name === m.name);
                if (!existing) {
                  allPossibleMoves.push({ ...m, fromId: currentId });
                } else if (m.lv < existing.lv) {
                  existing.lv = m.lv;
                }
              }
            });
          }
          
          // Buscar de qué especie evoluciona
          if (typeof EVOLUTION_TABLE !== 'undefined') {
            const prevEntry = Object.entries(EVOLUTION_TABLE).find(([id, data]) => data.to === currentId);
            currentId = prevEntry ? prevEntry[0] : null;
          } else {
            currentId = null;
          }
        }
        
        if (!allPossibleMoves.length) return null;
        
        // Abrir interfaz de selección profesional
        setTimeout(() => openMoveRelearnerMenu(p, allPossibleMoves), 100);
        return 'deferred';
      },
      'Repelente': _ => { state.repelSecs = (state.repelSecs || 0) + 10 * 60; return `activó el Repelente (10 min)`; },
      'Superrepelente': _ => { state.repelSecs = (state.repelSecs || 0) + 20 * 60; return `activó el Superrepelente (20 min)`; },
      'Máximo Repelente': _ => { state.repelSecs = (state.repelSecs || 0) + 30 * 60; return `activó el Máximo Repelente (30 min)`; },
      'Ticket Shiny': _ => { state.shinyBoostSecs = (state.shinyBoostSecs || 0) + 30 * 60; return `activó el Ticket Shiny (30 min)`; },
      'Moneda Amuleto': _ => { state.amuletCoinSecs = (state.amuletCoinSecs || 0) + 30 * 60; return `activó la Moneda Amuleto (30 min)`; },
      'Huevo Suerte Pequeño': _ => { state.luckyEggSecs = (state.luckyEggSecs || 0) + 30 * 60; return `activó el Huevo Suerte Pequeño (30 min)`; },
      'Ticket Safari': _ => { state.safariTicketSecs = (state.safariTicketSecs || 0) + 30 * 60; updateHud(); updateBuffPanel(); renderMaps(); return `activó el Ticket Safari (30 min)`; },
      'Ticket Cueva Celeste': _ => { state.ceruleanTicketSecs = (state.ceruleanTicketSecs || 0) + 30 * 60; updateHud(); updateBuffPanel(); renderMaps(); return `activó el Ticket Cueva Celeste (30 min)`; },
      'Ticket Articuno': _ => { state.articunoTicketSecs = (state.articunoTicketSecs || 0) + 30 * 60; updateHud(); updateBuffPanel(); renderMaps(); return `activó el Ticket Articuno (30 min)`; },
      'Ticket Mewtwo': _ => { state.mewtwoTicketSecs = (state.mewtwoTicketSecs || 0) + 30 * 60; updateHud(); updateBuffPanel(); renderMaps(); return `activó el Ticket Mewtwo (30 min)`; },
      'Escáner de IVs': _ => { state.ivScannerSecs = (state.ivScannerSecs || 0) + 60 * 60; if (typeof updateHud === 'function') updateHud(); if (typeof updateBuffPanel === 'function') updateBuffPanel(); return `activó el Escáner de IVs (60 min)`; },
      'Incienso Fuego': _ => { state.incenseType = 'fire'; state.incenseSecs = 30 * 60; updateHud(); updateBuffPanel(); return `activó el Incienso Fuego (30 min)`; },
      'Incienso Agua': _ => { state.incenseType = 'water'; state.incenseSecs = 30 * 60; updateHud(); updateBuffPanel(); return `activó el Incienso Agua (30 min)`; },
      'Incienso Planta': _ => { state.incenseType = 'grass'; state.incenseSecs = 30 * 60; updateHud(); updateBuffPanel(); return `activó el Incienso Planta (30 min)`; },
      'Incienso Normal': _ => { state.incenseType = 'normal'; state.incenseSecs = 30 * 60; updateHud(); updateBuffPanel(); return `activó el Incienso Normal (30 min)`; },
      'Incienso Fantasma': _ => { state.incenseType = 'ghost'; state.incenseSecs = 30 * 60; updateHud(); updateBuffPanel(); return `activó el Incienso Fantasma (30 min)`; },
      'Incienso Psíquico': _ => { state.incenseType = 'psychic'; state.incenseSecs = 30 * 60; updateHud(); updateBuffPanel(); return `activó el Incienso Psíquico (30 min)`; },
    };

    function showBattleBag() {
      if (_battleLock) return;
      const b = state.battle;
      const usable = Object.entries(state.inventory || {})
        .filter(([name, qty]) => {
          if (qty <= 0) return false;
          if (!HEALING_ITEMS[name]) return false;

          // IMPORTANT: Hide non-combat items during battle
          // 1. TMs (MTs) - check for "MT" at start (catches MT01, MT 01, etc.)
          if (name.startsWith('MT')) return false;

          // 2. Explicitly non-combat items from HEALING_ITEMS
          const nonCombat = [
            'Recordador de Movimientos', 'Caramelo Raro', 'Subida PP',
            'Repelente', 'Superrepelente', 'Máximo Repelente',
            'Ticket Shiny', 'Moneda Amuleto', 'Huevo Suerte Pequeño',
            'Ticket Safari', 'Ticket Cueva Celeste', 'Ticket Articuno', 'Ticket Mewtwo',
            'Escáner de IVs', 'Incienso Fuego', 'Incienso Agua', 'Incienso Planta', 'Incienso Normal', 'Incienso Fantasma', 'Incienso Psíquico'
          ];
          if (nonCombat.includes(name)) return false;

          return true;
        });

      // Build overlay
      let html = `<div style="font-family:'Press Start 2P',monospace;font-size:9px;color:var(--yellow);margin-bottom:14px;">🎒 MOCHILA</div>`;
      if (!usable.length) {
        html += `<div style="color:var(--gray);font-size:12px;">No tenés objetos utilizables.</div>`;
      } else {
        html += usable.map(([name, qty]) => {
          const isGlobal = HEALING_ITEMS[name]?.length === 0 || ['Huevo Suerte Pequeño', 'Ticket Shiny', 'Moneda Amuleto', 'Repelente', 'Superrepelente', 'Máximo Repelente', 'Escáner de IVs', 'Incienso Fuego', 'Incienso Agua', 'Incienso Planta', 'Incienso Normal', 'Incienso Fantasma', 'Incienso Psíquico'].includes(name);
          return `<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);
            border-radius:10px;padding:10px 14px;margin-bottom:8px;">
            <div>
              <div style="font-size:13px;font-weight:700;">${name} ${isGlobal ? '<span style="color:var(--yellow);font-size:8px;">(GLOBAL)</span>' : ''}</div>
              <div style="font-size:10px;color:var(--gray);">x${qty}</div>
            </div>
            <button onclick="${isGlobal ? `useBagItem('${name}', 0)` : `showBattleItemTarget('${name}')`}" 
              style="font-family:'Press Start 2P',monospace;font-size:8px;
              padding:8px 12px;border:none;border-radius:8px;cursor:pointer;
              background:rgba(107,203,119,0.2);color:var(--green);border:1px solid rgba(107,203,119,0.3);">
              USAR
            </button>
          </div>`;
        }).join('');
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

      const isGlobal = ['Huevo Suerte Pequeño', 'Ticket Shiny', 'Moneda Amuleto', 'Repelente', 'Superrepelente', 'Máximo Repelente', 'Escáner de IVs', 'Incienso Fuego', 'Incienso Agua', 'Incienso Planta', 'Incienso Normal', 'Incienso Fantasma', 'Incienso Psíquico'].includes(itemName);
      
      let result;
      let targetName = 'Equipo';

      if (isGlobal) {
        result = fn(); // No target
      } else {
        const target = state.team[teamIndex];
        if (!target) return;
        result = fn(target);
        if (result === null) { notify('No se puede usar en este momento.', '⚠️'); return; }
        if (result === 'deferred') return;
        targetName = target.name;
        
        // Sync battle object if target is active
        if (b && teamIndex === b.playerTeamIndex) {
          b.player.hp = target.hp;
          b.player.status = target.status;
          if (target.moves) b.player.moves = JSON.parse(JSON.stringify(target.moves));
          updateBattleUI();
        }
      }

      state.inventory[itemName]--;
      if (!state.inventory[itemName]) delete state.inventory[itemName];

      closeBattleOverlay();
      setLog(`Usaste ${itemName}. ¡${isGlobal ? '' : targetName + ' '}${result}!`, 'log-catch');

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
      if (document.getElementById('tab-bag')?.style.display !== 'none' && typeof renderBag === 'function') renderBag();
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
        if (document.getElementById('tab-bag')?.style.display !== 'none' && typeof renderBag === 'function') renderBag();
        scheduleSave();
      }
    }

    window.applyPPUpToMove = function(pIdx, mIdx) {
      const p = state.team[pIdx];
      if (!p || !p.moves[mIdx]) return;
      const m = p.moves[mIdx];
      
      if ((m.ppUps || 0) >= 3) {
        notify('Este movimiento ya alcanzó su límite de PP.', '⚠️');
        return;
      }
      
      const basePP = MOVE_DATA[m.name]?.pp || 35;
      const bonus = Math.max(1, Math.floor(basePP * 0.2));
      
      m.maxPP += bonus;
      m.pp += bonus;
      m.ppUps = (m.ppUps || 0) + 1;
      
      state.inventory['Subida PP']--;
      if (state.inventory['Subida PP'] <= 0) delete state.inventory['Subida PP'];
      
      document.getElementById('pp-up-move-selector')?.remove();
      notify(`¡Los PP de ${m.name} subieron a ${m.maxPP}!`, '📈');
      
      if (typeof renderBag === 'function') renderBag();
      if (typeof renderTeam === 'function') renderTeam();
      scheduleSave();
    };

    function useItemOutsideBattle(itemName, context, index) {
      const p = context === 'team' ? state.team[index] : state.box[index];
      if (!p) return;

      const fn = HEALING_ITEMS[itemName];
      if (!fn || !state.inventory[itemName]) return;

      const isGlobal = ['Huevo Suerte Pequeño', 'Ticket Shiny', 'Moneda Amuleto', 'Repelente', 'Superrepelente', 'Máximo Repelente', 'Escáner de IVs', 'Incienso Fuego', 'Incienso Agua', 'Incienso Planta', 'Incienso Normal', 'Incienso Fantasma', 'Incienso Psíquico'].includes(itemName);

      if (isGlobal) {
        const result = fn();
        state.inventory[itemName]--;
        if (!state.inventory[itemName]) delete state.inventory[itemName];
        document.getElementById('outside-item-overlay')?.remove();
        notify(`Usaste ${itemName}. ¡${result}!`, '✨');
      } else {
        const result = fn(p);
        if (result === null) { notify('No hace efecto.', '⚠️'); return; }
        if (result === 'deferred') return;

        state.inventory[itemName]--;
        if (!state.inventory[itemName]) delete state.inventory[itemName];
        document.getElementById('outside-item-overlay')?.remove();
        notify(`Usaste ${itemName}. ¡${p.name} ${result}!`, '✨');
      }

      if (context === 'team') renderTeam();
      if (document.getElementById('tab-map')?.style.display !== 'none' && typeof renderMaps === 'function') renderMaps();
      if (document.getElementById('tab-bag')?.style.display !== 'none' && typeof renderBag === 'function') renderBag();
      scheduleSave();
    }

    function openBagItemMenu(itemName) {
      const isGlobal = ['Huevo Suerte Pequeño', 'Ticket Shiny', 'Moneda Amuleto', 'Repelente', 'Superrepelente', 'Máximo Repelente', 'Ticket Safari', 'Ticket Cueva Celeste', 'Ticket Articuno', 'Ticket Mewtwo', 'Escáner de IVs', 'Incienso Fuego', 'Incienso Agua', 'Incienso Planta', 'Incienso Normal', 'Incienso Fantasma', 'Incienso Psíquico'].includes(itemName);
      
      if (isGlobal) {
        useItemOutsideBattle(itemName, 'team', 0);
        return;
      }

      const ov = document.createElement('div');
      ov.id = 'bag-item-target-overlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:600;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);';
      
      let html = `<div style="background:var(--card);border-radius:24px;padding:24px;width:100%;max-width:380px;max-height:80vh;overflow-y:auto;border:1px solid rgba(255,255,255,0.1);box-shadow:0 20px 50px rgba(0,0,0,0.5);">
        <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:var(--yellow);margin-bottom:20px;text-align:center;line-height:1.5;">¿SOBRE QUÉ POKÉMON USAR EL ${itemName.toUpperCase()}?</div>`;
      
      html += state.team.map((p, i) => {
        const hpPct = Math.round(p.hp / p.maxHp * 100);
        const hpCol = hpPct > 50 ? 'var(--green)' : hpPct > 20 ? 'var(--yellow)' : 'var(--red)';
        
        let tmInfoHtml = '';
        let canLearnTm = true;
        let isTm = itemName.startsWith('MT');
        if (isTm) {
          const tmMatch = itemName.match(/MT(\d+)\s*(.*)/);
          if (tmMatch) {
            const tmId = 'TM' + tmMatch[1];
            const moveName = tmMatch[2];
            if (!TM_COMPAT[p.id]?.includes(tmId)) {
              canLearnTm = false;
              tmInfoHtml = `<div style="font-size:9px;color:var(--red);margin-top:4px;font-weight:700;">No compatible</div>`;
            } else if (p.moves && p.moves.some(m => m.name === moveName)) {
              canLearnTm = false;
              tmInfoHtml = `<div style="font-size:9px;color:var(--yellow);margin-top:4px;font-weight:700;">Ya conoce el movimiento</div>`;
            } else {
              tmInfoHtml = `<div style="font-size:9px;color:var(--blue);margin-top:4px;font-weight:700;">¡Puede aprenderlo!</div>`;
            }
          }
        }

        return `<div ${canLearnTm ? `onclick="document.getElementById('bag-item-target-overlay').remove();useItemOutsideBattle('${itemName}', 'team', ${i})"` : ''} 
          style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.03);border-radius:16px;padding:12px;margin-bottom:10px;cursor:${canLearnTm ? 'pointer' : 'not-allowed'};border:1px solid rgba(255,255,255,0.06);transition:all 0.2s; ${!canLearnTm ? 'opacity:0.6;filter:grayscale(0.8);' : ''}"
          ${canLearnTm ? `onmouseover="this.style.background='rgba(155,77,255,0.1)';this.style.borderColor='rgba(155,77,255,0.3)';this.style.transform='translateY(-2px)'" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.06)';this.style.transform='translateY(0)'"` : ''}>
          <img src="${getSpriteUrl(p.id)}" width="44" height="44" style="image-rendering:pixelated;">
          <div style="flex:1;">
            <div style="font-weight:700;font-size:13px;display:flex;align-items:center;gap:6px;">
              ${p.name} <span style="font-size:10px;color:var(--gray);font-weight:400;">Nv.${p.level}</span>
              ${p.status ? `<span style="background:rgba(255,59,59,0.1);color:var(--red);font-size:8px;padding:2px 6px;border-radius:4px;text-transform:uppercase;">${p.status}</span>` : ''}
            </div>
            <div style="background:rgba(255,255,255,0.05);border-radius:4px;height:5px;margin-top:6px;overflow:hidden;">
              <div style="width:${hpPct}%;height:100%;background:${hpCol};box-shadow:0 0 10px ${hpCol}55;"></div>
            </div>
            <div style="font-size:10px;color:var(--gray);margin-top:4px;">${p.hp} / ${p.maxHp} HP</div>
            ${tmInfoHtml}
          </div>
        </div>`;
      }).join('');

      html += `<button onclick="document.getElementById('bag-item-target-overlay').remove()" 
        style="width:100%;margin-top:10px;padding:14px;border:none;border-radius:14px;background:rgba(255,255,255,0.05);color:var(--gray);cursor:pointer;font-size:12px;font-weight:700;transition:all 0.2s;"
        onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
        CANCELAR
      </button>
      </div>`;
      
      ov.innerHTML = html;
      ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
      document.body.appendChild(ov);
    }

    function openBagStoneMenu(stoneName) {
      if (!state.inventory[stoneName] || state.inventory[stoneName] <= 0) {
        notify(`No tenés ${stoneName}.`, '❌');
        return;
      }

      // Determine which team pokémon can evolve with this stone
      const stoneEvoTable = (typeof STONE_EVOLUTIONS !== 'undefined') ? STONE_EVOLUTIONS : {};
      const eeveeStones = ['Piedra Agua', 'Piedra Trueno', 'Piedra Fuego'];
      const shopItem = (typeof SHOP_ITEMS !== 'undefined') ? SHOP_ITEMS.find(i => i.name === stoneName) : null;
      const stoneIcon = shopItem ? shopItem.icon : '💎';
      const stoneSprite = shopItem ? shopItem.sprite : '';

      const eligible = state.team.map((p, i) => {
        let canEvolve = false;
        if (p.id === 'eevee') {
          canEvolve = eeveeStones.includes(stoneName);
        } else {
          const evo = stoneEvoTable[p.id];
          canEvolve = !!(evo && evo.stone === stoneName);
        }
        return { p, i, canEvolve };
      });

      const ov = document.createElement('div');
      ov.id = 'bag-stone-target-overlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:600;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);';

      const stoneImgHtml = stoneSprite
        ? `<img src="${stoneSprite}" style="width:40px;height:40px;image-rendering:pixelated;" onerror="this.outerHTML='<span style=\\'font-size:32px;\\'>${stoneIcon}</span>'">`
        : `<span style="font-size:32px;">${stoneIcon}</span>`;

      let html = `<div style="background:var(--card);border-radius:24px;padding:24px;width:100%;max-width:380px;max-height:80vh;overflow-y:auto;border:1px solid rgba(255,217,61,0.2);box-shadow:0 20px 50px rgba(0,0,0,0.5);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          ${stoneImgHtml}
          <div>
            <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:var(--yellow);">${stoneName.toUpperCase()}</div>
            <div style="font-size:11px;color:var(--gray);margin-top:4px;">x${state.inventory[stoneName]} en mochila</div>
          </div>
        </div>
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--gray);margin-bottom:14px;">¿SOBRE QUÉ POKÉMON USARLA?</div>`;

      const hasEligible = eligible.some(e => e.canEvolve);

      if (!hasEligible) {
        html += `<div style="background:rgba(255,59,59,0.08);border:1px solid rgba(255,59,59,0.2);border-radius:12px;padding:14px;font-size:12px;color:#ff8888;line-height:1.6;text-align:center;">
          Ningún Pokémon en tu equipo puede evolucionar con esta piedra.
        </div>`;
      } else {
        eligible.forEach(({ p, i, canEvolve }) => {
          const evoTarget = p.id === 'eevee'
            ? ({ 'Piedra Agua': 'vaporeon', 'Piedra Trueno': 'jolteon', 'Piedra Fuego': 'flareon' }[stoneName])
            : stoneEvoTable[p.id]?.to;
          const toData = (typeof POKEMON_DB !== 'undefined' && evoTarget) ? POKEMON_DB[evoTarget] : null;

          const spriteUrl = (typeof getSpriteUrl === 'function') ? getSpriteUrl(p.id, p.isShiny) : '';

          html += `<div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.03);border-radius:16px;padding:12px;margin-bottom:10px;
            border:1px solid ${canEvolve ? 'rgba(255,217,61,0.2)' : 'rgba(255,255,255,0.06)'};
            ${canEvolve ? 'cursor:pointer;' : 'opacity:0.4;cursor:not-allowed;'}transition:all 0.2s;"
            ${canEvolve ? `onclick="document.getElementById('bag-stone-target-overlay').remove();useStoneOnPokemon('${stoneName}', ${i})"
              onmouseover="this.style.background='rgba(255,217,61,0.08)';this.style.borderColor='rgba(255,217,61,0.4)';this.style.transform='translateY(-2px)'"
              onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,217,61,0.2)';this.style.transform='translateY(0)'"` : ''}>
            <img src="${spriteUrl}" width="44" height="44" style="image-rendering:pixelated;"
              onerror="this.outerHTML='<span style=\\'font-size:32px;\\'>${p.emoji}</span>'">
            <div style="flex:1;">
              <div style="font-weight:700;font-size:13px;">${p.name} <span style="font-size:10px;color:var(--gray);font-weight:400;">Nv.${p.level}</span></div>
              <div style="font-size:10px;color:${canEvolve ? 'var(--yellow)' : 'var(--gray)'};margin-top:3px;">
                ${canEvolve ? `→ ${toData ? toData.name : evoTarget || '?'}` : 'No compatible'}
              </div>
            </div>
            ${canEvolve ? `<span style="font-size:18px;">✨</span>` : ''}
          </div>`;
        });
      }

      html += `<button onclick="document.getElementById('bag-stone-target-overlay').remove()"
        style="width:100%;margin-top:10px;padding:14px;border:none;border-radius:14px;background:rgba(255,255,255,0.05);color:var(--gray);cursor:pointer;font-size:12px;font-weight:700;transition:all 0.2s;"
        onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
        CANCELAR
      </button></div>`;

      ov.innerHTML = html;
      ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
      document.body.appendChild(ov);
    }

    // ===== BATTLE SWITCH =====
    function showBattleSwitch(forced = false) {
      if (_battleLock && !forced) return;
      const b = state.battle;
      const eligible = state.team.filter(p => p.name !== b.player.name && p.hp > 0 && !p.onMission);

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
      if (!b) return;
      const teamRef = state.team[teamIndex];
      if (!teamRef || teamRef.hp <= 0) return;

      console.log("Switching to:", teamRef.name, "Forced:", forced);

      // PRIMERO: resetear estado de batalla para que useMove no bloquee
      if (forced) {
        b.over = false;
        b._ending = false;
        b.turn = 'player';
        _battleLock = false;
      }

      // Guardar el índice del Pokémon activo en la batalla para sincronizar HP después
      b.playerTeamIndex = teamIndex;

      // If the current player was transformed (e.g. Ditto), restore its original form now
      if (b.player && b.player.isTransformed && b.player.originalForm) {
        const prevHp = b.player.hp;
        const savedItem = b.player.heldItem;
        const origRef = state.team.find(p => p.uid === b.player.originalForm.uid);
        if (origRef) {
          Object.assign(origRef, b.player.originalForm);
          origRef.hp = Math.min(origRef.maxHp, Math.max(0, prevHp));
          if (savedItem !== undefined) origRef.heldItem = savedItem;
        }
      }

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

      const itemName = 'Recordador de Movimientos';
      if (!state.inventory[itemName]) return;

      document.getElementById('move-relearner-overlay').remove();

      // Efecto visual de "brillo" en la pantalla
      const flash = document.createElement('div');
      flash.style.cssText = 'position:fixed;inset:0;z-index:2000;background:#fff;opacity:0.8;pointer-events:none;transition:opacity 0.5s;';
      document.body.appendChild(flash);
      setTimeout(() => { flash.style.opacity = '0'; setTimeout(() => flash.remove(), 500); }, 50);

      if (p.moves.length < 4) {
        p.moves.push({ name: moveName, pp: movePP, maxPP: movePP });
        state.inventory[itemName]--;
        if (!state.inventory[itemName]) delete state.inventory[itemName];
        notify(`¡${p.name} ha recordado ${moveName.toUpperCase()}!`, '🧠');
        if (typeof renderTeam === 'function') renderTeam();
        if (typeof renderBox === 'function') renderBox();
        if (typeof renderBag === 'function') renderBag();
        if (typeof scheduleSave === 'function') scheduleSave();
      } else {
        // Si tiene 4 movimientos, usar la interfaz de aprendizaje existente para elegir cuál olvidar
        const newMove = { name: moveName, pp: movePP, maxPP: movePP };
        if (typeof showLearnMoveMenu === 'function') {
          showLearnMoveMenu(p, newMove, (learned) => {
            if (learned) {
              state.inventory[itemName]--;
              if (!state.inventory[itemName]) delete state.inventory[itemName];
              notify(`¡${p.name} recordó ${moveName}!`, '✨');
            }
            if (typeof renderTeam === 'function') renderTeam();
            if (typeof renderBox === 'function') renderBox();
            if (typeof renderBag === 'function') renderBag();
            if (typeof scheduleSave === 'function') scheduleSave();
          });
        } else {
          // Fallback si no existe la función
          p.moves.shift();
          p.moves.push(newMove);
          state.inventory[itemName]--;
          if (!state.inventory[itemName]) delete state.inventory[itemName];
          notify(`¡${p.name} recordó ${moveName}!`, '✨');
          if (typeof renderBag === 'function') renderBag();
          if (typeof scheduleSave === 'function') scheduleSave();
        }
      }

      if (typeof scheduleSave === 'function') scheduleSave();
    }
