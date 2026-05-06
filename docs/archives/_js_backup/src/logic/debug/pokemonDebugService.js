import { makePokemon, recalcPokemonStats, getExpNeeded } from '@/logic/pokemonFactory';
import { useGameStore } from '@/stores/game';
import { useBattleStore } from '@/stores/battle';
import { useUIStore } from '@/stores/ui';
import { useModalStore } from '@/stores/modals';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';

/**
 * Service for administrative and debug operations related to Pokémon.
 * CLI-First implementation.
 */
export const pokemonDebugService = {
  /**
   * Generates a custom pokemon object with specific overrides.
   */
  generate(params = {}) {
    const {
      id = 'pidgey',
      level = 5,
      ivs = null,
      isShiny = false,
      isGuardian = false,
      nature = null,
      ability = null,
      gender = null,
      moves = null,
      nickname = null,
      friendship = 70,
      heldItem = null
    } = params;

    // 1. Create base instance
    const p = makePokemon(id, level, { isShiny, nature, ability, gender, heldItem });

    // 2. Apply Overrides
    if (ivs) {
      p.ivs = { ...p.ivs, ...ivs };
    }
    
    if (isGuardian) p.isGuardian = true;
    if (nickname) p.nickname = nickname;
    if (friendship !== undefined) p.friendship = friendship;

    // 3. Handle Moves
    if (moves && Array.isArray(moves)) {
      p.moves = moves.map(mName => {
        const mData = pokemonDataProvider.getMoveData(mName) || {};
        return { 
          name: mName || '???', 
          pp: mData.pp || 35, 
          maxPP: mData.pp || 35,
          type: mData.type || 'normal',
          power: mData.power || 0,
          acc: mData.acc || 100,
          cat: mData.cat || 'physical'
        };
      }).slice(0, 4);
    }

    // 4. Final Recalc
    recalcPokemonStats(p);
    p.hp = p.maxHp;
    p.expNeeded = getExpNeeded(p.level);

    return p;
  },

  /**
   * Adds the pokemon to the state using a specific protocol.
   */
  async executeProtocol(p, protocol = 'catch') {
    const game = useGameStore();
    const ui = useUIStore();
    const animationsEnabled = ui.debugAnimationsEnabled ?? true;

    console.log(`[DEBUG] Executing ${protocol.toUpperCase()} protocol for ${p.name}`);

    switch (protocol) {
      case 'catch':
        // Protocol: Standard catch (wild origin)
        p.obtainedMethod = 'wild';
        game.addPokemon(p, { notify: !animationsEnabled });
        
        if (animationsEnabled) {
          ui.notify(`[DEBUG] Pokémon atrapado: ${p.name}`, '✨');
        }
        break;

      case 'hatch':
      case 'egg_silent': {
        // Protocol: Add UNHATCHED egg to inventory
        const eggForInventory = {
          uid: `egg_${Date.now()}`,
          id: p.id,
          name: 'Huevo Pokémon',
          isEgg: true,
          steps: 100, // Low steps for quick debug testing
          ivs: p.ivs,
          nature: p.nature,
          movesAtBirth: p.moves.map(m => m.name),
          abilitySlot: p.abilityIndex || 0,
          isShiny: p.isShiny,
          isGuardian: p.isGuardian
        };
        
        if (!game.state.eggs) game.state.eggs = [];
        game.state.eggs.push(eggForInventory);
        ui.notify(`[DEBUG] Huevo de ${p.name} añadido a la mochila`, '🥚');
        break;
      }

      case 'hatch_anim':
      case 'egg_anim':
        // Protocol: Visual hatching sequence (VUE MIGRATED)
        p.obtainedMethod = 'egg';
        
        // Add to game state silently first
        game.addPokemon(p, { notify: false });
        
        // Trigger Vue Modal Sequence
        ui.open('HatchAnimation', { pokemon: p });
        break;

      default:
        console.error(`[DEBUG] Unknown protocol: ${protocol}`);
    }

    await game.save(false);
  },

  /**
   * Starts a custom encounter.
   */
  async triggerEncounter(p, mapId = 'plains') {
    const battleStore = useBattleStore();
    const _ui = useUIStore();

    // 1. Force flee if there's an active battle
    if (battleStore.isBattleActive) {
      console.warn('[DEBUG] Combate activo detectado. Forzando huida del anterior para iniciar el nuevo...');
      await battleStore.endBattle(false, true);
    }

    console.log(`[DEBUG] Triggering encounter with ${p.name} at ${mapId}`);
    
    // Register as seen
    const game = useGameStore();
    game.registerPokedex(p.id, false);

    // Start battle
    await battleStore._startBattle(p, { 
      locationId: mapId,
      battleOptions: { isDebug: true }
    });

    const modalStore = useModalStore();
    modalStore.closeAll();
  }
};
