    // ===== MIGRATION: LUCKY EGG =====
    function migrateLuckyEgg() {
      if (!state.team) return;
      let count = 0;
      
      // Check team
      state.team.forEach(p => {
        if (p.heldItem === 'Huevo Suerte' || p.heldItem === 'lucky_egg') {
          p.heldItem = null;
          count++;
        }
      });
      
      // Check box
      if (state.box) {
        state.box.forEach(p => {
          if (p.heldItem === 'Huevo Suerte' || p.heldItem === 'lucky_egg') {
            p.heldItem = null;
            count++;
          }
        });
      }
      
      if (count > 0) {
        state.inventory['Huevo Suerte Pequeño'] = (state.inventory['Huevo Suerte Pequeño'] || 0) + count;
        console.log(`[MIGRATION] Convertidos ${count} Huevo Suerte a Huevo Suerte Pequeño.`);
      }
    }

    /**
     * Migración Global de Movimientos:
     * Asegura que los Pokémon existentes en el equipo y la caja usen los datos
     * actualizados de MOVE_DATA (especialmente efectos de curación y tipos).
     */
    function migrateMoveData() {
      if (!state.team || typeof MOVE_DATA === 'undefined') return;
      
      const migrate = (p) => {
        if (!p.moves) return;
        p.moves.forEach(m => {
          const md = MOVE_DATA[m.name];
          if (md) {
            // Actualizar PP máximo si ha cambiado en la base de datos
            if (m.maxPP !== md.pp) {
              m.maxPP = md.pp;
              m.pp = Math.min(m.pp, m.maxPP);
            }
            // LIMPIEZA AGRESIVA: Si el movimiento es de estado en MOVE_DATA,
            // forzar que no tenga poder en el objeto persistido.
            if (md.cat === 'status') {
              m.power = 0;
            }
          }
        });
      };

      state.team.forEach(migrate);
      if (state.box) state.box.forEach(migrate);
      console.log("[MIGRATION] Datos de movimientos normalizados y categorías corregidas.");
    }

    // Ejecutar migraciones al cargar
    setTimeout(() => {
      migrateLuckyEgg();
      migrateMoveData();
    }, 500);

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
      healAllPokemon();
    }

    function closePokemonCenter() {
      document.getElementById('pokemon-center-overlay').style.display = 'none';
    }

    function getHealCost() {
      if (!state.playerClass || typeof getClassModifier !== 'function') return 0;
      const damagedCount = (state.team || []).filter(p => p.hp < p.maxHp || p.status || p.moves.some(m => m.pp < m.maxPP)).length;
      if (damagedCount === 0) return 0;

      let mult = 1.0;
      if (state.playerClass === 'rocket') {
        mult = getClassModifier('healCostMult');
      } else if (state.playerClass === 'criador') {
        const hasForeign = (state.team || []).some(p => p.originalTrainer && p.originalTrainer !== state.trainer);
        mult = getClassModifier('healCostMult', { isForeign: hasForeign });
      }
      if (mult <= 1.0) return 0;
      return Math.floor(50 * damagedCount * (mult - 1.0));
    }

    function healAllPokemon() {
      // Costo extra por clase
      const extraCost = getHealCost();
      
      // Si hay costo, pedir confirmación visual antes de curar (opcional, pero mejor informamos)
      if (extraCost > 0 && !confirm(`Curar a tu equipo tiene un costo de ₽${extraCost} debido a tu clase (${state.playerClass === 'rocket' ? 'Equipo Rocket' : 'Criador'}). ¿Continuar?`)) {
        closePokemonCenter();
        return;
      }

      if (extraCost > 0 && (state.money || 0) < extraCost) {
        notify(`No tenés suficiente dinero para curar (costo: ₽${extraCost})`, '💸');
        closePokemonCenter();
        return;
      }
      if (extraCost > 0) {
        state.money -= extraCost;
        const cls = state.playerClass === 'rocket' ? '🚀 Equipo Rocket' : '🧬 Criador';
        notify(`${cls}: curación con recargo. ₽${extraCost} cobrados.`, '🏥');
      }

      // Logic to heal
      state.team.forEach(p => {
        p.hp = p.maxHp;
        p.status = null;
        p.sleepTurns = 0;
        p.moves.forEach(m => { m.pp = m.maxPP; });
      });

      // UI Feedback
      const effect = document.getElementById('healing-effect');
      if (effect) effect.style.display = 'block';

      // 2 seconds animation
      setTimeout(() => {
        if (effect) effect.style.display = 'none';
        
        // Wait 0.8s more so the user can read the "Healed" text on the image
        setTimeout(() => {
          closePokemonCenter();
          notify('¡Tu equipo ha sido curado!', '💊');
          if (typeof renderTeam === 'function') renderTeam();
          if (typeof renderMaps === 'function') renderMaps();
          if (typeof updateHud === 'function') updateHud();
        }, 800);
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
      { lv: 10, title: 'Campeón', expNeeded: 8500 },
      { lv: 11, title: 'As de la Liga', expNeeded: 11500 },
      { lv: 12, title: 'Entrenador de Elite', expNeeded: 15000 },
      { lv: 13, title: 'Gran Campeón', expNeeded: 19000 },
      { lv: 14, title: 'Leyenda Viviente', expNeeded: 23500 },
      { lv: 15, title: 'Maestro Pokémon', expNeeded: 28500 },
      { lv: 16, title: 'Héroe Regional', expNeeded: 34000 },
      { lv: 17, title: 'Vencedor Supremo', expNeeded: 40000 },
      { lv: 18, title: 'Estratega Maestro', expNeeded: 46500 },
      { lv: 19, title: 'Guardián de Kanto', expNeeded: 53500 },
      { lv: 20, title: 'Elegido de los Dioses', expNeeded: 61000 },
      { lv: 21, title: 'Trascendente', expNeeded: 69000 },
      { lv: 22, title: 'Sabio de Combate', expNeeded: 77500 },
      { lv: 23, title: 'Señor de los Dragones', expNeeded: 86500 },
      { lv: 24, title: 'Conquistador de Cimas', expNeeded: 96000 },
      { lv: 25, title: 'Místico de Kanto', expNeeded: 106000 },
      { lv: 26, title: 'Soberano de Batalla', expNeeded: 116500 },
      { lv: 27, title: 'Omnisciente', expNeeded: 127500 },
      { lv: 28, title: 'Eterno', expNeeded: 139000 },
      { lv: 29, title: 'Divinidad Pokémon', expNeeded: 151500 },
      { lv: 30, title: 'Deidad de Kanto', expNeeded: 9999999 },
    ];

    function getTrainerRank() {
      return TRAINER_RANKS[Math.min(state.trainerLevel - 1, TRAINER_RANKS.length - 1)];
    }

    function addTrainerExp(amount) {
      const evBonus = (typeof getEventBonus === 'function') ? getEventBonus('exp') : 1;
      if (evBonus > 1) amount = Math.round(amount * evBonus);
      state.trainerExp += amount;
      const MAX_TRAINER_LEVEL = 30;
      
      let rank = getTrainerRank();
      while (state.trainerExp >= rank.expNeeded && state.trainerLevel < MAX_TRAINER_LEVEL) {
        state.trainerExp -= rank.expNeeded;
        state.trainerLevel++;
        rank = getTrainerRank();
        notify(`¡Subiste al rango ${rank.title}! Nivel ${state.trainerLevel}`, '⭐');
        
        const unlocks = MARKET_UNLOCKS[state.trainerLevel];
        if (unlocks) setTimeout(() => notify(`¡Nuevos items en el Poké Market!`, '🛒'), 1500);
      }
      updateHud();
      if (typeof checkClassUnlock === 'function') checkClassUnlock();
      if (typeof saveGame === 'function') saveGame(false);
    }

    // What unlocks at each trainer level
    const MARKET_UNLOCKS = {
      3: ['Súper Ball', 'Super Poción'],
      5: ['Red Ball', 'Ocaso Ball', 'Cura Total', 'Compartir EXP', 'MT27 Retribución', 'Ítems de Poder'],
      8: ['Hiper Poción', 'Ultra Ball', 'Revivir', 'Lente Zoom', 'Subida PP'],
      10: ['Turno Ball', 'Restos', 'Cascabel Concha', 'Piedras de Evolución'],
      12: ['Poción Máxima', 'Huevo Suerte Pequeño', 'Cinta Elegida', 'MT14 Ventisca'],
      15: ['Revivir Máximo', 'Elixir Máximo', 'Banda Focus'],
      22: ['Caramelo Raro'],
      25: ['Master Ball']
    };


    // ===== SHOP ITEMS =====
    // Item categories for market tabs
    const ITEM_CATEGORIES = ['todos', 'pokeballs', 'pociones', 'stones', 'breeding', 'especial'];
    const CATEGORY_LABELS = { todos: 'Todo', pokeballs: 'Pokéballs', pociones: 'Pociones', stones: 'Piedras', breeding: 'Cría', especial: 'Especial' };
    const MARKET_CAT_ORDER = { pokeballs: 1, pociones: 2, stones: 3, breeding: 4, especial: 5 };

    const SHOP_ITEMS = [
      // ── BREEDING ITEMS ──────────────────────────────────────────────────────────
      {
        id: 'berry_bronze', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/oran-berry.png',
        name: 'Baya de Bronce', icon: '🥉', price: 5000, unlockLv: 5, tier: 'common',
        desc: 'Acorta el tiempo de la guardería un 10%. Solo un uso por ciclo.',
        effect: (qty) => { state.inventory['Baya de Bronce'] = (state.inventory['Baya de Bronce'] || 0) + qty; }
      },
      {
        id: 'berry_silver', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/sitrus-berry.png',
        name: 'Baya de Plata', icon: '🥈', price: 15000, unlockLv: 10, tier: 'rare',
        desc: 'Acorta el tiempo de la guardería un 30%. Solo un uso por ciclo.',
        effect: (qty) => { state.inventory['Baya de Plata'] = (state.inventory['Baya de Plata'] || 0) + qty; }
      },
      {
        id: 'berry_gold', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/lum-berry.png',
        name: 'Baya de Oro', icon: '🥇', price: 25000, unlockLv: 15, tier: 'epic',
        desc: 'Acorta el tiempo de la guardería un 50%. Solo un uso por ciclo.',
        effect: (qty) => { state.inventory['Baya de Oro'] = (state.inventory['Baya de Oro'] || 0) + qty; }
      },
      {
        id: 'everstone', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/everstone.png',
        name: 'Piedra Eterna', icon: '🪨', price: 10000, unlockLv: 15, tier: 'epic',
        desc: 'Equipada en la guardería, asegura que la cría herede la naturaleza de este padre.',
        effect: (qty) => { state.inventory['Piedra Eterna'] = (state.inventory['Piedra Eterna'] || 0) + qty; }
      },
      {
        id: 'power_weight', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/power-weight.png',
        name: 'Pesa Recia', icon: '🏋️', price: 15000, unlockLv: 20, tier: 'legendary',
        desc: 'Equipada en la guardería, asegura heredar los IVs de PS (Vida) de este padre.',
        effect: (qty) => { state.inventory['Pesa Recia'] = (state.inventory['Pesa Recia'] || 0) + qty; }
      },
      {
        id: 'power_bracer', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/power-bracer.png',
        name: 'Brazal Recio', icon: '🥊', price: 15000, unlockLv: 20, tier: 'legendary',
        desc: 'Equipada en la guardería, asegura heredar los IVs de Ataque de este padre.',
        effect: (qty) => { state.inventory['Brazal Recio'] = (state.inventory['Brazal Recio'] || 0) + qty; }
      },
      {
        id: 'power_belt', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/power-belt.png',
        name: 'Cinto Recio', icon: '🛡️', price: 15000, unlockLv: 20, tier: 'legendary',
        desc: 'Equipada en la guardería, asegura heredar los IVs de Defensa de este padre.',
        effect: (qty) => { state.inventory['Cinto Recio'] = (state.inventory['Cinto Recio'] || 0) + qty; }
      },
      {
        id: 'power_lens', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/power-lens.png',
        name: 'Lente Recia', icon: '🔍', price: 15000, unlockLv: 20, tier: 'legendary',
        desc: 'Equipada en la guardería, asegura heredar los IVs de Ataque Especial de este padre.',
        effect: (qty) => { state.inventory['Lente Recia'] = (state.inventory['Lente Recia'] || 0) + qty; }
      },
      {
        id: 'power_band', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/power-band.png',
        name: 'Banda Recia', icon: '🎗️', price: 15000, unlockLv: 20, tier: 'legendary',
        desc: 'Equipada en la guardería, asegura heredar los IVs de Defensa Especial de este padre.',
        effect: (qty) => { state.inventory['Banda Recia'] = (state.inventory['Banda Recia'] || 0) + qty; }
      },
      {
        id: 'power_anklet', cat: 'breeding', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/power-anklet.png',
        name: 'Franja Recia', icon: '👢', price: 15000, unlockLv: 20, tier: 'legendary',
        desc: 'Equipada en la guardería, asegura heredar los IVs de Velocidad de este padre.',
        effect: (qty) => { state.inventory['Franja Recia'] = (state.inventory['Franja Recia'] || 0) + qty; }
      },

      // ── POKÉBALLS ──────────────────────────────────────────────────────────────
      {
        id: 'pokeball', cat: 'pokeballs', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png',
        name: 'Pokéball', icon: '⚪', price: 200, unlockLv: 1, tier: 'common',
        desc: 'Captura Pokémon salvajes. Tasa de captura estándar.',
        effect: (qty) => { state.inventory['Pokéball'] = (state.inventory['Pokéball'] || 0) + qty; state.balls += qty; }
      },
      {
        id: 'great_ball', cat: 'pokeballs', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png',
        name: 'Súper Ball', icon: '🔵', price: 500, unlockLv: 3, tier: 'rare',
        desc: 'Tasa de captura x1.5 respecto a la Pokéball normal.',
        effect: (qty) => { state.inventory['Súper Ball'] = (state.inventory['Súper Ball'] || 0) + qty; state.balls += Math.floor(qty * 1.5); }
      },
      {
        id: 'ultra_ball', cat: 'pokeballs', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png',
        name: 'Ultra Ball', icon: '⚫', price: 1000, unlockLv: 8, tier: 'epic',
        desc: 'Tasa de captura x2. Alta efectividad contra Pokémon raros.',
        effect: (qty) => { state.inventory['Ultra Ball'] = (state.inventory['Ultra Ball'] || 0) + qty; state.balls += qty * 2; }
      },
      {
        id: 'net_ball', cat: 'pokeballs', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/net-ball.png',
        name: 'Red Ball', icon: '🕸️', price: 800, unlockLv: 5, tier: 'rare',
        desc: 'Tasa de captura x3 contra Pokémon de tipo Agua o Bicho.',
        effect: (qty) => { state.inventory['Red Ball'] = (state.inventory['Red Ball'] || 0) + qty; state.balls += Math.floor(qty * 1.8); }
      },
      {
        id: 'dusk_ball', cat: 'pokeballs', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dusk-ball.png',
        name: 'Ocaso Ball', icon: '🌑', price: 800, unlockLv: 5, tier: 'rare',
        desc: 'Tasa de captura x3 en cuevas o de noche.',
        effect: (qty) => { state.inventory['Ocaso Ball'] = (state.inventory['Ocaso Ball'] || 0) + qty; state.balls += Math.floor(qty * 1.8); }
      },
      {
        id: 'timer_ball', cat: 'pokeballs', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/timer-ball.png',
        name: 'Turno Ball', icon: '⏱️', price: 800, unlockLv: 10, tier: 'epic',
        desc: 'Tasa de captura que aumenta según turnos transcurridos.',
        effect: (qty) => { state.inventory['Turno Ball'] = (state.inventory['Turno Ball'] || 0) + qty; state.balls += qty; }
      },
      {
        id: 'master_ball', cat: 'pokeballs', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png',
        name: 'Master Ball', icon: '🟣', price: 100000, unlockLv: 25, tier: 'legend',
        desc: 'Captura cualquier Pokémon sin fallar. ¡Sin excepción!',
        effect: (qty) => { state.inventory['Master Ball'] = (state.inventory['Master Ball'] || 0) + qty; state.balls += qty * 99; }
      },

      // ── POCIONES ───────────────────────────────────────────────────────────────
      {
        id: 'pocion', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/potion.png',
        name: 'Poción', icon: '🧪', price: 200, unlockLv: 1, tier: 'common',
        desc: 'Restaura 20 HP a un Pokémon.',
        effect: (qty) => { state.inventory['Poción'] = (state.inventory['Poción'] || 0) + qty; }
      },
      {
        id: 'super_pocion', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/super-potion.png',
        name: 'Super Poción', icon: '🔵', price: 600, unlockLv: 3, tier: 'rare',
        desc: 'Restaura 50 HP a un Pokémon.',
        effect: (qty) => { state.inventory['Super Poción'] = (state.inventory['Super Poción'] || 0) + qty; }
      },
      {
        id: 'hiper_pocion', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/hyper-potion.png',
        name: 'Hiper Poción', icon: '🟣', price: 1500, unlockLv: 8, tier: 'epic',
        desc: 'Restaura 200 HP a un Pokémon.',
        effect: (qty) => { state.inventory['Hiper Poción'] = (state.inventory['Hiper Poción'] || 0) + qty; }
      },
      {
        id: 'pocion_max', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/max-potion.png',
        name: 'Poción Máxima', icon: '💜', price: 2500, unlockLv: 12, tier: 'legend',
        desc: 'Restaura todo el HP de un Pokémon.',
        effect: (qty) => { state.inventory['Poción Máxima'] = (state.inventory['Poción Máxima'] || 0) + qty; }
      },
      {
        id: 'revivir', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/revive.png',
        name: 'Revivir', icon: '❤️', price: 2000, unlockLv: 8, tier: 'epic',
        desc: 'Revive a un Pokémon debilitado con la mitad del HP.',
        effect: (qty) => { state.inventory['Revivir'] = (state.inventory['Revivir'] || 0) + qty; }
      },
      {
        id: 'revivir_max', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/max-revive.png',
        name: 'Revivir Máximo', icon: '💖', price: 3000, unlockLv: 15, tier: 'legend',
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
        name: 'Cura Total', icon: '✨', price: 600, unlockLv: 5, tier: 'rare',
        desc: 'Cura todos los estados alterados de un Pokémon.',
        effect: (qty) => { state.inventory['Cura Total'] = (state.inventory['Cura Total'] || 0) + qty; }
      },
      {
        id: 'elixir', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ether.png',
        name: 'Éter', icon: '💎', price: 1200, unlockLv: 5, tier: 'rare',
        desc: 'Restaura 10 PP de un movimiento.',
        effect: (qty) => { state.inventory['Éter'] = (state.inventory['Éter'] || 0) + qty; }
      },
      {
        id: 'elixir_max', cat: 'pociones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/max-elixir.png',
        name: 'Elixir Máximo', icon: '🌟', price: 4500, unlockLv: 15, tier: 'legend',
        desc: 'Restaura todos los PP de todos los movimientos.',
        effect: (qty) => { state.inventory['Elixir Máximo'] = (state.inventory['Elixir Máximo'] || 0) + qty; }
      },
      {
        id: 'repelente', cat: 'utility', trainerShop: true, bcPrice: 500, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/repel.png',
        name: 'Repelente', icon: '🚫', price: 20000, unlockLv: 1, tier: 'common',
        desc: 'Aleja Pokémon salvajes de nivel inferior al tuyo durante 10 min.',
        effect: (qty) => { state.inventory['Repelente'] = (state.inventory['Repelente'] || 0) + qty; }
      },
      {
        id: 'super_repel', cat: 'utility', trainerShop: true, bcPrice: 1000, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/super-repel.png',
        name: 'Superrepelente', icon: '🚫', price: 40000, unlockLv: 3, tier: 'rare',
        desc: 'Aleja Pokémon salvajes de nivel inferior al tuyo durante 20 min.',
        effect: (qty) => { state.inventory['Superrepelente'] = (state.inventory['Superrepelente'] || 0) + qty; }
      },
      {
        id: 'max_repel', cat: 'utility', trainerShop: true, bcPrice: 1500, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/max-repel.png',
        name: 'Máximo Repelente', icon: '🚫', price: 60000, unlockLv: 22, tier: 'epic',
        desc: 'Aleja Pokémon salvajes de nivel inferior al tuyo durante 30 min.',
        effect: (qty) => { state.inventory['Máximo Repelente'] = (state.inventory['Máximo Repelente'] || 0) + qty; }
      },

      // ── PIEDRAS DE EVOLUCIÓN ───────────────────────────────────────────────────
      {
        id: 'piedra_fuego', cat: 'stones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/fire-stone.png',
        name: 'Piedra Fuego', icon: '🔥', price: 20000, unlockLv: 10, tier: 'rare',
        desc: 'Hace evolucionar a Vulpix, Growlithe, Eevee y otros Pokémon de Fuego.',
        type: 'stone', stoneType: 'fire',
        effect: (qty) => { state.inventory['Piedra Fuego'] = (state.inventory['Piedra Fuego'] || 0) + qty; }
      },
      {
        id: 'piedra_agua', cat: 'stones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/water-stone.png',
        name: 'Piedra Agua', icon: '💧', price: 20000, unlockLv: 10, tier: 'rare',
        desc: 'Hace evolucionar a Poliwhirl, Shellder, Staryu y Eevee.',
        type: 'stone', stoneType: 'water',
        effect: (qty) => { state.inventory['Piedra Agua'] = (state.inventory['Piedra Agua'] || 0) + qty; }
      },
      {
        id: 'piedra_trueno', cat: 'stones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/thunder-stone.png',
        name: 'Piedra Trueno', icon: '⚡', price: 20000, unlockLv: 10, tier: 'rare',
        desc: 'Hace evolucionar a Pikachu and Eevee.',
        type: 'stone', stoneType: 'thunder',
        effect: (qty) => { state.inventory['Piedra Trueno'] = (state.inventory['Piedra Trueno'] || 0) + qty; }
      },
      {
        id: 'piedra_hoja', cat: 'stones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/leaf-stone.png',
        name: 'Piedra Hoja', icon: '🌿', price: 20000, unlockLv: 10, tier: 'rare',
        desc: 'Hace evolucionar a Gloom, Weepinbell, Exeggcute y Eevee.',
        type: 'stone', stoneType: 'leaf',
        effect: (qty) => { state.inventory['Piedra Hoja'] = (state.inventory['Piedra Hoja'] || 0) + qty; }
      },
      {
        id: 'piedra_luna', cat: 'stones', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/moon-stone.png',
        name: 'Piedra Lunar', icon: '🌙', price: 20000, unlockLv: 10, tier: 'epic',
        desc: 'Hace evolucionar a Nidorina, Nidorino, Clefairy y Jigglypuff.',
        type: 'stone', stoneType: 'moon',
        effect: (qty) => { state.inventory['Piedra Lunar'] = (state.inventory['Piedra Lunar'] || 0) + qty; }
      },


      // ── ÍTEMS EQUIPABLES (held items) — solo en Tienda Entrenador ──────────────
      {
        id: 'exp_share', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/exp-share.png',
        name: 'Compartir EXP', icon: '🎒', price: 0, unlockLv: 5, tier: 'rare', market: false, trainerShop: true, bcPrice: 800,
        desc: 'Equipable. El portador gana EXP aunque no participe en batalla.',
        type: 'held', heldEffect: 'exp_share',
        effect: (qty) => { state.inventory['Compartir EXP'] = (state.inventory['Compartir EXP'] || 0) + qty; }
      },
      {
        id: 'lucky_egg', cat: 'booster', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/lucky-egg.png',
        name: 'Huevo Suerte Pequeño', icon: '🥚', price: 0, unlockLv: 12, tier: 'legend', market: false, trainerShop: true, bcPrice: 2000,
        desc: 'Aumenta la EXP ganada en un 50% durante 30 minutos.',
        type: 'booster',
        effect: (qty) => { state.inventory['Huevo Suerte Pequeño'] = (state.inventory['Huevo Suerte Pequeño'] || 0) + qty; }
      },
      {
        id: 'leftovers', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/leftovers.png',
        name: 'Restos', icon: '🍖', price: 0, unlockLv: 10, tier: 'epic', market: false, trainerShop: true, bcPrice: 4500,
        desc: 'Equipable. El portador recupera 1/16 de su HP máx. cada turno.',
        type: 'held', heldEffect: 'leftovers',
        effect: (qty) => { state.inventory['Restos'] = (state.inventory['Restos'] || 0) + qty; }
      },
      {
        id: 'shell_bell', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/shell-bell.png',
        name: 'Cascabel Concha', icon: '🔔', price: 0, unlockLv: 10, tier: 'epic', market: false, trainerShop: true, bcPrice: 4500,
        desc: 'Equipable. El portador recupera HP igual a 1/8 del daño infligido.',
        type: 'held', heldEffect: 'shell_bell',
        effect: (qty) => { state.inventory['Cascabel Concha'] = (state.inventory['Cascabel Concha'] || 0) + qty; }
      },
      {
        id: 'choice_band', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/choice-band.png',
        name: 'Cinta Elegida', icon: '🎀', price: 0, unlockLv: 12, tier: 'legend', market: false, trainerShop: true, bcPrice: 4800,
        desc: 'Equipable. Aumenta 50% el Ataque, pero solo permite un movimiento.',
        type: 'held', heldEffect: 'choice_band',
        effect: (qty) => { state.inventory['Cinta Elegida'] = (state.inventory['Cinta Elegida'] || 0) + qty; }
      },
      {
        id: 'focus_sash', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/focus-sash.png',
        name: 'Banda Focus', icon: '🎗️', price: 0, unlockLv: 15, tier: 'legend', market: false, trainerShop: true, bcPrice: 4200,
        desc: 'Equipable. Sobrevive con 1 HP si el portador tiene HP completo al recibir un golpe KO.',
        type: 'held', heldEffect: 'focus_sash',
        effect: (qty) => { state.inventory['Banda Focus'] = (state.inventory['Banda Focus'] || 0) + qty; }
      },
      {
        id: 'scope_lens', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/scope-lens.png',
        name: 'Lente Zoom', icon: '🔍', price: 0, unlockLv: 8, tier: 'epic', market: false, trainerShop: true, bcPrice: 2400,
        desc: 'Equipable. Aumenta la tasa de golpe crítico del portador.',
        type: 'held', heldEffect: 'scope_lens',
        effect: (qty) => { state.inventory['Lente Zoom'] = (state.inventory['Lente Zoom'] || 0) + qty; }
      },
      {
        id: 'black_belt', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/black-belt.png',
        name: 'Cinturón Negro', icon: '🥋', price: 0, unlockLv: 5, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500,
        desc: 'Equipable. Aumenta 20% el poder de movimientos de tipo Lucha.',
        type: 'held', heldEffect: 'black_belt',
        effect: (qty) => { state.inventory['Cinturón Negro'] = (state.inventory['Cinturón Negro'] || 0) + qty; }
      },
      {
        id: 'charcoal', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/charcoal.png',
        name: 'Carbón', icon: '🪨', price: 0, unlockLv: 5, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500,
        desc: 'Equipable. Aumenta 20% el poder de movimientos de tipo Fuego.',
        type: 'held', heldEffect: 'charcoal',
        effect: (qty) => { state.inventory['Carbón'] = (state.inventory['Carbón'] || 0) + qty; }
      },
      {
        id: 'mystic_water', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/mystic-water.png',
        name: 'Agua Mística', icon: '💦', price: 0, unlockLv: 5, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500,
        desc: 'Equipable. Aumenta 20% el poder de movimientos de tipo Agua.',
        type: 'held', heldEffect: 'mystic_water',
        effect: (qty) => { state.inventory['Agua Mística'] = (state.inventory['Agua Mística'] || 0) + qty; }
      },
      {
        id: 'miracle_seed', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/miracle-seed.png',
        name: 'Semilla Milagro', icon: '🌱', price: 0, unlockLv: 5, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500,
        desc: 'Equipable. Aumenta 20% el poder de movimientos de tipo Planta.',
        type: 'held', heldEffect: 'miracle_seed',
        effect: (qty) => { state.inventory['Semilla Milagro'] = (state.inventory['Semilla Milagro'] || 0) + qty; }
      },
      {
        id: 'magnet', cat: 'held', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/magnet.png',
        name: 'Imán', icon: '🧲', price: 0, unlockLv: 5, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500,
        desc: 'Equipable. Aumenta 20% el poder de movimientos de tipo Eléctrico.',
        type: 'held', heldEffect: 'magnet',
        effect: (qty) => { state.inventory['Imán'] = (state.inventory['Imán'] || 0) + qty; }
      },

      // ── ESPECIALES ─────────────────────────────────────────────────────────────
      {
        id: 'rare_candy', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.png',
        name: 'Caramelo Raro', icon: '🍬', price: 0, unlockLv: 22, tier: 'epic', market: false, trainerShop: true, bcPrice: 2500,
        desc: 'Sube un nivel a cualquier Pokémon del equipo al instante.',
        type: 'usable',
        effect: (qty) => { state.inventory['Caramelo Raro'] = (state.inventory['Caramelo Raro'] || 0) + qty; }
      },
      {
        id: 'pp_up', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/pp-up.png',
        name: 'Subida PP', icon: '📈', price: 0, unlockLv: 8, tier: 'epic', market: false, trainerShop: true, bcPrice: 1000,
        desc: 'Aumenta los PP máximos de un movimiento en un 20%.',
        effect: (qty) => { state.inventory['Subida PP'] = (state.inventory['Subida PP'] || 0) + qty; }
      },

      {
        id: 'move_relearner', cat: 'utility', sprite: 'assets/items/recordador.png',
        name: 'Recordador de Movimientos', icon: '🧠', price: 0, unlockLv: 1, tier: 'rare', market: false, trainerShop: true, bcPrice: 1000,
        desc: 'Permite que un Pokémon recupere cualquier movimiento olvidado de su lista de aprendizaje.',
        effect: (qty) => { state.inventory['Recordador de Movimientos'] = (state.inventory['Recordador de Movimientos'] || 0) + qty; }
      },
      {
        id: 'ticket_shiny', cat: 'booster', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/eon-ticket.png',
        name: 'Ticket Shiny', icon: 'âœ¨', price: 0, market: false, trainerShop: true, bcPrice: 15000, unlockLv: 1, tier: 'epic', type: 'booster',
        desc: 'Aumenta temporalmente la probabilidad de encontrar Pokemon Shiny durante 30 minutos.',
        effect: (qty) => { state.inventory['Ticket Shiny'] = (state.inventory['Ticket Shiny'] || 0) + qty; }
      },
      {
        id: 'amulet_coin_booster', cat: 'booster', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/amulet-coin.png',
        name: 'Moneda Amuleto', icon: '💰', price: 5000, market: false, trainerShop: true, bcPrice: 1000, unlockLv: 1, tier: 'rare', type: 'booster',
        desc: 'Aumenta el dinero obtenido en las batallas durante 30 minutos.',
        effect: (qty) => { state.inventory['Moneda Amuleto'] = (state.inventory['Moneda Amuleto'] || 0) + qty; }
      },
      {
        id: 'oran_berry', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/oran-berry.png',
        name: 'Baya Aranja', icon: '🫐', price: 500, market: false, trainerShop: false, tier: 'common',
        desc: 'Una baya que restaura 10 HP al Pokémon que la lleva si su salud baja.',
        effect: (qty) => { state.inventory['Baya Aranja'] = (state.inventory['Baya Aranja'] || 0) + qty; }
      },
      {
        id: 'lucky_egg_held', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/lucky-egg.png',
        name: 'Huevo Suerte', icon: '🥚', price: 10000, market: false, trainerShop: true, bcPrice: 2500, unlockLv: 10, tier: 'epic', type: 'held',
        desc: 'Equipado: Aumenta la experiencia ganada un 50%. Permanente.',
        effect: (qty) => { state.inventory['Huevo Suerte'] = (state.inventory['Huevo Suerte'] || 0) + qty; }
      },
      {
        id: 'light_ball', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/light-ball.png',
        name: 'Bola Luminosa', icon: '⚡', price: 5000, market: false, trainerShop: true, bcPrice: 1500, unlockLv: 8, tier: 'rare', type: 'held',
        desc: 'Equipado en Pikachu: Duplica su Ataque y At. Especial.',
        effect: (qty) => { state.inventory['Bola Luminosa'] = (state.inventory['Bola Luminosa'] || 0) + qty; }
      },
      {
        id: 'thick_club', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/thick-club.png',
        name: 'Hueso Grueso', icon: '🦴', price: 5000, market: false, trainerShop: true, bcPrice: 1500, unlockLv: 8, tier: 'rare', type: 'held',
        desc: 'Equipado en Cubone o Marowak: Duplica su Ataque.',
        effect: (qty) => { state.inventory['Hueso Grueso'] = (state.inventory['Hueso Grueso'] || 0) + qty; }
      },
      {
        id: 'stick', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/stick.png',
        name: 'Palo', icon: '🎋', price: 2000, market: false, trainerShop: true, bcPrice: 800, unlockLv: 5, tier: 'common', type: 'held',
        desc: 'Equipado en Farfetch\'d: Aumenta mucho el ratio de críticos.',
        effect: (qty) => { state.inventory['Palo'] = (state.inventory['Palo'] || 0) + qty; }
      },
      {
        id: 'metal_powder', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/metal-powder.png',
        name: 'Polvo Metálico', icon: '✨', price: 3000, market: false, trainerShop: true, bcPrice: 1000, unlockLv: 8, tier: 'rare', type: 'held',
        desc: 'Equipado en Ditto: Aumenta su Defensa un 50%.',
        effect: (qty) => { state.inventory['Polvo Metálico'] = (state.inventory['Polvo Metálico'] || 0) + qty; }
      },
      {
        id: 'twisted_spoon', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/twisted-spoon.png',
        name: 'Cuchara Torcida', icon: '🥄', price: 2000, market: false, trainerShop: true, bcPrice: 500, unlockLv: 4, tier: 'common', type: 'held',
        desc: 'Equipado: Potencia ataques de tipo Psíquico (+20%).',
        effect: (qty) => { state.inventory['Cuchara Torcida'] = (state.inventory['Cuchara Torcida'] || 0) + qty; }
      },
      {
        id: 'spell_tag', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/spell-tag.png',
        name: 'Hechizo', icon: '📜', price: 2000, market: false, trainerShop: true, bcPrice: 500, unlockLv: 4, tier: 'common', type: 'held',
        desc: 'Equipado: Potencia ataques de tipo Fantasma (+20%).',
        effect: (qty) => { state.inventory['Hechizo'] = (state.inventory['Hechizo'] || 0) + qty; }
      },
      {
        id: 'silver_powder', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/silver-powder.png',
        name: 'Polvo Plata', icon: '✨', price: 2000, market: false, trainerShop: false, tier: 'common', type: 'held',
        desc: 'Equipado: Potencia ataques de tipo Bicho (+20%).',
        effect: (qty) => { state.inventory['Polvo Plata'] = (state.inventory['Polvo Plata'] || 0) + qty; }
      },
      {
        id: 'poison_barb', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poison-barb.png',
        name: 'Flecha Venenosa', icon: '🏹', price: 2000, market: false, trainerShop: false, tier: 'common', type: 'held',
        desc: 'Equipado: Potencia ataques de tipo Veneno (+20%).',
        effect: (qty) => { state.inventory['Flecha Venenosa'] = (state.inventory['Flecha Venenosa'] || 0) + qty; }
      },
      {
        id: 'focus_band', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/focus-band.png',
        name: 'Banda Focus', icon: '🎗️', price: 5000, market: false, trainerShop: true, bcPrice: 1500, unlockLv: 8, tier: 'rare', type: 'held',
        desc: 'Equipado: Puede evitar que el Pokémon sea debilitado de un golpe.',
        effect: (qty) => { state.inventory['Banda Focus'] = (state.inventory['Banda Focus'] || 0) + qty; }
      },
      {
        id: 'magnet_held', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/magnet.png',
        name: 'Imán', icon: '🧲', price: 2000, market: false, trainerShop: false, tier: 'common', type: 'held',
        desc: 'Equipado: Potencia ataques de tipo Eléctrico (+20%).',
        effect: (qty) => { state.inventory['Imán'] = (state.inventory['Imán'] || 0) + qty; }
      },
      {
        id: 'leftovers_held', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/leftovers.png',
        name: 'Restos', icon: '🍏', price: 8000, market: false, trainerShop: true, bcPrice: 2000, unlockLv: 10, tier: 'rare', type: 'held',
        desc: 'Equipado: Recupera un poco de HP en cada turno.',
        effect: (qty) => { state.inventory['Restos'] = (state.inventory['Restos'] || 0) + qty; }
      },
      {
        id: 'dragon_scale', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dragon-scale.png',
        name: 'Escama Dragón', icon: '🐉', price: 5000, market: false, trainerShop: false, tier: 'rare',
        desc: 'Una escama dura. Algunos Pokémon evolucionan con ella.',
        effect: (qty) => { state.inventory['Escama Dragón'] = (state.inventory['Escama Dragón'] || 0) + qty; }
      },
      {
        id: 'nugget', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/nugget.png',
        name: 'Pepita', icon: '🟡', price: 5000, market: false, trainerShop: false, tier: 'rare',
        desc: 'Una pepita de oro puro. Se vende a buen precio.',
        effect: (qty) => { state.inventory['Pepita'] = (state.inventory['Pepita'] || 0) + qty; }
      },
      {
        id: 'pearl', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/pearl.png',
        name: 'Perla', icon: '⚪', price: 1000, market: false, trainerShop: false, tier: 'common',
        desc: 'Una perla pequeña. Se vende a buen precio.',
        effect: (qty) => { state.inventory['Perla'] = (state.inventory['Perla'] || 0) + qty; }
      },
      {
        id: 'big_pearl', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/big-pearl.png',
        name: 'Perla Grande', icon: '🔘', price: 4000, market: false, trainerShop: false, tier: 'rare',
        desc: 'Una perla grande y hermosa. Se vende a muy buen precio.',
        effect: (qty) => { state.inventory['Perla Grande'] = (state.inventory['Perla Grande'] || 0) + qty; }
      },
      {
        id: 'stardust', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/stardust.png',
        name: 'Polvo Estelar', icon: '✨', price: 1000, market: false, trainerShop: false, tier: 'common',
        desc: 'Arena roja muy fina. Se vende a buen precio.',
        effect: (qty) => { state.inventory['Polvo Estelar'] = (state.inventory['Polvo Estelar'] || 0) + qty; }
      },
      {
        id: 'star_piece', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/star-piece.png',
        name: 'Trozo Estrella', icon: '⭐', price: 5000, market: false, trainerShop: false, tier: 'rare',
        desc: 'Un trozo de gema roja. Se vende a muy buen precio.',
        effect: (qty) => { state.inventory['Trozo Estrella'] = (state.inventory['Trozo Estrella'] || 0) + qty; }
      },      // ── TMs (GEN 3 OFFICIAL) ──
      { id: 'tm01', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-fighting.png', name: 'MT01 Puño Certero', icon: '📀', price: 0, unlockLv: 15, tier: 'epic', market: false, trainerShop: true, bcPrice: 2500, desc: 'Enseña Puño Certero. Requiere concentración.', effect: (qty) => { state.inventory['MT01 Puño Certero'] = (state.inventory['MT01 Puño Certero'] || 0) + qty; } },
      { id: 'tm02', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-dragon.png', name: 'MT02 Garra Dragón', icon: '📀', price: 0, unlockLv: 12, tier: 'rare', market: false, trainerShop: true, bcPrice: 2500, desc: 'Enseña Garra Dragón. Poderoso ataque de tipo Dragón.', effect: (qty) => { state.inventory['MT02 Garra Dragón'] = (state.inventory['MT02 Garra Dragón'] || 0) + qty; } },
      { id: 'tm03', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-water.png', name: 'MT03 Hidropulso', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: false, bcPrice: 1500, desc: 'Enseña Hidropulso. Puede confundir al rival.', effect: (qty) => { state.inventory['MT03 Hidropulso'] = (state.inventory['MT03 Hidropulso'] || 0) + qty; } },
      { id: 'tm04', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-psychic.png', name: 'MT04 Paz Mental', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: false, bcPrice: 1500, desc: 'Enseña Paz Mental. Sube At. Esp. y Def. Esp.', effect: (qty) => { state.inventory['MT04 Paz Mental'] = (state.inventory['MT04 Paz Mental'] || 0) + qty; } },
      { id: 'tm05', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.png', name: 'MT05 Rugido', icon: '📀', price: 0, unlockLv: 5, tier: 'common', market: false, trainerShop: true, bcPrice: 1000, desc: 'Enseña Rugido. Ahuyenta al rival.', effect: (qty) => { state.inventory['MT05 Rugido'] = (state.inventory['MT05 Rugido'] || 0) + qty; } },
      { id: 'tm06', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-poison.png', name: 'MT06 Tóxico', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: false, bcPrice: 2500, desc: 'Enseña Tóxico. Envenena gravemente al rival.', effect: (qty) => { state.inventory['MT06 Tóxico'] = (state.inventory['MT06 Tóxico'] || 0) + qty; } },
      { id: 'tm07', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-ice.png', name: 'MT07 Granizo', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Granizo. Crea una tormenta de hielo.', effect: (qty) => { state.inventory['MT07 Granizo'] = (state.inventory['MT07 Granizo'] || 0) + qty; } },
      { id: 'tm08', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-fighting.png', name: 'MT08 Corpulencia', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Corpulencia. Sube Ataque y Defensa.', effect: (qty) => { state.inventory['MT08 Corpulencia'] = (state.inventory['MT08 Corpulencia'] || 0) + qty; } },
      { id: 'tm09', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-grass.png', name: 'MT09 Recurrente', icon: '📀', price: 0, unlockLv: 8, tier: 'common', market: false, trainerShop: true, bcPrice: 1000, desc: 'Enseña Recurrente. Ataca 2-5 veces.', effect: (qty) => { state.inventory['MT09 Recurrente'] = (state.inventory['MT09 Recurrente'] || 0) + qty; } },
      { id: 'tm10', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.png', name: 'MT10 Poder Oculto', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 2500, desc: 'Enseña Poder Oculto. El tipo varía según el Pokémon.', effect: (qty) => { state.inventory['MT10 Poder Oculto'] = (state.inventory['MT10 Poder Oculto'] || 0) + qty; } },
      { id: 'tm11', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-fire.png', name: 'MT11 Día Soleado', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Día Soleado. Despierta un sol radiante.', effect: (qty) => { state.inventory['MT11 Día Soleado'] = (state.inventory['MT11 Día Soleado'] || 0) + qty; } },
      { id: 'tm12', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-dark.png', name: 'MT12 Mofa', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Mofa. Impide movimientos de estado.', effect: (qty) => { state.inventory['MT12 Mofa'] = (state.inventory['MT12 Mofa'] || 0) + qty; } },
      { id: 'tm13', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-ice.png', name: 'MT13 Rayo Hielo', icon: '📀', price: 0, unlockLv: 20, tier: 'epic', market: false, trainerShop: true, bcPrice: 5000, desc: 'Enseña Rayo Hielo. Puede congelar al rival.', effect: (qty) => { state.inventory['MT13 Rayo Hielo'] = (state.inventory['MT13 Rayo Hielo'] || 0) + qty; } },
      { id: 'tm14', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-ice.png', name: 'MT14 Ventisca', icon: '📀', price: 0, unlockLv: 25, tier: 'legend', market: false, trainerShop: true, bcPrice: 5000, desc: 'Enseña Ventisca. Poderoso ataque de hielo.', effect: (qty) => { state.inventory['MT14 Ventisca'] = (state.inventory['MT14 Ventisca'] || 0) + qty; } },
      { id: 'tm15', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.png', name: 'MT15 Hiperrayo', icon: '📀', price: 0, unlockLv: 25, tier: 'legend', market: false, trainerShop: true, bcPrice: 5000, desc: 'Enseña Hiperrayo. Potencia máxima, requiere descanso.', effect: (qty) => { state.inventory['MT15 Hiperrayo'] = (state.inventory['MT15 Hiperrayo'] || 0) + qty; } },
      { id: 'tm16', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-psychic.png', name: 'MT16 Pantalla de Luz', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Pantalla Luz. Reduce daño especial.', effect: (qty) => { state.inventory['MT16 Pantalla de Luz'] = (state.inventory['MT16 Pantalla de Luz'] || 0) + qty; } },
      { id: 'tm17', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.png', name: 'MT17 Protección', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 2500, desc: 'Enseña Protección. Evita ataques ese turno.', effect: (qty) => { state.inventory['MT17 Protección'] = (state.inventory['MT17 Protección'] || 0) + qty; } },
      { id: 'tm18', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-water.png', name: 'MT18 Danza Lluvia', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Danza Lluvia. Invoca la lluvia.', effect: (qty) => { state.inventory['MT18 Danza Lluvia'] = (state.inventory['MT18 Danza Lluvia'] || 0) + qty; } },
      { id: 'tm19', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-grass.png', name: 'MT19 Gigadrenado', icon: '📀', price: 0, unlockLv: 15, tier: 'rare', market: false, trainerShop: false, bcPrice: 2500, desc: 'Enseña Gigadrenado. Roba vida al rival.', effect: (qty) => { state.inventory['MT19 Gigadrenado'] = (state.inventory['MT19 Gigadrenado'] || 0) + qty; } },
      { id: 'tm20', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.png', name: 'MT20 Velo Sagrado', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Velo Sagrado. Protege de estados.', effect: (qty) => { state.inventory['MT20 Velo Sagrado'] = (state.inventory['MT20 Velo Sagrado'] || 0) + qty; } },
      { id: 'tm21', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.png', name: 'MT21 Frustración', icon: '📀', price: 0, unlockLv: 5, tier: 'common', market: false, trainerShop: true, bcPrice: 1000, desc: 'Enseña Frustración. Más fuerte si te odia.', effect: (qty) => { state.inventory['MT21 Frustración'] = (state.inventory['MT21 Frustración'] || 0) + qty; } },
      { id: 'tm22', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-grass.png', name: 'MT22 Rayo Solar', icon: '📀', price: 0, unlockLv: 20, tier: 'epic', market: false, trainerShop: true, bcPrice: 3500, desc: 'Enseña Rayo Solar. Tarda un turno en cargar.', effect: (qty) => { state.inventory['MT22 Rayo Solar'] = (state.inventory['MT22 Rayo Solar'] || 0) + qty; } },
      { id: 'tm23', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-steel.png', name: 'MT23 Cola Férrea', icon: '📀', price: 0, unlockLv: 12, tier: 'rare', market: false, trainerShop: true, bcPrice: 2000, desc: 'Enseña Cola Férrea. Puede bajar la defensa.', effect: (qty) => { state.inventory['MT23 Cola Férrea'] = (state.inventory['MT23 Cola Férrea'] || 0) + qty; } },
      { id: 'tm24', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-electric.png', name: 'MT24 Rayo', icon: '📀', price: 0, unlockLv: 20, tier: 'epic', market: false, trainerShop: true, bcPrice: 5000, desc: 'Enseña Rayo. Ataque eléctrico fiable.', effect: (qty) => { state.inventory['MT24 Rayo'] = (state.inventory['MT24 Rayo'] || 0) + qty; } },
      { id: 'tm25', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-electric.png', name: 'MT25 Trueno', icon: '📀', price: 0, unlockLv: 25, tier: 'legend', market: false, trainerShop: true, bcPrice: 5000, desc: 'Enseña Trueno. Máximo poder, poca precisión.', effect: (qty) => { state.inventory['MT25 Trueno'] = (state.inventory['MT25 Trueno'] || 0) + qty; } },
      { id: 'tm26', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-ground.png', name: 'MT26 Terremoto', icon: '📀', price: 0, unlockLv: 25, tier: 'legend', market: false, trainerShop: false, bcPrice: 5000, desc: 'Enseña Terremoto. El mejor ataque de tierra.', effect: (qty) => { state.inventory['MT26 Terremoto'] = (state.inventory['MT26 Terremoto'] || 0) + qty; } },
      { id: 'tm27', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.png', name: 'MT27 Retribución', icon: '📀', price: 0, unlockLv: 5, tier: 'common', market: false, trainerShop: true, bcPrice: 1000, desc: 'Enseña Retribución. Más fuerte si te quiere.', effect: (qty) => { state.inventory['MT27 Retribución'] = (state.inventory['MT27 Retribución'] || 0) + qty; } },
      { id: 'tm28', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-ground.png', name: 'MT28 Excavar', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 2000, desc: 'Enseña Excavar. Se oculta bajo tierra.', effect: (qty) => { state.inventory['MT28 Excavar'] = (state.inventory['MT28 Excavar'] || 0) + qty; } },
      { id: 'tm29', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-psychic.png', name: 'MT29 Psíquico', icon: '📀', price: 0, unlockLv: 20, tier: 'epic', market: false, trainerShop: true, bcPrice: 5000, desc: 'Enseña Psíquico. El mejor ataque psíquico.', effect: (qty) => { state.inventory['MT29 Psíquico'] = (state.inventory['MT29 Psíquico'] || 0) + qty; } },
      { id: 'tm30', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-ghost.png', name: 'MT30 Bola Sombra', icon: '📀', price: 0, unlockLv: 15, tier: 'rare', market: false, trainerShop: true, bcPrice: 3500, desc: 'Enseña Bola Sombra. Gran ataque de tipo Fantasma.', effect: (qty) => { state.inventory['MT30 Bola Sombra'] = (state.inventory['MT30 Bola Sombra'] || 0) + qty; } },
      { id: 'tm31', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-fighting.png', name: 'MT31 Demolición', icon: '📀', price: 0, unlockLv: 12, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Demolición. Destruye pantallas.', effect: (qty) => { state.inventory['MT31 Demolición'] = (state.inventory['MT31 Demolición'] || 0) + qty; } },
      { id: 'tm32', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.png', name: 'MT32 Doble Equipo', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 2500, desc: 'Enseña Doble Equipo. Sube la evasión.', effect: (qty) => { state.inventory['MT32 Doble Equipo'] = (state.inventory['MT32 Doble Equipo'] || 0) + qty; } },
      { id: 'tm33', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-psychic.png', name: 'MT33 Reflejo', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Reflejo. Reduce daño físico.', effect: (qty) => { state.inventory['MT33 Reflejo'] = (state.inventory['MT33 Reflejo'] || 0) + qty; } },
      { id: 'tm34', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-electric.png', name: 'MT34 Onda Voltio', icon: '📀', price: 0, unlockLv: 12, tier: 'rare', market: false, trainerShop: false, bcPrice: 1500, desc: 'Enseña Onda Voltio. Nunca falla.', effect: (qty) => { state.inventory['MT34 Onda Voltio'] = (state.inventory['MT34 Onda Voltio'] || 0) + qty; } },
      { id: 'tm35', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-fire.png', name: 'MT35 Lanzallamas', icon: '📀', price: 0, unlockLv: 20, tier: 'epic', market: false, trainerShop: true, bcPrice: 5000, desc: 'Enseña Lanzallamas. Ataque ígneo fiable.', effect: (qty) => { state.inventory['MT35 Lanzallamas'] = (state.inventory['MT35 Lanzallamas'] || 0) + qty; } },
      { id: 'tm36', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-poison.png', name: 'MT36 Bomba Lodo', icon: '📀', price: 0, unlockLv: 15, tier: 'rare', market: false, trainerShop: true, bcPrice: 3500, desc: 'Enseña Bomba Lodo. Puede envenenar.', effect: (qty) => { state.inventory['MT36 Bomba Lodo'] = (state.inventory['MT36 Bomba Lodo'] || 0) + qty; } },
      { id: 'tm37', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-rock.png', name: 'MT37 Tormenta de Arena', icon: '📀', price: 0, unlockLv: 15, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña T. Arena. Tormenta de arena.', effect: (qty) => { state.inventory['MT37 Tormenta de Arena'] = (state.inventory['MT37 Tormenta de Arena'] || 0) + qty; } },
      { id: 'tm38', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-fire.png', name: 'MT38 Llamarada', icon: '📀', price: 0, unlockLv: 25, tier: 'legend', market: false, trainerShop: false, bcPrice: 5000, desc: 'Enseña Llamarada. Máximo poder de fuego.', effect: (qty) => { state.inventory['MT38 Llamarada'] = (state.inventory['MT38 Llamarada'] || 0) + qty; } },
      { id: 'tm39', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-rock.png', name: 'MT39 Tumba Rocas', icon: '📀', price: 0, unlockLv: 12, tier: 'rare', market: false, trainerShop: false, bcPrice: 1500, desc: 'Enseña Tumba Rocas. Baja la velocidad.', effect: (qty) => { state.inventory['MT39 Tumba Rocas'] = (state.inventory['MT39 Tumba Rocas'] || 0) + qty; } },
      { id: 'tm40', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-flying.png', name: 'MT40 Golpe Aéreo', icon: '📀', price: 0, unlockLv: 15, tier: 'rare', market: false, trainerShop: true, bcPrice: 2000, desc: 'Enseña Golpe Aéreo. Nunca falla.', effect: (qty) => { state.inventory['MT40 Golpe Aéreo'] = (state.inventory['MT40 Golpe Aéreo'] || 0) + qty; } },
      { id: 'tm41', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-dark.png', name: 'MT41 Tormento', icon: '📀', price: 0, unlockLv: 15, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Tormento. Impide repetir ataques.', effect: (qty) => { state.inventory['MT41 Tormento'] = (state.inventory['MT41 Tormento'] || 0) + qty; } },
      { id: 'tm42', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.png', name: 'MT42 Imagen', icon: '📀', price: 0, unlockLv: 15, tier: 'rare', market: false, trainerShop: true, bcPrice: 2500, desc: 'Enseña Imagen. Se potencia con estados.', effect: (qty) => { state.inventory['MT42 Imagen'] = (state.inventory['MT42 Imagen'] || 0) + qty; } },
      { id: 'tm43', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.png', name: 'MT43 Daño Secreto', icon: '📀', price: 0, unlockLv: 15, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Daño Secreto. Efecto según terreno.', effect: (qty) => { state.inventory['MT43 Daño Secreto'] = (state.inventory['MT43 Daño Secreto'] || 0) + qty; } },
      { id: 'tm44', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-psychic.png', name: 'MT44 Descanso', icon: '📀', price: 0, unlockLv: 20, tier: 'epic', market: false, trainerShop: true, bcPrice: 2000, desc: 'Enseña Descanso. Duerme y cura HP.', effect: (qty) => { state.inventory['MT44 Descanso'] = (state.inventory['MT44 Descanso'] || 0) + qty; } },
      { id: 'tm45', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.png', name: 'MT45 Atracción', icon: '📀', price: 0, unlockLv: 15, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Atracción. Enamora al rival.', effect: (qty) => { state.inventory['MT45 Atracción'] = (state.inventory['MT45 Atracción'] || 0) + qty; } },
      { id: 'tm46', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-dark.png', name: 'MT46 Ladrón', icon: '📀', price: 0, unlockLv: 10, tier: 'rare', market: false, trainerShop: true, bcPrice: 1500, desc: 'Enseña Ladrón. Puede robar el item.', effect: (qty) => { state.inventory['MT46 Ladrón'] = (state.inventory['MT46 Ladrón'] || 0) + qty; } },
      { id: 'tm47', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-steel.png', name: 'MT47 Ala de Acero', icon: '📀', price: 0, unlockLv: 12, tier: 'rare', market: false, trainerShop: true, bcPrice: 2000, desc: 'Enseña Ala de Acero. Puede subir defensa.', effect: (qty) => { state.inventory['MT47 Ala de Acero'] = (state.inventory['MT47 Ala de Acero'] || 0) + qty; } },
      { id: 'tm48', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-psychic.png', name: 'MT48 Intercambio', icon: '📀', price: 0, unlockLv: 22, tier: 'epic', market: false, trainerShop: true, bcPrice: 2500, desc: 'Enseña Intercambio. Cambia habilidades.', effect: (qty) => { state.inventory['MT48 Intercambio'] = (state.inventory['MT48 Intercambio'] || 0) + qty; } },
      { id: 'tm49', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-dark.png', name: 'MT49 Robo', icon: '📀', price: 0, unlockLv: 22, tier: 'epic', market: false, trainerShop: true, bcPrice: 2500, desc: 'Enseña Robo. Roba el efecto positivo.', effect: (qty) => { state.inventory['MT49 Robo'] = (state.inventory['MT49 Robo'] || 0) + qty; } },
      { id: 'tm50', cat: 'especial', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-fire.png', name: 'MT50 Sofoco', icon: '📀', price: 0, unlockLv: 25, tier: 'legend', market: false, trainerShop: true, bcPrice: 5000, desc: 'Enseña Sofoco. Máximo poder, baja At. Esp.', effect: (qty) => { state.inventory['MT50 Sofoco'] = (state.inventory['MT50 Sofoco'] || 0) + qty; } },
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
      // ── RECOMPENSAS DEL RIVAL (No en tienda) ─────────────────────────────
      {
        id: 'ticket_safari', cat: 'booster', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/eon-ticket.png',
        name: 'Ticket Safari', icon: '🎫', price: 0, market: false, trainerShop: false, tier: 'epic', type: 'booster',
        desc: 'Otorga acceso a la Zona Safari durante 30 minutos sin importar tus medallas.',
        effect: (qty) => { state.inventory['Ticket Safari'] = (state.inventory['Ticket Safari'] || 0) + qty; }
      },
      {
        id: 'ticket_cerulean', cat: 'booster', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/eon-ticket.png',
        name: 'Ticket Cueva Celeste', icon: '🎫', price: 0, market: false, trainerShop: false, tier: 'epic', type: 'booster',
        desc: 'Otorga acceso a la Cueva Celeste durante 30 minutos sin importar tus medallas.',
        effect: (qty) => { state.inventory['Ticket Cueva Celeste'] = (state.inventory['Ticket Cueva Celeste'] || 0) + qty; }
      },
      {
        id: 'ticket_articuno', cat: 'booster', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/eon-ticket.png',
        name: 'Ticket Articuno', icon: '❄️', price: 0, market: false, trainerShop: false, tier: 'epic', type: 'booster',
        desc: 'Aumenta un 5% la probabilidad de que aparezca Articuno en las Islas Espuma (30 min).',
        effect: (qty) => { state.inventory['Ticket Articuno'] = (state.inventory['Ticket Articuno'] || 0) + qty; }
      },
      {
        id: 'ticket_mewtwo', cat: 'booster', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/eon-ticket.png',
        name: 'Ticket Mewtwo', icon: '✨', price: 0, market: false, trainerShop: false, tier: 'legend', type: 'booster',
        desc: 'Aumenta un 3% la probabilidad de que aparezca Mewtwo en la Cueva Celeste (30 min).',
        effect: (qty) => { state.inventory['Ticket Mewtwo'] = (state.inventory['Ticket Mewtwo'] || 0) + qty; }
      },
      {
        id: 'iv_scanner', cat: 'booster', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-radar.png',
        name: 'Escáner de IVs', icon: '🔍', price: 0, market: false, trainerShop: false, tier: 'epic', type: 'booster',
        desc: 'Un radar avanzado. Al usarlo, revela los IVs totales de los Pokémon salvajes durante 1 hora.',
        effect: (qty) => {
          state.inventory['Escáner de IVs'] = (state.inventory['Escáner de IVs'] || 0) + qty;
          notify(`¡Recibiste ${qty} Escáner de IVs!`, '🔍');
        }
      },
    ];
    window.SHOP_ITEMS = SHOP_ITEMS;

    let _marketCat = 'todos';
let _trainerShopCat = 'todos';
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

function getBlackMarketItems() {
  if (!state.classData) state.classData = {};
  if (!state.classData.blackMarketDaily) {
    state.classData.blackMarketDaily = { date: '', items: [], purchased: [] };
  }

  const today = new Date().toISOString().split('T')[0];
  const daily = state.classData.blackMarketDaily;

  if (daily.date !== today) {
    // Generar nuevos items para hoy
    const possibleItems = SHOP_ITEMS.filter(i => i.trainerShop === true && i.bcPrice > 0);
    const shuffled = [...possibleItems].sort(() => 0.5 - Math.random());
    daily.items = shuffled.slice(0, 3).map(i => i.id);
    daily.date = today;
    daily.purchased = [];
    if (typeof saveGame === 'function') saveGame(false);
  }
  return daily.items;
}

function buyBlackMarketItem(itemId) {
  if (state.playerClass !== 'rocket') return;
  const daily = state.classData.blackMarketDaily;
  if (!daily.items.includes(itemId)) return;
  if (daily.purchased.includes(itemId)) {
    notify('Ya compraste este objeto hoy.', '🚫');
    return;
  }

  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return;

  const discount = (typeof getClassModifier === 'function') ? getClassModifier('shopDiscount') : 0;
  const priceInMoney = Math.floor((item.bcPrice * 50) * (1 - discount));
  
  if (state.money < priceInMoney) {
    notify('No tenés suficiente dinero (₽).', '❌');
    return;
  }

  state.money -= priceInMoney;
  daily.purchased.push(itemId);
  item.effect(1);
  
  updateHud();
  renderTrainerShop();
  notify(`¡Compraste ${item.name} en el Mercado Negro! 🚀`, '💰');
  if (typeof saveGame === 'function') saveGame(false);
}

function renderTrainerShop() {
  const bcEl = document.getElementById('trainer-shop-bc');
  if (bcEl) bcEl.textContent = (state.battleCoins || 0).toLocaleString();
  const rank = getTrainerRank();
  const levelEl = document.getElementById('trainer-shop-level');
  if (levelEl) levelEl.innerHTML = `<span style="color:var(--purple);">⭐ Rango: <strong>${rank.title}</strong> (Nv. ${state.trainerLevel})</span> &nbsp;·&nbsp; Comprá ítems exclusivos con Battle Coins.`;
  const tierColors = { common: 'tier-common', rare: 'tier-rare', epic: 'tier-epic', legend: 'tier-legend' };
  const tierLabels = { common: 'Común', rare: 'Raro', epic: 'Épico', legend: 'Legendario' };
  const TRAINER_CAT_ORDER = { held: 1, especial: 2, booster: 3, breeding: 4, utility: 5 };
  const TRAINER_ITEM_CATEGORIES = ['todos', 'held', 'especial', 'booster', 'breeding', 'utility'];
  const TRAINER_CAT_LABELS = {
    todos: 'Todo',
    held: '⚔️ Ítems Equipables',
    especial: '✨ Especiales',
    booster: '🚀 Potenciadores',
    breeding: '🥚 Cría',
    utility: '🛠️ Utilidad',
  };

  const tabsEl = document.getElementById('trainer-shop-tabs');
  if (tabsEl) {
    tabsEl.innerHTML = `
      <div class="market-tab-bar">
        ${TRAINER_ITEM_CATEGORIES.map(c => `
          <button class="market-tab-btn ${_trainerShopCat === c ? 'active' : ''}"
            onclick="_trainerShopCat='${c}';renderTrainerShop()">
            ${TRAINER_CAT_LABELS[c]}
          </button>`).join('')}
      </div>`;
  }

  const trSearchInput = document.getElementById('trainer-shop-search-input');
  const trSearchQuery = trSearchInput ? trSearchInput.value.toLowerCase() : '';

  const trainerItems = SHOP_ITEMS
    .filter(i => {
      if (i.trainerShop !== true) return false;
      if (_trainerShopCat !== 'todos' && i.cat !== _trainerShopCat) return false;
      if (trSearchQuery && !i.name.toLowerCase().includes(trSearchQuery)) return false;
      return true;
    })
    .sort((a, b) => {
      // Primero los desbloqueados, luego los bloqueados (como en el Pokemarket)
      const aLocked = state.trainerLevel < a.unlockLv ? 1 : 0;
      const bLocked = state.trainerLevel < b.unlockLv ? 1 : 0;
      if (aLocked !== bLocked) return aLocked - bLocked;

      // Luego por categoría
      const ao = TRAINER_CAT_ORDER[a.cat] || 99;
      const bo = TRAINER_CAT_ORDER[b.cat] || 99;
      if (ao !== bo) return ao - bo;

      // Finalmente por nivel de desbloqueo (ascendente)
      return a.unlockLv - b.unlockLv;
    });

  const grid = document.getElementById('trainer-shop-grid');
  if (!grid) return;

  const rows = [];

  // --- MERCADO NEGRO (Solo visible para Team Rocket) ---
  const isRocket = state.playerClass === 'rocket';
  
  if (isRocket) {
    const bmItemIds = getBlackMarketItems();
    rows.push(`<div style="grid-column:1/-1;padding:10px 4px 4px;font-size:10px;font-family:'Press Start 2P';color:#ef4444;letter-spacing:1px;border-bottom:1px solid rgba(239,68,68,0.25);margin-bottom:4px;">🕵️ Mercado Negro</div>`);
    
    bmItemIds.forEach(id => {
      const item = SHOP_ITEMS.find(i => i.id === id);
      if (!item) return;
      
      const daily = state.classData.blackMarketDaily;
      const alreadyPurchased = daily.purchased.includes(id);
      const discount = (typeof getClassModifier === 'function') ? getClassModifier('shopDiscount') : 0;
      const priceInMoney = Math.floor((item.bcPrice * 50) * (1 - discount));
      const canAfford = state.money >= priceInMoney;
      const tierCls = tierColors[item.tier] || 'tier-common';

      rows.push(`<div class="market-card" style="border: 1px solid rgba(239,68,68,0.3); background: rgba(239,68,68,0.05);">
        <span class="market-tier-badge ${tierCls}">${tierLabels[item.tier] || item.tier}</span>
        <div class="market-item-icon">
          ${item.sprite ? `<img src="${item.sprite}" width="40" height="40" style="image-rendering:pixelated;" onerror="this.style.display='none'">` : `<span style="font-size:32px">${item.icon}</span>`}
        </div>
        <div class="market-item-name" style="color:#ef4444;">${item.name}</div>
        <div class="market-item-desc" style="margin-top:4px;">${item.desc}</div>
        <div class="market-item-price" style="color:#22c55e;">₽ ${priceInMoney.toLocaleString()}</div>
        <button class="market-buy-btn" 
          onclick="${!alreadyPurchased ? `buyBlackMarketItem('${item.id}')` : ''}"
          style="${!alreadyPurchased && canAfford ? 'background:linear-gradient(135deg,#ef4444,#991b1b);' : 'background:#374151; cursor:not-allowed;'}"
          ${alreadyPurchased || !canAfford ? 'disabled' : ''}>
          ${alreadyPurchased ? 'VENDIDO' : !canAfford ? 'SIN DINERO' : 'COMPRAR'}
        </button>
      </div>`);
    });
  }

  let lastCat = null;
  trainerItems.forEach(item => {
    if (_trainerShopCat === 'todos' && item.cat !== lastCat) {
      const label = TRAINER_CAT_LABELS[item.cat] || item.cat;
      rows.push(`<div style="grid-column:1/-1;padding:10px 4px 4px;font-size:10px;font-family:'Press Start 2P';color:var(--purple);letter-spacing:1px;border-bottom:1px solid rgba(155,77,255,0.25);margin-bottom:4px;">${label}</div>`);
      lastCat = item.cat;
    }
    const locked = state.trainerLevel < item.unlockLv;
    const bc = state.battleCoins || 0;
    const canAfford = bc >= item.bcPrice;
    const tierCls = tierColors[item.tier] || 'tier-common';
    rows.push(`<div class="market-card ${locked ? 'locked' : ''}">
      <span class="market-tier-badge ${tierCls}">${tierLabels[item.tier] || item.tier}</span>
      <div class="market-item-icon">
        ${item.sprite ? `<img src="${item.sprite}" width="40" height="40" style="image-rendering:pixelated;" onerror="this.style.display='none'">` : `<span style="font-size:32px">${item.icon}</span>`}
      </div>
      <div class="market-item-name">${item.name}</div>
      <div class="market-item-desc" style="margin-top:4px;">${item.desc}</div>
      ${locked ? `<div class="market-item-unlock">🔒 Nv. ${item.unlockLv}</div>` : ''}
      <div class="market-item-price" style="color:var(--purple);"><i class="fa-solid fa-coins"></i> ${item.bcPrice} BC</div>
      <button class="market-buy-btn" onclick="buyItemBC('${item.id}')"
        style="${!locked && canAfford ? 'background:linear-gradient(135deg,var(--purple),#9b4dff);' : ''}"
        ${locked || !canAfford ? 'disabled' : ''}>
        ${locked ? '🔒 BLOQUEADO' : !canAfford ? 'SIN BC' : 'COMPRAR'}
      </button>
    </div>`);
  });
  grid.innerHTML = rows.join('');
}

function buyItemBC(itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item || !item.trainerShop) return;
  if (state.trainerLevel < item.unlockLv) { notify('¡Ítem bloqueado!', '🔒'); return; }
  if ((state.battleCoins || 0) < item.bcPrice) { notify('¡No tenés suficientes Battle Coins!', '<i class="fas fa-coins" style="color:#FFD700"></i>'); return; }
  if (typeof item.effect !== 'function') { notify('Este ítem todavía no se puede comprar.', '⚠️'); return; }
  state.battleCoins -= item.bcPrice;
  item.effect(1);
  updateHud();
  renderTrainerShop();
  notify(`¡Compraste ${item.name}!`, '🏅');
  if (typeof saveGame === 'function') saveGame(false);
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

  let price = item.price;
  if (state.playerClass === 'rocket') {
    price = Math.floor(price * 1.20);
  }
  const total = price * qty;
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
      const isRocket = state.playerClass === 'rocket';
      document.getElementById('market-money').textContent = state.money.toLocaleString();
      
      const grid = document.getElementById('market-grid');
      const tabsEl = document.getElementById('market-tabs');
      const levelEl = document.getElementById('market-trainer-level');

      if (grid) grid.style.display = 'grid';

      const rank = getTrainerRank();
      if (levelEl) levelEl.innerHTML =
        `<span style="color:var(--purple);">⭐ Rango: <strong>${rank.title}</strong> (Nv. ${state.trainerLevel})</span> &nbsp;·&nbsp; Más ítems se desbloquean al subir de nivel.`;

      // Inventory
      const invEntries = Object.entries(state.inventory).filter(([, v]) => v > 0).map(([k, v]) => `${k} ×${v}`).join(' &nbsp;|&nbsp; ');

      const tierColors = { common: 'tier-common', rare: 'tier-rare', epic: 'tier-epic', legend: 'tier-legend' };
      const tierLabels = { common: 'Común', rare: 'Raro', epic: 'Épico', legend: 'Legendario' };
      const typeTagColors = { stone: '#f5a623', held: '#7ed321', usable: '#4a90e2' };
      const typeTagLabels = { stone: 'Piedra', held: 'Equipable', usable: 'Usable' };

      // ── Category tabs — separate container, no grid inheritance ──
      tabsEl.innerHTML = `
        <div class="market-tab-bar">
          ${ITEM_CATEGORIES.map(c => `
            <button class="market-tab-btn ${_marketCat === c ? 'active' : ''}"
              onclick="_marketCat='${c}';renderMarket()">
              ${CATEGORY_LABELS[c]}
            </button>`).join('')}
        </div>`;

      const mktSearchInput = document.getElementById('market-search-input');
      const mktSearchQuery = mktSearchInput ? mktSearchInput.value.toLowerCase() : '';

      // ── Items grid ──
      const filtered = SHOP_ITEMS
        .filter(i => {
          if (i.market === false) return false;
          if (_marketCat !== 'todos' && i.cat !== _marketCat) return false;
          if (mktSearchQuery && !i.name.toLowerCase().includes(mktSearchQuery)) return false;
          return true;
        })
        .sort((a, b) => {
          const aLocked = state.trainerLevel < a.unlockLv ? 1 : 0;
          const bLocked = state.trainerLevel < b.unlockLv ? 1 : 0;
          if (aLocked !== bLocked) return aLocked - bLocked;
          const aCat = MARKET_CAT_ORDER[a.cat] || 99;
          const bCat = MARKET_CAT_ORDER[b.cat] || 99;
          if (aCat !== bCat) return aCat - bCat;
          return a.unlockLv - b.unlockLv;
        });
      grid.innerHTML = filtered.map(item => {
        const locked = state.trainerLevel < item.unlockLv;
        const qty = _marketGetQty(item.id);
        let price = item.price;
        if (state.playerClass === 'rocket') {
          price = Math.floor(price * 1.20);
        }
        const total = price * qty;
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
        <div class="market-item-price" style="${state.playerClass === 'rocket' ? 'color:#ef4444;' : ''}">₽ ${price.toLocaleString()}${state.playerClass === 'rocket' ? ' <small>(+20%)</small>' : ''}</div>
        <div style="display:flex;justify-content:center;align-items:center;gap:10px;margin-top:10px;">
          <span style="font-size:11px;color:var(--gray);font-weight:700;">Cantidad</span>
          <input id="market-qty-${item.id}" type="number" min="1" max="999" value="${qty}"
            ${locked ? 'disabled' : ''}
            oninput="_marketSetQty('${item.id}', this.value)" onchange="_marketSetQty('${item.id}', this.value)"
            style="width:90px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.06);color:#fff;border:1px solid rgba(255,255,255,0.12);text-align:center;outline:none;">
        </div>
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
      let price = item.price;
      if (state.playerClass === 'rocket') {
        price = Math.floor(price * 1.20);
      }
      const total = price * qty;

      if (state.money < total) { notify('¡No tenés suficiente dinero!', '💸'); return; }
      if (typeof item.effect !== 'function') { notify('Este ítem todavía no se puede comprar.', '⚠️'); return; }

      state.money -= total;
      item.effect(qty);
      updateHud();
      renderMarket();
      notify(`¡Compraste x${qty} ${item.name}!`, item.icon);
      if (typeof saveGame === 'function') saveGame(false);
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
      tower_dawn: 'assets/sprites/pokemon_tower_bg.jpg',
      tower_day: 'assets/sprites/pokemon_tower_bg.jpg',
      tower_dusk: 'assets/sprites/pokemon_tower_bg.jpg',
      tower_night: 'assets/sprites/pokemon_tower_bg.jpg',
      ruta_dawn: 'assets/sprites/ruta_dawn.png',
      ruta_day: 'assets/sprites/ruta_day.png',
      ruta_night: 'assets/sprites/ruta_night.png',
      mansion_dawn: 'assets/sprites/mansionpokemon.png',
      mansion_day: 'assets/sprites/mansionpokemon.png',
      mansion_dusk: 'assets/sprites/mansionpokemon.png',
      mansion_night: 'assets/sprites/mansionpokemon.png',
      safari_dawn: 'assets/sprites/zonasafari.png',
      safari_day: 'assets/sprites/zonasafari.png',
      safari_dusk: 'assets/sprites/zonasafari.png',
      safari_night: 'assets/sprites/zonasafari.png',
      espuma_dawn: 'assets/sprites/islasespuma.png',
      espuma_day: 'assets/sprites/islasespuma.png',
      espuma_dusk: 'assets/sprites/islasespuma.png',
      espuma_night: 'assets/sprites/islasespuma.png',
      celeste_dawn: 'assets/sprites/cuevaceleste.png',
      celeste_day: 'assets/sprites/cuevaceleste.png',
      celeste_dusk: 'assets/sprites/cuevaceleste.png',
      celeste_night: 'assets/sprites/cuevaceleste.png',
      central_dawn: 'assets/sprites/centralenergía.png',
      central_day: 'assets/sprites/centralenergía.png',
      central_dusk: 'assets/sprites/centralenergía.png',
      central_night: 'assets/sprites/centralenergía.png',
    };

    // ===== BATTLE BACKGROUNDS =====
    // Maps each location to a biome key, then picks the right time variant.
    // Biomes: bosque | montana | playa | puente | ruta | pvp | tower
    const _BIOME_MAP = {
      // Forest / jungle
      forest: 'bosque', route2: 'bosque', route25: 'puente',
      // Mountain / cave
      cave: 'montana', mt_moon: 'montana', rock_tunnel: 'montana',
      victory_road: 'montana', diglett_cave: 'montana',
      cerulean_cave: 'celeste',
      // Water / beach
      water: 'playa', seafoam_islands: 'espuma',
      // Safaris & Mansions
      safari_zone: 'safari', mansion: 'mansion',
      // Bridge routes
      route24: 'puente', route12: 'puente',
      // Pokemon Tower
      pokemon_tower: 'tower',
      // Gym / pvp
      gym: 'pvp', pvp: 'pvp',
      // Central / Power Plant
      power_plant: 'central',
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
      const sharedDawnDusk = ['bosque', 'playa', 'ruta', 'pvp', 'central'];
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
        src = 'assets/sprites/gimnasio.png';
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
      } else if (state.battle && state.battle.isFishing) {
        src = 'assets/sprites/bg_fishing.jpg';
        cacheKey = 'fishing_global';
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
          const fallbackSrc = BATTLE_BG_DATA.ruta_day;
          if (src && src !== fallbackSrc) {
            const fb = new Image();
            fb.onload = () => draw(fb);
            fb.onerror = () => {
              ctx.fillStyle = '#0d1117';
              ctx.fillRect(0, 0, W, H);
            };
            fb.src = fallbackSrc;
            return;
          }
          ctx.fillStyle = '#0d1117';
          ctx.fillRect(0, 0, W, H);
        };
        img.src = src;
      }
    }

// Actualización de precios forzada
