    // ===== LOCATION / WILD BATTLE =====
    async function renderMaps() {
      const container = document.getElementById('map-list');
      if (!container) return;
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
        mansion: 'mansion pokemon.png',
        route23: 'ruta 23.png',
        victory_road: 'calle victoria.png',
        cerulean_cave: 'cueva celeste.png'
      };

      let eggCount = 0;
      let interactionCount = state.totalNotifications || 0;
      
      if (currentUser) {
        try {
          const { count } = await sb.from('eggs').select('egg_id', { count: 'exact', head: true }).eq('player_id', currentUser.id);
          eggCount = count || 0;
        } catch (e) { console.error("Error fetching eggs:", e); }
      }

      const spriteImg = (id) => {
        const num = POKEMON_SPRITE_IDS[id];
        const pData = POKEMON_DB[id];
        const name = pData?.name || id;
        if (!num) return '';
        return `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${num}.png"
          title="${name}" width="32" height="32"
          onerror="this.style.display='none'">`;
      };

      let html = '';

      // PC Bar (Remains similar but styled for cinematic feel if needed)
      // For now, let's keep it clean as requested for maps specifically
      html += `
        <div class="pc-split-container">
          <div class="pc-left">
            <div class="location-card" onclick="openPokemonCenter()" style="height: 180px; background: linear-gradient(135deg,#200,#400);">
               <div class="location-info-card" style="bottom: 10px; left: 10px; right: 10px; padding: 10px;">
                  <div class="location-top-row">
                    <span class="location-cycle-badge" style="color:#ff6496;">🏥</span>
                    <span style="font-family:'Press Start 2P',monospace; font-size:10px; color:#ff6496;">Centro Pokémon</span>
                  </div>
                  <div style="font-size:11px; color:#ccc; margin-top:5px;">Curá a tu equipo al instante.</div>
               </div>
            </div>
          </div>
          <div class="pc-right">
             <!-- Placeholder for other banners if needed, but let's focus on map grid -->
             <div class="pc-banner" onclick="showTab('daycare')">
                <span>🥚</span><span>Huevos: ${eggCount}</span>
             </div>
             <div class="pc-banner" onclick="showTab('friends')">
                <span>👥</span><span>Amigos: ${interactionCount}</span>
             </div>
          </div>
        </div>
      `;

      FIRE_RED_MAPS.forEach(loc => {
        let isLocked = badgeCount < loc.badges;
        if (loc.id === 'safari_zone' && state.safariTicketSecs > 0) isLocked = false;
        if (loc.id === 'cerulean_cave' && state.ceruleanTicketSecs > 0) isLocked = false;

        const availableWild = loc.wild[cycle] || loc.wild.day;
        const slotMeta = {
          morning: { icon: '🌅', label: 'Alba' },
          day: { icon: '☀️', label: 'Día' },
          dusk: { icon: '🌆', label: 'Tarde' },
          night: { icon: '🌙', label: 'Noche' },
        };

        const imgPath = `maps/${MAP_IMAGE_MAPPING[loc.id] || 'default.png'}`;

        html += `
          <div class="location-card ${isLocked ? 'locked' : ''}" onclick="${isLocked ? '' : `goLocation('${loc.id}')`}">
            <img src="${imgPath}" class="location-card-img" alt="${loc.name}">
            
            <div class="location-info-card">
              <div class="location-top-row">
                ${!isLocked ? `
                  <div class="location-cycle-badge">${slotMeta[cycle].icon} ${slotMeta[cycle].label}</div>
                  ${loc.fishing ? '<div class="fishing-indicator">🎣</div>' : ''}
                ` : `
                  <div class="location-lock-tag">🔒 Requisito: ${loc.badges} Medallas</div>
                `}
              </div>

              ${!isLocked ? `
                <div class="location-spawn-list">
                  ${availableWild.slice(0, 6).map(id => spriteImg(id)).join('')}
                  ${availableWild.length > 6 ? `<span style="font-size:10px; color:#aaa; margin-left:4px;">+${availableWild.length - 6}</span>` : ''}
                </div>
              ` : ''}
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    }

    // ===== LOCATION / WILD BATTLE =====
	    function goLocation(locId) {
	      const alive = state.team.filter(p => p.hp > 0);
	      if (alive.length === 0) {
	        notify('¡Todos tus Pokémon están debilitados! Curá tu equipo primero.', '❤️‍🩹');
	        return;
	      }
	
	      hatchEggs(); // Progress eggs on EACH click
	
	      const loc = FIRE_RED_MAPS.find(l => l.id === locId);
	      if (!loc) return;
	
	      const badgeCount = state.badges;
	      let accessDenied = badgeCount < loc.badges;
	      
	      // Ticket Overrides
	      if (locId === 'safari_zone' && state.safariTicketSecs > 0) accessDenied = false;
	      if (locId === 'cerulean_cave' && state.ceruleanTicketSecs > 0) accessDenied = false;

	      if (accessDenied) {
	        notify(`¡Necesitás ${loc.badges} medallas para acceder!`, '🔒');
	        return;
	      }

	      // Chance de Rival (En cualquier mapa)
	      if (Math.random() < GAME_RATIOS.encounters.rival) {
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
	        const wildRates = loc.rates[cycle] || loc.rates.day;
	
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
	      const tChance = Math.min(state.trainerChance || GAME_RATIOS.encounters.trainerBase, GAME_RATIOS.encounters.trainerMax);
	      if (Math.random() * 100 < tChance) {
	        generateTrainerBattle(locId);
	        return;
	      }
	
	      // Encuentro de Pesca
	      if (loc.fishing && Math.random() < GAME_RATIOS.encounters.fishing) {
	        generateFishingBattle(locId);
	        return;
	      }
	
	      const cycle = getDayCycle();
	      const wildPool = loc.wild[cycle] || loc.wild.day;
	      const wildRates = loc.rates[cycle] || loc.rates.day;
	
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
	
	      const { pool, rates, lv } = loc.fishing;
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
      const alive = state.team.filter(p => p.hp > 0);
      if (alive.length === 0) {
        notify('¡Todos tus Pokémon están debilitados!', '❤️‍🩹');
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

