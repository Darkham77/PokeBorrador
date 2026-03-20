    // ===== LOCATION / WILD BATTLE =====
    function renderMaps() {
      const container = document.getElementById('map-list');
      if (!container) return;
      const cycle = getDayCycle();
      const badgeCount = (Array.isArray(state.badges) ? state.badges.length : (parseInt(state.badges) || 0));

      let html = '';

      // Siempre añadir el Centro Pokémon primero
      html += `<div class="location-card location-card-center" onclick="openPokemonCenter()"
            style="grid-column: 1 / -1; border-color:rgba(255,100,150,0.4);background:linear-gradient(135deg,#1a1a3e,#2a1a2e);margin-bottom:16px;">
            <span class="location-tag" style="background:rgba(255,100,150,0.2);color:#ff6496;">🏥 Curación</span>
            <div class="location-icon">🏥</div>
            <div class="location-name" style="color:#ff6496;">Centro Pokémon</div>
            <div class="location-desc">Saná a tus Pokémon y restaurá sus PP al máximo.</div>
          </div>`;

      FIRE_RED_MAPS.forEach(loc => {
        const isLocked = badgeCount < loc.badges;
        const availableWild = loc.wild[cycle] || loc.wild.day;

        // Build time slots preview — show which Pokémon are exclusive to each slot
        const allSlots = ['morning', 'day', 'dusk', 'night'];
        const slotMeta = {
          morning: { icon: '🌅', label: 'Alba', color: '#FFD93D' },
          day: { icon: '☀️', label: 'Día', color: '#FFEEAD' },
          dusk: { icon: '🌆', label: 'Crepúsculo', color: '#FF9632' },
          night: { icon: '🌙', label: 'Noche', color: '#9b4dca' },
        };

        // Pokémon exclusive to each slot (not in day pool)
        const dayPool = new Set(loc.wild.day || []);
        const exclusives = {};
        allSlots.forEach(slot => {
          if (slot === 'day') return;
          const pool = loc.wild[slot] || [];
          const ex = pool.filter(id => !dayPool.has(id));
          if (ex.length) exclusives[slot] = ex;
        });

        // Helper: render a small Pokémon sprite (sin fallback a emoji)
        const spriteImg = (id) => {
          const num = POKEMON_SPRITE_IDS[id];
          const pData = POKEMON_DB[id];
          const name = pData?.name || id;
          if (!num) return '';
          return `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${num}.png"
            title="${name}" width="32" height="32"
            style="image-rendering:pixelated;"
            onerror="this.style.display='none'">`;
        };

        const timeSlotsHtml = Object.entries(exclusives).map(([slot, ids]) => {
          const meta = slotMeta[slot];
          const active = slot === cycle;
          return `<div style="display:flex;align-items:center;gap:2px;padding:3px 6px;border-radius:8px;
            background:${active ? 'rgba(255,255,255,0.08)' : 'transparent'};
            border:1px solid ${active ? meta.color + '55' : 'transparent'};">
            <span style="font-size:10px;margin-right:2px;">${meta.icon}</span>
            <span style="font-size:8px;color:${meta.color};font-weight:${active ? '700' : '400'};margin-right:4px;white-space:nowrap;">${meta.label}:</span>
            ${ids.slice(0, 4).map(id => spriteImg(id)).join('')}
            ${ids.length > 4 ? `<span style="font-size:9px;color:#666;margin-left:2px;">+${ids.length - 4}</span>` : ''}
          </div>`;
        }).join('');

        html += `<div class="location-card ${isLocked ? 'locked' : ''}" onclick="${isLocked ? '' : `goLocation('${loc.id}')`}">
          ${loc.fishing ? '<span class="fishing-rod">🎣</span>' : ''}
          <span class="location-tag ${isLocked ? 'tag-locked' : 'tag-wild'}">${isLocked ? `🔒 ${loc.badges} Medallas` : `${slotMeta[cycle].icon} ${slotMeta[cycle].label}`}</span>
          <div class="location-icon">${loc.icon}</div>
          <div class="location-name">${loc.name}</div>
          <div class="location-desc">${loc.desc}</div>
          ${!isLocked ? `
          <div style="margin-top:8px;">
            <div style="font-size:8px;color:#666;margin-bottom:4px;">Ahora disponibles:</div>
            <div style="display:flex;flex-wrap:wrap;gap:0px;align-items:center;">
              ${availableWild.slice(0, 6).map(id => spriteImg(id)).join('')}
              ${availableWild.length > 6 ? `<span style="font-size:9px;color:#666;margin-left:4px;">+${availableWild.length - 6}</span>` : ''}
            </div>
          </div>
          ${timeSlotsHtml ? `<div style="margin-top:6px;display:flex;flex-direction:column;gap:2px;">${timeSlotsHtml}</div>` : ''}
          ` : ''}
        </div>`;
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
	      if (badgeCount < loc.badges) {
	        notify(`¡Necesitás ${loc.badges} medallas para acceder!`, '🔒');
	        return;
	      }
	
	      // Nueva Lógica de Repelente Estratégico
	      let repelActive = (state.repelSecs || 0) > 0;
	      let firstPokemon = state.team[0];
	
	      // Si el repelente está activo, garantizamos un encuentro (Entrenador o Pokémon de nivel adecuado)
	      if (repelActive) {
	        // 30% de probabilidad de entrenador bajo repelente (más alto de lo normal para incentivar su uso)
	        if (Math.random() < 0.3) {
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
	      const tChance = Math.min(state.trainerChance || 5, 20);
	      if (Math.random() * 100 < tChance) {
	        generateTrainerBattle(locId);
	        return;
	      }
	
	      // Encuentro de Pesca (10% de probabilidad)
	      if (loc.fishing && Math.random() < 0.1) {
	        generateFishingBattle(locId);
	        return;
	      }
	
	      const cycle = getDayCycle();
	      const wildPool = loc.wild[cycle] || loc.wild.day;
	      const wildRates = loc.rates[cycle] || loc.rates.day;
	
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
    function challengeGym(gymId) {
      const gym = GYMS.find(g => g.id === gymId);
      const alive = state.team.filter(p => p.hp > 0);
      if (alive.length === 0) {
        notify('¡Todos tus Pokémon están debilitados!', '❤️‍🩹');
        return;
      }
      // Show leader intro overlay before battle
      const introOv = document.createElement('div');
      introOv.id = 'gym-intro-overlay';
      introOv.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .3s ease;';
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
        
        // Generate full team
        const enemyTeam = gym.pokemon.map((id, i) => {
          const p = makePokemon(id, gym.levels[i]);
          if (i === gym.pokemon.length - 1) {
            // Ace gets additional info
            p._gymLeader = gym.leader;
            p._gymBadge = gym.badge;
            p.name = `${p.name} (${gym.leader})`;
          }
          return p;
        });

        // The first Pokémon to fight is the first in the array (not necessarily the ace)
        // Usually, the Ace is at the end. Pokemon games often start with the weakest.
        const firstEnemy = enemyTeam[0];
        firstEnemy._revealed = true;
        
        startBattle(firstEnemy, true, gymId, 'gym', false, enemyTeam);
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

