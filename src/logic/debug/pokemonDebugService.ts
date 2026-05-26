

import { makePokemon, recalcPokemonStats, getExpNeeded } from '@/logic/pokemonFactory';
import { useGameStore } from '@/stores/game';
import { useBattleStore } from '@/stores/battle';
import { useUIStore } from '@/stores/ui';
import { useModalStore } from '@/stores/modals';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import type { Pokemon } from '@/types/pokemon';
import { logger } from '../utils/logger.ts';

interface DebugPokemon extends Pokemon {
  mapId?: string | null
}

interface GenerateParams {
  id?: string
  level?: number
  ivs?: Partial<Pokemon['ivs']> | null
  isShiny?: boolean
  isGuardian?: boolean
  nature?: string | null
  ability?: string | null
  gender?: 'male' | 'female' | 'genderless' | null
  moves?: string[] | null
  nickname?: string | null
  friendship?: number
  heldItem?: string | null
  mapId?: string | null
}

interface EggData {
  uid: string
  id: string
  name: string
  isEgg: boolean
  steps: number
  ivs: Pokemon['ivs']
  nature: string
  movesAtBirth: string[]
  abilitySlot: number
  isShiny: boolean
  isGuardian: boolean
  ready: boolean
}

/**
 * Service for administrative and debug operations related to Pokémon.
 * CLI-First implementation.
 */
export const pokemonDebugService = {
  /**
   * Generates a custom pokemon object with specific overrides.
   */
  generate(params: GenerateParams = {}): Pokemon {
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
      heldItem = null,
      mapId = null
    } = params;

    // 1. Create base instance
    const genderMap: Record<string, 'M' | 'F' | 'N'> = { 'male': 'M', 'female': 'F', 'genderless': 'N' };
    const mappedGender = (gender && genderMap[gender]) ? genderMap[gender] : undefined;
    const p = makePokemon(id, level, { isShiny, nature: nature || undefined, ability: ability || undefined, gender: mappedGender, heldItem: heldItem || undefined })
    if (!p) return {} as Pokemon

    if (mapId) {
      (p as DebugPokemon).mapId = mapId
    }

    // 2. Apply Overrides
    if (ivs) {
      p.ivs = { ...p.ivs, ...ivs }
    }
    
    if (isGuardian) p.isGuardian = true;
    if (nickname) p.nickname = nickname;
    if (friendship !== undefined) p.friendship = friendship;

    // 3. Handle Moves
    if (moves && Array.isArray(moves)) {
      p.moves = moves.map((mName: string) => {
        const mData = pokemonDataProvider.getMoveData(mName)
        return { 
          name: mName || '???', 
          pp: mData?.pp || 35, 
          maxPP: mData?.pp || 35,
          type: mData?.type || 'normal',
          power: mData?.power || 0,
          acc: mData?.acc || 100,
          cat: (mData?.cat || 'physical') as 'physical' | 'special' | 'status'
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
  async executeProtocol(p: Pokemon, protocol: string = 'catch'): Promise<void> {
    const game = useGameStore();
    const ui = useUIStore();
    const animationsEnabled = ui.debugAnimationsEnabled ?? true;

    logger.debug('DEBUG', `Executing ${protocol.toUpperCase()} protocol for ${p.name}`);

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
        const eggForInventory: Partial<EggData> = {
          uid: `egg_${Temporal.Now.instant().epochMilliseconds}`,
          id: p.id,
          name: 'Huevo Pokémon',
          isEgg: true,
          steps: 100, // Low steps for quick debug testing
          ivs: p.ivs,
          nature: p.nature,
          movesAtBirth: p.moves.map(m => m?.name || '???'),
          abilitySlot: (p as Pokemon & { abilityIndex?: number }).abilityIndex || 0,
          isShiny: p.isShiny,
          isGuardian: p.isGuardian
        };
        
        const state = game.state as Record<string, unknown>;
        const key = `${p.id}TicketSecs`;
        if (state[key] !== undefined) {
          state[key] = (Number(state[key]) || 0) + 12 * 3600;
        }

        if (!game.state.eggs) game.state.eggs = [];
        const eggToPush: EggData = {
          ...(eggForInventory as EggData),
          uid: `${eggForInventory.id}-${Temporal.Now.instant().epochMilliseconds}`,
          ready: false
        };
        game.state.eggs.push(eggToPush);
        ui.notify(`[DEBUG] Huevo de ${p.name} añadido a la mochila`, '🥚');
        await game.save(false);
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

      case 'fishing_minigame': {
        const { showFishingIntro, startFishingMinigame } = await import('@/logic/encounterUI')
        const battleStore = useBattleStore();
        showFishingIntro(p, 50, () => {
          startFishingMinigame(
            p,
            50,
            async () => {
              ui.notify(`¡Pesca exitosa! Iniciando combate...`, '🎣')
              await battleStore._startBattle(p, { 
                locationId: (p as DebugPokemon).mapId || 'route12',
                isDebug: true,
                isFishing: true
              })
              const modalStore = useModalStore()
              modalStore.closeAll()
            },
            () => {
              ui.notify('El Pokémon escapó...', '💨')
            }
          )
        })
        break;
      }

      case 'archaeology_minigame': {
        const { showArchaeologyIntro, startArchaeologyMinigame } = await import('@/logic/encounterUI')
        const battleStore = useBattleStore();
        showArchaeologyIntro(p, 50, () => {
          startArchaeologyMinigame(
            p,
            50,
            async () => {
              ui.notify(`¡Excavación exitosa! Iniciando combate...`, '⛏️')
              await battleStore._startBattle(p, { 
                locationId: (p as DebugPokemon).mapId || 'mt_moon',
                isDebug: true,
                isArchaeology: true
              })
              const modalStore = useModalStore()
              modalStore.closeAll()
            },
            () => {
              ui.notify('El fósil se desmoronó...', '💨')
            }
          )
        })
        break;
      }

      default:
        logger.error('DEBUG', `Unknown protocol: ${protocol}`);
    }
  },

  /**
   * Starts a custom encounter.
   */
  async triggerEncounter(p: Pokemon, mapId: string = 'plains'): Promise<void> {
    const battleStore = useBattleStore();
    // const _ui = useUIStore();

    // 1. Force flee if there's an active battle
    if (battleStore.isBattleActive) {
      logger.warn('DEBUG', 'Combate activo detectado. Forzando huida del anterior para iniciar el nuevo...');
      await battleStore.endBattle(false, true);
    }

    logger.debug('DEBUG', `Triggering encounter with ${p.name} at ${mapId}`);
    
    // Register as seen
    const game = useGameStore();
    game.registerPokedex(p.id, false);

    // Start battle
    await battleStore._startBattle(p, { 
      locationId: mapId,
      isDebug: true
    });

    const modalStore = useModalStore();
    modalStore.closeAll();
  }
};
