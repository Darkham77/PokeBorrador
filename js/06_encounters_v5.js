// ===== LOCATION / WILD BATTLE =====
let _currentCarouselIndex = 0;
let _carouselInterval = null;

function _startCarouselTimer() {
  if (_carouselInterval) return;
  _carouselInterval = setInterval(() => {
    const activeEvents = (typeof _activeEvents !== 'undefined') ? _activeEvents : [];
    const finishedEvents = (typeof _finishedEvents !== 'undefined') ? _finishedEvents : [];
    const totalSlides = 1 + activeEvents.length + finishedEvents.length;
    
    _currentCarouselIndex = (_currentCarouselIndex + 1) % totalSlides;
    
    const carousel = document.getElementById('event-carousel');
    if (carousel) {
      const slides = carousel.querySelectorAll('.pc-carousel-slide');
      const dots = carousel.querySelectorAll('.pc-dot');
      if (slides.length > 0) {
        slides.forEach((s, i) => s.classList.toggle('active', i === _currentCarouselIndex));
        dots.forEach((d, i) => d.classList.toggle('active', i === _currentCarouselIndex));
        
        // El slide 0 es "Raros", los slides > 0 son eventos (activos o podios)
        const hasEventActive = _currentCarouselIndex > 0;
        carousel.classList.toggle('event-active', hasEventActive);
      }
    }
  }, 5000);
}

function renderEventCarouselSlides(cycleIcon, rareCycleSpritesHtml) {
  const activeEvents = (typeof _activeEvents !== 'undefined') ? _activeEvents : [];
  const finishedEvents = (typeof _finishedEvents !== 'undefined') ? _finishedEvents : [];
  const slides = [];

  // Slide 0: Raros del día
  slides.push({
    icon: cycleIcon,
    title: 'Raros por horario',
    content: `<div class="pc-banner-spawns pc-banner-spawns-compact">${rareCycleSpritesHtml}</div>`,
    onclick: null,
    isEvent: false
  });

  // Slides de Eventos Activos
  activeEvents.forEach(ev => {
    slides.push({
      icon: ev.icon || '🎁',
      title: ev.name,
      content: `<div class="pc-banner-text" style="font-size:11px; line-height:1.4;">${ev.description || '¡Evento especial activo ahora!'}</div>`,
      onclick: `if(typeof showEventDetail === 'function') showEventDetail('${ev.id}')`,
      isEvent: true,
      color: '#fbbf24'
    });
  });

  // Slides de Eventos Finalizados (Reclamo/Resultados)
  finishedEvents.forEach(fv => {
    // Verificar si el jugador tiene un premio para mostrar "¡HAS GANADO!"
    const award = (state._pendingAwards || []).find(a => a.event_id === fv.id);
    const title = award ? '¡HAS GANADO!' : '¡PODIO FINAL!';
    const sub = award ? '¡Reclama tus premios!' : '¡Tocá para ver ganadores!';
    const icon = award ? '🏆' : (fv.icon || '🏁');
    const color = award ? '#22c55e' : '#fbbf24';

    slides.push({
      icon: icon,
      title: title,
      content: `<div class="pc-banner-text" style="font-size:10px; color:${color}; font-weight:bold;">${fv.name}<br>${sub}</div>`,
      onclick: `if(typeof showEventResultsModal === 'function') showEventResultsModal('${fv.id}')`,
      isEvent: true,
      color: color
    });
  });

  if (_currentCarouselIndex >= slides.length) _currentCarouselIndex = 0;

  const slidesHtml = slides.map((s, i) => `
    <div class="pc-carousel-slide ${i === _currentCarouselIndex ? 'active' : ''}" 
         ${s.onclick ? `onclick="event.stopPropagation(); ${s.onclick}"` : ''}>
      <div class="pc-banner-icon">${s.icon}</div>
      <div class="pc-banner-content">
        <div class="pc-banner-title" style="color:${s.color || '#fff'};">${s.title}</div>
        ${s.content}
      </div>
    </div>
  `).join('');

  const dotsHtml = slides.map((_, i) => `
    <div class="pc-dot ${i === _currentCarouselIndex ? 'active' : ''}"></div>
  `).join('');

  const hasEventActive = _currentCarouselIndex > 0 && slides[_currentCarouselIndex]?.isEvent;

  return `
    <div class="pc-banner pc-banner-carousel ${hasEventActive ? 'event-active' : ''}" id="event-carousel" style="min-height: 80px;">
      ${slidesHtml}
      <div class="pc-carousel-dots">${dotsHtml}</div>
    </div>
  `;
}

async function renderMaps() {
  console.log("[renderMaps] Iniciando renderizado...");
  _startCarouselTimer();
  try {
    const container = document.getElementById('map-list');
    if (!container) {
      console.error("[renderMaps] No se encontró el contenedor #map-list");
      return;
    }
      const cycle = getDayCycle();
      const badgeCount = (Array.isArray(state.badges) ? state.badges.length : (parseInt(state.badges) || 0));

      const MAP_IMAGE_MAPPING = {
        route1: 'ruta 1.png',
        route2: 'ruta 2.png',
        forest: 'bosque viridian.png',
        route22: 'ruta 22.png',
        route3: 'ruta 3.png',
        mt_moon: 'mt. moon.png',
        route4: 'ruta 4.png',
        route24: 'ruta 24.png',
        route25: 'ruta 25.png',
        route5: 'ruta 5.png',
        route6: 'ruta 6.png',
        route11: 'ruta 11.png',
        diglett_cave: 'cueva diglett.png',
        route9: 'ruta 9.png',
        rock_tunnel: 'tunel roca.png',
        route10: 'ruta 10.png',
        power_plant: 'central de energia.png',
        route8: 'ruta 8.png',
        pokemon_tower: 'torre pokemon.png',
        route12: 'ruta 12.png',
        route13: 'ruta 13.png',
        safari_zone: 'zona safari.png',
        seafoam_islands: 'islas espuma.png',
        fishing_island: 'islas espuma.png',
        mansion: 'mansion pokemon.png',
        route23: 'ruta 23.png',
        victory_road: 'calle victoria.png',
        cerulean_cave: 'cueva celeste.png'
      };

      console.log(`[renderMaps] Mapa Actual: ${state.map}, Bando: ${state.faction}, Medallas: ${badgeCount}, Ciclo: ${cycle}`);
      console.log(`[renderMaps] Sprites Disponibles: ${window.POKEMON_SPRITE_IDS ? 'SÍ' : 'NO'}`);

      let eggCount = 0;
      let interactionCount = state.totalNotifications || 0;
      
      if (currentUser) {
        try {
          const { count } = await sb.from('eggs').select('egg_id', { count: 'exact', head: true }).eq('player_id', currentUser.id);
          eggCount = count || 0;
        } catch (e) { console.error("Error fetching eggs:", e); }
      }

      const getPokemonSpriteHtml = (id, isRare = false) => {
        const spriteIds = window.POKEMON_SPRITE_IDS;
        if (!spriteIds) {
          console.warn("[getPokemonSpriteHtml] window.POKEMON_SPRITE_IDS no está definido aún.");
          return '';
        }
        const num = spriteIds[id];
        const pData = POKEMON_DB[id];
        const name = pData?.name || id;
        
        if (!num) {
          console.log(`[getPokemonSpriteHtml] No hay sprite ID para: ${id}`);
          return '';
        }
        
        return `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${num}.png"
          title="${name}" width="32" height="32"
          onerror="this.parentElement.innerHTML += '<span>❓</span>'; this.remove();" 
          class="${isRare ? 'rare-spawn' : ''}">`;
      };

      const translateCycle = (c) => {
        switch (c) {
          case 'day': return 'DÍA';
          case 'night': return 'NOCHE';
          case 'dawn': return 'AMANECER';
          case 'dusk': return 'ATARDECER';
          default: return c.toUpperCase();
        }
      };

      let html = '';

      // PC & Stats Bar (Balanced Version)
      const cycleLabel = ({ morning: 'AMANECER', day: 'DÍA', dusk: 'ATARDECER', night: 'NOCHE' }[cycle] || cycle.toUpperCase());
      const cycleIcon = ({ morning: '🌅', day: '☀️', dusk: '🌇', night: '🌙' }[cycle] || '⏰');
      // Rare spawns (exclusive to current cycle, <10%)
      const rareByCycleMinRate = {}; // id -> minRate in this cycle across all maps
      FIRE_RED_MAPS.forEach(loc => {
        const pool = loc.wild?.[cycle] || null;
        const rates = loc.rates?.[cycle] || null;
        if (!pool || !rates) return;

        pool.forEach((id, idx) => {
          const rate = rates[idx] ?? 100;
          if (rate >= 10) return;

          // Verificar si el Pokémon sale en CUALQUIER otro horario en este mapa
          const otherCycles = Object.keys(loc.wild || {}).filter(c => c !== cycle);
          const isExclusiveToThisCycleInThisMap = !otherCycles.some(c => loc.wild[c].includes(id));

          if (isExclusiveToThisCycleInThisMap) {
            if (rareByCycleMinRate[id] === undefined || rate < rareByCycleMinRate[id]) {
              rareByCycleMinRate[id] = rate;
            }
          }
        });
      });
      const rareCycleTop = Object.entries(rareByCycleMinRate)
        .map(([id, minRate]) => ({ id, minRate }))
        .sort((a, b) => a.minRate - b.minRate)
        .slice(0, 6);
      const rareCycleSpritesHtml = rareCycleTop.length
        ? rareCycleTop.map(p => getPokemonSpriteHtml(p.id, false)).join('')
        : `<span style="font-size:12px;color:var(--gray);">Sin raros exclusivos &lt;10%.</span>`;
      // Daycare missions (remaining)
      try {
        if (typeof generateDailyMission === 'function') generateDailyMission();
      } catch (e) { /* ignore */ }
      const missions = Array.isArray(state.daycare_missions) ? state.daycare_missions : [];
      const missionsRemaining = missions.filter(m => !m?.completed).length;
      const missionTrainerSprites = Array.from(new Set(missions.map(m => m?.trainerSprite).filter(Boolean))).slice(0, 2);
      const missionsSpritesHtml = missionTrainerSprites.length
        ? missionTrainerSprites.map(src => `<img src="${src}" alt="Misión" onerror="this.style.display='none'">`).join('')
        : `<span style="font-size:24px;">👤</span>`;
      // Gyms available today (strongest available difficulty first)
      const today = (function() {
        const d = getGMT3Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      })();

      // Equipo Rocket: Extorsión de Ruta diaria (Nv. 15+)
      if (state.playerClass === 'rocket' && (state.classLevel || 1) >= 15) {
        if (state.classData?.extortedRouteDate !== today) {
          state.classData = state.classData || {};
          state.classData.extortedRouteDate = today;
          // Seleccionar ruta que no sea un pueblo ni un gimnasio, del pool de FIRE_RED_MAPS
          const validRoutes = FIRE_RED_MAPS.filter(m => m.wild && Object.keys(m.wild).length > 0);
          const randomMap = validRoutes[Math.floor(Math.random() * validRoutes.length)];
          state.classData.extortedRouteId = randomMap.id;
          if (typeof scheduleSave === 'function') scheduleSave();
        }
      }


      const gymsList = (typeof GYMS !== 'undefined' && Array.isArray(GYMS))
        ? GYMS
        : (Array.isArray(window.GYMS) ? window.GYMS : []);
      const gymAvailable = gymsList
        .filter(g => {
          const locked = (state.badges || 0) < (g.badgesRequired || 0);
          const wonToday = state.lastGymWins?.[g.id] === today;
          const attemptedToday = state.lastGymAttempts?.[g.id] === today;
          const progress = state.gymProgress?.[g.id] || (state.defeatedGyms?.includes(g.id) ? 1 : 0);
          const isFirstEasyAttempt = progress === 0;
          
          // Un gimnasio NO está disponible si:
          // 1. Está bloqueado por medallas
          // 2. Ya se ganó hoy
          // 3. Ya se intentó hoy (y no es el primer intento en fácil)
          const canChallenge = !locked && !wonToday && (!attemptedToday || isFirstEasyAttempt);
          return canChallenge;
        })
        .map(g => {
          const reached = state.defeatedGyms?.includes(g.id);
          const progress = state.gymProgress?.[g.id] || (reached ? 1 : 0);
          const diffKey = (progress >= 2) ? 'hard' : ((progress >= 1) ? 'normal' : 'easy');
          const teamData = g.difficulties?.[diffKey] || { pokemon: g.pokemon, levels: g.levels };
          const maxLevel = Array.isArray(teamData.levels) ? Math.max(...teamData.levels) : 0;
          return { gym: g, strength: maxLevel };
        })
        .sort((a, b) => b.strength - a.strength);

      const gymTop3 = gymAvailable.slice(0, 3);
      const gymRematchCount = gymAvailable.length;
      const gymSpritesHtml = gymTop3.length
        ? gymTop3.map(x => `<img src="${x.gym.sprite}" alt="${x.gym.leader}" onerror="this.style.display='none'">`).join('')
        : `<span style="font-size:12px;color:var(--gray);">Nada por hoy.</span>`;
      html += `
        <div class="pc-split-container" style="display: flex; gap: 20px; margin-bottom: 25px; align-items: stretch;">
          <div class="pc-left" style="flex: 1.5;">
            <div class="location-card pokecenter-banner-card" onclick="openPokemonCenter()" 
                 style="background-image: url('assets/pokecenter_banner.png'); background-size: cover; background-position: 50% 10%; border: 2px solid #f69; padding: 0; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; min-height: 240px; position: relative; overflow: hidden; border-radius: 18px;">
               <div style="background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); padding: 30px; width: 100%;">
                 <div style="font-family:'Press Start 2P',monospace; font-size:12px; color:#f69; margin-bottom: 12px; letter-spacing: 1px;">Centro Pokémon</div>
                 <div style="font-size:14px; color:#ddd; line-height:1.6;">Saná a tu equipo y restaurá todos sus PP al instante.</div>
               </div>
               <span class="location-tag" style="background: #f69; color: white; border: none; top: 15px; right: 15px; z-index: 2;">🏥 CURACIÓN</span>
            </div>
          </div>
          <div class="pc-right" style="flex: 1; display: flex; min-width: 0;">
            <div class="pc-banner-grid">
              ${renderEventCarouselSlides(cycleIcon, rareCycleSpritesHtml)}

              <div class="pc-banner" onclick="showTab('daycare')">
                <div class="pc-banner-icon">📜</div>
                <div class="pc-banner-content">
                  <div class="pc-banner-title">Guardería</div>
                  <div class="pc-banner-text">¡Tenés <span>${missionsRemaining}</span> misiones por hacer!</div>
                  <div class="pc-banner-spawns pc-banner-trainers">${missionsSpritesHtml}</div>
                </div>
              </div>

              <div class="pc-banner" onclick="showTab('gyms')">
                <div class="pc-banner-icon">🏆</div>
                <div class="pc-banner-content">
                  <div class="pc-banner-title">Gimnasios</div>
                  <div class="pc-banner-text">Tenés <span>${gymRematchCount}</span> gimnasios por derrotar</div>
                  <div class="pc-banner-spawns pc-banner-trainers">${gymSpritesHtml}</div>
                </div>
              </div>

              <div class="pc-banner" onclick="showTab('daycare')">
                <div class="pc-banner-icon">🥚</div>
                <div class="pc-banner-content">
                  <div class="pc-banner-title">Crianza</div>
                  <div class="pc-banner-text">Tenés <span>${eggCount}</span> huevos esperando</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Cycle helpers
      const CYCLE_ICONS = { morning: '🌅', day: '☀️', dusk: '🌇', night: '🌙' };

      // DOMINANCIA: Cargar capturas de guardianes y estado de guerra
      if (typeof loadDailyGuardianCaptures === 'function') {
        await loadDailyGuardianCaptures();
      }

      let mapWinners = {};
      let isWeekend = typeof isDisputePhase === 'function' ? !isDisputePhase() : false;
      try {
        const weekId = typeof getCurrentWeekId === 'function' ? getCurrentWeekId() : null;
        if (weekId) {
          let hasDominanceData = false;
          if (isWeekend) {
            const { data } = await window.sb.from('war_dominance').select('map_id, winner_faction').eq('week_id', weekId);
            if (data && data.length > 0) {
              hasDominanceData = true;
              data.forEach(d => mapWinners[d.map_id] = d.winner_faction);
            }
          }
          
          if (!hasDominanceData) {
            const { data } = await window.sb.from('war_points').select('map_id, faction, points').eq('week_id', weekId);
            if (data) {
               const ptsMap = {};
               data.forEach(d => {
                 if (!ptsMap[d.map_id]) ptsMap[d.map_id] = { union: 0, poder: 0 };
                 ptsMap[d.map_id][d.faction] += d.points;
               });
               for (const mId in ptsMap) {
                 if (ptsMap[mId].union > ptsMap[mId].poder) mapWinners[mId] = 'union';
                 else if (ptsMap[mId].poder > ptsMap[mId].union) mapWinners[mId] = 'poder';
               }
            }
          }
        }
      } catch(e) { console.warn("Failed to load map winners", e); }

      // MAP GRID
      html += `<div class="map-list">`;

      const domBadgeHtml = (locId) => {
        let htmlSnippet = '';
        
        // Faction Logo indicating possession
        const winner = mapWinners[locId];
        if (winner) {
          const glow = isWeekend ? (winner === 'union' ? `drop-shadow(0 0 10px rgba(59,130,246,1))` : `drop-shadow(0 0 10px rgba(239,68,68,1))`) : 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))';
          const opacity = isWeekend ? '1' : '0.85';
          const logoSrc = winner === 'union' ? 'assets/factions/union.png' : 'assets/factions/poder.png';
          htmlSnippet += `<img src="${logoSrc}" title="${winner === 'union' ? 'Lidera Unión' : 'Lidera Poder'}" style="position:absolute; top:65px; left:10px; width:28px; height:28px; object-fit:contain; z-index:9; opacity:${opacity}; filter:${glow}; pointer-events:none; animation: pulse 2s infinite;">`;
        }

        if (!state.faction) return htmlSnippet;
        const isCaptured = (state.dailyGuardianCaptures || []).includes(locId);
        const guardian = typeof getGuardianForMap === 'function' ? getGuardianForMap(locId) : null;
        
        if (guardian) {
          const spriteId = POKEMON_SPRITE_IDS ? POKEMON_SPRITE_IDS[guardian.id] : 1;
          const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteId || 1}.png`;
          const labelClass = isCaptured ? 'guardian-label captured' : 'guardian-label';
          const labelText = isCaptured ? 'DERROTADO' : 'GUARDIÁN';
          const spriteClass = isCaptured ? 'guardian-mini-sprite captured' : 'guardian-mini-sprite';

          htmlSnippet += `
            <div class="guardian-status-badge" title="${isCaptured ? 'Guardián ya derrotado hoy' : 'Guardián disponible'}">
              <img src="${spriteUrl}" class="${spriteClass}" alt="Guardian">
              <span class="${labelClass}">${labelText}</span>
            </div>
          `;
        } else if (state.activeBonuses && state.activeBonuses[locId]) {
          htmlSnippet += `<span class="dom-badge dominance winning" title="Bono Activo (+25% EXP / x2 Shiny)" style="position:absolute; bottom:8px; right:8px; z-index:2;">👑 Dominado <span class="bonus-icon">✨</span></span>`;
        }
        return htmlSnippet;
      };

      FIRE_RED_MAPS.forEach(loc => {
        let isLocked = badgeCount < loc.badges;
        const safariActive = (state.safariTicketSecs || 0) > 0;
        const isSafariTicketLocked = loc.id === 'safari_zone' && !safariActive;
        if (loc.id === 'safari_zone') isLocked = isSafariTicketLocked;
        if (loc.id === 'cerulean_cave' && state.ceruleanTicketSecs > 0) isLocked = false;

        const imgPath = `maps/${MAP_IMAGE_MAPPING[loc.id] || 'default.png'}`;

        // Determine current cycle's wild Pokémon
        const currentCycleWild = loc.wild[cycle] || loc.wild.day || [];
        const baseWild = loc.wild.day || [];
        
        let genericSpawns = [];
        let specificSpawns = [];
        
        currentCycleWild.forEach(id => {
            if (baseWild.includes(id)) {
                genericSpawns.push(id);
            } else {
                specificSpawns.push(id);
            }
        });
        
        const fishingPool = loc.fishing ? loc.fishing.pool : [];
        fishingPool.forEach(id => {
            if (!genericSpawns.includes(id) && !specificSpawns.includes(id)) {
                genericSpawns.push(id);
            }
        });

        // Collect rates for active spawns to assign rarity visuals
        const minActiveRate = {};
        const processActiveRates = (pool, rates) => {
          if (!pool || !rates) return;
          pool.forEach((id, index) => {
            const rate = rates[index] || 0;
            if (minActiveRate[id] === undefined || rate < minActiveRate[id]) {
              minActiveRate[id] = rate;
            }
          });
        };
        processActiveRates(currentCycleWild, loc.rates ? (loc.rates[cycle] || loc.rates.day) : null);
        if (loc.fishing) processActiveRates(loc.fishing.pool, loc.fishing.rates);

        const sortByRateFn = (a, b) => (minActiveRate[b] || 0) - (minActiveRate[a] || 0);
        genericSpawns.sort(sortByRateFn);
        specificSpawns.sort(sortByRateFn);

        const anyRare = [...genericSpawns, ...specificSpawns].some(id => minActiveRate[id] < 10);
        const renderSpritesHTML = (ids) => ids.map(id => {
          const isRare = anyRare && (minActiveRate[id] < 10);
          return getPokemonSpriteHtml(id, isRare);
        }).join('');

        html += `
          <div class="location-card map-card ${isLocked ? 'locked' : ''} ${isSafariTicketLocked ? 'safari-locked' : ''}" 
               onclick="${isLocked ? '' : `goLocation('${loc.id}')`}"
               style="--bg-image: url('${imgPath}')">
            
            <span class="location-tag ${isLocked ? 'tag-locked' : 'tag-wild'}">
              ${isLocked ? (loc.id === 'safari_zone' ? `🔒 Ticket Safari` : `🔒 ${loc.badges} Medallas`) : `${cycle === 'night' ? '🌙' : '☀️'} ${translateCycle(cycle)}`}
            </span>

            ${loc.fishing ? '<span class="fishing-rod">🎣</span>' : ''}
            ${domBadgeHtml(loc.id)}

            <div class="location-name">
              ${loc.name}
              ${state.playerClass === 'rocket' && (state.classLevel || 1) >= 15 && state.classData?.extortedRouteId === loc.id ? '<span style="color:#ef4444;margin-left:5px;font-weight:bold;text-shadow:0 0 5px #ef4444;" title="Ruta Extorsionada (x1.5 ₽ en batallas NPC)">[R]</span>' : ''}
              ${state.playerClass === 'entrenador' && (state.classLevel || 1) >= 15 && state.classData?.officialRouteId === loc.id && (state.classData?.officialRouteExp || 0) > Date.now() ? '<span style="color:#3b82f6;margin-left:5px;font-weight:bold;text-shadow:0 0 5px #3b82f6;" title="Ruta Oficial Activa (+1 REP por combate)">[O]</span>' : ''}
            </div>
            <div class="location-desc">${loc.desc}</div>
            ${state.playerClass === 'entrenador' && (state.classLevel || 1) >= 15 && state.classData?.officialRouteId !== loc.id && state.classData?.lastOfficialRouteDate !== today ? `
              <button onclick="event.stopPropagation(); activateOfficialRoute('${loc.id}')" 
                style="margin-top:5px;padding:4px 8px;font-size:9px;background:rgba(59,130,246,0.2);color:#60a5fa;border:1px solid rgba(59,130,246,0.4);border-radius:4px;cursor:pointer;">
                📍 Marcar Oficial
              </button>
            ` : ''}
            ${isSafariTicketLocked ? `<div class="safari-lock-msg">Necesitas un Ticket Safari</div>` : ''}
            ${!isLocked ? `
              <div class="location-spawns">
                <div class="spawn-row">
                  ${renderSpritesHTML(genericSpawns)}
                </div>
                ${specificSpawns.length > 0 ? `
                  <div class="spawn-row cycle-specific-spawns">
                    <span class="cycle-emoji-label">${CYCLE_ICONS[cycle] || '☀️'}</span>
                    ${renderSpritesHTML(specificSpawns)}
                  </div>
                ` : ''}
              </div>
            ` : ''}
          </div>
        `;
      });

      html += `</div>`; // Close map-list grid container

        container.innerHTML = html;
        console.log(`[renderMaps] Renderizado completado. HTML inyectado en #map-list`);
      } catch (err) {
        console.error("[renderMaps] Error crítico durante el renderizado:", err);
      }
}

    // ===== LOCATION / WILD BATTLE =====
    async function goLocation(locId) {
        if (window.isGoingLocation) return;
        window.isGoingLocation = true;
        setTimeout(() => { window.isGoingLocation = false; }, 1000); // 1s debounce
        
        window.currentEncounterMapId = locId;
	      const alive = state.team.filter(p => p.hp > 0 && !p.onMission);
	      if (alive.length === 0) {
	        notify('¡Todos tus Pokémon están debilitados! Curá tu equipo primero.', '❤️‍🩹');
	        return;
	      }
	
	      hatchEggs(); // Progress eggs on EACH click
	
	      const loc = FIRE_RED_MAPS.find(l => l.id === locId);
	      if (!loc) return;
	      const badgeCount = (Array.isArray(state.badges) ? state.badges.length : (parseInt(state.badges) || 0));
	      let accessDenied = badgeCount < loc.badges;
	      
	      // Ticket Overrides
	      if (locId === 'safari_zone') accessDenied = (state.safariTicketSecs || 0) <= 0;
	      if (locId === 'cerulean_cave' && state.ceruleanTicketSecs > 0) accessDenied = false;

	      if (accessDenied) {
        if (locId === 'safari_zone') {
          notify('<span style="color:#ff4d4d">Necesitas un Ticket Safari</span>', '🎫');
        } else {
          notify(`¡Necesitás ${loc.badges} medallas para acceder!`, '🔒');
        }
        return;
      }

      // DEFENSA DE FIN DE SEMANA: Chance de encontrar un defensor del bando contrario
      if (typeof tryTriggerDefenderBattle === 'function') {
        const triggered = await tryTriggerDefenderBattle(locId);
        if (triggered) return; // Si saltó la batalla de defensor, detenemos el resto
      }

      // DOMINANCIA: Verificar Guardián
      if (typeof tryTriggerGuardian === 'function') {
        const guardian = await tryTriggerGuardian(locId);
        if (guardian) {
          const enemy = makePokemon(guardian.id, guardian.lv);
          enemy.isGuardian = true;
          enemy.guardianPts = guardian.pts;
          // Asignar el aura basándose en la facción actual para el encuentro salvaje
          enemy.aura = (state.faction === 'poder' ? 'white' : 'black');
          
          startBattle(enemy, false, false, locId);
          return; // Salir, el combate de guardián ya inició
        }
      }

	      // Chance de Rival (En cualquier mapa)
	      let rivalChance = GAME_RATIOS.encounters.rival * (typeof getEventBonus === 'function' ? getEventBonus('rival') : 1);
	      if (state.playerClass === 'entrenador' && (state.classLevel || 1) >= 20) {
	        if (typeof checkAllGymsHardBeaten === 'function' && checkAllGymsHardBeaten()) {
	          rivalChance *= 2;
	        }
	      }
	      
	      if (Math.random() < rivalChance) {
	        triggerRivalSequence(locId);
	        return;
	      }
	
	      // Nueva Lógica de Repelente Estratégico
	      let repelActive = (state.repelSecs || 0) > 0;
	      let firstPokemon = state.team[0];
	
	      // Si el repelente está activo, garantizamos un encuentro (Entrenador o Pokémon de nivel adecuado)
	      if (repelActive) {
	        // Probabilidad de entrenador bajo repelente
	        if (Math.random() < GAME_RATIOS.encounters.trainerRepel) {
	          generateTrainerBattle(locId);
	          return;
	        }
	
	        const cycle = getDayCycle();
	        const wildPool = loc.wild[cycle] || loc.wild.day;
	        let wildRates = loc.rates[cycle] || loc.rates.day;
            if (typeof window.getEventSpeciesBoost === 'function') {
              wildRates = wildRates.map((r, i) => r * window.getEventSpeciesBoost(wildPool[i]));
            }
	
	        // Intentar encontrar un Pokémon de nivel adecuado (máximo 10 intentos para evitar bucles infinitos)
	        for (let attempt = 0; attempt < 10; attempt++) {
	          const totalRate = wildRates.reduce((a, b) => a + b, 0);
	          let rand = Math.random() * totalRate;
	          let cumulative = 0;
	          let selectedId = wildPool[0];
	
	          for (let i = 0; i < wildPool.length; i++) {
	            cumulative += wildRates[i] || 0;
	            if (rand <= cumulative) {
	              selectedId = wildPool[i];
	              break;
	            }
	          }
	
	          const level = Math.floor(Math.random() * (loc.lv[1] - loc.lv[0] + 1)) + loc.lv[0];
	          
	          // Si el nivel es adecuado, iniciamos la batalla
	          if (!firstPokemon || level >= firstPokemon.level) {
	            const enemy = makePokemon(selectedId, level);
	            startBattle(enemy, false, null, locId);
	            return;
	          }
	        }
	        
	        // Si después de 10 intentos no sale uno de nivel alto, forzamos un entrenador para no romper la promesa de "encuentro garantizado"
	        generateTrainerBattle(locId);
	        return;
	      }
	
	      // Lógica normal sin repelente
          const eventTrainerMult = (typeof getEventBonus === 'function' ? getEventBonus('trainer') : 1);
	      const tChance = Math.min(state.trainerChance || GAME_RATIOS.encounters.trainerBase, GAME_RATIOS.encounters.trainerMax) * eventTrainerMult;
	      if (Math.random() * 100 < tChance) {
	        generateTrainerBattle(locId);
	        return;
	      }
	
	      // Encuentro de Pesca
          const eventFishingMult = (typeof getEventBonus === 'function' ? getEventBonus('fishing') : 1);
	      if (loc.fishing && Math.random() < GAME_RATIOS.encounters.fishing * eventFishingMult) {
	        generateFishingBattle(locId);
	        return;
	      }
	
      const cycle = getDayCycle();
      let wildPool = loc.wild[cycle] || loc.wild.day;
      let wildRates = loc.rates[cycle] || loc.rates.day;

      // Lógica de Incienso
      if (state.incenseSecs > 0 && state.incenseType) {
        const filteredIndices = wildPool.map((id, idx) => {
          const pData = POKEMON_DB[id];
          return (pData && pData.type === state.incenseType) ? idx : -1;
        }).filter(idx => idx !== -1);

        if (filteredIndices.length > 0) {
          wildPool = filteredIndices.map(idx => wildPool[idx]);
          wildRates = filteredIndices.map(idx => wildRates[idx]);
        }
      }
      if (typeof window.getEventSpeciesBoost === 'function') {
        wildRates = wildRates.map((r, i) => r * window.getEventSpeciesBoost(wildPool[i]));
      }

      // Habilidad Cazabichos: Aroma Atractivo (se desbloquea en Nv. 15 de entrenador)
      if (state.playerClass === 'cazabichos' && (state.trainerLevel || 1) >= 15) {
        const isSafari = locId === 'safari_zone';
        const attractProb = isSafari ? 0.10 : 0.005;
        if (Math.random() < attractProb) {
          const attractId = Math.random() < 0.5 ? 'scyther' : 'pinsir';
          const level = Math.floor(Math.random() * (loc.lv[1] - loc.lv[0] + 1)) + loc.lv[0];
          const enemy = makePokemon(attractId, level);
          notify(`¡Tu Aroma Atractivo ha atraído a un ${attractId.toUpperCase()}!`, '🌸');
          startBattle(enemy, false, null, locId);
          return;
        }
      }

      // Special Legendary Ticket Spawns
	      if (locId === 'seafoam_islands' && state.articunoTicketSecs > 0 && Math.random() < GAME_RATIOS.encounters.legendaryArticuno) {
	        const enemy = makePokemon('articuno', 50);
	        startBattle(enemy, false, null, locId);
	        return;
	      }
	      if (locId === 'cerulean_cave' && state.mewtwoTicketSecs > 0 && Math.random() < GAME_RATIOS.encounters.legendaryMewtwo) {
	        const enemy = makePokemon('mewtwo', 70);
	        startBattle(enemy, false, null, locId);
	        return;
	      }

	      const totalRate = wildRates.reduce((a, b) => a + b, 0);
	      let rand = Math.random() * totalRate;
	      let cumulative = 0;
	      let selectedId = wildPool[0];
	
	      for (let i = 0; i < wildPool.length; i++) {
	        cumulative += wildRates[i] || 0;
	        if (rand <= cumulative) {
	          selectedId = wildPool[i];
	          break;
	        }
	      }
	
	      const level = Math.floor(Math.random() * (loc.lv[1] - loc.lv[0] + 1)) + loc.lv[0];
	      const enemy = makePokemon(selectedId, level);
	      startBattle(enemy, false, null, locId);
	    }

	    function triggerRivalSequence(locId) {
	      const flicker = document.createElement('div');
	      flicker.className = 'rival-flicker';
	      document.body.appendChild(flicker);
	
	      const excl = document.createElement('div');
	      excl.className = 'rival-exclamation';
	      excl.textContent = '!';
	      document.body.appendChild(excl);
	
	      setTimeout(() => {
	        flicker.remove();
	        excl.remove();
	        generateRivalBattle(locId);
	      }, 1200);
	    }
	
	    function generateFishingBattle(locId) {
	      const loc = FIRE_RED_MAPS.find(l => l.id === locId);
	      if (!loc || !loc.fishing) return;
	
	      const pool = loc.fishing.pool;
          let rates = loc.fishing.rates.slice();
          if (typeof window.getEventSpeciesBoost === 'function') {
            rates = rates.map((r, i) => r * window.getEventSpeciesBoost(pool[i]));
          }
	      const lv = loc.fishing.lv;
	      const totalRate = rates.reduce((a, b) => a + b, 0);
	      let rand = Math.random() * totalRate;
	      let cumulative = 0;
	      let selectedIdx = 0;
	
	      for (let i = 0; i < pool.length; i++) {
	        cumulative += rates[i];
	        if (rand <= cumulative) {
	          selectedIdx = i;
	          break;
	        }
	      }
	
	      const selectedId = pool[selectedIdx];
	      const rarity = (rates[selectedIdx] / totalRate) * 100;
	      const level = Math.floor(Math.random() * (lv[1] - lv[0] + 1)) + lv[0];
	      const enemy = makePokemon(selectedId, level);
	
	      // Modal Intro Pesca
	      const introOv = document.createElement('div');
	      introOv.id = 'fishing-intro-overlay';
	      introOv.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .3s ease;';
	      introOv.innerHTML = `
	        <div style="background:var(--card);border-radius:24px;padding:32px;max-width:380px;width:100%;
	          border:2px solid var(--blue);text-align:center;position:relative;box-shadow:0 0 30px rgba(10, 132, 255, 0.4);">
	          <div style="font-size:80px;margin-bottom:20px;animation:bounce 1.5s infinite;">🎣</div>
	          <div style="font-family:\'Press Start 2P\',monospace;font-size:12px;color:var(--blue);margin-bottom:16px;">¡ALGO PICÓ!</div>
	          <div style="font-size:14px;color:#eee;margin:16px 0;line-height:1.6;">¡Un Pokémon ha mordido el anzuelo!</div>
	          <button id="fishing-start-btn" style="font-family:\'Press Start 2P\',monospace;font-size:10px;padding:16px 32px;border:none;border-radius:14px;
	            cursor:pointer;background:linear-gradient(135deg,var(--blue),#2563eb);color:#fff;
	            box-shadow:0 4px 16px rgba(59,130,246,0.5);margin-top:12px;width:100%;">
	            🎣 ¡MINIJUEGO DE PESCA!
	          </button>
	        </div>`;
	      document.body.appendChild(introOv);
	
	      document.getElementById('fishing-start-btn').onclick = () => {
	        introOv.remove();
	        startFishingMinigame(enemy, rarity, locId);
	      };
	    }
	
	    function startFishingMinigame(enemy, rarity, locId) {
	      const overlay = document.createElement('div');
	      overlay.id = 'fishing-game-overlay';
	      
	      const barHeight = Math.max(45, Math.min(110, rarity * 2.5)); 
	      const fishSpeedBase = Math.max(1.5, Math.min(4.5, 12 / rarity));
	      const progressGain = Math.max(0.15, Math.min(0.4, rarity / 25));
	      const progressLoss = 0.25;
	
	      overlay.innerHTML = `
	        <div class="fishing-game-container">
	          <div class="fishing-title">Pescando...</div>
	          <div class="fishing-area" id="fishing-area">
	            <div class="fishing-bar" id="fishing-bar" style="height: ${barHeight}px; top: 200px;"></div>
	            <div class="fishing-fish" id="fishing-fish" style="top: 150px;">🐟</div>
	          </div>
	          <div class="fishing-progress-wrap">
	            <div class="fishing-progress-fill" id="fishing-progress"></div>
	          </div>
	          <div class="fishing-hint">
	            Mantén <span>CLICK</span> para subir<br>Suelta para bajar
	          </div>
	        </div>
	      `;
	      document.body.appendChild(overlay);
	
	      const bar = document.getElementById('fishing-bar');
	      const fish = document.getElementById('fishing-fish');
	      const progressFill = document.getElementById('fishing-progress');
	      const areaHeight = 350;
	
	      let barTop = 200;
	      let barVel = 0;
	      let fishTop = 150;
	      let fishVel = 0;
	      let fishTargetTop = 150;
	      let progress = 30;
	      let isPressing = false;
	      let gameActive = true;
	      let lastTime = performance.now();
	
	      // Eventos
	      const startPress = (e) => { e.preventDefault(); isPressing = true; };
	      const endPress = (e) => { e.preventDefault(); isPressing = false; };
	      overlay.addEventListener('mousedown', startPress);
	      overlay.addEventListener('mouseup', endPress);
	      overlay.addEventListener('touchstart', startPress, {passive: false});
	      overlay.addEventListener('touchend', endPress, {passive: false});
	
	      function update(time) {
	        if (!gameActive) return;
	        const dt = (time - lastTime) / 16.66; // Normalizado a 60fps
	        lastTime = time;
	
	        // --- Física de la Barra ---
	        // Gravedad y Empuje balanceados
	        if (isPressing) barVel -= 0.5 * dt;
	        else barVel += 0.35 * dt;
	        
	        barVel *= Math.pow(0.96, dt); // Fricción suavizada
	        barTop += barVel * dt;
	
	        if (barTop < 0) { barTop = 0; barVel *= -0.2; } // Rebote suave arriba
	        if (barTop > areaHeight - barHeight) { barTop = areaHeight - barHeight; barVel *= -0.2; } // Rebote suave abajo
	        bar.style.top = barTop + 'px';
	
	        // --- Inteligencia del Pez ---
	        // El pez busca un objetivo y acelera hacia él de forma más orgánica
	        if (Math.abs(fishTop - fishTargetTop) < 10 || Math.random() < 0.01) {
	          fishTargetTop = Math.random() * (areaHeight - 40);
	        }
	        
	        const dist = fishTargetTop - fishTop;
	        const fishAccl = (dist > 0 ? 1 : -1) * 0.15 * fishSpeedBase;
	        fishVel += fishAccl * dt;
	        fishVel *= Math.pow(0.92, dt); // El pez tiene más "agua" (fricción)
	        fishTop += fishVel * dt;
	        
	        // Mantener dentro del área
	        if (fishTop < 0) { fishTop = 0; fishVel = 0; }
	        if (fishTop > areaHeight - 35) { fishTop = areaHeight - 35; fishVel = 0; }
	        fish.style.top = fishTop + 'px';
	
	        // --- Detección de Captura ---
	        const fishCenter = fishTop + 15;
	        const inZone = fishCenter >= barTop && fishCenter <= barTop + barHeight;
	        
	        if (inZone) {
	          progress += progressGain * dt;
	          bar.style.borderColor = 'var(--green)';
	          bar.style.boxShadow = '0 0 20px var(--green)';
	        } else {
	          progress -= progressLoss * dt;
	          bar.style.borderColor = 'rgba(255, 69, 58, 0.8)';
	          bar.style.boxShadow = 'none';
	        }
	
	        progress = Math.max(0, Math.min(100, progress));
	        progressFill.style.width = progress + '%';
	
	        if (progress >= 100) { gameActive = false; finish(true); }
	        else if (progress <= 0) { gameActive = false; finish(false); }
	        else requestAnimationFrame(update);
	      }
	
	      function finish(win) {
	        overlay.removeEventListener('mousedown', startPress);
	        overlay.removeEventListener('mouseup', endPress);
	        overlay.removeEventListener('touchstart', startPress);
	        overlay.removeEventListener('touchend', endPress);
	
	        if (win) {
	          notify('¡Lo atrapaste!', '🎣');
	          overlay.style.animation = 'scaleOut .3s ease forwards';
	          setTimeout(() => {
	            overlay.remove();
	            startBattle(enemy, false, null, locId);
	            if (state.battle) state.battle.isFishing = true;
	          }, 300);
	        } else {
	          notify('¡El Pokémon se escapó!', '💨');
	          overlay.style.animation = 'scaleOut .3s ease forwards';
	          setTimeout(() => overlay.remove(), 300);
	        }
	      }
	
	      requestAnimationFrame(update);
	    }



    // ===== GYM BATTLE =====
    function challengeGym(gymId, difficulty = 'easy') {
      const gym = GYMS.find(g => g.id === gymId);
      const alive = state.team.filter(p => p.hp > 0 && !p.onMission);
      if (alive.length === 0) {
        notify('¡Todos tus Pokémon están debilitados!', '❤️‍🩹');
        return;
      }

      // Daily attempt limit logic
      const d = getGMT3Date();
      const today = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const progress = state.gymProgress?.[gymId] || (state.defeatedGyms?.includes(gymId) ? 1 : 0);
      const hasAttemptedToday = state.lastGymAttempts?.[gymId] === today;
      const isFirstEasyAttempt = progress === 0;

      if (hasAttemptedToday && !isFirstEasyAttempt) {
        notify(`Ya agotaste tu intento diario contra ${gym.leader}. ¡Vuelve mañana!`, '🚫');
        return;
      }
      
      const teamData = gym.difficulties?.[difficulty] || { pokemon: gym.pokemon, levels: gym.levels };

      // Show leader intro overlay before battle
      const introOv = document.createElement('div');
      introOv.id = 'gym-intro-overlay';
      introOv.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .3s ease;';
      
      const diffLabel = { easy: 'FÁCIL', normal: 'NORMAL', hard: 'DIFÍCIL' }[difficulty] || 'FÁCIL';

      introOv.innerHTML = `
        <div style="background:var(--card);border-radius:24px;padding:32px;max-width:380px;width:100%;
          border:2px solid ${gym.typeColor}55;text-align:center;position:relative;">
          <button onclick="document.getElementById('gym-intro-overlay').remove()"
            style="position:absolute;top:12px;right:14px;background:rgba(255,255,255,0.08);border:none;
            border-radius:8px;color:var(--gray);font-size:18px;cursor:pointer;width:32px;height:32px;
            display:flex;align-items:center;justify-content:center;line-height:1;">✕</button>
          <img src="${gym.sprite}" alt="${gym.name}"
            style="height:140px;width:auto;image-rendering:pixelated;margin-bottom:12px;
            filter:drop-shadow(0 4px 16px ${gym.typeColor}88);"
            onerror="this.outerHTML='<div style=\'font-size:80px;\'>${gym.badge}</div>'">
          <div style="font-family:'Press Start 2P',monospace;font-size:11px;color:${gym.typeColor};margin-bottom:6px;">${gym.leader}</div>
          <div style="font-size:10px;color:var(--gray);margin-bottom:4px;font-family:'Press Start 2P',monospace;">MODO ${diffLabel}</div>
          <div style="font-size:12px;color:var(--gray);margin-bottom:6px;">Líder del ${gym.name}</div>
          <div style="font-size:13px;color:#eee;margin:16px 0;line-height:1.6;font-style:italic;">"${gym.quote}"</div>
          <button id="gym-intro-btn" style="font-family:'Press Start 2P',monospace;font-size:9px;padding:14px 28px;border:none;border-radius:14px;
            cursor:pointer;background:linear-gradient(135deg,${gym.typeColor},${gym.typeColor}99);color:#fff;
            box-shadow:0 4px 16px ${gym.typeColor}55;margin-top:8px;">
            ⚔️ ¡A PELEAR!
          </button>
        </div>`;
      document.body.appendChild(introOv);
      
      document.getElementById('gym-intro-btn').onclick = () => {
        introOv.remove();

        // Record the attempt for today
        state.lastGymAttempts = state.lastGymAttempts || {};
        state.lastGymAttempts[gymId] = today;
        
        // Generate full team base on selected difficulty
        const enemyTeam = teamData.pokemon.map((id, i) => {
          const p = makePokemon(id, teamData.levels[i]);
          if (i === teamData.pokemon.length - 1) {
            // Ace gets additional info
            p._gymLeader = gym.leader;
            p._gymBadge = gym.badge;
            p.name = `${p.name} (${gym.leader})`;
          }
          return p;
        });

        const firstEnemy = enemyTeam[0];
        firstEnemy._revealed = true;
        
        startBattle(firstEnemy, true, gymId, 'gym', false, enemyTeam);
        if (state.battle) {
          state.battle.difficulty = difficulty;
        }
      };
    }


    // ===== SPRITE ANIMATIONS =====
    function getSpriteEl(side) {
      // returns whichever element is visible (img or emoji)
      const img = document.getElementById(side + '-sprite-img');
      const emo = document.getElementById(side + '-sprite-emoji');
      return (img && img.style.display !== 'none') ? img : emo;
    }

    function animateAttack(attackerSide, cb) {
      const el = getSpriteEl(attackerSide);
      if (!el) { if (cb) cb(); return; }
      const cls = attackerSide === 'player' ? 'anim-attack-right' : 'anim-attack-left';
      el.classList.remove(cls, 'anim-damage', 'anim-shake');
      void el.offsetWidth; // reflow
      el.classList.add(cls);
      let called = false;
      const done = () => {
        if (called) return;
        called = true;
        el.classList.remove(cls);
        if (cb) cb();
      };
      el.addEventListener('animationend', done, { once: true });
      setTimeout(done, 700); // fallback: si animationend no se dispara, continúa igual
    }

    function animateDamage(targetSide, faint) {
      const el = getSpriteEl(targetSide);
      if (!el) return;
      const cls = faint ? 'anim-faint' : 'anim-damage';
      el.classList.remove('anim-damage', 'anim-faint', 'anim-shake');
      void el.offsetWidth;
      el.classList.add(cls);
      if (!faint) el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
    }

