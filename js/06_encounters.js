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

        // Helper: render a small Pokémon sprite with emoji fallback
        const spriteImg = (id) => {
          const num = POKEMON_SPRITE_IDS[id];
          const pData = POKEMON_DB[id];
          const name = pData?.name || id;
          const emoji = pData?.emoji || '❓';
          if (!num) return `<span title="${name}" style="font-size:18px;line-height:1;">${emoji}</span>`;
          return `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${num}.png"
            title="${name}" width="32" height="32"
            style="image-rendering:pixelated;"
            onerror="this.outerHTML='<span style=\\'font-size:18px;line-height:1;\\'>${emoji}</span>'">`;
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

      // Random Trainer encounter check - Capped at 20% to ensure wild mons always show
      const tChance = Math.min(state.trainerChance || 5, 20);
      if (Math.random() * 100 < tChance) {
        generateTrainerBattle(locId);
        return;
      }

      const loc = FIRE_RED_MAPS.find(l => l.id === locId);
      if (!loc) return;

      const badgeCount = state.badges;
      if (badgeCount < loc.badges) {
        notify(`¡Necesitás ${loc.badges} medallas para acceder!`, '🔒');
        return;
      }

      const cycle = getDayCycle();
      const wildPool = loc.wild[cycle] || loc.wild.day;
      const wildRates = loc.rates[cycle] || loc.rates.day;

      // Selección por probabilidad (Rates) dinámica
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
      el.addEventListener('animationend', () => { el.classList.remove(cls); if (cb) cb(); }, { once: true });
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

