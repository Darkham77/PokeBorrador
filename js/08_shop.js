    // ===== NOTIFICATION =====
    function notify(msg, icon = '✨') {
      const el = document.createElement('div');
      el.className = 'notification';
      el.innerHTML = `${icon} ${msg}`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 5000);
    }


    // ===== POKEMON CENTER =====
    function openPokemonCenter() {
      const overlay = document.getElementById('pokemon-center-overlay');
      overlay.style.display = 'flex';
      document.getElementById('center-msg').innerHTML = '¡Bienvenido al Centro Pokémon!<br>¿Descansamos a tus Pokémon?';
      document.getElementById('center-btn-wrap').style.display = 'flex';
    }

    function closePokemonCenter() {
      document.getElementById('pokemon-center-overlay').style.display = 'none';
    }

    function healAllPokemon() {
      state.team.forEach(p => {
        p.hp = p.maxHp;
        p.status = null;
        p.sleepTurns = 0;
        p.moves.forEach(m => { m.pp = m.maxPP; });
      });

      document.getElementById('center-msg').innerHTML = '✨ ¡Tus Pokémon están completamente curados!<br><br>¡Buena suerte en tu aventura!';
      document.getElementById('center-btn-wrap').style.display = 'none';

      setTimeout(() => {
        closePokemonCenter();
        notify('¡Todo el equipo fue curado al 100%!', '💊');
        renderTeam();
      }, 2000);
    }


    // ===== TRAINER LEVEL SYSTEM =====
    const TRAINER_RANKS = [
      { lv: 1, title: 'Novato', expNeeded: 100 },
      { lv: 2, title: 'Principiante', expNeeded: 250 },
      { lv: 3, title: 'Aprendiz', expNeeded: 500 },
      { lv: 4, title: 'Explorador', expNeeded: 900 },
      { lv: 5, title: 'Aventurero', expNeeded: 1400 },
      { lv: 6, title: 'Veterano', expNeeded: 2100 },
      { lv: 7, title: 'Experto', expNeeded: 3000 },
      { lv: 8, title: 'Maestro', expNeeded: 4200 },
      { lv: 9, title: 'Gran Maestro', expNeeded: 6000 },
      { lv: 10, title: 'Campeón', expNeeded: 99999 },
    ];

    function getTrainerRank() {
      return TRAINER_RANKS[Math.min(state.trainerLevel - 1, TRAINER_RANKS.length - 1)];
    }

    function addTrainerExp(amount) {
      state.trainerExp += amount;
      const rank = getTrainerRank();
      if (state.trainerExp >= rank.expNeeded && state.trainerLevel < 10) {
        state.trainerExp -= rank.expNeeded;
        state.trainerLevel++;
        const newRank = getTrainerRank();
        notify(`¡Subiste al rango ${newRank.title}! Nivel ${state.trainerLevel}`, '⭐');
        // Unlock message
        const unlocks = MARKET_UNLOCKS[state.trainerLevel];
        if (unlocks) setTimeout(() => notify(`¡Nuevos items en el Poké Market!`, '🛒'), 1500);
      }
      updateHud();
    }

    // What unlocks at each trainer level
    const MARKET_UNLOCKS = {
      3: ['Super Poción', 'Poké Ball Especial'],
      5: ['Hiper Poción', 'Super Ball', 'Cura Total'],
      7: ['Poción Máxima', 'Ultra Ball', 'Revivir'],
      9: ['Revivir Máximo', 'Master Ball', 'Elixir Máximo'],
    };

    // ===== SHOP ITEMS =====
    // Item categories for market tabs
    const ITEM_CATEGORIES = ['todos', 'pokeballs', 'pociones', 'held', 'stones', 'especial'];
    const CATEGORY_LABELS = { todos: 'Todo', pokeballs: 'Pokéballs', pociones: 'Pociones', held: 'Equipables', stones: 'Piedras', especial: 'Especial' };

    const SHOP_ITEMS = [
      // ── BREEDING ITEMS ──────────────────────────────────────────────────────────
      { id: 'destiny_knot', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/destiny-knot.png', name: 'Lazo Destino', icon: '🔴', price: 0, unlockLv: 5, tier: 'rare', market: false, trainerShop: true, bcPrice: 200, desc: 'El Pokémon que lo lleva transmite 5 IVs en lugar de 3 al criar.', effect: null },
      { id: 'power_bracer', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/power-bracer.png', name: 'Brazal Potencia', icon: '💪', price: 1000, unlockLv: 5, tier: 'uncommon', desc: 'Garantiza heredar el Ataque Físico del padre al criar.', effect: null },
      { id: 'power_belt', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/power-belt.png', name: 'Fajín Potencia', icon: '🛡️', price: 1000, unlockLv: 5, tier: 'uncommon', desc: 'Garantiza heredar la Defensa del padre al criar.', effect: null },
      { id: 'power_lens', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/power-lens.png', name: 'Lente Potencia', icon: '🔮', price: 1000, unlockLv: 5, tier: 'uncommon', desc: 'Garantiza heredar el Ataque Especial del padre al criar.', effect: null },
      { id: 'power_band', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/power-band.png', name: 'Banda Potencia', icon: '🎗️', price: 1000, unlockLv: 5, tier: 'uncommon', desc: 'Garantiza heredar la Defensa Especial del padre al criar.', effect: null },
      { id: 'power_anklet', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/power-anklet.png', name: 'Tobillera Potencia', icon: '⚡', price: 1000, unlockLv: 5, tier: 'uncommon', desc: 'Garantiza heredar la Velocidad del padre al criar.', effect: null },
      { id: 'power_weight', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/power-weight.png', name: 'Pesa Recia', icon: '❤️', price: 1000, unlockLv: 5, tier: 'uncommon', desc: 'Garantiza heredar los HP del padre al criar.', effect: null },

      // ── POKÉBALLS ──────────────────────────────────────────────────────────────
      {
        id: 'pokeball', cat: 'pokeballs', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png',
        name: 'Pokéball', icon: '⚪', price: 200, unlockLv: 1, tier: 'common',
        desc: 'Captura Pokémon salvajes. Tasa de captura estándar.',
        effect: (qty) => { state.inventory['Pokéball'] = (state.inventory['Pokéball'] || 0) + qty; state.balls += qty; }
      },
      {
        id: 'great_ball', cat: 'pokeballs', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png',
        name: 'Súper Ball', icon: '🔵', price: 600, unlockLv: 3, tier: 'rare',
        desc: 'Tasa de captura x1.5 respecto a la Pokéball normal.',
        effect: (qty) => { state.inventory['Súper Ball'] = (state.inventory['Súper Ball'] || 0) + qty; state.balls += Math.floor(qty * 1.5); }
      },
      {
        id: 'ultra_ball', cat: 'pokeballs', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png',
        name: 'Ultra Ball', icon: '⚫', price: 1200, unlockLv: 5, tier: 'epic',
        desc: 'Tasa de captura x2. Alta efectividad contra Pokémon raros.',
        effect: (qty) => { state.inventory['Ultra Ball'] = (state.inventory['Ultra Ball'] || 0) + qty; state.balls += qty * 2; }
      },
      {
        id: 'net_ball', cat: 'pokeballs', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/net-ball.png',
        name: 'Red Ball', icon: '🕸️', price: 1000, unlockLv: 4, tier: 'rare',
        desc: 'Tasa de captura x3 contra Pokémon de tipo Agua o Bicho.',
        effect: (qty) => { state.inventory['Red Ball'] = (state.inventory['Red Ball'] || 0) + qty; state.balls += Math.floor(qty * 1.8); }
      },
      {
        id: 'dusk_ball', cat: 'pokeballs', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dusk-ball.png',
        name: 'Ball Oscura', icon: '🌑', price: 1000, unlockLv: 4, tier: 'rare',
        desc: 'Tasa de captura x3 en cuevas o de noche.',
        effect: (qty) => { state.inventory['Ball Oscura'] = (state.inventory['Ball Oscura'] || 0) + qty; state.balls += Math.floor(qty * 1.8); }
      },
      {
        id: 'timer_ball', cat: 'pokeballs', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/timer-ball.png',
        name: 'Ball Temporizadora', icon: '⏱️', price: 1000, unlockLv: 6, tier: 'epic',
        desc: 'Tasa de captura que aumenta según turnos transcurridos.',
        effect: (qty) => { state.inventory['Ball Temporizadora'] = (state.inventory['Ball Temporizadora'] || 0) + qty; state.balls += qty; }
      },
      {
        id: 'master_ball', cat: 'pokeballs', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png',
        name: 'Master Ball', icon: '🟣', price: 9999, unlockLv: 9, tier: 'legend',
        desc: 'Captura cualquier Pokémon sin fallar. ¡Sin excepción!',
        effect: (qty) => { state.inventory['Master Ball'] = (state.inventory['Master Ball'] || 0) + qty; state.balls += qty * 99; }
      },

      // ── POCIONES ───────────────────────────────────────────────────────────────
      {
        id: 'pocion', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/potion.png',
        name: 'Poción', icon: '🧪', price: 300, unlockLv: 1, tier: 'common',
        desc: 'Restaura 20 HP a un Pokémon.',
        effect: (qty) => { state.inventory['Poción'] = (state.inventory['Poción'] || 0) + qty; }
      },
      {
        id: 'super_pocion', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/super-potion.png',
        name: 'Super Poción', icon: '🔵', price: 700, unlockLv: 3, tier: 'rare',
        desc: 'Restaura 50 HP a un Pokémon.',
        effect: (qty) => { state.inventory['Super Poción'] = (state.inventory['Super Poción'] || 0) + qty; }
      },
      {
        id: 'hiper_pocion', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/hyper-potion.png',
        name: 'Hiper Poción', icon: '🟣', price: 1200, unlockLv: 5, tier: 'epic',
        desc: 'Restaura 200 HP a un Pokémon.',
        effect: (qty) => { state.inventory['Hiper Poción'] = (state.inventory['Hiper Poción'] || 0) + qty; }
      },
      {
        id: 'pocion_max', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/max-potion.png',
        name: 'Poción Máxima', icon: '💜', price: 2500, unlockLv: 7, tier: 'legend',
        desc: 'Restaura todo el HP de un Pokémon.',
        effect: (qty) => { state.inventory['Poción Máxima'] = (state.inventory['Poción Máxima'] || 0) + qty; }
      },
      {
        id: 'revivir', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/revive.png',
        name: 'Revivir', icon: '❤️', price: 1500, unlockLv: 5, tier: 'epic',
        desc: 'Revive a un Pokémon debilitado con la mitad del HP.',
        effect: (qty) => { state.inventory['Revivir'] = (state.inventory['Revivir'] || 0) + qty; }
      },
      {
        id: 'revivir_max', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/max-revive.png',
        name: 'Revivir Máximo', icon: '💖', price: 3000, unlockLv: 8, tier: 'legend',
        desc: 'Revive a un Pokémon debilitado con el HP al máximo.',
        effect: (qty) => { state.inventory['Revivir Máximo'] = (state.inventory['Revivir Máximo'] || 0) + qty; }
      },
      {
        id: 'antidoto', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/antidote.png',
        name: 'Antídoto', icon: '💚', price: 100, unlockLv: 1, tier: 'common',
        desc: 'Cura el envenenamiento de un Pokémon.',
        effect: (qty) => { state.inventory['Antídoto'] = (state.inventory['Antídoto'] || 0) + qty; }
      },
      {
        id: 'quemadura', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/burn-heal.png',
        name: 'Cura Quemadura', icon: '🧊', price: 250, unlockLv: 2, tier: 'common',
        desc: 'Cura la quemadura de un Pokémon.',
        effect: (qty) => { state.inventory['Cura Quemadura'] = (state.inventory['Cura Quemadura'] || 0) + qty; }
      },
      {
        id: 'despertar', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/awakening.png',
        name: 'Despertar', icon: '☕', price: 250, unlockLv: 1, tier: 'common',
        desc: 'Despierta a un Pokémon dormido.',
        effect: (qty) => { state.inventory['Despertar'] = (state.inventory['Despertar'] || 0) + qty; }
      },
      {
        id: 'cura_total', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/full-heal.png',
        name: 'Cura Total', icon: '✨', price: 600, unlockLv: 4, tier: 'rare',
        desc: 'Cura todos los estados alterados de un Pokémon.',
        effect: (qty) => { state.inventory['Cura Total'] = (state.inventory['Cura Total'] || 0) + qty; }
      },
      {
        id: 'elixir', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ether.png',
        name: 'Éter', icon: '💎', price: 1200, unlockLv: 4, tier: 'rare',
        desc: 'Restaura 10 PP de un movimiento.',
        effect: (qty) => { state.inventory['Éter'] = (state.inventory['Éter'] || 0) + qty; }
      },
      {
        id: 'elixir_max', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/max-elixir.png',
        name: 'Elixir Máximo', icon: '🌟', price: 4500, unlockLv: 8, tier: 'legend',
        desc: 'Restaura todos los PP de todos los movimientos.',
        effect: (qty) => { state.inventory['Elixir Máximo'] = (state.inventory['Elixir Máximo'] || 0) + qty; }
      },
      {
        id: 'repelente', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/repel.png',
        name: 'Repelente', icon: '🚫', price: 350, unlockLv: 1, tier: 'common',
        desc: 'Evita encuentros con Pokémon salvajes por un tiempo.',
        effect: (qty) => { state.inventory['Repelente'] = (state.inventory['Repelente'] || 0) + qty; }
      },

      // ── PIEDRAS DE EVOLUCIÓN ───────────────────────────────────────────────────
      {
        id: 'piedra_fuego', cat: 'stones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/fire-stone.png',
        name: 'Piedra Fuego', icon: '🔥', price: 2000, unlockLv: 4, tier: 'rare',
        desc: 'Hace evolucionar a Vulpix, Growlithe, Eevee y otros Pokémon de Fuego.',
        type: 'stone', stoneType: 'fire',
        effect: (qty) => { state.inventory['Piedra Fuego'] = (state.inventory['Piedra Fuego'] || 0) + qty; }
      },
      {
        id: 'piedra_agua', cat: 'stones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/water-stone.png',
        name: 'Piedra Agua', icon: '💧', price: 2000, unlockLv: 4, tier: 'rare',
        desc: 'Hace evolucionar a Poliwhirl, Shellder, Staryu y Eevee.',
        type: 'stone', stoneType: 'water',
        effect: (qty) => { state.inventory['Piedra Agua'] = (state.inventory['Piedra Agua'] || 0) + qty; }
      },
      {
        id: 'piedra_trueno', cat: 'stones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/thunder-stone.png',
        name: 'Piedra Trueno', icon: '⚡', price: 2000, unlockLv: 4, tier: 'rare',
        desc: 'Hace evolucionar a Pikachu y Eevee.',
        type: 'stone', stoneType: 'thunder',
        effect: (qty) => { state.inventory['Piedra Trueno'] = (state.inventory['Piedra Trueno'] || 0) + qty; }
      },
      {
        id: 'piedra_hoja', cat: 'stones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/leaf-stone.png',
        name: 'Piedra Hoja', icon: '🌿', price: 2000, unlockLv: 4, tier: 'rare',
        desc: 'Hace evolucionar a Gloom, Weepinbell, Exeggcute y Eevee.',
        type: 'stone', stoneType: 'leaf',
        effect: (qty) => { state.inventory['Piedra Hoja'] = (state.inventory['Piedra Hoja'] || 0) + qty; }
      },
      {
        id: 'piedra_luna', cat: 'stones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/moon-stone.png',
        name: 'Piedra Lunar', icon: '🌙', price: 2500, unlockLv: 5, tier: 'epic',
        desc: 'Hace evolucionar a Nidorina, Nidorino, Clefairy y Jigglypuff.',
        type: 'stone', stoneType: 'moon',
        effect: (qty) => { state.inventory['Piedra Lunar'] = (state.inventory['Piedra Lunar'] || 0) + qty; }
      },
      {
        id: 'piedra_sol', cat: 'stones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/sun-stone.png',
        name: 'Piedra Solar', icon: '☀️', price: 3000, unlockLv: 6, tier: 'epic',
        desc: 'Hace evolucionar a Gloom y Sunkern.',
        type: 'stone', stoneType: 'sun',
        effect: (qty) => { state.inventory['Piedra Solar'] = (state.inventory['Piedra Solar'] || 0) + qty; }
      },
      {
        id: 'piedra_hielo', cat: 'stones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ice-stone.png',
        name: 'Piedra Hielo', icon: '🧊', price: 3000, unlockLv: 7, tier: 'epic',
        desc: 'Hace evolucionar a Eevee y Alolan forms.',
        type: 'stone', stoneType: 'ice',
        effect: (qty) => { state.inventory['Piedra Hielo'] = (state.inventory['Piedra Hielo'] || 0) + qty; }
      },
      {
        id: 'piedra_brillo', cat: 'stones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/shiny-stone.png',
        name: 'Piedra Brillo', icon: '✨', price: 3500, unlockLv: 7, tier: 'legend',
        desc: 'Hace evolucionar a Togetic, Roselia y Minccino.',
        type: 'stone', stoneType: 'shiny',
        effect: (qty) => { state.inventory['Piedra Brillo'] = (state.inventory['Piedra Brillo'] || 0) + qty; }
      },

      // ── ÍTEMS EQUIPABLES (held items) ──────────────────────────────────────────
      {
        id: 'exp_share', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/exp-share.png',
        name: 'Compartir EXP', icon: '⭐', price: 0, unlockLv: 4, tier: 'rare', market: false, trainerShop: true, bcPrice: 300,
        desc: 'Equipable. El portador gana EXP aunque no participe en batalla.',
        type: 'held', heldEffect: 'exp_share',
        effect: (qty) => { state.inventory['Compartir EXP'] = (state.inventory['Compartir EXP'] || 0) + qty; }
      },
      {
        id: 'leftovers', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/leftovers.png',
        name: 'Restos', icon: '🍖', price: 4000, unlockLv: 6, tier: 'epic',
        desc: 'Equipable. El portador recupera 1/16 de su HP máx. cada turno.',
        type: 'held', heldEffect: 'leftovers',
        effect: (qty) => { state.inventory['Restos'] = (state.inventory['Restos'] || 0) + qty; }
      },
      {
        id: 'scope_lens', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/scope-lens.png',
        name: 'Lente Zoom', icon: '🔍', price: 3500, unlockLv: 5, tier: 'epic',
        desc: 'Equipable. Aumenta la tasa de golpe crítico del portador.',
        type: 'held', heldEffect: 'scope_lens',
        effect: (qty) => { state.inventory['Lente Zoom'] = (state.inventory['Lente Zoom'] || 0) + qty; }
      },
      {
        id: 'shell_bell', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/shell-bell.png',
        name: 'Cascabel Concha', icon: '🔔', price: 4000, unlockLv: 6, tier: 'epic',
        desc: 'Equipable. El portador recupera HP igual a 1/8 del daño infligido.',
        type: 'held', heldEffect: 'shell_bell',
        effect: (qty) => { state.inventory['Cascabel Concha'] = (state.inventory['Cascabel Concha'] || 0) + qty; }
      },
      {
        id: 'black_belt', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/black-belt.png',
        name: 'Cinturón Negro', icon: '🥋', price: 2500, unlockLv: 4, tier: 'rare',
        desc: 'Equipable. Aumenta 20% el poder de movimientos de tipo Lucha.',
        type: 'held', heldEffect: 'black_belt',
        effect: (qty) => { state.inventory['Cinturón Negro'] = (state.inventory['Cinturón Negro'] || 0) + qty; }
      },
      {
        id: 'charcoal', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/charcoal.png',
        name: 'Carbón', icon: '🪨', price: 2500, unlockLv: 4, tier: 'rare',
        desc: 'Equipable. Aumenta 20% el poder de movimientos de tipo Fuego.',
        type: 'held', heldEffect: 'charcoal',
        effect: (qty) => { state.inventory['Carbón'] = (state.inventory['Carbón'] || 0) + qty; }
      },
      {
        id: 'mystic_water', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/mystic-water.png',
        name: 'Agua Mística', icon: '💦', price: 2500, unlockLv: 4, tier: 'rare',
        desc: 'Equipable. Aumenta 20% el poder de movimientos de tipo Agua.',
        type: 'held', heldEffect: 'mystic_water',
        effect: (qty) => { state.inventory['Agua Mística'] = (state.inventory['Agua Mística'] || 0) + qty; }
      },
      {
        id: 'miracle_seed', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/miracle-seed.png',
        name: 'Semilla Milagro', icon: '🌱', price: 2500, unlockLv: 4, tier: 'rare',
        desc: 'Equipable. Aumenta 20% el poder de movimientos de tipo Planta.',
        type: 'held', heldEffect: 'miracle_seed',
        effect: (qty) => { state.inventory['Semilla Milagro'] = (state.inventory['Semilla Milagro'] || 0) + qty; }
      },
      {
        id: 'magnet', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/magnet.png',
        name: 'Imán', icon: '🧲', price: 2500, unlockLv: 4, tier: 'rare',
        desc: 'Equipable. Aumenta 20% el poder de movimientos de tipo Eléctrico.',
        type: 'held', heldEffect: 'magnet',
        effect: (qty) => { state.inventory['Imán'] = (state.inventory['Imán'] || 0) + qty; }
      },
      {
        id: 'lucky_egg', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/lucky-egg.png',
        name: 'Huevo Suerte', icon: '🥚', price: 0, unlockLv: 7, tier: 'legend', market: false, trainerShop: true, bcPrice: 500,
        desc: 'Equipable. El portador gana 50% más de EXP en cada batalla.',
        type: 'held', heldEffect: 'lucky_egg',
        effect: (qty) => { state.inventory['Huevo Suerte'] = (state.inventory['Huevo Suerte'] || 0) + qty; }
      },
      {
        id: 'choice_band', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/choice-band.png',
        name: 'Cinta Elegida', icon: '🎀', price: 5000, unlockLv: 7, tier: 'legend',
        desc: 'Equipable. Aumenta 50% el Ataque, pero solo permite un movimiento.',
        type: 'held', heldEffect: 'choice_band',
        effect: (qty) => { state.inventory['Cinta Elegida'] = (state.inventory['Cinta Elegida'] || 0) + qty; }
      },
      {
        id: 'focus_sash', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/focus-sash.png',
        name: 'Banda Focus', icon: '🎗️', price: 4500, unlockLv: 8, tier: 'legend',
        desc: 'Equipable. Sobrevive con 1 HP si el portador tiene HP completo al recibir un golpe KO.',
        type: 'held', heldEffect: 'focus_sash',
        effect: (qty) => { state.inventory['Banda Focus'] = (state.inventory['Banda Focus'] || 0) + qty; }
      },

      // ── ESPECIALES ─────────────────────────────────────────────────────────────
      {
        id: 'rare_candy', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.png',
        name: 'Caramelo Raro', icon: '🍬', price: 5000, unlockLv: 5, tier: 'epic',
        desc: 'Sube un nivel a cualquier Pokémon del equipo al instante.',
        type: 'usable',
        effect: (qty) => { state.inventory['Caramelo Raro'] = (state.inventory['Caramelo Raro'] || 0) + qty; }
      },
      {
        id: 'pp_up', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/pp-up.png',
        name: 'Subida PP', icon: '📈', price: 0, unlockLv: 5, tier: 'epic', market: false, trainerShop: true, bcPrice: 150,
        desc: 'Aumenta los PP máximos de un movimiento en un 20%.',
        effect: (qty) => { state.inventory['Subida PP'] = (state.inventory['Subida PP'] || 0) + qty; }
      },
      {
        id: 'hp_up', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/hp-up.png',
        name: 'Vitamina HP', icon: '❤️', price: 4000, unlockLv: 5, tier: 'epic',
        desc: 'Aumenta permanentemente los PS base de un Pokémon.',
        effect: (qty) => { state.inventory['Vitamina HP'] = (state.inventory['Vitamina HP'] || 0) + qty; }
      },
      {
        id: 'protein', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/protein.png',
        name: 'Proteína', icon: '💪', price: 4000, unlockLv: 5, tier: 'epic',
        desc: 'Aumenta permanentemente el Ataque base de un Pokémon.',
        effect: (qty) => { state.inventory['Proteína'] = (state.inventory['Proteína'] || 0) + qty; }
      },
      {
        id: 'iron', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/iron.png',
        name: 'Hierro', icon: '🛡️', price: 4000, unlockLv: 5, tier: 'epic',
        desc: 'Aumenta permanentemente la Defensa base de un Pokémon.',
        effect: (qty) => { state.inventory['Hierro'] = (state.inventory['Hierro'] || 0) + qty; }
      },
      { id: 'move_reminder', cat: 'utility', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.png',
        name: 'Recordador de Movimientos', icon: 'ðŸ§ ', price: 0, market: false, trainerShop: true, bcPrice: 150, unlockLv: 1, tier: 'rare', type: 'utility',
        desc: 'Permite que un Pokemon aprenda un movimiento que ya conocia.',
        effect: (qty) => { state.inventory['Recordador de Movimientos'] = (state.inventory['Recordador de Movimientos'] || 0) + qty; }
      },
      {
        id: 'ticket_shiny', cat: 'booster', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/eon-ticket.png',
        name: 'Ticket Shiny', icon: 'âœ¨', price: 0, market: false, trainerShop: true, bcPrice: 400, unlockLv: 1, tier: 'epic', type: 'booster',
        desc: 'Aumenta temporalmente la probabilidad de encontrar Pokemon Shiny durante 30 minutos.',
        effect: (qty) => { state.inventory['Ticket Shiny'] = (state.inventory['Ticket Shiny'] || 0) + qty; }
      },
      {
        id: 'amulet_coin', cat: 'booster', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/amulet-coin.png',
        name: 'Moneda Amuleto', icon: 'ðŸ’°', price: 0, market: false, trainerShop: true, bcPrice: 250, unlockLv: 1, tier: 'rare', type: 'booster',
        desc: 'Aumenta el dinero obtenido en las batallas durante 30 minutos.',
        effect: (qty) => { state.inventory['Moneda Amuleto'] = (state.inventory['Moneda Amuleto'] || 0) + qty; }
      },      { id: 'tm_return', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.png',
        name: 'MT27 Retribución', icon: '📀', price: 0, unlockLv: 4, tier: 'rare', market: false, trainerShop: true, bcPrice: 200,
        desc: 'Enseña Retribución. Potencia según la amistad del Pokémon (máx. 102).',
        effect: (qty) => { state.inventory['MT Retribución'] = (state.inventory['MT Retribución'] || 0) + qty; }
      },
      {
        id: 'tm_earthquake', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-ground.png',
        name: 'MT26 Terremoto', icon: '📀', price: 0, unlockLv: 6, tier: 'epic', market: false, trainerShop: true, bcPrice: 350,
        desc: 'Enseña Terremoto. Movimiento Tierra de 100 de potencia.',
        effect: (qty) => { state.inventory['MT Terremoto'] = (state.inventory['MT Terremoto'] || 0) + qty; }
      },
      {
        id: 'tm_blizzard', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-ice.png',
        name: 'MT14 Ventisca', icon: '📀', price: 0, unlockLv: 7, tier: 'legend', market: false, trainerShop: true, bcPrice: 300,
        desc: 'Enseña Ventisca. Movimiento Hielo de 110 de potencia.',
        effect: (qty) => { state.inventory['MT Ventisca'] = (state.inventory['MT Ventisca'] || 0) + qty; }
      },
      {
        id: 'soda_pop', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/soda-pop.png',
        name: 'Refresco', icon: '🥤', price: 300, unlockLv: 2, tier: 'common',
        desc: 'Restaura 60 HP a un Pokémon. Mejor que la Poción.',
        effect: (qty) => { state.inventory['Refresco'] = (state.inventory['Refresco'] || 0) + qty; }
      },
      {
        id: 'lemonade', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/lemonade.png',
        name: 'Limonada', icon: '🍋', price: 350, unlockLv: 2, tier: 'common',
        desc: 'Restaura 80 HP a un Pokémon.',
        effect: (qty) => { state.inventory['Limonada'] = (state.inventory['Limonada'] || 0) + qty; }
      },
    ];

    let _marketCat = 'todos';
let _marketQty = {};
let _shopSection = 'pokemart';

function switchShopSection(section) {
  _shopSection = section;
  const pmDiv = document.getElementById('shop-pokemart-section');
  const trDiv = document.getElementById('shop-trainer-section');
  if (pmDiv) pmDiv.style.display = section === 'pokemart' ? 'block' : 'none';
  if (trDiv) trDiv.style.display = section === 'trainer' ? 'block' : 'none';
  const pmBtn = document.getElementById('shop-sw-pokemart');
  const trBtn = document.getElementById('shop-sw-trainer');
  if (pmBtn) { pmBtn.style.background = section === 'pokemart' ? 'var(--yellow)' : 'transparent'; pmBtn.style.color = section === 'pokemart' ? 'var(--darker)' : 'var(--gray)'; }
  if (trBtn) { trBtn.style.background = section === 'trainer' ? 'var(--purple)' : 'transparent'; trBtn.style.color = section === 'trainer' ? '#fff' : 'var(--gray)'; }
  if (section === 'trainer') renderTrainerShop();
  else renderMarket();
}

function renderTrainerShop() {
  const bcEl = document.getElementById('trainer-shop-bc');
  if (bcEl) bcEl.textContent = (state.battleCoins || 0).toLocaleString();
  const rank = getTrainerRank();
  const levelEl = document.getElementById('trainer-shop-level');
  if (levelEl) levelEl.innerHTML = `<span style="color:var(--purple);">⭐ Rango: <strong>${rank.title}</strong> (Nv. ${state.trainerLevel})</span> &nbsp;·&nbsp; Comprá ítems exclusivos con Battle Coins.`;
  const tierColors = { common: 'tier-common', rare: 'tier-rare', epic: 'tier-epic', legend: 'tier-legend' };
  const tierLabels = { common: 'Común', rare: 'Raro', epic: 'Épico', legend: 'Legendario' };
  const trainerItems = SHOP_ITEMS.filter(i => i.trainerShop === true);
  const grid = document.getElementById('trainer-shop-grid');
  if (!grid) return;
  grid.innerHTML = trainerItems.map(item => {
    const locked = state.trainerLevel < item.unlockLv;
    const bc = state.battleCoins || 0;
    const canAfford = bc >= item.bcPrice;
    const tierCls = tierColors[item.tier] || 'tier-common';
    return `<div class="market-card ${locked ? 'locked' : ''}">
      <span class="market-tier-badge ${tierCls}">${tierLabels[item.tier] || item.tier}</span>
      <div class="market-item-icon">
        ${item.sprite ? `<img src="${item.sprite}" width="40" height="40" style="image-rendering:pixelated;" onerror="this.style.display='none'">` : `<span style="font-size:32px">${item.icon}</span>`}
      </div>
      <div class="market-item-name">${item.name}</div>
      <div class="market-item-desc" style="margin-top:4px;">${item.desc}</div>
      ${locked ? `<div class="market-item-unlock">🔒 Nv. ${item.unlockLv}</div>` : ''}
      <div class="market-item-price" style="color:var(--purple);">🪙 ${item.bcPrice} BC</div>
      <button class="market-buy-btn" onclick="buyItemBC('${item.id}')"
        style="${!locked && canAfford ? 'background:linear-gradient(135deg,var(--purple),#9b4dff);' : ''}"
        ${locked || !canAfford ? 'disabled' : ''}>
        ${locked ? '🔒 BLOQUEADO' : !canAfford ? 'SIN BC' : 'COMPRAR'}
      </button>
    </div>`;
  }).join('');
}

function buyItemBC(itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item || !item.trainerShop) return;
  if (state.trainerLevel < item.unlockLv) { notify('¡Ítem bloqueado!', '🔒'); return; }
  if ((state.battleCoins || 0) < item.bcPrice) { notify('¡No tenés suficientes Battle Coins!', '🪙'); return; }
  if (typeof item.effect !== 'function') { notify('Este ítem todavía no se puede comprar.', '⚠️'); return; }
  state.battleCoins -= item.bcPrice;
  item.effect(1);
  updateHud();
  renderTrainerShop();
  notify(`¡Compraste ${item.name}!`, '🏅');
}

function _marketGetQty(itemId) {
  const v = parseInt(_marketQty[itemId]);
  if (!Number.isFinite(v) || v < 1) return 1;
  return Math.min(999, v);
}

function _marketSetQty(itemId, raw) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return;

  let qty = parseInt(raw);
  if (!Number.isFinite(qty) || qty < 1) qty = 1;
  if (qty > 999) qty = 999;

  _marketQty[itemId] = qty;

  const total = item.price * qty;
  const totalEl = document.getElementById('market-total-' + itemId);
  if (totalEl) totalEl.textContent = total.toLocaleString();

  const btn = document.getElementById('market-buy-' + itemId);
  if (btn) {
    const locked = state.trainerLevel < item.unlockLv;
    const canAfford = state.money >= total;
    btn.disabled = locked || !canAfford;
    btn.textContent = locked ? '🔒 BLOQUEADO' : !canAfford ? 'SIN FONDOS' : ('COMPRAR x' + qty);
  }
}

    function renderMarket() {
      document.getElementById('market-money').textContent = state.money.toLocaleString();
      const rank = getTrainerRank();
      document.getElementById('market-trainer-level').innerHTML =
        `<span style="color:var(--purple);">⭐ Rango: <strong>${rank.title}</strong> (Nv. ${state.trainerLevel})</span> &nbsp;·&nbsp; Más ítems se desbloquean al subir de nivel.`;

      // Inventory
      const invEntries = Object.entries(state.inventory).filter(([, v]) => v > 0).map(([k, v]) => `${k} ×${v}`).join(' &nbsp;|&nbsp; ');

      const tierColors = { common: 'tier-common', rare: 'tier-rare', epic: 'tier-epic', legend: 'tier-legend' };
      const tierLabels = { common: 'Común', rare: 'Raro', epic: 'Épico', legend: 'Legendario' };
      const typeTagColors = { stone: '#f5a623', held: '#7ed321', usable: '#4a90e2' };
      const typeTagLabels = { stone: 'Piedra', held: 'Equipable', usable: 'Usable' };

      // ── Category tabs — separate container, no grid inheritance ──
      const tabsEl = document.getElementById('market-tabs');
      tabsEl.innerHTML = `
        <div class="market-tab-bar">
          ${ITEM_CATEGORIES.map(c => `
            <button class="market-tab-btn ${_marketCat === c ? 'active' : ''}"
              onclick="_marketCat='${c}';renderMarket()">
              ${CATEGORY_LABELS[c]}
            </button>`).join('')}
        </div>`;

      // ── Items grid ──
      const filtered = SHOP_ITEMS.filter(i => i.market !== false && (_marketCat === 'todos' || i.cat === _marketCat));
      const grid = document.getElementById('market-grid');
      grid.innerHTML = filtered.map(item => {
        const locked = state.trainerLevel < item.unlockLv;
        const qty = _marketGetQty(item.id);
        const total = item.price * qty;
        const canAfford = state.money >= total;
        const tierCls = tierColors[item.tier];
        const typeTag = item.type ? `<span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:8px;background:${typeTagColors[item.type] || '#666'}22;color:${typeTagColors[item.type] || '#aaa'};border:1px solid ${typeTagColors[item.type] || '#666'}44;">${typeTagLabels[item.type] || item.type}</span>` : '';
        return `<div class="market-card ${locked ? 'locked' : ''}">
        <span class="market-tier-badge ${tierCls}">${tierLabels[item.tier]}</span>
        <div class="market-item-icon">
          ${item.sprite
            ? `<img src="${item.sprite}" width="40" height="40" style="image-rendering:pixelated;" onerror="this.style.display='none'">`
            : `<span style="font-size:32px">${item.icon}</span>`}
        </div>
        <div class="market-item-name">${item.name}</div>
        ${typeTag}
        <div class="market-item-desc" style="margin-top:4px;">${item.desc}</div>
        ${locked ? `<div class="market-item-unlock">🔒 Nv. ${item.unlockLv}</div>` : ''}
        <div style="display:flex;justify-content:center;align-items:center;gap:10px;margin-top:10px;">
          <span style="font-size:11px;color:var(--gray);font-weight:700;">Cantidad</span>
          <input id="market-qty-${item.id}" type="number" min="1" max="999" value="${qty}"
            ${locked ? 'disabled' : ''}
            oninput="_marketSetQty('${item.id}', this.value)" onchange="_marketSetQty('${item.id}', this.value)"
            style="width:90px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.06);color:#fff;border:1px solid rgba(255,255,255,0.12);text-align:center;outline:none;">
        </div>
        <div class="market-item-price">₽${item.price.toLocaleString()}</div>
        <div style="font-size:11px;color:var(--yellow);font-weight:900;margin-top:6px;">Total: ₽<span id="market-total-${item.id}">${total.toLocaleString()}</span></div>
        <button id="market-buy-${item.id}" class="market-buy-btn" onclick="buyItem('${item.id}')"
          ${locked || !canAfford ? 'disabled' : ''}>
          ${locked ? '🔒 BLOQUEADO' : !canAfford ? 'SIN FONDOS' : ('COMPRAR x' + qty)}
        </button>
      </div>`;
      }).join('');
    }

    function buyItem(itemId) {
      const item = SHOP_ITEMS.find(i => i.id === itemId);
      if (!item) return;
      if (state.trainerLevel < item.unlockLv) { notify('¡Item bloqueado!', '🔒'); return; }

      const qty = _marketGetQty(itemId);
      const total = item.price * qty;

      if (state.money < total) { notify('¡No tenés suficiente dinero!', '💸'); return; }
      if (typeof item.effect !== 'function') { notify('Este ítem todavía no se puede comprar.', '⚠️'); return; }

      state.money -= total;
      item.effect(qty);
      updateHud();
      renderMarket();
      notify(`¡Compraste x${qty} ${item.name}!`, item.icon);
    }

    // Use item in battle
    function useItemInBattle(itemName) {
      const b = state.battle;
      if (!b || b.over) return;
      const count = state.inventory[itemName] || 0;
      if (count <= 0) { notify(`No tenés ${itemName}`, '❌'); return; }

      const p = b.player;
      let used = false;
      if (itemName === 'Poción') { p.hp = Math.min(p.maxHp, p.hp + 20); used = true; }
      else if (itemName === 'Super Poción') { p.hp = Math.min(p.maxHp, p.hp + 50); used = true; }
      else if (itemName === 'Hiper Poción') { p.hp = Math.min(p.maxHp, p.hp + 200); used = true; }
      else if (itemName === 'Poción Máxima') { p.hp = p.maxHp; used = true; }

      if (used) {
        state.inventory[itemName]--;
        const tm = state.team.find(pk => pk.name === p.name);
        if (tm) tm.hp = p.hp;
        setLog(`Usaste ${itemName} en ${p.name}!`, 'log-info');
        updateBattleUI();
        setBtns(false);
        setTimeout(() => enemyTurn(), 1000);
      }
    }


    const BATTLE_BG_DATA = {
      bosque_dawn: 'assets/sprites/bosque_dawn.png',
      bosque_day: 'assets/sprites/bosque_day.png',
      bosque_night: 'assets/sprites/bosque_night.png',
      montana_dawn: 'assets/sprites/montana_dawn.png',
      montana_day: 'assets/sprites/montana_day.png',
      montana_dusk: 'assets/sprites/montana_dusk.png',
      montana_night: 'assets/sprites/montana_night.png',
      playa_dawn: 'assets/sprites/playa_dawn.png',
      playa_day: 'assets/sprites/playa_day.png',
      playa_night: 'assets/sprites/playa_night.png',
      puente_dawn: 'assets/sprites/puente_dawn.png',
      puente_dusk: 'assets/sprites/puente_dusk.png',
      puente_day: 'assets/sprites/puente_day.png',
      puente_night: 'assets/sprites/puente_night.png',
      pvp_dawn: 'assets/sprites/pvp_dawn.png',
      pvp_day: 'assets/sprites/pvp_day.png',
      pvp_night: 'assets/sprites/pvp_night.png',
      ruta_dawn: 'assets/sprites/ruta_dawn.png',
      ruta_day: 'assets/sprites/ruta_day.png',
      ruta_night: 'assets/sprites/ruta_night.png',
    };

    // ===== BATTLE BACKGROUNDS =====
    // Maps each location to a biome key, then picks the right time variant.
    // Biomes: bosque | montana | playa | puente | ruta | pvp
    const _BIOME_MAP = {
      // Forest / jungle
      forest: 'bosque', route2: 'bosque', route25: 'puente',
      // Mountain / cave
      cave: 'montana', mt_moon: 'montana', rock_tunnel: 'montana',
      cerulean_cave: 'montana', victory_road: 'montana', diglett_cave: 'montana',
      // Water / beach
      water: 'playa', seafoam_islands: 'playa',
      // Bridge routes
      route24: 'puente', route12: 'puente',
      // Gym / pvp
      gym: 'pvp', pvp: 'pvp',
      // Default routes → ruta
    };
    function _getBiome(locationId) {
      return _BIOME_MAP[locationId] || 'ruta';
    }
    function _getBgKey(locationId, cycle) {
      const biome = _getBiome(locationId);
      // dawn/dusk share same art for: bosque, playa, ruta, pvp; puente and montana have separate
      const cycleKey = {
        morning: 'dawn',
        day: 'day',
        dusk: 'dusk',
        night: 'night',
      }[cycle] || 'day';

      // For biomes that share dawn/dusk art
      const sharedDawnDusk = ['bosque', 'playa', 'ruta', 'pvp'];
      if (sharedDawnDusk.includes(biome) && cycleKey === 'dusk') return `${biome}_dawn`;
      return `${biome}_${cycleKey}`;
    }

    // Preload all background images
    const _bgCache = {};
    function _preloadBgs() {
      Object.entries(BATTLE_BG_DATA).forEach(([key, src]) => {
        const img = new Image();
        img.src = src;
        _bgCache[key] = img;
      });
    }
    _preloadBgs();

    function drawBattleBackground(locationId, cycleOverride) {
      const canvasId = locationId === 'pvp' ? 'pvp-battle-bg-canvas' : 'battle-bg-canvas';
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const arenaId = locationId === 'pvp' ? 'pvp-arena' : 'battle-arena';
      const arena = document.getElementById(arenaId);
      if (!arena) return;

      const W = arena.offsetWidth || 600;
      const H = arena.offsetHeight || 340;
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;

      const cycle = cycleOverride || getDayCycle();
      let src = '';
      let cacheKey = locationId + '_' + cycle;

      if (locationId === 'gym' || (state.battle && state.battle.isGym)) {
        src = 'assets/GIMNASIO.jpg';
        cacheKey = 'gym_global'; 
      } else if (locationId === 'pvp') {
        const pvpBgs = {
          morning: 'assets/pvp_dawn.jpg',
          day: 'assets/pvp_day.jpg',
          afternoon: 'assets/pvp_day.jpg',
          night: 'assets/pvp_night.jpg',
          dusk: 'assets/pvp_dawn.jpg'
        };
        src = pvpBgs[cycle] || 'assets/pvp_day.jpg';
      } else {
        let key = _getBgKey(locationId, cycle);
        src = BATTLE_BG_DATA[key] || BATTLE_BG_DATA.ruta_day;
        cacheKey = key;
      }

      function draw(img) {
        if (!img.complete || img.naturalWidth === 0) return;
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        const scale = Math.max(W / iw, H / ih);
        const dw = iw * scale, dh = ih * scale;
        const dx = (W - dw) / 2, dy = (H - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
        
        const vgr = ctx.createRadialGradient(W / 2, H / 2, H * 0.15, W / 2, H / 2, H * 0.9);
        vgr.addColorStop(0, 'rgba(0,0,0,0)');
        vgr.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = vgr; ctx.fillRect(0, 0, W, H);
      }

      const cached = _bgCache[cacheKey];
      if (cached && cached.complete && cached.naturalWidth > 0) {
        draw(cached);
      } else {
        const img = new Image();
        img.onload = () => {
          _bgCache[cacheKey] = img;
          draw(img);
        };
        img.onerror = () => {
          console.error("Failed to load background:", src);
          ctx.fillStyle = '#0d1117';
          ctx.fillRect(0, 0, W, H);
        };
        img.src = src;
      }
    }

