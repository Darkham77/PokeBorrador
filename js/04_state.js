    // ===== GAME STATE =====
    const TRAINER_TYPES = {
      'caza_bichos': { name: 'Caza Bichos', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/bugcatcher.png', quote: '¡Mis Pokémon bicho son los más fuertes!', pool: ['caterpie', 'metapod', 'weedle', 'kakuna', 'paras', 'venonat'] },
      'ornitologo': { name: 'Ornitólogo', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/birdkeeper.png', quote: '¡Mis pájaros volarán alto sobre los tuyos!', pool: ['pidgey', 'spearow', 'doduo'] },
      'cientifico': { name: 'Científico', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/scientist.png', quote: '¡La ciencia pokémon es absoluta!', pool: ['magnemite', 'voltorb', 'ditto', 'grimer'] },
      'luchador': { name: 'Luchador', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/blackbelt.png', quote: '¡Sentí el poder de mis puños!', pool: ['mankey', 'machop'] },
      'pescador': { name: 'Pescador', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/fisherman.png', quote: '¡Pesqué algo más que un zapato!', pool: ['magikarp', 'goldeen', 'poliwag'] },
      'nadador': { name: 'Nadador', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/swimmer.png', quote: '¡El agua está genial hoy!', pool: ['psyduck', 'tentacool', 'staryu', 'horsea'] },
      'domador': { name: 'Domador', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/tamer.png', quote: '¡Mis bestias te devorarán!', pool: ['growlithe', 'vulpix', 'ponyta', 'ekans'] },
      'medium': { name: 'Médium', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/psychic.png', quote: '...puedo ver tu derrota...', pool: ['abra', 'drowzee'] },
      'motorista': { name: 'Motorista', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/biker.png', quote: '¡Hacéte a un lado, novato!', pool: ['koffing', 'grimer', 'rattata'] },
      'montanero': { name: 'Montañero', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/hiker.png', quote: '¡Mis Pokémon son duros como rocas!', pool: ['geodude', 'sandshrew', 'rhyhorn'] }
    };

    function initTrainerPityTimer() {
      setInterval(() => {
        if (!state.trainerChance) state.trainerChance = 5;
        if (state.trainerChance < 20) {
          state.trainerChance += 5;
          console.log(`[PITY] Trainer Chance increased to ${state.trainerChance}%`);
        }
        if (state.trainerChance > 20) state.trainerChance = 20;
      }, 120000); // 2 minutes
    }

    function generateTrainerBattle(locId) {
      const loc = FIRE_RED_MAPS.find(l => l.id === locId);
      const keys = Object.keys(TRAINER_TYPES);
      const typeKey = keys[Math.floor(Math.random() * keys.length)];
      const t = TRAINER_TYPES[typeKey];
      
      const teamSize = Math.floor(Math.random() * 3) + 1;
      const enemyTeam = [];
      const baseLv = loc ? loc.lv[0] : 5;
      const trainerLv = baseLv + 2;

      for (let i = 0; i < teamSize; i++) {
        const pId = t.pool[Math.floor(Math.random() * t.pool.length)];
        const p = makePokemon(pId, trainerLv);
        enemyTeam.push(p);
      }

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

    let state = {
      trainer: 'ASH',
      badges: 0,
      balls: 10,
      money: 3000,
      battleCoins: 0,
      eggs: [],
      trainerChance: 5,
      trainerLevel: 1,
      trainerExp: 0,
      trainerExpNeeded: 100,
      inventory: { 'Poción': 3, 'Pokéball': 10 },
      team: [],
      box: [],
      pokedex: [],
      defeatedGyms: [],
      battle: null,
    };

    // ===== STARTER =====
    function chooseStarter(id) {
      const p = POKEMON_DB[id];
      const starter = makePokemon(id, 5);
      state.team.push(starter);
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
    const ABILITIES = {bulbasaur: ['Espesura', 'Clorofila'], charmander: ['Mar Llamas', 'Poder Solar'],
      squirtle: ['Torrente', 'Lluvia Ligera'], pidgey: ['Vista Lince', 'Alboroto'],
      rattata: ['Escape', 'Correcaminos'], caterpie: ['Escudo Polvo', 'Metamorfosis'],
      weedle: ['Escudo Polvo', 'Metamorfosis'], pikachu: ['Electricidad Estática', 'Pararrayos'],
      geodude: ['Robustez', 'Nerviosismo'], zubat: ['Vista Lince', 'Infiltrador'],
      psyduck: ['Humedad', 'Obstruir'], magikarp: ['Escurridizo', 'Ráfaga'],
      eevee: ['Escape', 'Adaptable'], jigglypuff: ['Velo Húmedo', 'Punto Cura'],
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

    function makePokemon(id, level) {
      if (level > 100) level = 100;
      let base = POKEMON_DB[id];
      if (!base) {
        console.error("Missing Pokémon in DB:", id);
        base = POKEMON_DB['pidgey'];
        id = 'pidgey';
      }
      const pId = id;
      const ivs = { hp: Math.floor(Math.random() * 32), atk: Math.floor(Math.random() * 32), def: Math.floor(Math.random() * 32), spa: Math.floor(Math.random() * 32), spd: Math.floor(Math.random() * 32), spe: Math.floor(Math.random() * 32) };
      const nature = NATURES[Math.floor(Math.random() * NATURES.length)];
      const abilityList = ABILITIES[id] || ['Espesura'];
      const ability = abilityList[Math.floor(Math.random() * abilityList.length)];
      const gender = assignGender(id);

      const isShiny = Math.random() < (1 / SHINY_RATE);

      const getUidStr = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2,9) + Date.now().toString(36);
      const p = {
        uid: getUidStr(),
        id, name: base.name, emoji: base.emoji, type: base.type,
        level, exp: 0, expNeeded: getExpNeeded(level),
        ivs, nature, ability, gender, isShiny,
        moves: getMovesAtLevel(id, level),
        status: null, sleepTurns: 0, friendship: 70
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
      p.spa = getStat(base.spa || base.atk, p.ivs.spa, p.level, 'At. Esp');
      p.spd = getStat(base.spd || base.def, p.ivs.spd, p.level, 'Def. Esp');
      p.spe = getStat(base.spe || 45, p.ivs.spe, p.level, 'Velocidad');
    }

    function levelUpPokemon(p) {
      if (p.level >= 100) return;
      p.level++;
      p.expNeeded = getExpNeeded(p.level);
      const oldMaxHp = p.maxHp;
      recalcPokemonStats(p);
      const hpGain = p.maxHp - oldMaxHp;
      if (hpGain > 0) p.hp += hpGain;
      p.hp = Math.min(p.hp, p.maxHp);

      // Check evolution
      if (typeof checkEvolution === 'function') checkEvolution(p);

      // Learn moves
      const base = POKEMON_DB[p.id];
      if (base.learnset) {
        base.learnset.filter(m => m.lv === p.level).forEach(m => {
          if (p.moves.length < 4) {
            p.moves.push({ name: m.name, pp: m.pp, maxPP: m.pp });
          }
        });
      }
    }


