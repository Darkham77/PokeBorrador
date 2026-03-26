    // ===== GAME STATE =====
    const TRAINER_TYPES = {
      'caza_bichos': { name: 'Caza Bichos', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/bugcatcher.png', quote: '¡Mis Pokémon bicho son los más fuertes!', pool: ['caterpie', 'metapod', 'weedle', 'kakuna', 'paras', 'venonat'] },
      'ornitologo': { name: 'Ornitólogo', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/birdkeeper.png', quote: '¡Mis pájaros volarán alto sobre los tuyos!', pool: ['pidgey', 'spearow', 'doduo'] },
      'cientifico': { name: 'Científico', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/scientist.png', quote: '¡La ciencia pokémon es absoluta!', pool: ['magnemite', 'voltorb', 'ditto', 'grimer'] },
      'luchador': { name: 'Luchador', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/blackbelt.png', quote: '¡Sentí el poder de mis puños!', pool: ['mankey', 'machop'] },
      'pescador': { name: 'Pescador', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/fisherman.png', quote: '¡Pesqué algo más que un zapato!', pool: ['magikarp', 'goldeen', 'poliwag'] },
      'nadador': { name: 'Nadador', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/swimmer.png', quote: '¡El agua está genial hoy!', pool: ['psyduck', 'tentacool', 'staryu', 'horsea'] },
      'domador': { name: 'Domador', sprite: 'assets/sprites/trainers/tamer.png', quote: '¡Mis bestias te devorarán!', pool: ['growlithe', 'vulpix', 'ponyta', 'ekans'] },
      'medium': { name: 'Médium', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/psychic.png', quote: '...puedo ver tu derrota...', pool: ['abra', 'drowzee'] },
      'motorista': { name: 'Motorista', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/biker.png', quote: '¡Hacéte a un lado, novato!', pool: ['koffing', 'grimer', 'rattata'] },
      'montanero': { name: 'Montañero', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/hiker.png', quote: '¡Mis Pokémon son duros como rocas!', pool: ['geodude', 'sandshrew', 'rhyhorn'] }
    };

    function initTrainerPityTimer() {
      setInterval(() => {
        if (!state.trainerChance) state.trainerChance = GAME_RATIOS.encounters.trainerBase;
        if (state.trainerChance < GAME_RATIOS.encounters.trainerMax) {
          state.trainerChance += GAME_RATIOS.encounters.trainerIncrement;
          console.log(`[PITY] Trainer Chance increased to ${state.trainerChance}%`);
        }
        if (state.trainerChance > GAME_RATIOS.encounters.trainerMax) state.trainerChance = GAME_RATIOS.encounters.trainerMax;
      }, 120000); // 2 minutes
    }

    function generateTrainerBattle(locId) {
      const loc = FIRE_RED_MAPS.find(l => l.id === locId);
      const isMaxCriminality = (state.playerClass === 'rocket' && state.classData?.criminality >= 100);
      
      let t, trainerLv, teamSize;
      const baseLv = loc ? loc.lv[0] : 5;

      if (isMaxCriminality) {
        // Entrenador Especial: Policía / Cazarrecompensas
        t = {
          name: 'Oficial de Policía',
          sprite: 'https://play.pokemonshowdown.com/sprites/trainers/officer.png',
          quote: '¡Tu cabeza vale mucho. ¡Ya no robarás más Pokémon!'
        };
        trainerLv = baseLv + 5; // +3 niveles sobre el normal (que es base+2)
        teamSize = Math.floor(Math.random() * 2) + 3; // 3-4 Pokémon
        
        // Pool de policía: Pokémon de autoridad/orden
        const policePool = ['arcanine', 'pidgeot', 'machamp', 'magneton', 'kadabra'];
        const policeTeam = [];
        for (let i = 0; i < teamSize; i++) {
          const pId = policePool[Math.floor(Math.random() * policePool.length)];
          const p = makePokemon(pId, trainerLv);
          policeTeam.push(p);
        }
        
        _startTrainerBattle(policeTeam, t, locId);
      } else {
        const keys = Object.keys(TRAINER_TYPES);
        const typeKey = keys[Math.floor(Math.random() * keys.length)];
        t = TRAINER_TYPES[typeKey];
        trainerLv = baseLv + 2;
        teamSize = Math.floor(Math.random() * 3) + 1;
        
        const enemyTeam = [];
        for (let i = 0; i < teamSize; i++) {
          const pId = t.pool[Math.floor(Math.random() * t.pool.length)];
          const p = makePokemon(pId, trainerLv);
          enemyTeam.push(p);
        }
        _startTrainerBattle(enemyTeam, t, locId);
      }
    }

    function _startTrainerBattle(enemyTeam, t, locId) {

      // Intro Modal
      const introOv = document.createElement('div');
      introOv.id = 'trainer-intro-overlay';
      introOv.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .3s ease;';
      introOv.innerHTML = `
        <div style="background:var(--card);border-radius:24px;padding:32px;max-width:380px;width:100%;
          border:2px solid var(--blue);text-align:center;position:relative;">
          <img src="${t.sprite}" alt="${t.name}"
            style="height:140px;width:auto;image-rendering:pixelated;margin-bottom:12px;
            filter:drop-shadow(0 4px 16px var(--blue)88);"
            onerror="this.outerHTML='<div style=\'font-size:80px;\'>👤</div>'">
          <div style="font-family:'Press Start 2P',monospace;font-size:11px;color:var(--blue);margin-bottom:6px;">${t.name}</div>
          <div style="font-size:13px;color:#eee;margin:16px 0;line-height:1.6;font-style:italic;">"${t.quote}"</div>
          <button id="trainer-intro-btn" style="font-family:'Press Start 2P',monospace;font-size:9px;padding:14px 28px;border:none;border-radius:14px;
            cursor:pointer;background:linear-gradient(135deg,var(--blue),#2563eb);color:#fff;
            box-shadow:0 4px 16px rgba(59,130,246,0.5);margin-top:8px;">
            ⚔️ ¡ACEPTAR RETO!
          </button>
        </div>`;
      document.body.appendChild(introOv);

      document.getElementById('trainer-intro-btn').onclick = () => {
        introOv.remove();
        // isTrainer = true, enemyTeam is the full team, pass trainer name
        enemyTeam[0]._revealed = true;
        startBattle(enemyTeam[0], false, null, locId, true, enemyTeam, t.name);
      };
    }

    function generateRivalBattle(locId) {
      const loc = FIRE_RED_MAPS.find(l => l.id === locId);
      const rivalSprite = 'https://play.pokemonshowdown.com/sprites/trainers/blue.png';
      const rivalName = 'Rival Azul';
      
      // El nivel de los pokemon del Rival: promedio del equipo + 2
      const teamSize = Math.max(3, state.team.length || 1);
      const avgLevel = state.team.reduce((sum, p) => sum + p.level, 0) / (state.team.length || 1);
      const rivalLevel = Math.floor(avgLevel) + 2;
      
      // Equipo fuerte y variado (6 Pokémon base, pero usamos el mismo tamaño que el jugador)
      const rivalPoolBase = ['pidgeot', 'alakazam', 'gyarados', 'arcanine', 'exeggutor', 'charizard']; 
      // Mezclar y tomar teamSize
      const shuffledPool = [...rivalPoolBase].sort(() => Math.random() - 0.5).slice(0, teamSize);
      
      const enemyTeam = shuffledPool.map(id => {
        // Obtenemos la evolución adecuada para el nivel (si existe la función)
        const species = (typeof getEvolvedForm === 'function') ? getEvolvedForm(id, rivalLevel) : id;
        return makePokemon(species, rivalLevel);
      });

      // Visual Intro Sequence is handled in encounters.js before calling this.
      // But we still need the Modal Intro for the Rival specifically if we want a quote.
      const introOv = document.createElement('div');
      introOv.id = 'rival-intro-overlay';
      introOv.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .5s ease;';
      introOv.innerHTML = `
        <div style="background:linear-gradient(135deg, #1a1a2e, #16213e);border-radius:24px;padding:32px;max-width:400px;width:100%;
          border:3px solid #ff453a;text-align:center;position:relative;box-shadow: 0 0 40px rgba(255, 69, 58, 0.4);">
          <div style="position:absolute;top:-20px;left:50%;transform:translateX(-50%);background:#ff453a;color:white;padding:4px 16px;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:10px;">¡ENCUENTRO LEGENDARIO!</div>
          <img src="${rivalSprite}" alt="${rivalName}"
            style="height:160px;width:auto;image-rendering:pixelated;margin-bottom:16px;
            filter:drop-shadow(0 4px 20px rgba(255, 69, 58, 0.6));">
          <div style="font-family:'Press Start 2P',monospace;font-size:14px;color:#ff453a;margin-bottom:12px;">${rivalName}</div>
          <div style="font-size:14px;color:#eee;margin:20px 0;line-height:1.6;font-style:italic;background:rgba(0,0,0,0.3);padding:15px;border-radius:12px;">
            "¡Ey, vos! ¡He estado entrenando a mi equipo para que sea invencible! ¡Preparate para perder!"
          </div>
          <button id="rival-intro-btn" style="font-family:'Press Start 2P',monospace;font-size:10px;padding:18px 36px;border:none;border-radius:16px;
            cursor:pointer;background:linear-gradient(135deg,#ff453a, #c0392b);color:#fff;
            box-shadow:0 6px 20px rgba(255, 69, 58, 0.5);margin-top:10px;width:100%;">
            ⚔️ ¡ACEPTAR EL DESAFÍO!
          </button>
        </div>`;
      document.body.appendChild(introOv);

      // ⚔️ 8-bit epic rival encounter sound
      if (window.SFX && typeof window.SFX.rivalEncounter === 'function') {
        try { window.SFX.rivalEncounter(); } catch(e) {}
      }

      document.getElementById('rival-intro-btn').onclick = () => {
        introOv.remove();
        enemyTeam[0]._revealed = true;
        startBattle(enemyTeam[0], false, null, locId, true, enemyTeam, rivalName);
        if (state.battle) state.battle.isRival = true;
      };
    }

    const INITIAL_STATE = {
      trainer: 'ASH',
      badges: 0,
      balls: 10,
      money: 3000,
      battleCoins: 0,
      eggs: [],
      trainerChance: GAME_RATIOS.encounters.trainerBase,
      trainerLevel: 1,
      trainerExp: 0,
      trainerExpNeeded: 100,
      inventory: { 'Poción': 3, 'Pokéball': 10 },
      team: [],
      box: [],
      pokedex: [], // capturados
      seenPokedex: [], // vistos
      defeatedGyms: [],
      gymProgress: {}, // { gymId: 1=easy, 2=normal, 3=hard }
      lastGymWins: {}, // { gymId: 'YYYY-MM-DD' }
      lastGymAttempts: {}, // { gymId: 'YYYY-MM-DD' }
      battle: null,
      starterChosen: false,
      stats: {},
      activeBattle: null,
      daycare_missions: [],
      daycare_mission_refreshes: 3,
      safariTicketSecs: 0,
      ceruleanTicketSecs: 0,
      articunoTicketSecs: 0,
      mewtwoTicketSecs: 0,
      boxCount: 4, // Número de cajas compradas (mínimo 4)
      chats: {}, // { friendId: { messages: [], username: '', unreadCount: 0 } }
      playerClass: null,     // 'rocket' | 'cazabichos' | 'entrenador' | 'criador'
      classLevel: 1,
      classXP: 0,
      classData: {
        captureStreak: 0,
        longestStreak: 0,
        reputationPoints: 0,
        blackMarketSales: 0
      }
    };

    let state = JSON.parse(JSON.stringify(INITIAL_STATE));

    function resetGameState() {
      // Clear current state and re-assign from initial
      Object.keys(state).forEach(key => delete state[key]);
      Object.assign(state, JSON.parse(JSON.stringify(INITIAL_STATE)));
      console.log("[DEBUG] Game state reset to defaults");
    }



    // ===== STARTER =====
    function chooseStarter(id) {
      const p = POKEMON_DB[id];
      const starter = makePokemon(id, 5);
      state.team.push(starter);
      // Register starter in Pokédex as caught
      state.pokedex = state.pokedex || [];
      state.seenPokedex = state.seenPokedex || [];
      if (!state.pokedex.includes(id)) state.pokedex.push(id);
      if (!state.seenPokedex.includes(id)) state.seenPokedex.push(id);
      // Hide title, show game
      document.getElementById('title-screen').style.display = 'none';
      document.getElementById('title-screen').classList.remove('active');
      document.getElementById('game-screen').style.display = 'block';
      document.getElementById('game-screen').classList.add('active');

      // Show team tab
      showTab('team');
      updateHud();
      state.starterChosen = true;
      saveGame(false); // guardado inmediato — evento único e irrepetible
      notify(`¡${p.name} es tu compañero! ¡Buena suerte, entrenador!`, '🎉');
    }

    const NATURES = ['Audaz', 'Firme', 'Pícaro', 'Manso', 'Serio', 'Osado', 'Plácido', 'Agitado', 'Jovial', 'Ingenuo', 'Modesto', 'Moderado', 'Raro', 'Dócil', 'Tímido', 'Activo', 'Alocado', 'Tranquilo', 'Grosero', 'Cauto'];
    const ABILITIES = {
      bulbasaur: ['Espesura', 'Clorofila'], charmander: ['Mar Llamas', 'Poder Solar'],
      squirtle: ['Torrente', 'Lluvia Ligera'], pidgey: ['Vista Lince', 'Alboroto'],
      pidgeotto: ['Vista Lince', 'Alboroto'], pidgeot: ['Vista Lince', 'Alboroto'],
      rattata: ['Escape', 'Correcaminos'], caterpie: ['Escudo Polvo', 'Metamorfosis'],
      weedle: ['Escudo Polvo', 'Metamorfosis'], pikachu: ['Electricidad Estática', 'Pararrayos'],
      geodude: ['Robustez', 'Nerviosismo'], zubat: ['Vista Lince', 'Infiltrador'],
      psyduck: ['Humedad', 'Obstruir'], magikarp: ['Escurridizo', 'Ráfaga'],
      eevee: ['Escape', 'Adaptable'], jigglypuff: ['Velo Húmedo', 'Punto Cura'],
      ekans: ['Intimidación', 'Mudar'], sandshrew: ['Velo Arena'],
      nidoran_f: ['Punto Tóxico'], nidoran_m: ['Punto Tóxico'],
      vulpix: ['Absorbe Fuego'], oddish: ['Clorofila'], paras: ['Efecto Espora'],
      venonat: ['Ojo Compuesto'], diglett: ['Trampa Arena'], meowth: ['Recogida'],
      mankey: ['Espíritu Vital'], growlithe: ['Intimidación'], poliwag: ['Absorbe Agua'],
      abra: ['Sincronía'], machop: ['Agallas'], bellsprout: ['Clorofila'],
      tentacool: ['Cuerpo Puro'], ponyta: ['Escape'], slowpoke: ['Despiste'],
      magnemite: ['Imán'], doduo: ['Fuga'], seel: ['Sebo'], grimer: ['Hedor'],
      shellder: ['Caparazón'], gastly: ['Levitación'], onix: ['Cabeza Roca'],
      drowzee: ['Insomnio'], krabby: ['Corte Fuerte'], voltorb: ['Insonorizar'],
      exeggcute: ['Clorofila'], cubone: ['Cabeza Roca'], hitmonlee: ['Flexibilidad'],
      hitmonchan: ['Vista Lince'], lickitung: ['Despiste'], koffing: ['Levitación'],
      rhyhorn: ['Pararrayos'], chansey: ['Cura Natural'], tangela: ['Clorofila'],
      kangaskhan: ['Madrugar'], horsea: ['Nado Rápido'], goldeen: ['Nado Rápido'],
      staryu: ['Cura Natural'], mr_mime: ['Insonorizar'], scyther: ['Enjambre'],
      jynx: ['Despiste'], electabuzz: ['Electricidad Estática'], magmar: ['Cuerpo Llama'],
      pinsir: ['Corte Fuerte'], tauros: ['Intimidación'], gyarados: ['Intimidación'],
      lapras: ['Absorbe Agua'], ditto: ['Flexibilidad'], porygon: ['Calco'],
      aerodactyl: ['Cabeza Roca'], snorlax: ['Inmunidad'], articuno: ['Presión'],
      zapdos: ['Presión'], moltres: ['Presión'], dratini: ['Mudar'],
      mewtwo: ['Presión'], mew: ['Sincronía']
    };

    const WILD_HELD_ITEMS = {
      butterfree: { rare: 'Polvo Plata' },
      beedrill: { rare: 'Flecha Venenosa' },
      pikachu: { common: 'Baya Aranja', rare: 'Bola Luminosa' },
      meowth: { rare: 'Moneda Amuleto' },
      abra: { rare: 'Cuchara Torcida' },
      kadabra: { rare: 'Cuchara Torcida' },
      machoke: { rare: 'Banda Focus' },
      magneton: { rare: 'Imán' },
      farfetchd: { rare: 'Palo' },
      shellder: { common: 'Perla Grande', rare: 'Perla' },
      cloyster: { common: 'Perla Grande', rare: 'Perla' },
      haunter: { rare: 'Hechizo' },
      gengar: { rare: 'Hechizo' },
      cubone: { rare: 'Hueso Grueso' },
      marowak: { rare: 'Hueso Grueso' },
      chansey: { rare: 'Huevo Suerte' },
      staryu: { common: 'Trozo Estrella', rare: 'Polvo Estelar' },
      starmie: { common: 'Trozo Estrella', rare: 'Polvo Estelar' },
      ditto: { rare: 'Polvo Metálico' },
      snorlax: { rare: 'Restos' },
      dragonair: { rare: 'Escama Dragón' },
      dragonite: { rare: 'Escama Dragón' }
    };
    const GENDERLESS = ['articuno', 'ditto', 'electrode', 'magnemite', 'magneton', 'mew', 'mewtwo', 'moltres', 'porygon', 'starmie', 'staryu', 'voltorb', 'zapdos'];
    function assignGender(id) {
      if (GENDERLESS.includes(id)) return null;
      if (id.endsWith('_m')) return 'M';
      if (id.endsWith('_f')) return 'F';
      return Math.random() < 0.5 ? 'M' : 'F';
    }
    function ensurePokemonGender(p) {
      if (!p) return false;
      if (!p.gender) { p.gender = assignGender(p.id); return true; }
      return false;
    }

    function genderSymbol(g) {
      if (g === 'M') return '♂';
      if (g === 'F') return '♀';
      return '—';
    }

    function genderBadgeData(g) {
      if (g === 'M') return { text: '♂', cls: 'gender-male' };
      if (g === 'F') return { text: '♀', cls: 'gender-female' };
      return { text: '—', cls: 'gender-none' };
    }

    function renderGenderBadge(g) {
      const data = genderBadgeData(g);
      return `<span class="gender-badge ${data.cls}">${data.text}</span>`;
    }
    // ── EXP System ────────────────────────────────────────────────────────────
    function getExpNeeded(level) {
      if (level >= 100) return Infinity;
      // Medium Fast curve scaled for web game: (Lv+1)^3 - Lv^3
      return Math.floor(Math.pow(level + 1, 3) - Math.pow(level, 3));
    }

    function ensureVigor(p) {
      if (p.vigor === undefined) {
        // Asignar vigor por defecto a Pokémon antiguos (3 a 6)
        p.vigor = Math.floor(Math.random() * 4) + 3;
      }
      return p;
    }

    function makePokemon(id, level) {
      if (level > 100) level = 100;
      let base = POKEMON_DB[id];
      if (!base) {
        console.error("Missing Pokémon in DB:", id);
        base = POKEMON_DB['pidgey'];
        id = 'pidgey';
      }
      const pId = id;
      const _ivFloor = (typeof getStreakIvFloor === 'function') ? getStreakIvFloor() : 0;
      const _randIv = () => Math.max(_ivFloor, Math.floor(Math.random() * 32));
      const ivs = { hp: _randIv(), atk: _randIv(), def: _randIv(), spa: _randIv(), spd: _randIv(), spe: _randIv() };
      const nature = NATURES[Math.floor(Math.random() * NATURES.length)];
      const abilityList = ABILITIES[id] || ['Espesura'];
      const ability = abilityList[Math.floor(Math.random() * abilityList.length)];
      const gender = assignGender(id);

      const _activeShinyRate = (typeof getActiveShinyRate === 'function') ? getActiveShinyRate() : ((state.shinyBoostSecs || 0) > 0 ? Math.floor(GAME_RATIOS.shinyRate / 2) : GAME_RATIOS.shinyRate);
      const isShiny = Math.random() < (1 / _activeShinyRate);
      
      const vigor = Math.floor(Math.random() * 4) + 3; // 3 a 6

      const getUidStr = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2,9) + getServerTime().toString(36);
      let heldItem = null;
      const itemData = WILD_HELD_ITEMS[id];
      if (itemData) {
        const rand = Math.random();
        const r = GAME_RATIOS.heldItems;
        if (itemData.rare && rand < r.rareRate) heldItem = itemData.rare;
        else if (itemData.common && rand < r.commonRate) heldItem = itemData.common;
      }

      const p = {
        uid: getUidStr(),
        id, name: base.name, emoji: base.emoji, type: base.type,
        level, exp: 0, expNeeded: getExpNeeded(level),
        ivs, nature, ability, gender, isShiny,
        moves: getMovesAtLevel(id, level),
        status: null, sleepTurns: 0, friendship: 70, vigor,
        heldItem
      };

      recalcPokemonStats(p);
      p.hp = p.maxHp;
      return p;
    }

    function recalcPokemonStats(p) {
      const base = POKEMON_DB[p.id];
      const natureData = NATURE_DATA[p.nature] || { up: null, down: null };

      const getStat = (baseVal, iv, level, statName) => {
        let val = Math.floor((baseVal * 2 + iv) * level / 100 + 5);
        if (natureData.up === statName) val = Math.floor(val * 1.1);
        if (natureData.down === statName) val = Math.floor(val * 0.9);
        return val;
      };

      p.maxHp = Math.floor((base.hp * 2 + p.ivs.hp) * p.level / 100 + p.level + 10);
      p.atk = getStat(base.atk, p.ivs.atk, p.level, 'Ataque');
      p.def = getStat(base.def, p.ivs.def, p.level, 'Defensa');
      if (p.heldItem === 'Polvo Metálico' && p.id === 'ditto') p.def = Math.floor(p.def * 1.5);
      p.spa = getStat(base.spa || base.atk, p.ivs.spa, p.level, 'At. Esp');
      p.spd = getStat(base.spd || base.def, p.ivs.spd, p.level, 'Def. Esp');
      p.spe = getStat(base.spe || 45, p.ivs.spe, p.level, 'Velocidad');
    }

    function levelUpPokemon(p) {
      if (p.level >= 100) return [];
      p.level++;
      p.expNeeded = getExpNeeded(p.level);
      const oldMaxHp = p.maxHp;
      recalcPokemonStats(p);
      const hpGain = p.maxHp - oldMaxHp;
      if (hpGain > 0) p.hp += hpGain;
      p.hp = Math.min(p.hp, p.maxHp);

      // Check evolution
      if (typeof checkLevelUpEvolution === 'function') checkLevelUpEvolution(p, null);

      // Learn moves — returns list of moves that couldn't fit (full moveset)
      const base = POKEMON_DB[p.id];
      const pendingMoves = [];
      if (base.learnset) {
        base.learnset.filter(m => m.lv === p.level).forEach(m => {
          if (p.moves.length < 4) {
            p.moves.push({ name: m.name, pp: m.pp, maxPP: m.pp });
          } else {
            pendingMoves.push({ name: m.name, pp: m.pp, maxPP: m.pp });
          }
        });
      }
      return pendingMoves;
    }

    // ===== LEARN MOVE MENU =====
    // Shows a menu asking the player to replace a move or forget the new one.
    // onDone() is called when the player makes a decision.
    function showLearnMoveMenu(pokemon, newMove, onDone) {
      const existing = document.getElementById('learn-move-overlay');
      if (existing) existing.remove();

      const typeColors = {
        normal:'#A8A878', fire:'#F08030', water:'#6890F0', grass:'#78C850', electric:'#F8D030',
        ice:'#98D8D8', fighting:'#C03028', poison:'#A040A0', ground:'#E0C068', flying:'#A890F0',
        psychic:'#F85888', bug:'#A8B820', rock:'#B8A038', ghost:'#705898', dragon:'#7038F8',
        dark:'#705848', steel:'#B8B8D0', fairy:'#EE99AC',
      };
      function moveTypeColor(moveName) {
        const md = (typeof MOVE_DATA !== 'undefined' && MOVE_DATA[moveName]) || {};
        return typeColors[md.type] || '#6b7280';
      }
      function movePower(moveName) {
        const md = (typeof MOVE_DATA !== 'undefined' && MOVE_DATA[moveName]) || {};
        return md.power ? md.power : '—';
      }
      function movePP(m) { return m.maxPP || m.pp || '?'; }
      function moveType(moveName) {
        const md = (typeof MOVE_DATA !== 'undefined' && MOVE_DATA[moveName]) || {};
        return md.type ? md.type.charAt(0).toUpperCase() + md.type.slice(1) : '?';
      }

      function moveCard(m, idx, isNew) {
        const col = moveTypeColor(m.name);
        const label = isNew ? '✨ NUEVO' : `Movimiento ${idx + 1}`;
        const border = isNew ? `border:2px solid ${col};box-shadow:0 0 12px ${col}55;` : 'border:1px solid rgba(255,255,255,0.1);';
        return `
          <div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.05);
            border-radius:14px;padding:12px 14px;margin-bottom:8px;${border}cursor:${isNew ? 'default' : 'pointer'};transition:background .15s;"
            ${isNew ? '' : `onclick="learnMoveReplace(${idx})" onmouseover="this.style.background='rgba(255,255,255,0.11)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'"`}>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:13px;color:#fff;margin-bottom:4px;">${m.name}</div>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:${col};color:#fff;">${moveType(m.name)}</span>
                <span style="font-size:10px;color:#9ca3af;">POW: ${movePower(m.name)}</span>
                <span style="font-size:10px;color:#9ca3af;">PP: ${movePP(m)}</span>
              </div>
            </div>
            ${isNew ? `<span style="font-size:10px;font-weight:700;color:${col};white-space:nowrap;">NUEVO</span>` :
              `<span style="font-size:11px;padding:6px 12px;border-radius:8px;
                background:rgba(239,68,68,0.18);color:#f87171;font-weight:600;white-space:nowrap;">
                Reemplazar
              </span>`}
          </div>`;
      }

      const ov = document.createElement('div');
      ov.id = 'learn-move-overlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:990;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .2s ease;';

      ov.innerHTML = `
        <div style="background:var(--card);border-radius:22px;padding:22px;width:100%;max-width:420px;
          max-height:90vh;overflow-y:auto;border:1px solid rgba(255,255,255,0.08);box-shadow:0 8px 48px rgba(0,0,0,0.7);">

          <div style="text-align:center;margin-bottom:16px;">
            <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:var(--yellow);margin-bottom:8px;">
              📖 NUEVO MOVIMIENTO
            </div>
            <div style="font-size:13px;color:var(--text);line-height:1.5;">
              <strong>${pokemon.name}</strong> quiere aprender
              <span style="color:var(--yellow);font-weight:700;">${newMove.name}</span>,
              ¡pero ya conoce 4 movimientos!
            </div>
            <div style="font-size:11px;color:var(--gray);margin-top:6px;">
              Elegí qué movimiento reemplazar, o presioná "Olvidar" para no aprender ${newMove.name}.
            </div>
          </div>

          <div style="margin-bottom:14px;">
            ${moveCard(newMove, -1, true)}
          </div>

          <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--gray);margin-bottom:10px;">
            ¿CUÁL MOVIMIENTO OLVIDAR?
          </div>

          ${pokemon.moves.map((m, i) => moveCard(m, i, false)).join('')}

          <button onclick="learnMoveForget()"
            style="margin-top:10px;width:100%;padding:14px;border:none;border-radius:12px;
              cursor:pointer;background:rgba(255,255,255,0.06);color:var(--gray);
              font-size:12px;font-weight:600;transition:background .15s;"
            onmouseover="this.style.background='rgba(255,255,255,0.12)'"
            onmouseout="this.style.background='rgba(255,255,255,0.06)'">
            ❌ Olvidar ${newMove.name}
          </button>
        </div>`;

      document.body.appendChild(ov);

      window.learnMoveReplace = function(slotIndex) {
        const oldMove = pokemon.moves[slotIndex];
        pokemon.moves[slotIndex] = { name: newMove.name, pp: newMove.pp, maxPP: newMove.maxPP };
        ov.remove();
        delete window.learnMoveReplace;
        delete window.learnMoveForget;
        if (typeof addLog === 'function') addLog(`¡${pokemon.name} olvidó <span style="color:#f87171;">${oldMove.name}</span> y aprendió <span style="color:#22c55e;font-weight:bold;">${newMove.name}</span>!`, 'log-info');
        if (typeof notify === 'function') notify(`¡${pokemon.name} aprendió ${newMove.name}!`, '📖');
        if (typeof renderMoveButtons === 'function' && state.battle) renderMoveButtons();
        if (typeof scheduleSave === 'function') scheduleSave();
        onDone();
      };

      window.learnMoveForget = function() {
        ov.remove();
        delete window.learnMoveReplace;
        delete window.learnMoveForget;
        if (typeof addLog === 'function') addLog(`¡${pokemon.name} no aprendió ${newMove.name}!`, 'log-info');
        onDone();
      };
    }

    // Process a queue of { pokemon, move } objects, showing the menu for each one sequentially.
    function processLearnMoveQueue(queue, onAllDone) {
      if (!queue.length) { if (onAllDone) onAllDone(); return; }
      const { pokemon, move } = queue.shift();
      showLearnMoveMenu(pokemon, move, () => processLearnMoveQueue(queue, onAllDone));
    }


