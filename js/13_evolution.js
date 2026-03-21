    // ===== EVOLUTION SYSTEM =====

    const EVOLUTION_TABLE = {
      bulbasaur: { level: 16, to: 'ivysaur' },
      ivysaur: { level: 32, to: 'venusaur' },
      charmander: { level: 16, to: 'charmeleon' },
      charmeleon: { level: 36, to: 'charizard' },
      squirtle: { level: 16, to: 'wartortle' },
      wartortle: { level: 36, to: 'blastoise' },
      caterpie: { level: 7, to: 'metapod' },
      metapod: { level: 10, to: 'butterfree' },
      weedle: { level: 7, to: 'kakuna' },
      kakuna: { level: 10, to: 'beedrill' },
      pidgey: { level: 18, to: 'pidgeotto' },
      pidgeotto: { level: 36, to: 'pidgeot' },
      rattata: { level: 20, to: 'raticate' },
      spearow: { level: 20, to: 'fearow' },
      ekans: { level: 22, to: 'arbok' },
      pikachu: { level: 22, to: 'raichu' },
      nidoran_f: { level: 16, to: 'nidorina' },
      nidoran_m: { level: 16, to: 'nidorino' },
      clefairy: { level: 36, to: 'clefable' },
      jigglypuff: { level: 36, to: 'wigglytuff' },
      zubat: { level: 22, to: 'golbat' },
      oddish: { level: 21, to: 'gloom' },
      gloom: { level: 36, to: 'vileplume' },
      paras: { level: 24, to: 'parasect' },
      venonat: { level: 31, to: 'venomoth' },
      geodude: { level: 25, to: 'graveler' },
      slowpoke: { level: 37, to: 'slowbro' },
      magnemite: { level: 30, to: 'magneton' },
      gastly: { level: 25, to: 'haunter' },
      drowzee: { level: 26, to: 'hypno' },
      krabby: { level: 28, to: 'kingler' },
      cubone: { level: 28, to: 'marowak' },
      machop: { level: 28, to: 'machoke' },
      machop: { level: 28, to: 'machoke' },
      bellsprout: { level: 21, to: 'weepinbell' },
      weepinbell: { level: 36, to: 'victreebel' },
      tentacool: { level: 30, to: 'tentacruel' },
      seel: { level: 34, to: 'dewgong' },
      shellder: { level: 36, to: 'cloyster' },
      psyduck: { level: 33, to: 'golduck' },
      horsea: { level: 32, to: 'seadra' },
      goldeen: { level: 33, to: 'seaking' },
      staryu: { level: 36, to: 'starmie' },
      magikarp: { level: 20, to: 'gyarados' },
      dratini: { level: 30, to: 'dragonair' },
      dragonair: { level: 55, to: 'dragonite' },
      abra: { level: 16, to: 'kadabra' },
      abra: { level: 16, to: 'kadabra' },
      mankey: { level: 28, to: 'primeape' },
      growlithe: { level: 36, to: 'arcanine' },
      poliwag: { level: 25, to: 'poliwhirl' },
      poliwhirl: { level: 36, to: 'poliwrath' },
      voltorb: { level: 30, to: 'electrode' },
      exeggcute: { level: 36, to: 'exeggutor' },
      koffing: { level: 35, to: 'weezing' },
      rhyhorn: { level: 42, to: 'rhydon' },
      kabuto: { level: 40, to: 'kabutops' },
      omanyte: { level: 40, to: 'omastar' },
    };

    const STONE_EVOLUTIONS = {
      pikachu: { stone: '⚡ Piedra Trueno', to: 'raichu' },
      clefairy: { stone: '🌙 Piedra Luna', to: 'clefable' },
      jigglypuff: { stone: '🌙 Piedra Luna', to: 'wigglytuff' },
      oddish: { stone: '🌿 Piedra Hoja', to: 'vileplume' },
      gloom: { stone: '🌿 Piedra Hoja', to: 'vileplume' },
      growlithe: { stone: '🔥 Piedra Fuego', to: 'arcanine' },
      poliwhirl: { stone: '💧 Piedra Agua', to: 'poliwrath' },
      weepinbell: { stone: '🌿 Piedra Hoja', to: 'victreebel' },
      shellder: { stone: '💧 Piedra Agua', to: 'cloyster' },
      staryu: { stone: '💧 Piedra Agua', to: 'starmie' },
      eevee_water: { stone: '💧 Piedra Agua', to: 'vaporeon' },
      eevee_thunder: { stone: '⚡ Piedra Trueno', to: 'jolteon' },
      eevee_fire: { stone: '🔥 Piedra Fuego', to: 'flareon' },
      exeggcute: { stone: '🌿 Piedra Hoja', to: 'exeggutor' },
    };

    const TRADE_EVOLUTIONS = {
      haunter: 'gengar',
      kadabra: 'alakazam',
      machoke: 'machamp',
      graveler: 'golem'
    };

    // ── Level-up evolution check ──────────────────────────────────
    function checkLevelUpEvolution(pokemon, onComplete) {
      const evo = EVOLUTION_TABLE[pokemon.id];
      if (!evo || pokemon.level < evo.level) { if (onComplete) onComplete(); return; }
      if (evo.to === pokemon.id) { if (onComplete) onComplete(); return; } // Avoid self-evolution loop if placeholder
      const toData = POKEMON_DB[evo.to];
      if (!toData) { if (onComplete) onComplete(); return; }
      showEvolutionScene(pokemon, evo.to, onComplete);
    }

    // ── Trade evolution check ─────────────────────────────────────
    function checkTradeEvolution(pokemon, onComplete) {
      const toId = TRADE_EVOLUTIONS[pokemon.id];
      if (!toId) { if (onComplete) onComplete(); return; }
      const toData = POKEMON_DB[toId];
      if (!toData) { if (onComplete) onComplete(); return; }
      
      // We might want a small delay to let the trade modal close or the notification show
      setTimeout(() => {
        showEvolutionScene(pokemon, toId, onComplete);
      }, 500);
    }

    function showEvolutionScene(pokemon, toId, onComplete) {
      const toData = POKEMON_DB[toId];
      if (!toData) { evolvePokemon(pokemon, toId); if (onComplete) onComplete(); return; }

      const fromSprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${getSpriteId(pokemon.id)}.png`;
      const toSprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${getSpriteId(toId)}.png`;

      const ov = document.createElement('div');
      ov.id = 'evo-overlay';
      ov.style.cssText = `position:fixed;inset:0;z-index:9999;background:#000;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    font-family:'Press Start 2P',monospace;`;

      ov.innerHTML = `
    <div id="evo-from" style="text-align:center;transition:all 1.5s;">
      <img src="${fromSprite}" width="96" height="96" style="image-rendering:pixelated;filter:brightness(1);"
           onerror="this.style.display='none';document.getElementById('evo-emoji-from').style.display='block'">
      <div id="evo-emoji-from" style="display:none;font-size:72px;">${pokemon.emoji}</div>
    </div>
    <div style="font-size:9px;color:#fff;margin:24px 0 8px;">¡${pokemon.name} está evolucionando!</div>
    <div id="evo-flash" style="position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;transition:opacity 0.15s;"></div>
    <div id="evo-to" style="display:none;text-align:center;">
      <img src="${toSprite}" width="96" height="96" style="image-rendering:pixelated;"
           onerror="this.style.display='none';document.getElementById('evo-emoji-to').style.display='block'">
      <div id="evo-emoji-to" style="display:none;font-size:72px;">${toData.emoji}</div>
      <div style="font-size:10px;color:#FFD93D;margin-top:16px;">¡${pokemon.name} evolucionó<br>a ${toData.name}!</div>
    </div>`;

      document.body.appendChild(ov);

      // Animation: flash 3x then reveal new pokemon
      let flashes = 0;
      const flash = document.getElementById('evo-flash');
      const fromEl = document.getElementById('evo-from');
      const interval = setInterval(() => {
        flash.style.opacity = flashes % 2 === 0 ? '0.7' : '0';
        flashes++;
        if (flashes >= 6) {
          clearInterval(interval);
          fromEl.style.display = 'none';
          document.getElementById('evo-to').style.display = 'block';
          evolvePokemon(pokemon, toId);
          setTimeout(() => {
            ov.remove();
            if (onComplete) onComplete();
          }, 2200);
        }
      }, 250);
    }

    function evolvePokemon(pokemon, toId) {
      const toData = POKEMON_DB[toId];
      if (!toData) return;
      const oldName = pokemon.name;
      // Keep level, exp, ivs, nature; update species data
      pokemon.id = toId;
      pokemon.name = toData.name;
      pokemon.emoji = toData.emoji;
      pokemon.type = toData.type;
      pokemon.ability = toData.abilities ? toData.abilities[Math.floor(Math.random() * toData.abilities.length)] : pokemon.ability;
      // Recalc stats with same IVs
      const newBase = makePokemon(toId, pokemon.level);
      pokemon.maxHp = newBase.maxHp;
      pokemon.hp = Math.min(pokemon.hp + (newBase.maxHp - pokemon.maxHp), newBase.maxHp);
      pokemon.atk = newBase.atk;
      pokemon.def = newBase.def;
      pokemon.spd = newBase.spd;
      // Keep existing moves unless empty
      if (!pokemon.moves || pokemon.moves.length === 0) pokemon.moves = newBase.moves;
      // Pokedex
      // Sync to team
      const idx = state.team.findIndex(p => p === pokemon);
      if (idx !== -1) state.team[idx] = pokemon;
      renderTeam();
      scheduleSave();
      notify(`¡${oldName} evolucionó a ${toData.name}!`, '🌟');
    }

    // ── Stone evolutions ──────────────────────────────────────────
    function showStonePicker(teamIndex) {
      const p = state.team[teamIndex];
      if (!p) return;

      // Check eevee special case
      const evoKey = p.id === 'eevee' ? null : STONE_EVOLUTIONS[p.id];
      const eeveeOptions = p.id === 'eevee' ? [
        { stone: '💧 Piedra Agua', to: 'vaporeon' },
        { stone: '⚡ Piedra Trueno', to: 'jolteon' },
        { stone: '🔥 Piedra Fuego', to: 'flareon' },
      ] : null;

      const options = eeveeOptions || (evoKey ? [evoKey] : []);
      if (!options.length) { notify(`${p.name} no puede evolucionar con piedras.`, '💎'); return; }

      // Check inventory
      const available = options.filter(o => {
        const stoneName = o.stone.replace(/^[^ ]+ /, '');
        return state.inventory && state.inventory[stoneName] > 0;
      });

      const ov = document.createElement('div');
      ov.id = 'stone-overlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;padding:16px;';

      let html = `<div style="background:var(--card);border-radius:20px;padding:24px;width:100%;max-width:340px;">
    <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:var(--yellow);margin-bottom:16px;">💎 EVOLUCIONAR CON PIEDRA</div>
    <div style="font-size:12px;color:var(--gray);margin-bottom:16px;">¿Qué piedra usás en ${p.name}?</div>`;

      options.forEach(o => {
        const stoneName = o.stone.replace(/^[^ ]+ /, '');
        const qty = state.inventory?.[stoneName] || 0;
        const toData = POKEMON_DB[o.to];
        const disabled = qty <= 0;
        html += `<div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.04);border-radius:12px;padding:12px;margin-bottom:8px;${disabled ? 'opacity:0.4' : ''}">
      <div style="font-size:28px;">${o.stone.split(' ')[0]}</div>
      <div style="flex:1;">
        <div style="font-size:12px;font-weight:700;">${stoneName}</div>
        <div style="font-size:10px;color:var(--gray);">→ ${toData?.name || o.to} &nbsp;·&nbsp; x${qty}</div>
      </div>
      <button onclick="useStoneOnPokemon('${stoneName}',${teamIndex})"
        ${disabled ? 'disabled' : ''}
        style="font-family:'Press Start 2P',monospace;font-size:8px;padding:8px 12px;border:none;border-radius:8px;cursor:${disabled ? 'not-allowed' : 'pointer'};
               background:rgba(255,217,61,0.2);color:var(--yellow);border:1px solid rgba(255,217,61,0.3);">
        USAR
      </button>
    </div>`;
      });

      html += `<button onclick="document.getElementById('stone-overlay').remove()"
    style="width:100%;margin-top:8px;padding:10px;border:none;border-radius:10px;cursor:pointer;background:rgba(255,255,255,0.06);color:var(--gray);font-size:12px;">
    Cancelar
  </button></div>`;

      ov.innerHTML = html;
      ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
      document.body.appendChild(ov);
    }

    function useStoneOnPokemon(stoneName, teamIndex) {
      document.getElementById('stone-overlay')?.remove();
      const p = state.team[teamIndex];
      if (!p) return;
      if (!state.inventory?.[stoneName] || state.inventory[stoneName] <= 0) {
        notify(`No tenés ${stoneName}.`, '❌'); return;
      }

      const evoKey = p.id === 'eevee' ? (['Piedra Agua', 'Piedra Trueno', 'Piedra Fuego'].includes(stoneName) ? {
        'Piedra Agua': 'vaporeon',
        'Piedra Trueno': 'jolteon',
        'Piedra Fuego': 'flareon',
      }[stoneName] : null) : STONE_EVOLUTIONS[p.id]?.to;

      if (!evoKey || !POKEMON_DB[evoKey]) { notify(`${p.name} no puede evolucionar con ${stoneName}.`, '💎'); return; }

      state.inventory[stoneName]--;
      if (!state.inventory[stoneName]) delete state.inventory[stoneName];
      showEvolutionScene(p, evoKey, null);
    }

